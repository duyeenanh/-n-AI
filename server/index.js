import 'dotenv/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getPool, query } from './db.js';
import { createToken, optionalAuth, requireAdmin, requireAuth, requireStaff } from './auth.js';
import { composeAdvice, indexProduct, retrieveProducts } from './rag.js';
import { extractBudget } from './ai-budget.js';

const app = express();
app.disable('x-powered-by');
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;
app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : true }));
app.use(express.json({ limit: '6mb' }));
app.use(optionalAuth);

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const fail = (res, status, error) => res.status(status).json({ error });
const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
});

app.get('/api/health', asyncRoute(async (_req, res) => {
  await getPool().query('SELECT 1');
  res.json({ status: 'ok', database: 'connected' });
}));

app.get('/api/categories', asyncRoute(async (_req, res) => {
  res.json(await query(
    `SELECT c.slug AS id, c.name AS label, COUNT(p.id) AS "productCount"
     FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
     GROUP BY c.id ORDER BY c.name`,
  ));
}));

app.get('/api/products', asyncRoute(async (req, res) => {
  const filters = ['p.is_active = 1'];
  const values = [];
  if (req.query.category && req.query.category !== 'all') {
    filters.push('c.slug = ?');
    values.push(String(req.query.category));
  }
  if (req.query.q) {
    filters.push('(p.name ILIKE ? OR p.description ILIKE ? OR p.flower_type ILIKE ? OR p.occasions ILIKE ?)');
    const term = `%${String(req.query.q).slice(0, 100)}%`;
    values.push(term, term, term, term);
  }
  if (req.query.maxPrice && Number.isFinite(Number(req.query.maxPrice))) {
    filters.push('p.price <= ?');
    values.push(Number(req.query.maxPrice));
  }
  if (req.query.favorites === 'true') {
    if (!req.user) return fail(res, 401, 'Vui lòng đăng nhập để xem danh sách yêu thích.');
    filters.push('EXISTS (SELECT 1 FROM favorites f WHERE f.product_id = p.id AND f.user_id = ?)');
    values.push(req.user.id);
  }
  const order = req.query.sort === 'low' ? 'p.price ASC' : req.query.sort === 'high' ? 'p.price DESC' : 'p.created_at DESC';
  const productsList = await query(
    `SELECT p.id, c.slug AS category, p.name, p.price, p.old_price AS "oldPrice",
            p.description, p.flower_type AS "flowerType", p.flower_count AS "flowerCount",
            p.wrapping, p.color, p.occasions AS occasion, p.image_url AS image,
            p.stock, CASE WHEN f.user_id IS NULL THEN 0 ELSE 1 END AS "isFavorite"
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN favorites f ON f.product_id = p.id AND f.user_id = ?
     WHERE ${filters.join(' AND ')} ORDER BY ${order} LIMIT 100`,
    [req.user?.id || 0, ...values],
  );
  res.json(productsList);
}));

app.get('/api/products/:id', asyncRoute(async (req, res) => {
  const [product] = await query(
    `SELECT p.id, c.slug AS category, p.name, p.price, p.old_price AS "oldPrice",
            p.description, p.flower_type AS "flowerType", p.flower_count AS "flowerCount",
            p.wrapping, p.color, p.occasions AS occasion, p.image_url AS image, p.stock
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? AND p.is_active = 1`,
    [req.params.id],
  );
  if (!product) return fail(res, 404, 'Không tìm thấy sản phẩm.');
  res.json(product);
}));

app.get('/api/products/:id/reviews', asyncRoute(async (req, res) => {
  const reviews = await query(
    `SELECT r.id, r.rating, r.comment, r.created_at AS "createdAt", u.full_name AS "customerName"
     FROM reviews r
     JOIN order_items oi ON oi.id = r.order_item_id
     JOIN users u ON u.id = r.user_id
     WHERE oi.product_id = ?
     ORDER BY r.created_at DESC
     LIMIT 30`,
    [req.params.id],
  );
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? Number((reviews.reduce((sum, item) => sum + Number(item.rating), 0) / totalReviews).toFixed(1))
    : 5.0;
  res.json({ averageRating, totalReviews, reviews });
}));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const input = z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(190),
    password: z.string().min(8).max(100),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const email = input.data.email.toLowerCase();
  if ((await query('SELECT id FROM users WHERE email = ?', [email])).length) return fail(res, 409, 'Email này đã được đăng ký.');
  const passwordHash = await bcrypt.hash(input.data.password, 12);
  const result = await query('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?) RETURNING id', [input.data.fullName, email, passwordHash]);
  const user = { id: result.insertId, fullName: input.data.fullName, email, role: 'customer' };
  res.status(201).json({ token: createToken(user), user });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!input.success) return fail(res, 400, 'Vui lòng nhập email và mật khẩu hợp lệ.');
  const [user] = await query('SELECT id, full_name AS "fullName", email, phone, address, password_hash, role FROM users WHERE email = ?', [input.data.email.toLowerCase()]);
  if (!user || !(await bcrypt.compare(input.data.password, user.password_hash))) return fail(res, 401, 'Email hoặc mật khẩu không chính xác.');
  const publicUser = { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, address: user.address, role: user.role };
  res.json({ token: createToken(publicUser), user: publicUser });
}));

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

app.get('/api/users/profile', requireAuth, (req, res) => res.json(req.user));
app.put('/api/users/profile', requireAuth, asyncRoute(async (req, res) => {
  const input = profileSchema.safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  if (req.user.role === 'staff') {
    await query('UPDATE users SET full_name = ?, phone = ?, address = NULL WHERE id = ?', [input.data.fullName, input.data.phone || null, req.user.id]);
  } else {
    await query('UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?', [input.data.fullName, input.data.phone || null, input.data.address || null, req.user.id]);
  }
  const [user] = await query('SELECT id, full_name AS "fullName", email, phone, address, role FROM users WHERE id = ?', [req.user.id]);
  res.json(user);
}));

app.put('/api/users/password', requireAuth, asyncRoute(async (req, res) => {
  const input = z.object({ currentPassword: z.string(), newPassword: z.string().min(8).max(100) }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const [user] = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!(await bcrypt.compare(input.data.currentPassword, user.password_hash))) return fail(res, 400, 'Mật khẩu hiện tại không chính xác.');
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(input.data.newPassword, 12), req.user.id]);
  res.json({ message: 'Đã đổi mật khẩu.' });
}));

app.get('/api/users/favorites', requireAuth, asyncRoute(async (req, res) => {
  res.json(await query(
    `SELECT p.id, p.name, p.price FROM favorites f JOIN products p ON p.id = f.product_id
     WHERE f.user_id = ? ORDER BY f.created_at DESC`,
    [req.user.id],
  ));
}));

app.put('/api/users/favorites/:productId', requireAuth, asyncRoute(async (req, res) => {
  const [product] = await query('SELECT id FROM products WHERE id = ? AND is_active = 1', [req.params.productId]);
  if (!product) return fail(res, 404, 'Không tìm thấy sản phẩm.');
  const existing = await query('SELECT product_id FROM favorites WHERE user_id = ? AND product_id = ?', [req.user.id, product.id]);
  if (existing.length) await query('DELETE FROM favorites WHERE user_id = ? AND product_id = ?', [req.user.id, product.id]);
  else await query('INSERT INTO favorites (user_id, product_id) VALUES (?, ?)', [req.user.id, product.id]);
  res.json({ favorite: !existing.length });
}));

