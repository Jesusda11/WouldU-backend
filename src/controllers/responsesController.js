const { query } = require('../config/database');


const responderDilema = async (req, res) => {
  try {
    const { id } = req.params; 
    const { opcion_elegida } = req.body;
    const userId = req.user.id;
    
    if (!opcion_elegida || !['A', 'B'].includes(opcion_elegida)) {
      return res.status(400).json({
        success: false,
        message: 'La opción debe ser "A" o "B"'
      });
    }
    
    const dilemaExists = await query(
      'SELECT id FROM dilemas WHERE id = $1 AND activo = true',
      [id]
    );
    
    if (dilemaExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dilema no encontrado'
      });
    }
    
    const yaRespondio = await query(
      'SELECT id FROM respuestas WHERE dilema_id = $1 AND usuario_id = $2',
      [id, userId]
    );
    
    if (yaRespondio.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya has respondido a este dilema'
      });
    }
    
    await query(
      'INSERT INTO respuestas (dilema_id, usuario_id, opcion_elegida) VALUES ($1, $2, $3)',
      [id, userId, opcion_elegida]
    );
    
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
    const porcentajeA = Math.round((stats.votos_a / totalVotos) * 100);
    const porcentajeB = Math.round((stats.votos_b / totalVotos) * 100);
    
    res.status(201).json({
      success: true,
      message: 'Respuesta registrada exitosamente',
      data: {
        opcion_elegida,
        estadisticas: {
          total_votos: totalVotos,
          porcentaje_a: porcentajeA,
          porcentaje_b: porcentajeB,
          votos_a: parseInt(stats.votos_a),
          votos_b: parseInt(stats.votos_b)
        }
      }
    });
    
  } catch (error) {
    console.error('Error al responder dilema:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar respuesta',
      error: error.message
    });
  }
};

const getMisRespuestas = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(
      `SELECT r.*, d.titulo, d.opcion_a, d.opcion_b
       FROM respuestas r
       JOIN dilemas d ON r.dilema_id = d.id
       WHERE r.usuario_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error al obtener respuestas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener respuestas',
      error: error.message
    });
  }
};

module.exports = {
  responderDilema,
  getMisRespuestas
};