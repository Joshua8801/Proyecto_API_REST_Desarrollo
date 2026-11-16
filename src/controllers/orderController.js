/**
 * Controlador de órdenes.
 * La lógica de negocio de creación y devolución de órdenes se implementará en la siguiente fase.
 */
const createOrder = async (req, res, next) => {
  try {
    res.status(501).json({
      ok: false,
      mensaje: 'Creación de orden pendiente de implementación'
    });
  } catch (error) {
    next(error);
  }
};

const returnOrder = async (req, res, next) => {
  try {
    res.status(501).json({
      ok: false,
      mensaje: 'Devolución de orden pendiente de implementación'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  returnOrder
};
