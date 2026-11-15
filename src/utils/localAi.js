const minimumRelevanceScore = 0.02;

const STOPWORDS = new Set([
  'tôi', 'mình', 'bạn', 'cho', 'của', 'và', 'với', 'là', 'có', 'không', 'được',
  'muốn', 'cần', 'tìm', 'chọn', 'gợi', 'ý', 'giúp', 'nhé', 'nha', 'ạ', 'ơi',
  'tầm', 'khoảng', 'dưới', 'trên', 'tối', 'đa', 'ngân', 'sách', 'giá', 'tiền',
  'bó', 'hoa', 'một', 'những', 'các', 'này', 'kia', 'để', 'vào', 'dịp', 'nào',
  'nhất', 'hơn', 'thêm', 'xem', 'loại', 'mẫu', 'bên', 'shop', 'tiệm', 'miên',
]);

const DOMAIN_ONTOLOGY = [
  {
    id: 'mom_teacher',
    label: 'Tri ân mẹ / cô giáo',
    triggers: ['mẹ', 'bà', 'cô giáo', 'thầy', 'gia đình', 'tri ân', '20/11', '8/3', '20/10', 'vu lan', 'người lớn'],
    expansions: ['cẩm chướng', 'mẫu đơn', 'lan hồ điệp', 'hoa ly', 'cẩm tú cầu', 'tri ân', 'tặng mẹ', 'pastel'],
  },
  {
    id: 'romance',
    label: 'Tình yêu / bạn gái',
    triggers: ['người yêu', 'bạn gái', 'vợ', 'tỏ tình', 'hẹn hò', 'valentine', '14/2', 'kỷ niệm', 'lãng mạn', 'crush'],
    expansions: ['hoa hồng', 'ohara', 'tulip', 'baby', 'lãng mạn', 'tình yêu', 'pastel', 'hồng đỏ'],
  },
  {
    id: 'birthday',
    label: 'Sinh nhật',
    triggers: ['sinh nhật', 'sn', 'birthday', 'bạn thân'],
    expansions: ['sinh nhật', 'chúc mừng', 'rực rỡ', 'pastel', 'tulip', 'hồng', 'cát tường'],
  },
  {
    id: 'graduation',
    label: 'Tốt nghiệp / lễ ra trường',
    triggers: ['tốt nghiệp', 'ra trường', 'kỷ yếu', 'lễ tốt nghiệp', 'bằng'],
    expansions: ['tốt nghiệp', 'hướng dương', 'chúc mừng', 'vàng', 'tai thỏ', 'rực rỡ'],
  },
  {
    id: 'opening',
    label: 'Khai trương / chúc mừng',
    triggers: ['khai trương', 'tân gia', 'thăng chức', 'chúc mừng', 'đối tác', 'sếp', 'công ty'],
    expansions: ['chúc mừng', 'khai trương', 'lan hồ điệp', 'đồng tiền', 'hướng dương', 'rực rỡ'],
  },
  {
    id: 'sympathy',
    label: 'Trang nhã / chia buồn',
    triggers: ['chia buồn', 'viếng', 'tang', 'trang trọng', 'tinh khôi'],
    expansions: ['trắng', 'ly trắng', 'lan trắng', 'cúc', 'loa kèn'],
  },
];

const COLOR_KEYWORDS = ['đỏ', 'trắng', 'hồng', 'vàng', 'tím', 'xanh', 'cam', 'pastel'];

