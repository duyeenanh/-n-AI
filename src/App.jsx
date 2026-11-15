import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, Check, ChevronDown, Facebook,
  ChevronRight, CircleHelp, Flower2, Heart, Leaf, Menu, Minus, PackageSearch, Plus,
  Instagram, Printer, Search, Send, ShoppingBag, Sparkles, Star, Tag, Truck, UserRound, X,
} from 'lucide-react';
import { categories as initialCategories, formatPrice, imageUrl, products } from './data/products.js';
import { apiFetch, getToken, saveToken } from './api.js';
import { consultLocalAi } from './utils/localAi.js';
import { evaluateCoupon, PROMO_COUPONS } from './utils/coupons.js';
import AccountPanel from './components/AccountPanel.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import OrderInvoice from './components/OrderInvoice.jsx';
import PaymentProof from './components/PaymentProof.jsx';
import StaffDashboard from './components/StaffDashboard.jsx';

const readSaved = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState('all');
  const [sort, setSort] = useState('popular');
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [favorites, setFavorites] = useState(() => readSaved('moc-favorites', []));
  const [cart, setCart] = useState(() => readSaved('moc-cart', []));
  const [catalog, setCatalog] = useState(products);
  const [shopCategories, setShopCategories] = useState(initialCategories);
  const [user, setUser] = useState(() => readSaved('moc-user', null));
  const [compare, setCompare] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('details');
  const [checkoutDetails, setCheckoutDetails] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [payment, setPayment] = useState('cod');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [receiptInvoiceOpen, setReceiptInvoiceOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSessionId, setAiSessionId] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackCode, setTrackCode] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [productReviews, setProductReviews] = useState({ averageRating: 4.9, totalReviews: 0, reviews: [] });

  const goHome = () => {
    setAccountOpen(false);
    setAdminOpen(false);
    setStaffOpen(false);
  };

  const refreshCatalog = async () => {
    const remoteProducts = await apiFetch('/products');
    setCatalog(remoteProducts.map((product) => ({
      ...product,
      detail: product.detail || `${product.flowerType || 'Hoa tươi'} · ${product.flowerCount || ''}`,
      occasion: product.occasion || '',
      tag: Number(product.stock) === 0 ? 'HẾT HÀNG' : Number(product.stock) <= 3 ? 'SẮP HẾT' : '',
      tone: '#f2e9e2',
    })));
    return remoteProducts;
  };

  useEffect(() => {
    const loadCatalog = () => refreshCatalog()
      .catch(() => {});
    loadCatalog();
    const refreshInterval = window.setInterval(loadCatalog, 30000);
    window.addEventListener('focus', loadCatalog);
    apiFetch('/categories')
      .then((remoteCategories) => setShopCategories([
        initialCategories[0],
        ...remoteCategories.map((item, index) => ({
          ...item,
          icon: ['❀', '❋', '✿', '❁', '❃'][index % 5],
        })),
      ]))
      .catch(() => {});
    if (getToken()) {
      apiFetch('/auth/me')
        .then((currentUser) => {
          setUser(currentUser);
          localStorage.setItem('moc-user', JSON.stringify(currentUser));
        })
        .catch((error) => {
          saveToken(null);
          localStorage.removeItem('moc-user');
          setUser(null);
          notify(`Phiên đăng nhập đã hết hạn: ${error.message}`);
        });
    }
    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', loadCatalog);
    };
  }, []);

  useEffect(() => {
    if (!user || !getToken()) {
      setFavorites(readSaved('moc-favorites', []));
      return;
    }
    apiFetch('/users/favorites')
      .then((items) => {
        const ids = items.map((item) => item.id);
        setFavorites(ids);
        localStorage.setItem('moc-favorites', JSON.stringify(ids));
      })
      .catch((error) => notify(`Không tải được danh sách yêu thích: ${error.message}`));
  }, [user]);

  const visibleProducts = useMemo(() => {
    let list = catalog.filter((product) => {
      const matchesCategory = category === 'all' || product.category === category;
      const text = `${product.name} ${product.detail} ${product.occasion}`.toLowerCase();
      const matchesQuery = text.includes(query.trim().toLowerCase());
      const matchesPrice = maxPrice === 'all' || product.price <= Number(maxPrice);
      const matchesFavorite = !showFavorites || favorites.includes(product.id);
      return matchesCategory && matchesQuery && matchesPrice && matchesFavorite;
    });
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [catalog, category, query, maxPrice, sort, showFavorites, favorites]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const unavailableCartItems = cart.filter((item) => {
    const current = catalog.find((product) => product.id === item.id);
    return current && Number(current.stock) < item.quantity;
  });
  const latestProduct = (product) => catalog.find((item) => item.id === product.id) || product;
  const currentSelectedProduct = selectedProduct ? latestProduct(selectedProduct) : null;

  const notify = (text) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 2300);
  };

  const updateCart = (next) => {
    setCart(next);
    localStorage.setItem('moc-cart', JSON.stringify(next));
  };

  const toggleFavorite = async (id) => {
    const wasFavorite = favorites.includes(id);
    const next = wasFavorite ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem('moc-favorites', JSON.stringify(next));
    notify(next.includes(id) ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích');

    if (user && getToken()) {
      try {
        await apiFetch(`/users/favorites/${id}`, { method: 'PUT' });
      } catch (error) {
        notify(`Đã lưu yêu thích trên thiết bị này. Chưa đồng bộ được tài khoản: ${error.message}`);
      }
    }
  };

  const addToCart = (product) => {
    const currentProduct = catalog.find((item) => item.id === product.id) || product;
    const existing = cart.find((item) => item.id === product.id);
    if (Number(currentProduct.stock) <= 0) {
      notify('Sản phẩm đã hết hàng, bạn vui lòng chọn bó hoa khác nhé.');
      return false;
    }
    if (currentProduct.stock !== undefined && (existing?.quantity || 0) >= currentProduct.stock) {
      notify('Sản phẩm hiện không đủ số lượng trong kho.');
      return false;
    }
    const next = existing
      ? cart.map((item) => item.id === product.id ? { ...item, ...currentProduct, quantity: item.quantity + 1 } : item)
      : [...cart, { ...currentProduct, quantity: 1 }];
    updateCart(next);
    notify(`Đã thêm “${product.name}” vào giỏ`);
    return true;
  };

  const changeQuantity = (id, delta) => {
    const item = cart.find((product) => product.id === id);
    const current = catalog.find((product) => product.id === id);
    if (delta > 0 && current && item && (Number(current.stock) <= 0 || item.quantity >= Number(current.stock))) {
      notify(Number(current.stock) <= 0 ? 'Sản phẩm đã hết hàng.' : 'Số lượng đã đạt mức hàng còn trong kho.');
      return;
    }
    updateCart(cart
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0));
  };

  const toggleCompare = (product) => {
    if (compare.some((item) => item.id === product.id)) {
      setCompare(compare.filter((item) => item.id !== product.id));
    } else if (compare.length >= 3) {
      notify('Bạn chỉ có thể so sánh tối đa 3 sản phẩm');
    } else {
      setCompare([...compare, product]);
    }
  };

  useEffect(() => {
    if (!selectedProduct?.id) return;
    let active = true;
    apiFetch(`/products/${selectedProduct.id}/reviews`)
      .then((data) => { if (active) setProductReviews(data); })
      .catch(() => {
        if (active) setProductReviews({ averageRating: 4.9, totalReviews: 0, reviews: [] });
      });
    return () => { active = false; };
  }, [selectedProduct?.id]);

  const scrollToProducts = () => document.getElementById('san-pham')?.scrollIntoView({ behavior: 'smooth' });

  const askAdvisor = async (question = message) => {
    if (!question.trim()) return;
    const prompt = question.trim();
    const nextHistory = [...messages, { role: 'user', text: prompt }];
    setMessages(nextHistory);
    setMessage('');
    setAiBusy(true);
    const localResult = consultLocalAi(prompt, catalog, messages);
    const saveLocalAiLog = (res) => {
      const now = new Date().toISOString();
      const sessionKey = aiSessionId || 'local-session';
      const historyItems = readSaved('moc-local-ai-history', []);
      const newEntries = [
        {
          sessionId: sessionKey,
          role: 'assistant',
          customerName: user?.fullName || 'Khách ghé thăm',
          email: user?.email || '',
          content: res.answer,
          retrievedProducts: (res.products || []).map((p) => p.name),
          createdAt: now,
        },
        {
          sessionId: sessionKey,
          role: 'user',
          customerName: user?.fullName || 'Khách ghé thăm',
          email: user?.email || '',
          content: prompt,
          createdAt: now,
        },
      ];
      localStorage.setItem('moc-local-ai-history', JSON.stringify([...newEntries, ...historyItems].slice(0, 50)));
    };

    if (localResult.method === 'intent-classifier' || localResult.method === 'knowledge-base') {
      saveLocalAiLog(localResult);
      setMessages((current) => [...current, {
        role: 'assistant',
        text: localResult.answer,
        products: localResult.products,
        mode: localResult.mode,
        method: localResult.method,
        intent: localResult.intent,
        matchedEntities: localResult.matchedEntities,
        candidateCount: localResult.candidateCount,
        budget: localResult.budget,
        queryTokens: localResult.queryTokens,
      }]);
      setAiBusy(false);
      return;
    }

    try {
      const result = await apiFetch('/ai/consult', {
        method: 'POST',
        body: JSON.stringify({ message: prompt, sessionId: aiSessionId || undefined }),
      });
      setAiSessionId(result.sessionId || '');
      setMessages((current) => [...current, {
        role: 'assistant',
        text: result.answer,
        products: result.products || [],
        mode: result.mode,
        method: result.method,
        intent: localResult.intent,
        matchedEntities: localResult.matchedEntities,
        candidateCount: result.candidateCount,
        budget: result.budget ?? localResult.budget,
        queryTokens: localResult.queryTokens,
        providerWarning: result.providerWarning,
      }]);
    } catch {
      saveLocalAiLog(localResult);
      setMessages((current) => [...current, {
        role: 'assistant',
        text: localResult.answer,
        products: localResult.products,
        mode: localResult.mode,
        method: localResult.method,
        intent: localResult.intent,
        matchedEntities: localResult.matchedEntities,
        candidateCount: localResult.candidateCount,
        budget: localResult.budget,
        queryTokens: localResult.queryTokens,
      }]);
    } finally {
      setAiBusy(false);
    }
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const recipientName = String(form.get('recipientName') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    const address = String(form.get('address') || '').trim();
    if (recipientName.length < 2) {
      setCheckoutError('Vui lòng nhập tên người nhận từ 2 ký tự trở lên.');
      return;
    }
    if (phone.length < 8) {
      setCheckoutError('Vui lòng nhập số điện thoại có ít nhất 8 ký tự.');
      return;
    }
    if (address.length < 5) {
      setCheckoutError('Địa chỉ giao hàng cần có ít nhất 5 ký tự.');
      return;
    }
    setCheckoutError('');
    setCheckoutDetails({
      recipientName,
      phone,
      address,
      deliveryDate: form.get('deliveryDate'),
      cardMessage: form.get('cardMessage'),
    });
    setCheckoutStep('payment');
  };

  const baseShippingFee = subtotal >= 500000 ? 0 : 30000;
  const couponResult = evaluateCoupon(appliedCoupon, subtotal, baseShippingFee);
  const effectiveShippingFee = Math.max(0, baseShippingFee - couponResult.shippingDiscount);
  const checkoutTotal = Math.max(0, subtotal - couponResult.discount + effectiveShippingFee);

  const applyCoupon = (codeValue = couponInput) => {
    const trimmed = String(codeValue || '').trim().toUpperCase();
    if (!trimmed) {
      setAppliedCoupon('');
      setCouponError('');
      return;
    }
    const res = evaluateCoupon(trimmed, subtotal, baseShippingFee);
    if (!res.valid) {
      setAppliedCoupon('');
      setCouponError(res.error);
      return;
    }
    setCouponInput(trimmed);
    setAppliedCoupon(trimmed);
    setCouponError('');
    notify(`Đã áp dụng mã ${trimmed}!`);
  };

  const trackOrder = async (event) => {
    event?.preventDefault();
    const code = trackCode.trim().toUpperCase();
    const phone = trackPhone.replace(/\s+/g, '').trim();
    if (!code || phone.length < 6) {
      setTrackError('Vui lòng nhập mã đơn hàng và số điện thoại nhận hoa.');
      return;
    }
    setTrackingBusy(true);
    setTrackError('');
    const localOrders = readSaved('moc-local-orders', []);
    const localMatch = localOrders.find(
      (o) => String(o.orderCode).toUpperCase() === code && String(o.phone || '').replace(/\s+/g, '') === phone,
    );
    try {
      const remote = await apiFetch(`/orders/track?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`);
      setTrackedOrder(remote);
    } catch (err) {
      if (localMatch) {
        setTrackedOrder(localMatch);
      } else {
        setTrackedOrder(null);
        setTrackError(err.message || 'Không tìm thấy đơn hàng phù hợp.');
      }
    } finally {
      setTrackingBusy(false);
    }
  };

  const cancelTrackedOrder = async () => {
    if (!trackedOrder || trackedOrder.status !== 'pending') return;
    if (!window.confirm(`Bạn chắc chắn muốn hủy đơn ${trackedOrder.orderCode}?`)) return;
    if (String(trackedOrder.id).startsWith('local-')) {
      const updated = {
        ...trackedOrder,
        status: 'cancelled',
        history: [...(trackedOrder.history || []), { status: 'cancelled', note: 'Khách hàng hủy đơn (Local).', createdAt: new Date().toISOString() }],
      };
      const localOrders = readSaved('moc-local-orders', []);
      localStorage.setItem('moc-local-orders', JSON.stringify(localOrders.map((o) => (o.id === updated.id ? updated : o))));
      setTrackedOrder(updated);
      notify(`Đã hủy đơn ${updated.orderCode}.`);
      return;
    }
    try {
      await apiFetch(`/orders/${trackedOrder.id}/cancel`, {
        method: 'POST',
        headers: trackedOrder.guestOrderToken ? { 'X-Order-Access-Token': trackedOrder.guestOrderToken } : {},
        body: '{}',
      });
      setTrackedOrder((cur) => cur ? {
        ...cur,
        status: 'cancelled',
        history: [...(cur.history || []), { status: 'cancelled', note: 'Khách hàng hủy đơn trước khi xác nhận.', createdAt: new Date().toISOString() }],
      } : null);
      notify(`Đã hủy đơn ${trackedOrder.orderCode} và hoàn lại số lượng vào kho.`);
      refreshCatalog().catch(() => {});
    } catch (err) {
      notify(err.message);
    }
  };

  const submitOrder = async () => {
    if (ordering) return;
    setOrdering(true);
    try {
      let currentProducts = catalog;
      let backendAvailable = true;
      try {
        currentProducts = await refreshCatalog();
      } catch {
        backendAvailable = false;
      }
      const currentById = new Map(currentProducts.map((product) => [product.id, product]));
      const unavailable = cart.filter((item) => Number(currentById.get(item.id)?.stock ?? 10) < item.quantity);
      if (unavailable.length) {
        notify(`Không thể đặt hàng: ${unavailable.map((item) => item.name).join(', ')} không còn đủ số lượng. Vui lòng chỉnh lại giỏ hàng.`);
        return;
      }

      if (backendAvailable) {
        try {
          const receipt = await apiFetch('/orders', {
            method: 'POST',
            body: JSON.stringify({
              ...checkoutDetails,
              couponCode: appliedCoupon || undefined,
              paymentMethod: payment === 'bank' ? 'bank_transfer' : 'cod',
              items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
            }),
          });
          const localOrders = readSaved('moc-local-orders', []);
          localStorage.setItem('moc-local-orders', JSON.stringify([receipt, ...localOrders].slice(0, 20)));
          setOrderReceipt(receipt);
          setOrderPlaced(true);
          updateCart([]);
          setAppliedCoupon('');
          setCouponInput('');
          refreshCatalog().catch(() => {});
          return;
        } catch (apiError) {
          if (!/fetch|network|Failed|500|502|503|504|máy chủ/i.test(apiError.message)) {
            notify(`Chưa đặt được đơn hàng: ${apiError.message}`);
            return;
          }
        }
      }

      // Pure local fallback (no backend/API required)
      const orderCode = `MM${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
      const localReceipt = {
        id: `local-${Date.now()}`,
        orderCode,
        subtotal,
        discount: couponResult.discount,
        shippingFee: effectiveShippingFee,
        total: checkoutTotal,
        ...checkoutDetails,
        createdAt: new Date().toISOString(),
        hasPaymentProof: false,
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          lineTotal: item.price * item.quantity,
        })),
        paymentMethod: payment === 'bank' ? 'bank_transfer' : 'cod',
        paymentStatus: 'unpaid',
        status: 'pending',
        history: [{ status: 'pending', note: 'Đơn hàng được tạo tại chế độ Local.', createdAt: new Date().toISOString() }],
        bank: payment === 'bank' ? {
          name: 'MB Bank',
          account: '03335212100405',
          accountName: 'PHAN DUYEN ANH',
          qrImage: '/qr-chuyen-khoan.png',
          note: `Chuyển khoản đúng số tiền và ghi nội dung ${orderCode}.`,
        } : null,
      };
      const localOrders = readSaved('moc-local-orders', []);
      localStorage.setItem('moc-local-orders', JSON.stringify([localReceipt, ...localOrders].slice(0, 20)));
      const nextCatalog = catalog.map((p) => {
        const bought = cart.find((c) => c.id === p.id);
        if (!bought) return p;
        const nextStock = Math.max(0, Number(p.stock ?? 12) - bought.quantity);
        return { ...p, stock: nextStock, tag: nextStock === 0 ? 'HẾT HÀNG' : nextStock <= 3 ? 'SẮP HẾT' : '' };
      });
      setCatalog(nextCatalog);
      const savedLocalProds = readSaved('moc-local-products-v2', null);
      if (Array.isArray(savedLocalProds)) {
        localStorage.setItem('moc-local-products-v2', JSON.stringify(savedLocalProds.map((p) => {
          const bought = cart.find((c) => c.id === p.id);
          return bought ? { ...p, stock: Math.max(0, Number(p.stock ?? 12) - bought.quantity) } : p;
        })));
      }
      setOrderReceipt(localReceipt);
      setOrderPlaced(true);
      updateCart([]);
      setAppliedCoupon('');
      setCouponInput('');
      notify('Đã lưu đơn hàng tại máy (Local Mode).');
    } finally {
      setOrdering(false);
    }
  };

  const reportPayment = async () => {
    if (!orderReceipt?.id || orderReceipt.paymentReportedAt || orderReceipt.paymentStatus === 'paid') return;
    if (String(orderReceipt.id).startsWith('local-')) {
      setOrderReceipt((current) => ({ ...current, paymentStatus: 'pending_confirmation', paymentReportedAt: new Date().toISOString() }));
      notify('Đã ghi nhận thông báo chuyển khoản (Local Mode).');
      return;
    }
    try {
      const result = await apiFetch(`/orders/${orderReceipt.id}/report-payment`, {
        method: 'POST',
        headers: orderReceipt.guestOrderToken ? { 'X-Order-Access-Token': orderReceipt.guestOrderToken } : {},
        body: '{}',
      });
      setOrderReceipt((current) => ({ ...current, ...result }));
      notify('Đã báo cửa hàng kiểm tra giao dịch. Đơn sẽ được xác nhận sau khi nhân viên đối soát.');
    } catch (error) {
      notify(`Chưa gửi được thông báo chuyển khoản: ${error.message}`);
    }
  };

  return (
    <div className="site-shell">
      <div className="announcement">
        <span>Miễn phí giao hàng cho đơn từ 500.000₫</span>
        <span className="announcement-separator">✳</span>
        <span>Hoa tươi mỗi ngày, trao gửi yêu thương</span>
        <ArrowRight size={14} />
      </div>

      <header className="header">
        <button className="mobile-menu icon-button" aria-label="Mở danh mục" onClick={() => setMobileMenu(!mobileMenu)}><Menu /></button>
        <a className="brand" href="#" aria-label="Mộc Miên trang chủ">
          <span className="brand-mark"><Flower2 size={27} strokeWidth={1.45} /></span>
          <span className="brand-name">mộc miên<span className="brand-dot">.</span><small>FLOWER STUDIO</small></span>
        </a>
        <nav className={mobileMenu ? 'main-nav nav-open' : 'main-nav'}>
          <a href="#san-pham" onClick={() => setMobileMenu(false)}>Cửa hàng</a>
          <a href="#danh-muc" onClick={() => setMobileMenu(false)}>Danh mục</a>
          <a href="#ve-chung-toi" onClick={() => setMobileMenu(false)}>Về Mộc Miên</a>
          <button className="nav-track" type="button" onClick={() => { setTrackOpen(true); setMobileMenu(false); }}><PackageSearch size={14} /> Tra cứu đơn</button>
          <button className="nav-ai" onClick={() => { setAiOpen(true); setMobileMenu(false); }}><Sparkles size={14} /> Tư vấn chọn hoa</button>
        </nav>
        <div className="header-actions">
          <label className="header-search" onClick={(e) => { if (window.innerWidth <= 780) e.currentTarget.querySelector('input')?.focus(); }}><Search size={17} /><input id="header-search-input" name="search" aria-label="Tìm kiếm bó hoa" placeholder="Tìm một điều dịu dàng..." value={query} onChange={(e) => { setQuery(e.target.value); scrollToProducts(); }} /></label>
          <button className={showFavorites ? 'icon-button favorite-header is-favorite' : 'icon-button favorite-header'} aria-label="Hoa yêu thích" onClick={() => { setCategory('all'); setQuery(''); setShowFavorites(!showFavorites); scrollToProducts(); }}><Heart size={20} fill={showFavorites ? 'currentColor' : 'none'} /><span className="header-counter">{favorites.length}</span></button>
          <button className="account-header-button" aria-label={user ? 'Tài khoản' : 'Đăng nhập tùy chọn'} onClick={() => setAccountOpen(true)}><UserRound size={17} /><span>{user ? user.fullName.split(' ')[0] : 'Tài khoản'}</span></button>
          {user?.role === 'admin' && <button className="admin-entry" onClick={() => setAdminOpen(true)}>Quản trị</button>}
          {user?.role === 'staff' && <button className="admin-entry staff-entry" onClick={() => setStaffOpen(true)}>Nhân viên</button>}
          <button className="icon-button bag-button" aria-label="Giỏ hàng" onClick={() => setCartOpen(true)}><ShoppingBag size={20} /><span className="header-counter">{cartCount}</span></button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span /> HOA TƯƠI, TỪ TRÁI TIM</div>
            <h1>Một chút hoa,<br />thêm <em>nhiều</em> dịu dàng.</h1>
            <p>Mỗi bó hoa là một lời thương chưa kịp nói. Để Mộc Miên giúp bạn chọn món quà thật đúng với cảm xúc.</p>
            <div className="hero-buttons">
              <button className="button-primary" onClick={scrollToProducts}>Khám phá hoa <ArrowRight size={17} /></button>
              <button className="button-text" onClick={() => setAiOpen(true)}><Sparkles size={16} /> Nhờ AI chọn giúp</button>
            </div>
            <div className="hero-social-proof">
              <div className="avatar-stack"><span>🌷</span><span>🌼</span><span>🌸</span></div>
              <div><div className="rating-stars">★★★★★</div><small>Được yêu thương bởi <b>2.000+</b> khách hàng</small></div>
            </div>
            <div className="hero-flower-doodle">✳</div>
          </div>
          <div className="hero-art">
            <div className="hero-image-frame"><img src={imageUrl('photo-1490750967868-88aa4486c946', 1200)} alt="Bó hoa tươi dịu dàng trong nắng" /></div>
            <div className="hero-image-accent" />
            <div className="hero-note"><span className="note-flower">✿</span><div><strong>Gói ghém bằng tay</strong><small>Chăm chút từng cành hoa</small></div><ArrowUpRight size={17} /></div>
            <div className="hero-round-label"><span>FLOWERS • LOVE • JOY • </span></div>
          </div>
          <div className="hero-bottom-note"><Leaf size={15} /> Hoa tươi tuyển chọn mỗi sáng <span>·</span> Giao tận tay trong ngày</div>
        </section>

        <section className="service-strip" id="ve-chung-toi">
          <div><span className="service-icon"><Flower2 size={19} /></span><div><b>Hoa tươi mỗi ngày</b><small>Chọn hoa mới mỗi sáng</small></div></div>
          <div><span className="service-icon"><Truck size={19} /></span><div><b>Giao hoa tận tay</b><small>Chỉn chu đến từng khoảnh khắc</small></div></div>
          <div><span className="service-icon"><Heart size={19} /></span><div><b>Gói quà bằng yêu thương</b><small>Thiệp viết tay miễn phí</small></div></div>
          <div><span className="service-icon"><CircleHelp size={19} /></span><div><b>Luôn có người lắng nghe</b><small>Tư vấn thật lòng, chọn đúng hoa</small></div></div>
        </section>

        <section className="category-section" id="danh-muc">
          <div className="section-heading centered">
            <div className="eyebrow"><span /> GÓC HOA MỘC MIÊN <span /></div>
            <h2>Một bông hoa, <em>ngàn lời thương</em></h2>
            <p>Chọn một sắc hoa, gửi đi điều bạn đang nghĩ.</p>
          </div>
          <div className="category-grid">
            {[
              { id: 'roses', title: 'Hoa hồng', subtitle: 'Nồng nàn & lãng mạn', img: '/flowers/category-hoa-hong.png', bg: '#f2e6e3' },
              { id: 'bouquets', title: 'Bó hoa tươi', subtitle: 'Gói trọn điều muốn nói', img: '/flowers/category-bo-hoa-tuoi.png', bg: '#eee9df' },
              { id: 'tulips', title: 'Tulip nhập khẩu', subtitle: 'Dịu dàng theo cách riêng', img: '/flowers/category-tulip-nhap-khau.png', bg: '#eee6e9' },
              { id: 'occasion', title: 'Hoa & chậu xinh', subtitle: 'Tươi vui ở mọi góc nhà', img: '/flowers/category-hoa-chau-xinh.png', bg: '#e7e9e1' },
            ].map((item) => <button className="category-card" key={item.id} style={{ '--card-tone': item.bg }} onClick={() => { setCategory(item.id); scrollToProducts(); }}>
              <span className="category-photo"><img src={imageUrl(item.img, 600)} alt={item.title} /></span>
              <span className="category-info"><span><b>{item.title}</b><small>{item.subtitle}</small></span><span className="category-arrow"><ArrowUpRight size={18} /></span></span>
            </button>)}
          </div>
        </section>

        <section className="products-section" id="san-pham">
          <div className="product-heading">
            <div className="section-heading">
              <div className="eyebrow"><span /> {showFavorites ? 'NHỮNG BÓ HOA BẠN YÊU THÍCH' : 'ĐƯỢC CHỌN NHIỀU NHẤT'}</div>
              <h2>{showFavorites ? <>Hoa bạn <em>thương mến</em></> : <>Hoa xinh cho <em>ngày lành</em></>}</h2>
              <p>Mỗi ngày đều xứng đáng có một chút hoa.</p>
            </div>
            <button className="view-all" onClick={() => { setCategory('all'); setQuery(''); setShowFavorites(false); setShowAllProducts(true); }}>Xem tất cả <ArrowRight size={16} /></button>
          </div>

          <div className="catalog-controls">
            <div className="category-tabs">
              {shopCategories.map((item) => <button key={item.id} className={category === item.id ? 'category-tab active' : 'category-tab'} onClick={() => setCategory(item.id)}>
                <span>{item.icon}</span>{item.label}
              </button>)}
            </div>
            <div className="filter-controls">
              <label className="select-wrap"><span>Khoảng giá</span><select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}><option value="all">Tất cả mức giá</option><option value="400000">Dưới 400.000₫</option><option value="600000">Dưới 600.000₫</option><option value="900000">Dưới 900.000₫</option></select><ChevronDown size={14} /></label>
              <label className="select-wrap sort-select"><ArrowDownUp size={14} /><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="popular">Sắp xếp: Nổi bật</option><option value="low">Giá: Thấp đến cao</option><option value="high">Giá: Cao đến thấp</option></select><ChevronDown size={14} /></label>
            </div>
          </div>

          <div className="product-grid">
            {visibleProducts.slice(0, showAllProducts ? visibleProducts.length : 8).map((product, index) => <article className={Number(product.stock) === 0 ? 'product-card sold-out' : 'product-card'} key={product.id}>
              <div className="product-image" style={{ '--product-tone': product.tone }} onClick={() => setSelectedProduct(product)}>
                <img src={imageUrl(product.image)} alt={product.name} loading={index > 3 ? 'lazy' : 'eager'} />
                {Number(product.stock) === 0
                  ? <><span className="product-tag sold-out-tag">HẾT HÀNG</span><span className="sold-out-overlay">TẠM THỜI HẾT HOA</span></>
                  : product.tag && <span className="product-tag">{product.tag}</span>}
                <button className={favorites.includes(product.id) ? 'favorite-button is-favorite' : 'favorite-button'} aria-label={favorites.includes(product.id) ? `Bỏ ${product.name} khỏi yêu thích` : `Thêm ${product.name} vào yêu thích`} aria-pressed={favorites.includes(product.id)} onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}><Heart size={17} fill={favorites.includes(product.id) ? 'currentColor' : 'none'} /></button>
                <span className={compare.some((item) => item.id === product.id) ? 'compare-check checked' : 'compare-check'} role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); toggleCompare(product); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleCompare(product); } }}><Check size={12} /> So sánh</span>
              </div>
              <div className="product-info">
                <div className="product-title-row"><button className="product-name" onClick={() => setSelectedProduct(product)}>{product.name}</button><span className="product-rating"><Star size={12} fill="currentColor" /> 4.9</span></div>
                <p>{product.detail}</p>
                <div className="product-price-row"><strong>{formatPrice(product.price)}</strong>{product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}<span className={Number(product.stock) === 0 ? 'product-stock-out' : Number(product.stock) <= 3 ? 'product-stock-low' : 'product-stock-available'}>{Number(product.stock) === 0 ? 'Hết hàng' : Number(product.stock) <= 3 ? `Còn ${product.stock}` : 'Còn hàng'}</span></div>
                <div className="product-card-actions">
                  <button className="product-details-button" type="button" onClick={() => setSelectedProduct(product)}>Xem giá & chi tiết</button>
                  <button className="product-add-button" type="button" disabled={Number(product.stock) <= 0} onClick={() => addToCart(product)}><ShoppingBag size={13} />{Number(product.stock) <= 0 ? 'Hết hàng' : 'Thêm giỏ'}</button>
                </div>
              </div>
            </article>)}
          </div>
          {visibleProducts.length === 0 && <div className="empty-results"><Flower2 size={32} /><b>Chưa tìm thấy bó hoa phù hợp</b><span>Thử một từ khóa khác hoặc bỏ bớt bộ lọc nhé.</span><button onClick={() => { setQuery(''); setCategory('all'); setMaxPrice('all'); setShowFavorites(false); }}>Xóa bộ lọc</button></div>}
          {!showAllProducts && visibleProducts.length > 8 && <div className="catalog-more"><span>Đang xem 8 trong {visibleProducts.length} bó hoa xinh</span><button className="button-outline" onClick={() => setShowAllProducts(true)}>Khám phá toàn bộ bộ sưu tập <ArrowRight size={15} /></button></div>}
        </section>

        <section className="ai-banner">
          <div className="ai-banner-copy">
            <div className="eyebrow light"><Sparkles size={14} /> MỘC MIÊN AI — NGƯỜI BẠN CHỌN HOA</div>
            <h2>Chưa biết chọn hoa gì?<br /><em>Để tụi mình hỏi han một chút.</em></h2>
            <p>Kể về người bạn muốn tặng, dịp đặc biệt hay ngân sách dự kiến. Mộc Miên AI sẽ tìm những bó hoa thật có trong tiệm.</p>
            <button className="button-cream" onClick={() => setAiOpen(true)}>Bắt đầu trò chuyện <ArrowRight size={16} /></button>
            <div className="ai-caption"><span className="ai-sparkle">✳</span> Gợi ý dựa trên hoa và giá thực tế tại tiệm</div>
          </div>
          <div className="ai-banner-visual">
            <div className="ai-visual-flower">✿</div><div className="ai-mini-card"><span className="ai-mini-icon"><Sparkles size={15} /></span><span><b>“Tặng mẹ, ngân sách 300k”</b><small>Đã tìm thấy 3 bó hoa phù hợp</small></span><ArrowUpRight size={15} /></div>
          </div>
        </section>

        <section className="quote-section">
          <span className="quote-mark">“</span>
          <blockquote>Có những điều khó nói thành lời,<br />mình gửi cùng một bó hoa nhé.</blockquote>
          <span className="quote-author">THÂN THƯƠNG, MỘC MIÊN <span>✳</span></span>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand"><a className="brand" href="#"><span className="brand-mark"><Flower2 size={25} /></span><span className="brand-name">mộc miên<span className="brand-dot">.</span><small>FLOWER STUDIO</small></span></a><p>Hoa tươi mỗi ngày.<br />Yêu thương theo cách dịu dàng.</p><div className="social-caption">Ghé thăm tụi mình trên mạng xã hội</div><div className="social-links">
            <a className="social-facebook" href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook" title="Mở Facebook"><Facebook size={17} strokeWidth={2.1} /></a>
            <a className="social-instagram" href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram" title="Mở Instagram"><Instagram size={17} strokeWidth={1.9} /></a>
            <a className="social-tiktok" href="https://www.tiktok.com/" target="_blank" rel="noreferrer" aria-label="TikTok" title="Mở TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.6 7.2a6.8 6.8 0 0 1-4.2-1.5v8.1a6.1 6.1 0 1 1-5.3-6V12a2.5 2.5 0 1 0 1.8 2.4V2.5h3.5a6.8 6.8 0 0 0 4.2 4.1v.6Z" /></svg></a>
          </div><small className="social-note">Thay liên kết bằng trang chính thức của tiệm.</small></div>
          <div><b className="footer-heading">Ghé tiệm</b><a href="#san-pham">Tất cả hoa</a><a href="#danh-muc">Hoa theo dịp</a><a href="#san-pham">Hoa đang được yêu thích</a><a href="#san-pham">Gói quà & thiệp</a></div>
          <div><b className="footer-heading">Mộc Miên</b><a href="#ve-chung-toi">Câu chuyện của tiệm</a><a href="#ve-chung-toi">Chăm sóc hoa</a><button className="footer-policy-link" type="button" onClick={() => setTrackOpen(true)}>Tra cứu đơn hàng</button><button className="footer-policy-link" type="button" onClick={() => setPolicyOpen(true)}>Chính sách đặt hoa & giao hàng</button><a href="#ve-chung-toi">Liên hệ tụi mình</a><a href="tel:0795670902">Điện thoại: 0795670902</a><a href="https://www.google.com/maps/search/?api=1&query=Th%C3%A0nh+ph%E1%BB%91+Hu%E1%BA%BF%2C+Vi%E1%BB%87t+Nam" target="_blank" rel="noreferrer">Địa chỉ: Thành phố Huế</a></div>
          <div className="footer-newsletter"><b className="footer-heading">Một chút hoa trong hộp thư</b><p>Nhận lời nhắn ngọt ngào và những bó hoa mới nhất nhé.</p><form onSubmit={(e) => { e.preventDefault(); notify('Cảm ơn bạn đã ghé thăm Mộc Miên!'); }}><input aria-label="Email của bạn" type="email" placeholder="Email của bạn" required /><button aria-label="Đăng ký nhận tin"><ArrowRight size={17} /></button></form><small>Đăng ký là đồng ý nhận tin từ Mộc Miên.</small></div>
        </div>
        <div className="footer-bottom"><span>© 2025 Mộc Miên Flower Studio. Made with <Heart size={12} fill="currentColor" /> in Huế.</span><span>Giao hoa mỗi ngày · 08:00 — 21:00</span></div>
      </footer>

      {!aiOpen && !adminOpen && !staffOpen && (
        <button
          type="button"
          className={`floating-ai-button ${compare.length > 0 ? 'has-compare' : ''}`}
          onClick={() => setAiOpen(true)}
          aria-label="Mở trợ lý AI tư vấn chọn hoa"
        >
          <span className="floating-ai-pulse" aria-hidden="true" />
          <Sparkles size={18} />
          <span>Hỏi Mộc Miên AI</span>
        </button>
      )}

      {compare.length > 0 && <div className="compare-dock"><span><b>{compare.length}</b> sản phẩm đã chọn</span><button className="compare-action" onClick={() => setCompareOpen(true)}>So sánh ngay <ArrowRight size={15} /></button><button className="dock-close" aria-label="Xóa lựa chọn so sánh" onClick={() => setCompare([])}><X size={16} /></button></div>}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}

      {(cartOpen || compareOpen || aiOpen || checkoutOpen || selectedProduct || accountOpen || policyOpen || trackOpen) && <div className="modal-backdrop" onClick={() => { setCartOpen(false); setCompareOpen(false); setAiOpen(false); setCheckoutOpen(false); setSelectedProduct(null); setAccountOpen(false); setPolicyOpen(false); setTrackOpen(false); }} />}
      {(adminOpen || staffOpen) && <div className="admin-backdrop" onClick={() => { setAdminOpen(false); setStaffOpen(false); }} />}
      {accountOpen && <AccountPanel user={user} setUser={(nextUser) => { setUser(nextUser); if (nextUser) localStorage.setItem('moc-user', JSON.stringify(nextUser)); else localStorage.removeItem('moc-user'); }} onClose={() => setAccountOpen(false)} onHome={goHome} onAdminOpen={() => setAdminOpen(true)} onStaffOpen={() => setStaffOpen(true)} notify={notify} />}
      {adminOpen && user?.role === 'admin' && <AdminDashboard
        user={user}
        onClose={() => { setAdminOpen(false); refreshCatalog().catch(() => {}); }}
        onHome={() => { goHome(); refreshCatalog().catch(() => {}); }}
        onLogout={() => {
          saveToken(null);
          localStorage.removeItem('moc-user');
          setUser(null);
          setFavorites([]);
          localStorage.removeItem('moc-favorites');
          setAdminOpen(false);
          notify('Quản trị viên đã đăng xuất.');
        }}
        notify={notify}
      />}
      {staffOpen && user?.role === 'staff' && <StaffDashboard
        user={user}
        onClose={() => { setStaffOpen(false); refreshCatalog().catch(() => {}); }}
        onHome={() => { goHome(); refreshCatalog().catch(() => {}); }}
        onLogout={() => {
          saveToken(null);
          localStorage.removeItem('moc-user');
          setUser(null);
          setFavorites([]);
          localStorage.removeItem('moc-favorites');
          setStaffOpen(false);
          notify('Nhân viên đã đăng xuất.');
        }}
        notify={notify}
      />}

      {cartOpen && <aside className="side-panel" aria-label="Giỏ hàng">
        <div className="panel-heading"><div><span className="eyebrow">MỘC MIÊN STUDIO</span><h3>Giỏ hoa của bạn <span>({cartCount})</span></h3></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Đóng giỏ hàng"><X /></button></div>
        {cart.length ? <><div className="cart-items">{cart.map((item) => { const current = latestProduct(item); const available = Number(current.stock); return <div className="cart-item" key={item.id}><img src={imageUrl(item.image, 180)} alt={item.name} /><div className="cart-item-info"><b>{item.name}</b><span>{item.detail}</span><strong>{formatPrice(item.price)}</strong><span className={available === 0 ? 'cart-stock-out' : 'cart-stock-available'}>{available === 0 ? 'ĐÃ HẾT HÀNG' : current.stock !== undefined ? `Còn ${available} bó` : 'Còn hàng'}</span><div className="quantity-control"><button aria-label="Giảm số lượng" onClick={() => changeQuantity(item.id, -1)}><Minus size={13} /></button><span>{item.quantity}</span><button aria-label="Tăng số lượng" disabled={current.stock !== undefined && (available === 0 || item.quantity >= available)} onClick={() => changeQuantity(item.id, 1)}><Plus size={13} /></button></div></div><button className="remove-item" aria-label={`Xóa ${item.name}`} onClick={() => updateCart(cart.filter((product) => product.id !== item.id))}><X size={15} /></button></div>; })}</div>
          {unavailableCartItems.length > 0 && <p className="cart-stock-warning" role="alert">Một số hoa trong giỏ đã hết hoặc không còn đủ số lượng. Hãy giảm số lượng hoặc xóa sản phẩm đó để tiếp tục.</p>}
          <div className="cart-footer"><div className="shipping-note"><Truck size={16} />{subtotal >= 500000 ? 'Đơn hàng được miễn phí giao hàng 🌷' : `Mua thêm ${formatPrice(500000 - subtotal)} để được miễn phí giao hàng`}</div><div className="cart-subtotal"><span>Tạm tính</span><b>{formatPrice(subtotal)}</b></div><small>Phí giao hàng 30.000₫ cho đơn dưới 500.000₫.</small><button className="button-primary full-button" disabled={unavailableCartItems.length > 0} onClick={() => { setCartOpen(false); setCheckoutOpen(true); setOrderPlaced(false); setCheckoutStep('details'); setCheckoutDetails(null); }}>Tiến hành đặt hoa <ArrowRight size={17} /></button><button className="continue-shopping" onClick={() => setCartOpen(false)}>Tiếp tục chọn hoa</button></div></>
          : <div className="cart-empty"><span>✿</span><h4>Giỏ hoa còn đang nhớ bạn</h4><p>Thêm một bó hoa xinh để gửi yêu thương nhé.</p><button className="button-primary" onClick={() => { setCartOpen(false); scrollToProducts(); }}>Chọn hoa ngay <ArrowRight size={15} /></button></div>}
      </aside>}

      {currentSelectedProduct && <div className="product-modal modal-card"><button className="modal-close" onClick={() => setSelectedProduct(null)} aria-label="Đóng"><X /></button><img src={imageUrl(currentSelectedProduct.image, 900)} alt={currentSelectedProduct.name} /><div className="product-modal-info"><span className="eyebrow"><span /> HOA TƯƠI MỘC MIÊN</span><h3>{currentSelectedProduct.name}</h3><div className="product-modal-rating"><Star size={14} fill="currentColor" /> <b>{productReviews.averageRating || 4.9}</b> <span>({productReviews.totalReviews ? `${productReviews.totalReviews} đánh giá` : 'Được khách hàng yêu thích'})</span></div><p>{currentSelectedProduct.detail}. Được tuyển chọn và gói thủ công tại Mộc Miên.</p><div className="modal-occasion"><Flower2 size={16} /> Phù hợp: {currentSelectedProduct.occasion}</div><div className="modal-price-row"><strong className="modal-price">{formatPrice(currentSelectedProduct.price)}</strong>{currentSelectedProduct.oldPrice && <del className="modal-old-price">{formatPrice(currentSelectedProduct.oldPrice)}</del>}</div><span className={Number(currentSelectedProduct.stock) === 0 ? 'product-stock-out' : 'product-stock-available'}>{Number(currentSelectedProduct.stock) === 0 ? 'Sản phẩm hiện đã hết hàng' : `Còn ${currentSelectedProduct.stock ?? 'hàng'} trong kho`}</span><button className="button-primary full-button" disabled={Number(currentSelectedProduct.stock) === 0} onClick={() => { if (addToCart(currentSelectedProduct)) { setSelectedProduct(null); setCartOpen(true); } }}>{Number(currentSelectedProduct.stock) === 0 ? 'Đã hết hàng' : 'Thêm vào giỏ'} <ShoppingBag size={16} /></button><div className="product-modal-care"><Leaf size={15} /> Hoa tươi tuyển chọn trong ngày · Giao hoa tận tay</div><div className="product-reviews-box"><b>Nhận xét từ khách hàng</b>{productReviews.reviews?.length ? <div className="product-reviews-list">{productReviews.reviews.map((rev) => <article className="product-review-item" key={rev.id}><div><b>{rev.customerName}</b><span><Star size={12} fill="currentColor" /> {rev.rating}</span></div><p>{rev.comment}</p></article>)}</div> : <small className="product-reviews-empty">Chưa có đánh giá chi tiết cho bó hoa này. Khách hàng có thể đánh giá sau khi đơn được giao thành công.</small>}</div></div></div>}

      {compareOpen && <div className="compare-modal modal-card"><button className="modal-close" onClick={() => setCompareOpen(false)} aria-label="Đóng"><X /></button><div className="eyebrow centered"><span /> CÙNG CHỌN BÓ HOA ƯNG Ý <span /></div><h3>So sánh những bó hoa</h3><p className="compare-intro">Đặt cạnh nhau để tìm bó hoa phù hợp nhất nhé.</p>{compare.length < 2 && <div className="compare-hint">Chọn thêm ít nhất một sản phẩm nữa để so sánh.</div>}<div className="compare-table"><div className="compare-labels"><span>SẢN PHẨM</span><span>GIÁ BÁN</span><span>THÀNH PHẦN</span><span>DỊP TẶNG</span><span>TÌNH TRẠNG</span></div>{compare.map((item) => { const current = latestProduct(item); const soldOut = Number(current.stock) === 0; return <div className="compare-column" key={item.id}><img src={imageUrl(item.image, 260)} alt={item.name} /><b>{item.name}</b><strong>{formatPrice(item.price)}</strong><span>{item.detail}</span><span>{item.occasion}</span><span className={soldOut ? 'compare-stock-out' : 'in-stock'}>{soldOut ? 'Đã hết hàng' : <><Check size={14} /> Còn {current.stock ?? 'hàng'}</>}</span><button className="button-primary mini-button" disabled={soldOut} onClick={() => { if (addToCart(current)) { setCompareOpen(false); setCartOpen(true); } }}>{soldOut ? 'Đã hết hàng' : 'Chọn bó hoa'}</button></div>; })}</div></div>}

      {aiOpen && <div className="ai-chat modal-card" role="dialog" aria-modal="true" aria-label="Mộc Miên AI" onKeyDown={(e) => { if (e.key === 'Escape') setAiOpen(false); }}><div className="chat-heading"><span className="chat-avatar"><Sparkles size={19} /></span><div><b>Mộc Miên AI · Trợ lý chọn hoa</b><small><span /> {aiBusy ? 'Đang phân tích ngữ cảnh & kho hoa...' : 'Sẵn sàng · Hiểu ngữ cảnh & chính sách tiệm'}</small></div><button className="icon-button" onClick={() => setAiOpen(false)} aria-label="Đóng tư vấn"><X /></button></div><div className="chat-messages"><div className="chat-welcome"><div className="chat-flower">✿</div><h3>Chào bạn, mình là Miên.</h3><p>Trợ lý AI được huấn luyện riêng cho tiệm hoa Mộc Miên: hiểu dịp tặng, màu sắc, ngân sách đa lượt, tồn kho thực tế và chính sách ưu đãi của cửa hàng.</p><div className="suggestion-chips">{['Tặng mẹ, ngân sách 500k', 'Hoa lãng mạn tặng bạn gái', 'Có mã giảm giá nào không?', 'Phí ship & giao hàng thế nào?'].map((suggestion) => <button key={suggestion} disabled={aiBusy} onClick={() => askAdvisor(suggestion)}>{suggestion} <ArrowUpRight size={13} /></button>)}</div></div>{messages.map((item, index) => <div className={`chat-message ${item.role}`} key={`${item.role}-${index}`}><span style={{ whiteSpace: 'pre-line' }}>{item.text}</span>{item.role === 'assistant' && <div className="ai-xai-meta"><span>🎯 {item.intent || 'Tư vấn chọn hoa'}</span>{item.budget ? <span>💰 Ngân sách ≤ {formatPrice(item.budget)}</span> : null}{typeof item.candidateCount === 'number' && item.candidateCount > 0 ? <span>📦 {item.candidateCount} mẫu đạt ràng buộc</span> : null}</div>}{item.role === 'assistant' && item.queryTokens?.length > 0 && <details className="ai-inspector"><summary>Xem phân tích vector & từ khóa ({item.queryTokens.length} tokens)</summary><div className="ai-token-list">{item.queryTokens.map((tok, i) => <code key={`${tok}-${i}`}>{tok}</code>)}</div></details>}{item.role === 'assistant' && item.providerWarning && <small className="ai-provider-warning" role="status">{item.providerWarning}</small>}{item.products?.length > 0 && <div className="chat-recommendations">{item.products.map((product) => <div className="chat-rec-row" key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><button style={{ flex: 1 }} onClick={() => { setAiOpen(false); setSelectedProduct(product); }}><img src={imageUrl(product.image, 120)} alt="" /><span><b>{product.name}</b><small>{formatPrice(product.price)}{product.matchReason ? ` · ${product.matchReason}` : ''}</small></span><ChevronRight size={14} /></button><button type="button" className="button-outline" style={{ padding: '6px 10px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={() => addToCart(product)}>+ Giỏ</button></div>)}</div>}</div>)}</div><form className="chat-input" onSubmit={(e) => { e.preventDefault(); askAdvisor(); }}><input value={message} disabled={aiBusy} onChange={(e) => setMessage(e.target.value)} placeholder="Hỏi Miên về hoa, ngân sách, dịp tặng hoặc mã giảm giá..." /><button aria-label="Gửi tin nhắn" disabled={aiBusy}><Send size={17} /></button></form><small className="chat-disclaimer">Pipeline AI: Phân loại ý định → Mở rộng ngữ nghĩa → Vector TF-IDF + Cosine → Lọc cứng tồn kho & ngân sách.</small></div>}

      {checkoutOpen && <div className="checkout-modal modal-card">
        <button className="modal-close" onClick={() => setCheckoutOpen(false)} aria-label="Đóng"><X /></button>
        {orderPlaced ? <div className="order-success">
          <span><Check size={27} /></span>
          <div className="eyebrow centered"><span /> MỘC MIÊN ĐÃ NHẬN ĐƯỢC LỜI NHẮN <span /></div>
          <h3>Cảm ơn bạn đã gửi yêu thương.</h3>
          <p>Tụi mình đã lưu đơn hàng <b>{orderReceipt?.orderCode}</b>. Theo dõi tiến trình tại mục <b>Tra cứu đơn</b> hoặc <b>Tài khoản &gt; Đơn hàng</b>.</p>
          {payment === 'bank' && orderReceipt?.bank && <div className="bank-qr">
            <img className="bank-qr-image" src={orderReceipt.bank.qrImage} alt="Mã QR chuyển khoản MB Bank" />
            <div>
              <b>Quét QR để chuyển khoản</b>
              <span>Ngân hàng: {orderReceipt.bank.name}</span>
              <span>Số tài khoản: {orderReceipt.bank.account}</span>
              <span>Tên tài khoản: {orderReceipt.bank.accountName}</span>
              <span>Số tiền: <strong>{formatPrice(orderReceipt.total)}</strong></span>
              <span>Nội dung chuyển khoản: <strong>{orderReceipt.orderCode}</strong></span>
              <small>{orderReceipt.bank.note}</small>
              {orderReceipt.paymentStatus === 'paid'
                ? <strong className="payment-confirmed-message">Đã xác nhận thanh toán thành công.</strong>
                : orderReceipt.paymentReportedAt
                  ? <strong className="payment-waiting-message">Đã báo chuyển khoản · Đang chờ cửa hàng xác nhận.</strong>
                  : <button className="button-primary full-button" onClick={reportPayment}>Tôi đã chuyển khoản</button>}
              <PaymentProof
                orderId={orderReceipt.id}
                accessToken={orderReceipt.guestOrderToken}
                hasProof={Boolean(orderReceipt.hasPaymentProof)}
                canUpload={orderReceipt.paymentStatus !== 'paid'}
                onUploaded={(result) => setOrderReceipt((current) => ({ ...current, ...result }))}
              />
            </div>
          </div>}
          {orderReceipt && <button className="button-outline checkout-invoice-button" type="button" onClick={() => setReceiptInvoiceOpen(true)}><Printer size={14} /> Xem / in hóa đơn</button>}
          <button className="button-primary" onClick={() => setCheckoutOpen(false)}>Tiếp tục ghé tiệm <ArrowRight size={16} /></button>
        </div> : checkoutStep === 'details' ? <>
          <div className="eyebrow"><span /> GỬI ĐI MỘT ĐIỀU DỊU DÀNG</div>
          <h3>Thông tin nhận hoa</h3>
          <p className="guest-checkout-note">Đặt hoa nhanh, không cần đăng nhập hay tạo tài khoản.</p>
          {checkoutError && <p className="checkout-validation-error" role="alert">{checkoutError}</p>}
          <form className="checkout-form" onSubmit={placeOrder}>
            <label>Họ tên người nhận<input name="recipientName" required minLength="2" placeholder="Tên người nhận hoa" /></label>
            <div className="checkout-row">
              <label>Số điện thoại<input name="phone" required minLength="8" type="tel" placeholder="09xx xxx xxx" /></label>
              <label>Ngày giao hoa<input name="deliveryDate" required type="date" min={new Date().toISOString().slice(0, 10)} /></label>
            </div>
            <label>Địa chỉ giao hàng<input name="address" required minLength="5" placeholder="Số nhà, đường, phường, quận..." /></label>
            <small className="checkout-field-hint">Nhập địa chỉ cụ thể, tối thiểu 5 ký tự.</small>
            <div className="free-card-note"><b>🎁 Tặng kèm thiệp chúc mừng miễn phí</b><span>Để lại lời nhắn, Mộc Miên sẽ viết lên thiệp gửi cùng hoa.</span></div>
            <label>Lời nhắn trên thiệp miễn phí<textarea name="cardMessage" placeholder="Ví dụ: Chúc mừng tốt nghiệp, luôn rực rỡ nhé!" rows="2" /></label>
            <div className="coupon-box">
              <div className="coupon-input-row">
                <Tag size={15} />
                <input id="coupon-code-input" name="couponCode" aria-label="Mã ưu đãi" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Nhập mã ưu đãi (MOCMIEN10, FREESHIP...)" />
                <button type="button" className="button-outline" onClick={() => applyCoupon()}>Áp dụng</button>
              </div>
              <div className="coupon-chips">{PROMO_COUPONS.map((c) => <button key={c.code} type="button" className={appliedCoupon === c.code ? 'coupon-chip active' : 'coupon-chip'} onClick={() => applyCoupon(c.code)}>{c.code} · {c.label}</button>)}</div>
              {couponError && <small className="checkout-validation-error">{couponError}</small>}
              {couponResult.valid && <small className="coupon-applied-note">Đã áp dụng <b>{couponResult.coupon.code}</b>: giảm {formatPrice(couponResult.discount + couponResult.shippingDiscount)}</small>}
            </div>
            <div className="checkout-total"><span>Tổng dự kiến (đã tính giao hàng{couponResult.valid ? ' & ưu đãi' : ''})</span><b>{formatPrice(checkoutTotal)}</b></div>
            <button className="button-primary full-button" type="submit">Gửi đơn & chọn thanh toán <ArrowRight size={16} /></button>
          </form>
        </> : <>
          <div className="eyebrow"><span /> BƯỚC CUỐI · THANH TOÁN</div>
          <h3>Chọn cách thanh toán</h3>
          <p className="payment-step-note">Đơn hoa gửi cho: <b>{checkoutDetails?.recipientName}</b>. Tặng kèm thiệp chúc mừng miễn phí{checkoutDetails?.cardMessage ? <> với lời nhắn: “{checkoutDetails.cardMessage}”</> : ', chưa có lời nhắn'}.</p>
          <div className="payment-options">
            <label className={payment === 'cod' ? 'payment-choice chosen' : 'payment-choice'}>
              <input type="radio" name="payment" value="cod" checked={payment === 'cod'} onChange={() => setPayment('cod')} />
              <span>💵</span><span><b>Tiền mặt khi nhận hoa</b><small>Thanh toán cho người giao hoa khi nhận hàng.</small></span>{payment === 'cod' && <Check size={16} />}
            </label>
            <label className={payment === 'bank' ? 'payment-choice chosen' : 'payment-choice'}>
              <input type="radio" name="payment" value="bank" checked={payment === 'bank'} onChange={() => setPayment('bank')} />
              <span>🏦</span><span><b>Chuyển khoản ngân hàng</b><small>Đơn hàng sẽ hiện mã QR sau khi xác nhận.</small></span>{payment === 'bank' && <Check size={16} />}
            </label>
          </div>
          <div className="checkout-total"><span>Tổng thanh toán</span><b>{formatPrice(checkoutTotal)}</b></div>
          <button className="button-primary full-button" disabled={ordering} onClick={submitOrder}>{ordering ? 'Đang gửi đơn...' : payment === 'bank' ? 'Gửi đơn & hiện mã QR' : 'Gửi đơn · trả tiền mặt khi nhận'} <ArrowRight size={16} /></button>
          <button className="continue-shopping" disabled={ordering} onClick={() => setCheckoutStep('details')}>Quay lại sửa thông tin / lời nhắn</button>
          <small className="checkout-note">Chuyển khoản được xác nhận sau khi nhân viên/Admin kiểm tra giao dịch.</small>
        </>}
      </div>}
      {trackOpen && <div className="track-modal modal-card" role="dialog" aria-modal="true" aria-label="Tra cứu đơn hàng">
        <button className="modal-close" onClick={() => setTrackOpen(false)} aria-label="Đóng"><X /></button>
        <div className="eyebrow"><span /> TRA CỨU ĐƠN HÀNG</div>
        <h3>Theo dõi đơn hoa của bạn</h3>
        <p className="guest-checkout-note">Nhập mã đơn hàng (ví dụ: MM...) và số điện thoại người nhận để xem tiến trình giao hoa.</p>
        <form className="track-form" onSubmit={trackOrder}>
          <input id="track-order-code" name="orderCode" aria-label="Mã đơn hàng" value={trackCode} onChange={(e) => setTrackCode(e.target.value)} placeholder="Mã đơn hàng (MM...)" required />
          <input id="track-order-phone" name="orderPhone" aria-label="Số điện thoại nhận hoa" value={trackPhone} onChange={(e) => setTrackPhone(e.target.value)} placeholder="Số điện thoại nhận hoa" required />
          <button className="button-primary" type="submit" disabled={trackingBusy}>{trackingBusy ? 'Đang tìm...' : 'Tra cứu'}</button>
        </form>
        {trackError && <p className="checkout-validation-error" role="alert">{trackError}</p>}
        {trackedOrder && <div className="tracked-order-card">
          <div className="order-card-top">
            <b>{trackedOrder.orderCode}</b>
            <span className={`order-status status-${trackedOrder.status}`}>{{ pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', preparing: 'Đang chuẩn bị', shipping: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy' }[trackedOrder.status] || trackedOrder.status}</span>
          </div>
          <small>Người nhận: <b>{trackedOrder.recipientName}</b> · {trackedOrder.phone}</small>
          <small>Địa chỉ: {trackedOrder.address}</small>
          <div className="order-card-items">{trackedOrder.items?.map((item, i) => <span key={i}>{item.name} × {item.quantity}</span>)}</div>
          <div className="tracked-order-footer">
            <strong>Tổng: {formatPrice(trackedOrder.total)}</strong>
            {trackedOrder.status === 'pending' && <button type="button" className="table-text-button danger-text-button" onClick={cancelTrackedOrder}>Hủy đơn hàng</button>}
          </div>
          {trackedOrder.history?.length > 0 && <div className="order-history">
            {trackedOrder.history.map((h, i) => <span key={i}><i />{h.note || h.status} · {new Date(h.createdAt).toLocaleString('vi-VN')}</span>)}
          </div>}
        </div>}
      </div>}
      {receiptInvoiceOpen && orderReceipt && <OrderInvoice
        order={orderReceipt}
        accessToken={orderReceipt.guestOrderToken}
        onClose={() => setReceiptInvoiceOpen(false)}
        canUploadProof
        onProofUploaded={(result) => setOrderReceipt((current) => current ? { ...current, ...result } : current)}
      />}
      {policyOpen && <section className="policy-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="policy-title">
        <button className="modal-close" type="button" onClick={() => setPolicyOpen(false)} aria-label="Đóng chính sách"><X /></button>
        <span className="eyebrow"><span /> MỘC MIÊN FLOWER STUDIO</span>
        <h2 id="policy-title">Chính sách đặt hoa & giao hàng</h2>
        <p className="policy-intro">Mộc Miên muốn mỗi đơn hoa đến tay bạn thật chỉn chu. Vui lòng xem các thông tin dưới đây trước khi đặt.</p>
        <div className="policy-content">
          <article><h3>Giao hàng</h3><p>Website đang áp dụng miễn phí giao hàng cho đơn từ <b>500.000₫</b>; đơn dưới mức này có phí giao <b>30.000₫</b>. Phí được tính lại trong giỏ hàng và bước thanh toán trước khi bạn gửi đơn.</p><p>Chọn ngày giao và ghi chính xác địa chỉ, số điện thoại người nhận. Thời gian giao dự kiến theo ngày bạn chọn; nếu cần đổi lịch hoặc địa chỉ, vui lòng gọi <a href="tel:0795670902">0795670902</a> sớm để cửa hàng kiểm tra khả năng hỗ trợ.</p><p>Giờ hoạt động: <b>08:00–21:00</b>. Nếu địa chỉ ngoài khu vực thành phố Huế, hãy liên hệ trước để xác nhận khả năng giao.</p></article>
          <article><h3>Hoa tươi & thay thế sản phẩm</h3><p>Hoa là sản phẩm tự nhiên nên sắc độ, dáng hoa và cách sắp xếp có thể chênh lệch nhẹ so với hình minh họa theo mùa và nguồn hoa thực tế.</p><p>Nếu loại hoa hoặc màu hoa đã chọn không còn, Mộc Miên sẽ liên hệ để thống nhất phương án thay thế; cửa hàng không tự ý đổi sang sản phẩm khác khi chưa trao đổi với khách.</p></article>
          <article><h3>Kiểm tra & hỗ trợ sau khi nhận</h3><p>Bạn vui lòng kiểm tra hoa khi nhận. Nếu hoa bị dập, hư hỏng hoặc đơn hàng có sai sót, hãy liên hệ sớm qua số <a href="tel:0795670902">0795670902</a> và gửi ảnh tình trạng để cửa hàng kiểm tra, đề xuất hướng hỗ trợ phù hợp.</p><p>Hoa tươi được chuẩn bị theo đơn nên việc hủy hoặc đổi mẫu có thể bị giới hạn khi cửa hàng đã bắt đầu chuẩn bị. Hãy gọi cửa hàng sớm nhất có thể để được kiểm tra tình trạng đơn.</p></article>
          <article><h3>Thanh toán</h3><p>Bạn có thể chọn thanh toán khi nhận hàng (COD) hoặc chuyển khoản. Với chuyển khoản, đơn chỉ được xác nhận đã thanh toán sau khi nhân viên/admin kiểm tra giao dịch; vui lòng chuyển đúng số tiền và nội dung mã đơn hiển thị.</p></article>
        </div>
        <p className="policy-contact">Cần hỗ trợ? Gọi <a href="tel:0795670902">0795670902</a> · Mộc Miên, Thành phố Huế.</p>
      </section>}
    </div>
  );
}

export default App;
