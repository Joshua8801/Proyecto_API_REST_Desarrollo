const express = require('express');
const { getProducts, createProduct } = require('../controllers/productController');
const { protect, soloAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getProducts);
router.post('/', protect, soloAdmin, createProduct);

module.exports = router;
