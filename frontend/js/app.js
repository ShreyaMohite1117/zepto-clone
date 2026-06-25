/* =========================================================
   ZEPTO CLONE — FRONTEND APPLICATION LOGIC
   Talks to the Express + SQLite backend over the REST API
   defined in /backend/routes/*.js
   ========================================================= */

const API_BASE = '/api';

// ---------------- App state ----------------
let cart = [];                 // [{ ...product, qty }]
let currentUser = null;        // { id, name, email, phone, address }
let authToken = localStorage.getItem('zepto_token') || null;
let selectedCategory = 'All';
let categoriesCache = [];
let productsCache = {};        // id -> product (for quick stock lookups)
let authMode = 'login';        // 'login' | 'signup'
let searchDebounceTimer = null;
let trackingInterval = null;

// ---------------- App startup ----------------
window.addEventListener('DOMContentLoaded', async () => {
  await loadCategories();
  await loadProducts();
  await restoreSession();
});

// =========================================================
// API HELPER
// =========================================================
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }
  return data;
}

// =========================================================
// TOASTS
// =========================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const palette = {
    success: { bg: 'bg-green-600', icon: 'fa-circle-check' },
    error: { bg: 'bg-red-600', icon: 'fa-circle-exclamation' },
    info: { bg: 'bg-purple-700', icon: 'fa-circle-info' },
  };
  const style = palette[type] || palette.info;

  const toast = document.createElement('div');
  toast.className = `toast-enter ${style.bg} text-white font-bold px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3`;
  toast.innerHTML = `<i class="fa-solid ${style.icon} text-xl"></i><span class="text-base">${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.add('toast-leave');
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =========================================================
// CATEGORIES
// =========================================================
async function loadCategories() {
  try {
    const data = await apiFetch('/categories');
    categoriesCache = data.categories;
    renderCategories();
  } catch (err) {
    document.getElementById('categoriesContainer').innerHTML =
      `<div class="text-red-500 font-bold">Could not load categories: ${escapeHtml(err.message)}</div>`;
  }
}

function renderCategories() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = categoriesCache.map((cat) => {
    const isActive = selectedCategory === cat.name;
    return `
      <button onclick="filterCategory('${escapeHtml(cat.name)}')" class="whitespace-nowrap px-6 py-3.5 rounded-2xl text-base font-black transition-all border-2 flex items-center gap-2 ${
        isActive ? 'bg-purple-700 text-white border-purple-700 shadow-md scale-105' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      }">
        <i class="${cat.icon}"></i> ${escapeHtml(cat.name)}
      </button>
    `;
  }).join('');
}

// =========================================================
// PRODUCTS (server-side filter / search / sort)
// =========================================================
async function loadProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = `<div class="col-span-full text-center py-16 text-gray-400 font-bold text-xl"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading products...</div>`;

  try {
    const search = document.getElementById('searchInput').value.trim();
    const price = document.getElementById('priceFilter').value;
    const sort = document.getElementById('sortFilter').value;

    const params = new URLSearchParams();
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (search) params.set('search', search);
    if (price !== 'all') params.set('price', price);
    if (sort !== 'default') params.set('sort', sort);

    const data = await apiFetch(`/products?${params.toString()}`);
    data.products.forEach((p) => { productsCache[p.id] = p; });
    renderProducts(data.products);
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full text-center py-16 text-red-500 font-bold text-xl">Could not load products: ${escapeHtml(err.message)}</div>`;
  }
}

