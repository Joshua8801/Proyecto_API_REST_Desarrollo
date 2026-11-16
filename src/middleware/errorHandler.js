/**
 * Middleware para rutas inexistentes (404).
 */
const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Middleware centralizado para el manejo de errores.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  res.status(statusCode).json({
    ok: false,
    mensaje: err.message || 'Error interno del servidor'
  });
};

module.exports = {
  notFound,
  errorHandler
};
