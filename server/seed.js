import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { products } from '../src/data/products.js';
import { getPool, query } from './db.js';
import { indexProduct } from './rag.js';

const categoryNames = {
  roses: 'Hoa hồng',
  bouquets: 'Bó hoa',
  tulips: 'Tulip',
  lilies: 'Hoa ly',
  occasion: 'Chậu & dịp đặc biệt',
  graduation: 'Hoa tốt nghiệp',
};

try {
  const pool = getPool();
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);

  for (const [slug, name] of Object.entries(categoryNames)) {
    await query(
      'INSERT INTO categories (slug, name) VALUES (?, ?) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name',
      [slug, name],
    );
  }

  for (const product of products) {
    const [category] = await query('SELECT id FROM categories WHERE slug = ?', [product.category]);
    await query(
      `INSERT INTO products
        (id, category_id, name, price, old_price, description, flower_type, flower_count,
         wrapping, color, occasions, image_url, stock, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 12, 1)
       ON CONFLICT (id) DO UPDATE SET
         category_id = EXCLUDED.category_id,
         name = EXCLUDED.name,
         price = EXCLUDED.price,
         old_price = EXCLUDED.old_price,
         description = EXCLUDED.description,
         flower_type = EXCLUDED.flower_type,
         flower_count = EXCLUDED.flower_count,
         occasions = EXCLUDED.occasions,
         image_url = EXCLUDED.image_url,
         is_active = 1`,
      [
        product.id, category?.id || null, product.name, product.price, product.oldPrice || null,
        `${product.name} là bó hoa tươi được tuyển chọn và gói thủ công tại Mộc Miên.`,
        product.detail.split('·')[0].trim(), product.detail.split('·').slice(1).join('·').trim() || 'Bó hoa theo thiết kế',
        'Giấy gói thủ công Mộc Miên', 'Theo hình ảnh', product.occasion,
        product.image.startsWith('/') ? product.image : `https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=700&q=85`,
      ],
    );
    try {
      await indexProduct(product.id);
    } catch (error) {
      console.warn(`RAG embedding skipped for ${product.id}: ${error.message}`);
    }
  }

  if (process.argv.includes('--catalog-only')) {
    await pool.end();
    console.log(`Catalog sync complete: ${products.length} flower products.`);
  } else {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mocmien.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const adminName = process.env.ADMIN_NAME || 'Admin';
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await query(
      `INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, role = 'admin'`,
      [adminName, adminEmail.toLowerCase(), passwordHash],
    );
    const configuredStaff = [1, 2, 3].map((number) => ({
      name: process.env[`STAFF_${number}_NAME`]?.trim(),
      email: process.env[`STAFF_${number}_EMAIL`]?.trim().toLowerCase(),
      password: process.env[`STAFF_${number}_PASSWORD`],
      prefix: `STAFF_${number}`,
    }));
    const legacyStaff = {
      name: process.env.STAFF_NAME?.trim(),
      email: process.env.STAFF_EMAIL?.trim().toLowerCase(),
      password: process.env.STAFF_PASSWORD,
      prefix: 'STAFF',
    };
    const staffAccounts = [...configuredStaff, legacyStaff].filter(({ name, email, password }) => name || email || password);
    const staffEmails = new Set();
    for (const staff of staffAccounts) {
      const { name, email, password, prefix } = staff;
      if (!name || !email || !password) throw new Error(`${prefix}_NAME, ${prefix}_EMAIL and ${prefix}_PASSWORD must all be provided.`);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`${prefix}_EMAIL must be a valid email address.`);
      if (password.length < 12) console.warn(`${prefix}_PASSWORD is shorter than the recommended 12 characters.`);
      if (staffEmails.has(email)) throw new Error(`Duplicate staff email configured: ${email}`);
      staffEmails.add(email);
      const staffHash = await bcrypt.hash(password, 12);
      await query(
        `INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'staff')
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, role = 'staff'`,
        [name, email, staffHash],
      );
      console.log(`Provisioned staff account ${email}`);
    }

    console.log(`Seed complete: ${products.length} flower products and admin ${adminEmail}`);
    if (adminPassword === 'ChangeMe123!') console.warn('ADMIN PASSWORD IS NOT SAFE FOR PUBLIC DEPLOYMENT. Change ADMIN_PASSWORD.');
    await pool.end();
  }
} catch (error) {
  console.error('Database seeding failed:', error.message);
  process.exitCode = 1;
}
