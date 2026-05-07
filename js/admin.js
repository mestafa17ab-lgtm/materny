// ===== Auth =====
const DEFAULT_PASSWORD = 'admin123';

function getPassword() {
  return localStorage.getItem('materny_admin_pass') || DEFAULT_PASSWORD;
}

function checkLogin() {
  const input = document.getElementById('loginPassword');
  const error = document.getElementById('loginError');

  if (input.value === getPassword()) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminLayout').classList.add('active');
    loadDashboard();
    renderProductsTable();
    renderOrdersTable();
    loadSettings();
  } else {
    error.style.display = 'block';
    input.value = '';
    input.focus();
  }
}

function logout() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminLayout').classList.remove('active');
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
}

// ===== Navigation =====
function showSection(name, link) {
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  if (link) link.classList.add('active');

  document.querySelectorAll('[id^="section-"]').forEach(s => s.style.display = 'none');
  document.getElementById('section-' + name).style.display = 'block';

  const titles = {
    dashboard: '<i class="fas fa-chart-pie"></i> الإحصائيات',
    products: '<i class="fas fa-box"></i> إدارة المنتجات',
    orders: '<i class="fas fa-clipboard-list"></i> إدارة الطلبات',
    settings: '<i class="fas fa-cog"></i> الإعدادات'
  };
  document.getElementById('pageTitle').innerHTML = titles[name] || '';

  if (name === 'dashboard') loadDashboard();
  if (name === 'products') renderProductsTable();
  if (name === 'orders') renderOrdersTable();
  if (name === 'settings') loadSettings();
}

// ===== Dashboard =====
function loadDashboard() {
  const products = getProducts();
  const orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  const settings = getStoreSettings();

  document.getElementById('statProducts').textContent = products.length;
  document.getElementById('statOrders').textContent = orders.length;

  const completed = orders.filter(o => o.status === 'مكتمل');
  document.getElementById('statCompleted').textContent = completed.length;

  const revenue = completed.reduce((sum, o) => sum + o.total, 0);
  document.getElementById('statRevenue').textContent = `${revenue} ${settings.currency}`;
}

// ===== Products CRUD =====
function getProducts() {
  return JSON.parse(localStorage.getItem('materny_products')) || [];
}

function saveProducts(products) {
  localStorage.setItem('materny_products', JSON.stringify(products));
}

function getStoreSettings() {
  return JSON.parse(localStorage.getItem('materny_settings')) || {
    storeName: 'متجري',
    currency: 'دج'
  };
}

function renderProductsTable() {
  const products = getProducts();
  const tbody = document.getElementById('productsTableBody');
  const empty = document.getElementById('productsEmpty');

  if (products.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = products.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${p.name}</strong></td>
      <td>${p.price} دج</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#636e72;font-size:13px;">
        ${p.description || '-'}
      </td>
      <td>
        <div class="actions">
          <button class="btn-sm edit" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i> تعديل</button>
          <button class="btn-sm delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash-alt"></i> حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openProductModal(data) {
  document.getElementById('productModal').classList.add('active');
  document.getElementById('productOverlay').classList.add('active');

  if (data) {
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-edit"></i> تعديل منتج';
    document.getElementById('productSubmitText').textContent = 'تحديث المنتج';
    document.getElementById('productId').value = data.id;
    document.getElementById('productName').value = data.name;
    document.getElementById('productPrice').value = data.price;
    document.getElementById('productDesc').value = data.description || '';
    document.getElementById('productImage').value = data.image || '';
    document.getElementById('productIcon').value = data.icon || 'fa-shoe-prints';
  } else {
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> إضافة منتج';
    document.getElementById('productSubmitText').textContent = 'إضافة المنتج';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productDesc').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productIcon').value = 'fa-shoe-prints';
  }
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
  document.getElementById('productOverlay').classList.remove('active');
}

function saveProduct(e) {
  e.preventDefault();
  let products = getProducts();
  const id = document.getElementById('productId').value;
  const data = {
    name: document.getElementById('productName').value.trim(),
    price: Number(document.getElementById('productPrice').value),
    description: document.getElementById('productDesc').value.trim(),
    image: document.getElementById('productImage').value.trim(),
    icon: document.getElementById('productIcon').value
  };

  if (id) {
    const idx = products.findIndex(p => p.id === Number(id));
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...data };
    }
    showToast('✓ تم تحديث المنتج', 'success');
  } else {
    data.id = Date.now();
    products.push(data);
    showToast('✓ تم إضافة المنتج', 'success');
  }

  saveProducts(products);
  closeProductModal();
  renderProductsTable();
  loadDashboard();
}

function editProduct(id) {
  const products = getProducts();
  const p = products.find(p => p.id === id);
  if (p) openProductModal(p);
}

function deleteProduct(id) {
  if (!confirm('واش متأكد من حذف هذا المنتج؟')) return;
  let products = getProducts();
  products = products.filter(p => p.id !== id);
  saveProducts(products);
  renderProductsTable();
  loadDashboard();
  showToast('✓ تم حذف المنتج', 'success');
}

