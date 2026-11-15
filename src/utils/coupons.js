export const PROMO_COUPONS = [
  {
    code: 'MOCMIEN10',
    label: 'Giảm 10% (tối đa 80.000₫)',
    type: 'percent',
    value: 10,
    maxDiscount: 80000,
    minSubtotal: 200000,
  },
  {
    code: 'FREESHIP',
    label: 'Miễn phí giao hàng toàn đơn',
    type: 'freeship',
    value: 30000,
    minSubtotal: 0,
  },
  {
    code: 'TOTNGHIEP50',
    label: 'Giảm 50.000₫ cho đơn từ 400.000₫',
    type: 'fixed',
    value: 50000,
    minSubtotal: 400000,
  },
];

export function evaluateCoupon(rawCode, subtotal, baseShippingFee) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { valid: false, discount: 0, shippingDiscount: 0, coupon: null, error: '' };

  const coupon = PROMO_COUPONS.find((item) => item.code === code);
  if (!coupon) {
    return { valid: false, discount: 0, shippingDiscount: 0, coupon: null, error: 'Mã giảm giá không hợp lệ.' };
  }
  if (subtotal < coupon.minSubtotal) {
    return {
      valid: false,
      discount: 0,
      shippingDiscount: 0,
      coupon: null,
      error: `Mã ${coupon.code} áp dụng cho đơn từ ${coupon.minSubtotal.toLocaleString('vi-VN')}₫.`,
    };
  }
  if (coupon.type === 'freeship') {
    return { valid: true, discount: 0, shippingDiscount: baseShippingFee, coupon, error: '' };
  }
  if (coupon.type === 'percent') {
    const raw = Math.round((subtotal * coupon.value) / 100);
    const discount = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
    return { valid: true, discount, shippingDiscount: 0, coupon, error: '' };
  }
  return { valid: true, discount: Math.min(coupon.value, subtotal), shippingDiscount: 0, coupon, error: '' };
}
