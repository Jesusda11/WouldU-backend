const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getAllDilemas,
  getDilemaById,
  createDilema,
  updateDilema,
  deleteDilema
} = require('../controllers/dilemasController');

router.get('/dilemas', getAllDilemas);
router.get('/dilemas/:id', getDilemaById);

router.post('/dilemas', authMiddleware, createDilema);
router.put('/dilemas/:id', authMiddleware, updateDilema);
router.delete('/dilemas/:id', authMiddleware, deleteDilema);

module.exports = router;