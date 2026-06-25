/**
 * Seeds the database with categories + a realistic product catalog
 * the FIRST time the server runs. Safe to require multiple times —
 * it only inserts data if the tables are empty.
 */
const db = require('./config/db');

const categories = [
  { name: 'All', icon: 'fa-solid fa-border-all' },
  { name: 'Fruits & Vegetables', icon: 'fa-solid fa-carrot' },
  { name: 'Munchies', icon: 'fa-solid fa-cookie-bite' },
  { name: 'Dairy & Bread', icon: 'fa-solid fa-cheese' },
  { name: 'Cold Drinks', icon: 'fa-solid fa-bottle-water' },
  { name: 'Bakery', icon: 'fa-solid fa-bread-slice' },
  { name: 'Personal Care', icon: 'fa-solid fa-pump-soap' },
  { name: 'Ice Cream & Frozen', icon: 'fa-solid fa-ice-cream' },
  { name: 'Baby Care', icon: 'fa-solid fa-baby' },
];

const products = [
  // Fruits & Vegetables
  { name: 'Fresh Organic Bananas', category: 'Fruits & Vegetables', price: 45, discount: 10, stock: 12, unit: '6 pcs', rating: 4.3, image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=80' },
  { name: 'Fresh Red Tomatoes', category: 'Fruits & Vegetables', price: 32, discount: 0, stock: 8, unit: '500 g', rating: 4.1, image_url: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=500&auto=format&fit=crop&q=80' },
  { name: 'Royal Gala Apples', category: 'Fruits & Vegetables', price: 120, discount: 5, stock: 18, unit: '4 pcs', rating: 4.5, image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=80' },
  { name: 'Farm Fresh Spinach', category: 'Fruits & Vegetables', price: 28, discount: 0, stock: 14, unit: '250 g', rating: 4.0, image_url: 'https://images.unsplash.com/photo-1683536905403-ea18a3176d29?w=500&auto=format&fit=crop&q=80' },
  { name: 'Hybrid Onions', category: 'Fruits & Vegetables', price: 38, discount: 0, stock: 30, unit: '1 kg', rating: 4.2, image_url: 'https://images.unsplash.com/photo-1642582037312-9b9639be89e6?w=500&auto=format&fit=crop&q=80' },
  // Munchies
  { name: 'Potato Chips (Salted)', category: 'Munchies', price: 20, discount: 5, stock: 20, unit: '52 g', rating: 4.4, image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80' },
  { name: 'Chocolate Chip Cookies', category: 'Munchies', price: 50, discount: 15, stock: 3, unit: '150 g', rating: 4.6, image_url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80' },
  { name: 'Roasted Peanuts Masala', category: 'Munchies', price: 35, discount: 0, stock: 22, unit: '200 g', rating: 4.1, image_url: 'https://images.unsplash.com/photo-1549978113-29eb25c8177f?w=500&auto=format&fit=crop&q=80' },
  { name: 'Cheese Nachos Pack', category: 'Munchies', price: 65, discount: 10, stock: 9, unit: '100 g', rating: 4.3, image_url: 'https://images.unsplash.com/photo-1638992147921-f054a9829b96?w=500&auto=format&fit=crop&q=80' },
  // Dairy & Bread
  { name: 'Fresh Whole Milk', category: 'Dairy & Bread', price: 64, discount: 0, stock: 15, unit: '1 L', rating: 4.5, image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80' },
  { name: 'Salted Butter', category: 'Dairy & Bread', price: 58, discount: 8, stock: 2, unit: '100 g', rating: 4.4, image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80' },
  { name: 'Brown Bread Loaf', category: 'Dairy & Bread', price: 45, discount: 0, stock: 16, unit: '400 g', rating: 4.0, image_url: 'https://images.unsplash.com/photo-1719161148345-c88b05af8186?w=500&auto=format&fit=crop&q=80' },
  { name: 'Farm Fresh Paneer', category: 'Dairy & Bread', price: 90, discount: 5, stock: 11, unit: '200 g', rating: 4.6, image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80' },
  { name: 'Greek Style Yogurt', category: 'Dairy & Bread', price: 75, discount: 0, stock: 13, unit: '400 g', rating: 4.3, image_url: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=500&auto=format&fit=crop&q=80' },
  // Cold Drinks
  { name: 'Coca Cola Zero', category: 'Cold Drinks', price: 40, discount: 0, stock: 25, unit: '300 ml', rating: 4.2, image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80' },
  { name: 'Sparkling Energy Drink', category: 'Cold Drinks', price: 110, discount: 20, stock: 6, unit: '250 ml', rating: 4.0, image_url: 'https://images.unsplash.com/photo-1622543953490-0b7006875e52?w=500&auto=format&fit=crop&q=80' },
  { name: 'Fresh Orange Juice', category: 'Cold Drinks', price: 85, discount: 0, stock: 10, unit: '1 L', rating: 4.4, image_url: 'https://images.unsplash.com/photo-1641659735894-45046caad624?w=500&auto=format&fit=crop&q=80' },
  { name: 'Mineral Water', category: 'Cold Drinks', price: 20, discount: 0, stock: 40, unit: '1 L', rating: 4.1, image_url: 'https://images.unsplash.com/photo-1675914861279-921639cd47e1?w=500&auto=format&fit=crop&q=80' },
  // Bakery
  { name: 'Butter Croissant', category: 'Bakery', price: 55, discount: 0, stock: 7, unit: '2 pcs', rating: 4.5, image_url: 'https://images.unsplash.com/photo-1623334044303-241021148842?w=500&auto=format&fit=crop&q=80' },
  { name: 'Chocolate Birthday Cake', category: 'Bakery', price: 399, discount: 10, stock: 4, unit: '500 g', rating: 4.7, image_url: 'https://images.unsplash.com/photo-1642443162669-b0ea91a3f09b?w=500&auto=format&fit=crop&q=80' },
  // Personal Care
  { name: 'Herbal Shampoo', category: 'Personal Care', price: 180, discount: 12, stock: 17, unit: '340 ml', rating: 4.2, image_url: 'https://images.unsplash.com/photo-1701992678972-d5a053ad0fb0?w=500&auto=format&fit=crop&q=80' },
  { name: 'Hand Sanitizer', category: 'Personal Care', price: 60, discount: 0, stock: 28, unit: '200 ml', rating: 4.0, image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80' },
  // Ice Cream & Frozen
  { name: 'Vanilla Ice Cream Tub', category: 'Ice Cream & Frozen', price: 150, discount: 15, stock: 5, unit: '700 ml', rating: 4.6, image_url: 'https://images.unsplash.com/photo-1515037028865-0a2a82603f7c?w=500&auto=format&fit=crop&q=80' },
  { name: 'Frozen Veg Momos', category: 'Ice Cream & Frozen', price: 95, discount: 0, stock: 12, unit: '400 g', rating: 4.3, image_url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80' },
  // Baby Care
  { name: 'Baby Diapers (M)', category: 'Baby Care', price: 449, discount: 8, stock: 9, unit: '34 pcs', rating: 4.5, image_url: 'https://images.unsplash.com/photo-1695998575453-f155392a95ba?w=500&auto=format&fit=crop&q=80' },
  { name: 'Baby Wipes', category: 'Baby Care', price: 99, discount: 0, stock: 21, unit: '80 pcs', rating: 4.4, image_url: 'https://placehold.co/500x500/fae8ff/86198f?text=Baby+Wipes' },
];

function seedDatabase() {
  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  if (categoryCount === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)');
    const insertMany = db.transaction((rows) => rows.forEach((c) => insertCategory.run(c.name, c.icon)));
    insertMany(categories);
    console.log(`✓ Seeded ${categories.length} categories.`);
  }

  const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, category, price, discount, stock, image_url, unit, rating)
      VALUES (@name, @category, @price, @discount, @stock, @image_url, @unit, @rating)
    `);
    const insertMany = db.transaction((rows) => rows.forEach((p) => insertProduct.run(p)));
    insertMany(products);
    console.log(`✓ Seeded ${products.length} products.`);
  }
}

seedDatabase();

module.exports = seedDatabase;
