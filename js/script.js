// ===== Get products from localStorage (shared with admin) =====
function getProducts() {
  return JSON.parse(localStorage.getItem('materny_products')) || [];
}

function getStoreSettings() {
  return JSON.parse(localStorage.getItem('materny_settings')) || {
    storeName: 'متجري',
    currency: 'دج',
    whatsapp: ''
  };
}

// ===== Cart =====
let cart = JSON.parse(localStorage.getItem('materny_cart')) || [];

// ===== Filter State =====
let activeCategory = 'all';
let searchQuery = '';

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

// ===== Search & Filter =====
function toggleSearch() {
  const ms = document.getElementById('mobileSearch');
  ms.classList.toggle('active');
  if (ms.classList.contains('active')) {
    document.getElementById('mobileSearchInput').focus();
  }
}

function filterProducts() {
  const input = document.getElementById('searchInput') || document.getElementById('mobileSearchInput');
  searchQuery = input.value.trim().toLowerCase();
  renderProducts();
}

function setCategory(category) {
  activeCategory = category;
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === category);
  });
  renderProducts();
}

// ===== Get unique categories =====
function getCategories(products) {
  const cats = new Set();
  products.forEach(p => { if (p.category) cats.add(p.category); });
  return ['all', ...Array.from(cats)];
}

function getCategoryLabel(cat) {
  const labels = { all: 'الكل' };
  return labels[cat] || cat;
}

