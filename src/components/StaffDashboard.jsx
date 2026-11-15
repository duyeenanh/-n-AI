import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Boxes, Check, ChevronDown, Clock3, CircleDollarSign, Download, MapPin, MessageCircle, Package, Plus, RefreshCw,
  Search, Send, ShoppingBag, Truck, X,
} from 'lucide-react';
import { apiFetch } from '../api.js';
import { categories, formatPrice } from '../data/products.js';
import { exportInventoryWorkbook } from '../utils/exportInventory.js';
import { compressProductImage } from '../utils/imageFile.js';
import OrderInvoice from './OrderInvoice.jsx';
import PaymentProof from './PaymentProof.jsx';

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const nextStatus = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'shipping',
};

const nextAction = {
  pending: 'Xác nhận đơn',
  confirmed: 'Bắt đầu chuẩn bị',
  preparing: 'Bàn giao giao hàng',
};

const dateLabel = (value) => value ? new Date(value).toLocaleString('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '';

const blankStaffProduct = {
  name: '', category: 'roses', price: '', oldPrice: '', description: '',
  flowerType: '', flowerCount: '', wrapping: 'Giấy gói thủ công Mộc Miên',
  color: '', occasion: '', image: '', stock: 0,
};

export default function StaffDashboard({ user, onClose, onHome = onClose, onLogout, notify }) {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStock, setEditingStock] = useState(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productCategories, setProductCategories] = useState(categories.filter((item) => item.id !== 'all'));
  const [stockMode, setStockMode] = useState('set');
  const [stockValue, setStockValue] = useState('');
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [busyStockId, setBusyStockId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const load = async (section = tab) => {
    setLoading(true);
    setError('');
    try {
      if (section === 'overview') {
        const [summary, currentOrders, stock] = await Promise.all([
          apiFetch('/staff/overview'),
          apiFetch('/staff/orders'),
          apiFetch('/staff/inventory'),
        ]);
        setOverview(summary);
        setOrders(currentOrders);
        setInventory(stock);
      }
      if (section === 'inventory') setInventory(await apiFetch(`/staff/inventory?q=${encodeURIComponent(search)}`));
      if (section === 'outofstock') setInventory(await apiFetch('/staff/inventory'));
      if (section === 'orders') setOrders(await apiFetch('/staff/orders'));
      if (section === 'payments') setPayments(await apiFetch('/staff/payments'));
      if (section === 'messages') {
        const inbox = await apiFetch('/staff/conversations');
        setConversations(inbox);
        const conversationId = activeConversationId && inbox.some((item) => item.id === activeConversationId)
          ? activeConversationId
          : inbox[0]?.id || null;
        setActiveConversationId(conversationId);
        setMessages(conversationId
          ? await apiFetch(`/staff/conversations/${conversationId}/messages`)
          : []);
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(tab); }, [tab]);

  useEffect(() => {
    if (!['overview', 'inventory', 'outofstock'].includes(tab)) return undefined;
    const refreshInventory = async () => {
      try {
        const stock = await apiFetch('/staff/inventory');
        setInventory(stock);
        if (tab === 'overview') setOverview(await apiFetch('/staff/overview'));
      } catch (err) {
        setError(err.message);
      }
    };
    const timer = window.setInterval(refreshInventory, 10000);
    window.addEventListener('focus', refreshInventory);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshInventory);
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== 'payments') return undefined;
    const refreshPayments = () => apiFetch('/staff/payments')
      .then(setPayments)
      .catch((err) => setError(err.message));
    const timer = window.setInterval(refreshPayments, 10000);
    window.addEventListener('focus', refreshPayments);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshPayments);
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== 'messages') return undefined;
    let mounted = true;
    let requesting = false;
    const refreshMessages = async () => {
      if (requesting) return;
      requesting = true;
      try {
        const inbox = await apiFetch('/staff/conversations');
        if (!mounted) return;
        setConversations(inbox);
        const conversationId = activeConversationId && inbox.some((item) => item.id === activeConversationId)
          ? activeConversationId
          : inbox[0]?.id || null;
        if (conversationId !== activeConversationId) setActiveConversationId(conversationId);
        if (conversationId) {
          const thread = await apiFetch(`/staff/conversations/${conversationId}/messages`);
          if (mounted) setMessages(thread);
        } else if (mounted) {
          setMessages([]);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        requesting = false;
      }
    };
    refreshMessages();
    const timer = window.setInterval(refreshMessages, 5000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [tab, activeConversationId]);

  const updateStatus = async (order) => {
    const status = nextStatus[order.status];
    if (!status || busyOrderId === order.id) return;
    setBusyOrderId(order.id);
    try {
      await apiFetch(`/staff/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const refreshed = await load(tab);
      notify(refreshed
        ? `${order.orderCode}: ${statusLabels[status]}. Đã ghi vào lịch sử theo dõi đơn.`
        : `Đã cập nhật ${order.orderCode} sang “${statusLabels[status]}”, nhưng chưa tải lại được dữ liệu. Bấm Làm mới để cập nhật màn hình.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyOrderId(null);
    }
  };

  const updateOrderProof = (result) => {
    setOrders((current) => current.map((order) => order.id === result.id ? { ...order, ...result } : order));
    setPayments((current) => current.map((order) => order.id === result.id ? { ...order, ...result } : order));
  };

  const confirmPayment = async (order) => {
    try {
      await apiFetch(`/payments/${order.id}/confirm`, { method: 'POST', body: '{}' });
      const [updatedOrders, updatedPayments] = await Promise.all([
        apiFetch('/staff/orders'),
        apiFetch('/staff/payments'),
      ]);
      setOrders(updatedOrders);
      setPayments(updatedPayments);
      notify(`Đã xác nhận đã nhận khoản chuyển khoản đơn ${order.orderCode}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const saveStock = async (product) => {
    const stock = Number(stockValue);
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 100000) {
      setError('Số lượng tồn kho phải là số nguyên từ 0 đến 100.000.');
      return;
    }
    if (busyStockId === product.id) return;
    setBusyStockId(product.id);
    try {
      await apiFetch(`/staff/inventory/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock, note: 'Kiểm kê từ trang nhân viên.' }),
      });
      setEditingStock(null);
      const refreshed = await load(tab);
      notify(refreshed
        ? `Đã cập nhật tồn kho “${product.name}” còn ${stock} bó.`
        : `Đã lưu tồn kho “${product.name}” là ${stock} bó, nhưng chưa tải lại được dữ liệu. Bấm Làm mới để cập nhật màn hình.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyStockId(null);
    }
  };

  const addStock = async (product) => {
    const quantity = Number(stockValue);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) {
      setError('Số lượng nhập thêm phải là số nguyên từ 1 đến 100.000.');
      return;
    }
    if (busyStockId === product.id) return;
    setBusyStockId(product.id);
    try {
      const updatedProduct = await apiFetch(`/staff/inventory/${product.id}/add`, {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      });
      setEditingStock(null);
      const refreshed = await load(tab);
      notify(updatedProduct.indexingWarning || (refreshed
        ? `Đã nhập thêm ${quantity} bó “${product.name}”; tồn kho hiện tại ${updatedProduct.stock} bó.`
        : `Đã nhập thêm ${quantity} bó “${product.name}”, tồn kho hiện tại ${updatedProduct.stock} bó; bấm Làm mới nếu số liệu chưa cập nhật.`));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyStockId(null);
    }
  };

  const createProduct = async (event) => {
    event.preventDefault();
    if (savingProduct) return;
    const form = new FormData(event.currentTarget);
    setSavingProduct(true);
    try {
      const product = await apiFetch('/staff/products', {
        method: 'POST',
        body: JSON.stringify({
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
        }),
      });
      setCreatingProduct(false);
      const refreshed = await load('inventory');
      notify(product.indexingWarning || (refreshed
        ? `Đã tạo sản phẩm “${product.name}” và cập nhật tài liệu tư vấn.`
        : `Đã tạo sản phẩm “${product.name}”, nhưng chưa tải lại được kho. Bấm Làm mới để cập nhật màn hình.`));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const openProductForm = async () => {
    try {
      const currentCategories = await apiFetch('/categories');
      setProductCategories(currentCategories);
      setCreatingProduct(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const exportInventory = async () => {
    try {
      await exportInventoryWorkbook({ products: inventory, exportedBy: user?.fullName, role: 'nhan-vien' });
      notify('Đã xuất báo cáo kiểm kê kho hoa hôm nay.');
    } catch (err) {
      setError(`Không xuất được file kiểm kê Excel: ${err.message}`);
    }
  };

  const filteredInventory = useMemo(() => inventory.filter((product) => (
    `${product.name} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase())
  )), [inventory, search]);

  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const filteredOrders = useMemo(() => orders.filter((order) => (
    (orderStatusFilter === 'all' || order.status === orderStatusFilter)
    && `${order.orderCode} ${order.recipientName} ${order.phone} ${order.address}`.toLowerCase().includes(search.trim().toLowerCase())
  )), [orders, search, orderStatusFilter]);

  const navigateTo = (section) => {
    setTab(section);
    setSearch('');
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!activeConversationId || !messageDraft.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      await apiFetch(`/staff/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: messageDraft }),
      });
      setMessageDraft('');
      const [thread, inbox] = await Promise.all([
        apiFetch(`/staff/conversations/${activeConversationId}/messages`),
        apiFetch('/staff/conversations'),
      ]);
      setMessages(thread);
      setConversations(inbox);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <section className="admin-shell staff-shell" aria-label="Trang nhân viên Mộc Miên">
      <header className="admin-topbar">
        <button className="admin-brand" type="button" onClick={onHome} aria-label="Mộc Miên, về trang cửa hàng"><span>✿</span><b>mộc miên<small>STAFF WORKSPACE · VỀ CỬA HÀNG</small></b></button>
        <div className="staff-user"><span className="staff-user-avatar">{user?.fullName?.slice(0, 1) || 'N'}</span><span><b>{user?.fullName}</b><small>Nhân viên cửa hàng</small></span></div>
        <div className="admin-top-actions"><button className="admin-logout-button" onClick={onLogout}>Đăng xuất</button><button className="icon-button" onClick={onClose} aria-label="Đóng trang nhân viên"><X /></button></div>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <small>TÁC NGHIỆP CỬA HÀNG</small>
          {[
            ['overview', Clock3, 'Công việc hôm nay'],
            ['inventory', Boxes, 'Kho hoa'],
            ['outofstock', Package, 'Mặt hàng hết'],
            ['orders', Truck, 'Đơn & giao hàng'],
            ['payments', CircleDollarSign, 'Thanh toán'],
            ['messages', MessageCircle, 'Tin nhắn khách'],
          ].map(([id, Icon, label]) => <button key={id} className={tab === id ? 'admin-nav selected' : 'admin-nav'} aria-current={tab === id ? 'page' : undefined} onClick={() => navigateTo(id)}>
            <Icon size={17} />{label}<ArrowRight size={13} />
          </button>)}
          <div className="admin-sidebar-bottom"><span>NHÂN VIÊN ĐƯỢC PHÉP</span><p>Kiểm kê số lượng và cập nhật tiến trình đơn hàng. Quyền quản trị và dữ liệu khách hàng được giới hạn.</p></div>
        </aside>
        <main className="admin-content">
          <div className={`admin-page-title ${tab !== 'overview' ? 'has-back' : ''}`}>
            {tab !== 'overview' && <button className="admin-back-overview" type="button" onClick={() => navigateTo('overview')}><ArrowLeft size={15} /> Quay lại công việc hôm nay</button>}
            <div className="admin-page-title-copy"><span className="eyebrow"><span /> MỘC MIÊN · NHÂN VIÊN</span><h1>{tab === 'overview' ? 'Mình cùng chăm tiệm nhé.' : tab === 'inventory' ? 'Kho hoa hôm nay.' : tab === 'outofstock' ? 'Hoa cần tư vấn thay thế.' : tab === 'orders' ? 'Những bó hoa đang trên đường.' : tab === 'payments' ? 'Đối soát chuyển khoản.' : 'Mình đang lắng nghe khách.'}</h1><p>{tab === 'overview' ? 'Theo dõi tồn kho và giúp từng đơn hoa đến đúng người.' : tab === 'inventory' ? 'Kiểm tra số lượng còn lại và cập nhật ngay sau khi kiểm kê.' : tab === 'outofstock' ? 'Các mặt hàng hết hàng cùng gợi ý hoa còn kho để bạn tư vấn khách.' : tab === 'orders' ? 'Mỗi lần chuyển trạng thái đều được lưu để khách theo dõi.' : tab === 'payments' ? 'Kiểm tra tài khoản ngân hàng trước khi xác nhận đã nhận tiền.' : 'Trả lời trực tiếp tin nhắn của khách hàng trên website.'}</p></div>
            <button className="admin-refresh" onClick={() => load()} disabled={loading}><RefreshCw size={14} /> Làm mới</button>
          </div>
          {error && <div className="admin-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Đóng lỗi"><X size={14} /></button></div>}
          {loading ? <div className="admin-loading"><RefreshCw size={18} /> Đang tải dữ liệu...</div> : <>
            {tab === 'overview' && overview && <>
              <div className="stat-grid staff-stat-grid">
                <button className="admin-stat-link" type="button" onClick={() => navigateTo('inventory')}><span className="stat-icon"><Package size={17} /></span><small>MẶT HÀNG ĐANG BÁN</small><b>{overview.activeProducts}</b><span>Xem danh sách mặt hàng</span></button>
                <button className="admin-stat-link" type="button" onClick={() => navigateTo('inventory')}><span className="stat-icon"><Boxes size={17} /></span><small>TỔNG BÓ / MÓN CÒN KHO</small><b>{overview.totalStock}</b><span>Mở kho để kiểm kê</span></button>
                <button className="admin-stat-link" type="button" onClick={() => navigateTo('orders')}><span className="stat-icon"><ShoppingBag size={17} /></span><small>ĐƠN ĐANG XỬ LÝ</small><b>{overview.activeOrders}</b><span>Xem đơn hàng cần xử lý</span></button>
                <button className="admin-stat-link" type="button" onClick={() => navigateTo('orders')}><span className="stat-icon"><Truck size={17} /></span><small>ĐƠN ĐANG GIAO</small><b>{overview.shippingOrders}</b><span>Theo dõi tiến trình giao</span></button>
              </div>
              <div className="staff-shortcuts"><button onClick={() => navigateTo('inventory')}><Boxes size={18} /><span><b>Kiểm tra kho hoa</b><small>{overview.lowStock} mặt hàng sắp hết</small></span><ArrowRight size={15} /></button><button onClick={() => navigateTo('outofstock')}><Package size={18} /><span><b>Tư vấn hoa thay thế</b><small>{inventory.filter((product) => product.stock === 0).length} mặt hàng đã hết</small></span><ArrowRight size={15} /></button><button onClick={() => navigateTo('orders')}><Truck size={18} /><span><b>Theo dõi đơn giao</b><small>{overview.shippingOrders} đơn đang trên đường</small></span><ArrowRight size={15} /></button><button onClick={() => navigateTo('payments')}><CircleDollarSign size={18} /><span><b>Đối soát thanh toán</b><small>Mở danh sách giao dịch chuyển khoản</small></span><ArrowRight size={15} /></button></div>
              <StaffOrders orders={orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).slice(0, 8)} onUpdate={updateStatus} onConfirmPayment={confirmPayment} onProofUploaded={updateOrderProof} />
              <StaffInventory products={inventory.filter((item) => item.stock <= 3).slice(0, 6)} editingStock={editingStock} stockMode={stockMode} setStockMode={setStockMode} stockValue={stockValue} setEditingStock={setEditingStock} setStockValue={setStockValue} busyStockId={busyStockId} onSave={saveStock} onAddStock={addStock} compact />
            </>}
            {tab === 'inventory' && <section className="admin-card"><div className="admin-table-heading"><div><h2>Tồn kho sản phẩm</h2><p>Nhập thêm số lượng cho hoa đã có, tạo mặt hàng mới hoặc kiểm kê tồn kho thực tế.</p></div><button className="button-primary" type="button" onClick={openProductForm}><Plus size={15} /> Tạo sản phẩm</button></div><div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên hoa hoặc danh mục..." /></label><span>{filteredInventory.length} mặt hàng</span></div><StaffInventory products={filteredInventory} editingStock={editingStock} stockMode={stockMode} setStockMode={setStockMode} stockValue={stockValue} setEditingStock={setEditingStock} setStockValue={setStockValue} busyStockId={busyStockId} onSave={saveStock} onAddStock={addStock} /><div className="inventory-export-row"><button className="button-outline inventory-export-button" type="button" onClick={exportInventory}><Download size={14} /> Xuất Excel kiểm kê hôm nay</button><span>Báo cáo gồm tồn kho hiện tại và thời điểm xuất file.</span></div></section>}
            {tab === 'outofstock' && <StaffOutOfStock products={inventory.filter((product) => product.stock === 0 && `${product.name} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase()))} alternatives={inventory.filter((product) => product.stock > 0)} search={search} setSearch={setSearch} />}
            {tab === 'orders' && <section className="admin-card"><div className="admin-table-heading"><div><h2>Tiến trình đơn hàng</h2><p>Đơn mới nhất hiển thị trước; cập nhật từng chặng để khách theo dõi.</p></div></div><div className="admin-filter-pills">{[['all', 'Tất cả'], ['pending', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'], ['preparing', 'Đang chuẩn bị'], ['shipping', 'Đang giao'], ['delivered', 'Đã giao']].map(([key, label]) => <button key={key} type="button" className={orderStatusFilter === key ? 'filter-pill active' : 'filter-pill'} onClick={() => setOrderStatusFilter(key)}>{label}</button>)}</div><div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn, người nhận, số điện thoại..." /></label><span>{filteredOrders.length} đơn</span></div><StaffOrders orders={filteredOrders} onUpdate={updateStatus} onConfirmPayment={confirmPayment} onProofUploaded={updateOrderProof} busyOrderId={busyOrderId} /></section>}
            {tab === 'payments' && <section className="admin-card"><div className="admin-table-heading"><div><h2>Đối soát tiền chuyển khoản</h2><p>Chỉ xác nhận sau khi đã thấy giao dịch vào tài khoản MB Bank. Danh sách tự làm mới sau 10 giây.</p></div></div><div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn, khách hàng..." /></label><span>{payments.filter((order) => order.paymentStatus === 'pending_confirmation').length} giao dịch chờ</span></div><div className="admin-table-wrap"><table><thead><tr><th>MÃ ĐƠN / KHÁCH</th><th>SỐ TIỀN</th><th>THỜI GIAN BÁO</th><th>BILL CHUYỂN KHOẢN</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>{payments.filter((order) => `${order.orderCode} ${order.customerName || ''} ${order.customerEmail || ''}`.toLowerCase().includes(search.trim().toLowerCase())).map((order) => <tr key={order.id}><td><div className="admin-product-cell"><span><b>{order.orderCode}</b><small>{order.customerName || order.recipientName} · {order.phone}</small></span></div></td><td><b>{formatPrice(order.total)}</b></td><td>{order.paymentReportedAt ? dateLabel(order.paymentReportedAt) : 'Chưa báo'}</td><td><PaymentProof orderId={order.id} hasProof={Boolean(order.hasPaymentProof)} uploadedAt={order.paymentProofUploadedAt} /></td><td><span className={`payment-pill ${order.paymentStatus === 'paid' ? 'paid' : ''}`}>{order.paymentStatus === 'paid' ? `Đã xác nhận${order.paymentConfirmedBy ? ` · ${order.paymentConfirmedBy}` : ''}` : order.paymentReportedAt ? 'Chờ đối soát' : 'Chờ khách chuyển'}</span></td><td>{order.paymentStatus === 'pending_confirmation' && order.paymentReportedAt ? <button className="button-primary payment-confirm-button" onClick={() => confirmPayment(order)}>Xác nhận đã nhận tiền</button> : '—'}</td></tr>)}</tbody></table></div>{!payments.length && <p className="admin-empty">Chưa có đơn chuyển khoản.</p>}</section>}
            {tab === 'messages' && <section className="admin-card"><div className="admin-table-heading"><div><h2>Hộp thư khách hàng</h2><p>Tin nhắn tự làm mới sau mỗi 5 giây.</p></div></div><div className="staff-inbox"><div className="staff-inbox-list">{conversations.map((conversation) => <button key={conversation.id} className={activeConversationId === conversation.id ? 'staff-inbox-contact selected' : 'staff-inbox-contact'} onClick={() => setActiveConversationId(conversation.id)}><b>{conversation.customerName}</b><small>{conversation.customerEmail}</small><span>{conversation.lastSenderRole === 'customer' ? 'Khách: ' : 'Bạn: '}{conversation.lastMessage || 'Chưa có tin nhắn'}</span></button>)}{!conversations.length && <p className="admin-empty">Chưa có tin nhắn từ khách.</p>}</div><div className="staff-inbox-thread">{activeConversationId ? <><div className="staff-thread-messages">{messages.map((item) => <article key={item.id} className={`staff-chat-bubble ${item.senderRole === 'customer' ? 'from-customer' : 'from-staff'}`}><small>{item.senderName} · {dateLabel(item.createdAt)}</small><p>{item.content}</p></article>)}</div><div className="staff-quick-replies">{['Dạ Mộc Miên đã nhận đơn và đang chuẩn bị hoa cho bạn ạ.', 'Mẫu này hiện tạm hết, bạn tham khảo mẫu tương tự giúp shop nhé!', 'Đơn hoa của bạn đã giao cho shipper và đang trên đường tới ạ.'].map((reply) => <button key={reply} type="button" className="coupon-chip" onClick={() => setMessageDraft(reply)}>{reply}</button>)}</div><form className="staff-chat-compose" onSubmit={sendMessage}><input value={messageDraft} maxLength={2000} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Nhắn lại cho khách..." /><button className="button-primary" disabled={sendingMessage || !messageDraft.trim()} aria-label="Gửi tin nhắn">{sendingMessage ? 'Đang gửi...' : <><Send size={14} /> Gửi</>}</button></form></> : <p className="admin-empty">Chọn một cuộc trò chuyện để xem và trả lời.</p>}</div></div></section>}
          </>}
        </main>
      </div>
      {creatingProduct && <div className="admin-form-backdrop"><form className="admin-product-form" onSubmit={createProduct}><header><div><small>THÊM MẶT HÀNG THỦ CÔNG</small><h2>Tạo sản phẩm mới</h2></div><button type="button" className="icon-button" disabled={savingProduct} onClick={() => setCreatingProduct(false)} aria-label="Đóng"><X /></button></header><div className="admin-form-grid"><label>Tên sản phẩm<input name="name" defaultValue={blankStaffProduct.name} required minLength="2" maxLength="160" /></label><label>Danh mục<select name="category" defaultValue={blankStaffProduct.category} required>{productCategories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select><ChevronDown size={13} /></label><label>Giá bán (₫)<input name="price" type="number" min="0" max="100000000" step="1" required /></label><label>Giá cũ (₫)<input name="oldPrice" type="number" min="0" max="100000000" step="1" /></label><label>Loài hoa<input name="flowerType" required maxLength="200" /></label><label>Số lượng / cách bó<input name="flowerCount" required maxLength="120" /></label><label>Màu sắc<input name="color" required maxLength="120" /></label><label>Dịp phù hợp<input name="occasion" required maxLength="300" /></label><label>Tồn kho ban đầu<input name="stock" type="number" min="0" max="100000" defaultValue={blankStaffProduct.stock} required /></label><label>Đường dẫn ảnh<div className="image-upload-row"><input id="staff-product-image" name="image" type="text" placeholder="https://... hoặc /flowers/ten-anh.png" required maxLength="1000000" /><label className="button-outline image-pick-button">Chọn ảnh<input type="file" accept="image/*" hidden onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const dataUrl = await compressProductImage(file); const input = document.getElementById('staff-product-image'); if (input) input.value = dataUrl; }} /></label></div></label><label className="form-full">Mô tả<textarea name="description" rows="3" required maxLength="10000" /></label><label className="form-full">Cách gói<input name="wrapping" defaultValue={blankStaffProduct.wrapping} required maxLength="200" /></label></div><footer><button type="button" className="button-outline" disabled={savingProduct} onClick={() => setCreatingProduct(false)}>Hủy</button><button className="button-primary" disabled={savingProduct}>{savingProduct ? <RefreshCw size={15} /> : <Check size={15} />} {savingProduct ? 'Đang tạo...' : 'Tạo sản phẩm'}</button></footer></form></div>}
    </section>
  );
}

function StaffInventory({ products, editingStock, stockMode, setStockMode, stockValue, setEditingStock, setStockValue, busyStockId, onSave, onAddStock, compact = false }) {
  const submitStock = (product) => stockMode === 'add' ? onAddStock(product) : onSave(product);
  return (
    <div className="admin-table-wrap">
      <table>
        <thead><tr><th>SẢN PHẨM</th><th>GIÁ</th><th>TỒN KHO</th><th>CẬP NHẬT KHO</th></tr></thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td><div className="admin-product-cell"><img src={product.image} alt="" /><span><b>{product.name}</b><small>{product.category} · {product.id}</small></span></div></td>
              <td>{formatPrice(product.price)}</td>
              <td><span className={product.stock <= 3 ? 'stock-low' : 'stock-ok'}>{product.stock} bó</span>{product.stock <= 3 && <small className="low-stock-label"> · {product.stock === 0 ? 'Hết hàng' : 'Sắp hết'}</small>}</td>
              <td>
                {editingStock === product.id ? (
                  <div className="staff-stock-editor">
                    <label className="staff-stock-mode">
                      <span>{stockMode === 'add' ? 'Số bó nhập thêm' : 'Tồn thực tế'}</span>
                      <input
                        type="number"
                        min={stockMode === 'add' ? '1' : '0'}
                        max="100000"
                        step="1"
                        aria-label={stockMode === 'add' ? `Số bó nhập thêm ${product.name}` : `Tồn kho thực tế ${product.name}`}
                        value={stockValue}
                        disabled={busyStockId === product.id}
                        onChange={(event) => setStockValue(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitStock(product); } }}
                      />
                    </label>
                    <button className="staff-stock-confirm" type="button" aria-label={stockMode === 'add' ? `Nhập thêm ${product.name}` : `Lưu kiểm kê ${product.name}`} disabled={busyStockId === product.id} onClick={() => submitStock(product)}>
                      {busyStockId === product.id ? <RefreshCw size={14} /> : stockMode === 'add' ? <Plus size={14} /> : <Check size={14} />}
                    </button>
                    <button className="staff-stock-cancel" type="button" aria-label={`Hủy cập nhật ${product.name}`} disabled={busyStockId === product.id} onClick={() => setEditingStock(null)}><X size={14} /></button>
                  </div>
                ) : (
                  <div className="staff-stock-actions">
                    <button className="table-text-button" type="button" onClick={() => { setStockMode('add'); setEditingStock(product.id); setStockValue('1'); }}>Nhập thêm</button>
                    <button className="table-text-button" type="button" onClick={() => { setStockMode('set'); setEditingStock(product.id); setStockValue(String(product.stock)); }}>Kiểm kê</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!products.length && <p className="admin-empty">Không có sản phẩm phù hợp.</p>}
      {compact && <p className="staff-hint">“Nhập thêm” cộng số lượng vào kho hiện tại; “Kiểm kê” thay tồn kho bằng số lượng thực tế.</p>}
    </div>
  );
}

function StaffOutOfStock({ products, alternatives, search, setSearch }) {
  return <section className="admin-card"><div className="admin-table-heading"><div><h2>Mặt hàng đã hết</h2><p>Không thể đặt mua cho đến khi kho có hàng. Các gợi ý bên dưới còn tồn để tư vấn khách.</p></div></div><div className="admin-table-tools"><label><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoa hoặc danh mục..." /></label><span>{products.length} mặt hàng hết</span></div>{products.length ? <div className="staff-out-of-stock-list">{products.map((product) => { const sameCategory = alternatives.filter((item) => item.category === product.category); const suggestions = (sameCategory.length ? sameCategory : alternatives).slice(0, 3); return <article className="staff-out-of-stock-item" key={product.id}><div><b>{product.name}</b><span className="low-stock-label">HẾT HÀNG · Không nhận đặt mới</span></div><div className="staff-alternative-list"><small>Gợi ý thay thế đang còn:</small>{suggestions.length ? suggestions.map((item) => <span key={item.id}>{item.name} · {formatPrice(item.price)} · còn {item.stock} bó</span>) : <span>Hiện chưa có hoa còn hàng để thay thế.</span>}</div></article>; })}</div> : <p className="admin-empty">Tuyệt vời, hiện không có sản phẩm nào hết hàng.</p>}</section>;
}

function StaffOrders({ orders, onUpdate, onConfirmPayment, onProofUploaded, busyOrderId }) {
  const [expanded, setExpanded] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  return <div className="staff-orders">{orders.map((order) => <article className="staff-order-card" key={order.id}>
    <div className="staff-order-summary">
      <span className="staff-order-icon"><Truck size={17} /></span>
      <div className="staff-order-main"><b>{order.orderCode} <span className={`order-status status-${order.status}`}>{statusLabels[order.status]}</span></b><small>{order.recipientName} · {order.phone}</small><small><MapPin size={12} /> {order.address}</small><small><Clock3 size={12} /> Giao dự kiến: {new Date(order.deliveryDate).toLocaleDateString('vi-VN')}</small></div>
      <div className="staff-order-total"><b>{formatPrice(order.total)}</b><small>{order.items?.length || 0} loại hoa</small></div>
    </div>
    <div className="staff-timeline">{(order.history || []).map((entry, index) => <div className="staff-timeline-entry" key={`${entry.status}-${entry.createdAt}-${index}`}><i className={index === order.history.length - 1 ? 'current' : ''} /><span><b>{statusLabels[entry.status] || entry.status}</b><small>{dateLabel(entry.createdAt)}{entry.updatedBy ? ` · ${entry.updatedBy}` : ''}{entry.note ? ` · ${entry.note}` : ''}</small></span></div>)}</div>
    <div className="staff-order-actions"><button className="table-text-button" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>{expanded === order.id ? 'Ẩn chi tiết' : 'Xem sản phẩm & thiệp'}</button>{order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'pending_confirmation' && order.paymentReportedAt && <button className="button-primary payment-confirm-button" onClick={() => onConfirmPayment(order)}>Xác nhận đã nhận tiền</button>}{nextStatus[order.status] && <button className="button-primary staff-next-action" disabled={busyOrderId === order.id} onClick={() => onUpdate(order)}>{busyOrderId === order.id ? 'Đang cập nhật...' : nextAction[order.status]} <ArrowRight size={14} /></button>}</div>
    {expanded === order.id && <div className="staff-order-details"><div><b>Sản phẩm</b>{order.items?.map((item) => <span key={`${item.productId}-${item.name}`}>{item.name} × {item.quantity} — {formatPrice(item.price)}</span>)}</div><div><b>Thiệp miễn phí</b><span>{order.cardMessage || 'Có kèm thiệp miễn phí, khách chưa nhập lời nhắn.'}</span></div><div><b>Thanh toán</b><span>{order.paymentMethod === 'bank_transfer' ? `Chuyển khoản · ${order.paymentStatus === 'paid' ? `Đã xác nhận${order.paymentConfirmedBy ? ` bởi ${order.paymentConfirmedBy}` : ''}` : order.paymentReportedAt ? 'Khách đã báo · chờ cửa hàng đối soát' : 'Chờ khách chuyển khoản'}` : 'COD · Thu tiền khi giao'}</span>{order.paymentMethod === 'bank_transfer' && <PaymentProof orderId={order.id} hasProof={Boolean(order.hasPaymentProof)} uploadedAt={order.paymentProofUploadedAt} />}</div><button className="table-text-button" type="button" onClick={() => setInvoiceOrder(order)}>Xem / in hóa đơn</button></div>}
  </article>)}{!orders.length && <p className="admin-empty">Hiện không có đơn hàng cần xử lý.</p>}{invoiceOrder && <OrderInvoice order={invoiceOrder} onClose={() => setInvoiceOrder(null)} onProofUploaded={onProofUploaded} />}</div>;
}
