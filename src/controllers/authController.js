const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generarToken = (user) => {
  return jwt.sign(
    { id: user._id, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
};

const formatearUsuarioPublico = (user) => ({
  id: user._id,
  nombre: user.nombre,
  email: user.email,
  rol: user.rol
});

/**
 * POST /api/auth/register
 * Registra un nuevo usuario asignando siempre el rol 'cliente'.
 */
const register = async (req, res, next) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Todos los campos son obligatorios: nombre, email y password'
      });
    }

    const emailNormalizado = String(email).toLowerCase().trim();
    const usuarioExistente = await User.findOne({ email: emailNormalizado });

    if (usuarioExistente) {
      return res.status(409).json({
        ok: false,
        mensaje: 'El correo electrónico ya está registrado'
      });
    }

    const user = await User.create({
      nombre,
      email: emailNormalizado,
      password,
      rol: 'cliente'
    });

    return res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado correctamente',
      usuario: formatearUsuarioPublico(user)
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        ok: false,
        mensaje: mensajes.join('. ')
      });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        ok: false,
        mensaje: 'El correo electrónico ya está registrado'
      });
    }
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Autentica un usuario y devuelve un JWT junto con sus datos públicos.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debes proporcionar email y password'
      });
    }

    const emailNormalizado = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: emailNormalizado }).select('+password');

    if (!user || !(await user.compararPassword(password))) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Credenciales inválidas'
      });
    }

    const token = generarToken(user);

    return res.status(200).json({
      ok: true,
      token,
      usuario: formatearUsuarioPublico(user)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login
};
