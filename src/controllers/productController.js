/**
 * Controlador de productos.
 * La lógica de negocio de consulta y creación de productos se implementará en la siguiente fase.
 */
const getProducts = async (req, res, next) => {
  try {
    res.status(501).json({
      ok: false,
      mensaje: 'Listado de productos pendiente de implementación'
    });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    res.status(501).json({
      ok: false,
      mensaje: 'Creación de producto pendiente de implementación'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  createProduct
};
