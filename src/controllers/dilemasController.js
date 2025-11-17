const { query } = require('../config/database');

const getAllDilemas = async (req, res) => {
  try {
    const { categoria } = req.query;
    
    let sql = `
      SELECT d.*, u.nombre as creador_nombre 
      FROM dilemas d
      LEFT JOIN usuarios u ON d.creado_por = u.id
      WHERE d.activo = true
    `;
    
    const params = [];
    
    if (categoria) {
      sql += ' AND d.categoria = $1';
      params.push(categoria);
    }
    
    sql += ' ORDER BY d.created_at DESC';
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error al obtener dilemas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dilemas',
      error: error.message
    });
  }
};


const getDilemaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const dilemaResult = await query(
      `SELECT d.*, u.nombre as creador_nombre 
       FROM dilemas d
       LEFT JOIN usuarios u ON d.creado_por = u.id
       WHERE d.id = $1 AND d.activo = true`,
      [id]
    );
    
    if (dilemaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dilema no encontrado'
      });
    }
    
    const dilema = dilemaResult.rows[0];
    
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_votos,
        SUM(CASE WHEN opcion_elegida = 'A' THEN 1 ELSE 0 END) as votos_a,
        SUM(CASE WHEN opcion_elegida = 'B' THEN 1 ELSE 0 END) as votos_b
       FROM respuestas
       WHERE dilema_id = $1`,
      [id]
    );
    
    const stats = statsResult.rows[0];
    const totalVotos = parseInt(stats.total_votos);
    
    const porcentajeA = totalVotos > 0 ? Math.round((stats.votos_a / totalVotos) * 100) : 0;
    const porcentajeB = totalVotos > 0 ? Math.round((stats.votos_b / totalVotos) * 100) : 0;
    
    let usuarioRespondio = null;
    if (req.user) {
      const respuestaUsuario = await query(
        'SELECT opcion_elegida FROM respuestas WHERE dilema_id = $1 AND usuario_id = $2',
        [id, req.user.id]
      );
      
      if (respuestaUsuario.rows.length > 0) {
        usuarioRespondio = respuestaUsuario.rows[0].opcion_elegida;
      }
    }

    let usuarioDenuncio = false;
    if (req.user) {
      const denunciaUsuario = await query(
        'SELECT id FROM denuncias WHERE dilema_id = $1 AND usuario_id = $2',
        [id, req.user.id]
    );
    usuarioDenuncio = denunciaUsuario.rows.length > 0;
    }
    
    res.json({
      success: true,
      data: {
        ...dilema,
        estadisticas: {
          total_votos: totalVotos,
          porcentaje_a: porcentajeA,
          porcentaje_b: porcentajeB,
          votos_a: parseInt(stats.votos_a),
          votos_b: parseInt(stats.votos_b)
        },
        usuario_respondio: usuarioRespondio,
        usuario_denuncio: usuarioDenuncio
      }
    });
    
  } catch (error) {
    console.error('Error al obtener dilema:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dilema',
      error: error.message
    });
  }
};

const createDilema = async (req, res) => {
  try {
    const { titulo, descripcion, opcion_a, opcion_b, categoria } = req.body;
    const userId = req.user.id;
    
    if (!titulo || !descripcion || !opcion_a || !opcion_b) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios (titulo, descripcion, opcion_a, opcion_b)'
      });
    }
    
    const result = await query(
      `INSERT INTO dilemas (titulo, descripcion, opcion_a, opcion_b, categoria, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [titulo, descripcion, opcion_a, opcion_b, categoria || 'general', userId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Dilema creado exitosamente',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error al crear dilema:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear dilema',
      error: error.message
    });
  }
};

const updateDilema = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, opcion_a, opcion_b, categoria } = req.body;
    const userId = req.user.id;

    const checkResult = await query(
      'SELECT * FROM dilemas WHERE id = $1 AND creado_por = $2',
      [id, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dilema no encontrado o no tienes permiso para editarlo'
      });
    }
   
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (titulo !== undefined) {
      updateFields.push(`titulo = $${paramCount}`);
      values.push(titulo);
      paramCount++;
    }
    if (descripcion !== undefined) {
      updateFields.push(`descripcion = $${paramCount}`);
      values.push(descripcion);
      paramCount++;
    }
    if (opcion_a !== undefined) {
      updateFields.push(`opcion_a = $${paramCount}`);
      values.push(opcion_a);
      paramCount++;
    }
    if (opcion_b !== undefined) {
      updateFields.push(`opcion_b = $${paramCount}`);
      values.push(opcion_b);
      paramCount++;
    }
    if (categoria !== undefined) {
      updateFields.push(`categoria = $${paramCount}`);
      values.push(categoria);
      paramCount++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      });
    }
    
    values.push(id, userId);
    
    const queryString = `
      UPDATE dilemas 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount} AND creado_por = $${paramCount + 1}
      RETURNING *
    `;
    
    const result = await query(queryString, values);
    
    res.json({
      success: true,
      message: 'Dilema actualizado exitosamente',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error al actualizar dilema:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar dilema',
      error: error.message
    });
  }
};


const deleteDilema = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const checkResult = await query(
      'SELECT * FROM dilemas WHERE id = $1 AND creado_por = $2',
      [id, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dilema no encontrado o no tienes permiso para eliminarlo'
      });
    }
    
    await query(
      'UPDATE dilemas SET activo = false WHERE id = $1',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Dilema eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('Error al eliminar dilema:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar dilema',
      error: error.message
    });
  }
};

module.exports = {
  getAllDilemas,
  getDilemaById,
  createDilema,
  updateDilema,
  deleteDilema
};