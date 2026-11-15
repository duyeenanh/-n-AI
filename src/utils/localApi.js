import { categories as defaultCategories, products as defaultProducts } from '../data/products.js';

const STORAGE_KEYS = {
  users: 'moc-local-users-v2',
  products: 'moc-local-products-v2',
  categories: 'moc-local-categories',
  orders: 'moc-local-orders',
  receipts: 'moc-local-receipts',
  favorites: 'moc-favorites',
  aiHistory: 'moc-local-ai-history',
  messages: 'moc-local-staff-messages',
};

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSeededUsers() {
  const saved = readStore(STORAGE_KEYS.users, null);
  if (saved?.length) return saved;
  const initial = [
    { id: 1, fullName: 'Admin', email: 'admin@mocmien.local', password: '123456789', role: 'admin', phone: '0795670902', createdAt: new Date().toISOString() },
    { id: 2, fullName: 'Nhân viên 1', email: 'nhanvien1@mocmien.local', password: '12346755', role: 'staff', phone: '0905123451', createdAt: new Date().toISOString() },
    { id: 3, fullName: 'Nhân viên 2', email: 'nhanvien2@mocmien.local', password: '67891211', role: 'staff', phone: '0905123452', createdAt: new Date().toISOString() },
    { id: 4, fullName: 'Nhân viên 3', email: 'nhanvien3@mocmien.local', password: '2345660', role: 'staff', phone: '0905123453', createdAt: new Date().toISOString() },
    { id: 5, fullName: 'Khách hàng Minh Anh', email: 'khach@mocmien.local', password: 'Password123!', role: 'customer', phone: '0901234567', address: 'Thành phố Huế', createdAt: new Date().toISOString() },
  ];
  writeStore(STORAGE_KEYS.users, initial);
  return initial;
}

function getProducts() {
  const saved = readStore(STORAGE_KEYS.products, null);
  if (saved?.length) return saved;
  const initial = defaultProducts.map((p) => ({
    ...p,
    stock: p.stock ?? 12,
    isActive: 1,
    flowerType: p.flowerType || p.detail?.split('·')[0]?.trim() || 'Hoa tươi',
    flowerCount: p.flowerCount || p.detail?.split('·').slice(1).join('·').trim() || 'Bó thiết kế',
    wrapping: p.wrapping || 'Giấy gói thủ công Mộc Miên',
    color: p.color || 'Theo hình ảnh',
    description: p.description || `${p.name} là bó hoa tươi được tuyển chọn và gói thủ công tại Mộc Miên.`,
    updatedAt: new Date().toISOString(),
  }));
  writeStore(STORAGE_KEYS.products, initial);
  return initial;
}

function getCategories() {
  const saved = readStore(STORAGE_KEYS.categories, null);
  if (saved?.length) return saved;
  const prods = getProducts();
  const initial = defaultCategories
    .filter((c) => c.id !== 'all')
    .map((c, idx) => ({
      id: idx + 1,
      slug: c.id,
      name: c.label,
      description: '',
      productCount: prods.filter((p) => p.category === c.id && p.isActive !== 0).length,
    }));
  writeStore(STORAGE_KEYS.categories, initial);
  return initial;
}

function getOrders() {
  return readStore(STORAGE_KEYS.orders, []);
}

function currentUserFromToken(token) {
  if (!token || !token.startsWith('local-token-')) return null;
  const id = Number(token.replace('local-token-', ''));
  const user = getSeededUsers().find((u) => u.id === id);
  if (!user) return null;
  const { password: _pw, ...safeUser } = user;
  return safeUser;
}