const POLICY_KNOWLEDGE = [
  {
    intent: 'policy_coupon',
    label: 'Ưu đãi & Mã giảm giá',
    patterns: [/\bmã giảm\b/i, /\bvoucher\b/i, /\bkhuyến mãi\b/i, /\bưu đãi\b/i, /\bgiảm giá\b/i, /\bcoupon\b/i, /\bfreeship\b/i],
    answer:
      'Hiện Mộc Miên đang có 3 mã ưu đãi áp dụng trực tiếp ở bước Giỏ hàng:\n'
      + '• **MOCMIEN10**: Giảm 10% (tối đa 80.000₫) cho mọi đơn hàng.\n'
      + '• **HOATUOI50K**: Giảm thẳng 50.000₫ cho đơn từ 500.000₫.\n'
      + '• **FREESHIP**: Miễn phí giao hàng 30.000₫.\n'
      + 'Ngoài ra, đơn hàng từ 600.000₫ được tự động miễn phí giao hàng và luôn tặng kèm thiệp chúc mừng miễn phí ạ.',
  },
  {
    intent: 'policy_shipping',
    label: 'Giao hàng & Phí ship',
    patterns: [/\bphí ship\b/i, /\bship\b/i, /\bgiao hàng\b/i, /\bvận chuyển\b/i, /\bbao lâu\b/i, /\bhỏa tốc\b/i, /\bnội thành\b/i],
    answer:
      'Chính sách giao hoa tại Mộc Miên:\n'
      + '• **Phí giao hàng:** Đồng giá 30.000₫ nội thành (tự động **Freeship** cho đơn từ 600.000₫ hoặc khi nhập mã `FREESHIP`).\n'
      + '• **Thời gian giao:** Giao nhanh trong **2 giờ** tại TP. Huế hoặc theo khung giờ hẹn chính xác của bạn.\n'
      + '• Hoa được bọc giấy chống sốc và dưỡng ẩm cuống trước khi giao.',
  },
  {
    intent: 'policy_payment',
    label: 'Thanh toán & QR',
    patterns: [/\bthanh toán\b/i, /\bchuyển khoản\b/i, /\bqr\b/i, /\bcod\b/i, /\btiền mặt\b/i, /\bngân hàng\b/i, /\bbill\b/i],
    answer:
      'Mộc Miên hỗ trợ 2 hình thức thanh toán linh hoạt:\n'
      + '1. **Tiền mặt khi nhận hoa (COD):** Kiểm tra hoa tươi trước khi thanh toán cho shipper.\n'
      + '2. **Chuyển khoản ngân hàng (QR):** Hệ thống tự tạo mã QR kèm đúng mã đơn hàng; bạn có thể tải ảnh biên lai (bill) lên ngay sau khi đặt để nhân viên đối soát nhanh.',
  },
  {
    intent: 'policy_care',
    label: 'Hướng dẫn bảo quản hoa',
    patterns: [/\bbảo quản\b/i, /\bgiữ tươi\b/i, /\bchăm sóc\b/i, /\btưới\b/i, /\bhéo\b/i, /\bcắm hoa\b/i],
    answer:
      'Mẹo giữ hoa Mộc Miên tươi lâu từ 5–7 ngày:\n'
      + '• Cắt chéo gốc cành 1–2 cm dưới vòi nước trước khi cắm vào bình sạch.\n'
      + '• Thay nước mới mỗi ngày và bỏ bớt lá ngập dưới mặt nước để tránh đục nước.\n'
      + '• Đặt hoa nơi thoáng mát, tránh nắng gắt trực tiếp và luồng gió máy lạnh thổi thẳng.',
  },
  {
    intent: 'policy_contact',
    label: 'Thông tin cửa hàng',
    patterns: [/\bđịa chỉ\b/i, /\bở đâu\b/i, /\bliên hệ\b/i, /\bhotline\b/i, /\bsđt\b/i, /\bsố điện thoại\b/i, /\bmở cửa\b/i],
    answer:
      'Thông tin tiệm hoa **Mộc Miên**:\n'
      + '• **Khu vực phục vụ:** Thành phố Huế (giao nhanh trong 2 giờ).\n'
      + '• **Hotline hỗ trợ:** `079 567 0902` (7:00 – 21:00 mỗi ngày).\n'
      + '• Bạn cũng có thể nhắn trực tiếp ở mục **Chat với nhân viên** ngay trong tài khoản để được thiết kế bó hoa theo yêu cầu riêng.',
  },
];

