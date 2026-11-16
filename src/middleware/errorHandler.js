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
  let statusCode = err.statusCode || 500;
  let mensaje = err.message || 'Error interno del servidor';

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    mensaje = Object.values(err.errors)
      .map((e) => e.message)
      .join('. ');
  } else if (err.code === 11000) {
    statusCode = 409;
    const campo = err.keyValue ? Object.keys(err.keyValue).join(', ') : 'clave';
    mensaje = `Ya existe un registro con ese valor duplicado (${campo})`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    mensaje = `Identificador o valor inválido para el campo ${err.path}`;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    mensaje = 'No autorizado: token inválido o expirado';
  } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    mensaje = 'JSON inválido en el cuerpo de la petición';
  }

  res.status(statusCode).json({
    ok: false,
    mensaje
  });
};

module.exports = {
  notFound,
  errorHandler
};
