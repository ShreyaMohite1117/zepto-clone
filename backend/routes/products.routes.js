const express = require('express');
const db = require('../config/db');

const router = express.Router();

function withFinalPrice(p) {
  return {
    ...p,
    finalPrice: p.discount > 0 ? Math.round(p.price * (1 - p.discount / 100)) : p.price,
  };
}

// GET /api/products?category=&search=&price=&sort=
router.get('/', (req, res) => {
  try {
    const { category, search, price, sort } = req.query;

    let query = 'SELECT * FROM products WHERE 1 = 1';
    const params = [];

    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      query += ' AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)';
      const term = `%${search.toLowerCase().trim()}%`;
      params.push(term, term);
    }

    let products = db.prepare(query).all(...params).map(withFinalPrice);

    if (price === 'under50') products = products.filter((p) => p.finalPrice < 50);
    if (price === 'above50') products = products.filter((p) => p.finalPrice >= 50);

    if (sort === 'lowHigh') products.sort((a, b) => a.finalPrice - b.finalPrice);
    if (sort === 'highLow') products.sort((a, b) => b.finalPrice - a.finalPrice);

    res.json({ success: true, count: products.length, products });
  } catch (err) {
    console.error('Product list error:', err);
    res.status(500).json({ success: false, message: 'Failed to load products.' });
  }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
  res.json({ success: true, product: withFinalPrice(product) });
});

module.exports = router;