export async function handleLocalApi(path, options = {}, token = null) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : {};
  const cleanPath = path.split('?')[0];
  const currentUser = currentUserFromToken(token);

  if (cleanPath === '/products' && method === 'GET') {
    return getProducts().filter((p) => p.isActive !== 0);
  }

  if (cleanPath === '/categories' && method === 'GET') {
    return getCategories().map((c) => ({ id: c.slug, label: c.name, productCount: c.productCount }));
  }

  if (cleanPath === '/auth/login' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = getSeededUsers().find((u) => u.email.toLowerCase() === email);
    if (!user || user.password !== password) {
      throw new Error('Email hoặc mật khẩu chưa đúng.');
    }
    const { password: _pw, ...publicUser } = user;
    return { token: `local-token-${user.id}`, user: publicUser };
  }

  if (cleanPath === '/auth/register' && method === 'POST') {
    const users = getSeededUsers();
    const email = String(body.email || '').trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('Email này đã được đăng ký.');
    }
    const newUser = {
      id: Date.now(),
      fullName: String(body.fullName || 'Khách hàng').trim(),
      email,
      password: String(body.password || ''),
      role: 'customer',
      phone: '',
      address: '',
      createdAt: new Date().toISOString(),
    };
    writeStore(STORAGE_KEYS.users, [...users, newUser]);
    const { password: _pw, ...publicUser } = newUser;
    return { token: `local-token-${newUser.id}`, user: publicUser };
  }

  if (cleanPath === '/auth/me' && method === 'GET') {
    if (!currentUser) throw new Error('Phiên đăng nhập không hợp lệ.');
    return currentUser;
  }

  if (cleanPath === '/users/profile' && method === 'PUT') {
    const users = getSeededUsers();
    const updated = users.map((u) => (u.id === currentUser?.id ? { ...u, ...body } : u));
    writeStore(STORAGE_KEYS.users, updated);
    const { password: _pw, ...publicUser } = updated.find((u) => u.id === currentUser?.id) || currentUser;
    return publicUser;
  }

  if (cleanPath === '/users/favorites' && method === 'GET') {
    const favIds = readStore(STORAGE_KEYS.favorites, []);
    return getProducts().filter((p) => favIds.includes(p.id));
  }

  if (cleanPath === '/orders' && method === 'GET') {
    return getOrders();
  }

  if (/^\/orders\/[^/]+\/payment-proof$/.test(cleanPath) && method === 'GET') {
    const id = cleanPath.split('/')[2];
    const order = getOrders().find((o) => String(o.id) === String(id));
    if (!order?.paymentProof?.imageBase64) {
      throw new Error('Đơn hàng này chưa có ảnh biên lai chuyển khoản.');
    }
    return order.paymentProof;
  }

  if (/^\/orders\/[^/]+\/payment-proof$/.test(cleanPath) && method === 'POST') {
    const id = cleanPath.split('/')[2];
    const now = new Date().toISOString();
    const orders = getOrders();
    const exists = orders.some((o) => String(o.id) === String(id));
    if (!exists) throw new Error('Không tìm thấy đơn hàng.');
    const updated = orders.map((o) => (String(o.id) === String(id)
      ? {
          ...o,
          hasPaymentProof: true,
          paymentProofUploadedAt: now,
          paymentStatus: o.paymentStatus === 'paid' ? 'paid' : 'pending_confirmation',
          paymentReportedAt: now,
          paymentProof: {
            mimeType: body.mimeType || 'image/jpeg',
            imageBase64: body.imageBase64 || '',
          },
        }
      : o));
    writeStore(STORAGE_KEYS.orders, updated);
    return {
      hasPaymentProof: true,
      paymentProofUploadedAt: now,
      paymentStatus: 'pending_confirmation',
      paymentReportedAt: now,
    };
  }

  if (/^\/orders\/[^/]+\/report-payment$/.test(cleanPath) && method === 'POST') {
    const id = cleanPath.split('/')[2];
    const now = new Date().toISOString();
    const orders = getOrders().map((o) => (String(o.id) === String(id)
      ? { ...o, paymentStatus: o.paymentStatus === 'paid' ? 'paid' : 'pending_confirmation', paymentReportedAt: now }
      : o));
    writeStore(STORAGE_KEYS.orders, orders);
    return { id, paymentStatus: 'pending_confirmation', paymentReportedAt: now };
  }

  if (/^\/orders\/[^/]+\/cancel$/.test(cleanPath) && method === 'POST') {
    const id = cleanPath.split('/')[2];
    const now = new Date().toISOString();
    const orders = getOrders().map((o) => (String(o.id) === String(id) && o.status === 'pending'
      ? { ...o, status: 'cancelled', history: [...(o.history || []), { status: 'cancelled', note: 'Khách hàng hủy đơn (Local).', createdAt: now }] }
      : o));
    writeStore(STORAGE_KEYS.orders, orders);
    return { id, status: 'cancelled' };
  }

  if (cleanPath === '/messages' && method === 'GET') {
    return { conversationId: 1, messages: readStore(STORAGE_KEYS.messages, []) };
  }

  if (cleanPath === '/messages' && method === 'POST') {
    const msgs = readStore(STORAGE_KEYS.messages, []);
    const msg = {
      id: Date.now(),
      senderRole: 'customer',
      senderName: currentUser?.fullName || 'Khách hàng',
      content: body.content,
      createdAt: new Date().toISOString(),
    };
    writeStore(STORAGE_KEYS.messages, [...msgs, msg]);
    return msg;
  }

  // Admin endpoints
  if (cleanPath === '/admin/stats') {
    const orders = getOrders();
    const prods = getProducts();
    const paidOrders = orders.filter((o) => o.status !== 'cancelled' && o.paymentStatus === 'paid');
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      totalOrders: orders.length,
      todayOrders: orders.filter((o) => String(o.createdAt || '').slice(0, 10) === todayStr).length,
      confirmedRevenue: paidOrders.reduce((s, o) => s + Number(o.total || 0), 0),
      totalStock: prods.filter((p) => p.isActive !== 0).reduce((s, p) => s + Number(p.stock || 0), 0),
      lowStock: prods.filter((p) => p.isActive !== 0 && p.stock >= 1 && p.stock <= 3).length,
      bestSellers: prods.slice(0, 5).map((p, i) => ({ name: p.name, quantity: 12 - i * 2 })),
      dailyRevenue: [{ period: todayStr, revenue: paidOrders.reduce((s, o) => s + Number(o.total || 0), 0) }],
      monthlyRevenue: [{ period: todayStr.slice(0, 7), revenue: paidOrders.reduce((s, o) => s + Number(o.total || 0), 0) }],
      yearlyRevenue: [{ period: todayStr.slice(0, 4), revenue: paidOrders.reduce((s, o) => s + Number(o.total || 0), 0) }],
      recentOrders: orders.slice(0, 8),
    };
  }

  if (cleanPath === '/admin/products' && method === 'GET') return getProducts();
  if ((cleanPath === '/admin/products' || cleanPath === '/staff/products') && method === 'POST') {
    const prods = getProducts();
    const created = { id: `mm-${Date.now().toString().slice(-5)}`, ...body, isActive: 1, updatedAt: new Date().toISOString() };
    writeStore(STORAGE_KEYS.products, [created, ...prods]);
    return created;
  }
  if (cleanPath.startsWith('/admin/products/') && method === 'PUT') {
    const id = cleanPath.split('/').pop();
    const prods = getProducts().map((p) => (p.id === id ? { ...p, ...body, updatedAt: new Date().toISOString() } : p));
    writeStore(STORAGE_KEYS.products, prods);
    return prods.find((p) => p.id === id);
  }
  if (/^\/admin\/products\/[^/]+\/restore$/.test(cleanPath) && method === 'PATCH') {
    const id = cleanPath.split('/')[3];
    const prods = getProducts().map((p) => (p.id === id ? { ...p, isActive: 1, updatedAt: new Date().toISOString() } : p));
    writeStore(STORAGE_KEYS.products, prods);
    return prods.find((p) => p.id === id);
  }
  if (cleanPath.startsWith('/admin/products/') && method === 'DELETE') {
    const id = cleanPath.split('/').pop();
    const isHard = path.includes('hard=true');
    if (isHard) {
      writeStore(STORAGE_KEYS.products, getProducts().filter((p) => p.id !== id));
    } else {
      writeStore(STORAGE_KEYS.products, getProducts().map((p) => (p.id === id ? { ...p, isActive: 0 } : p)));
    }
    return null;
  }

  if (cleanPath === '/admin/inventory' || cleanPath === '/staff/inventory') {
    return getProducts().filter((p) => p.isActive !== 0);
  }

  if (/^\/(admin|staff)\/inventory\/[^/]+$/.test(cleanPath) && method === 'PATCH') {
    const id = cleanPath.split('/').pop();
    const prods = getProducts().map((p) => (p.id === id ? { ...p, stock: Number(body.stock), updatedAt: new Date().toISOString() } : p));
    writeStore(STORAGE_KEYS.products, prods);
    return prods.find((p) => p.id === id);
  }

  if (/^\/(admin|staff)\/inventory\/[^/]+\/add$/.test(cleanPath) && method === 'POST') {
    const id = cleanPath.split('/')[3];
    const prods = getProducts().map((p) => (p.id === id ? { ...p, stock: Number(p.stock || 0) + Number(body.quantity || 0), updatedAt: new Date().toISOString() } : p));
    writeStore(STORAGE_KEYS.products, prods);
    return prods.find((p) => p.id === id);
  }

  if (cleanPath === '/admin/stock-receipts' && method === 'GET') return readStore(STORAGE_KEYS.receipts, []);
  if (cleanPath === '/admin/stock-receipts' && method === 'POST') {
    const prods = getProducts();
    const product = prods.find((p) => p.id === body.productId);
    const receipt = {
      id: Date.now(),
      receiptCode: `PN-${Date.now().toString(36).toUpperCase()}`,
      supplierName: body.supplierName,
      note: body.note || '',
      totalCost: Number(body.quantity) * Number(body.unitCost),
      status: 'in_transit',
      receivedBy: currentUser?.fullName || 'Admin',
      createdAt: new Date().toISOString(),
      items: [{ productId: body.productId, productName: product?.name || body.productId, quantity: Number(body.quantity), unitCost: Number(body.unitCost) }],
    };
    const receipts = readStore(STORAGE_KEYS.receipts, []);
    writeStore(STORAGE_KEYS.receipts, [receipt, ...receipts]);
    return receipt;
  }
  if (/^\/admin\/stock-receipts\/[^/]+\/receive$/.test(cleanPath) && method === 'POST') {
    const id = Number(cleanPath.split('/')[3]);
    const receipts = readStore(STORAGE_KEYS.receipts, []);
    const target = receipts.find((r) => r.id === id);
    if (target && target.status === 'in_transit') {
      const prods = getProducts();
      for (const item of target.items) {
        const p = prods.find((x) => x.id === item.productId);
        if (p) p.stock = Number(p.stock || 0) + Number(item.quantity);
      }
      writeStore(STORAGE_KEYS.products, prods);
      target.status = 'received';
      target.receivedAt = new Date().toISOString();
      writeStore(STORAGE_KEYS.receipts, receipts);
    }
    return target;
  }

  if (cleanPath === '/admin/categories' && method === 'GET') return getCategories();
  if (cleanPath === '/admin/categories' && method === 'POST') {
    const cats = getCategories();
    const created = { id: Date.now(), ...body, productCount: 0 };
    writeStore(STORAGE_KEYS.categories, [...cats, created]);
    return created;
  }
  if (cleanPath.startsWith('/admin/categories/') && method === 'PUT') {
    const slug = cleanPath.split('/').pop();
    const cats = getCategories().map((c) => (c.slug === slug ? { ...c, ...body } : c));
    writeStore(STORAGE_KEYS.categories, cats);
    return { slug, ...body };
  }
  if (cleanPath.startsWith('/admin/categories/') && method === 'DELETE') {
    const slug = cleanPath.split('/').pop();
    writeStore(STORAGE_KEYS.categories, getCategories().filter((c) => c.slug !== slug));
    return null;
  }

  if (cleanPath === '/admin/orders' || cleanPath === '/staff/orders') return getOrders();
  if (/^\/(admin|staff)\/orders\/[^/]+\/status$/.test(cleanPath) && method === 'PATCH') {
    const id = cleanPath.split('/')[3];
    const orders = getOrders().map((o) => {
      if (String(o.id) !== String(id)) return o;
      return {
        ...o,
        status: body.status,
        history: [...(o.history || []), { status: body.status, note: body.note || '', updatedBy: currentUser?.fullName || 'Cửa hàng', createdAt: new Date().toISOString() }],
      };
    });
    writeStore(STORAGE_KEYS.orders, orders);
    return { id, status: body.status };
  }

  if (cleanPath === '/admin/payments' || cleanPath === '/staff/payments') {
    return getOrders().filter((o) => o.paymentMethod === 'bank_transfer');
  }
  if (/^\/((admin|staff)\/)?payments\/[^/]+\/confirm$/.test(cleanPath) && method === 'POST') {
    const parts = cleanPath.split('/').filter(Boolean);
    const id = parts[parts.length - 2];
    const orders = getOrders().map((o) => (String(o.id) === String(id)
      ? { ...o, paymentStatus: 'paid', paymentConfirmedAt: new Date().toISOString(), paymentConfirmedBy: currentUser?.fullName || 'Cửa hàng' }
      : o));
    writeStore(STORAGE_KEYS.orders, orders);
    return { id, paymentStatus: 'paid', paymentConfirmedBy: currentUser?.fullName || 'Cửa hàng' };
  }

  if (cleanPath === '/ai/reindex' && method === 'POST') {
    const activeCount = getProducts().filter((p) => p.isActive !== 0).length;
    return { indexed: activeCount, message: `Đã lập chỉ mục lại ${activeCount} mẫu hoa (Local TF-IDF).` };
  }

  if (cleanPath === '/admin/customers') {
    const orders = getOrders();
    return getSeededUsers()
      .filter((u) => u.role === 'customer')
      .map((u) => {
        const customerOrders = orders.filter((o) => (
          o.userId === u.id
          || (u.email && String(o.customerEmail || o.email || '').toLowerCase() === u.email.toLowerCase())
          || (u.phone && String(o.recipientPhone || '').trim() === String(u.phone).trim())
        ));
        const validOrders = customerOrders.filter((o) => o.status !== 'cancelled');
        return {
          ...u,
          orderCount: customerOrders.length,
          lifetimeValue: validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
        };
      });
  }
  if (cleanPath === '/admin/staff' && method === 'GET') {
    return getSeededUsers().filter((u) => u.role === 'staff').map(({ password: _p, ...u }) => u);
  }
  if (cleanPath === '/admin/staff' && method === 'POST') {
    const users = getSeededUsers();
    const created = { id: Date.now(), ...body, role: 'staff', createdAt: new Date().toISOString() };
    writeStore(STORAGE_KEYS.users, [...users, created]);
    return created;
  }
  if (cleanPath.startsWith('/admin/staff/') && method === 'PUT') {
    const id = Number(cleanPath.split('/').pop());
    const users = getSeededUsers().map((u) => (u.id === id ? { ...u, ...body } : u));
    writeStore(STORAGE_KEYS.users, users);
    return { id, ...body };
  }
  if (cleanPath.startsWith('/admin/staff/') && method === 'DELETE') {
    const id = Number(cleanPath.split('/').pop());
    writeStore(STORAGE_KEYS.users, getSeededUsers().filter((u) => u.id !== id));
    return null;
  }

  if (cleanPath === '/admin/ai-history') return readStore(STORAGE_KEYS.aiHistory, []);

  if (cleanPath === '/staff/overview') {
    const prods = getProducts().filter((p) => p.isActive !== 0);
    const orders = getOrders();
    return {
      activeProducts: prods.length,
      totalStock: prods.reduce((s, p) => s + Number(p.stock || 0), 0),
      lowStock: prods.filter((p) => p.stock <= 3).length,
      activeOrders: orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length,
      shippingOrders: orders.filter((o) => o.status === 'shipping').length,
    };
  }

  if (cleanPath === '/staff/conversations') {
    const msgs = readStore(STORAGE_KEYS.messages, []);
    if (!msgs.length) return [];
    const last = msgs[msgs.length - 1];
    return [{ id: 1, userId: 3, customerName: 'Khách hàng Minh Anh', customerEmail: 'khach@mocmien.local', customerPhone: '0901234567', updatedAt: last.createdAt, lastMessage: last.content, lastSenderRole: last.senderRole }];
  }
  if (cleanPath === '/staff/conversations/1/messages' && method === 'GET') {
    return readStore(STORAGE_KEYS.messages, []);
  }
  if (cleanPath === '/staff/conversations/1/messages' && method === 'POST') {
    const msgs = readStore(STORAGE_KEYS.messages, []);
    const msg = { id: Date.now(), senderRole: 'staff', senderName: currentUser?.fullName || 'Nhân viên', content: body.content, createdAt: new Date().toISOString() };
    writeStore(STORAGE_KEYS.messages, [...msgs, msg]);
    return msg;
  }

  throw new Error('Tính năng này cần kết nối máy chủ.');
}
