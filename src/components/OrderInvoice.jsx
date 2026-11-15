import { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { formatPrice } from '../data/products.js';
import PaymentProof from './PaymentProof.jsx';

function printInvoice() {
  const invoice = document.getElementById('order-invoice-print');
  if (!invoice) {
    throw new Error('Không tìm thấy nội dung hóa đơn để in.');
  }
  const printableInvoice = invoice.cloneNode(true);
  printableInvoice.querySelector('.invoice-proof')?.remove();

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Trình duyệt đã chặn cửa sổ in. Hãy cho phép cửa sổ bật lên rồi thử lại.');
  }

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Hóa đơn</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #222; font: 10pt Arial, sans-serif; }
          .invoice-content { width: 100%; }
          .invoice-brand { display: flex; align-items: center; gap: 10px; padding-bottom: 8mm; border-bottom: 1px solid #ddd; }
          .invoice-brand > span { display: grid; place-items: center; width: 14mm; height: 14mm; border: 1px solid #ddd; border-radius: 50%; color: #59694f; font-size: 18pt; }
          .invoice-brand > div { display: flex; flex: 1; flex-direction: column; gap: 4px; }
          .invoice-brand > div b { color: #354532; font: 16pt Georgia, serif; }
          .invoice-brand > div small { color: #555; font-size: 8pt; }
          .invoice-brand > strong { font-size: 10pt; }
          .invoice-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5mm; padding: 5mm 0; border-bottom: 1px solid #ddd; }
          .invoice-meta > span, .invoice-totals > span { display: flex; flex-direction: column; gap: 4px; color: #555; font-size: 9pt; }
          .invoice-meta strong, .invoice-totals strong { color: #222; font-size: 9pt; }
          .invoice-customer { padding: 5mm 0; }
          .invoice-customer h3 { margin: 0 0 7px; font-size: 11pt; }
          .invoice-customer p { margin: 3px 0; font-size: 10pt; line-height: 1.5; }
          .invoice-items { margin: 6px 0 12px; }
          .invoice-items table { width: 100%; border-collapse: collapse; font-size: 9pt; }
          .invoice-items thead { display: table-header-group; }
          .invoice-items tr { break-inside: avoid; }
          .invoice-items th, .invoice-items td { padding: 3mm 2mm; border-bottom: 1px solid #ddd; text-align: left; }
          .invoice-items th:last-child, .invoice-items td:last-child { text-align: right; }
          .invoice-totals { display: grid; justify-content: end; gap: 8px; padding-top: 3mm; }
          .invoice-totals > span { display: grid; grid-template-columns: 150px minmax(100px, auto); align-items: center; }
          .invoice-totals strong { text-align: right; }
          .invoice-grand-total { border-top: 1px solid #ddd; padding-top: 8px; font-weight: bold; }
          .invoice-grand-total strong { font-size: 12pt; }
          .invoice-thanks { margin-top: 8mm; padding-top: 4mm; border-top: 1px solid #ddd; color: #555; text-align: center; font: 11pt Georgia, serif; }
          @media print { .invoice-brand, .invoice-meta, .invoice-customer, .invoice-totals, .invoice-thanks { break-inside: avoid; } }
        </style>
      </head>
      <body>${printableInvoice.outerHTML}</body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 300);
}

const orderStatuses = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

export default function OrderInvoice({ order, accessToken, onClose, canUploadProof = false, onProofUploaded }) {
  const [printError, setPrintError] = useState('');

  useEffect(() => {
    if (!order) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [order, onClose]);

  if (!order) return null;

  const handlePrint = () => {
    try {
      printInvoice();
      setPrintError('');
    } catch (error) {
      setPrintError(error.message);
    }
  };

  return <div className="admin-form-backdrop invoice-print-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="order-invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
      <header className="invoice-actions">
        <div><small>HÓA ĐƠN ĐƠN HÀNG</small><h2 id="invoice-title">{order.orderCode}</h2></div>
        <div><button className="button-outline" type="button" onClick={handlePrint}><Printer size={14} /> In / lưu PDF</button><button className="icon-button" type="button" onClick={onClose} aria-label="Đóng hóa đơn"><X /></button></div>
      </header>
      {printError && <p className="payment-proof-error" role="alert">{printError}</p>}
      <div className="invoice-content" id="order-invoice-print">
        <div className="invoice-brand"><span>✿</span><div><b>Mộc Miên Flower Studio</b><small>HÓA ĐƠN BÁN HÀNG</small></div><strong>{order.orderCode}</strong></div>
        <div className="invoice-meta"><span>Ngày đặt<strong>{order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}</strong></span><span>Ngày giao dự kiến<strong>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('vi-VN') : '—'}</strong></span><span>Trạng thái đơn<strong>{orderStatuses[order.status] || order.status || '—'}</strong></span></div>
        <div className="invoice-customer"><h3>Thông tin nhận hàng</h3><p><b>{order.recipientName || order.customerName || '—'}</b></p><p>{order.phone || '—'}</p><p>{order.address || '—'}</p><p>Thiệp chúc mừng miễn phí</p>{order.cardMessage && <p className="invoice-card-message">Lời nhắn thiệp: {order.cardMessage}</p>}</div>
        <div className="admin-table-wrap invoice-items"><table><thead><tr><th>SẢN PHẨM</th><th>ĐƠN GIÁ</th><th>SỐ LƯỢNG</th><th>THÀNH TIỀN</th></tr></thead><tbody>{(order.items || []).map((item, index) => <tr key={item.orderItemId || item.productId || `${item.name}-${index}`}><td>{item.name}</td><td>{formatPrice(item.price)}</td><td>{item.quantity}</td><td>{formatPrice(item.lineTotal ?? Number(item.price) * Number(item.quantity))}</td></tr>)}</tbody></table></div>
        <div className="invoice-totals"><span>Tạm tính<strong>{formatPrice(order.subtotal || 0)}</strong></span>{Number(order.discount) > 0 && <span>Giảm giá ưu đãi<strong>-{formatPrice(order.discount)}</strong></span>}<span>Phí giao hàng<strong>{formatPrice(order.shippingFee || 0)}</strong></span><span className="invoice-grand-total">Tổng thanh toán<strong>{formatPrice(order.total || 0)}</strong></span><span>Hình thức thanh toán<strong>{order.paymentMethod === 'bank_transfer' ? 'Chuyển khoản ngân hàng' : 'Thanh toán khi nhận hàng (COD)'}</strong></span><span>Trạng thái thanh toán<strong>{order.paymentStatus === 'paid' ? 'Đã thanh toán' : order.paymentMethod === 'bank_transfer' && order.paymentReportedAt ? 'Đang chờ đối soát' : 'Chưa thanh toán'}</strong></span></div>
        {order.paymentMethod === 'bank_transfer' && <div className="invoice-proof"><PaymentProof orderId={order.id} accessToken={accessToken} hasProof={Boolean(order.hasPaymentProof)} uploadedAt={order.paymentProofUploadedAt} canUpload={canUploadProof && order.paymentStatus !== 'paid' && order.status !== 'cancelled'} onUploaded={onProofUploaded} /></div>}
        <p className="invoice-thanks">Cảm ơn bạn đã chọn Mộc Miên. Chúc bạn một ngày thật đẹp!</p>
      </div>
    </section>
  </div>;
}
