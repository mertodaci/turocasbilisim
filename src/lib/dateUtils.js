// Yerel tarihi YYYY-MM-DD olarak formatlar (UTC dönüşümü yapmadan).
//
// `date.toISOString().slice(0,10)` önce tarihi UTC'ye çevirir. Türkiye gibi
// pozitif saat dilimlerinde (+3) bu, yerel gece yarısını bir önceki UTC gününe
// kaydırır — ay sınırlarında (ayın ilk/son günü hesaplarken) sistematik olarak
// yanlış (bir gün eksik) tarih üretir. Bu fonksiyon saat dilimi dönüşümü
// yapmadan, doğrudan yerel yıl/ay/gün bileşenlerinden string üretir.
export function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