app.post('/api/orders', asyncRoute(async (req, res) => {
  if (req.user && req.user.role !== 'customer') return fail(res, 403, 'Tài khoản nhân viên không thể đặt đơn khách hàng.');
  const input = z.object({
    recipientName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(8).max(30),
    address: z.string().trim().min(5).max(500),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cardMessage: z.string().max(1000).optional().default(''),
    couponCode: z.string().trim().max(40).optional().default(''),
    paymentMethod: z.enum(['cod', 'bank_transfer']),
    items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(50) })).min(1).max(30),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const quantitiesByProduct = new Map();
  for (const item of input.data.items) {
    const quantity = (quantitiesByProduct.get(item.productId) || 0) + item.quantity;
    if (quantity > 50) return fail(res, 400, 'Tổng số lượng mỗi sản phẩm trong đơn không được vượt quá 50.');
    quantitiesByProduct.set(item.productId, quantity);
  }
  const requestedItems = [...quantitiesByProduct].map(([productId, quantity]) => ({ productId, quantity }));
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const verifiedItems = [];
    for (const item of requestedItems) {
      const [rows] = await connection.execute(
        'SELECT id, name, price, stock FROM products WHERE id = ? AND is_active = 1 FOR UPDATE',
        [item.productId],
      );
      const product = rows[0];
      if (!product || Number(product.stock) < item.quantity) {
        await connection.rollback();
        return fail(res, 409, `Sản phẩm ${product?.name || item.productId} không đủ số lượng trong kho.`);
      }
      verifiedItems.push({ ...product, quantity: item.quantity, lineTotal: Number(product.price) * item.quantity });
    }
    const subtotal = verifiedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const baseShippingFee = subtotal >= 500000 ? 0 : 30000;
    const code = input.data.couponCode.toUpperCase();
    let discount = 0;
    let shippingFee = baseShippingFee;
    if (code === 'MOCMIEN10' && subtotal >= 200000) {
      discount = Math.min(Math.round(subtotal * 0.1), 80000);
    } else if (code === 'FREESHIP') {
      shippingFee = 0;
    } else if (code === 'TOTNGHIEP50' && subtotal >= 400000) {
      discount = Math.min(50000, subtotal);
    }
    const total = Math.max(0, subtotal - discount + shippingFee);
    const orderCode = `MM${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 90 + 10)}`;
    const paymentStatus = 'unpaid';
    const guestOrderToken = req.user ? null : randomBytes(32).toString('hex');
    const guestOrderTokenHash = guestOrderToken
      ? createHash('sha256').update(guestOrderToken).digest('hex')
      : null;
    const [orderResult] = await connection.execute(
      `INSERT INTO orders
       (order_code, user_id, recipient_name, phone, delivery_address, delivery_date, card_message, guest_order_token_hash,
        subtotal, shipping_fee, total_amount, payment_method, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [orderCode, req.user?.id || null, input.data.recipientName, input.data.phone, input.data.address,
        input.data.deliveryDate, input.data.cardMessage, guestOrderTokenHash, subtotal, shippingFee, total,
        input.data.paymentMethod, paymentStatus],
    );
    for (const item of verifiedItems) {
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?)',
        [orderResult.insertId, item.id, item.name, item.price, item.quantity, item.lineTotal],
      );
      await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
    }
    await connection.execute(
      'INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)',
      [orderResult.insertId, 'pending', 'Khách hàng vừa đặt đơn.', req.user?.id || null],
    );
    await connection.commit();
    res.status(201).json({
      id: orderResult.insertId, orderCode, subtotal, shippingFee, total,
      recipientName: input.data.recipientName, phone: input.data.phone, address: input.data.address,
      deliveryDate: input.data.deliveryDate, cardMessage: input.data.cardMessage,
      createdAt: new Date(), hasPaymentProof: false,
      items: verifiedItems.map((item) => ({
        productId: item.id, name: item.name, price: item.price, quantity: item.quantity, lineTotal: item.lineTotal,
      })),
      guestOrderToken,
      paymentMethod: input.data.paymentMethod, paymentStatus, status: 'pending',
      bank: input.data.paymentMethod === 'bank_transfer' ? {
        name: process.env.BANK_NAME || '',
        account: process.env.BANK_ACCOUNT || '',
        accountName: process.env.BANK_ACCOUNT_NAME || '',
        qrImage: '/qr-chuyen-khoan.png',
        note: 'Quét QR, nhập đúng số tiền và ghi nội dung chuyển khoản theo mã đơn. Cửa hàng sẽ xác nhận sau khi kiểm tra tài khoản.',
      } : null,
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

const orderSelect = `SELECT o.id, o.order_code AS "orderCode", o.recipient_name AS "recipientName", o.phone,
  o.delivery_address AS address, o.delivery_date AS "deliveryDate", o.card_message AS "cardMessage",
  o.subtotal, o.shipping_fee AS "shippingFee", o.total_amount AS total,
  o.payment_method AS "paymentMethod", o.payment_status AS "paymentStatus",
  o.payment_reported_at AS "paymentReportedAt", o.payment_confirmed_at AS "paymentConfirmedAt",
  o.payment_confirmed_by AS "paymentConfirmedById", o.payment_proof IS NOT NULL AS "hasPaymentProof",
  o.payment_proof_uploaded_at AS "paymentProofUploadedAt",
  o.status, o.created_at AS "createdAt"`;

app.post('/api/orders/:id/report-payment', asyncRoute(async (req, res) => {
  const guestToken = req.get('x-order-access-token');
  const guestTokenHash = guestToken ? createHash('sha256').update(guestToken).digest('hex') : null;
  const [order] = await query(
    `SELECT id, payment_method AS "paymentMethod", payment_status AS "paymentStatus", status
     FROM orders
     WHERE id = ? AND ((? IS NOT NULL AND user_id = ?) OR (? IS NOT NULL AND guest_order_token_hash = ?))`,
    [req.params.id, req.user?.role === 'customer' ? req.user.id : null, req.user?.role === 'customer' ? req.user.id : null, guestTokenHash, guestTokenHash],
  );
  if (!order) return fail(res, 404, 'Không tìm thấy đơn hàng.');
  if (order.status === 'cancelled') return fail(res, 409, 'Đơn đã hủy, không thể báo thanh toán.');
  if (order.paymentMethod !== 'bank_transfer') return fail(res, 400, 'Đơn hàng này không thanh toán bằng chuyển khoản.');
  if (order.paymentStatus === 'paid') return fail(res, 409, 'Đơn hàng này đã được cửa hàng xác nhận thanh toán.');
  const result = await query(
    `UPDATE orders SET payment_status = 'pending_confirmation', payment_reported_at = CURRENT_TIMESTAMP
     WHERE id = ? AND payment_status <> 'paid'
       AND ((? IS NOT NULL AND user_id = ?) OR (? IS NOT NULL AND guest_order_token_hash = ?))`,
    [req.params.id, req.user?.role === 'customer' ? req.user.id : null, req.user?.role === 'customer' ? req.user.id : null, guestTokenHash, guestTokenHash],
  );
  if (!result.affectedRows) return fail(res, 409, 'Trạng thái thanh toán vừa thay đổi. Hãy tải lại đơn hàng.');
  res.json({ id: Number(req.params.id), paymentStatus: 'pending_confirmation', paymentReportedAt: new Date() });
}));

app.post('/api/orders/:id/payment-proof', asyncRoute(async (req, res) => {
  const input = z.object({
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    imageBase64: z.string().min(1).max(5_600_000),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, 'Chỉ nhận ảnh JPEG, PNG hoặc WebP tối đa 4 MB.');
  const guestToken = req.get('x-order-access-token');
  const guestTokenHash = guestToken ? createHash('sha256').update(guestToken).digest('hex') : null;
  if (req.user && req.user.role !== 'customer' && !guestTokenHash) return fail(res, 403, 'Chỉ khách hàng đặt đơn mới được tải biên lai.');

  const encodedImage = input.data.imageBase64;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encodedImage)) {
    return fail(res, 400, 'Dữ liệu ảnh biên lai không hợp lệ.');
  }
  const image = Buffer.from(encodedImage, 'base64');
  if (image.length > 4 * 1024 * 1024) return fail(res, 400, 'Ảnh biên lai không được vượt quá 4 MB.');
  const isJpeg = input.data.mimeType === 'image/jpeg' && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  const isPng = input.data.mimeType === 'image/png'
    && image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = input.data.mimeType === 'image/webp'
    && image.toString('ascii', 0, 4) === 'RIFF'
    && image.toString('ascii', 8, 12) === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) return fail(res, 400, 'Định dạng ảnh không khớp với nội dung tệp.');

  const [order] = await query(
    `SELECT id, payment_method AS "paymentMethod", payment_status AS "paymentStatus", status
     FROM orders
     WHERE id = ? AND ((? IS NOT NULL AND user_id = ?) OR (? IS NOT NULL AND guest_order_token_hash = ?))`,
    [req.params.id, req.user?.role === 'customer' ? req.user.id : null, req.user?.role === 'customer' ? req.user.id : null, guestTokenHash, guestTokenHash],
  );
  if (!order) return fail(res, 404, 'Không tìm thấy đơn hàng.');
  if (order.status === 'cancelled') return fail(res, 409, 'Đơn đã hủy, không thể gửi biên lai.');
  if (order.paymentMethod !== 'bank_transfer') return fail(res, 400, 'Đơn hàng này không thanh toán bằng chuyển khoản.');
  if (order.paymentStatus === 'paid') return fail(res, 409, 'Đơn hàng đã được cửa hàng xác nhận thanh toán.');

  const updateResult = await query(
    `UPDATE orders
     SET payment_proof = ?, payment_proof_mime = ?, payment_proof_uploaded_at = CURRENT_TIMESTAMP,
         payment_status = 'pending_confirmation', payment_reported_at = COALESCE(payment_reported_at, CURRENT_TIMESTAMP)
     WHERE id = ? AND payment_status <> 'paid'
       AND ((? IS NOT NULL AND user_id = ?) OR (? IS NOT NULL AND guest_order_token_hash = ?))`,
    [image, input.data.mimeType, order.id, req.user?.role === 'customer' ? req.user.id : null, req.user?.role === 'customer' ? req.user.id : null, guestTokenHash, guestTokenHash],
  );
  if (!updateResult.affectedRows) return fail(res, 409, 'Trạng thái thanh toán vừa thay đổi. Hãy tải lại đơn hàng.');
  res.json({
    id: Number(order.id), hasPaymentProof: true, paymentProofUploadedAt: new Date(),
    paymentStatus: 'pending_confirmation', paymentReportedAt: new Date(),
  });
}));

app.get('/api/orders/:id/payment-proof', asyncRoute(async (req, res) => {
  const guestToken = req.get('x-order-access-token');
  const guestTokenHash = guestToken ? createHash('sha256').update(guestToken).digest('hex') : null;
  const customerId = req.user?.role === 'customer' ? req.user.id : null;
  const staffRole = req.user && ['staff', 'admin'].includes(req.user.role) ? req.user.role : null;
  const [order] = await query(
    `SELECT payment_proof AS image, payment_proof_mime AS "mimeType"
     FROM orders
     WHERE id = ?
       AND ((? IS NOT NULL AND user_id = ?) OR (? IS NOT NULL AND guest_order_token_hash = ?) OR ? IS NOT NULL)`,
    [req.params.id, customerId, customerId, guestTokenHash, guestTokenHash, staffRole],
  );
  if (!order) return fail(res, 404, 'Không tìm thấy biên lai của đơn hàng.');
  if (!order.image) return fail(res, 404, 'Khách chưa tải biên lai chuyển khoản.');
  res.set('Cache-Control', 'private, no-store');
  res.json({ mimeType: order.mimeType, imageBase64: Buffer.from(order.image).toString('base64') });
}));

app.get('/api/orders/track', asyncRoute(async (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase();
  const phone = String(req.query.phone || '').replace(/\s+/g, '').trim();
  if (!code || phone.length < 6) return fail(res, 400, 'Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại nhận hoa.');
  const orders = await query(`${orderSelect} FROM orders o WHERE UPPER(o.order_code) = ?`, [code]);
  const order = orders.find((row) => String(row.phone || '').replace(/\s+/g, '') === phone);
  if (!order) return fail(res, 404, 'Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại này.');
  order.items = await query(
    `SELECT oi.id AS "orderItemId", oi.product_id AS "productId", oi.product_name AS name,
      oi.unit_price AS price, oi.quantity, oi.line_total AS "lineTotal"
     FROM order_items oi WHERE oi.order_id = ?`,
    [order.id],
  );
  order.history = await query(
    `SELECT h.status, h.note, h.created_at AS "createdAt", u.full_name AS "updatedBy"
     FROM order_status_history h LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.order_id = ? ORDER BY h.created_at`,
    [order.id],
  );
  res.json(order);
}));

app.post('/api/orders/:id/cancel', asyncRoute(async (req, res) => {
  const guestToken = String(req.get('x-order-access-token') || '').trim();
  const guestTokenHash = guestToken ? createHash('sha256').update(guestToken).digest('hex') : null;
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT id, user_id, guest_order_token_hash, status FROM orders WHERE id = ? FOR UPDATE',
      [req.params.id],
    );
    const order = rows[0];
    if (!order) {
      await connection.rollback();
      return fail(res, 404, 'Không tìm thấy đơn hàng.');
    }
    const isOwner = req.user && order.user_id === req.user.id;
    const isGuestOwner = !order.user_id && guestTokenHash && order.guest_order_token_hash === guestTokenHash;
    if (!isOwner && !isGuestOwner) {
      await connection.rollback();
      return fail(res, 403, 'Bạn không có quyền hủy đơn hàng này.');
    }
    if (order.status !== 'pending') {
      await connection.rollback();
      return fail(res, 409, 'Chỉ có thể hủy đơn khi đơn đang ở trạng thái Chờ xác nhận.');
    }
    const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      if (item.product_id) {
        await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    }
    await connection.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", [order.id]);
    await connection.execute(
      'INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)',
      [order.id, 'cancelled', 'Khách hàng hủy đơn trước khi xác nhận.', req.user?.id || null],
    );
    await connection.commit();
    res.json({ id: Number(order.id), status: 'cancelled' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  const orders = await query(`${orderSelect} FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`, [req.user.id]);
  for (const order of orders) {
    order.items = await query(
      `SELECT oi.id AS "orderItemId", oi.product_id AS "productId", oi.product_name AS name,
        oi.unit_price AS price, oi.quantity, oi.line_total AS "lineTotal",
        r.rating AS "reviewRating", r.comment AS "reviewComment"
       FROM order_items oi LEFT JOIN reviews r ON r.order_item_id = oi.id
       WHERE oi.order_id = ?`,
      [order.id],
    );
    order.history = await query(
      `SELECT h.status, h.note, h.created_at AS "createdAt", u.full_name AS "updatedBy"
       FROM order_status_history h LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.order_id = ? ORDER BY h.created_at`,
      [order.id],
    );
  }
  res.json(orders);
}));

app.post('/api/orders/:orderId/items/:itemId/review', requireAuth, asyncRoute(async (req, res) => {
  if (req.user.role !== 'customer') return fail(res, 403, 'Chỉ khách hàng mới có thể đánh giá đơn hàng.');
  const input = z.object({
    rating: z.number().min(0.5).max(5).refine((value) => Number.isInteger(value * 2), 'Số sao phải theo mức 0,5.'),
    comment: z.string().trim().min(2).max(1000),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const [item] = await query(
    `SELECT oi.id FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.id = ? AND o.id = ? AND o.user_id = ? AND o.status = 'delivered'`,
    [req.params.itemId, req.params.orderId, req.user.id],
  );
  if (!item) return fail(res, 404, 'Chỉ có thể đánh giá sản phẩm trong đơn đã giao của bạn.');
  await query(
    `INSERT INTO reviews (order_item_id, user_id, rating, comment)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (order_item_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = CURRENT_TIMESTAMP`,
    [item.id, req.user.id, input.data.rating, input.data.comment],
  );
  res.json({ orderItemId: Number(item.id), ...input.data });
}));

app.get('/api/orders/:id', requireAuth, asyncRoute(async (req, res) => {
  const [order] = await query(`${orderSelect} FROM orders o WHERE o.id = ? AND o.user_id = ?`, [req.params.id, req.user.id]);
  if (!order) return fail(res, 404, 'Không tìm thấy đơn hàng.');
  order.items = await query(
    `SELECT oi.id AS "orderItemId", oi.product_id AS "productId", oi.product_name AS name,
      oi.unit_price AS price, oi.quantity, oi.line_total AS "lineTotal",
      r.rating AS "reviewRating", r.comment AS "reviewComment"
     FROM order_items oi LEFT JOIN reviews r ON r.order_item_id = oi.id
     WHERE oi.order_id = ?`,
    [order.id],
  );
  order.history = await query(
    `SELECT h.status, h.note, h.created_at AS "createdAt", u.full_name AS "updatedBy"
     FROM order_status_history h LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.order_id = ? ORDER BY h.created_at`,
    [order.id],
  );
  res.json(order);
}));

app.post('/api/ai/consult', asyncRoute(async (req, res) => {
  const input = z.object({
    message: z.string().trim().min(2).max(1000),
    sessionId: z.string().max(80).optional(),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const budget = extractBudget(input.data.message);
  const retrieval = await retrieveProducts(input.data.message, budget);
  const advice = await composeAdvice(input.data.message, retrieval.products, retrieval.providerWarning);
  let sessionId = input.data.sessionId || `web-${randomUUID()}`;
  if (req.user) {
    const [existing] = input.data.sessionId
      ? await query('SELECT id FROM ai_conversations WHERE session_key = ? AND user_id = ?', [sessionId, req.user.id])
      : [];
    let conversationId = existing?.id;
    if (!conversationId) {
      const result = await query('INSERT INTO ai_conversations (user_id, session_key) VALUES (?, ?) RETURNING id', [req.user.id, sessionId]);
      conversationId = result.insertId;
    }
    await query('INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)', [conversationId, 'user', input.data.message]);
    await query(
      'INSERT INTO ai_messages (conversation_id, role, content, retrieved_product_ids) VALUES (?, ?, ?, ?)',
      [conversationId, 'assistant', advice.text, JSON.stringify(retrieval.products.map((item) => item.product_id))],
    );
  } else {
    sessionId = 'guest-session';
  }
  res.json({
    answer: advice.text,
    mode: advice.mode,
    method: retrieval.method,
    candidateCount: retrieval.candidateCount,
    providerWarning: advice.providerWarning || retrieval.providerWarning,
    sessionId,
    products: retrieval.products.map(({ product_id: id, name, price, image, flowerType, flowerCount, occasions, stock, score }) => ({
      id, name, price, image, detail: `${flowerType} · ${flowerCount}`, occasion: occasions, stock, score: Number(score.toFixed(3)),
    })),
  });
}));

app.get('/api/ai/history', requireAuth, asyncRoute(async (req, res) => {
  res.json(await query(
    `SELECT c.session_key AS "sessionId", m.role, m.content, m.retrieved_product_ids AS products, m.created_at AS "createdAt"
     FROM ai_conversations c JOIN ai_messages m ON m.conversation_id = c.id
     WHERE c.user_id = ? ORDER BY m.created_at DESC LIMIT 100`,
    [req.user.id],
  ));
}));

app.post('/api/ai/reindex', requireAdmin, asyncRoute(async (_req, res) => {
  const active = await query('SELECT id FROM products WHERE is_active = 1');
  for (const product of active) await indexProduct(product.id);
  res.json({ indexed: active.length });
}));

app.get('/api/staff/overview', requireStaff, asyncRoute(async (_req, res) => {
  const [summary] = await query(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE is_active = 1) AS "activeProducts",
       (SELECT COALESCE(SUM(stock), 0) FROM products WHERE is_active = 1) AS "totalStock",
       (SELECT COUNT(*) FROM products WHERE is_active = 1 AND stock <= 3) AS "lowStock",
       (SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'confirmed', 'preparing', 'shipping')) AS "activeOrders",
       (SELECT COUNT(*) FROM orders WHERE status = 'shipping') AS "shippingOrders"`,
  );
  res.json(summary);
}));

