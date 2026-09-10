// İK / Bordro ekranları için ortak sayı-biçimlendirme.
// Daha önce her sayfa kendi `const nf`'ini kopyalıyordu; ondalık ayarları tutarsızdı.

const _num = (n) => {
  if (n === null || n === undefined || n === "") return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
};

// Para: 2 ondalık + " ₺"
export const para = (n) => {
  const v = _num(n);
  return v === null ? "—" : v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
};

// Para (₺'siz): dar tablo hücreleri için
export const paraSade = (n) => {
  const v = _num(n);
  return v === null ? "—" : v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Sayı: gün / adet / saat gibi para olmayan değerler (gereksiz ondalık gösterme)
export const sayi = (n) => {
  const v = _num(n);
  return v === null ? "—" : v.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
};
