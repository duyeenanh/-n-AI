import { useEffect, useState } from 'react';
import { ArrowRight, Check, Heart, LogOut, MessageCircle, Package, Printer, Send, Star, UserRound, X } from 'lucide-react';
import { apiFetch, saveToken } from '../api.js';
import { formatPrice } from '../data/products.js';
import OrderInvoice from './OrderInvoice.jsx';
import PaymentProof from './PaymentProof.jsx';

function ProductReview({ order, item, onSaved, notify }) {
  const [rating, setRating] = useState(Number(item.reviewRating) || 0);
  const [comment, setComment] = useState(item.reviewComment || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submitReview = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/orders/${order.id}/items/${item.orderItemId}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
      await onSaved();
      notify('Cảm ơn bạn đã chia sẻ đánh giá!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return <form className="product-review" onSubmit={submitReview}>
    <b>{item.reviewRating ? 'Đánh giá của bạn' : 'Mức độ hài lòng của bạn'}</b>
    <div className="review-rating-row">
      <div className="review-star-picker" aria-label="Chọn mức độ hài lòng từ nửa sao đến năm sao">
        {[1, 2, 3, 4, 5].map((star) => <span className="review-star" key={star}>
          {[0.5, 1].map((fraction) => {
            const value = star - 1 + fraction;
            const selected = rating >= value;
            return <button
              className={`review-star-half ${fraction === 0.5 ? 'review-star-left' : 'review-star-right'}${selected ? ' selected' : ''}`}
              type="button"
              key={value}
              aria-label={`${value} sao`}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
            ><Star size={23} /></button>;
          })}
        </span>)}
      </div>
      <span className="review-rating-value">{rating ? `${rating.toLocaleString('vi-VN')} / 5` : 'Chọn số sao'}</span>
    </div>
    <label htmlFor={`review-${item.orderItemId}`}>Viết đánh giá</label>
    <textarea
      id={`review-${item.orderItemId}`}
      value={comment}
      onChange={(event) => setComment(event.target.value)}
      maxLength={1000}
      minLength={2}
      required
      placeholder="Chia sẻ cảm nhận của bạn về bó hoa..."
    />
    {error && <small className="review-error" role="alert">{error}</small>}
    <button className="button-outline" type="submit" disabled={saving || !rating || comment.trim().length < 2}>
      {saving ? 'Đang gửi...' : item.reviewRating ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
    </button>
  </form>;
}

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

export default function AccountPanel({ user, setUser, onClose, onHome = onClose, onAdminOpen, onStaffOpen, notify }) {
  const [view, setView] = useState(user ? 'account' : 'login');
  const [tab, setTab] = useState('orders');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState({ fullName: user?.fullName || '', phone: user?.phone || '', address: user?.address || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [aiHistory, setAiHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (tab === 'orders') {
      let mounted = true;
      const refreshOrders = () => apiFetch('/orders')
        .then((result) => { if (mounted) setOrders(result); })
        .catch((err) => { if (mounted) setError(err.message); });
      refreshOrders();
      const timer = window.setInterval(refreshOrders, 10000);
      return () => {
        mounted = false;
        window.clearInterval(timer);
      };
    }
    if (tab === 'ai') apiFetch('/ai/history').then(setAiHistory).catch((err) => setError(err.message));
    if (tab === 'messages') {
      let mounted = true;
      let requesting = false;
      const refreshMessages = async () => {
        if (requesting) return;
        requesting = true;
        try {
          const result = await apiFetch('/messages');
          if (mounted) setMessages(result.messages);
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
    }
  }, [user, tab]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!messageDraft.trim() || sendingMessage) return;
    setSendingMessage(true);
    setError('');
    try {
      await apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ content: messageDraft }),
      });
      setMessageDraft('');
      const result = await apiFetch('/messages');
      setMessages(result.messages);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const reportPayment = async (order) => {
    try {
      await apiFetch(`/orders/${order.id}/report-payment`, { method: 'POST', body: '{}' });
      setOrders(await apiFetch('/orders'));
      notify('Đã báo cửa hàng kiểm tra giao dịch chuyển khoản.');
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelOrder = async (order) => {
    if (!window.confirm(`Bạn chắc chắn muốn hủy đơn ${order.orderCode}?`)) return;
    try {
      await apiFetch(`/orders/${order.id}/cancel`, { method: 'POST', body: '{}' });
      setOrders(await apiFetch('/orders'));
      notify(`Đã hủy đơn ${order.orderCode} và hoàn lại số lượng vào kho.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const payload = {
      email: form.get('email'),
      password: form.get('password'),
      ...(view === 'register' ? { fullName: form.get('fullName') } : {}),
    };
    try {
      const result = await apiFetch(`/auth/${view === 'register' ? 'register' : 'login'}`, {
        method: 'POST', body: JSON.stringify(payload),
      });
      if (view === 'admin-login' && result.user.role !== 'admin') {
        setError('Tài khoản này chưa được cấp quyền quản trị. Hãy đăng nhập bằng tài khoản admin của cửa hàng.');
        return;
      }
      if (view === 'staff-login' && result.user.role !== 'staff') {
        setError('Tài khoản này chưa được cấp quyền nhân viên. Hãy dùng mục đăng nhập khách hàng hoặc quản trị viên.');
        return;
      }
      if (view === 'login' && result.user.role === 'staff') {
        setError('Đây là tài khoản nhân viên. Vui lòng chọn “Đăng nhập nhân viên”.');
        return;
      }
      saveToken(result.token);
      setUser(result.user);
      setProfile({ fullName: result.user.fullName, phone: result.user.phone || '', address: result.user.address || '' });
      if (result.user.role === 'staff') {
        notify('Nhân viên đã đăng nhập thành công.');
        onClose();
        onStaffOpen();
        return;
      }
      if (result.user.role === 'admin') {
        notify('Đăng nhập quản trị thành công.');
        onClose();
        onAdminOpen();
        return;
      }
      setView('account');
      setTab('orders');
      notify('Đăng nhập thành công. Chào mừng bạn đến Mộc Miên!');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const profileData = user?.role === 'staff'
        ? { fullName: profile.fullName, phone: profile.phone }
        : profile;
      const updated = await apiFetch('/users/profile', { method: 'PUT', body: JSON.stringify(profileData) });
      setUser(updated);
      setProfile({ fullName: updated.fullName, phone: updated.phone || '', address: updated.address || '' });
      notify('Đã lưu thông tin cá nhân.');
    } catch (err) {
      setError(err.message);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await apiFetch('/users/password', { method: 'PUT', body: JSON.stringify(passwords) });
      setPasswords({ currentPassword: '', newPassword: '' });
      notify('Đã đổi mật khẩu.');
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => {
    saveToken(null);
    setUser(null);
    setView('login');
    setOrders([]);
    notify('Bạn đã đăng xuất.');
  };

  return (
    <section className={`account-panel ${view === 'account' ? 'account-wide' : ''}`} aria-label="Tài khoản khách hàng">
      <header className="account-header">
        <span className="account-avatar"><UserRound size={19} /></span>
        <button className="account-home-brand" type="button" onClick={onHome} aria-label="Mộc Miên, về trang cửa hàng"><b>mộc miên</b><small>{user?.fullName || 'VỀ TRANG CỬA HÀNG'}</small></button>
        {user && <button onClick={logout} className="account-logout" aria-label="Đăng xuất"><LogOut size={16} /></button>}
        <button className="icon-button" onClick={onClose} aria-label="Đóng tài khoản"><X /></button>
      </header>
      {error && <p className="account-error" role="alert">{error}</p>}
      {view !== 'account' ? <form className="account-auth" onSubmit={submitAuth}>
        <span className="eyebrow"><span /> {view === 'admin-login' ? 'KHU VỰC QUẢN TRỊ VIÊN' : view === 'staff-login' ? 'KHU VỰC NHÂN VIÊN' : 'MỘC MIÊN FLOWER STUDIO'}</span>
        <h3>{view === 'register' ? 'Tạo tài khoản dịu dàng' : view === 'admin-login' ? 'Đăng nhập quản trị' : view === 'staff-login' ? 'Đăng nhập nhân viên' : 'Đăng nhập vào tiệm'}</h3>
        {view === 'register' && <label>Họ và tên<input name="fullName" required minLength="2" placeholder="Tên của bạn" /></label>}
        <label>Email<input name="email" required type="email" placeholder={view === 'admin-login' ? 'admin@mocmien.local' : view === 'staff-login' ? 'nhanvien1@mocmien.local' : 'ban@email.com'} /></label>
        <label>Mật khẩu<input name="password" required type="password" minLength={view === 'register' ? 8 : undefined} placeholder={view === 'register' ? 'Ít nhất 8 ký tự' : ''} /></label>
        {view === 'admin-login' && <small className="staff-hint">Admin: <b>admin@mocmien.local</b> / <b>123456789</b></small>}
        {view === 'staff-login' && <small className="staff-hint">Nhân viên: <b>nhanvien1@mocmien.local</b> / <b>12346755</b> (hoặc nhanvien2, nhanvien3)</small>}
        <button className="button-primary full-button" disabled={busy}>{busy ? 'Đang xử lý...' : view === 'register' ? 'Tạo tài khoản' : view === 'admin-login' ? 'Đăng nhập quản trị viên' : view === 'staff-login' ? 'Đăng nhập nhân viên' : 'Đăng nhập'} <ArrowRight size={15} /></button>
        {!['admin-login', 'staff-login'].includes(view) && <button className="account-switch" type="button" onClick={() => { setError(''); setView(view === 'register' ? 'login' : 'register'); }}>
          {view === 'register' ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
        </button>}
        {['admin-login', 'staff-login'].includes(view)
          ? <button className="account-switch" type="button" onClick={() => { setError(''); setView('login'); }}>Quay lại đăng nhập khách hàng</button>
          : <><button className="staff-login-link" type="button" onClick={() => { setError(''); setView('staff-login'); }}>Đăng nhập nhân viên</button><button className="admin-login-link" type="button" onClick={() => { setError(''); setView('admin-login'); }}>Đăng nhập quản trị viên</button></>}
      </form> : <div className="account-body">
        <nav className="account-tabs">
          <button className={tab === 'orders' ? 'selected' : ''} onClick={() => setTab('orders')}><Package size={15} /> Đơn hàng</button>
          <button className={tab === 'profile' ? 'selected' : ''} onClick={() => setTab('profile')}><UserRound size={15} /> Hồ sơ</button>
          {user.role === 'customer' && <button className={tab === 'ai' ? 'selected' : ''} onClick={() => setTab('ai')}><Heart size={15} /> Lịch sử AI</button>}
          {user.role === 'customer' && <button className={tab === 'messages' ? 'selected' : ''} onClick={() => setTab('messages')}><MessageCircle size={15} /> Nhắn nhân viên</button>}
        </nav>
        {tab === 'profile' ? <div className="account-profile">
          <form onSubmit={saveProfile}>
            <label>Họ và tên<input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} required minLength="2" /></label>
            <label>Số điện thoại<input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
            {user?.role !== 'staff' && <label>Địa chỉ nhận hoa<input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></label>}
            <button className="button-primary full-button">Lưu thông tin</button>
          </form>
          <form onSubmit={changePassword}>
            <b>Đổi mật khẩu</b>
            <label>Mật khẩu hiện tại<input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required /></label>
            <label>Mật khẩu mới<input type="password" minLength="8" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required /></label>
            <button className="button-outline">Cập nhật mật khẩu</button>
          </form>
        </div> : tab === 'ai' ? <div className="account-orders">
          {aiHistory.length ? aiHistory.map((item) => <article className="ai-history-item" key={`${item.sessionId}-${item.createdAt}-${item.role}`}><small>{item.role === 'user' ? 'BẠN ĐÃ HỎI' : 'MỘC MIÊN GỢI Ý'}</small><p>{item.content}</p></article>) : <p className="account-empty">Bạn chưa có lịch sử tư vấn. Miên luôn sẵn lòng giúp chọn hoa.</p>}
        </div> : tab === 'messages' ? <section className="customer-message-panel"><div className="customer-message-intro"><MessageCircle size={17} /><span><b>Trò chuyện với nhân viên</b><small>Nhân viên sẽ phản hồi tại đây. Tin nhắn tự cập nhật sau vài giây.</small></span></div><div className="customer-chat-messages">{messages.map((item) => <article key={item.id} className={`staff-chat-bubble ${item.senderRole === 'customer' ? 'from-customer' : 'from-staff'}`}><small>{item.senderRole === 'customer' ? 'Bạn' : item.senderName || 'Nhân viên'} · {new Date(item.createdAt).toLocaleString('vi-VN')}</small><p>{item.content}</p></article>)}{!messages.length && <p className="account-empty">Bạn có thể nhắn để hỏi về sản phẩm, tồn kho hoặc đơn hàng.</p>}</div><form className="customer-chat-compose" onSubmit={sendMessage}><input value={messageDraft} maxLength={2000} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Viết tin nhắn cho nhân viên..." aria-label="Tin nhắn gửi nhân viên" /><button className="button-primary" disabled={sendingMessage || !messageDraft.trim()} aria-label="Gửi tin nhắn">{sendingMessage ? 'Đang gửi...' : <Send size={15} />}</button></form></section> : <div className="account-orders">
          {orders.length ? orders.map((order) => <article className="order-card" key={order.id}>
            <div className="order-card-top"><b>{order.orderCode}</b><span className={`order-status status-${order.status}`}>{statusLabels[order.status]}</span></div>
            <small>{new Date(order.createdAt).toLocaleDateString('vi-VN')} · {order.items?.length || 0} sản phẩm</small>
            <div className="order-card-items">{order.items?.map((item) => <span key={`${order.id}-${item.orderItemId}`}>{item.name} × {item.quantity}</span>)}</div>
            {order.status === 'delivered' && order.items?.map((item) => <ProductReview
              key={`review-${order.id}-${item.orderItemId}`}
              order={order}
              item={item}
              onSaved={async () => setOrders(await apiFetch('/orders'))}
              notify={notify}
            />)}
            <strong>{formatPrice(order.total)}</strong>
            <div className="order-card-actions-row">
              <button className="table-text-button customer-invoice-button" type="button" onClick={() => setInvoiceOrder(order)}><Printer size={13} /> Xem / in hóa đơn</button>
              {order.status === 'pending' && <button className="table-text-button danger-text-button" type="button" onClick={() => cancelOrder(order)}>Hủy đơn hàng</button>}
            </div>
            {order.paymentMethod === 'bank_transfer' && <div className="account-payment-info">
              {order.paymentStatus === 'paid'
                ? <strong className="payment-confirmed-message">Đã thanh toán · {order.paymentConfirmedBy ? `Xác nhận bởi ${order.paymentConfirmedBy}` : 'Đã xác nhận'}</strong>
                : <><img src="/qr-chuyen-khoan.png" alt="Mã QR chuyển khoản MB Bank" /><span><b>Chuyển khoản MB Bank</b><small>STK 03335212100405 · PHAN DUYEN ANH</small><small>Số tiền: {formatPrice(order.total)}</small><small>Nội dung: {order.orderCode}</small>{order.paymentReportedAt ? <strong className="payment-waiting-message">Đã báo chuyển khoản · Đang chờ cửa hàng xác nhận.</strong> : <button className="button-outline" onClick={() => reportPayment(order)}>Tôi đã chuyển khoản</button>}</span></>}
              <PaymentProof
                orderId={order.id}
                hasProof={Boolean(order.hasPaymentProof)}
                uploadedAt={order.paymentProofUploadedAt}
                canUpload={order.paymentStatus !== 'paid' && order.status !== 'cancelled'}
                onUploaded={(result) => setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...result } : item))}
              />
            </div>}
            <div className={`delivery-progress ${order.status === 'cancelled' ? 'cancelled' : ''}`}>
              {(order.status === 'cancelled' ? ['pending', 'cancelled'] : ['pending', 'confirmed', 'preparing', 'shipping', 'delivered']).map((step) => {
                const stepHistory = order.history?.find((entry) => entry.status === step);
                const currentIndex = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered'].indexOf(order.status);
                const stepIndex = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered'].indexOf(step);
                const complete = order.status === 'cancelled' ? Boolean(stepHistory) : stepIndex <= currentIndex;
                return <div className={complete ? 'delivery-step complete' : 'delivery-step'} key={step}>
                  <i>{complete ? <Check size={11} /> : null}</i>
                  <span><b>{statusLabels[step]}</b><small>{stepHistory ? new Date(stepHistory.createdAt).toLocaleString('vi-VN') : 'Đang chờ'}</small></span>
                </div>;
              })}
            </div>
            <div className="order-history">{order.history?.map((entry) => <span key={`${entry.status}-${entry.createdAt}`}><i />{statusLabels[entry.status] || entry.status}{entry.note ? ` · ${entry.note}` : ''}{entry.updatedBy ? ` · ${entry.updatedBy}` : ''}</span>)}</div>
          </article>) : <p className="account-empty">Bạn chưa có đơn hoa nào. Hãy chọn một bó hoa thật xinh nhé.</p>}
        </div>}
      </div>}
      {invoiceOrder && <OrderInvoice
        order={invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
        canUploadProof
        onProofUploaded={(result) => {
          setInvoiceOrder((current) => current ? { ...current, ...result } : current);
          setOrders((current) => current.map((order) => order.id === result.id ? { ...order, ...result } : order));
        }}
      />}
    </section>
  );
}