app.get('/api/staff/inventory', requireStaff, asyncRoute(async (req, res) => {
  const productsList = await query(
    `SELECT p.id, p.name, p.stock, p.price, p.image_url AS image,
      c.slug AS category, p.is_active AS "isActive", p.updated_at AS "updatedAt"
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = 1 AND (? = '' OR p.name LIKE ? OR p.id LIKE ? OR c.name LIKE ?)
     ORDER BY (p.stock <= 3) DESC, p.stock ASC, p.name`,
    [String(req.query.q || '').slice(0, 100), `%${String(req.query.q || '').slice(0, 100)}%`, `%${String(req.query.q || '').slice(0, 100)}%`, `%${String(req.query.q || '').slice(0, 100)}%`],
  );
  res.json(productsList);
}));

app.patch('/api/staff/inventory/:productId', requireStaff, asyncRoute(async (req, res) => {
  const input = z.object({
    stock: z.coerce.number().int().min(0).max(100000),
    note: z.string().trim().max(300).optional().default(''),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const result = await query('UPDATE products SET stock = ? WHERE id = ? AND is_active = 1', [input.data.stock, req.params.productId]);
  if (!result.affectedRows) return fail(res, 404, 'Không tìm thấy sản phẩm đang bán.');
  const [product] = await query('SELECT id, name, stock, updated_at AS "updatedAt" FROM products WHERE id = ?', [req.params.productId]);
  res.json({ ...product, note: input.data.note });
}));

app.post('/api/staff/inventory/:productId/add', requireStaff, asyncRoute(async (req, res) => {
  const input = z.object({
    quantity: z.coerce.number().int().min(1).max(100000),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);

  const result = await query(
    'UPDATE products SET stock = stock + ? WHERE id = ? AND is_active = 1 AND stock <= ?',
    [input.data.quantity, req.params.productId, 100000 - input.data.quantity],
  );
  if (!result.affectedRows) {
    const [product] = await query('SELECT id, stock FROM products WHERE id = ? AND is_active = 1', [req.params.productId]);
    if (!product) return fail(res, 404, 'Không tìm thấy sản phẩm đang bán.');
    return fail(res, 409, 'Số lượng nhập thêm vượt quá giới hạn tồn kho 100.000 bó.');
  }

  const [product] = await query('SELECT id, name, stock, updated_at AS "updatedAt" FROM products WHERE id = ?', [req.params.productId]);
  let indexingWarning;
  try {
    await indexProduct(product.id);
  } catch (error) {
    indexingWarning = 'Đã nhập hàng vào kho, nhưng chưa cập nhật được tài liệu tư vấn RAG.';
    console.error(`Added stock for ${product.id}, but RAG indexing failed:`, error);
  }
  res.json({ ...product, indexingWarning });
}));

app.post('/api/staff/products', requireStaff, asyncRoute(async (req, res) => {
  const input = productSchema.safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const [category] = await query('SELECT id FROM categories WHERE slug = ?', [input.data.category]);
  if (!category) return fail(res, 400, 'Danh mục không tồn tại.');
  const id = `custom-${randomUUID().slice(0, 12)}`;
  const item = input.data;
  await query(
    `INSERT INTO products
     (id, category_id, name, price, old_price, description, flower_type, flower_count, wrapping, color, occasions, image_url, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, category.id, item.name, item.price, item.oldPrice || null, item.description, item.flowerType, item.flowerCount, item.wrapping, item.color, item.occasion, item.image, item.stock],
  );
  let indexingWarning;
  try {
    await indexProduct(id);
  } catch (error) {
    indexingWarning = 'Đã tạo sản phẩm, nhưng chưa cập nhật được tài liệu tư vấn RAG.';
    console.error(`Created product ${id}, but RAG indexing failed:`, error);
  }
  res.status(201).json({ id, ...item, indexingWarning });
}));

app.get('/api/staff/orders', requireStaff, asyncRoute(async (_req, res) => {
  const orders = await query(
    `SELECT o.id, o.order_code AS "orderCode", o.recipient_name AS "recipientName", o.phone,
      o.delivery_address AS address, o.delivery_date AS "deliveryDate", o.card_message AS "cardMessage",
      o.subtotal, o.shipping_fee AS "shippingFee", o.total_amount AS total,
      o.payment_method AS "paymentMethod", o.payment_status AS "paymentStatus",
      o.payment_reported_at AS "paymentReportedAt", o.payment_confirmed_at AS "paymentConfirmedAt",
      o.payment_proof IS NOT NULL AS "hasPaymentProof",
      o.payment_proof_uploaded_at AS "paymentProofUploadedAt",
      u.full_name AS "paymentConfirmedBy",
      o.status, o.created_at AS "createdAt"
     FROM orders o
     LEFT JOIN users u ON u.id = o.payment_confirmed_by
     WHERE o.status NOT IN ('delivered', 'cancelled') OR o.updated_at::date = CURRENT_DATE
     ORDER BY o.created_at DESC
     LIMIT 250`,
  );
  for (const order of orders) {
    order.items = await query(
      'SELECT product_id AS "productId", product_name AS name, unit_price AS price, quantity FROM order_items WHERE order_id = ?',
      [order.id],
    );
    order.history = await query(
      `SELECT h.status, h.note, h.created_at AS "createdAt", u.full_name AS "updatedBy"
       FROM order_status_history h LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.order_id = ? ORDER BY h.created_at`,
      [order.id],
    );
  }
  res.json(orders);
}));

app.get('/api/staff/payments', requireStaff, asyncRoute(async (_req, res) => {
  res.json(await query(
    `SELECT o.id, o.order_code AS "orderCode", u.full_name AS "customerName", u.email AS "customerEmail",
      o.recipient_name AS "recipientName", o.phone, o.total_amount AS total,
      o.payment_status AS "paymentStatus", o.payment_reported_at AS "paymentReportedAt",
      o.payment_confirmed_at AS "paymentConfirmedAt", confirmer.full_name AS "paymentConfirmedBy",
      o.payment_proof IS NOT NULL AS "hasPaymentProof",
      o.payment_proof_uploaded_at AS "paymentProofUploadedAt",
      o.created_at AS "createdAt"
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN users confirmer ON confirmer.id = o.payment_confirmed_by
     WHERE o.payment_method = 'bank_transfer'
     ORDER BY (o.payment_status = 'pending_confirmation') DESC, o.created_at DESC
     LIMIT 500`,
  ));
}));

app.post('/api/payments/:id/confirm', requireStaff, asyncRoute(async (req, res) => {
  const result = await query(
    `UPDATE orders
     SET payment_status = 'paid', payment_confirmed_at = CURRENT_TIMESTAMP, payment_confirmed_by = ?
     WHERE id = ? AND payment_method = 'bank_transfer'
       AND payment_status = 'pending_confirmation' AND payment_reported_at IS NOT NULL`,
    [req.user.id, req.params.id],
  );
  if (!result.affectedRows) {
    const [order] = await query('SELECT payment_status AS "paymentStatus" FROM orders WHERE id = ? AND payment_method = ?', [req.params.id, 'bank_transfer']);
    if (!order) return fail(res, 404, 'Không tìm thấy đơn chuyển khoản.');
    return fail(res, 409, order.paymentStatus === 'paid'
      ? 'Khoản thanh toán đã được xác nhận trước đó.'
      : 'Khách chưa báo đã chuyển khoản hoặc đơn chưa chờ xác nhận.');
  }
  res.json({ id: Number(req.params.id), paymentStatus: 'paid', paymentConfirmedBy: req.user.fullName, paymentConfirmedAt: new Date() });
}));

app.patch('/api/staff/orders/:id/status', requireStaff, asyncRoute(async (req, res) => {
  const input = z.object({
    status: z.enum(['confirmed', 'preparing', 'shipping', 'delivered']),
    note: z.string().trim().max(500).optional().default(''),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT id, order_code, status FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    const order = rows[0];
    if (!order) {
      await connection.rollback();
      return fail(res, 404, 'Không tìm thấy đơn hàng.');
    }
    const nextStatus = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'shipping',
      shipping: 'delivered',
    }[order.status];
    if (nextStatus !== input.data.status) {
      await connection.rollback();
      return fail(res, 409, 'Trạng thái không theo đúng tiến trình. Cần cập nhật lần lượt: chờ xác nhận → đã xác nhận → đang chuẩn bị → đang giao → đã giao.');
    }
    const statusNotes = {
      confirmed: 'Nhân viên đã xác nhận tiếp nhận đơn.',
      preparing: 'Nhân viên đang chuẩn bị hoa.',
      shipping: 'Đơn hàng đã bàn giao cho người giao hoa.',
      delivered: 'Đơn hàng đã được giao đến người nhận.',
    };
    await connection.execute('UPDATE orders SET status = ? WHERE id = ?', [input.data.status, order.id]);
    await connection.execute(
      'INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)',
      [order.id, input.data.status, input.data.note || statusNotes[input.data.status], req.user.id],
    );
    await connection.commit();
    res.json({ id: order.id, orderCode: order.order_code, status: input.data.status });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/messages', requireAuth, asyncRoute(async (req, res) => {
  if (req.user.role !== 'customer') return fail(res, 403, 'Tin nhắn cửa hàng chỉ dành cho tài khoản khách hàng.');
  await query(
    'INSERT INTO customer_staff_conversations (user_id) VALUES (?) ON CONFLICT (user_id) DO UPDATE SET updated_at = customer_staff_conversations.updated_at',
    [req.user.id],
  );
  const [conversation] = await query('SELECT id FROM customer_staff_conversations WHERE user_id = ?', [req.user.id]);
  const messages = await query(
    `SELECT m.id, m.sender_role AS "senderRole", m.content, m.created_at AS "createdAt",
      u.full_name AS "senderName"
     FROM customer_staff_messages m LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ? ORDER BY m.created_at DESC, m.id DESC LIMIT 200`,
    [conversation.id],
  );
  res.json({ conversationId: conversation.id, messages: messages.reverse() });
}));

app.post('/api/messages', requireAuth, asyncRoute(async (req, res) => {
  if (req.user.role !== 'customer') return fail(res, 403, 'Tin nhắn cửa hàng chỉ dành cho tài khoản khách hàng.');
  const input = z.object({ content: z.string().trim().min(1).max(2000) }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  await query(
    'INSERT INTO customer_staff_conversations (user_id) VALUES (?) ON CONFLICT (user_id) DO UPDATE SET updated_at = customer_staff_conversations.updated_at',
    [req.user.id],
  );
  const [conversation] = await query('SELECT id FROM customer_staff_conversations WHERE user_id = ?', [req.user.id]);
  const result = await query(
    'INSERT INTO customer_staff_messages (conversation_id, sender_id, sender_role, content) VALUES (?, ?, ?, ?) RETURNING id',
    [conversation.id, req.user.id, 'customer', input.data.content],
  );
  await query('UPDATE customer_staff_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversation.id]);
  res.status(201).json({
    id: result.insertId, senderRole: 'customer', content: input.data.content,
    createdAt: new Date(), senderName: req.user.fullName,
  });
}));

app.get('/api/staff/conversations', requireStaff, asyncRoute(async (_req, res) => {
  res.json(await query(
    `SELECT c.id, c.user_id AS "userId", u.full_name AS "customerName", u.email AS "customerEmail",
      u.phone AS "customerPhone", c.updated_at AS "updatedAt",
      (SELECT m.content FROM customer_staff_messages m WHERE m.conversation_id = c.id
       ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS "lastMessage",
      (SELECT m.sender_role FROM customer_staff_messages m WHERE m.conversation_id = c.id
       ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS "lastSenderRole"
     FROM customer_staff_conversations c JOIN users u ON u.id = c.user_id
     ORDER BY c.updated_at DESC LIMIT 200`,
  ));
}));

app.get('/api/staff/conversations/:conversationId/messages', requireStaff, asyncRoute(async (req, res) => {
  const [conversation] = await query(
    'SELECT id FROM customer_staff_conversations WHERE id = ?',
    [req.params.conversationId],
  );
  if (!conversation) return fail(res, 404, 'Không tìm thấy cuộc trò chuyện.');
  const messages = await query(
    `SELECT m.id, m.sender_role AS "senderRole", m.content, m.created_at AS "createdAt",
      u.full_name AS "senderName"
     FROM customer_staff_messages m LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ? ORDER BY m.created_at DESC, m.id DESC LIMIT 200`,
    [conversation.id],
  );
  res.json(messages.reverse());
}));

app.post('/api/staff/conversations/:conversationId/messages', requireStaff, asyncRoute(async (req, res) => {
  const input = z.object({ content: z.string().trim().min(1).max(2000) }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const [conversation] = await query(
    'SELECT id FROM customer_staff_conversations WHERE id = ?',
    [req.params.conversationId],
  );
  if (!conversation) return fail(res, 404, 'Không tìm thấy cuộc trò chuyện.');
  const result = await query(
    'INSERT INTO customer_staff_messages (conversation_id, sender_id, sender_role, content) VALUES (?, ?, ?, ?) RETURNING id',
    [conversation.id, req.user.id, req.user.role, input.data.content],
  );
  await query('UPDATE customer_staff_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversation.id]);
  res.status(201).json({
    id: result.insertId, senderRole: req.user.role, content: input.data.content,
    createdAt: new Date(), senderName: req.user.fullName,
  });
}));

app.get('/api/admin/stats', requireAdmin, asyncRoute(async (_req, res) => {
  const [summary] = await query(
    `SELECT (SELECT COUNT(*) FROM orders) AS "totalOrders",
      (SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE) AS "todayOrders",
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status <> 'cancelled' AND payment_status = 'paid') AS "confirmedRevenue",
      (SELECT COALESCE(SUM(stock), 0) FROM products WHERE is_active = 1) AS "totalStock",
      (SELECT COUNT(*) FROM products WHERE stock BETWEEN 1 AND 3 AND is_active = 1) AS "lowStock"`,
  );
  summary.bestSellers = await query(
    `SELECT oi.product_name AS name, SUM(oi.quantity) AS quantity
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.status <> 'cancelled' GROUP BY oi.product_id, oi.product_name
     ORDER BY quantity DESC LIMIT 5`,
  );
  const confirmedOrders = "status <> 'cancelled' AND payment_status = 'paid'";
  summary.dailyRevenue = await query(
    `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS period, SUM(total_amount) AS revenue
     FROM orders
     WHERE ${confirmedOrders}
       AND created_at >= CURRENT_DATE - INTERVAL '13 days'
       AND created_at < CURRENT_DATE + INTERVAL '1 day'
     GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') ORDER BY period`,
  );
  summary.monthlyRevenue = await query(
    `SELECT TO_CHAR(created_at, 'YYYY-MM') AS period, SUM(total_amount) AS revenue
     FROM orders
     WHERE ${confirmedOrders}
       AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
       AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
     GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY period`,
  );
  summary.yearlyRevenue = await query(
    `SELECT TO_CHAR(created_at, 'YYYY') AS period, SUM(total_amount) AS revenue
     FROM orders
     WHERE ${confirmedOrders}
       AND created_at >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '4 years'
       AND created_at < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
     GROUP BY TO_CHAR(created_at, 'YYYY') ORDER BY period`,
  );
  summary.recentOrders = await query(`${orderSelect} FROM orders o ORDER BY o.created_at DESC LIMIT 8`);
  res.json(summary);
}));

app.get('/api/admin/products', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await query(
    `SELECT p.id, c.slug AS category, p.name, p.price, p.old_price AS "oldPrice",
     p.description, p.flower_type AS "flowerType", p.flower_count AS "flowerCount",
     p.wrapping, p.color, p.occasions AS occasion, p.image_url AS image, p.stock, p.is_active AS "isActive"
     FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.created_at DESC`,
  ));
}));

app.get('/api/admin/inventory', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await query(
    `SELECT p.id, p.name, p.price, p.stock, p.image_url AS image,
      p.updated_at AS "updatedAt", c.slug AS category
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = 1
     ORDER BY (p.stock <= 3) DESC, p.stock ASC, p.name`,
  ));
}));