function renderProducts(productsList) {
  const grid = document.getElementById('productGrid');
  if (productsList.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-16 text-gray-400 font-bold text-xl">No items found matching your filters.</div>`;
    return;
  }

  grid.innerHTML = productsList.map((prod) => {
    const inCart = cart.find((item) => item.id === prod.id);

    return `
      <div class="bg-white rounded-3xl p-5 border-2 border-gray-100 hover:shadow-2xl transition-all flex flex-col justify-between group relative shadow-xs">
        ${prod.discount > 0 ? `<span class="absolute top-4 left-4 bg-purple-100 text-purple-700 font-black text-xs px-3 py-1 rounded-lg z-10">${prod.discount}% OFF</span>` : ''}

        <div class="overflow-hidden rounded-2xl bg-gray-50 w-full aspect-square flex items-center justify-center mb-4">
          <img src="${prod.image_url}" alt="${escapeHtml(prod.name)}" loading="lazy" class="object-cover h-full w-full group-hover:scale-105 transition duration-300">
        </div>

        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase tracking-widest text-gray-400 font-black">${escapeHtml(prod.category)}</span>
            <span class="text-xs font-black text-amber-600 flex items-center gap-1"><i class="fa-solid fa-star"></i>${prod.rating}</span>
          </div>
          <h4 class="text-xl font-black text-gray-950 line-clamp-2 mt-1 min-h-[56px] leading-tight">${escapeHtml(prod.name)}</h4>
          <p class="text-sm text-gray-400 font-bold mb-1">${escapeHtml(prod.unit || '')}</p>
          <div class="text-sm ${prod.stock <= 4 ? 'text-amber-600 font-black' : 'text-gray-400 font-bold'} mb-4">
            ${prod.stock === 0 ? 'Out of Stock' : prod.stock <= 4 ? `⚠️ Only ${prod.stock} items left!` : '✓ Available in Stock'}
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 mt-auto pt-4 border-t-2 border-gray-50">
          <div>
            <span class="text-2xl font-black text-gray-950">₹${prod.finalPrice}</span>
            ${prod.discount > 0 ? `<span class="text-sm text-gray-400 line-through ml-1.5 font-bold">₹${prod.price}</span>` : ''}
          </div>

          <div id="action-holder-${prod.id}">
            ${inCart ? `
              <div class="flex items-center bg-purple-700 text-white rounded-xl overflow-hidden shadow-md border-2 border-purple-700">
                <button onclick="updateQty(${prod.id}, -1)" class="px-4 py-2.5 hover:bg-purple-800 text-sm font-black transition"><i class="fa-solid fa-minus"></i></button>
                <span class="px-2 text-base font-black min-w-[24px] text-center">${inCart.qty}</span>
                <button onclick="updateQty(${prod.id}, 1)" class="px-4 py-2.5 hover:bg-purple-800 text-sm font-black transition"><i class="fa-solid fa-plus"></i></button>
              </div>
            ` : `
              <button onclick="addToCart(${prod.id})" ${prod.stock === 0 ? 'disabled' : ''} class="bg-white border-2 border-purple-200 text-purple-700 hover:bg-purple-50 disabled:bg-gray-100 disabled:text-gray-400 font-black px-6 py-2.5 rounded-xl text-sm transition uppercase tracking-wider shadow-xs">
                Add
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================
// SEARCH & FILTER CONTROLS
// =========================================================
function filterCategory(category) {
  selectedCategory = category;
  document.getElementById('catalogTitle').innerText = category === 'All' ? 'Featured Products' : category;
  renderCategories();
  loadProducts();
}

function onSearchInput() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(loadProducts, 350);
}

function applyFilters() {
  loadProducts();
}

// =========================================================
// CART
// =========================================================
function addToCart(id) {
  const product = productsCache[id];
  if (!product || product.stock === 0) return;

  const existing = cart.find((item) => item.id === id);
  if (!existing) {
    cart.push({ ...product, qty: 1 });
    showToast(`${product.name} added to cart`, 'success');
  }
  refreshCartViews();
}

function updateQty(id, change) {
  const index = cart.findIndex((item) => item.id === id);
  if (index === -1) return;

  const liveProduct = productsCache[id];
  if (change > 0 && liveProduct && cart[index].qty >= liveProduct.stock) {
    showToast(`Only ${liveProduct.stock} unit(s) of this item are in stock.`, 'error');
    return;
  }

  cart[index].qty += change;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  refreshCartViews();
}

function refreshCartViews() {
  // Re-render the currently visible grid so +/- controls reflect cart state
  loadProducts();
  updateCartUI();
}

function updateCartUI() {
  const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.finalPrice * item.qty, 0);

  document.getElementById('cartCountDesktop').innerText = totalCount;
  document.getElementById('cartCountMobile').innerText = totalCount;
  document.getElementById('cartSubtotal').innerText = `₹${subtotal}`;
  document.getElementById('cartGrandTotal').innerText = `₹${subtotal}`;
  document.querySelectorAll('.checkoutTotalDisplay').forEach((el) => { el.innerText = `₹${subtotal}`; });

  const cartListContainer = document.getElementById('cartItemsList');
  if (cart.length === 0) {
    cartListContainer.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
        <i class="fa-solid fa-basket-shopping text-7xl mb-4 text-gray-300"></i>
        <p class="text-xl font-black">Your cart is empty</p>
        <p class="text-sm text-gray-400 mt-1">Add items to place your lightning fast delivery order.</p>
      </div>`;
    return;
  }

  cartListContainer.innerHTML = cart.map((item) => `
    <div class="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm">
      <img src="${item.image_url}" class="w-16 h-16 object-cover rounded-xl bg-gray-50 border">
      <div class="flex-1 min-w-0">
        <h5 class="text-base font-black text-gray-900 truncate">${escapeHtml(item.name)}</h5>
        <p class="text-lg text-purple-700 font-black mt-0.5">₹${item.finalPrice} <span class="text-gray-400 font-bold text-sm">× ${item.qty}</span></p>
      </div>
      <div class="flex items-center bg-purple-700 text-white rounded-xl overflow-hidden border border-purple-700 shadow-xs">
        <button onclick="updateQty(${item.id}, -1)" class="px-3.5 py-2 hover:bg-purple-800 transition text-sm"><i class="fa-solid fa-minus"></i></button>
        <span class="px-1 text-base font-black min-w-[20px] text-center">${item.qty}</span>
        <button onclick="updateQty(${item.id}, 1)" class="px-3.5 py-2 hover:bg-purple-800 transition text-sm"><i class="fa-solid fa-plus"></i></button>
      </div>
    </div>
  `).join('');
}

function toggleCart() {
  const drawer = document.getElementById('cartDrawer');
  const panel = document.getElementById('cartDrawerPanel');
  if (drawer.classList.contains('hidden')) {
    drawer.classList.remove('hidden');
    setTimeout(() => {
      drawer.classList.remove('opacity-0');
      panel.classList.remove('translate-x-full');
    }, 50);
  } else {
    drawer.classList.add('opacity-0');
    panel.classList.add('translate-x-full');
    setTimeout(() => drawer.classList.add('hidden'), 300);
  }
}

// =========================================================
// AUTHENTICATION
// =========================================================
function toggleAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal.classList.contains('hidden')) {
    switchAuthTab('login');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 50);
  } else {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
  }
}

function switchAuthTab(mode) {
  authMode = mode;
  document.getElementById('authError').classList.add('hidden');
  document.getElementById('authNameField').classList.toggle('hidden', mode !== 'signup');
  document.getElementById('authSubmitText').innerText = mode === 'signup' ? 'Create Account' : 'Login';

  const loginTab = document.getElementById('authTabLogin');
  const signupTab = document.getElementById('authTabSignup');
  const activeClasses = ['bg-white', 'shadow-md', 'text-purple-700'];
  const inactiveClasses = ['text-gray-500'];

  loginTab.classList.remove(...activeClasses, ...inactiveClasses);
  signupTab.classList.remove(...activeClasses, ...inactiveClasses);

  if (mode === 'login') {
    loginTab.classList.add(...activeClasses);
    signupTab.classList.add(...inactiveClasses);
  } else {
    signupTab.classList.add(...activeClasses);
    loginTab.classList.add(...inactiveClasses);
  }
}

async function submitAuthForm() {
  const errorEl = document.getElementById('authError');
  errorEl.classList.add('hidden');

  const name = document.getElementById('authName').value.trim();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  if (!email || !password || (authMode === 'signup' && !name)) {
    errorEl.innerText = 'Please fill out all required fields.';
    errorEl.classList.remove('hidden');
    return;
  }

  const submitBtn = document.getElementById('authSubmitBtn');
  submitBtn.disabled = true;
  document.getElementById('authSubmitText').innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

  try {
    const endpoint = authMode === 'signup' ? '/auth/register' : '/auth/login';
    const body = authMode === 'signup' ? { name, email, password } : { email, password };
    const data = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });

    setSession(data.token, data.user);
    showToast(`Welcome${authMode === 'signup' ? '' : ' back'}, ${data.user.name.split(' ')[0]}!`, 'success');
    toggleAuthModal();
    document.getElementById('authForm').reset();
  } catch (err) {
    errorEl.innerText = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    document.getElementById('authSubmitText').innerText = authMode === 'signup' ? 'Create Account' : 'Login';
  }
}

function setSession(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem('zepto_token', token);

  document.getElementById('authBtnDesktop').classList.add('hidden');
  document.getElementById('authBtnMobile').classList.add('hidden');
  document.getElementById('userProfileBtn').classList.remove('hidden');
  document.getElementById('userProfileBtn').classList.add('flex');
  document.getElementById('userNameDisplay').innerText = user.name.split(' ')[0];
}

async function restoreSession() {
  if (!authToken) return;
  try {
    const data = await apiFetch('/auth/me');
    setSession(authToken, data.user);
  } catch (err) {
    // Token invalid/expired — clear it silently
    authToken = null;
    localStorage.removeItem('zepto_token');
  }
}

async function openProfile() {
  if (!currentUser) return;
  document.getElementById('profName').innerText = currentUser.name;
  document.getElementById('profEmail').innerText = currentUser.email;
  document.getElementById('profAddress').innerText = currentUser.address || 'No saved address yet';
  document.getElementById('profileModal').classList.remove('hidden');

  const historyEl = document.getElementById('orderHistoryList');
  historyEl.innerHTML = `<p class="text-gray-400 font-bold text-base"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading orders...</p>`;

  try {
    const data = await apiFetch('/orders');
    if (data.orders.length === 0) {
      historyEl.innerHTML = `<p class="text-gray-400 font-bold text-base">No orders placed yet.</p>`;
      return;
    }
    historyEl.innerHTML = data.orders.map((o) => `
      <div class="border-2 border-gray-100 rounded-2xl p-4">
        <div class="flex justify-between items-center mb-2">
          <span class="font-black text-base">Order #${o.id}</span>
          <span class="text-xs font-black px-3 py-1 rounded-full ${o.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}">${escapeHtml(o.status)}</span>
        </div>
        <p class="text-sm text-gray-500 font-bold mb-1">${o.items.map((i) => `${escapeHtml(i.product_name)} ×${i.quantity}`).join(', ')}</p>
        <p class="text-base font-black text-gray-900">Total: ₹${o.total_amount}</p>
      </div>
    `).join('');
  } catch (err) {
    historyEl.innerHTML = `<p class="text-red-500 font-bold text-base">${escapeHtml(err.message)}</p>`;
  }
}

function closeProfile() {
  document.getElementById('profileModal').classList.add('hidden');
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('zepto_token');

  document.getElementById('authBtnDesktop').classList.remove('hidden');
  document.getElementById('authBtnMobile').classList.remove('hidden');
  document.getElementById('userProfileBtn').classList.remove('flex');
  document.getElementById('userProfileBtn').classList.add('hidden');
  closeProfile();
  showToast('Logged out successfully.', 'info');
}

// =========================================================
// CHECKOUT
// =========================================================
function proceedToCheckout() {
  if (cart.length === 0) {
    showToast('Your cart is empty.', 'error');
    return;
  }
  if (!authToken) {
    toggleCart();
    showToast('Please log in to continue to checkout.', 'info');
    toggleAuthModal();
    return;
  }

  toggleCart();

  document.getElementById('deliveryAddressInput').value = (currentUser && currentUser.address) || '';

  const listContainer = document.getElementById('checkoutSummaryList');
  listContainer.innerHTML = cart.map((item) => `
    <div class="flex justify-between items-center text-gray-700">
      <span>${escapeHtml(item.name)} <strong class="text-gray-950 font-black">×${item.qty}</strong></span>
      <span class="font-black text-gray-900">₹${item.finalPrice * item.qty}</span>
    </div>
  `).join('');

  const subtotal = cart.reduce((acc, item) => acc + item.finalPrice * item.qty, 0);
  document.querySelectorAll('.checkoutTotalDisplay').forEach((el) => { el.innerText = `₹${subtotal}`; });

  document.getElementById('checkoutModal').classList.remove('hidden');
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

async function placeOrder() {
  const method = document.querySelector('input[name="paymentMethod"]:checked').value;
  const address = document.getElementById('deliveryAddressInput').value.trim();

  if (!address) {
    showToast('Please enter a valid delivery address.', 'error');
    return;
  }

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Placing order...`;

  try {
    const items = cart.map((item) => ({ productId: item.id, qty: item.qty }));
    const data = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({ items, address, paymentMethod: method }),
    });

    closeCheckout();
    showToast(`Order placed via ${method}! Tracking your delivery...`, 'success');

    cart = [];
    updateCartUI();
    await loadProducts(); // refresh stock numbers from server

    startOrderTracking(data.order.id);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Pay & Place Order (<span class="checkoutTotalDisplay">₹0</span>)`;
  }
}

// =========================================================
// ORDER TRACKING (status is persisted server-side via PATCH /orders/:id/advance)
// =========================================================
function startOrderTracking(orderId) {
  if (trackingInterval) clearInterval(trackingInterval);

  const bar = document.getElementById('orderTrackingBar');
  const statusTxt = document.getElementById('trackingStatusText');
  const stepIds = ['Confirmed', 'Packed', 'OutForDelivery', 'Delivered'];
  const labels = ['Confirmed', 'Packed', 'Out for Delivery', 'Delivered'];

  function paintStep(idx) {
    stepIds.forEach((id, i) => {
      const el = document.getElementById(`step-${id}`);
      if (i === idx) el.className = 'text-purple-700 border-b-4 border-purple-600 px-2 py-1 font-black';
      else if (i < idx) el.className = 'text-green-600 line-through px-2 py-1 font-bold';
      else el.className = 'px-2 py-1 text-gray-400';
    });
  }

  bar.classList.remove('translate-y-full');
  let idx = 0;
  statusTxt.innerText = labels[idx];
  paintStep(idx);

  trackingInterval = setInterval(async () => {
    try {
      const data = await apiFetch(`/orders/${orderId}/advance`, { method: 'PATCH' });
      idx++;
      statusTxt.innerText = data.status;
      paintStep(idx);

      if (data.isFinal) {
        clearInterval(trackingInterval);
        showToast('Order delivered! Enjoy your fresh groceries 🎉', 'success');
        setTimeout(() => bar.classList.add('translate-y-full'), 6000);
      }
    } catch (err) {
      clearInterval(trackingInterval);
    }
  }, 3500);
}
