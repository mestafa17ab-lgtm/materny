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
    renderCategoriesList();
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
    categories: '<i class="fas fa-tags"></i> إدارة الفئات',
    settings: '<i class="fas fa-cog"></i> الإعدادات'
  };
  document.getElementById('pageTitle').innerHTML = titles[name] || '';

  if (name === 'dashboard') loadDashboard();
  if (name === 'products') renderProductsTable();
  if (name === 'orders') renderOrdersTable();
  if (name === 'categories') renderCategoriesList();
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

  // Recent orders
  const recentTbody = document.getElementById('recentOrdersBody');
  const recent = orders.slice(0, 5);
  if (recent.length === 0) {
    recentTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#b2bec3;">لا توجد طلبات بعد</td></tr>';
  } else {
    recentTbody.innerHTML = recent.map(o => {
      const statusClass = getStatusClass(o.status);
      return `
        <tr>
          <td>#${String(o.id).slice(-6)}</td>
          <td style="font-size:13px;white-space:nowrap;">${o.date}</td>
          <td><strong>${o.name}</strong></td>
          <td><strong>${o.total} ${settings.currency}</strong></td>
          <td><span class="status-badge ${statusClass}">${o.status || 'جديد'}</span></td>
        </tr>
      `;
    }).join('');
  }
}

function getStatusClass(status) {
  const map = {
    'جديد': 'new',
    'قيد المعالجة': 'processing',
    'تم الشحن': 'shipped',
    'تم التوصيل': 'delivered',
    'مكتمل': 'completed',
    'ملغي': 'cancelled'
  };
  return map[status] || 'new';
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
    currency: 'دج',
    whatsapp: ''
  };
}

function getCategories() {
  return JSON.parse(localStorage.getItem('materny_categories')) || [];
}