app.patch('/api/admin/inventory/:productId', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({ stock: z.coerce.number().int().min(0).max(100000) }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const [existing] = await query('SELECT id FROM products WHERE id = ? AND is_active = 1', [req.params.productId]);
  if (!existing) return fail(res, 404, 'Không tìm thấy sản phẩm đang bán.');
  const result = await query(
    'UPDATE products SET stock = ? WHERE id = ? AND is_active = 1',
    [input.data.stock, req.params.productId],
  );
  await indexProduct(req.params.productId);
  const [product] = await query(
    'SELECT id, name, stock, updated_at AS "updatedAt" FROM products WHERE id = ?',
    [req.params.productId],
  );
  res.json(product);
}));

app.post('/api/admin/inventory/:productId/add', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({
    quantity: z.coerce.number().int().min(1).max(100000),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const result = await query(
    'UPDATE products SET stock = stock + ? WHERE id = ? AND is_active = 1 AND stock <= ?',
    [input.data.quantity, req.params.productId, 100000 - input.data.quantity],
  );
  if (!result.affectedRows) {
    const [product] = await query('SELECT id FROM products WHERE id = ? AND is_active = 1', [req.params.productId]);
    if (!product) return fail(res, 404, 'Không tìm thấy sản phẩm đang bán.');
    return fail(res, 409, 'Số lượng nhập thêm vượt quá giới hạn tồn kho 100.000 bó.');
  }
  const [product] = await query('SELECT id, name, stock, updated_at AS "updatedAt" FROM products WHERE id = ?', [req.params.productId]);
  let indexingWarning;
  try {
    await indexProduct(req.params.productId);
  } catch (error) {
    indexingWarning = 'Đã nhập hàng vào kho, nhưng chưa cập nhật được tài liệu tư vấn RAG.';
    console.error(`Added stock for ${product.id}, but RAG indexing failed:`, error);
  }
  res.json({ ...product, indexingWarning });
}));