// ===== Render Category Filters =====
function renderCategories() {
  const container = document.getElementById('categoryFilters');
  const products = getProducts();
  const categories = getCategories(products);

  if (categories.length <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = categories.map(cat =>
    `<button class="category-chip ${cat === activeCategory ? 'active' : ''}" data-category="${cat}" onclick="setCategory('${cat}')">
      ${getCategoryLabel(cat)}
    </button>`
  ).join('');
}

// ===== Render Products =====
function renderProducts() {
  const products = getProducts();
  const settings = getStoreSettings();
  const filtered = products.filter(p => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery) ||
      (p.description && p.description.toLowerCase().includes(searchQuery));
    return matchCategory && matchSearch;
  });

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

  if (filtered.length === 0) {
    productsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#b2bec3;">
        <i class="fas fa-search" style="font-size:50px;display:block;margin-bottom:15px;"></i>
        <p>لا توجد نتائج للبحث</p>
      </div>
    `;
    if (productCount) productCount.textContent = '0 منتج';
    return;
  }

  if (productCount) {
    productCount.textContent = `${filtered.length} منتج`;
  }

  productsGrid.innerHTML = filtered.map(p => {
    const imgHtml = p.image
      ? `<img src="${p.image}" alt="${p.name}" loading="lazy">`
      : `<i class="fas ${p.icon || 'fa-shoe-prints'} default-icon"></i>`;

    const badgeHtml = getProductBadge(p);
    const stockHtml = getStockBadge(p);
    const whatsapp = getStoreSettings().whatsapp;
    const whatsappBtn = whatsapp ? `<a href="https://wa.me/${whatsapp}?text=${encodeURIComponent('ممكن طلب: ' + p.name)}" target="_blank" class="btn-whatsapp-sm" onclick="event.stopPropagation()"><i class="fab fa-whatsapp"></i> واتساب</a>` : '';

    return `
      <div class="product-card" onclick="showProductDetail(${p.id})">
        <div class="product-image">
          ${imgHtml}
          ${badgeHtml}
          ${stockHtml}
        </div>
        <div class="product-info">
          <h3 class="product-name">${p.name}</h3>
          ${p.description ? `<p class="product-desc">${p.description}</p>` : ''}
          <div class="product-bottom">
            <div>
              <span class="product-price">${p.price} <small>${settings.currency}</small></span>
              ${p.oldPrice ? `<span class="product-old-price">${p.oldPrice} ${settings.currency}</span>` : ''}
            </div>
            <div style="display:flex;gap:4px;align-items:center;">
              ${whatsappBtn}
              <button class="btn-add" onclick="event.stopPropagation();addToCart(${p.id})">
                <i class="fas fa-plus"></i> <span>أضف</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getProductBadge(p) {
  if (p.badge === 'featured') return '<span class="product-badge featured"><i class="fas fa-star"></i> مميز</span>';
  if (p.badge === 'sale') return '<span class="product-badge sale"><i class="fas fa-fire"></i> تخفيض</span>';
  if (p.badge === 'new') return '<span class="product-badge new"><i class="fas fa-tag"></i> جديد</span>';
  return '';
}

function getStockBadge(p) {
  if (p.stock !== undefined) {
    if (p.stock <= 0) return '<span class="product-stock-badge out-of-stock">غير متوفر</span>';
    if (p.stock <= 5) return '<span class="product-stock-badge in-stock">متبقي ${p.stock} فقط</span>';
  }
  return '';
}

// ===== Product Detail =====
function showProductDetail(productId) {
  const products = getProducts();
  const p = products.find(p => p.id === productId);
  if (!p) return;

  const settings = getStoreSettings();
  const content = document.getElementById('detailContent');

  const imgHtml = p.image
    ? `<img src="${p.image}" alt="${p.name}">`
    : `<i class="fas ${p.icon || 'fa-shoe-prints'} default-icon"></i>`;

  const whatsapp = settings.whatsapp;
  const whatsappText = encodeURIComponent(`مرحبا، أريد طلب:\n\n${p.name}\nالسعر: ${p.price} ${settings.currency}\n\nالرجاء تأكيد الطلب`);
  const whatsappBtn = whatsapp
    ? `<a href="https://wa.me/${whatsapp}?text=${whatsappText}" target="_blank" class="btn-whatsapp"><i class="fab fa-whatsapp"></i> طلب عبر واتساب</a>`
    : '';

  const badgeHtml = getProductBadge(p);

  content.innerHTML = `
    <div class="detail-image">
      ${imgHtml}
      ${badgeHtml}
    </div>
    <div class="detail-info">
      ${p.category ? `<span class="detail-category"><i class="fas fa-tag"></i> ${p.category}</span>` : ''}
      <h2>${p.name}</h2>
      ${p.description ? `<p class="detail-desc">${p.description}</p>` : '<p class="detail-desc" style="color:#b2bec3;">لا يوجد وصف لهذا المنتج</p>'}
      <div class="detail-price">${p.price} <small>${settings.currency}</small></div>
      ${p.oldPrice ? `<div class="detail-old-price">${p.oldPrice} ${settings.currency}</div>` : ''}
      <div class="detail-actions">
        <button class="btn-primary" onclick="closeDetail();addToCart(${p.id})">
          <i class="fas fa-shopping-bag"></i> أضف إلى السلة
        </button>
        ${whatsappBtn}
      </div>
    </div>
  `;

  document.getElementById('detailModal').classList.add('active');
  document.getElementById('detailOverlay').classList.add('active');
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('active');
  document.getElementById('detailOverlay').classList.remove('active');
}

// ===== Cart Functions =====
function addToCart(productId) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (product.stock !== undefined && product.stock <= 0) {
    showToast('عذراً، هذا المنتج غير متوفر حالياً', 'error');
    return;
  }

  const existing = cart.find(item => item.id === productId);

  if (existing) {
    if (product.stock !== undefined && existing.qty >= product.stock) {
      showToast('عذراً، الكمية المتوفرة غير كافية', 'error');
      return;
    }
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

  const whatsappEl = document.getElementById('checkoutWhatsapp');
  if (settings.whatsapp) {
    whatsappEl.style.display = 'block';
  } else {
    whatsappEl.style.display = 'none';
  }

  checkoutModal.classList.add('active');
  checkoutOverlay.classList.add('active');
}

function closeCheckout() {
  checkoutModal.classList.remove('active');
  checkoutOverlay.classList.remove('active');
}

function sendWhatsAppOrder() {
  const settings = getStoreSettings();
  if (!settings.whatsapp) {
    showToast('رقم الواتساب غير مضبوط في الإعدادات', 'error');
    return;
  }

  let msg = 'مرحباً، أريد طلب:\n\n';
  cart.forEach(item => {
    msg += `- ${item.name} × ${item.qty} = ${item.price * item.qty} ${settings.currency}\n`;
  });
  msg += `\nالمجموع: ${getCartTotal()} ${settings.currency}`;
  msg += `\n\nالاسم: ${document.getElementById('customerName').value || '(لم يحدد)'}`;
  msg += `\nالولاية: ${document.getElementById('customerState').value || '(لم يحدد)'}`;
  msg += `\nالبلدية: ${document.getElementById('customerCity').value || '(لم يحدد)'}`;
  msg += `\nالهاتف: ${document.getElementById('customerPhone').value || '(لم يحدد)'}`;

  window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ===== GitHub Sync Helpers =====
function getGithubToken() {
  const s = getStoreSettings();
  return s.github_token || '';
}

async function syncOrdersFromGithub() {
  const token = getGithubToken();
  if (!token) return JSON.parse(localStorage.getItem('materny_orders')) || [];
  try {
    const res = await fetch('https://raw.githubusercontent.com/mestafa17ab-lgtm/materny/main/data/orders.json?' + Date.now());
    const data = await res.json();
    const orders = data.orders || [];
    localStorage.setItem('materny_orders', JSON.stringify(orders));
    return orders;
  } catch (e) {
    return JSON.parse(localStorage.getItem('materny_orders')) || [];
  }
}

async function syncOrdersToGithub(orders) {
  const token = getGithubToken();
  if (!token) return false;
  try {
    localStorage.setItem('materny_orders', JSON.stringify(orders));
    const r1 = await fetch('https://api.github.com/repos/mestafa17ab-lgtm/materny/contents/data/orders.json', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const current = await r1.json();
    const content = btoa(unescape(encodeURIComponent(JSON.stringify({ orders: orders }, null, 2))));
    const r2 = await fetch('https://api.github.com/repos/mestafa17ab-lgtm/materny/contents/data/orders.json', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'تحديث الطلبات', content: content, sha: current.sha })
    });
    return r2.ok;
  } catch (e) {
    return false;
  }
}

