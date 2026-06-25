# 🛒 Zepto Clone — Full Stack Grocery Delivery App

A full-stack clone of a 10-minute grocery delivery app (Zepto-style), built with a real **Node.js + Express backend**, a **SQLite database**, **JWT authentication**, and a **Tailwind CSS frontend**. Built for learning, portfolio, and placement purposes.

---
## 🌐 Live Demo

https://zepto-clone.onrender.com

## 💻 GitHub Repository

https://github.com/ShreyaMohite1117/zepto-clone

---

## 📸 Screenshots
---

## ✨ Features

- 🔐 **Real authentication** — signup/login with hashed passwords (bcrypt) + JWT sessions that persist across page reloads
- 🗃️ **Real relational database** — SQLite with `users`, `products`, `categories`, `orders`, `order_items` tables and foreign keys
- 🔎 **Server-side search, filter & sort** — category filter, price filter, text search, and price sort all run as real SQL queries via REST endpoints
- 🛍️ **Live product catalog** — 26 products across 9 categories, with stock tracking, discounts, ratings and units
- 🛒 **Shopping cart** — add/remove items, quantity controls capped to live stock
- 💳 **Checkout flow** — delivery address, payment method selection, atomic order placement (stock is decremented in a single DB transaction)
- 📦 **Order tracking** — order status (`Confirmed → Packed → Out for Delivery → Delivered`) is persisted in the database and advances automatically on the frontend
- 🧾 **Order history** — view all past orders and their items from your profile
- 🔔 **Toast notifications** — clean, non-blocking UI feedback instead of native browser alerts
- 📱 **Responsive UI** — works on mobile and desktop, built with Tailwind CSS

---

## 🧰 Tech Stack

| Layer        | Technology                                            |
|--------------|--------------------------------------------------------|
| Frontend     | HTML5, Tailwind CSS (CDN), Vanilla JavaScript (Fetch API) |
| Backend      | Node.js, Express.js                                   |
| Database     | SQLite (via `better-sqlite3`)                         |
| Auth         | JWT (`jsonwebtoken`) + password hashing (`bcryptjs`)   |
| Dev tooling  | `nodemon` for auto-restart during development          |

---

## 📁 Project Structure

```
zepto-clone/
├── backend/
│   ├── config/
│   │   └── db.js                  # SQLite connection + schema (CREATE TABLE statements)
│   ├── middleware/
│   │   └── auth.middleware.js     # JWT verification middleware
│   ├── routes/
│   │   ├── auth.routes.js         # /api/auth — register, login, me, profile
│   │   ├── products.routes.js     # /api/products — list, search, filter, sort, get one
│   │   ├── categories.routes.js   # /api/categories — list categories
│   │   └── orders.routes.js       # /api/orders — place order, history, tracking
│   ├── database/                  # zepto.db is auto-created here on first run
│   ├── seed.js                     # Seeds categories + products on first run
│   ├── server.js                   # Express app entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js                   # All frontend logic — calls the backend REST API
├── package.json                    # Convenience scripts for the whole project
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🚀 Getting Started (VS Code)

### 1. Unzip the project and open it in VS Code
```bash
unzip zepto-clone.zip
cd zepto-clone
code .
```

### 2. Install backend dependencies
Open a terminal in VS Code (`` Ctrl/Cmd + ` ``) and run:
```bash
cd backend
npm install
```

### 3. (Optional) Configure environment variables
```bash
cp .env.example .env
```
The app also runs fine **without** this step — it falls back to sane defaults so you can get started immediately.

### 4. Start the server
```bash
npm start
```
You should see:
```
--------------------------------------------------
  Zepto Clone server running at http://localhost:5000
--------------------------------------------------
```

### 5. Open the app
Go to **http://localhost:5000** in your browser. The Express server serves both the API *and* the frontend, so this single URL gives you the whole working app — no separate frontend server needed.

> 💡 For auto-restart on file changes during development, run `npm run dev` instead of `npm start` (uses `nodemon`).

---

## 🔌 API Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint                  | Auth required | Description                          |
|--------|----------------------------|----------------|--------------------------------------|
| POST   | `/auth/register`           | No             | Create a new account                 |
| POST   | `/auth/login`               | No             | Log in, returns a JWT                |
| GET    | `/auth/me`                  | Yes            | Get the logged-in user's profile     |
| PUT    | `/auth/profile`             | Yes            | Update phone / address               |
| GET    | `/categories`               | No             | List all categories                  |
| GET    | `/products`                 | No             | List products (`?category=&search=&price=&sort=`) |
| GET    | `/products/:id`             | No             | Get a single product                 |
| POST   | `/orders`                   | Yes            | Place an order (validates & decrements stock atomically) |
| GET    | `/orders`                   | Yes            | Get the logged-in user's order history |
| GET    | `/orders/:id`                | Yes            | Get a single order                   |
| PATCH  | `/orders/:id/advance`        | Yes            | Advance the order to its next tracking status |

