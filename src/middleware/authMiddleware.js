const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifica el token JWT en Authorization: Bearer <token> y adjunta el usuario a req.user.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No autorizado: token no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No autorizado: token no proporcionado'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No autorizado: token inválido o expirado'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No autorizado: el usuario ya no existe'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Permite el acceso únicamente a usuarios con rol 'admin'.
 */
const soloAdmin = (req, res, next) => {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({
      ok: false,
      mensaje: 'Acceso denegado: se requiere rol de administrador'
    });
  }

  next();
};

module.exports = {
  protect,
  soloAdmin
};
