const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, soloAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', protect, soloAdmin, createProduct);
router.put('/:id', protect, soloAdmin, updateProduct);
router.delete('/:id', protect, soloAdmin, deleteProduct);

module.exports = router;