// ===== Orders =====
function renderOrdersTable() {
  const orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  const tbody = document.getElementById('ordersTableBody');
  const empty = document.getElementById('ordersEmpty');

  if (orders.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = orders.map(o => {
    const itemsList = o.items.map(item => `${item.name} ×${item.qty}`).join(', ');
    const statusClass = o.status === 'مكتمل' ? 'completed' : 'new';

    return `
      <tr>
        <td>#${String(o.id).slice(-6)}</td>
        <td style="font-size:13px;white-space:nowrap;">${o.date}</td>
        <td><strong>${o.name}</strong></td>
        <td>${o.state} / ${o.city}</td>
        <td dir="ltr" style="text-align:right;direction:ltr;">${o.phone}</td>
        <td style="font-size:13px;color:#636e72;">${itemsList}</td>
        <td><strong>${o.total} دج</strong></td>
        <td><span class="status-badge ${statusClass}">${o.status || 'جديد'}</span></td>
        <td>
          <div class="actions">
            <button class="btn-sm edit" onclick="viewOrder(${o.id})"><i class="fas fa-eye"></i></button>
            ${o.status !== 'مكتمل' ? `<button class="btn-sm complete" onclick="completeOrder(${o.id})"><i class="fas fa-check"></i></button>` : ''}
            <button class="btn-sm delete" onclick="deleteOrder(${o.id})"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function viewOrder(id) {
  const orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  const o = orders.find(o => o.id === id);
  if (!o) return;

  const content = document.getElementById('orderDetailContent');

  let itemsHtml = o.items.map(item =>
    `<div class="order-detail-item">
      <span>${item.name} × ${item.qty}</span>
      <span>${item.price * item.qty} دج</span>
    </div>`
  ).join('');

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
      <span style="font-weight:700;color:#e94560;">طلب #${o.id}</span>
      <span style="font-size:13px;color:#636e72;">${o.date}</span>
    </div>

    <div class="order-detail-customer">
      <p><i class="fas fa-user"></i> ${o.name}</p>
      <p><i class="fas fa-map-marker-alt"></i> ${o.state} / ${o.city}</p>
      <p><i class="fas fa-phone"></i> <strong dir="ltr" style="text-align:right;display:inline-block;">${o.phone}</strong></p>
    </div>

    <h4 style="margin-bottom:8px;font-size:14px;">المنتجات:</h4>
    ${itemsHtml}

    <div style="display:flex;justify-content:space-between;font-weight:800;margin-top:12px;padding-top:12px;border-top:2px solid #e94560;">
      <span>المجموع</span>
      <span style="color:#e94560;">${o.total} دج</span>
    </div>

    <div style="margin-top:15px;">
      <span class="status-badge ${o.status === 'مكتمل' ? 'completed' : 'new'}">${o.status || 'جديد'}</span>
    </div>
  `;

  document.getElementById('orderModal').classList.add('active');
  document.getElementById('orderOverlay').classList.add('active');
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('active');
  document.getElementById('orderOverlay').classList.remove('active');
}

function completeOrder(id) {
  const orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  const o = orders.find(o => o.id === id);
  if (o) {
    o.status = 'مكتمل';
    localStorage.setItem('materny_orders', JSON.stringify(orders));
    renderOrdersTable();
    loadDashboard();
    showToast('✓ تم تأكيد إكمال الطلب', 'success');
  }
}

function deleteOrder(id) {
  if (!confirm('واش متأكد من حذف هذا الطلب؟')) return;
  let orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  orders = orders.filter(o => o.id !== id);
  localStorage.setItem('materny_orders', JSON.stringify(orders));
  renderOrdersTable();
  loadDashboard();
  showToast('✓ تم حذف الطلب', 'success');
}

// ===== Settings =====
function loadSettings() {
  const settings = getStoreSettings();
  document.getElementById('setStoreName').value = settings.storeName || 'متجري';
  document.getElementById('setCurrency').value = settings.currency || 'دج';
  document.getElementById('setPassword').value = '';
}

function saveSettings(e) {
  e.preventDefault();
  const storeName = document.getElementById('setStoreName').value.trim();
  const currency = document.getElementById('setCurrency').value.trim();
  const newPass = document.getElementById('setPassword').value.trim();

  localStorage.setItem('materny_settings', JSON.stringify({ storeName, currency }));

  if (newPass) {
    localStorage.setItem('materny_admin_pass', newPass);
  }

  showToast('✓ تم حفظ الإعدادات', 'success');
}

// ===== Danger Zone =====
function clearOrders() {
  if (!confirm('واش متأكد من حذف جميع الطلبات؟')) return;
  localStorage.setItem('materny_orders', JSON.stringify([]));
  renderOrdersTable();
  loadDashboard();
  showToast('✓ تم حذف جميع الطلبات', 'success');
}

function clearProducts() {
  if (!confirm('واش متأكد من حذف جميع المنتجات؟')) return;
  localStorage.setItem('materny_products', JSON.stringify([]));
  renderProductsTable();
  loadDashboard();
  showToast('✓ تم حذف جميع المنتجات', 'success');
}

function resetAll() {
  if (!confirm('واش متأكد؟ راح يتم حذف كل البيانات (المنتجات، الطلبات، الإعدادات)!')) return;
  localStorage.removeItem('materny_products');
  localStorage.removeItem('materny_orders');
  localStorage.removeItem('materny_settings');
  localStorage.removeItem('materny_cart');
  renderProductsTable();
  renderOrdersTable();
  loadDashboard();
  loadSettings();
  showToast('✓ تم إعادة ضبط الكل', 'success');
}

// ===== Toast =====
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  if (type) toast.classList.add(type);
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===== Add sample products if first time =====
(function initAdmin() {
  const products = getProducts();
  if (products.length === 0) {
    const samples = [
      { id: Date.now() + 1, name: 'حذاء M1', price: 220, description: 'حذاء طبي مريح - مثالي للاستخدام اليومي وللأقدام المتعبة', image: '', icon: 'fa-shoe-prints' },
      { id: Date.now() + 2, name: 'حذاء M2', price: 250, description: 'حذاء رجالي كلاسيكي - أنيق ومناسب لجميع المناسبات', image: '', icon: 'fa-shoe-prints' }
    ];
    saveProducts(samples);
  }
})();
