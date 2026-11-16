const express = require('express');
const { createOrder, returnOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createOrder);
router.put('/:id/return', protect, returnOrder);

module.exports = router;
