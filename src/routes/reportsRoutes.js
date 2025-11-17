const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  denunciarDilema,
  getDilemasDenunciados,
  getDenunciasDilema
} = require('../controllers/reportsController');

router.post('/dilemas/:id/denunciar', authMiddleware, denunciarDilema);
router.get('/dilemas-denunciados', authMiddleware, getDilemasDenunciados);
router.get('/dilemas/:id/denuncias', authMiddleware, getDenunciasDilema);

module.exports = router;