import jwt from 'jsonwebtoken';
import { query } from './db.js';

const jwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'replace-with-a-long-random-secret') {
    throw new Error('JWT_SECRET must be set to a private random value.');
  }
  return secret;
};

export function createToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, jwtSecret(), { expiresIn: '7d' });
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (token) {
      const payload = jwt.verify(token, jwtSecret());
      const [user] = await query(
        'SELECT id, full_name AS "fullName", email, phone, address, role FROM users WHERE id = ?',
        [payload.sub],
      );
      if (user) req.user = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng quản trị.' });
  }
  next();
}

export function requireStaff(req, res, next) {
  if (!req.user || !['staff', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Chức năng này chỉ dành cho nhân viên cửa hàng.' });
  }
  next();
}