export function extractLocalBudget(message) {
  const normalized = String(message || '').toLocaleLowerCase('vi');
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
    `Màu sắc: ${product.color || ''}`,
    `Cách gói: ${product.wrapping || ''}`,
    `Dịp phù hợp: ${product.occasion || product.occasions || ''}`,
    `Tồn kho: ${product.stock ?? 10}`,
  ].join('. ');
}

function detectPreferences(normalizedQuestion) {
  const colors = COLOR_KEYWORDS.filter((c) => new RegExp(`(^|\\s)${c}(\\s|$|[.,!?])`, 'i').test(normalizedQuestion));
  const wantCheapest = /\b(rẻ|tiết kiệm|sinh viên|giá tốt|bình dân|thấp nhất)\b/i.test(normalizedQuestion);
  const wantPremium = /\b(sang|cao cấp|xịn|đặc biệt|lớn|hoành tráng|vip)\b/i.test(normalizedQuestion);
  const wantBestseller = /\b(bán chạy|nổi bật|đẹp nhất|gợi ý|hot|phổ biến)\b/i.test(normalizedQuestion);
  return { colors, wantCheapest, wantPremium, wantBestseller };
}

function expandDomainQuery(question) {
  const normalized = String(question || '').toLocaleLowerCase('vi').normalize('NFC');
  const matchedEntities = [];
  const expandedTerms = [];

  for (const rule of DOMAIN_ONTOLOGY) {
    if (rule.triggers.some((t) => normalized.includes(t))) {
      matchedEntities.push(rule.label);
      expandedTerms.push(...rule.expansions);
    }
  }

  return {
    normalized,
    matchedEntities,
    expandedText: `${question} ${expandedTerms.join(' ')}`.trim(),
  };
}

function classifyIntent(normalized, hasProductHints, budget) {
  if (/^(chào|xin chào|hello|hi|hey|alo|shop ơi|miên ơi)\b/i.test(normalized.trim()) && normalized.trim().split(/\s+/).length <= 5) {
    return { intent: 'greeting', label: 'Chào hỏi' };
  }
  if (/\b(cảm ơn|cam on|thank|thanks|ok bạn|tuyệt vời|tốt quá)\b/i.test(normalized) && !hasProductHints && !budget) {
    return { intent: 'thanks', label: 'Cảm ơn' };
  }

  for (const policy of POLICY_KNOWLEDGE) {
    if (policy.patterns.some((re) => re.test(normalized)) && !hasProductHints) {
      return { intent: policy.intent, label: policy.label, policy };
    }
  }

  return { intent: 'recommendation', label: budget ? 'Tư vấn theo ngân sách & dịp' : 'Tư vấn chọn hoa' };
}