app.get('/api/admin/stock-receipts', requireAdmin, asyncRoute(async (_req, res) => {
  const receipts = await query(
    `SELECT r.id, r.receipt_code AS "receiptCode", r.supplier_name AS "supplierName",
      r.note, r.total_cost AS "totalCost", r.status, r.received_at AS "receivedAt",
      r.created_at AS "createdAt",
      u.full_name AS "receivedBy"
     FROM stock_receipts r LEFT JOIN users u ON u.id = r.received_by
     ORDER BY r.created_at DESC LIMIT 100`,
  );
  for (const receipt of receipts) {
    receipt.items = await query(
      `SELECT product_id AS "productId", product_name AS "productName",
        quantity, unit_cost AS "unitCost", line_total AS "lineTotal"
       FROM stock_receipt_items WHERE receipt_id = ? ORDER BY id`,
      [receipt.id],
    );
  }
  res.json(receipts);
}));

app.post('/api/admin/stock-receipts', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({
    productId: z.string().trim().min(2).max(40),
    quantity: z.coerce.number().int().min(1).max(100000),
    unitCost: z.coerce.number().int().min(0).max(100000000),
    supplierName: z.string().trim().min(2).max(160),
    note: z.string().trim().max(500).optional().default(''),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);

  const connection = await getPool().getConnection();
  let receipt;
  try {
    await connection.beginTransaction();
    const [productsFound] = await connection.execute(
      'SELECT id, name, stock FROM products WHERE id = ? AND is_active = 1 FOR UPDATE',
      [input.data.productId],
    );
    const product = productsFound[0];
    if (!product) {
      await connection.rollback();
      return fail(res, 404, 'Không tìm thấy sản phẩm đang bán để nhập kho.');
    }
    if (product.stock + input.data.quantity > 100000) {
      await connection.rollback();
      return fail(res, 400, 'Số lượng tồn sau khi nhập không được vượt quá 100.000.');
    }
    const receiptCode = `PN-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const lineTotal = input.data.quantity * input.data.unitCost;
    const [insertReceipt] = await connection.execute(
      `INSERT INTO stock_receipts (receipt_code, supplier_name, note, total_cost, status, received_by)
       VALUES (?, ?, ?, ?, 'in_transit', ?) RETURNING id`,
      [receiptCode, input.data.supplierName, input.data.note || null, lineTotal, req.user.id],
    );
    await connection.execute(
      `INSERT INTO stock_receipt_items
       (receipt_id, product_id, product_name, quantity, unit_cost, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [insertReceipt.insertId, product.id, product.name, input.data.quantity, input.data.unitCost, lineTotal],
    );
    await connection.commit();
    receipt = { id: insertReceipt.insertId, receiptCode, productId: product.id, productName: product.name, quantity: input.data.quantity, unitCost: input.data.unitCost, totalCost: lineTotal, supplierName: input.data.supplierName, status: 'in_transit' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  res.status(201).json(receipt);
}));

app.post('/api/admin/stock-receipts/:receiptId/receive', requireAdmin, asyncRoute(async (req, res) => {
  const connection = await getPool().getConnection();
  let receipt;
  let productIds = [];
  try {
    await connection.beginTransaction();
    const [receipts] = await connection.execute(
      'SELECT id, receipt_code, status FROM stock_receipts WHERE id = ? FOR UPDATE',
      [req.params.receiptId],
    );
    const currentReceipt = receipts[0];
    if (!currentReceipt) {
      await connection.rollback();
      return fail(res, 404, 'Không tìm thấy phiếu nhập.');
    }
    if (currentReceipt.status !== 'in_transit') {
      await connection.rollback();
      return fail(res, 409, currentReceipt.status === 'received'
        ? 'Phiếu nhập này đã được xác nhận hàng về.'
        : 'Phiếu nhập đã bị hủy và không thể xác nhận hàng về.');
    }
    const [items] = await connection.execute(
      `SELECT i.product_id AS "productId", i.product_name AS "productName", i.quantity,
        p.stock AS "currentStock"
       FROM stock_receipt_items i JOIN products p ON p.id = i.product_id
       WHERE i.receipt_id = ? FOR UPDATE`,
      [currentReceipt.id],
    );
    if (!items.length) {
      await connection.rollback();
      return fail(res, 409, 'Phiếu nhập không có mặt hàng để cộng vào kho.');
    }
    for (const item of items) {
      if (Number(item.currentStock) + Number(item.quantity) > 100000) {
        await connection.rollback();
        return fail(res, 409, `Không thể nhận ${item.productName}: tồn kho sau khi cộng sẽ vượt quá 100.000.`);
      }
      await connection.execute(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.productId],
      );
      productIds.push(item.productId);
    }
    await connection.execute(
      "UPDATE stock_receipts SET status = 'received', received_at = CURRENT_TIMESTAMP WHERE id = ?",
      [currentReceipt.id],
    );
    await connection.commit();
    receipt = { id: currentReceipt.id, receiptCode: currentReceipt.receipt_code, status: 'received', productIds };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  let indexingWarning;
  try {
    for (const productId of productIds) await indexProduct(productId);
  } catch (error) {
    indexingWarning = 'Đã cộng số lượng vào kho, nhưng chưa cập nhật được tài liệu tư vấn RAG.';
    console.error(`Received stock receipt ${receipt.receiptCode}, but RAG indexing failed:`, error);
  }
  res.json({ ...receipt, indexingWarning });
}));

app.get('/api/admin/categories', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await query(
    `SELECT c.id, c.slug, c.name, c.description, COUNT(p.id) AS "productCount"
     FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
     GROUP BY c.id ORDER BY c.name`,
  ));
}));

