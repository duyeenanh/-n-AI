import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBudget } from '../server/ai-budget.js';
import { checkAiProvider, composeAdvice, rankProducts } from '../server/rag.js';

const cases = [
  ['Tặng mẹ, ngân sách 500k', 500000],
  ['Ngân sách tối đa 500 nghìn', 500000],
  ['Tầm 1,5 triệu', 1500000],
  ['Hoa giá 500.000đ', 500000],
  ['Hoa 10 cành tặng mẹ', null],
  ['Từ 300k đến 500k', 500000],
  ['Tặng mẹ ngân sách 100k', 100000],
  ['Tặng bó hoa 500000', 500000],
  ['Khoảng 250 ngàn đồng', 250000],
  ['Hoa dưới 2 tr', 2000000],
];

for (const [message, expected] of cases) {
  test(`extracts budget ${expected ?? 'as absent'} from "${message}"`, () => {
    assert.equal(extractBudget(message), expected);
  });
}

test('ranks relevant products while enforcing price and stock constraints', () => {
  const documents = [
    { product_id: 'pink-tulip', content: 'Tên: Hoa tulip hồng. Dịp phù hợp: Sinh nhật.', price: 450000, stock: 3 },
    { product_id: 'yellow-rose', content: 'Tên: Hoa hồng vàng. Dịp phù hợp: Tốt nghiệp.', price: 200000, stock: 4 },
    { product_id: 'sold-out-tulip', content: 'Tên: Hoa tulip hồng. Dịp phù hợp: Sinh nhật.', price: 250000, stock: 0 },
    { product_id: 'over-budget-tulip', content: 'Tên: Hoa tulip hồng. Dịp phù hợp: Sinh nhật.', price: 750000, stock: 2 },
  ];

  const result = rankProducts('Hoa tulip hồng sinh nhật', 500000, documents);

  assert.equal(result.method, 'tfidf-cosine');
  assert.equal(result.products[0].product_id, 'pink-tulip');
  assert.ok(result.products.every((product) => product.stock > 0 && product.price <= 500000));
  assert.ok(result.products.every((product) => product.product_id !== 'sold-out-tulip'));
  assert.ok(result.products.every((product) => product.product_id !== 'over-budget-tulip'));
});

test('does not return products for a query with no relevant terms', () => {
  const documents = [
    { product_id: 'rose', content: 'Tên: Hoa hồng đỏ. Dịp phù hợp: Tỏ tình.', price: 300000, stock: 2 },
  ];

  const result = rankProducts('Tìm gì đó thật lạ', null, documents);

  assert.deepEqual(result.products, []);
  assert.equal(result.candidateCount, 0);
});

test('falls back to catalog advice when the AI provider rejects the API key', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.AI_API_KEY;
  process.env.AI_API_KEY = 'test-invalid-key';
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => 'sensitive provider response',
  });

  try {
    const result = await composeAdvice('Hoa tặng mẹ', [
      { name: 'Bó hoa mẫu', price: 300000, content: 'Tên: Bó hoa mẫu. Giá: 300000 VND.' },
    ]);

    assert.equal(result.mode, 'rag-tfidf');
    assert.match(result.text, /Bó hoa mẫu/);
    assert.match(result.providerWarning, /AI_API_KEY/);
    assert.doesNotMatch(result.providerWarning, /sensitive provider response|test-invalid-key/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = originalApiKey;
  }
});

test('checks a chat-only provider without requesting embeddings when disabled', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    AI_API_KEY: process.env.AI_API_KEY,
    AI_BASE_URL: process.env.AI_BASE_URL,
    AI_CHAT_MODEL: process.env.AI_CHAT_MODEL,
    AI_EMBEDDINGS_ENABLED: process.env.AI_EMBEDDINGS_ENABLED,
  };
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_BASE_URL = 'https://example.test/v1';
  process.env.AI_CHAT_MODEL = 'test-chat-model';
  process.env.AI_EMBEDDINGS_ENABLED = 'false';
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(url);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Xin chào!' } }] }),
    };
  };

  try {
    const result = await checkAiProvider();
    assert.deepEqual(result, {
      embeddingsEnabled: false,
      embeddingDimensions: null,
      chatModel: 'test-chat-model',
    });
    assert.deepEqual(requestedUrls, ['https://example.test/v1/chat/completions']);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
