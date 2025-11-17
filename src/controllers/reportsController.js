const { query } = require('../config/database');

const LIMITE_DENUNCIAS = process.env.LIMITE_DENUNCIAS

const denunciarDilema = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const userId = req.user.id;
    
    const dilemaExists = await query(
      'SELECT id, titulo, total_denuncias FROM dilemas WHERE id = $1 AND activo = true',
      [id]
    );
    
    if (dilemaExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dilema no encontrado'
      });
    }
    
    const dilema = dilemaExists.rows[0];
    
    const yaDenuncio = await query(
      'SELECT id FROM denuncias WHERE dilema_id = $1 AND usuario_id = $2',
      [id, userId]
    );
    
    if (yaDenuncio.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya has denunciado este dilema'
      });
    }
    
    await query(
      'INSERT INTO denuncias (dilema_id, usuario_id, motivo) VALUES ($1, $2, $3)',
      [id, userId, motivo || 'no especificado']
    );
    
    const updateResult = await query(
      'UPDATE dilemas SET total_denuncias = total_denuncias + 1 WHERE id = $1 RETURNING total_denuncias',
      [id]
    );
    
    const nuevasDenuncias = updateResult.rows[0].total_denuncias;
    
    if (nuevasDenuncias >= LIMITE_DENUNCIAS) {
      await query(
        'UPDATE dilemas SET activo = false WHERE id = $1',
        [id]
      );
      
      return res.json({
        success: true,
        message: 'Denuncia registrada. El dilema ha sido eliminado por exceso de denuncias',
        data: {
          dilema_eliminado: true,
          total_denuncias: nuevasDenuncias
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Denuncia registrada exitosamente',
      data: {
        total_denuncias: nuevasDenuncias,
        limite: LIMITE_DENUNCIAS,
        faltan_para_eliminar: LIMITE_DENUNCIAS - nuevasDenuncias
      }
    });
    
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Ya has denunciado este dilema'
      });
    }
    
    console.error('Error al denunciar dilema:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar denuncia',
      error: error.message
    });
  }
};

const getDilemasDenunciados = async (req, res) => {
  try {
    const result = await query(
      `SELECT d.*, u.nombre as creador_nombre,
              (SELECT COUNT(*) FROM denuncias WHERE dilema_id = d.id) as total_denuncias_verificado
       FROM dilemas d
       LEFT JOIN usuarios u ON d.creado_por = u.id
       WHERE d.total_denuncias > 0
       ORDER BY d.total_denuncias DESC, d.created_at DESC`
    );
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error al obtener dilemas denunciados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener dilemas denunciados',
      error: error.message
    });
  }
};

const getDenunciasDilema = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT d.*, u.nombre as denunciante_nombre, u.email as denunciante_email
       FROM denuncias d
       JOIN usuarios u ON d.usuario_id = u.id
       WHERE d.dilema_id = $1
       ORDER BY d.created_at DESC`,
      [id]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error al obtener denuncias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener denuncias',
      error: error.message
    });
  }
};

module.exports = {
  denunciarDilema,
  getDilemasDenunciados,
  getDenunciasDilema
};