app.post('/api/admin/categories', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({
    slug: z.string().trim().regex(/^[a-z0-9-]{2,60}$/),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional().default(''),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const result = await query('INSERT INTO categories (slug, name, description) VALUES (?, ?, ?) RETURNING id', [input.data.slug, input.data.name, input.data.description]);
  res.status(201).json({ id: result.insertId, ...input.data });
}));

app.put('/api/admin/categories/:slug', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional().default(''),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const result = await query('UPDATE categories SET name = ?, description = ? WHERE slug = ?', [input.data.name, input.data.description, req.params.slug]);
  if (!result.affectedRows) return fail(res, 404, 'Không tìm thấy danh mục.');
  res.json({ slug: req.params.slug, ...input.data });
}));

app.delete('/api/admin/categories/:slug', requireAdmin, asyncRoute(async (req, res) => {
  const [category] = await query(
    'SELECT id FROM categories WHERE slug = ?',
    [req.params.slug],
  );
  if (!category) return fail(res, 404, 'Không tìm thấy danh mục.');
  await query('DELETE FROM categories WHERE id = ?', [category.id]);
  res.status(204).end();
}));

const productSchema = z.object({
  id: z.string().trim().min(2).max(40).optional(),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(60),
  price: z.coerce.number().int().min(0).max(100000000),
  oldPrice: z.coerce.number().int().min(0).max(100000000).nullable().optional(),
  description: z.string().trim().min(3).max(10000),
  flowerType: z.string().trim().min(1).max(200),
  flowerCount: z.string().trim().min(1).max(120),
  wrapping: z.string().trim().min(1).max(200),
  color: z.string().trim().min(1).max(120),
  occasion: z.string().trim().min(2).max(300),
  image: z.string().trim().max(1000).refine((value) => {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return /^\/flowers\/[A-Za-z0-9._/-]+$/.test(value) && !value.split('/').includes('..');
    }
  }, 'Đường dẫn ảnh phải là URL http(s) hoặc đường dẫn /flowers/ hợp lệ.'),
  stock: z.coerce.number().int().min(0).max(100000),
});

