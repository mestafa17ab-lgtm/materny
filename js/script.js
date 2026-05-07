// ===== Get products from localStorage (shared with admin) =====
function getProducts() {
  return JSON.parse(localStorage.getItem('materny_products')) || [];
}

function getStoreSettings() {
  return JSON.parse(localStorage.getItem('materny_settings')) || {
    storeName: 'متجري',
    currency: 'دج'
  };
}

// ===== Cart =====
let cart = JSON.parse(localStorage.getItem('materny_cart')) || [];

// DOM
const productsGrid = document.getElementById('productsGrid');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const cartFooter = document.getElementById('cartFooter');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutOverlay = document.getElementById('checkoutOverlay');
const checkoutItems = document.getElementById('checkoutItems');
const checkoutTotal = document.getElementById('checkoutTotal');
const toast = document.getElementById('toast');
const productCount = document.getElementById('productCount');

// ===== Render Products =====
function renderProducts() {
  const products = getProducts();
  const settings = getStoreSettings();

  if (products.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#b2bec3;">
        <i class="fas fa-box-open" style="font-size:50px;display:block;margin-bottom:15px;"></i>
        <p>لا توجد منتجات بعد</p>
      </div>
    `;
    if (productCount) productCount.textContent = '';
    return;
  }

  if (productCount) {
    productCount.textContent = `${products.length} منتج`;
  }

  productsGrid.innerHTML = products.map(p => {
    const imgHtml = p.image
      ? `<img src="${p.image}" alt="${p.name}">`
      : `<i class="fas ${p.icon || 'fa-shoe-prints'} default-icon"></i>`;

    return `
      <div class="product-card">
        <div class="product-image">${imgHtml}</div>
        <div class="product-info">
          <h3 class="product-name">${p.name}</h3>
          ${p.description ? `<p class="product-desc">${p.description}</p>` : ''}
          <div class="product-bottom">
            <span class="product-price">${p.price} <small>${settings.currency}</small></span>
            <button class="btn-add" onclick="addToCart(${p.id})">
              <i class="fas fa-plus"></i> أضف للسلة
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== Cart Functions =====
function addToCart(productId) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart();
  renderCart();
  toggleCart(true);
  showToast(`✓ تمت إضافة ${product.name} إلى السلة`, 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  renderCart();
}

function changeQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem('materny_cart', JSON.stringify(cart));
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function renderCart() {
  const settings = getStoreSettings();
  const total = getCartTotal();
  cartCount.textContent = cart.length;

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="cart-empty">السلة فارغة</p>';
    cartFooter.style.display = 'none';
    return;
  }

  cartFooter.style.display = 'block';

  cartItems.innerHTML = cart.map(item => {
    const iconHtml = item.image
      ? `<img src="${item.image}" alt="${item.name}">`
      : `<i class="fas ${item.icon || 'fa-shoe-prints'}"></i>`;

    return `
      <div class="cart-item">
        <div class="cart-item-icon">${iconHtml}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${item.price} ${settings.currency}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
            <span style="margin-right:8px;color:#636e72;font-size:13px">= ${item.price * item.qty} ${settings.currency}</span>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
  }).join('');

  cartTotal.textContent = `${total} ${settings.currency}`;
}

// ===== Cart Drawer =====
function toggleCart(forceOpen) {
  cartDrawer.classList.toggle('active');
  cartOverlay.classList.toggle('active');
  if (forceOpen) {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
  }
}

// ===== Checkout =====
function showCheckout() {
  if (cart.length === 0) {
    showToast('السلة فارغة!', 'error');
    return;
  }

  toggleCart(false);
  const settings = getStoreSettings();

  checkoutItems.innerHTML = cart.map(item =>
    `<div style="display:flex;justify-content:space-between;padding:6px 0;">
      <span>${item.name} × ${item.qty}</span>
      <span>${item.price * item.qty} ${settings.currency}</span>
    </div>`
  ).join('');

  checkoutTotal.textContent = `${getCartTotal()} ${settings.currency}`;
  checkoutModal.classList.add('active');
  checkoutOverlay.classList.add('active');
}

function closeCheckout() {
  checkoutModal.classList.remove('active');
  checkoutOverlay.classList.remove('active');
}

// ===== Submit Order =====
function submitOrder(e) {
  e.preventDefault();

  const settings = getStoreSettings();
  const order = {
    id: Date.now(),
    date: new Date().toLocaleString('ar-DZ', { timeZone: 'Africa/Algiers' }),
    name: document.getElementById('customerName').value.trim(),
    state: document.getElementById('customerState').value.trim(),
    city: document.getElementById('customerCity').value.trim(),
    phone: document.getElementById('customerPhone').value.trim(),
    items: [...cart],
    total: getCartTotal(),
    status: 'جديد'
  };

  const orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  orders.unshift(order);
  localStorage.setItem('materny_orders', JSON.stringify(orders));

  cart = [];
  saveCart();
  renderCart();
  closeCheckout();
  document.getElementById('checkoutForm').reset();

  showToast(`✓ تم استلام الطلب بنجاح! رقم الطلب: #${order.id}`, 'success');
}

// ===== Toast =====
function showToast(message, type = '') {
  toast.textContent = message;
  toast.className = 'toast show';
  if (type) toast.classList.add(type);
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===== Update store name from settings =====
function updateStoreName() {
  const settings = getStoreSettings();
  const logos = document.querySelectorAll('.logo');
  logos.forEach(el => {
    el.innerHTML = `<i class="fas fa-store"></i> ${settings.storeName}`;
  });
}

// ===== Init =====
updateStoreName();
renderProducts();
renderCart();
