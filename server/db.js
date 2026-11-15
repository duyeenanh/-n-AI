import pg from 'pg';

const { Pool, types } = pg;

// Parse BIGINT (int8) and NUMERIC/DECIMAL as JS numbers to match previous mysql2 behavior.
types.setTypeParser(20, (val) => (val === null ? null : Number(val)));
types.setTypeParser(1700, (val) => (val === null ? null : Number(val)));

let pool;

function buildPoolConfig() {
  const connectionString = process.env.DATABASE_URL?.trim();
  const useSsl = process.env.DB_SSL === 'true'
    || (connectionString && !/localhost|127\.0\.0\.1/i.test(connectionString) && !/sslmode=disable/i.test(connectionString));

  if (connectionString) {
    return {
      connectionString,
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    };
  }

  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'moc_mien',
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

/**
 * Converts MySQL-style `?` placeholders outside single-quoted string literals
 * to PostgreSQL `$1, $2, ...` placeholders.
 */
function convertPlaceholders(sql) {
  let index = 0;
  let inSingleQuote = false;
  let result = '';
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "'" && sql[i - 1] !== '\\') {
      if (inSingleQuote && sql[i + 1] === "'") {
        result += "''";
        i += 1;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      result += ch;
    } else if (ch === '?' && !inSingleQuote) {
      index += 1;
      result += `$${index}`;
    } else {
      result += ch;
    }
  }
  return result;
}

function formatResult(sql, pgResult) {
  const isRead = /^\s*(SELECT|WITH|SHOW)\b/i.test(sql);
  if (isRead) return pgResult.rows;
  return {
    affectedRows: pgResult.rowCount ?? 0,
    insertId: pgResult.rows?.[0]?.id ?? null,
    rows: pgResult.rows,
  };
}

export function getPool() {
  if (!pool) {
    const basePool = new Pool(buildPoolConfig());
    pool = {
      query: (sql, values = []) => basePool.query(convertPlaceholders(sql), values),
      end: () => basePool.end(),
      async getConnection() {
        const client = await basePool.connect();
        return {
          async execute(sql, values = []) {
            const pgResult = await client.query(convertPlaceholders(sql), values);
            return [formatResult(sql, pgResult)];
          },
          async query(sql, values = []) {
            const pgResult = await client.query(convertPlaceholders(sql), values);
            return [formatResult(sql, pgResult)];
          },
          beginTransaction: () => client.query('BEGIN'),
          commit: () => client.query('COMMIT'),
          rollback: () => client.query('ROLLBACK'),
          release: () => client.release(),
        };
      },
    };
  }
  return pool;
}

export async function query(sql, values = []) {
  const pgResult = await getPool().query(sql, values);
  return formatResult(sql, pgResult);
}
