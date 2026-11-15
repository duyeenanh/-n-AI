const budgetKeywords = /(?:ngân sách|mức giá|tầm giá|giá khoảng|khoảng giá|tối đa|không quá|dưới|khoảng|tầm|budget)/iu;
const amountPattern = /(\d+(?:[.,]\d+)*)(?:\s*)(triệu|tr|nghìn|ngàn|k|vnd|đồng|đ|₫)?/giu;

function parseAmount(value, unit) {
  const parts = value.split(/[.,]/);
  const isGroupedInteger = parts.length > 1 && parts.slice(1).every((part) => part.length === 3);
  const amount = isGroupedInteger
    ? Number(parts.join(''))
    : Number(value.replace(',', '.'));
  if (!Number.isFinite(amount)) return null;

  const normalizedUnit = unit?.toLocaleLowerCase('vi');
  if (normalizedUnit === 'triệu' || normalizedUnit === 'tr') return Math.round(amount * 1000000);
  if (normalizedUnit === 'nghìn' || normalizedUnit === 'ngàn' || normalizedUnit === 'k') return Math.round(amount * 1000);
  if (normalizedUnit || isGroupedInteger || amount >= 10000) return Math.round(amount);
  return null;
}

export function extractBudget(message) {
  const text = message.toLocaleLowerCase('vi');
  const amounts = [];
  for (const match of text.matchAll(amountPattern)) {
    const amount = parseAmount(match[1], match[2]);
    if (amount == null || amount <= 0) continue;

    const prefix = text.slice(Math.max(0, match.index - 32), match.index);
    if (match[2] || budgetKeywords.test(prefix) || amount >= 10000) {
      amounts.push({ value: amount, rangeStart: /\b(?:từ|between)\s*$/iu.test(prefix) });
    }
  }
  if (!amounts.length) return null;

  if (amounts.length > 1 && amounts.some((item) => item.rangeStart)) {
    return Math.max(...amounts.map((item) => item.value));
  }
  return amounts.at(-1).value;
}
