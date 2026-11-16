const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

const crearError = (mensaje, statusCode) => {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  return error;
};

/**
 * GET /api/orders
 * Lista las órdenes del cliente autenticado o todas las órdenes si es admin.
 */
const getOrders = async (req, res, next) => {
  try {
    const filtro = req.user.rol === 'admin' ? {} : { usuario: req.user._id };

    const query = Order.find(filtro)
      .populate('items.producto', 'nombre precio')
      .sort({ createdAt: -1 });

    if (req.user.rol === 'admin') {
      query.populate('usuario', 'nombre email rol');
    }

    const ordenes = await query;

    return res.status(200).json({
      ok: true,
      total: ordenes.length,
      ordenes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders/:id
 * Obtiene una orden específica si pertenece al usuario autenticado o si es admin.
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID de orden inválido'
      });
    }

    const orden = await Order.findById(id)
      .populate('items.producto', 'nombre descripcion precio')
      .populate('usuario', 'nombre email rol');

    if (!orden) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Orden no encontrada'
      });
    }

    const propietarioId = orden.usuario && orden.usuario._id
      ? orden.usuario._id.toString()
      : orden.usuario.toString();
    const esPropietario = propietarioId === req.user._id.toString();
    const esAdmin = req.user.rol === 'admin';

    if (!esPropietario && !esAdmin) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tienes permiso para consultar esta orden'
      });
    }

    return res.status(200).json({
      ok: true,
      orden
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/orders
 * Crea una orden de compra descontando stock atómicamente dentro de una transacción.
 */
const createOrder = async (req, res, next) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Debes enviar un arreglo no vacío de items'
    });
  }

  const cantidadesPorProducto = new Map();

  for (const item of items) {
    if (!item || !mongoose.Types.ObjectId.isValid(item.producto)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Cada item debe incluir un ObjectId de producto válido'
      });
    }

    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La cantidad de cada item debe ser un número entero mayor que cero'
      });
    }

    const productoId = String(item.producto);
    cantidadesPorProducto.set(
      productoId,
      (cantidadesPorProducto.get(productoId) || 0) + item.cantidad
    );
  }

  const session = await mongoose.startSession();

  try {
    let ordenCreada;

    await session.withTransaction(async () => {
      const itemsOrden = [];
      let totalCalculado = 0;

      for (const [productoId, cantidad] of cantidadesPorProducto.entries()) {
        const producto = await Product.findById(productoId).session(session);
        if (!producto) {
          throw crearError(`Producto no encontrado: ${productoId}`, 404);
        }

        const productoActualizado = await Product.findOneAndUpdate(
          { _id: producto._id, stock: { $gte: cantidad } },
          { $inc: { stock: -cantidad } },
          { new: true, session }
        );

        if (!productoActualizado) {
          throw crearError(`Stock insuficiente para el producto: ${producto.nombre}`, 409);
        }

        const precioUnitario = producto.precio;
        totalCalculado += precioUnitario * cantidad;

        itemsOrden.push({
          producto: producto._id,
          cantidad,
          precioUnitario
        });
      }

      const [orden] = await Order.create(
        [
          {
            usuario: req.user._id,
            items: itemsOrden,
            total: Number(totalCalculado.toFixed(2)),
            estado: 'completada'
          }
        ],
        { session }
      );

      ordenCreada = orden;
    });

    return res.status(201).json({
      ok: true,
      mensaje: 'Orden creada correctamente',
      orden: ordenCreada
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        ok: false,
        mensaje: error.message
      });
    }
    next(error);
  } finally {
    await session.endSession();
  }
};

/**
 * PUT /api/orders/:id/return
 * Procesa la devolución de una orden completada y restaura el stock en una transacción.
 */
const returnOrder = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'ID de orden inválido'
    });
  }

  const session = await mongoose.startSession();

  try {
    let ordenDevuelta;

    await session.withTransaction(async () => {
      const orden = await Order.findById(id).session(session);
      if (!orden) {
        throw crearError('Orden no encontrada', 404);
      }

      const esPropietario = orden.usuario.toString() === req.user._id.toString();
      const esAdmin = req.user.rol === 'admin';

      if (!esPropietario && !esAdmin) {
        throw crearError('No tienes permiso para devolver esta orden', 403);
      }

      if (orden.estado !== 'completada') {
        throw crearError('La orden ya fue devuelta anteriormente', 409);
      }

      const ordenActualizada = await Order.findOneAndUpdate(
        { _id: orden._id, estado: 'completada' },
        {
          $set: {
            estado: 'devuelta',
            fechaDevolucion: new Date()
          }
        },
        { new: true, runValidators: true, session }
      );

      if (!ordenActualizada) {
        throw crearError('La orden ya fue devuelta anteriormente', 409);
      }

      for (const item of ordenActualizada.items) {
        const productoActualizado = await Product.findByIdAndUpdate(
          item.producto,
          { $inc: { stock: item.cantidad } },
          { new: true, session }
        );

        if (!productoActualizado) {
          throw crearError(`Producto no encontrado al restaurar stock: ${item.producto}`, 404);
        }
      }

      ordenDevuelta = ordenActualizada;
    });

    return res.status(200).json({
      ok: true,
      mensaje: 'Orden devuelta correctamente',
      orden: ordenDevuelta
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        ok: false,
        mensaje: error.message
      });
    }
    next(error);
  } finally {
    await session.endSession();
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  returnOrder
};