app.post('/api/admin/products', requireAdmin, asyncRoute(async (req, res) => {
  const input = productSchema.safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const id = input.data.id || `custom-${randomUUID().slice(0, 12)}`;
  const [category] = await query('SELECT id FROM categories WHERE slug = ?', [input.data.category]);
  if (!category) return fail(res, 400, 'Danh mục không tồn tại.');
  const item = input.data;
  await query(
    `INSERT INTO products
     (id, category_id, name, price, old_price, description, flower_type, flower_count, wrapping, color, occasions, image_url, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, category.id, item.name, item.price, item.oldPrice || null, item.description, item.flowerType, item.flowerCount, item.wrapping, item.color, item.occasion, item.image, item.stock],
  );
  await indexProduct(id);
  res.status(201).json({ id, ...item });
}));

app.put('/api/admin/products/:id', requireAdmin, asyncRoute(async (req, res) => {
  const input = productSchema.omit({ id: true }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const [category] = await query('SELECT id FROM categories WHERE slug = ?', [input.data.category]);
  if (!category) return fail(res, 400, 'Danh mục không tồn tại.');
  const item = input.data;
  const result = await query(
    `UPDATE products SET category_id = ?, name = ?, price = ?, old_price = ?, description = ?,
     flower_type = ?, flower_count = ?, wrapping = ?, color = ?, occasions = ?, image_url = ?, stock = ?
     WHERE id = ?`,
    [category.id, item.name, item.price, item.oldPrice || null, item.description, item.flowerType, item.flowerCount, item.wrapping, item.color, item.occasion, item.image, item.stock, req.params.id],
  );
  if (!result.affectedRows) return fail(res, 404, 'Không tìm thấy sản phẩm.');
  await indexProduct(req.params.id);
  res.json({ id: req.params.id, ...item });
}));

app.patch('/api/admin/products/:id/restore', requireAdmin, asyncRoute(async (req, res) => {
  const result = await query('UPDATE products SET is_active = 1 WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return fail(res, 404, 'Không tìm thấy sản phẩm.');
  await indexProduct(req.params.id);
  res.json({ id: req.params.id, isActive: 1 });
}));

app.delete('/api/admin/products/:id', requireAdmin, asyncRoute(async (req, res) => {
  if (req.query.hard === 'true') {
    try {
      const result = await query('DELETE FROM products WHERE id = ?', [req.params.id]);
      if (!result.affectedRows) return fail(res, 404, 'Không tìm thấy sản phẩm.');
      return res.status(204).end();
    } catch {
      // Fall back to soft delete if referenced by stock receipts
    }
  }
  const result = await query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return fail(res, 404, 'Không tìm thấy sản phẩm.');
  await indexProduct(req.params.id);
  res.status(204).end();
}));

app.get('/api/admin/orders', requireAdmin, asyncRoute(async (_req, res) => {
  const orders = await query(
    `${orderSelect}, u.full_name AS "customerName", u.email AS "customerEmail"
     FROM orders o LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 250`,
  );
  for (const order of orders) {
    order.items = await query('SELECT product_name AS name, unit_price AS price, quantity FROM order_items WHERE order_id = ?', [order.id]);
    order.history = await query('SELECT status, note, created_at AS "createdAt" FROM order_status_history WHERE order_id = ? ORDER BY created_at', [order.id]);
  }
  res.json(orders);
}));

app.get('/api/admin/payments', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await query(
    `SELECT o.id, o.order_code AS "orderCode", u.full_name AS "customerName", u.email AS "customerEmail",
      o.recipient_name AS "recipientName", o.phone, o.total_amount AS total,
      o.payment_status AS "paymentStatus", o.payment_reported_at AS "paymentReportedAt",
      o.payment_confirmed_at AS "paymentConfirmedAt", confirmer.full_name AS "paymentConfirmedBy",
      o.payment_proof IS NOT NULL AS "hasPaymentProof",
      o.payment_proof_uploaded_at AS "paymentProofUploadedAt",
      o.created_at AS "createdAt"
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN users confirmer ON confirmer.id = o.payment_confirmed_by
     WHERE o.payment_method = 'bank_transfer'
     ORDER BY (o.payment_status = 'pending_confirmation') DESC, o.created_at DESC
     LIMIT 500`,
  ));
}));

app.patch('/api/admin/orders/:id/status', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({
    status: z.enum(['confirmed', 'preparing', 'shipping', 'delivered', 'cancelled']),
    note: z.string().trim().max(500).optional(),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!rows[0]) {
      await connection.rollback();
      return fail(res, 404, 'Không tìm thấy đơn hàng.');
    }
    if (['delivered', 'cancelled'].includes(rows[0].status)) {
      await connection.rollback();
      return fail(res, 409, 'Đơn hàng đã kết thúc, không thể đổi trạng thái.');
    }
    if (input.data.status === 'cancelled') {
      const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [req.params.id]);
      for (const item of items) if (item.product_id) await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    await connection.execute('UPDATE orders SET status = ? WHERE id = ?', [input.data.status, req.params.id]);
    await connection.execute(
      'INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?, ?, ?, ?)',
      [req.params.id, input.data.status, input.data.note || null, req.user.id],
    );
    await connection.commit();
    res.json({ id: Number(req.params.id), status: input.data.status });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.patch('/api/admin/orders/:id/payment', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({ paymentStatus: z.literal('paid') }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const result = await query(
    `UPDATE orders
     SET payment_status = 'paid', payment_confirmed_at = CURRENT_TIMESTAMP, payment_confirmed_by = ?
     WHERE id = ? AND payment_method = 'bank_transfer'
       AND payment_status = 'pending_confirmation' AND payment_reported_at IS NOT NULL`,
    [req.user.id, req.params.id],
  );
  if (!result.affectedRows) return fail(res, 409, 'Chỉ xác nhận được khoản chuyển khoản khách đã báo và đang chờ cửa hàng kiểm tra.');
  res.json({ id: Number(req.params.id), paymentStatus: 'paid', paymentConfirmedBy: req.user.fullName });
}));

app.get('/api/admin/customers', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await query(
    `SELECT u.id, u.full_name AS "fullName", u.email, u.phone, u.address, u.created_at AS "createdAt",
     COUNT(o.id) AS "orderCount", COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS "lifetimeValue"
     FROM users u LEFT JOIN orders o ON o.user_id = u.id WHERE u.role = 'customer'
     GROUP BY u.id ORDER BY u.created_at DESC LIMIT 250`,
  ));
}));

app.get('/api/admin/staff', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await query(
    `SELECT id, full_name AS "fullName", email, phone, created_at AS "createdAt"
     FROM users WHERE role = 'staff' ORDER BY created_at DESC`,
  ));
}));

app.post('/api/admin/staff', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(190),
    password: z.string().min(12).max(100),
    phone: z.string().trim().max(30).optional().default(''),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const email = input.data.email.toLowerCase();
  if ((await query('SELECT id FROM users WHERE email = ?', [email])).length) return fail(res, 409, 'Email này đã được sử dụng.');
  const passwordHash = await bcrypt.hash(input.data.password, 12);
  const result = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, 'staff') RETURNING id`,
    [input.data.fullName, email, input.data.phone || null, passwordHash],
  );
  res.status(201).json({ id: result.insertId, fullName: input.data.fullName, email, phone: input.data.phone });
}));

