const minimumRelevanceScore = 0.02;

const STOPWORDS = new Set([
  'tôi', 'mình', 'bạn', 'cho', 'của', 'và', 'với', 'là', 'có', 'không', 'được',
  'muốn', 'cần', 'tìm', 'chọn', 'gợi', 'ý', 'giúp', 'nhé', 'nha', 'ạ', 'ơi',
  'tầm', 'khoảng', 'dưới', 'trên', 'tối', 'đa', 'ngân', 'sách', 'giá', 'tiền',
  'bó', 'hoa', 'một', 'những', 'các', 'này', 'kia', 'để', 'vào', 'dịp',
]);

export function extractLocalBudget(message) {
  const normalized = message.toLocaleLowerCase('vi');
  const matches = [...normalized.matchAll(/(\d+(?:[.,]\d+)?)\s*(triệu|tr|nghìn|ngàn|k|đồng|đ|vnd)?(?=\s|$|[.,!?;:])/gi)];
  const candidates = [];

  for (const match of matches) {
    const rawNumber = match[1];
    const unit = (match[2] || '').toLowerCase();
    const after = normalized.slice(match.index + match[0].length).trimStart();
    if (!unit && /^(cành|bông|nhành|chậu|giỏ|lẵng|bó)\b/.test(after)) continue;

    let amount;
    if (unit === 'triệu' || unit === 'tr') {
      amount = Math.round(Number(rawNumber.replace(',', '.')) * 1_000_000);
    } else if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') {
      amount = Math.round(Number(rawNumber.replace(',', '.')) * 1_000);
    } else {
      const digits = rawNumber.replace(/[.,]/g, '');
      amount = Number(digits);
      if (!unit && amount < 50_000) continue;
    }

    if (Number.isFinite(amount) && amount >= 50_000) {
      candidates.push(amount);
    }
  }

  return candidates.length ? Math.max(...candidates) : null;
}

function tokens(text) {
  return String(text || '')
    .toLocaleLowerCase('vi')
    .normalize('NFC')
    .match(/[\p{L}\p{N}]+/gu) || [];
}

function buildDocumentText(product) {
  return [
    `Tên: ${product.name}`,
    `Danh mục: ${product.category || 'Hoa tươi'}`,
    `Giá: ${product.price} VND`,
    `Mô tả: ${product.description || product.detail || ''}`,
    `Loài hoa: ${product.flowerType || product.detail || ''}`,
    `Dịp phù hợp: ${product.occasion || ''}`,
    `Tồn kho: ${product.stock ?? 10}`,
  ].join('. ');
}

function tfidfVectors(question, docs) {
  const docTerms = docs.map((doc) => {
    const freq = new Map();
    for (const token of tokens(doc.content)) {
      if (token.length > 1 && !STOPWORDS.has(token)) {
        freq.set(token, (freq.get(token) || 0) + 1);
      }
    }
    return freq;
  });

  const df = new Map();
  for (const freq of docTerms) {
    for (const token of freq.keys()) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }

  const idf = (token) => Math.log((docs.length + 1) / ((df.get(token) || 0) + 1)) + 1;
  const vectorize = (freq) => {
    const vec = new Map();
    for (const [token, count] of freq) {
      vec.set(token, (1 + Math.log(count)) * idf(token));
    }
    return vec;
  };

  const queryFreq = new Map();
  for (const token of tokens(question)) {
    if (token.length > 1 && !STOPWORDS.has(token)) {
      queryFreq.set(token, (queryFreq.get(token) || 0) + 1);
    }
  }

  return {
    query: vectorize(queryFreq),
    documents: docTerms.map(vectorize),
    queryTokens: [...queryFreq.keys()],
  };
}

function sparseCosine(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  const matchedTerms = [];
  for (const [token, weight] of left) {
    leftNorm += weight ** 2;
    const rw = right.get(token) || 0;
    if (rw > 0) {
      dot += weight * rw;
      matchedTerms.push(token);
    }
  }
  for (const weight of right.values()) rightNorm += weight ** 2;
  const score = leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
  return { score, matchedTerms };
}

export function consultLocalAi(question, catalog) {
  const budget = extractLocalBudget(question);
  const docs = catalog.map((product) => ({
    ...product,
    content: buildDocumentText(product),
  }));

  const vectors = tfidfVectors(question, docs);
  const scored = docs.map((doc, idx) => {
    const { score, matchedTerms } = sparseCosine(vectors.query, vectors.documents[idx]);
    return { ...doc, score, matchedTerms };
  });

  const matches = scored
    .filter((doc) => Number(doc.stock ?? 10) > 0
      && (budget == null || Number(doc.price) <= budget)
      && doc.score >= minimumRelevanceScore)
    .sort((a, b) => b.score - a.score);

  const top = matches.slice(0, 5);
  const budgetLabel = budget ? `trong ngân sách ≤ ${budget.toLocaleString('vi-VN')}₫` : 'theo mô tả của bạn';

  let answer;
  if (!top.length) {
    answer = budget
      ? `Miên chưa tìm thấy bó hoa còn hàng nào phù hợp ${budgetLabel}. Bạn thử tăng ngân sách thêm một chút hoặc nêu tên loài hoa/dịp tặng cụ thể hơn nhé.`
      : 'Miên chưa tìm thấy bó hoa còn hàng nào khớp với yêu cầu. Bạn thử gợi ý dịp tặng (sinh nhật, tốt nghiệp, tặng mẹ) hoặc mức ngân sách nhé.';
  } else {
    const topLines = top.slice(0, 3).map(
      (p) => `${p.name} (${Number(p.price).toLocaleString('vi-VN')}₫ · khớp ${Math.round(p.score * 100)}%)`,
    );
    answer = `Dựa trên phân tích TF-IDF & Cosine Similarity ${budgetLabel}, Miên gợi ý nổi bật nhất là ${topLines.join(', ')}. Tất cả các bó đều đang còn hàng trong kho — bạn bấm vào từng bó để xem chi tiết nhé.`;
  }

  return {
    answer,
    products: top,
    budget,
    mode: 'local-tfidf',
    method: 'tfidf-cosine',
    candidateCount: matches.length,
    queryTokens: vectors.queryTokens,
  };
}
