import writeExcelFile from 'write-excel-file/browser';

const categoryLabels = {
  roses: 'Hoa hồng',
  bouquets: 'Bó hoa',
  tulips: 'Tulip',
  lilies: 'Hoa ly',
  occasion: 'Chậu & dịp đặc biệt',
  graduation: 'Hoa tốt nghiệp',
};

const headerCell = (value) => ({
  value,
  fontWeight: 'bold',
  backgroundColor: '#e9eee4',
  wrap: true,
});

export async function exportInventoryWorkbook({ products, exportedBy, role }) {
  const exportedAt = new Date();
  const date = [
    exportedAt.getFullYear(),
    String(exportedAt.getMonth() + 1).padStart(2, '0'),
    String(exportedAt.getDate()).padStart(2, '0'),
  ].join('-');
  const sheetData = [
    [{ value: 'BÁO CÁO KIỂM KÊ KHO HOA', fontWeight: 'bold', fontSize: 16 }],
    [`Ngày kiểm kê: ${exportedAt.toLocaleDateString('vi-VN')}`],
    [`Giờ xuất: ${exportedAt.toLocaleTimeString('vi-VN')}`],
    [`Người xuất: ${exportedBy || role}`],
    [],
    [
      headerCell('Mã sản phẩm'),
      headerCell('Tên hoa'),
      headerCell('Danh mục'),
      headerCell('Giá bán (VND)'),
      headerCell('Tồn kho (bó/món)'),
      headerCell('Tình trạng'),
      headerCell('Cập nhật tồn gần nhất'),
    ],
    ...products.map((product) => [
      String(product.id),
      String(product.name),
      categoryLabels[product.category] || String(product.category || ''),
      Number(product.price),
      Number(product.stock),
      Number(product.stock) === 0 ? 'Hết hàng' : Number(product.stock) <= 3 ? 'Sắp hết' : 'Còn hàng',
      product.updatedAt ? new Date(product.updatedAt).toLocaleString('vi-VN') : 'Chưa có',
    ]),
  ];

  const blob = await writeExcelFile(sheetData).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kiem-ke-kho-${role}-${date}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const orderStatusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

export async function exportOrdersWorkbook({ orders, exportedBy }) {
  const exportedAt = new Date();
  const date = [
    exportedAt.getFullYear(),
    String(exportedAt.getMonth() + 1).padStart(2, '0'),
    String(exportedAt.getDate()).padStart(2, '0'),
  ].join('-');
  const sheetData = [
    [{ value: 'BÁO CÁO ĐƠN HÀNG & DOANH THU — MỘC MIÊN', fontWeight: 'bold', fontSize: 16 }],
    [`Ngày xuất: ${exportedAt.toLocaleDateString('vi-VN')} ${exportedAt.toLocaleTimeString('vi-VN')}`],
    [`Người xuất: ${exportedBy || 'Admin'}`],
    [],
    [
      headerCell('Mã đơn'),
      headerCell('Người nhận'),
      headerCell('Số điện thoại'),
      headerCell('Ngày giao'),
      headerCell('Tổng tiền (VND)'),
      headerCell('Thanh toán'),
      headerCell('Trạng thái đơn'),
    ],
    ...orders.map((order) => [
      String(order.orderCode || ''),
      String(order.recipientName || ''),
      String(order.phone || ''),
      order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('vi-VN') : '',
      Number(order.total || 0),
      order.paymentStatus === 'paid' ? 'Đã thanh toán' : order.paymentMethod === 'bank_transfer' ? 'Chuyển khoản (Chờ)' : 'COD',
      orderStatusLabels[order.status] || String(order.status || ''),
    ]),
  ];

  const blob = await writeExcelFile(sheetData).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bao-cao-don-hang-${date}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