app.put('/api/admin/staff/:id', requireAdmin, asyncRoute(async (req, res) => {
  const input = z.object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(30).optional().default(''),
    password: z.string().min(12).max(100).optional(),
  }).safeParse(req.body);
  if (!input.success) return fail(res, 400, input.error.issues[0].message);
  const [existing] = await query("SELECT id FROM users WHERE id = ? AND role = 'staff'", [req.params.id]);
  if (!existing) return fail(res, 404, 'Không tìm thấy tài khoản nhân viên.');
  if (input.data.password) {
    await query(
      "UPDATE users SET full_name = ?, phone = ?, password_hash = ? WHERE id = ? AND role = 'staff'",
      [input.data.fullName, input.data.phone || null, await bcrypt.hash(input.data.password, 12), req.params.id],
    );
  } else {
    await query(
      "UPDATE users SET full_name = ?, phone = ? WHERE id = ? AND role = 'staff'",
      [input.data.fullName, input.data.phone || null, req.params.id],
    );
  }
  res.json({ id: Number(req.params.id), ...input.data, password: undefined });
}));

app.delete('/api/admin/staff/:id', requireAdmin, asyncRoute(async (req, res) => {
  const result = await query("DELETE FROM users WHERE id = ? AND role = 'staff'", [req.params.id]);
  if (!result.affectedRows) return fail(res, 404, 'Không tìm thấy tài khoản nhân viên.');
  res.status(204).end();
}));

app.get('/api/admin/ai-history', requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await query(
    `SELECT u.full_name AS "customerName", u.email, c.session_key AS "sessionId",
      m.role, m.content, m.retrieved_product_ids AS "retrievedProducts", m.created_at AS "createdAt"
     FROM ai_messages m JOIN ai_conversations c ON c.id = m.conversation_id
     LEFT JOIN users u ON u.id = c.user_id
     ORDER BY m.created_at DESC LIMIT 200`,
  ));
}));

app.use((req, res) => res.status(404).json({ error: `Không tìm thấy API ${req.method} ${req.path}` }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues[0].message });
  if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') return res.status(409).json({ error: 'Thông tin này đã tồn tại.' });
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  const message = process.env.NODE_ENV === 'production'
    ? 'Máy chủ gặp lỗi. Vui lòng thử lại sau.'
    : `Máy chủ gặp lỗi: ${error.message}`;
  res.status(500).json({ error: message });
});

async function ensureOrderSchema() {
  const columns = await query(
    `SELECT column_name AS "COLUMN_NAME" FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'orders'`,
  );
  if (!columns.length) throw new Error('Không tìm thấy bảng orders; hãy khởi tạo database bằng npm run db:seed hoặc chạy server/schema.sql trên Supabase.');
  const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
  const migrations = [
    ['payment_reported_at', 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reported_at TIMESTAMPTZ NULL'],
    ['payment_confirmed_at', 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ NULL'],
    ['payment_confirmed_by', 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_by BIGINT NULL'],
    ['payment_proof', 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof BYTEA NULL'],
    ['payment_proof_mime', 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_mime VARCHAR(50) NULL'],
    ['payment_proof_uploaded_at', 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ NULL'],
    ['guest_order_token_hash', 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_order_token_hash CHAR(64) NULL'],
  ];

  for (const [column, statement] of migrations) {
    if (!existingColumns.has(column)) await query(statement);
  }
}

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 3001);
  await ensureOrderSchema();
  app.listen(port, () => console.log(`Mộc Miên API listening on http://localhost:${port}`));
}

export default app;