// ===== Submit Order =====
async function submitOrder(e) {
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

  // Decrease stock
  const products = getProducts();
  cart.forEach(cartItem => {
    const prod = products.find(p => p.id === cartItem.id);
    if (prod && prod.stock !== undefined) {
      prod.stock = Math.max(0, prod.stock - cartItem.qty);
    }
  });
  localStorage.setItem('materny_products', JSON.stringify(products));

  // Try to sync to GitHub if token is set
  syncOrdersToGithub(orders);

  cart = [];
  saveCart();
  renderCart();
  closeCheckout();
  document.getElementById('checkoutForm').reset();

  showToast(`✓ تم استلام الطلب بنجاح! رقم الطلب: #${order.id}`, 'success');

  // Send WhatsApp notification if configured
  if (settings.whatsapp) {
    let msg = `طلب جديد #${order.id}\n\n`;
    msg += `الاسم: ${order.name}\n`;
    msg += `الهاتف: ${order.phone}\n`;
    msg += `الولاية: ${order.state}\n`;
    msg += `البلدية: ${order.city}\n\n`;
    msg += `المنتجات:\n`;
    order.items.forEach(item => {
      msg += `- ${item.name} × ${item.qty} = ${item.price * item.qty} ${settings.currency}\n`;
    });
    msg += `\nالمجموع: ${order.total} ${settings.currency}`;
    window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  }
}

// ===== Order Tracking =====
async function trackOrder() {
  const phone = document.getElementById('trackPhone').value.trim();
  const result = document.getElementById('trackResult');

  if (!phone) {
    result.innerHTML = '<p class="track-no-results">الرجاء إدخال رقم الهاتف</p>';
    return;
  }

  result.innerHTML = '<p style="color:#636e72;">جاري البحث...</p>';
  const orders = await syncOrdersFromGithub();
  const userOrders = orders.filter(o => o.phone === phone);

  if (userOrders.length === 0) {
    result.innerHTML = '<p class="track-no-results">لا توجد طلبات بهذا الرقم</p>';
    return;
  }

  result.innerHTML = userOrders.map(o => {
    const statusSteps = ['جديد', 'قيد المعالجة', 'تم الشحن', 'تم التوصيل', 'مكتمل'];
    const currentIdx = statusSteps.indexOf(o.status);
    const activeIdx = currentIdx >= 0 ? currentIdx : 0;

    const stepsHtml = statusSteps.map((step, i) => {
      let cls = '';
      if (i < activeIdx) cls = 'done';
      else if (i === activeIdx) cls = 'active';
      const connectLine = i < statusSteps.length - 1
        ? `<div class="track-connect-line"></div>`
        : '';
      return `
        <div class="track-status-step ${cls}">
          ${connectLine}
          <div class="step-dot"></div>
          <span class="step-label">${step}</span>
        </div>
      `;
    }).join('');

    const itemsList = o.items.map(item => `${item.name} ×${item.qty}`).join(', ');

    return `
      <div class="track-card">
        <div class="track-card-header">
          <span class="order-num">طلب #${o.id}</span>
          <span class="order-date">${o.date}</span>
        </div>
        <div class="track-status-bar">
          ${stepsHtml}
        </div>
        <div class="track-card-info">
          <strong>المنتجات:</strong> <span class="track-items">${itemsList}</span><br>
          <strong>المجموع:</strong> ${o.total} دج
        </div>
      </div>
    `;
  }).join('');
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
  const heroName = document.getElementById('heroStoreName');
  if (heroName) heroName.textContent = settings.storeName;
  document.title = `${settings.storeName} | متجر إلكتروني`;
}

// ===== Init =====
function init() {
  updateStoreName();
  renderCategories();
  renderProducts();
  renderCart();
}

// Sync search input fields
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchInput');
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  if (searchInput && mobileSearchInput) {
    searchInput.addEventListener('input', function() {
      mobileSearchInput.value = this.value;
    });
    mobileSearchInput.addEventListener('input', function() {
      searchInput.value = this.value;
    });
  }
});

init();