Authenticated requests must include the JWT in the header:
```
Authorization: Bearer <token>
```

---

## 🗄️ Database Schema

```
users          (id, name, email, password_hash, phone, address, created_at)
categories     (id, name, icon)
products       (id, name, category, price, discount, stock, image_url, unit, rating, description)
orders         (id, user_id, total_amount, payment_method, delivery_address, status, created_at)
order_items    (id, order_id, product_id, product_name, quantity, price_at_purchase)
```

The SQLite file lives at `backend/database/zepto.db` once the server has run at least once. You can open it directly with the **[DB Browser for SQLite](https://sqlitebrowser.org/)** GUI tool, or the **SQLite Viewer** extension in VS Code, to inspect your data.

---

## 🔄 CI/CD

This repo includes a GitHub Actions workflow at `.github/workflows/ci.yml`. On every push or pull request to `main`, it:

1. Installs backend dependencies on Node 18.x and 20.x
2. Syntax-checks every backend source file
3. Boots the real server and hits `/api/health`, `/api/products`, and `/api/categories` to confirm the API actually responds correctly — not just "does it install"

You'll see this running automatically under the **Actions** tab once you push to GitHub. A green check next to your commits is a nice, visible signal on your resume/portfolio that the project is tested.

### Continuous Deployment

For the "CD" half — auto-deploying on every push — the simplest options for this stack are:

**Render** (recommended — includes a ready-to-use `render.yaml` in this repo)
1. Push this repo to GitHub.
2. On [render.com](https://render.com), click **New +** → **Blueprint**, and connect your repo. Render reads `render.yaml` automatically and deploys the backend (which also serves the frontend).
3. From then on, every push to `main` auto-deploys.
4. ⚠️ Note: Render's **free** tier uses an ephemeral filesystem, so the SQLite file resets on every deploy/restart (fine for a demo). To persist real data across deploys, add a small **Persistent Disk** in the Render dashboard (a couple dollars/month) — the commented-out `disk:` block in `render.yaml` shows where it mounts.

**Railway** (also simple, no config file needed)
1. Push to GitHub, then on [railway.app](https://railway.app) choose **New Project** → **Deploy from GitHub repo**.
2. Set the **root directory** to `backend` and the start command to `npm start`.
3. Add a **Volume** mounted at `backend/database` if you want the SQLite file to survive redeploys.

Either way, set `JWT_SECRET` as an environment variable in the host's dashboard for production (don't rely on the in-code dev fallback once it's public).

## 🩹 Troubleshooting

- **`better-sqlite3` fails to install / build error** → Make sure you're on **Node.js 18+**. Run `node -v` to check. On Windows, installing the "Desktop development with C++" workload via Visual Studio Build Tools usually fixes native module build issues.
- **Port 5000 already in use** → Set a different `PORT` in `backend/.env` (copy from `.env.example` first).
- **Login session doesn't persist** → Check your browser's console for errors; make sure you're accessing the app via `http://localhost:5000` and not opening `index.html` directly as a file.
- **Want a clean database?** → Stop the server, delete the `backend/database/zepto.db*` files, and restart — it will reseed automatically.

---

## 🔮 Possible Future Enhancements

These are good talking points for interviews about what you'd add next:
- Real OTP-based phone verification (e.g. via Twilio)
- Payment gateway integration (Razorpay/Stripe sandbox mode)
- An admin dashboard for managing products/orders
- Migrating the frontend to React/Next.js
- Dockerizing the app for one-command deployment
- Switching to PostgreSQL + an ORM (Prisma/Sequelize) for production scale
- Redis caching for the product catalog
- Unit + integration tests (Jest/Supertest)

---

## 📝 Notes for Your Resume / Interview

This project demonstrates: REST API design, relational database schema design with foreign keys, password hashing & JWT-based authentication, atomic database transactions (stock updates), server-side search/filter/sort, and a responsive frontend consuming a real backend — a solid full-stack project to walk an interviewer through end-to-end.

This is an original clone built for learning/portfolio purposes and is not affiliated with or endorsed by the real Zepto company.

---

## 📄 License

MIT — free to use, modify, and build on for your own learning and portfolio.
