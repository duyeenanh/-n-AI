import { query } from './db.js';

const minimumRelevanceScore = 0.02;
const apiBase = () => (process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');
const apiKey = () => process.env.AI_API_KEY?.trim();
const embeddingsEnabled = () => process.env.AI_EMBEDDINGS_ENABLED !== 'false';

async function aiRequest(path, body) {
  const key = apiKey();
  if (!key) return null;
  const response = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    const error = new Error(`AI provider returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function providerFallbackMessage(error) {
  if ([401, 403].includes(error?.status)) {
    return 'Khóa API chưa được chấp nhận. Kiểm tra AI_API_KEY trong file .env; hiện chatbot đang dùng tìm kiếm nội bộ.';
  }
  if (error?.status === 429) {
    return 'Dịch vụ AI đang giới hạn yêu cầu hoặc hết hạn mức. Chatbot tạm dùng tìm kiếm nội bộ.';
  }
  return `Dịch vụ AI tạm thời không khả dụng${error?.status ? ` (HTTP ${error.status})` : ''}. Chatbot đang dùng tìm kiếm nội bộ.`;
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

function tokens(text) {
  return text.toLocaleLowerCase('vi').normalize('NFC').match(/[\p{L}\p{N}]+/gu) || [];
}

function tfidfVectors(question, documents) {
  const documentTerms = documents.map((document) => {
    const frequencies = new Map();
    for (const token of tokens(document.content)) {
      if (token.length > 1) frequencies.set(token, (frequencies.get(token) || 0) + 1);
    }
    return frequencies;
  });
  const documentFrequency = new Map();
  for (const frequencies of documentTerms) {
    for (const token of frequencies.keys()) {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    }
  }
  const inverseDocumentFrequency = (token) => Math.log((documents.length + 1) / ((documentFrequency.get(token) || 0) + 1)) + 1;
  const vectorize = (frequencies) => {
    const vector = new Map();
    for (const [token, count] of frequencies) {
      vector.set(token, (1 + Math.log(count)) * inverseDocumentFrequency(token));
    }
    return vector;
  };
  const queryTerms = new Map();
  for (const token of tokens(question)) {
    if (token.length > 1) queryTerms.set(token, (queryTerms.get(token) || 0) + 1);
  }
  return {
    query: vectorize(queryTerms),
    documents: documentTerms.map(vectorize),
  };
}

function sparseCosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const [token, weight] of left) {
    leftNorm += weight ** 2;
    dot += weight * (right.get(token) || 0);
  }
  for (const weight of right.values()) rightNorm += weight ** 2;
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

export async function indexProduct(productId) {
  const [product] = await query(
    `SELECT p.id, p.name, p.price, p.description, p.flower_type, p.flower_count,
            p.wrapping, p.color, p.occasions, p.stock, c.name AS category
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? AND p.is_active = 1`,
    [productId],
  );
  if (!product) {
    await query('DELETE FROM rag_documents WHERE product_id = ?', [productId]);
    return;
  }
  const content = [
    `Tên: ${product.name}`, `Danh mục: ${product.category || 'Hoa tươi'}`,
    `Giá: ${product.price} VND`, `Mô tả: ${product.description}`,
    `Loài hoa: ${product.flower_type}`, `Số lượng: ${product.flower_count}`,
    `Cách gói: ${product.wrapping}`, `Màu sắc: ${product.color}`,
    `Dịp phù hợp: ${product.occasions}`, `Tồn kho: ${product.stock}`,
  ].join('. ');
  const result = apiKey() && embeddingsEnabled()
    ? await aiRequest('/embeddings', {
      model: process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: content,
    })
    : null;
  const embedding = result?.data?.[0]?.embedding || null;
  await query(
    `INSERT INTO rag_documents (product_id, content, embedding, embedding_model)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (product_id) DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding,
       embedding_model = EXCLUDED.embedding_model, indexed_at = CURRENT_TIMESTAMP`,
    [productId, content, embedding ? JSON.stringify(embedding) : null, embedding ? (process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small') : null],
  );
}

export async function retrieveProducts(question, budget) {
  const documents = await query(
    `SELECT d.product_id, d.content, d.embedding, p.name, p.price, p.image_url AS image,
            p.flower_type AS "flowerType", p.flower_count AS "flowerCount", p.wrapping,
            p.color, p.occasions, p.stock
     FROM rag_documents d JOIN products p ON p.id = d.product_id
     WHERE p.is_active = 1`,
  );
  let queryEmbedding = null;
  let providerWarning;
  if (apiKey() && embeddingsEnabled() && documents.some((doc) => doc.embedding)) {
    try {
      const result = await aiRequest('/embeddings', {
        model: process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small',
        input: question,
      });
      queryEmbedding = result?.data?.[0]?.embedding || null;
    } catch (error) {
      providerWarning = providerFallbackMessage(error);
      console.warn(`AI embedding request failed; using TF-IDF fallback (HTTP ${error.status || 'network error'}).`);
    }
  }
  return { ...rankProducts(question, budget, documents, queryEmbedding), providerWarning };
}

export function rankProducts(question, budget, documents, queryEmbedding = null) {
  const vectors = tfidfVectors(question, documents);
  const candidates = documents
    .map((doc, index) => {
      const embedding = typeof doc.embedding === 'string' ? JSON.parse(doc.embedding) : doc.embedding;
      const semantic = queryEmbedding && embedding ? cosineSimilarity(queryEmbedding, embedding) : 0;
      const lexical = sparseCosineSimilarity(vectors.query, vectors.documents[index]);
      return {
        ...doc,
        score: queryEmbedding ? semantic * 0.82 + lexical * 0.18 : lexical,
        content: doc.content,
      };
    });
  const matches = candidates
    .filter((doc) => Number(doc.stock) > 0
      && (budget == null || Number(doc.price) <= budget)
      && doc.score >= minimumRelevanceScore)
    .sort((a, b) => b.score - a.score);
  return {
    products: matches.slice(0, 5),
    method: queryEmbedding ? 'hybrid-embedding-tfidf' : 'tfidf-cosine',
    candidateCount: matches.length,
  };
}

export async function composeAdvice(question, retrieved, providerWarning) {
  const context = retrieved.map((item, index) => `[${index + 1}] ${item.content}`).join('\n');
  if (!providerWarning) {
    try {
      const result = await aiRequest('/chat/completions', {
        model: process.env.AI_CHAT_MODEL || 'gpt-4o-mini',
        temperature: 0.25,
        messages: [
          {
            role: 'system',
            content: 'Bạn là Miên, nhân viên tư vấn hoa của Mộc Miên. Chỉ được khẳng định sản phẩm, giá, màu sắc, dịp và tình trạng xuất hiện trong ngữ cảnh truy xuất. Không tự bịa thông tin; nếu không có dữ liệu phù hợp, hãy nói rõ và hỏi thêm. Trả lời thân thiện, ngắn gọn bằng tiếng Việt.',
          },
          { role: 'user', content: `Yêu cầu khách: ${question}\n\nDữ liệu sản phẩm truy xuất từ cửa hàng:\n${context || '(Không tìm được sản phẩm phù hợp trong danh mục.)'}` },
        ],
      });
      if (result?.choices?.[0]?.message?.content) {
        return { text: result.choices[0].message.content, mode: 'rag-ai' };
      }
    } catch (error) {
      providerWarning = providerFallbackMessage(error);
      console.warn(`AI chat request failed; using catalog-grounded fallback (HTTP ${error.status || 'network error'}).`);
    }
  }
  if (!retrieved.length) {
    return {
      text: 'Mình chưa tìm thấy sản phẩm còn hàng phù hợp trong danh mục. Bạn thử đổi dịp tặng, loài hoa hoặc tăng ngân sách một chút nhé.',
      mode: 'rag-tfidf',
      providerWarning,
    };
  }
  return {
    text: `Dựa trên phân tích TF-IDF & Cosine Similarity, Miên gợi ý ${retrieved.slice(0, 3).map((product) => `${product.name} (${Number(product.price).toLocaleString('vi-VN')}₫ · khớp ${Math.round((product.score || 0) * 100)}%)`).join(', ')}. Tất cả đều đang còn hàng trong kho — bạn bấm vào từng bó để xem chi tiết nhé.`,
    mode: 'rag-tfidf',
    providerWarning,
  };
}

export async function checkAiProvider() {
  if (!apiKey()) throw new Error('AI_API_KEY is empty. Add your provider key to the local .env file first.');

  const chatModel = process.env.AI_CHAT_MODEL || 'gemini-3.8-flash';
  let embeddingDimensions = null;
  if (embeddingsEnabled()) {
    const embeddingModel = process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small';
    const embeddingResult = await aiRequest('/embeddings', {
      model: embeddingModel,
      input: 'hoa tặng mẹ',
    });
    const embedding = embeddingResult?.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || !embedding.length || embedding.some((value) => !Number.isFinite(value))) {
      throw new Error('The configured provider did not return a valid embedding vector.');
    }
    embeddingDimensions = embedding.length;
  }

  const chatResult = await aiRequest('/chat/completions', {
    model: chatModel,
    temperature: 0,
    max_tokens: 20,
    messages: [
      { role: 'system', content: 'Reply with a short greeting in Vietnamese.' },
      { role: 'user', content: 'Xin chào.' },
    ],
  });
  if (!chatResult?.choices?.[0]?.message?.content?.trim()) {
    throw new Error('The configured provider did not return a chat completion.');
  }

  return { embeddingsEnabled: embeddingsEnabled(), embeddingDimensions, chatModel };
}
