const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');

const validarDatosProducto = ({ nombre, descripcion, precio, stock }, esActualizacion = false) => {
  if (!esActualizacion) {
    if (typeof nombre !== 'string' || nombre.trim().length === 0) {
      return 'El nombre del producto es obligatorio';
    }
    if (precio === undefined || precio === null || typeof precio !== 'number' || Number.isNaN(precio)) {
      return 'El precio es obligatorio y debe ser un número válido';
    }
    if (stock === undefined || stock === null || typeof stock !== 'number' || Number.isNaN(stock)) {
      return 'El stock es obligatorio y debe ser un número válido';
    }
  } else {
    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
      return 'El nombre del producto no puede estar vacío';
    }
    if (precio !== undefined && (typeof precio !== 'number' || Number.isNaN(precio))) {
      return 'El precio debe ser un número válido';
    }
    if (stock !== undefined && (typeof stock !== 'number' || Number.isNaN(stock))) {
      return 'El stock debe ser un número válido';
    }
  }

  if (descripcion !== undefined && typeof descripcion !== 'string') {
    return 'La descripción debe ser una cadena de texto';
  }
  if (precio !== undefined && (!Number.isFinite(precio) || precio < 0)) {
    return 'El precio no puede ser negativo';
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    return 'El stock debe ser un número entero mayor o igual a 0';
  }

  return null;
};

/**
 * GET /api/products
 * Lista los productos del catálogo.
 */
const getProducts = async (req, res, next) => {
  try {
    const productos = await Product.find().sort({ createdAt: -1 });
    return res.status(200).json({
      ok: true,
      total: productos.length,
      productos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id
 * Obtiene un producto específico por su ObjectId.
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID de producto inválido'
      });
    }

    const producto = await Product.findById(id);
    if (!producto) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Producto no encontrado'
      });
    }

    return res.status(200).json({
      ok: true,
      producto
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products
 * Crea un nuevo producto (solo admin).
 */
const createProduct = async (req, res, next) => {
  try {
    const { nombre, descripcion, precio, stock } = req.body;

    const errorValidacion = validarDatosProducto({ nombre, descripcion, precio, stock }, false);
    if (errorValidacion) {
      return res.status(400).json({
        ok: false,
        mensaje: errorValidacion
      });
    }

    const nombreNormalizado = nombre.trim();
    const existente = await Product.findOne({ nombre: nombreNormalizado });
    if (existente) {
      return res.status(409).json({
        ok: false,
        mensaje: 'Ya existe un producto con ese nombre'
      });
    }

    const producto = await Product.create({
      nombre: nombreNormalizado,
      descripcion: descripcion !== undefined ? descripcion.trim() : '',
      precio,
      stock
    });

    return res.status(201).json({
      ok: true,
      mensaje: 'Producto creado correctamente',
      producto
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        ok: false,
        mensaje: 'Ya existe un producto con ese nombre'
      });
    }
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        ok: false,
        mensaje: mensajes.join('. ')
      });
    }
    next(error);
  }
};

/**
 * PUT /api/products/:id
 * Actualiza los campos permitidos de un producto existente (solo admin).
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID de producto inválido'
      });
    }

    const { nombre, descripcion, precio, stock } = req.body;

    if (
      nombre === undefined &&
      descripcion === undefined &&
      precio === undefined &&
      stock === undefined
    ) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debes enviar al menos un campo válido para actualizar (nombre, descripcion, precio, stock)'
      });
    }

    const errorValidacion = validarDatosProducto({ nombre, descripcion, precio, stock }, true);
    if (errorValidacion) {
      return res.status(400).json({
        ok: false,
        mensaje: errorValidacion
      });
    }

    const actualizaciones = {};
    if (nombre !== undefined) actualizaciones.nombre = nombre.trim();
    if (descripcion !== undefined) actualizaciones.descripcion = descripcion.trim();
    if (precio !== undefined) actualizaciones.precio = precio;
    if (stock !== undefined) actualizaciones.stock = stock;

    if (actualizaciones.nombre) {
      const duplicado = await Product.findOne({
        nombre: actualizaciones.nombre,
        _id: { $ne: id }
      });
      if (duplicado) {
        return res.status(409).json({
          ok: false,
          mensaje: 'Ya existe un producto con ese nombre'
        });
      }
    }

    const producto = await Product.findByIdAndUpdate(id, actualizaciones, {
      new: true,
      runValidators: true
    });

    if (!producto) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Producto no encontrado'
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: 'Producto actualizado correctamente',
      producto
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        ok: false,
        mensaje: 'Ya existe un producto con ese nombre'
      });
    }
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        ok: false,
        mensaje: mensajes.join('. ')
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/products/:id
 * Elimina un producto solo si no forma parte de pedidos históricos (solo admin).
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID de producto inválido'
      });
    }

    const producto = await Product.findById(id);
    if (!producto) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Producto no encontrado'
      });
    }

    const tienePedidos = await Order.exists({ 'items.producto': id });
    if (tienePedidos) {
      return res.status(409).json({
        ok: false,
        mensaje: 'No se puede eliminar el producto porque forma parte de pedidos históricos'
      });
    }

    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      ok: true,
      mensaje: 'Producto eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
