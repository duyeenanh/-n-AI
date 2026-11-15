import { useEffect, useState } from 'react';
import {
  ArrowDownRight, ArrowDownUp, ArrowLeft, ArrowRight, ArrowUpRight, Boxes, Check, ChevronDown, CircleDollarSign, Download,
  LayoutDashboard, LogOut, Package, Plus, RefreshCw, Search, ShoppingBag, Truck,
  UsersRound, X,
} from 'lucide-react';
import { apiFetch } from '../api.js';
import { categories, formatPrice } from '../data/products.js';
import { exportInventoryWorkbook, exportOrdersWorkbook } from '../utils/exportInventory.js';
import { compressProductImage } from '../utils/imageFile.js';
import OrderInvoice from './OrderInvoice.jsx';
import PaymentProof from './PaymentProof.jsx';

const statusOptions = [
  ['confirmed', 'Đã xác nhận'],
  ['preparing', 'Đang chuẩn bị'],
  ['shipping', 'Đang giao'],
  ['delivered', 'Đã giao'],
  ['cancelled', 'Đã hủy'],
];

const receiptStatusLabels = {
  in_transit: 'Đang nhập về',
  received: 'Đã nhập kho',
  cancelled: 'Đã hủy',
};

const blankProduct = {
  name: '', category: 'roses', price: '', oldPrice: '', description: '',
  flowerType: '', flowerCount: '', wrapping: 'Giấy gói thủ công Mộc Miên',
  color: '', occasion: '', image: '', stock: 10,
};

const revenuePeriods = {
  day: { label: 'Ngày', count: 14, dataKey: 'dailyRevenue' },
  month: { label: 'Tháng', count: 12, dataKey: 'monthlyRevenue' },
  year: { label: 'Năm', count: 5, dataKey: 'yearlyRevenue' },
};

