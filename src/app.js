const express = require('express');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middlewares globales
app.use(express.json());

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Manejo de rutas inexistentes y errores centralizados
app.use(notFound);
app.use(errorHandler);

module.exports = app;
