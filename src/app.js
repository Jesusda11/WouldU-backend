const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const dilemasRoutes = require('./routes/dilemasRoutes');
const responsesRoutes = require('./routes/responsesRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api', authRoutes);
app.use('/api', dilemasRoutes);
app.use('/api', responsesRoutes);
app.use('/api', reportsRoutes);

app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Ruta no encontrada' 
  });
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;