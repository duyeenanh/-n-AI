CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  address VARCHAR(500) NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  category_id BIGINT NULL REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(160) NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  old_price INTEGER NULL CHECK (old_price IS NULL OR old_price >= 0),
  description TEXT NOT NULL,
  flower_type VARCHAR(200) NOT NULL,
  flower_count VARCHAR(120) NOT NULL,
  wrapping VARCHAR(200) NOT NULL DEFAULT 'Giấy gói thủ công Mộc Miên',
  color VARCHAR(120) NOT NULL DEFAULT 'Theo hình ảnh',
  occasions VARCHAR(300) NOT NULL,
  image_url VARCHAR(1000) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 10 CHECK (stock >= 0),
  is_active SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active);

CREATE TABLE IF NOT EXISTS stock_receipts (
  id BIGSERIAL PRIMARY KEY,
  receipt_code VARCHAR(32) NOT NULL UNIQUE,
  supplier_name VARCHAR(160) NOT NULL,
  note VARCHAR(500) NULL,
  total_cost BIGINT NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('in_transit', 'received', 'cancelled')),
  received_at TIMESTAMPTZ NULL,
  received_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_created ON stock_receipts (created_at);

CREATE TABLE IF NOT EXISTS stock_receipt_items (
  id BIGSERIAL PRIMARY KEY,
  receipt_id BIGINT NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
  product_id VARCHAR(40) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name VARCHAR(160) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  unit_cost INTEGER NOT NULL CHECK (unit_cost >= 0),
  line_total BIGINT NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS customer_staff_conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_staff_conversations_updated ON customer_staff_conversations (updated_at);

CREATE TABLE IF NOT EXISTS customer_staff_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES customer_staff_conversations(id) ON DELETE CASCADE,
  sender_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'staff', 'admin')),
  content VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_staff_messages_conversation_created ON customer_staff_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS favorites (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id VARCHAR(40) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_code VARCHAR(32) NOT NULL UNIQUE,
  user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  recipient_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  delivery_address VARCHAR(500) NOT NULL,
  delivery_date DATE NOT NULL,
  card_message VARCHAR(1000) NULL,
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  shipping_fee INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'bank_transfer')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending_confirmation', 'paid')),
  payment_reported_at TIMESTAMPTZ NULL,
  payment_confirmed_at TIMESTAMPTZ NULL,
  payment_confirmed_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  payment_proof BYTEA NULL,
  payment_proof_mime VARCHAR(50) NULL,
  payment_proof_uploaded_at TIMESTAMPTZ NULL,
  guest_order_token_hash CHAR(64) NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(40) NULL REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(160) NOT NULL,
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  line_total INTEGER NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  order_item_id BIGINT NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5 AND rating * 2 = FLOOR(rating * 2)),
  comment VARCHAR(1000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL,
  note VARCHAR(500) NULL,
  changed_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  session_key VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session ON ai_conversations (session_key);

CREATE TABLE IF NOT EXISTS ai_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  retrieved_product_ids JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rag_documents (
  id BIGSERIAL PRIMARY KEY,
  product_id VARCHAR(40) NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding JSONB NULL,
  embedding_model VARCHAR(120) NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customer_staff_conversations_updated_at ON customer_staff_conversations;
CREATE TRIGGER trg_customer_staff_conversations_updated_at BEFORE UPDATE ON customer_staff_conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews;
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
