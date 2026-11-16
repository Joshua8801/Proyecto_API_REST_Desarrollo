const mongoose = require('mongoose');

/**
 * Establece la conexión con MongoDB usando la URI configurada en las variables de entorno.
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('La variable de entorno MONGO_URI no está definida');
  }

  const conn = await mongoose.connect(mongoUri);
  console.log(`MongoDB conectado: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
