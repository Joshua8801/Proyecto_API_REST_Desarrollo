const express = require('express');
const {
  getOrders,
  getOrderById,
  createOrder,
  returnOrder
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, createOrder);
router.put('/:id/return', protect, returnOrder);

module.exports = router;
