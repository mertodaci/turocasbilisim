// Hakediş modülü + müşteri kartı Hakediş sekmesi ortak yardımcıları.

export const MONTHS = [
  ["ocak", "Oca"], ["subat", "Şub"], ["mart", "Mar"], ["nisan", "Nis"],
  ["mayis", "May"], ["haziran", "Haz"], ["temmuz", "Tem"], ["agustos", "Ağu"],
  ["eylul", "Eyl"], ["ekim", "Eki"], ["kasim", "Kas"], ["aralik", "Ara"],
];
export const MONTH_KEYS = MONTHS.map(([k]) => k);

export const DURUM_OPTS = ["aktif", "pasif"];
export const SEKTOR_OPTS = ["SU KANAL", "BELEDİYE"];
export const ANLASMA_OPTS = ["BAKIM ANLAŞMASI", "YENİ YAZILIM", "SAYAÇ OKUMA"];
export const KDV_OPTS = ["0 KDV", "%20 KDV Lİ", "KDV TEVKİFATI 9/10", "KDV TEVKİFATI 7/10", "KDV TEVKİFATI 5/10"];

// Müşteri customer_type -> Hakediş sektör
export const CT_TO_SEKTOR = { su_idaresi: "SU KANAL", belediye: "BELEDİYE" };
// Sözleşme türü -> Hakediş anlaşma türü (gevşek eşleme)
export const CT_TO_ANLASMA = {
  bakim_sozlesmesi: "BAKIM ANLAŞMASI",
  bakim_destek: "BAKIM ANLAŞMASI",
  hizmet_sozlesmesi: "YENİ YAZILIM",
  lisans: "YENİ YAZILIM",
};

export const custSektor = (c) => c?.sector || CT_TO_SEKTOR[c?.customer_type] || c?.customer_type || "";
export const norm = (s) => String(s || "").trim().toLocaleLowerCase("tr");

// Sayı ayrıştırma. Nokta sonrası tam 3 haneli grup(lar) = binlik ayraç (200.000 -> 200000,
// 1.234.567 -> 1234567); nokta sonrası 1-2 hane = ondalık (200.5 -> 200.5). Zaten JS
// sayısıysa olduğu gibi döner.
export const num = (v) => {
  if (v === "" || v == null || v === "-") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return null;
  const hasC = s.includes(","), hasD = s.includes(".");
  if (hasC && hasD) s = s.replace(/\./g, "").replace(",", ".");
  else if (hasC) s = s.replace(",", ".");
  else if (hasD) {
    const p = s.split(".");
    if (p.length >= 2 && p.slice(1).every((x) => x.length === 3)) s = p.join("");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export const tl = (n) => (n == null || n === "" ? "–" : Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 0 }));

// Dar kutucuk için kısaltılmış gösterim
export const kisa = (n) => {
  if (n == null || n === "") return "–";
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + " M";
  if (a >= 1e4) return Math.round(n / 1e3) + " B";
  return tl(n);
};

// Excel seri tarih -> ISO (yyyy-mm-dd)
export const serialToISO = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return "";
  return new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000).toISOString().slice(0, 10);
};
export const fmtDate = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join(".") : "");

// Planlanan aylık tutarların toplamı (hedef dağılımı — tahsil edilip edilmediğine bakmaz)
export const rowRealized = (r) => MONTH_KEYS.reduce((a, k) => a + (num(r[k]) || 0), 0);
export const rowAdet = (r) => MONTH_KEYS.filter((k) => (num(r[k]) || 0) > 0).length;
export const rowOrtalama = (r) => { const a = rowAdet(r); return a ? (num(r.yil_hedefi) || 0) / a : 0; };

// Ay bazında tahsilat kaydı: { [ay_key]: { alindi: bool, tutar: number|null, tarih: string|null } }
export const parseTahsilat = (r) => {
  if (!r || !r.tahsilat) return {};
  if (typeof r.tahsilat === "object") return r.tahsilat;
  try { return JSON.parse(r.tahsilat) || {}; } catch { return {}; }
};
// Gerçekten tahsil edilen (işaretlenen) tutarların toplamı — "Gerçekleşen"/"Kalan" bunu kullanır.
export const rowTahsilEdilen = (r) => {
  const t = parseTahsilat(r);
  return MONTH_KEYS.reduce((a, k) => a + (t[k]?.alindi ? (num(t[k].tutar) ?? num(r[k]) ?? 0) : 0), 0);
};
export const rowTahsilAdet = (r) => {
  const t = parseTahsilat(r);
  return MONTH_KEYS.filter((k) => t[k]?.alindi).length;
};
// Bir ayın "orijinal" (elle düzeltmeden önceki) planlanan tutarı — yalnız
// elle düzeltilmiş aylarda dolu; tahsilat JSON'una gömülü tutulur.
export const monthPlanOrijinal = (r, k) => {
  const v = parseTahsilat(r)[k]?.plan_orijinal;
  return v == null ? null : num(v);
};

// Bir sözleşmeden hakediş payload'ları.
// (sözleşme tutarı − peşin) taksit sayısına bölünür; hakediş başlangıç ayından
// itibaren "hakedis_period" ay arayla dağıtılır; yıl aşarsa takip eden yıl için
// ayrı payload. Peşin için ayrı ay girişi açılmaz. customer: { id, company_name, ... }.
export function buildHakedisPayloads(contract, customer) {
  const amount = num(contract?.contract_value);
  const n = Math.round(Number(contract?.installment_count));
  const startStr = contract?.hakedis_start_date;
  if (!amount || !n || n < 1 || !startStr) return [];
  const start = new Date(startStr);
  if (Number.isNaN(start.getTime())) return [];
  const pesin = num(contract?.pesin_tutari)
    || (num(contract?.pesin_orani) ? amount * num(contract.pesin_orani) / 100 : 0);
  const base = Math.max(0, amount - (pesin || 0));
  const period = Math.max(1, Math.round(Number(contract?.hakedis_period) || 1));
  const per = base / n;
  const byYear = new Map();
  for (let i = 0; i < n; i++) {
    const m = start.getMonth() + i * period;
    const y = start.getFullYear() + Math.floor(m / 12);
    const mi = ((m % 12) + 12) % 12;
    if (!byYear.has(y)) byYear.set(y, {});
    const bucket = byYear.get(y);
    const key = MONTH_KEYS[mi];
    bucket[key] = (bucket[key] || 0) + per;
  }
  const anlasma = CT_TO_ANLASMA[contract.contract_type] || contract.contract_type || "";
  const not = `Sözleşmeden otomatik — ${n} taksit${period > 1 ? ` (${period} aylık)` : ""}${pesin ? `, peşin ${tl(pesin)} ₺ düşüldü` : ""}`;
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([y, months], yi) => {
    const yilHedefi = Object.values(months).reduce((a, b) => a + b, 0);
    return {
      year: y,
      contract_id: contract.id,
      pesin_tutari: yi === 0 ? (pesin || null) : null,
      customer_id: customer?.id || null,
      musteri: customer?.company_name || "",
      is_konusu: contract.title || "",
      durum: "aktif",
      sektor: custSektor(customer),
      anlasma_turu: anlasma,
      kdv_durumu: contract?.kdv_durumu || "",
      sozlesme_baslangic: contract.start_date || "",
      sozlesme_bitis: contract.end_date || "",
      toplam_sozlesme_tutari: yi === 0 ? amount : null,
      yil_hedefi: yilHedefi,
      aciklama: not,
      ...Object.fromEntries(MONTH_KEYS.map((k) => [k, months[k] ?? null])),
    };
  });
}