function tfidfVectors(weightedQueryTokens, docs) {
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

  const queryVec = new Map();
  for (const [token, weight] of weightedQueryTokens) {
    queryVec.set(token, weight * idf(token));
  }

  return {
    query: queryVec,
    documents: docTerms.map(vectorize),
    queryTokens: [...weightedQueryTokens.keys()],
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

function inferContextFromHistory(history, currentBudget, currentQuestion) {
  if (!Array.isArray(history) || !history.length) {
    return { effectiveBudget: currentBudget, inheritedContext: '' };
  }
  const lastUserMessages = history.filter((m) => m?.role === 'user').slice(-3);
  let effectiveBudget = currentBudget;
  if (effectiveBudget == null) {
    for (let i = lastUserMessages.length - 1; i >= 0; i -= 1) {
      const prevBudget = extractLocalBudget(lastUserMessages[i].text || '');
      if (prevBudget != null) {
        effectiveBudget = prevBudget;
        break;
      }
    }
  }
  if (effectiveBudget != null && /\b(rẻ hơn|thấp hơn|bớt chút)\b/i.test(currentQuestion) && currentBudget == null) {
    effectiveBudget = Math.max(150_000, Math.round(effectiveBudget * 0.8));
  }

  const shortFollowUp = currentQuestion.trim().split(/\s+/).length <= 6;
  const inheritedContext = shortFollowUp && lastUserMessages.length
    ? String(lastUserMessages[lastUserMessages.length - 1].text || '')
    : '';
  return { effectiveBudget, inheritedContext };
}

export function consultLocalAi(question, catalog, history = []) {
  const cleanQuestion = String(question || '').trim();
  const explicitBudget = extractLocalBudget(cleanQuestion);
  const { effectiveBudget: budget, inheritedContext } = inferContextFromHistory(history, explicitBudget, cleanQuestion);
  const combinedQuestion = inheritedContext ? `${inheritedContext} ${cleanQuestion}` : cleanQuestion;

  const { normalized, matchedEntities, expandedText } = expandDomainQuery(combinedQuestion);
  const prefs = detectPreferences(normalized);
  const hasProductHints = Boolean(
    matchedEntities.length
    || prefs.colors.length
    || prefs.wantCheapest
    || prefs.wantPremium
    || prefs.wantBestseller
    || /\b(hồng|tulip|ly|lan|cúc|hướng dương|baby|cẩm chướng|cẩm tú cầu|mẫu đơn|cát tường|đồng tiền|loa kèn|thanh liễu|thược dược|tặng|bó|giỏ|chậu|hoa)\b/i.test(normalized),
  );

  const intentInfo = classifyIntent(cleanQuestion.toLocaleLowerCase('vi'), hasProductHints, explicitBudget);

  if (intentInfo.intent === 'greeting') {
    return {
      answer:
        'Chào bạn! Mình là **Miên** — trợ lý AI tư vấn hoa của tiệm Mộc Miên.\n'
        + 'Bạn có thể hỏi mình bất cứ điều gì, ví dụ:\n'
        + '• *“Hoa tặng mẹ ngân sách 500k”*\n'
        + '• *“Bó hoa màu hồng tặng bạn gái”*\n'
        + '• *“Có mã giảm giá hay freeship không?”*',
      products: [],
      mode: 'local-ai-engine',
      method: 'intent-classifier',
      intent: intentInfo.label,
      matchedEntities: [],
      candidateCount: catalog.filter((p) => Number(p.stock ?? 10) > 0).length,
      budget: null,
      queryTokens: [],
    };
  }

  if (intentInfo.intent === 'thanks') {
    return {
      answer: 'Rất vui được hỗ trợ bạn! Nếu cần chọn thêm bó hoa nào, viết lời chúc trên thiệp hoặc kiểm tra đơn hàng, cứ nhắn Miên nhé.',
      products: [],
      mode: 'local-ai-engine',
      method: 'intent-classifier',
      intent: intentInfo.label,
      matchedEntities: [],
      candidateCount: 0,
      budget: null,
      queryTokens: [],
    };
  }

  if (intentInfo.policy) {
    return {
      answer: intentInfo.policy.answer,
      products: [],
      mode: 'local-ai-engine',
      method: 'knowledge-base',
      intent: intentInfo.label,
      matchedEntities: [intentInfo.label],
      candidateCount: 0,
      budget: null,
      queryTokens: tokens(cleanQuestion).filter((t) => t.length > 1 && !STOPWORDS.has(t)),
    };
  }

  const activeDocs = catalog
    .filter((p) => p.isActive !== 0 && Number(p.stock ?? 10) > 0)
    .map((product) => ({
      ...product,
      content: buildDocumentText(product),
    }));

  const weightedQueryTokens = new Map();
  for (const t of tokens(combinedQuestion)) {
    if (t.length > 1 && !STOPWORDS.has(t)) {
      weightedQueryTokens.set(t, (weightedQueryTokens.get(t) || 0) + 1.5);
    }
  }
  for (const t of tokens(expandedText)) {
    if (t.length > 1 && !STOPWORDS.has(t) && !weightedQueryTokens.has(t)) {
      weightedQueryTokens.set(t, 0.75);
    }
  }

  const vectors = tfidfVectors(weightedQueryTokens, activeDocs);
  const scored = activeDocs.map((doc, idx) => {
    const { score: lexicalScore, matchedTerms } = sparseCosine(vectors.query, vectors.documents[idx]);
    const docTextLower = doc.content.toLocaleLowerCase('vi');
    let domainBoost = 0;

    for (const color of prefs.colors) {
      if (docTextLower.includes(color)) domainBoost += 0.14;
    }
    if (prefs.wantCheapest && Number(doc.price) <= 350_000) domainBoost += 0.08;
    if (prefs.wantPremium && Number(doc.price) >= 500_000) domainBoost += 0.08;

    const totalScore = Math.min(0.99, lexicalScore + domainBoost);
    return { ...doc, lexicalScore, score: totalScore, matchedTerms };
  });

  const withinBudget = scored.filter((doc) => budget == null || Number(doc.price) <= budget);
  let matches = withinBudget.filter((doc) => doc.score >= minimumRelevanceScore);

  // If user asked by budget/price/bestseller without specific flower keywords, return best-fitting products within budget
  const isPureBudgetOrBrowse = !matches.length && (budget != null || prefs.wantCheapest || prefs.wantPremium || prefs.wantBestseller);
  if (isPureBudgetOrBrowse) {
    matches = [...withinBudget];
  }

  matches.sort((a, b) => {
    if (prefs.wantCheapest && Math.abs(b.score - a.score) < 0.08) return Number(a.price) - Number(b.price);
    if (prefs.wantPremium && Math.abs(b.score - a.score) < 0.08) return Number(b.price) - Number(a.price);
    return b.score - a.score || Number(a.price) - Number(b.price);
  });

  const top = matches.slice(0, 5).map((p) => {
    const reasons = [];
    if (p.matchedTerms?.length) reasons.push(`Khớp: ${p.matchedTerms.slice(0, 3).join(', ')}`);
    if (matchedEntities.length) reasons.push(matchedEntities[0]);
    if (budget != null) reasons.push(`≤ ${budget.toLocaleString('vi-VN')}₫`);
    reasons.push(`Còn ${p.stock ?? 10} bó`);
    return {
      ...p,
      matchReason: reasons.join(' · '),
    };
  });

  const budgetLabel = budget ? `trong ngân sách ≤ ${budget.toLocaleString('vi-VN')}₫` : 'theo nhu cầu của bạn';
  const entityLabel = matchedEntities.length ? ` (${matchedEntities.join(', ')})` : '';

  let answer;
  if (!top.length) {
    answer = budget
      ? `Miên chưa tìm thấy bó hoa còn hàng nào phù hợp ${budgetLabel}${entityLabel}. Bạn thử nới ngân sách thêm một chút hoặc đổi sang tông màu/loài hoa khác nhé.`
      : 'Miên chưa tìm thấy bó hoa còn hàng nào khớp mô tả này. Bạn thử nói rõ dịp tặng (sinh nhật, tặng mẹ, tốt nghiệp), màu sắc hoặc ngân sách (ví dụ: *dưới 500k*) nhé.';
  } else {
    const topLines = top.slice(0, 3).map(
      (p) => `**${p.name}** (${Number(p.price).toLocaleString('vi-VN')}₫${p.score >= 0.05 ? ` · hợp ${Math.round(p.score * 100)}%` : ''})`,
    );
    answer = `Miên đã lọc từ **${activeDocs.length} mẫu còn hàng**${entityLabel} ${budgetLabel} và chọn ra ${top.length} gợi ý phù hợp nhất:\n`
      + `• Nổi bật: ${topLines.join(', ')}.\n`
      + 'Bạn bấm vào từng mẫu bên dưới để xem chi tiết hoặc thêm nhanh vào giỏ hàng nhé!';
  }

  return {
    answer,
    products: top,
    mode: 'local-ai-engine',
    method: isPureBudgetOrBrowse ? 'constraint-ranking' : 'ontology-tfidf-cosine',
    intent: intentInfo.label,
    matchedEntities,
    candidateCount: matches.length,
    budget,
    queryTokens: vectors.queryTokens,
  };
}