function getRevenueChartData(stats, period) {
  const { count, dataKey } = revenuePeriods[period];
  const now = new Date();
  const revenueByPeriod = new Map((stats[dataKey] || []).map((item) => [item.period, Number(item.revenue)]));

  return Array.from({ length: count }, (_, index) => {
    const offset = index - count + 1;
    const date = period === 'day'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
      : period === 'month'
        ? new Date(now.getFullYear(), now.getMonth() + offset, 1)
        : new Date(now.getFullYear() + offset, 0, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = period === 'day' ? `${year}-${month}-${day}` : period === 'month' ? `${year}-${month}` : String(year);
    const label = period === 'day'
      ? date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      : period === 'month'
        ? `${month}/${year}`
        : String(year);

    return { key, label, revenue: revenueByPeriod.get(key) || 0 };
  });
}

function formatRevenueAxis(value) {
  if (value >= 1000000) return `${(value / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}

function getRevenueTrend(data) {
  const splitAt = Math.floor(data.length / 2);
  const previous = data.slice(0, splitAt);
  const current = data.slice(splitAt);
  const previousAverage = previous.length
    ? previous.reduce((total, item) => total + item.revenue, 0) / previous.length
    : 0;
  const currentAverage = current.length
    ? current.reduce((total, item) => total + item.revenue, 0) / current.length
    : 0;

  return {
    direction: currentAverage > previousAverage ? 'up' : currentAverage < previousAverage ? 'down' : 'flat',
    percentage: previousAverage > 0
      ? Math.abs((currentAverage - previousAverage) / previousAverage) * 100
      : null,
    previousAverage,
    currentAverage,
  };
}

export default function AdminDashboard({ user, onClose, onHome = onClose, onLogout, notify }) {
  const [tab, setTab] = useState('overview');
  const [revenuePeriod, setRevenuePeriod] = useState('day');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [paidOrdersOnly, setPaidOrdersOnly] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [stockReceipts, setStockReceipts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [serverCategories, setServerCategories] = useState([]);
  const [aiHistory, setAiHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [newCategory, setNewCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newStockReceipt, setNewStockReceipt] = useState(false);
  const [newStaff, setNewStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [stockDrafts, setStockDrafts] = useState({});
  const [stockAddDrafts, setStockAddDrafts] = useState({});
  const [addingStockId, setAddingStockId] = useState(null);
  const [receivingReceiptId, setReceivingReceiptId] = useState(null);

  const revenueChartData = stats ? getRevenueChartData(stats, revenuePeriod) : [];
  const maxRevenue = Math.max(...revenueChartData.map((item) => item.revenue), 0);
  const chartScale = maxRevenue || 1;

  const load = async (section = tab) => {
    setLoading(true);
    setError('');
    try {
      if (section === 'overview') setStats(await apiFetch('/admin/stats'));
      if (section === 'products') setProducts(await apiFetch('/admin/products'));
      if (section === 'inventory') {
        const [items, receipts] = await Promise.all([
          apiFetch('/admin/inventory'),
          apiFetch('/admin/stock-receipts'),
        ]);
        setInventory(items);
        setStockReceipts(receipts);
      }
      if (section === 'orders') setOrders(await apiFetch('/admin/orders'));
      if (section === 'payments') setPayments(await apiFetch('/admin/payments'));
      if (section === 'customers') setCustomers(await apiFetch('/admin/customers'));
      if (section === 'staff') setStaff(await apiFetch('/admin/staff'));
      if (section === 'categories') setServerCategories(await apiFetch('/admin/categories'));
      if (section === 'ai') setAiHistory(await apiFetch('/admin/ai-history'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(tab); }, [tab]);

  useEffect(() => {
    if (tab !== 'inventory') return undefined;
    const refreshInventory = () => apiFetch('/admin/inventory')
      .then(setInventory)
      .catch((err) => setError(err.message));
    const timer = window.setInterval(refreshInventory, 10000);
    window.addEventListener('focus', refreshInventory);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshInventory);
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== 'payments') return undefined;
    const refreshPayments = () => apiFetch('/admin/payments')
      .then(setPayments)
      .catch((err) => setError(err.message));
    const timer = window.setInterval(refreshPayments, 10000);
    window.addEventListener('focus', refreshPayments);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshPayments);
    };
  }, [tab]);

  const saveProduct = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get('name'),
      category: form.get('category'),
      price: Number(form.get('price')),
      oldPrice: form.get('oldPrice') ? Number(form.get('oldPrice')) : null,
      description: form.get('description'),
      flowerType: form.get('flowerType'),
      flowerCount: form.get('flowerCount'),
      wrapping: form.get('wrapping'),
      color: form.get('color'),
      occasion: form.get('occasion'),
      image: form.get('image'),
      stock: Number(form.get('stock')),
    };
    try {
      if (editing?.id) await apiFetch(`/admin/products/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await apiFetch('/admin/products', { method: 'POST', body: JSON.stringify(payload) });
      setEditing(null);
      await load('products');
      notify('Đã lưu thông tin sản phẩm và cập nhật tài liệu truy xuất RAG.');
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteProduct = async (product, hard = false) => {
    const msg = hard
      ? `Xóa hẳn sản phẩm “${product.name}” khỏi danh sách?`
      : `Ẩn sản phẩm “${product.name}” khỏi cửa hàng?`;
    if (!window.confirm(msg)) return;
    try {
      await apiFetch(`/admin/products/${product.id}${hard ? '?hard=true' : ''}`, { method: 'DELETE' });
      await load('products');
      notify(hard ? 'Đã xóa sản phẩm khỏi danh sách.' : 'Đã ẩn sản phẩm khỏi cửa hàng.');
    } catch (err) {
      setError(err.message);
    }
  };

  const restoreProduct = async (product) => {
    try {
      await apiFetch(`/admin/products/${product.id}/restore`, { method: 'PATCH', body: '{}' });
      await load('products');
      notify(`Đã mở bán lại “${product.name}”.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const setOrderStatus = async (order, status) => {
    try {
      await apiFetch(`/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note: 'Cập nhật từ trang quản trị.' }),
      });
      await load('orders');
      notify(`Đã cập nhật trạng thái đơn ${order.orderCode}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmPayment = async (order) => {
    try {
      await apiFetch(`/payments/${order.id}/confirm`, { method: 'POST', body: '{}' });
      await load(tab === 'orders' ? 'orders' : 'payments');
      notify(`Đã xác nhận giao dịch chuyển khoản đơn ${order.orderCode}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const reindex = async () => {
    try {
      const result = await apiFetch('/ai/reindex', { method: 'POST', body: '{}' });
      notify(`Đã cập nhật ${result.indexed} tài liệu sản phẩm cho RAG.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const createCategory = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ slug: form.get('slug'), name: form.get('name'), description: form.get('description') }),
      });
      setNewCategory(false);
      await load('categories');
      notify('Đã tạo danh mục mới.');
    } catch (err) {
      setError(err.message);
    }
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch(`/admin/categories/${editingCategory.slug}`, {
        method: 'PUT',
        body: JSON.stringify({ name: form.get('name'), description: form.get('description') }),
      });
      setEditingCategory(null);
      await load('categories');
      notify('Đã cập nhật danh mục.');
    } catch (err) {
      setError(err.message);
    }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`Xóa danh mục “${category.name}”? Sản phẩm hiện thuộc danh mục này vẫn được giữ lại nhưng sẽ không còn danh mục.`)) return;
    try {
      await apiFetch(`/admin/categories/${category.slug}`, { method: 'DELETE' });
      await load('categories');
      notify('Đã xóa danh mục; các sản phẩm vẫn được giữ lại nhưng không còn gắn danh mục.');
    } catch (err) {
      setError(err.message);
    }
  };

  const createStaff = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch(editingStaff ? `/admin/staff/${editingStaff.id}` : '/admin/staff', {
        method: editingStaff ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...(!editingStaff ? { fullName: form.get('fullName'), email: form.get('email') } : {}),
          fullName: form.get('fullName'),
          phone: form.get('phone'),
          ...(form.get('password') ? { password: form.get('password') } : {}),
        }),
      });
      setNewStaff(false);
      setEditingStaff(null);
      await load('staff');
      notify(editingStaff ? 'Đã cập nhật thông tin tài khoản nhân viên.' : 'Đã tạo tài khoản nhân viên. Gửi thông tin đăng nhập riêng cho nhân viên.');
    } catch (err) {
      setError(err.message);
    }
  };

  const saveStock = async (product) => {
    const value = stockDrafts[product.id] ?? String(product.stock);
    const stock = Number(value);
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 100000) {
      setError('Số lượng tồn kho phải là số nguyên từ 0 đến 100.000.');
      return;
    }
    try {
      await apiFetch(`/admin/inventory/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock }),
      });
      await load('inventory');
      notify(`Đã cập nhật kho “${product.name}” còn ${stock} bó.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const addInventoryStock = async (product) => {
    const quantity = Number(stockAddDrafts[product.id] ?? 1);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) {
      setError('Số lượng nhập thêm phải là số nguyên từ 1 đến 100.000.');
      return;
    }
    if (addingStockId === product.id) return;
    setAddingStockId(product.id);
    try {
      const updatedProduct = await apiFetch(`/admin/inventory/${product.id}/add`, {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      });
      await load('inventory');
      notify(updatedProduct.indexingWarning || `Đã nhập thêm ${quantity} bó “${product.name}”; tồn kho hiện tại ${updatedProduct.stock} bó.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingStockId(null);
    }
  };

  const exportInventory = async () => {
    try {
      await exportInventoryWorkbook({ products: inventory, exportedBy: user?.fullName, role: 'admin' });
      notify('Đã xuất báo cáo kiểm kê kho hoa hôm nay.');
    } catch (err) {
      setError(`Không xuất được file kiểm kê Excel: ${err.message}`);
    }
  };

  const receiveStock = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const receipt = await apiFetch('/admin/stock-receipts', {
        method: 'POST',
        body: JSON.stringify({
          productId: form.get('productId'),
          quantity: Number(form.get('quantity')),
          unitCost: Number(form.get('unitCost')),
          supplierName: form.get('supplierName'),
          note: form.get('note'),
        }),
      });
      setNewStockReceipt(false);
      await load('inventory');
      notify(`Đã tạo phiếu ${receipt.receiptCode}: ${receipt.quantity} bó “${receipt.productName}” đang được nhập về. Tồn kho sẽ tăng khi xác nhận hàng đã về.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmReceiptArrival = async (receipt) => {
    if (receivingReceiptId === receipt.id) return;
    setReceivingReceiptId(receipt.id);
    try {
      const result = await apiFetch(`/admin/stock-receipts/${receipt.id}/receive`, { method: 'POST', body: '{}' });
      await load('inventory');
      notify(result.indexingWarning || `Đã xác nhận phiếu ${receipt.receiptCode}; ${receipt.items.reduce((sum, item) => sum + Number(item.quantity), 0)} bó đã được cộng vào kho.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setReceivingReceiptId(null);
    }
  };

  const removeStaff = async (employee) => {
    if (!window.confirm(`Thu hồi quyền và xóa tài khoản nhân viên ${employee.fullName} (${employee.email})?`)) return;
    try {
      await apiFetch(`/admin/staff/${employee.id}`, { method: 'DELETE' });
      await load('staff');
      notify('Đã thu hồi tài khoản nhân viên.');
    } catch (err) {
      setError(err.message);
    }
  };

  const filter = (items, fields) => items.filter((item) => fields.some((field) => String(item[field] || '').toLowerCase().includes(search.toLowerCase())));
  const inventoryForView = filter(inventory.filter((item) => {
    if (inventoryFilter === 'low') return Number(item.stock) > 0 && Number(item.stock) <= 3;
    if (inventoryFilter === 'in-stock') return Number(item.stock) > 0;
    if (inventoryFilter === 'out-of-stock') return Number(item.stock) === 0;
    return true;
  }), ['name', 'id']);
  const ordersForView = filter(
    orders.filter((order) => (!paidOrdersOnly || (order.paymentStatus === 'paid' && order.status !== 'cancelled'))
      && (orderStatusFilter === 'all' || order.status === orderStatusFilter)),
    ['orderCode', 'recipientName', 'phone', 'customerEmail'],
  );
  const openInventory = (nextFilter) => {
    setSearch('');
    setPaidOrdersOnly(false);
    setInventoryFilter(nextFilter);
    setTab('inventory');
  };
  const returnToOverview = () => {
    setSearch('');
    setPaidOrdersOnly(false);
    setInventoryFilter('all');
    setTab('overview');
  };

  return (
    <section className="admin-shell" aria-label="Trang quản trị Mộc Miên">
      <header className="admin-topbar">
        <button className="admin-brand" type="button" onClick={onHome} aria-label="Mộc Miên, về trang cửa hàng"><span>✿</span><b>mộc miên<small>STUDIO ADMIN · VỀ CỬA HÀNG</small></b></button>
        <div className="admin-top-actions"><span><i /> Trang quản trị</span><button className="admin-logout-button" onClick={onLogout}><LogOut size={14} /> Đăng xuất</button><button className="icon-button" onClick={onClose} aria-label="Đóng quản trị"><X /></button></div>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <small>QUẢN LÝ CỬA HÀNG</small>
          {[
            ['overview', LayoutDashboard, 'Tổng quan'],
            ['products', Package, 'Sản phẩm'],
            ['inventory', Boxes, 'Quản lý kho'],
            ['categories', Boxes, 'Danh mục hoa'],
            ['orders', ShoppingBag, 'Đơn hàng'],
            ['payments', CircleDollarSign, 'Thanh toán chuyển khoản'],
            ['customers', UsersRound, 'Khách hàng'],
            ['staff', UsersRound, 'Quản lý nhân viên'],
            ['ai', CircleDollarSign, 'Lịch sử tư vấn AI'],
          ].map(([id, Icon, title]) => <button key={id} className={tab === id ? 'admin-nav selected' : 'admin-nav'} onClick={() => { setTab(id); setSearch(''); setPaidOrdersOnly(false); setInventoryFilter('all'); }}>
            <Icon size={17} />{title}<ArrowRight size={13} />
          </button>)}
          <div className="admin-sidebar-bottom"><span>AI & DỮ LIỆU</span><p>Tài liệu RAG được cập nhật khi sản phẩm thay đổi.</p><button className="reindex-button" onClick={reindex}><RefreshCw size={14} /> Làm mới chỉ mục RAG</button></div>
        </aside>
        <main className="admin-content">
          <div className={`admin-page-title ${tab !== 'overview' ? 'has-back' : ''}`}>
            {tab !== 'overview' && <button className="admin-back-overview" type="button" onClick={returnToOverview}><ArrowLeft size={15} /> Quay lại tổng quan</button>}
            <div className="admin-page-title-copy"><span className="eyebrow"><span /> MỘC MIÊN FLOWER STUDIO</span><h1>{tab === 'overview' ? 'Một ngày thật đẹp ở tiệm.' : tab === 'products' ? 'Những bó hoa trong tiệm.' : tab === 'inventory' ? 'Kho hoa & số lượng tồn.' : tab === 'categories' ? 'Những nhóm hoa của tiệm.' : tab === 'orders' ? 'Đơn hàng & lời nhắn.' : tab === 'payments' ? 'Đối soát chuyển khoản.' : tab === 'staff' ? 'Những người chăm sóc tiệm.' : 'Những người thương Mộc Miên.'}</h1><p>{tab === 'overview' ? 'Đây là những gì đang diễn ra tại cửa hàng.' : tab === 'staff' ? 'Tạo, cập nhật thông tin và thu hồi tài khoản nhân viên.' : tab === 'inventory' ? 'Kiểm kê số lượng từng mặt hàng và nhận biết sản phẩm sắp hết.' : tab === 'categories' ? 'Thêm, chỉnh sửa hoặc xóa danh mục sản phẩm.' : tab === 'payments' ? 'Chỉ xác nhận thành công sau khi đã kiểm tra giao dịch trong tài khoản ngân hàng.' : 'Quản lý dữ liệu cửa hàng và cập nhật trạng thái ngay tại đây.'}</p></div>
            <button className="admin-refresh" onClick={() => load()}><RefreshCw size={14} /> Làm mới</button>
          </div>
          {error && <div className="admin-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Đóng lỗi"><X size={14} /></button></div>}
          {loading ? <div className="admin-loading"><RefreshCw size={18} /> Đang tải dữ liệu cửa hàng...</div> : <>
            {tab === 'overview' && stats && <div className="admin-overview">
              <div className="stat-grid">
                <button className="admin-stat-link" type="button" onClick={() => { setSearch(''); setPaidOrdersOnly(false); setTab('orders'); }} aria-label={`Xem ${stats.totalOrders} đơn hàng`}>
                  <span className="stat-icon"><ShoppingBag size={17} /></span><small>TỔNG ĐƠN HÀNG</small><b>{stats.totalOrders}</b><span>{stats.todayOrders} đơn trong hôm nay</span>
                </button>
                <button className="admin-stat-link" type="button" onClick={() => { setSearch(''); setPaidOrdersOnly(true); setTab('orders'); }} aria-label={`Xem các đơn đã xác nhận thanh toán, doanh thu ${formatPrice(stats.confirmedRevenue)}`}>
                  <span className="stat-icon"><CircleDollarSign size={17} /></span><small>DOANH THU ĐÃ XÁC NHẬN</small><b>{formatPrice(stats.confirmedRevenue)}</b><span>Bấm để xem đơn đã thanh toán</span>
                </button>
                <button className="admin-stat-link" type="button" onClick={() => openInventory('all')} aria-label={`Xem kho, tổng số lượng ${stats.totalStock}`}>
                  <span className="stat-icon"><Boxes size={17} /></span><small>TỔNG SỐ LƯỢNG TRONG KHO</small><b>{stats.totalStock}</b><span>Bấm để xem danh sách tồn kho</span>
                </button>
                <button className="admin-stat-link" type="button" onClick={() => openInventory('low')} aria-label={`Xem ${stats.lowStock} sản phẩm sắp hết hàng`}>
                  <span className="stat-icon"><Boxes size={17} /></span><small>SẮP HẾT HÀNG</small><b>{stats.lowStock}</b><span>Bấm để xem sản phẩm còn tối đa 3</span>
                </button>
              </div>
              <section className="admin-card revenue-chart-card">
                <div className="revenue-chart-heading">
                  <div>
                    <h2>Doanh thu theo thời gian</h2>
                    <p>Chỉ tính đơn đã thanh toán, không bao gồm đơn đã hủy.</p>
                  </div>
                  <div className="revenue-period-tabs" role="group" aria-label="Khoảng thời gian biểu đồ doanh thu">
                    {Object.entries(revenuePeriods).map(([period, option]) => (
                      <button
                        key={period}
                        type="button"
                        className={revenuePeriod === period ? 'selected' : ''}
                        aria-pressed={revenuePeriod === period}
                        onClick={() => setRevenuePeriod(period)}
                      >{option.label}</button>
                    ))}
                  </div>
                </div>

                  {(() => {
                    const trend = getRevenueTrend(revenueChartData);
                    const total = revenueChartData.reduce((sum, item) => sum + item.revenue, 0);
                    const peakPeriod = revenueChartData.find((item) => item.revenue === maxRevenue && maxRevenue > 0);
                    const peakShare = total > 0 ? Math.max(1, Math.round((maxRevenue / total) * 100)) : 0;
                    const rangeLabel = revenuePeriod === 'day' ? '14 ngày gần nhất' : revenuePeriod === 'month' ? '12 tháng gần nhất' : '5 năm gần nhất';
                    const lineChartWidth = Math.max(560, revenueChartData.length * 48);
                    const lineChartHeight = 220;
                    const linePlot = { left: 52, right: lineChartWidth - 18, top: 16, bottom: 174 };
                    const linePlotHeight = linePlot.bottom - linePlot.top;
                    const lineMaximum = maxRevenue || 1;
                    const linePoints = revenueChartData.map((item, index) => ({
                      ...item,
                      x: linePlot.left + (index / Math.max(revenueChartData.length - 1, 1)) * (linePlot.right - linePlot.left),
                      y: linePlot.bottom - (item.revenue / lineMaximum) * linePlotHeight,
                    }));
                    const linePath = linePoints.reduce((path, point, index) => {
                      if (index === 0) return `M ${point.x} ${point.y}`;
                      const previous = linePoints[index - 1];
                      const midpoint = (previous.x + point.x) / 2;
                      return `${path} Q ${midpoint} ${previous.y} ${point.x} ${point.y}`;
                    }, '');
                    return (
                      <>
                        <div className="revenue-summary-panel">
                          <span>GIAI ĐOẠN<strong>{rangeLabel}</strong></span>
                          <span>TỔNG DOANH THU<strong>{formatPrice(total)}</strong></span>
                        </div>

                        <div className="revenue-chart-legend">
                          <span><i className="revenue-legend-dot" />Doanh thu đơn đã thanh toán</span>
                          <span className={`revenue-legend-trend ${trend.direction}`}>So với nửa kỳ trước: {trend.percentage === null
                            ? trend.direction === 'up' ? 'mới phát sinh' : 'chưa có doanh thu'
                            : `${trend.direction === 'down' ? '−' : trend.direction === 'up' ? '+' : ''}${trend.percentage.toFixed(1)}%`}</span>
                        </div>

                        <div className="revenue-chart-scroll">
                          {(() => {
                            return (
                              <div
                                className="revenue-column-chart"
                                role="img"
                                aria-label={`Biểu đồ cột doanh thu theo ${revenuePeriods[revenuePeriod].label.toLowerCase()}`}
                              >
                                <div className="revenue-column-y-axis" aria-hidden="true">
                                  {[4, 3, 2, 1, 0].map((step) => (
                                    <span key={step}>{formatRevenueAxis(maxRevenue * step / 4)}</span>
                                  ))}
                                </div>
                                <div className="revenue-column-plot">
                                  <div className="revenue-column-gridlines" aria-hidden="true">
                                    {[0, 1, 2, 3, 4].map((step) => (
                                      <i key={step} style={{ top: `${step * 25}%` }} />
                                    ))}
                                  </div>
                                  <div
                                    className="revenue-columns"
                                    style={{
                                      gridTemplateColumns: `repeat(${revenueChartData.length}, minmax(24px, 1fr))`,
                                      minWidth: `${Math.max(560, revenueChartData.length * 76)}px`,
                                    }}
                                  >
                                    {revenueChartData.map((item, index) => {
                                      const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                                      const isPeak = item.revenue === maxRevenue && maxRevenue > 0;
                                      return (
                                        <div
                                          className={`revenue-column ${isPeak ? 'peak' : ''} ${item.revenue === 0 ? 'empty' : ''}`}
                                          key={item.key}
                                          title={`${item.label}: ${formatPrice(item.revenue)}`}
                                        >
                                          <div className="revenue-column-track">
                                            <div className={`revenue-column-bar ${isPeak ? 'peak' : ''}`} style={{ height: `${height}%` }} />
                                            <span className="revenue-column-value" style={{ bottom: `calc(${height}% + 6px)` }}>{formatPrice(item.revenue)}</span>
                                          </div>
                                          <span className="revenue-column-label">{item.label}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="revenue-insights">
                          <section className="revenue-insight-card revenue-line-card">
                            <div className="revenue-insight-heading">
                              <div><h3>Xu hướng doanh thu</h3><span>{rangeLabel}</span></div>
                              <strong className={`revenue-trend-pill ${trend.direction}`}>{trend.direction === 'up' ? 'Đang tăng' : trend.direction === 'down' ? 'Đang giảm' : 'Ổn định'}</strong>
                            </div>
                            <div className="revenue-line-scroll">
                              <svg
                                className="revenue-line-chart"
                                viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`}
                                style={{ width: `${lineChartWidth}px` }}
                                role="img"
                                aria-label={`Đường xu hướng doanh thu trong ${rangeLabel}`}
                              >
                                {[0, 1, 2, 3, 4].map((step) => {
                                  const y = linePlot.bottom - (step / 4) * linePlotHeight;
                                  return (
                                    <g key={step}>
                                      <line className="revenue-line-grid" x1={linePlot.left} x2={linePlot.right} y1={y} y2={y} />
                                      <text className="revenue-line-axis-label" x={linePlot.left - 8} y={y + 3} textAnchor="end">
                                        {formatRevenueAxis(maxRevenue * step / 4)}
                                      </text>
                                    </g>
                                  );
                                })}
                                <path className="revenue-line-path" d={linePath} />
                                {linePoints.map((point) => (
                                  <g key={point.key}>
                                    <title>{`${point.label}: ${formatPrice(point.revenue)}`}</title>
                                    <rect className="revenue-line-point" x={point.x - 4} y={point.y - 4} width="8" height="8" rx="1" />
                                    <text className="revenue-line-period" x={point.x} y={linePlot.bottom + 22} textAnchor="middle">{point.label}</text>
                                  </g>
                                ))}
                              </svg>
                            </div>
                          </section>

                          <section className="revenue-insight-card revenue-share-card">
                            <div className="revenue-insight-heading">
                              <div><h3>Tỷ trọng cao nhất</h3><span>{peakPeriod ? peakPeriod.label : 'Chưa có doanh thu'}</span></div>
                            </div>
                            <div className="revenue-share-donut" style={{ '--revenue-share': `${peakShare}%` }}>
                              <div><strong>{peakShare}%</strong><span>tổng doanh thu</span></div>
                            </div>
                            <p>{peakPeriod ? `${formatPrice(maxRevenue)} trong ${rangeLabel.toLowerCase()}` : 'Doanh thu sẽ được thống kê tại đây.'}</p>
                          </section>
                        </div>
                        {total === 0 && (
                          <p className="revenue-empty-note">
                            Chưa có đơn được xác nhận thanh toán trong giai đoạn này. Cột đang hiển thị 0₫ cho từng kỳ.
                          </p>
                        )}
                      </>
                    );
                  })()}

                  <div className="revenue-chart-total">
                    <span>Chỉ tính doanh thu đơn đã thanh toán, không bao gồm đơn đã hủy.</span>
                  </div>
              </section>
              <div className="admin-overview-grid">
                <section className="admin-card">
                  <h2>Đơn hàng gần đây</h2>
                  {stats.recentOrders?.length ? stats.recentOrders.map((order) => <div className="admin-recent-row" key={order.id}><span><b>{order.orderCode}</b><small>{order.recipientName}</small></span><strong>{formatPrice(order.total)}</strong><span className={`order-status status-${order.status}`}>{order.status}</span></div>) : <p className="admin-empty">Đơn hàng mới sẽ xuất hiện ở đây.</p>}
                </section>
                <section className="admin-card">
                  <h2>Hoa được chọn nhiều</h2>
                  {stats.bestSellers?.length ? stats.bestSellers.map((item, index) => <div className="bestseller-row" key={item.name}><span>{String(index + 1).padStart(2, '0')}</span><b>{item.name}</b><small>{item.quantity} cành/bó</small></div>) : <p className="admin-empty">Chưa có dữ liệu bán hàng để thống kê.</p>}
                </section>
              </div>
            </div>}
            {tab === 'products' && <section className="admin-card">
              <div className="admin-table-heading"><div><h2>Sản phẩm & tồn kho</h2><p>Thêm sản phẩm mới hoặc điều chỉnh giá, tồn kho.</p></div><button className="button-primary" onClick={() => setEditing({ ...blankProduct })}><Plus size={15} /> Thêm sản phẩm</button></div>
              <div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm sản phẩm..." /></label><span>{products.length} sản phẩm <ArrowDownUp size={13} /></span></div>
              <div className="admin-table-wrap"><table><thead><tr><th>SẢN PHẨM</th><th>PHÂN LOẠI</th><th>GIÁ</th><th>TỒN KHO</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>{filter(products, ['name', 'id']).map((product) => <tr key={product.id}><td><div className="admin-product-cell"><img src={product.image} alt="" /><span><b>{product.name}</b><small>{product.id}</small></span></div></td><td>{categories.find((item) => item.id === product.category)?.label || product.category}</td><td>{formatPrice(product.price)}</td><td><span className={product.stock <= 3 ? 'stock-low' : 'stock-ok'}>{product.stock} bó</span></td><td>{product.isActive === 0 ? <span className="product-stock-out">Đã ẩn</span> : product.stock === 0 ? <span className="product-stock-out">Hết hàng</span> : <span className="product-active"><i /> Đang bán</span>}</td><td><button className="table-text-button" onClick={() => setEditing({ ...product, oldPrice: product.oldPrice || '' })}>Sửa</button>{product.isActive === 0 ? <button className="table-text-button" onClick={() => restoreProduct(product)}>Hiện lại</button> : <button className="table-text-button" onClick={() => deleteProduct(product, false)}>Ẩn</button>}<button className="table-delete-button" onClick={() => deleteProduct(product, true)}>Xóa</button></td></tr>)}</tbody></table></div>
            </section>}
            {tab === 'inventory' && <section className="admin-card">
              <div className="admin-table-heading"><div><h2>Kiểm kê tồn kho</h2><p>Cập nhật số lượng hàng có thể bán; mặt hàng còn 3 bó trở xuống được cảnh báo.</p></div><div className="inventory-heading-actions"><button className="button-outline" type="button" onClick={() => { setEditing({ ...blankProduct }); setTab('products'); }}><Plus size={15} /> Tạo sản phẩm</button><button className="button-primary" type="button" onClick={() => setNewStockReceipt(true)}><Plus size={15} /> Nhập hàng</button></div></div>
              <div className="inventory-summary">
                <button type="button" className={`inventory-summary-card ${inventoryFilter === 'all' ? 'selected' : ''}`} onClick={() => setInventoryFilter('all')}>
                  <Boxes size={17} /><span><small>TỔNG SẢN PHẨM ĐANG BÁN</small><b>{inventory.length}</b></span>
                </button>
                <button type="button" className={`inventory-summary-card ${inventoryFilter === 'in-stock' ? 'selected' : ''}`} onClick={() => setInventoryFilter('in-stock')}>
                  <Package size={17} /><span><small>TỔNG SỐ LƯỢNG TỒN</small><b>{inventory.reduce((sum, item) => sum + Number(item.stock), 0)}</b></span>
                </button>
                <button type="button" className={`inventory-summary-card inventory-alert ${inventoryFilter === 'out-of-stock' ? 'selected' : ''}`} onClick={() => setInventoryFilter('out-of-stock')}>
                  <CircleDollarSign size={17} /><span><small>HẾT HÀNG</small><b>{inventory.filter((item) => Number(item.stock) === 0).length}</b></span>
                </button>
              </div>
              <div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên hoa hoặc mã sản phẩm..." /></label><span>{inventoryForView.length} mặt hàng</span></div>
              <div className="inventory-filter-caption">
                {inventoryFilter === 'low' ? 'Đang xem sản phẩm sắp hết (còn 1–3)' : inventoryFilter === 'in-stock' ? 'Đang xem sản phẩm còn hàng' : inventoryFilter === 'out-of-stock' ? 'Đang xem sản phẩm hết hàng' : 'Đang xem tất cả sản phẩm đang bán'}
                {inventoryFilter !== 'all' && <button type="button" onClick={() => setInventoryFilter('all')}>Xem tất cả</button>}
              </div>
              <div className="admin-table-wrap"><table><thead><tr><th>SẢN PHẨM</th><th>GIÁ BÁN</th><th>TỒN HIỆN TẠI</th><th>ĐIỀU CHỈNH SỐ LƯỢNG</th><th>CẬP NHẬT LÚC</th></tr></thead><tbody>{inventoryForView.map((product) => <tr key={product.id}><td><div className="admin-product-cell"><img src={product.image} alt="" /><span><b>{product.name}</b><small>{product.id}</small></span></div></td><td>{formatPrice(product.price)}</td><td><span className={product.stock <= 3 ? 'stock-low' : 'stock-ok'}>{product.stock} bó</span>{product.stock === 0 ? <small className="low-stock-label"> · Hết hàng</small> : product.stock <= 3 && <small className="low-stock-label"> · Sắp hết</small>}</td><td><div className="inventory-stock-controls"><div className="inventory-stock-edit"><input type="number" min="0" max="100000" aria-label={`Tồn kho thực tế ${product.name}`} value={stockDrafts[product.id] ?? product.stock} onChange={(event) => setStockDrafts({ ...stockDrafts, [product.id]: event.target.value })} /><button type="button" className="button-primary" onClick={() => saveStock(product)}>Lưu tồn</button></div><div className="inventory-stock-edit inventory-stock-add"><input type="number" min="1" max="100000" aria-label={`Số lượng nhập thêm ${product.name}`} value={stockAddDrafts[product.id] ?? 1} disabled={addingStockId === product.id} onChange={(event) => setStockAddDrafts({ ...stockAddDrafts, [product.id]: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addInventoryStock(product); } }} /><button type="button" className="button-outline" disabled={addingStockId === product.id} onClick={() => addInventoryStock(product)}>{addingStockId === product.id ? 'Đang nhập...' : 'Cộng kho'}</button></div></div></td><td>{product.updatedAt ? new Date(product.updatedAt).toLocaleString('vi-VN') : '—'}</td></tr>)}</tbody></table></div>
              {!inventoryForView.length && <p className="admin-empty">Không có sản phẩm phù hợp với mục đang xem.</p>}
              <div className="inventory-export-row"><button className="button-outline inventory-export-button" type="button" onClick={exportInventory}><Download size={14} /> Xuất Excel kiểm kê hôm nay</button><span>Báo cáo gồm tồn kho hiện tại và thời điểm xuất file.</span></div>
              <section className="stock-receipt-history"><div className="admin-table-heading"><div><h2>Phiếu nhập & tình trạng hàng về</h2><p>Hàng đang vận chuyển chưa cộng vào tồn kho; xác nhận khi đã nhận đủ hàng.</p></div><span>{stockReceipts.filter((receipt) => receipt.status === 'in_transit').length} phiếu đang nhập</span></div>{stockReceipts.length ? <div className="admin-table-wrap"><table><thead><tr><th>MÃ PHIẾU</th><th>NGÀY TẠO / NHẬN</th><th>NHÀ CUNG CẤP</th><th>SẢN PHẨM / SỐ LƯỢNG</th><th>CHI PHÍ NHẬP</th><th>TÌNH TRẠNG</th><th>NGƯỜI NHẬN</th></tr></thead><tbody>{stockReceipts.map((receipt) => <tr key={receipt.id}><td><b>{receipt.receiptCode}</b></td><td>{new Date(receipt.receivedAt || receipt.createdAt).toLocaleString('vi-VN')}{receipt.status === 'in_transit' && <small className="receipt-note">Đang chờ hàng về</small>}</td><td>{receipt.supplierName}{receipt.note && <small className="receipt-note">{receipt.note}</small>}</td><td>{receipt.items.map((item) => <span className="receipt-item" key={`${receipt.id}-${item.productId}`}>{item.productName} × {item.quantity}</span>)}</td><td>{formatPrice(receipt.totalCost)}</td><td><span className={`receipt-status receipt-status-${receipt.status}`}>{receiptStatusLabels[receipt.status] || receipt.status}</span>{receipt.status === 'in_transit' && <button className="table-text-button" disabled={receivingReceiptId === receipt.id} onClick={() => confirmReceiptArrival(receipt)}>{receivingReceiptId === receipt.id ? 'Đang xác nhận...' : 'Xác nhận đã về'}</button>}</td><td>{receipt.receivedBy || 'Tài khoản đã xóa'}</td></tr>)}</tbody></table></div> : <p className="admin-empty">Chưa có phiếu nhập hàng. Chọn “Nhập hàng” để ghi nhận lần nhập đầu tiên.</p>}</section>
            </section>}
            {tab === 'categories' && <section className="admin-card"><div className="admin-table-heading"><div><h2>Danh mục sản phẩm</h2><p>Tổ chức các bộ sưu tập hoa trong cửa hàng.</p></div><button className="button-primary" onClick={() => setNewCategory(true)}><Plus size={15} /> Thêm danh mục</button></div><div className="admin-table-wrap"><table><thead><tr><th>TÊN DANH MỤC</th><th>ĐƯỜNG DẪN</th><th>SẢN PHẨM ĐANG BÁN</th><th></th></tr></thead><tbody>{serverCategories.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td><code>{item.slug}</code></td><td>{item.productCount}</td><td><button className="table-text-button" onClick={() => setEditingCategory(item)}>Sửa</button><button className="table-delete-button" onClick={() => removeCategory(item)}>Xóa</button></td></tr>)}</tbody></table></div>{!serverCategories.length && <p className="admin-empty">Chưa có danh mục sản phẩm.</p>}</section>}
            {tab === 'orders' && <section className="admin-card"><div className="admin-table-heading"><div><h2>{paidOrdersOnly ? 'Đơn đã xác nhận thanh toán' : 'Tất cả đơn hàng'}</h2><p>{paidOrdersOnly ? 'Danh sách đơn đã thanh toán, không bao gồm đơn đã hủy.' : 'Đơn mới nhất hiển thị trước; tiến trình giao hàng và trạng thái thanh toán.'}</p></div><div className="inventory-heading-actions"><button className="button-outline" type="button" onClick={() => exportOrdersWorkbook({ orders: ordersForView, exportedBy: user?.fullName })}><Download size={14} /> Xuất Excel đơn hàng</button>{paidOrdersOnly && <button className="button-outline" type="button" onClick={() => setPaidOrdersOnly(false)}>Xem tất cả đơn</button>}</div></div><div className="admin-filter-pills">{[['all', 'Tất cả'], ['pending', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'], ['preparing', 'Đang chuẩn bị'], ['shipping', 'Đang giao'], ['delivered', 'Đã giao'], ['cancelled', 'Đã hủy']].map(([key, label]) => <button key={key} type="button" className={orderStatusFilter === key ? 'filter-pill active' : 'filter-pill'} onClick={() => setOrderStatusFilter(key)}>{label}</button>)}</div><div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn, tên, SĐT..." /></label><span>{ordersForView.length} đơn hàng</span></div><div className="admin-table-wrap"><table><thead><tr><th>MÃ ĐƠN / NGƯỜI NHẬN</th><th>NGÀY GIAO</th><th>TỔNG ĐƠN</th><th>THANH TOÁN</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>{ordersForView.map((order) => <tr key={order.id}><td><div className="admin-product-cell"><span><b>{order.orderCode}</b><small>{order.recipientName} · {order.phone}</small></span></div></td><td>{new Date(order.deliveryDate).toLocaleDateString('vi-VN')}</td><td>{formatPrice(order.total)}</td><td><span className={`payment-pill ${order.paymentStatus === 'paid' ? 'paid' : ''}`}>{order.paymentStatus === 'paid' ? 'Đã thanh toán' : order.paymentMethod === 'bank_transfer' ? order.paymentReportedAt ? 'Khách đã báo chuyển' : 'Chờ khách chuyển' : 'COD · Chưa thu'}</span></td><td><select className="status-select" value={order.status} disabled={['delivered', 'cancelled'].includes(order.status)} onChange={(e) => setOrderStatus(order, e.target.value)}><option value="pending">Chờ xác nhận</option>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><button className="table-text-button" onClick={() => setInvoiceOrder(order)}>Chi tiết / Bill</button></td></tr>)}</tbody></table></div>{!ordersForView.length && <p className="admin-empty">Không có đơn thanh toán phù hợp.</p>}</section>}
            {tab === 'payments' && <section className="admin-card"><div className="admin-table-heading"><div><h2>Chuyển khoản ngân hàng</h2><p>Đơn khách đã báo chuyển cần được đối chiếu với giao dịch thực tế trong MB Bank.</p></div></div><div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn, tên khách..." /></label><span>{payments.filter((order) => order.paymentStatus === 'pending_confirmation').length} giao dịch chờ xác nhận</span></div><div className="admin-table-wrap"><table><thead><tr><th>MÃ ĐƠN / KHÁCH</th><th>SỐ TIỀN</th><th>KHÁCH BÁO CHUYỂN</th><th>BILL CHUYỂN KHOẢN</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{filter(payments, ['orderCode', 'customerName', 'customerEmail']).map((order) => <tr key={order.id}><td><div className="admin-product-cell"><span><b>{order.orderCode}</b><small>{order.customerName || order.recipientName} · {order.phone}</small></span></div></td><td><b>{formatPrice(order.total)}</b></td><td>{order.paymentReportedAt ? new Date(order.paymentReportedAt).toLocaleString('vi-VN') : 'Chưa báo'}</td><td><PaymentProof orderId={order.id} hasProof={Boolean(order.hasPaymentProof)} uploadedAt={order.paymentProofUploadedAt} /></td><td><span className={`payment-pill ${order.paymentStatus === 'paid' ? 'paid' : ''}`}>{order.paymentStatus === 'paid' ? `Đã xác nhận${order.paymentConfirmedBy ? ` · ${order.paymentConfirmedBy}` : ''}` : order.paymentReportedAt ? 'Chờ đối soát' : 'Chờ khách chuyển'}</span></td><td>{order.paymentStatus === 'pending_confirmation' && order.paymentReportedAt ? <button className="button-primary payment-confirm-button" onClick={() => confirmPayment(order)}>Xác nhận đã nhận tiền</button> : '—'}</td></tr>)}</tbody></table></div>{!payments.length && <p className="admin-empty">Chưa có đơn chuyển khoản.</p>}</section>}
            {tab === 'customers' && <section className="admin-card"><div className="admin-table-heading"><div><h2>Danh sách khách hàng</h2><p>Theo dõi tài khoản khách hàng, số đơn đã đặt và tổng giá trị mua sắm.</p></div></div><div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, email hoặc SĐT..." /></label><span>{customers.length} khách hàng</span></div><div className="admin-table-wrap"><table><thead><tr><th>KHÁCH HÀNG</th><th>EMAIL</th><th>ĐIỆN THOẠI</th><th>SỐ ĐƠN</th><th>TỔNG CHI TIÊU</th><th>NGÀY THAM GIA</th></tr></thead><tbody>{filter(customers, ['fullName', 'email', 'phone']).map((customer) => <tr key={customer.id}><td><b>{customer.fullName}</b></td><td>{customer.email}</td><td>{customer.phone || '—'}</td><td>{customer.orderCount || 0} đơn</td><td>{formatPrice(customer.lifetimeValue || 0)}</td><td>{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('vi-VN') : '—'}</td></tr>)}</tbody></table></div>{!customers.length && <p className="admin-empty">Chưa có khách hàng đăng ký.</p>}</section>}
            {tab === 'staff' && <section className="admin-card"><div className="admin-table-heading"><div><h2>Quản lý nhân viên</h2><p>Quản lý riêng tài khoản, thông tin liên hệ và quyền đăng nhập của nhân viên.</p></div><button className="button-primary" onClick={() => { setEditingStaff(null); setNewStaff(true); }}><Plus size={15} /> Tạo nhân viên</button></div><div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên hoặc email..." /></label><span>{staff.length} nhân viên</span></div><div className="admin-table-wrap"><table><thead><tr><th>NHÂN VIÊN</th><th>EMAIL ĐĂNG NHẬP</th><th>ĐIỆN THOẠI</th><th>NGÀY TẠO</th><th></th></tr></thead><tbody>{filter(staff, ['fullName', 'email', 'phone']).map((employee) => <tr key={employee.id}><td><b>{employee.fullName}</b></td><td>{employee.email}</td><td>{employee.phone || '—'}</td><td>{new Date(employee.createdAt).toLocaleDateString('vi-VN')}</td><td><button className="table-text-button" onClick={() => { setEditingStaff(employee); setNewStaff(true); }}>Sửa</button><button className="table-delete-button" onClick={() => removeStaff(employee)}>Thu hồi quyền</button></td></tr>)}</tbody></table></div>{!staff.length && <p className="admin-empty">Chưa có nhân viên. Bấm “Tạo nhân viên” để cấp tài khoản riêng.</p>}</section>}
            {tab === 'ai' && <section className="admin-card"><div className="admin-table-heading"><div><h2>Lịch sử tư vấn AI</h2><p>Các cuộc hội thoại được lưu cho tài khoản đã đăng nhập.</p></div></div><div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm nội dung tư vấn..." /></label><span>{aiHistory.length} tin nhắn gần nhất</span></div><div className="admin-ai-history">{filter(aiHistory, ['customerName', 'email', 'content']).map((item, index) => <article key={`${item.sessionId}-${item.createdAt}-${index}`}><span className={item.role === 'assistant' ? 'history-ai-role' : 'history-user-role'}>{item.role === 'assistant' ? 'MIÊN' : 'KHÁCH HÀNG'}</span><div><b>{item.customerName || 'Khách ghé thăm'}{item.email ? ` · ${item.email}` : ''}</b><p>{item.content}</p>{item.retrievedProducts && <small>Sản phẩm được truy xuất: {JSON.stringify(item.retrievedProducts)}</small>}</div><time>{new Date(item.createdAt).toLocaleString('vi-VN')}</time></article>)}</div></section>}
          </>}
        </main>
      </div>
      {invoiceOrder && <OrderInvoice order={invoiceOrder} onClose={() => setInvoiceOrder(null)} onProofUploaded={(result) => {
        setInvoiceOrder((current) => current ? { ...current, ...result } : current);
        setOrders((current) => current.map((order) => order.id === result.id ? { ...order, ...result } : order));
      }} />}
      {editing && <div className="admin-form-backdrop"><form className="admin-product-form" onSubmit={saveProduct}><header><div><small>{editing.id ? 'CẬP NHẬT DANH MỤC' : 'THÊM MỘT BÓ HOA MỚI'}</small><h2>{editing.id ? `Chỉnh sửa ${editing.name}` : 'Thông tin sản phẩm'}</h2></div><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Đóng"><X /></button></header><div className="admin-form-grid"><label>Tên sản phẩm<input name="name" defaultValue={editing.name} required minLength="2" /></label><label>Danh mục<select name="category" defaultValue={editing.category}>{(serverCategories.length ? serverCategories.map((item) => ({ id: item.slug, label: item.name })) : categories.filter((item) => item.id !== 'all')).map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select><ChevronDown size={13} /></label><label>Giá bán (₫)<input name="price" type="number" min="0" defaultValue={editing.price} required /></label><label>Giá cũ (₫)<input name="oldPrice" type="number" min="0" defaultValue={editing.oldPrice || ''} /></label><label>Loài hoa<input name="flowerType" defaultValue={editing.flowerType} required /></label><label>Số lượng / cách bó<input name="flowerCount" defaultValue={editing.flowerCount} required /></label><label>Màu sắc<input name="color" defaultValue={editing.color} required /></label><label>Dịp phù hợp<input name="occasion" defaultValue={editing.occasion} required /></label><label>Tồn kho<input name="stock" type="number" min="0" defaultValue={editing.stock ?? 10} required /></label><label>Đường dẫn ảnh<div className="image-upload-row"><input name="image" type="text" defaultValue={editing.image} key={editing.image} required /><label className="button-outline image-pick-button">Chọn ảnh<input type="file" accept="image/*" hidden onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const dataUrl = await compressProductImage(file); setEditing((cur) => ({ ...cur, image: dataUrl })); }} /></label></div></label><label className="form-full">Mô tả<textarea name="description" rows="3" defaultValue={editing.description} required /></label><label className="form-full">Cách gói<input name="wrapping" defaultValue={editing.wrapping} required /></label></div><footer><button type="button" className="button-outline" onClick={() => setEditing(null)}>Hủy</button><button className="button-primary"><Check size={15} /> Lưu sản phẩm & lập chỉ mục RAG</button></footer></form></div>}
      {newCategory && <div className="admin-form-backdrop"><form className="admin-category-form" onSubmit={createCategory}><header><div><small>THÊM DANH MỤC HOA</small><h2>Tạo bộ sưu tập mới</h2></div><button type="button" className="icon-button" onClick={() => setNewCategory(false)} aria-label="Đóng"><X /></button></header><label>Tên danh mục<input name="name" required minLength="2" placeholder="Ví dụ: Hoa baby" /></label><label>Mã danh mục (chữ thường, không dấu)<input name="slug" required pattern="[a-z0-9-]{2,60}" placeholder="hoa-baby" /></label><label>Mô tả<textarea name="description" rows="2" /></label><footer><button type="button" className="button-outline" onClick={() => setNewCategory(false)}>Hủy</button><button className="button-primary">Tạo danh mục</button></footer></form></div>}
      {editingCategory && <div className="admin-form-backdrop"><form className="admin-category-form" onSubmit={saveCategory}><header><div><small>CHỈNH SỬA DANH MỤC</small><h2>{editingCategory.name}</h2></div><button type="button" className="icon-button" onClick={() => setEditingCategory(null)} aria-label="Đóng"><X /></button></header><label>Tên danh mục<input name="name" required minLength="2" maxLength="120" defaultValue={editingCategory.name} /></label><label>Mã danh mục<input value={editingCategory.slug} disabled /></label><label>Mô tả<textarea name="description" rows="3" maxLength="500" defaultValue={editingCategory.description || ''} /></label><small className="staff-hint">Mã danh mục được giữ nguyên để không làm gián đoạn các sản phẩm đang sử dụng danh mục này.</small><footer><button type="button" className="button-outline" onClick={() => setEditingCategory(null)}>Hủy</button><button className="button-primary"><Check size={14} /> Lưu thay đổi</button></footer></form></div>}
      {newStockReceipt && <div className="admin-form-backdrop"><form className="admin-category-form" onSubmit={receiveStock}><header><div><small>PHIẾU NHẬP KHO</small><h2>Tạo phiếu nhập hàng</h2></div><button type="button" className="icon-button" onClick={() => setNewStockReceipt(false)} aria-label="Đóng"><X /></button></header><label>Sản phẩm<select name="productId" required defaultValue=""><option value="" disabled>Chọn sản phẩm cần nhập</option>{inventory.map((product) => <option key={product.id} value={product.id}>{product.name} · tồn {product.stock}</option>)}</select></label><label>Số lượng dự kiến nhập (bó)<input name="quantity" type="number" min="1" max="100000" required defaultValue="1" /></label><label>Giá nhập mỗi bó (₫)<input name="unitCost" type="number" min="0" max="100000000" required placeholder="Ví dụ: 150000" /></label><label>Nhà cung cấp<input name="supplierName" required minLength="2" maxLength="160" placeholder="Tên nhà vườn / nhà cung cấp" /></label><label>Ghi chú<textarea name="note" rows="2" maxLength="500" placeholder="Mã hóa đơn hoặc ghi chú thêm (không bắt buộc)" /></label><small className="staff-hint">Phiếu mới sẽ hiện “Đang nhập về”. Tồn kho chỉ tăng sau khi bấm “Xác nhận đã về”.</small><footer><button type="button" className="button-outline" onClick={() => setNewStockReceipt(false)}>Hủy</button><button className="button-primary"><Truck size={14} /> Tạo phiếu nhập</button></footer></form></div>}
      {newStaff && <div className="admin-form-backdrop"><form className="admin-category-form" onSubmit={createStaff}><header><div><small>TÀI KHOẢN CỬA HÀNG</small><h2>{editingStaff ? 'Cập nhật nhân viên' : 'Tạo tài khoản nhân viên'}</h2></div><button type="button" className="icon-button" onClick={() => { setNewStaff(false); setEditingStaff(null); }} aria-label="Đóng"><X /></button></header><label>Họ tên<input name="fullName" required minLength="2" defaultValue={editingStaff?.fullName || ''} placeholder="Tên nhân viên" /></label>{!editingStaff && <label>Email đăng nhập<input name="email" type="email" required placeholder="nhanvien@example.com" /></label>}{editingStaff && <label>Email đăng nhập<input value={editingStaff.email} disabled /></label>}<label>Số điện thoại<input name="phone" type="tel" defaultValue={editingStaff?.phone || ''} placeholder="09xx xxx xxx" /></label><label>{editingStaff ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu khởi tạo (ít nhất 12 ký tự)'}<input name="password" type="password" required={!editingStaff} minLength="12" autoComplete="new-password" /></label><small className="staff-hint">Tài khoản này chỉ có quyền kho và đơn giao hàng, không có quyền quản trị.</small><footer><button type="button" className="button-outline" onClick={() => { setNewStaff(false); setEditingStaff(null); }}>Hủy</button><button className="button-primary">{editingStaff ? 'Lưu thay đổi' : 'Tạo tài khoản'}</button></footer></form></div>}
    </section>
  );
}
