const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Every route below requires a logged-in user
router.use(authenticate);

const STATUS_SEQUENCE = ['Confirmed', 'Packed', 'Out for Delivery', 'Delivered'];

// POST /api/orders  -> place a new order
router.post('/', (req, res) => {
  try {
    const { items, address, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, message: 'A delivery address is required.' });
    }

    const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
    const orderLines = [];
    let totalAmount = 0;

    // Validate stock BEFORE touching the database
    for (const item of items) {
      const product = getProduct.get(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `One of the items in your cart no longer exists.` });
      }
      if (product.stock < item.qty) {
        return res.status(409).json({
          success: false,
          message: `Only ${product.stock} unit(s) of "${product.name}" left in stock.`,
        });
      }
      const finalPrice = product.discount > 0 ? Math.round(product.price * (1 - product.discount / 100)) : product.price;
      totalAmount += finalPrice * item.qty;
      orderLines.push({ product, qty: item.qty, finalPrice });
    }

    const insertOrder = db.prepare(
      'INSERT INTO orders (user_id, total_amount, payment_method, delivery_address, status) VALUES (?, ?, ?, ?, ?)'
    );
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)'
    );
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    // Run as a single atomic transaction — if anything fails, nothing is saved
    const placeOrderTxn = db.transaction(() => {
      const orderInfo = insertOrder.run(req.userId, totalAmount, paymentMethod || 'UPI', address.trim(), 'Confirmed');
      const orderId = orderInfo.lastInsertRowid;

      orderLines.forEach((line) => {
        insertItem.run(orderId, line.product.id, line.product.name, line.qty, line.finalPrice);
        updateStock.run(line.qty, line.product.id);
      });

      return orderId;
    });

    const orderId = placeOrderTxn();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('Place order error:', err);
    res.status(500).json({ success: false, message: 'Failed to place your order. Please try again.' });
  }
});

// GET /api/orders -> logged-in user's order history
router.get('/', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  const withItems = orders.map((o) => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id),
  }));
  res.json({ success: true, orders: withItems });
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ success: true, order });
});

// PATCH /api/orders/:id/advance -> moves the order to its next tracking status
// (the frontend calls this on a timer to simulate the 10-minute delivery pipeline,
//  and the new status is persisted for real in the database)
router.patch('/:id/advance', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  const currentIdx = STATUS_SEQUENCE.indexOf(order.status);
  const nextIdx = Math.min(currentIdx + 1, STATUS_SEQUENCE.length - 1);
  const nextStatus = STATUS_SEQUENCE[nextIdx];

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(nextStatus, order.id);

  res.json({ success: true, status: nextStatus, isFinal: nextIdx === STATUS_SEQUENCE.length - 1 });
});

module.exports = router;
