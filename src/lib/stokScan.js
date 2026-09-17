// Demirbaş sicil QR'ları iki farklı biçimde basılıyor: StokEtiket.jsx'in
// demirbaş modu ham sicil no'yu kodlar (ör. "20260001"), StokZimmet.jsx'in
// "Zimmet QR" yazdırma butonu ise herhangi bir telefon kamerasıyla doğrudan
// açılabilsin diye Demirbaş Sorgula sayfasına giden bir link kodlar
// (".../stok/demirbas-sorgula?seri_no=20260001"). Sicil no bekleyen her
// tarama tüketicisi (SicilNoScanSelect, Demirbaş Sorgula) iki biçimi de
// kabul etmeli -- aksi halde Zimmet'ten basılan bir etiketi başka bir
// ekranda okutmak sahte "bulunamadı" hatası verir.
export function seriNoCoz(kod) {
  const trimmed = (kod || "").trim();
  try {
    const url = new URL(trimmed);
    const sn = url.searchParams.get("seri_no");
    if (sn) return sn.trim();
  } catch { /* URL değil, ham değer olarak kullan */ }
  return trimmed;
}
