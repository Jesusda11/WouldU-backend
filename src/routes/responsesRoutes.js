const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  responderDilema,
  getMisRespuestas
} = require('../controllers/responsesController');

router.post('/dilemas/:id/responder', authMiddleware, responderDilema);
router.get('/mis-respuestas', authMiddleware, getMisRespuestas);

module.exports = router;