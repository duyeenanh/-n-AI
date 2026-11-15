import { useRef, useState } from 'react';
import { Eye, FileImage, Upload } from 'lucide-react';
import { apiFetch } from '../api.js';

const maxFileSize = 4 * 1024 * 1024;
const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];

async function compressImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh biên lai.'));
    reader.readAsDataURL(file);
  });

  if (file.size <= 300 * 1024) {
    return { dataUrl, mimeType: file.type };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.82);
      resolve({ dataUrl: compressed, mimeType: 'image/jpeg' });
    };
    img.onerror = () => resolve({ dataUrl, mimeType: file.type });
    img.src = dataUrl;
  });
}

export default function PaymentProof({ orderId, accessToken, hasProof, uploadedAt, canUpload = false, onUploaded }) {
  const fileInputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');

  const showProof = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch(`/orders/${orderId}/payment-proof`, {
        headers: accessToken ? { 'X-Order-Access-Token': accessToken } : {},
      });
      setImageUrl(`data:${result.mimeType};base64,${result.imageBase64}`);
      setExpanded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadProof = async () => {
    if (!selectedFile || loading) return;
    if (!supportedTypes.includes(selectedFile.type)) {
      setError('Chọn ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (selectedFile.size > maxFileSize) {
      setError('Ảnh biên lai không được vượt quá 4 MB.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { dataUrl, mimeType } = await compressImage(selectedFile);
      const imageBase64 = String(dataUrl).split(',')[1];
      const result = await apiFetch(`/orders/${orderId}/payment-proof`, {
        method: 'POST',
        headers: accessToken ? { 'X-Order-Access-Token': accessToken } : {},
        body: JSON.stringify({ mimeType, imageBase64 }),
      });
      setImageUrl(String(dataUrl));
      setExpanded(true);
      setSelectedFile(null);
      setUploaded(true);
      onUploaded?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return <div className="payment-proof">
    {!hasProof && !canUpload && <span className="payment-proof-missing">Chưa có bill</span>}
    {hasProof && <button className="table-text-button payment-proof-toggle" type="button" onClick={showProof} disabled={loading} aria-expanded={expanded}>
      <Eye size={13} /> {loading ? 'Đang tải...' : expanded ? 'Ẩn bill chuyển khoản' : 'Xem bill chuyển khoản'}
    </button>}
    {hasProof && uploadedAt && <small className="payment-proof-uploaded-at">Khách gửi: {new Date(uploadedAt).toLocaleString('vi-VN')}</small>}
    {canUpload && <div className="payment-proof-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Chọn ảnh bill chuyển khoản"
        onChange={(event) => {
          setSelectedFile(event.target.files?.[0] || null);
          setError('');
          setUploaded(false);
          event.target.value = '';
        }}
      />
      <button className="button-outline payment-proof-choose" type="button" onClick={() => fileInputRef.current?.click()} disabled={loading}>
        <FileImage size={14} />{selectedFile ? selectedFile.name : 'Chọn ảnh bill chuyển khoản'}
      </button>
      <button className="button-outline" type="button" onClick={uploadProof} disabled={!selectedFile || loading}>
        <Upload size={13} />{loading ? 'Đang gửi...' : hasProof ? 'Cập nhật bill' : 'Gửi bill'}
      </button>
      <small>Ảnh JPEG, PNG hoặc WebP · tối đa 4 MB</small>
      {uploaded && <small className="payment-proof-success">Đã gửi bill, cửa hàng sẽ đối soát giao dịch.</small>}
    </div>}
    {expanded && imageUrl && <a className="payment-proof-image-link" href={imageUrl} target="_blank" rel="noreferrer">
      <img className="payment-proof-image" src={imageUrl} alt={`Bill chuyển khoản đơn ${orderId}`} />
    </a>}
    {error && <small className="payment-proof-error" role="alert">{error}</small>}
  </div>;
}
