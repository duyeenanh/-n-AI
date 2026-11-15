export const categories = [
  { id: 'all', label: 'Tất cả hoa', icon: '✿' },
  { id: 'roses', label: 'Hoa hồng', icon: '❀' },
  { id: 'bouquets', label: 'Bó hoa', icon: '❋' },
  { id: 'tulips', label: 'Tulip', icon: '✿' },
  { id: 'lilies', label: 'Hoa ly', icon: '❁' },
  { id: 'occasion', label: 'Chậu & dịp đặc biệt', icon: '❃' },
  { id: 'graduation', label: 'Hoa tốt nghiệp', icon: '🎓' },
];

export const products = [
  {
    id: 'p01', name: 'Hoa hồng Garden pastel', category: 'roses', price: 300000, oldPrice: 340000,
    detail: 'Hồng garden pastel · 15 cành', occasion: 'Sinh nhật, kỷ niệm', tag: 'BÁN CHẠY',
    image: '/flowers/hong-garden-pastel.png', tone: '#f3e8df',
  },
  {
    id: 'p02', name: 'Bó mix đồng tiền vàng', category: 'bouquets', price: 180000,
    detail: 'Đồng tiền vàng, hoa cúc trắng · phối bó', occasion: 'Chúc mừng, tốt nghiệp', tag: 'TƯƠI MỚI',
    image: '/flowers/mix-nang-mai.png', tone: '#f4eddb',
  },
  {
    id: 'p03', name: 'Hoa hồng đỏ Ecuador', category: 'roses', price: 450000, oldPrice: 490000,
    detail: 'Hồng đỏ Ecuador · 20 cành', occasion: 'Tỏ tình, kỷ niệm', tag: 'ĐƯỢC YÊU THÍCH',
    image: '/flowers/hong-do-10-canh.png', tone: '#f0e4e1',
  },
  {
    id: 'p04', name: 'Hoa tulip hồng', category: 'tulips', price: 450000,
    detail: 'Tulip hồng · 10 cành', occasion: 'Sinh nhật, cảm ơn', tag: '',
    image: '/flowers/tulip-hong.png', tone: '#f4e6e9',
  },
  {
    id: 'p05', name: 'Hoa cẩm tú cầu hồng bó 5 bông', category: 'bouquets', price: 260000,
    detail: 'Cẩm tú cầu hồng · 5 bông', occasion: 'Tặng mẹ, cảm ơn', tag: 'MỚI',
    image: '/flowers/cam-tu-cau-hong.png', tone: '#e9e9e1',
  },
  {
    id: 'p06', name: 'Hoa ly kép thơm', category: 'lilies', price: 370000,
    detail: 'Ly kép thơm · Bó 7 cành', occasion: 'Khai trương, chúc mừng', tag: '',
    image: '/flowers/ly-kep-thom.png', tone: '#f2ede3',
  },
  {
    id: 'p07', name: 'Hoa tulip trắng Hà Lan', category: 'tulips', price: 610000,
    detail: 'Tulip trắng Hà Lan · 15 cành', occasion: 'Kỷ niệm, tân gia', tag: 'CAO CẤP',
    image: '/flowers/tulip-trang-ha-lan.png', tone: '#eeece4',
  },
  {
    id: 'p08', name: 'Bó mix pastel tri ân', category: 'bouquets', price: 160000,
    detail: 'Cúc mẫu đơn, cẩm chướng, hoa baby · phối trắng-hồng', occasion: 'Tặng mẹ, cảm ơn', tag: 'GIÁ TỐT',
    image: '/flowers/mix-pastel-tri-an.png', tone: '#f3e9e3',
  },
  {
    id: 'p09', name: 'Hoa hồng Ohara', category: 'roses', price: 760000,
    detail: 'Hồng Ohara · 25 cành', occasion: 'Kỷ niệm, tỏ tình', tag: '',
    image: '/flowers/hong-ohara.png', tone: '#efe5e2',
  },
  {
    id: 'p10', name: 'Hoa baby trắng bó 15 cành', category: 'bouquets', price: 140000,
    detail: 'Baby trắng · 15 cành', occasion: 'Sinh nhật, động viên', tag: '',
    image: '/flowers/baby-trang-15-canh.png', tone: '#f1ede2',
  },
  {
    id: 'p11', name: 'Lan hồ điệp mini chậu gốm', category: 'occasion', price: 370000,
    detail: 'Lan hồ điệp mini · Chậu gốm', occasion: 'Tân gia, khai trương', tag: 'BỀN LÂU',
    image: '/flowers/lan-ho-diep-mini-chau-gom.png', tone: '#e7e9df',
  },
  {
    id: 'p12', name: 'Hộp hoa hồng pastel phối cát tường', category: 'roses', price: 260000,
    detail: 'Hồng pastel, cát tường trắng · hộp hoa', occasion: 'Sinh nhật, tặng bạn', tag: '',
    image: '/flowers/hop-hong-pastel-cat-tuong.png', tone: '#f2e4e4',
  },
  {
    id: 'p13', name: 'Bó hoa mix chúc mừng rực rỡ', category: 'occasion', price: 450000,
    detail: 'Hướng dương, đồng tiền, cẩm chướng · phối vàng-cam', occasion: 'Khai trương, chúc mừng', tag: '',
    image: '/flowers/mix-chuc-mung-ruc-ro.png', tone: '#f2ead8',
  },
  {
    id: 'p14', name: 'Hoa tulip đỏ nhập khẩu', category: 'tulips', price: 690000,
    detail: 'Tulip đỏ · 15 cành nhập khẩu', occasion: 'Tỏ tình, kỷ niệm', tag: 'CAO CẤP',
    image: '/flowers/tulip-do-nhap-khau.png', tone: '#f0e4df',
  },
  {
    id: 'p15', name: 'Bó hoa mix pastel dịu dàng', category: 'bouquets', price: 300000,
    detail: 'Hoa hồng phấn, cúc nhỏ, lá xanh · phối pastel', occasion: 'Tặng mẹ, cảm ơn', tag: '',
    image: '/flowers/ly-hong-mix.png', tone: '#f2e8e4',
  },
  {
    id: 'p16', name: 'Hoa mao lương cam bó 10 cành', category: 'bouquets', price: 220000,
    detail: 'Mao lương cam · 10 cành', occasion: 'Sinh nhật, chúc mừng', tag: 'MỚI',
    image: '/flowers/mao-luong-cam.png', tone: '#eee9df',
  },
  {
    id: 'p17', name: 'Bình hoa hồng kem dâu', category: 'roses', price: 450000,
    detail: 'Hồng tông kem và phấn · bình phối lá', occasion: 'Kỷ niệm, sinh nhật', tag: '',
    image: '/flowers/hong-kem-dau-mix.png', tone: '#f1e5e2',
  },
  {
    id: 'p18', name: 'Cúc họa mi bình gốm', category: 'occasion', price: 260000,
    detail: 'Cúc họa mi · Bình gốm thủ công', occasion: 'Tân gia, cảm ơn', tag: 'THỦ CÔNG',
    image: '/flowers/cuc-hoa-mi-binh-gom.png', tone: '#ecece3',
  },
  {
    id: 'p19', name: 'Hoa hướng dương bó tốt nghiệp', category: 'graduation', price: 300000,
    detail: 'Hướng dương vàng · 15 cành', occasion: 'Tốt nghiệp, chúc mừng', tag: 'TỐT NGHIỆP',
    image: '/flowers/huong-duong-tot-nghiep.png', tone: '#f4eddb',
  },
  {
    id: 'p20', name: 'Bó tốt nghiệp xanh-vàng', category: 'graduation', price: 220000,
    detail: 'Hoa xanh-vàng theo mùa · phối giấy gói tốt nghiệp', occasion: 'Tốt nghiệp, cảm ơn thầy cô', tag: 'TỐT NGHIỆP',
    image: '/flowers/tot-nghiep-tri-an.png', tone: '#f2ead8',
  },
  {
    id: 'p21', name: 'Bó hoa hồng mix cỏ tai thỏ trắng', category: 'bouquets', price: 370000,
    detail: 'Hoa hồng tươi phối cỏ tai thỏ trắng · bó phong cách nhẹ nhàng', occasion: 'Sinh nhật, kỷ niệm, trang trí', tag: 'ĐỘC ĐÁO',
    image: '/flowers/hong-tai-tho-trang.png', tone: '#e9e9e1',
  },
  {
    id: 'p22', name: 'Hoa đồng tiền vàng bó 15 cành', category: 'graduation', price: 260000,
    detail: 'Đồng tiền vàng · 15 cành', occasion: 'Tốt nghiệp, khai trương', tag: '',
    image: '/flowers/dong-tien-vang.png', tone: '#f3e9e3',
  },
  {
    id: 'p23', name: 'Bó mix tốt nghiệp sắc vàng-cam', category: 'graduation', price: 490000,
    detail: 'Hoa hồng cam, cúc vàng · phối bó', occasion: 'Tốt nghiệp, chúc mừng', tag: 'MỚI',
    image: '/flowers/mix-tot-nghiep-sac-vang-cam.png', tone: '#f4e6e9',
  },
  {
    id: 'p24', name: 'Bó mix cẩm chướng hồng và cúc vàng', category: 'bouquets', price: 180000,
    detail: 'Cẩm chướng hồng, cúc vàng · phối bó', occasion: 'Sinh nhật, cảm ơn thầy cô', tag: 'GIÁ TỐT',
    image: '/flowers/cam-chuong-hong-mix.png', tone: '#f2e8e4',
  },
  {
    id: 'p25', name: 'Hoa mẫu đơn hồng bó 10 cành', category: 'bouquets', price: 370000,
    detail: 'Mẫu đơn hồng · 10 cành', occasion: 'Tặng mẹ, sinh nhật', tag: '',
    image: '/flowers/mau-don-hong.png', tone: '#f2e8e4',
  },
  {
    id: 'p26', name: 'Giỏ hoa hồng cam phối lá xanh', category: 'roses', price: 530000,
    detail: 'Hồng cam Ecuador · giỏ phối lá xanh', occasion: 'Kỷ niệm, chúc mừng', tag: 'LÃNG MẠN',
    image: '/flowers/hong-cam.png', tone: '#f0e4e1',
  },
  {
    id: 'p27', name: 'Giỏ lan dendro tím rủ', category: 'occasion', price: 760000,
    detail: 'Lan dendro tím · giỏ treo trang trí', occasion: 'Khai trương, chúc mừng', tag: 'SANG TRỌNG',
    image: '/flowers/lan-ho-diep-mini.png', tone: '#e7e9df',
  },
  {
    id: 'p28', name: 'Hoa cẩm tú cầu xanh cành đơn', category: 'bouquets', price: 300000,
    detail: 'Cẩm tú cầu xanh · 1 bông lớn', occasion: 'Tân gia, cảm ơn', tag: '',
    image: '/flowers/cam-tu-cau-xanh-binh-gom.png', tone: '#ecece3',
  },
  {
    id: 'p29', name: 'Bó hoa đồng nội trắng-vàng', category: 'bouquets', price: 260000,
    detail: 'Hoa dại trắng, cúc vàng · phối đồng nội', occasion: 'Cảm ơn, thăm hỏi', tag: '',
    image: '/flowers/ly-kep-trang-mix.png', tone: '#f2ede3',
  },
  {
    id: 'p30', name: 'Hoa hồng cam bó 15 cành', category: 'bouquets', price: 370000,
    detail: 'Hồng cam · 15 cành', occasion: 'Tốt nghiệp, thăng chức, khai trương', tag: 'CHÚC MỪNG',
    image: '/flowers/hong-cam.png', tone: '#eee9df',
  },
  {
    id: 'p31', name: 'Hoa baby trắng bó tròn', category: 'bouquets', price: 100000,
    detail: 'Baby trắng · 20 cành', occasion: 'Sinh nhật, tốt nghiệp', tag: '',
    image: '/flowers/baby-trang.png', tone: '#f1ede2',
  },
  {
    id: 'p32', name: 'Hoa baby hồng bó lớn', category: 'bouquets', price: 180000,
    detail: 'Baby hồng · 25 cành', occasion: 'Sinh nhật, kỷ niệm', tag: '',
    image: '/flowers/baby-hong.png', tone: '#f2e4e4',
  },
  {
    id: 'p33', name: 'Hoa hướng dương bó 10 cành', category: 'bouquets', price: 140000,
    detail: 'Hướng dương vàng · 10 cành', occasion: 'Tốt nghiệp, chúc mừng', tag: '',
    image: '/flowers/huong-duong-10-canh.png', tone: '#f2ead8',
  },
  {
    id: 'p34', name: 'Hoa hướng dương bó 20 cành', category: 'bouquets', price: 330000,
    detail: 'Hướng dương vàng · 20 cành', occasion: 'Tốt nghiệp, khai trương', tag: '',
    image: '/flowers/huong-duong-20-canh.png', tone: '#f4eddb',
  },
  {
    id: 'p35', name: 'Hoa hồng đỏ bó 10 cành', category: 'roses', price: 180000,
    detail: 'Hồng đỏ · 10 cành', occasion: 'Sinh nhật, tỏ tình', tag: '',
    image: '/flowers/hong-do-10-canh.png', tone: '#f0e4e1',
  },
  {
    id: 'p36', name: 'Hoa hồng trắng bó 15 cành', category: 'roses', price: 300000,
    detail: 'Hồng trắng · 15 cành', occasion: 'Sinh nhật, cảm ơn', tag: '',
    image: '/flowers/hong-trang-15-canh.png', tone: '#eeece4',
  },
  {
    id: 'p37', name: 'Hoa hồng vàng bó 20 cành', category: 'roses', price: 370000,
    detail: 'Hồng vàng · 20 cành', occasion: 'Tốt nghiệp, chúc mừng', tag: '',
    image: '/flowers/hong-vang-20-canh.png', tone: '#f4eddb',
  },
  {
    id: 'p38', name: 'Hoa hồng Ohara hồng bó 15 cành', category: 'roses', price: 530000,
    detail: 'Hồng Ohara hồng · 15 cành', occasion: 'Kỷ niệm, sinh nhật', tag: '',
    image: '/flowers/hong-ohara-15-canh.png', tone: '#efe5e2',
  },
  {
    id: 'p39', name: 'Hoa tulip vàng bó 10 cành', category: 'tulips', price: 450000,
    detail: 'Tulip vàng · 10 cành', occasion: 'Tốt nghiệp, chúc mừng', tag: '',
    image: '/flowers/tulip-vang-10-canh.png', tone: '#f4e6e9',
  },
  {
    id: 'p40', name: 'Hoa tulip tím bó 15 cành', category: 'tulips', price: 690000,
    detail: 'Tulip tím · 15 cành', occasion: 'Sinh nhật, kỷ niệm', tag: '',
    image: '/flowers/tulip-tim-15-canh.png', tone: '#eeece4',
  },
  {
    id: 'p41', name: 'Hoa tulip trắng bó 20 cành', category: 'tulips', price: 920000,
    detail: 'Tulip trắng · 20 cành', occasion: 'Kỷ niệm, khai trương', tag: '',
    image: '/flowers/tulip-trang-20-canh.png', tone: '#f4e6e9',
  },
  {
    id: 'p42', name: 'Hoa ly trắng bó 5 cành', category: 'lilies', price: 220000,
    detail: 'Ly trắng thơm · 5 cành', occasion: 'Tặng mẹ, cảm ơn', tag: '',
    image: '/flowers/ly-trang-5-canh.png', tone: '#f2ede3',
  },
  {
    id: 'p43', name: 'Hoa ly vàng bó 7 cành', category: 'lilies', price: 300000,
    detail: 'Ly vàng · 7 cành', occasion: 'Chúc mừng, tân gia', tag: '',
    image: '/flowers/ly-vang-7-canh.png', tone: '#f2e8e4',
  },
  {
    id: 'p44', name: 'Hoa cẩm tú cầu xanh bó đơn', category: 'bouquets', price: 220000,
    detail: 'Cẩm tú cầu xanh · 3 bông', occasion: 'Sinh nhật, cảm ơn', tag: '',
    image: '/flowers/cam-tu-cau-xanh.png', tone: '#e9e9e1',
  },
  {
    id: 'p45', name: 'Hoa cẩm tú cầu hồng bó đơn', category: 'bouquets', price: 240000,
    detail: 'Cẩm tú cầu hồng · 3 bông', occasion: 'Sinh nhật, kỷ niệm', tag: '',
    image: '/flowers/cam-tu-cau-hong.png', tone: '#f3e8df',
  },
  {
    id: 'p46', name: 'Hoa cẩm chướng đỏ bó 15 cành', category: 'bouquets', price: 140000,
    detail: 'Cẩm chướng đỏ · 15 cành', occasion: 'Tặng mẹ, chúc mừng', tag: '',
    image: '/flowers/cam-chuong-do-15-canh.png', tone: '#f3e9e3',
  },
  {
    id: 'p47', name: 'Hoa cẩm chướng trắng bó 20 cành', category: 'bouquets', price: 180000,
    detail: 'Cẩm chướng trắng · 20 cành', occasion: 'Cảm ơn, thăm hỏi', tag: '',
    image: '/flowers/cam-chuong-trang-20-canh.png', tone: '#f2e8e4',
  },
  {
    id: 'p48', name: 'Hoa đồng tiền đỏ bó 10 cành', category: 'bouquets', price: 120000,
    detail: 'Đồng tiền đỏ · 10 cành', occasion: 'Sinh nhật, chúc mừng', tag: '',
    image: '/flowers/dong-tien-do-10-canh.png', tone: '#f3e9e3',
  },
  {
    id: 'p49', name: 'Hoa đồng tiền hồng bó 10 cành', category: 'bouquets', price: 180000,
    detail: 'Đồng tiền hồng · 10 cành', occasion: 'Sinh nhật, tốt nghiệp', tag: '',
    image: '/flowers/dong-tien-hong-10-canh.png', tone: '#f4eddb',
  },
  {
    id: 'p50', name: 'Hoa cúc tana bó 20 cành', category: 'bouquets', price: 120000,
    detail: 'Cúc tana trắng · 20 cành', occasion: 'Sinh nhật, cảm ơn', tag: '',
    image: '/flowers/cuc-tana.png', tone: '#f1ede2',
  },
  {
    id: 'p51', name: 'Hoa cúc mẫu đơn trắng bó 10 cành', category: 'bouquets', price: 300000,
    detail: 'Cúc mẫu đơn trắng · 10 cành', occasion: 'Tặng mẹ, tân gia', tag: '',
    image: '/flowers/cuc-mau-don-trang.png', tone: '#f3e9e3',
  },
  {
    id: 'p52', name: 'Hoa cúc pingpong xanh bó 10 cành', category: 'bouquets', price: 180000,
    detail: 'Cúc pingpong xanh · 10 cành', occasion: 'Tân gia, chúc mừng', tag: '',
    image: '/flowers/cuc-pingpong-xanh.png', tone: '#ecece3',
  },
  {
    id: 'p53', name: 'Hoa cúc họa mi bó 20 cành', category: 'bouquets', price: 140000,
    detail: 'Cúc họa mi trắng · 20 cành', occasion: 'Sinh nhật, cảm ơn', tag: '',
    image: '/flowers/hoa-cuc-hoa-mi.png', tone: '#ecece3',
  },
  {
    id: 'p54', name: 'Hoa lan hồ điệp trắng chậu 3 cành', category: 'occasion', price: 610000,
    detail: 'Lan hồ điệp trắng · Chậu 3 cành', occasion: 'Khai trương, tân gia', tag: '',
    image: '/flowers/lan-ho-diep-trang.png', tone: '#e7e9df',
  },
  {
    id: 'p55', name: 'Hoa lan hồ điệp tím chậu 5 cành', category: 'occasion', price: 999000,
    detail: 'Lan hồ điệp tím · Chậu 5 cành', occasion: 'Khai trương, chúc mừng', tag: '',
    image: '/flowers/lan-ho-diep-tim.png', tone: '#e7e9df',
  },
  {
    id: 'p56', name: 'Bó hoa hồng phối pastel', category: 'bouquets', price: 760000,
    detail: 'Hồng nhiều sắc hồng, trắng · bó phối pastel', occasion: 'Sinh nhật, kỷ niệm', tag: '',
    image: '/flowers/mix-hong-pastel.png', tone: '#f3e8df',
  },
  {
    id: 'p57', name: 'Bó mix hoa cam và cúc vàng', category: 'bouquets', price: 410000,
    detail: 'Hoa tông cam, cúc vàng · phối bó', occasion: 'Sinh nhật, chúc mừng', tag: '',
    image: '/flowers/mao-luong-cam-mix.png', tone: '#eee9df',
  },
  {
    id: 'p58', name: 'Hoa thanh liễu tím bó 10 cành', category: 'bouquets', price: 180000,
    detail: 'Thanh liễu tím · 10 cành', occasion: 'Sinh nhật, cảm ơn', tag: '',
    image: '/flowers/thanh-lieu-tim.png', tone: '#f1ede2',
  },
  {
    id: 'p59', name: 'Hoa cát tường trắng bó 15 cành', category: 'bouquets', price: 220000,
    detail: 'Cát tường trắng · 15 cành', occasion: 'Tặng mẹ, tân gia', tag: '',
    image: '/flowers/cat-tuong-trang.png', tone: '#f3e9e3',
  },
  {
    id: 'p60', name: 'Hoa cát tường tím bó 15 cành', category: 'bouquets', price: 230000,
    detail: 'Cát tường tím · 15 cành', occasion: 'Sinh nhật, tốt nghiệp', tag: '',
    image: '/flowers/cat-tuong-tim.png', tone: '#f2e4e4',
  },
  {
    id: 'p61', name: 'Hoa lan vũ nữ bó 10 cành', category: 'occasion', price: 370000,
    detail: 'Lan vũ nữ vàng · 10 cành', occasion: 'Khai trương, chúc mừng', tag: '',
    image: '/flowers/lan-vu-nu.png', tone: '#e7e9df',
  },
  {
    id: 'p62', name: 'Hoa loa kèn trắng bó 10 cành', category: 'lilies', price: 330000,
    detail: 'Loa kèn trắng · 10 cành', occasion: 'Tặng mẹ, cảm ơn', tag: '',
    image: '/flowers/loa-ken-trang.png', tone: '#f2ede3',
  },
  {
    id: 'p63', name: 'Hoa thanh cúc xanh bó 20 cành', category: 'bouquets', price: 220000,
    detail: 'Thanh cúc xanh · 20 cành', occasion: 'Tốt nghiệp, sinh nhật', tag: '',
    image: '/flowers/cuc-pingpong-xanh.png', tone: '#f3e9e3',
  },
  {
    id: 'p64', name: 'Hoa thược dược vàng bó 10 cành', category: 'bouquets', price: 330000,
    detail: 'Thược dược vàng · 10 cành', occasion: 'Sinh nhật, chúc mừng', tag: '',
    image: '/flowers/thuoc-duoc-vang.png', tone: '#f4eddb',
  },
  {
    id: 'p65', name: 'Bình lan hồ điệp phối màu', category: 'occasion', price: 410000,
    detail: 'Lan hồ điệp xanh, trắng, tím · bình trang trí', occasion: 'Khai trương, tốt nghiệp', tag: '',
    image: '/flowers/lan-mokara-vang.png', tone: '#e7e9df',
  },
];

export const imageUrl = (id, width = 700) => {
  if (typeof id === 'string' && id.startsWith('/')) return id;
  if (typeof id === 'string' && id.startsWith('http')) {
    return id.replace(/([?&]w=)\d+/, `$1${width}`);
  }
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
};

export const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + '₫';