function renderProductsTable() {
  const products = getProducts();
  const settings = getStoreSettings();
  const tbody = document.getElementById('productsTableBody');
  const empty = document.getElementById('productsEmpty');

  if (products.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = products.map((p, i) => {
    const catLabel = p.category || '<span style="color:#b2bec3;">-</span>';
    const stockLabel = p.stock !== undefined
      ? (p.stock <= 0 ? '<span style="color:#d63031;font-weight:600;">نفذ</span>' : `<span style="color:#00b894;font-weight:600;">${p.stock}</span>`)
      : '<span style="color:#b2bec3;">-</span>';
    const badgeLabel = p.badge
      ? (p.badge === 'featured' ? '⭐' : p.badge === 'sale' ? '🔥' : '🆕')
      : '<span style="color:#b2bec3;">-</span>';

    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${p.name}</strong></td>
        <td style="font-size:13px;">${catLabel}</td>
        <td>${p.price} ${settings.currency}${p.oldPrice ? `<br><small style="color:#b2bec3;text-decoration:line-through;">${p.oldPrice} ${settings.currency}</small>` : ''}</td>
        <td>${stockLabel}</td>
        <td>${badgeLabel}</td>
        <td>
          <div class="actions">
            <button class="btn-sm edit" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-sm delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openProductModal(data) {
  const catSelect = document.getElementById('productCategory');
  const categories = getCategories();
  const products = getProducts();
  const usedCats = [...new Set(products.map(p => p.category).filter(Boolean))];
  const allCats = [...new Set([...categories, ...usedCats])];

  catSelect.innerHTML = '<option value="">بدون فئة</option>' +
    allCats.map(c => `<option value="${c}">${c}</option>`).join('');

  document.getElementById('productModal').classList.add('active');
  document.getElementById('productOverlay').classList.add('active');

  if (data) {
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-edit"></i> تعديل منتج';
    document.getElementById('productSubmitText').textContent = 'تحديث المنتج';
    document.getElementById('productId').value = data.id;
    document.getElementById('productName').value = data.name;
    document.getElementById('productCategory').value = data.category || '';
    document.getElementById('productPrice').value = data.price;
    document.getElementById('productOldPrice').value = data.oldPrice || '';
    document.getElementById('productDesc').value = data.description || '';
    document.getElementById('productImage').value = data.image || '';
    document.getElementById('productIcon').value = data.icon || 'fa-shoe-prints';
    document.getElementById('productBadge').value = data.badge || '';
    document.getElementById('productStock').value = data.stock !== undefined ? data.stock : '';
  } else {
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> إضافة منتج';
    document.getElementById('productSubmitText').textContent = 'إضافة المنتج';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productOldPrice').value = '';
    document.getElementById('productDesc').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productIcon').value = 'fa-shoe-prints';
    document.getElementById('productBadge').value = '';
    document.getElementById('productStock').value = '';
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

  let category = document.getElementById('productCategory').value;
  const newCat = document.getElementById('productNewCategory').value.trim();
  if (newCat) category = newCat;

  const stock = document.getElementById('productStock').value;
  const data = {
    name: document.getElementById('productName').value.trim(),
    category: category,
    price: Number(document.getElementById('productPrice').value),
    oldPrice: document.getElementById('productOldPrice').value ? Number(document.getElementById('productOldPrice').value) : undefined,
    description: document.getElementById('productDesc').value.trim(),
    image: document.getElementById('productImage').value.trim(),
    icon: document.getElementById('productIcon').value,
    badge: document.getElementById('productBadge').value || undefined,
    stock: stock !== '' ? Number(stock) : undefined
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
  renderCategoriesList();
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

// ===== Categories =====
function renderCategoriesList() {
  const container = document.getElementById('categoriesList');
  const products = getProducts();
  const usedCats = [...new Set(products.map(p => p.category).filter(Boolean))];

  if (usedCats.length === 0) {
    container.innerHTML = '<p style="color:#b2bec3;text-align:center;padding:20px;">لا توجد فئات بعد. أضف منتجاً بفئة لإنشاء فئة جديدة.</p>';
    return;
  }

  container.innerHTML = usedCats.map(cat => {
    const count = products.filter(p => p.category === cat).length;
    const safeCat = cat.replace(/'/g, "\\'");
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#f8f9fa;border-radius:10px;margin-bottom:8px;">
        <div>
          <strong>${cat}</strong>
          <span style="color:#636e72;font-size:13px;margin-right:10px;">${count} منتج</span>
        </div>
        <button class="btn-sm delete" onclick="deleteCategory('${safeCat}')"><i class="fas fa-trash-alt"></i></button>
      </div>
    `;
  }).join('');
}

function addCategory() {
  const name = prompt('أدخل اسم الفئة الجديدة:');
  if (!name || !name.trim()) return;
  const catName = name.trim();
  const products = getProducts();
  // Create a dummy product with this category if none exists
  const hasCat = products.some(p => p.category === catName);
  if (!hasCat) {
    products.push({
      id: Date.now(),
      name: `منتج ${catName}`,
      category: catName,
      price: 0,
      description: `منتج تجريبي لفئة ${catName}`,
      icon: 'fa-tag',
      badge: undefined,
      stock: undefined
    });
    saveProducts(products);
    renderProductsTable();
    renderCategoriesList();
    showToast(`✓ تم إضافة الفئة "${catName}"`, 'success');
  } else {
    showToast('الفئة موجودة مسبقاً', 'error');
  }
}

function deleteCategory(catName) {
  if (!confirm(`واش متأكد من حذف الفئة "${catName}"؟ (المنتجات لن تُحذف)`)) return;
  let products = getProducts();
  products = products.map(p => {
    if (p.category === catName) {
      var newP = {};
      for (var key in p) {
        if (p.hasOwnProperty(key) && key !== 'category') {
          newP[key] = p[key];
        }
      }
      return newP;
    }
    return p;
  });
  saveProducts(products);
  renderProductsTable();
  renderCategoriesList();
  showToast(`✓ تم حذف الفئة "${catName}"`, 'success');
}

// ===== Orders =====
let orderFilterStatus = 'all';

function filterOrders(status, btn) {
  orderFilterStatus = status;
  document.querySelectorAll('.admin-filter-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderOrdersTable();
}

function renderOrdersTable() {
  let orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  const settings = getStoreSettings();
  const tbody = document.getElementById('ordersTableBody');
  const empty = document.getElementById('ordersEmpty');

  if (orderFilterStatus !== 'all') {
    orders = orders.filter(o => o.status === orderFilterStatus);
  }

  if (orders.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  tbody.innerHTML = orders.map(o => {
    const itemsList = o.items.map(item => `${item.name} ×${item.qty}`).join(', ');
    const statusClass = getStatusClass(o.status);

    const statusOptions = ['جديد', 'قيد المعالجة', 'تم الشحن', 'تم التوصيل', 'مكتمل', 'ملغي']
      .map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('');

    return `
      <tr>
        <td>#${String(o.id).slice(-6)}</td>
        <td style="font-size:13px;white-space:nowrap;">${o.date}</td>
        <td><strong>${o.name}</strong></td>
        <td>${o.state} / ${o.city}</td>
        <td dir="ltr" style="text-align:right;direction:ltr;">${o.phone}</td>
        <td style="font-size:13px;color:#636e72;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${itemsList}">${itemsList}</td>
        <td><strong>${o.total} ${settings.currency}</strong></td>
        <td>
          <select style="padding:4px 8px;border-radius:6px;border:2px solid #dfe6e9;font-size:12px;font-weight:600;" onchange="updateOrderStatus(${o.id}, this.value)">
            ${statusOptions}
          </select>
        </td>
        <td>
          <div class="actions">
            <button class="btn-sm edit" onclick="viewOrder(${o.id})"><i class="fas fa-eye"></i></button>
            ${settings.whatsapp ? `<button class="btn-sm whatsapp" onclick="whatsappOrder(${o.id})"><i class="fab fa-whatsapp"></i></button>` : ''}
            <button class="btn-sm delete" onclick="deleteOrder(${o.id})"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateOrderStatus(id, newStatus) {
  const orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  const o = orders.find(order => order.id === id);
  if (o) {
    o.status = newStatus;
    localStorage.setItem('materny_orders', JSON.stringify(orders));
    renderOrdersTable();
    loadDashboard();
    showToast(`✓ تم تحديث حالة الطلب #${String(id).slice(-6)}`, 'success');
  }
}

function viewOrder(id) {
  const orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  const o = orders.find(o => o.id === id);
  if (!o) return;

  const settings = getStoreSettings();
  const content = document.getElementById('orderDetailContent');

  const itemsHtml = o.items.map(item =>
    `<div class="order-detail-item">
      <span>${item.name} × ${item.qty}</span>
      <span>${item.price * item.qty} ${settings.currency}</span>
    </div>`
  ).join('');

  const statusClass = getStatusClass(o.status);

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
      <span style="color:#e94560;">${o.total} ${settings.currency}</span>
    </div>

    <div style="margin-top:15px;">
      <span class="status-badge ${statusClass}">${o.status || 'جديد'}</span>
    </div>

    <div class="order-detail-actions">
      <button class="btn-sm print" onclick="printOrder(${o.id})"><i class="fas fa-print"></i> طباعة</button>
      ${settings.whatsapp ? `<button class="btn-sm whatsapp" onclick="whatsappOrder(${o.id})"><i class="fab fa-whatsapp"></i> واتساب</button>` : ''}
      <button class="btn-sm edit" onclick="closeOrderModal();editOrderStatus(${o.id})"><i class="fas fa-edit"></i> تغيير الحالة</button>
    </div>
  `;

  document.getElementById('orderModal').classList.add('active');
  document.getElementById('orderOverlay').classList.add('active');
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('active');
  document.getElementById('orderOverlay').classList.remove('active');
}

function whatsappOrder(id) {
  const settings = getStoreSettings();
  if (!settings.whatsapp) {
    showToast('رقم الواتساب غير مضبوط في الإعدادات', 'error');
    return;
  }
  const orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  const o = orders.find(order => order.id === id);
  if (!o) return;

  let msg = `الطلب #${o.id}\n`;
  msg += `التاريخ: ${o.date}\n`;
  msg += `الاسم: ${o.name}\n`;
  msg += `الهاتف: ${o.phone}\n`;
  msg += `العنوان: ${o.state} / ${o.city}\n\n`;
  msg += `المنتجات:\n`;
  o.items.forEach(item => {
    msg += `- ${item.name} × ${item.qty} = ${item.price * item.qty} ${settings.currency}\n`;
  });
  msg += `\nالمجموع: ${o.total} ${settings.currency}`;
  msg += `\nالحالة: ${o.status}`;

  window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}

function editOrderStatus(id) {
  const newStatus = prompt('أدخل الحالة الجديدة (جديد، قيد المعالجة، تم الشحن، تم التوصيل، مكتمل، ملغي):');
  if (newStatus && ['جديد', 'قيد المعالجة', 'تم الشحن', 'تم التوصيل', 'مكتمل', 'ملغي'].includes(newStatus.trim())) {
    updateOrderStatus(id, newStatus.trim());
  } else if (newStatus) {
    showToast('حالة غير صالحة!', 'error');
  }
}

function printOrder(id) {
  const orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  const o = orders.find(order => order.id === id);
  if (!o) return;

  const settings = getStoreSettings();
  const itemsHtml = o.items.map(item =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.qty}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:left;">${item.price * item.qty} ${settings.currency}</td>
    </tr>`
  ).join('');

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html dir="rtl">
    <head>
      <title>فاتورة طلب #${o.id}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e94560; padding-bottom: 20px; }
        .header h1 { color: #e94560; margin-bottom: 5px; font-size: 24px; }
        .info { margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .info p { margin: 5px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #1a1a2e; color: #fff; padding: 10px; text-align: right; }
        .total { text-align: left; font-size: 18px; font-weight: 800; margin-top: 15px; padding-top: 10px; border-top: 2px solid #e94560; }
        .footer { text-align: center; margin-top: 40px; font-size: 13px; color: #636e72; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>فاتورة طلب</h1>
        <p style="color:#636e72;">${settings.storeName}</p>
      </div>
      <div class="info">
        <p><strong>رقم الطلب:</strong> #${o.id}</p>
        <p><strong>التاريخ:</strong> ${o.date}</p>
        <p><strong>العميل:</strong> ${o.name}</p>
        <p><strong>العنوان:</strong> ${o.state} / ${o.city}</p>
        <p><strong>الهاتف:</strong> ${o.phone}</p>
        <p><strong>الحالة:</strong> ${o.status}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th style="text-align:center;">الكمية</th>
            <th style="text-align:left;">المجموع</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div class="total">المجموع النهائي: ${o.total} ${settings.currency}</div>
      <div class="footer">شكراً لثقتكم في ${settings.storeName}</div>
      <script>
        window.onload = function() { window.print(); window.close(); }
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
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

function exportOrdersCSV() {
  const orders = JSON.parse(localStorage.getItem('materny_orders')) || [];
  if (orders.length === 0) {
    showToast('لا توجد طلبات للتصدير', 'error');
    return;
  }

  let csv = 'رقم الطلب,التاريخ,الاسم,الهاتف,الولاية,البلدية,المنتجات,المجموع,الحالة\n';
  orders.forEach(o => {
    const items = o.items.map(i => `${i.name} x${i.qty}`).join(' | ');
    csv += `#${o.id},"${o.date}","${o.name}","${o.phone}","${o.state}","${o.city}","${items}",${o.total},"${o.status}"\n`;
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `orders_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('✓ تم تصدير الطلبات بنجاح', 'success');
}

// ===== Settings =====
function loadSettings() {
  const settings = getStoreSettings();
  document.getElementById('setStoreName').value = settings.storeName || 'متجري';
  document.getElementById('setCurrency').value = settings.currency || 'دج';
  document.getElementById('setWhatsapp').value = settings.whatsapp || '';
  document.getElementById('setPassword').value = '';
}

function saveSettings(e) {
  e.preventDefault();
  const storeName = document.getElementById('setStoreName').value.trim();
  const currency = document.getElementById('setCurrency').value.trim();
  const whatsapp = document.getElementById('setWhatsapp').value.trim();
  const newPass = document.getElementById('setPassword').value.trim();

  localStorage.setItem('materny_settings', JSON.stringify({ storeName, currency, whatsapp }));

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
  renderCategoriesList();
  showToast('✓ تم حذف جميع المنتجات', 'success');
}

function resetAll() {
  if (!confirm('واش متأكد؟ راح يتم حذف كل البيانات (المنتجات، الطلبات، الإعدادات)!')) return;
  localStorage.removeItem('materny_products');
  localStorage.removeItem('materny_orders');
  localStorage.removeItem('materny_settings');
  localStorage.removeItem('materny_cart');
  localStorage.removeItem('materny_categories');
  renderProductsTable();
  renderOrdersTable();
  loadDashboard();
  loadSettings();
  renderCategoriesList();
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
      { id: Date.now() + 1, name: 'حذاء رياضي M1', price: 220, oldPrice: 300, description: 'حذاء طبي مريح - مثالي للاستخدام اليومي وللأقدام المتعبة', image: '', icon: 'fa-shoe-prints', category: 'أحذية', badge: 'sale', stock: 15 },
      { id: Date.now() + 2, name: 'حذاء كلاسيكي M2', price: 250, description: 'حذاء رجالي كلاسيكي أنيق ومناسب لجميع المناسبات', image: '', icon: 'fa-shoe-prints', category: 'أحذية', badge: 'featured', stock: 10 },
      { id: Date.now() + 3, name: 'تيشرت قطني', price: 120, description: 'تيشرت قطني 100% - مريح وناعم على البشرة', image: '', icon: 'fa-tshirt', category: 'ملابس', badge: 'new', stock: 25 },
      { id: Date.now() + 4, name: 'ساعة أنيقة', price: 180, description: 'ساعة يد أنيقة بتصميم عصري ومقاومة للماء', image: '', icon: 'fa-watch', category: 'إكسسوارات', stock: 8 }
    ];
    saveProducts(samples);
  }
})();
