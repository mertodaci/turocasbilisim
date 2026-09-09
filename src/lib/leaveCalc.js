// İzin hakkı hesaplama motoru
// Kural (Türk İş Kanunu kıdem dilimleri):
//   1-5 yıl kıdem  -> 14 gün
//   5-15 yıl kıdem -> 20 gün
//   15+ yıl kıdem  -> 26 gün
// Hak, çalışma yıldönümünde doğar (hire_date + 1 yıl, +2 yıl, ...).
// 2020 öncesi yıldönümleri tek tek hesaplanmaz; o dönem "leave_carryover" (devir) olarak elle girilir.
// Toplam hak = carryover + (2020 ve sonrası her dolan yıldönümünde kazanılan günler)

// Milat: bu yıldan ÖNCEKİ yıldönümleri carryover'a dahil sayılır, hesaplanmaz.
export const LEAVE_MILESTONE_YEAR = 2020;

// Belirli bir kıdem yılına (tamamlanan yıl sayısı) göre o yıl kazanılan gün
export function daysForSeniority(seniorityYears) {
  if (seniorityYears < 1) return 0;       // 1 yıl dolmadan hak yok
  if (seniorityYears < 5) return 14;      // 1-5 yıl
  if (seniorityYears < 15) return 20;     // 5-15 yıl
  return 26;                              // 15+ yıl
}

// hire_date (ISO string veya Date) ve carryover (gün) alıp,
// asOf (varsayılan bugün) tarihine kadar toplam HAK EDİLEN izin gününü döndürür.
export function calculateEntitledDays(hireDate, carryover = 0, asOf = new Date()) {
  if (!hireDate) {
    return { entitled: 0, hasHireDate: false, breakdown: [] };
  }
  const hire = new Date(hireDate);
  if (isNaN(hire.getTime())) {
    return { entitled: 0, hasHireDate: false, breakdown: [] };
  }

  const today = asOf instanceof Date ? asOf : new Date(asOf);
  let total = Number(carryover) || 0;
  const breakdown = [];

  // Her yıldönümü için: hire + n yıl <= bugün ise, o yıldönümünde n. yıl kıdemi tamamlanmış demektir
  // n. yıldönümünde kazanılan gün = o ana kadarki kıdeme (n yıl) göre dilim
  for (let n = 1; n <= 60; n++) {
    const anniversary = new Date(hire);
    anniversary.setFullYear(hire.getFullYear() + n);
    if (anniversary > today) break; // bu yıldönümü henüz gelmedi

    // Sadece milat yılı ve sonrasındaki yıldönümlerini hesapla (öncesi carryover'da)
    if (anniversary.getFullYear() < LEAVE_MILESTONE_YEAR) continue;

    const gained = daysForSeniority(n);
    total += gained;
    breakdown.push({ year: anniversary.getFullYear(), seniority: n, gained });
  }

  return { entitled: total, hasHireDate: true, breakdown };
}

// Kullanılan günleri çıkarıp kalan bakiyeyi döndürür
export function calculateRemainingDays(hireDate, carryover, usedDays = 0, asOf = new Date()) {
  const { entitled, hasHireDate, breakdown } = calculateEntitledDays(hireDate, carryover, asOf);
  return {
    entitled,
    used: Number(usedDays) || 0,
    remaining: entitled - (Number(usedDays) || 0),
    hasHireDate,
    breakdown,
  };
}

// Turkce karakterleri sadelestirip slug'a cevirir (izin turu adi eslestirme icin)
export function slugifyTr(x) {
  return (x || "").toString().toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/\s+/g, "_");
}

// Bir izin talebinin turunun (leave_type) yillik izin hakkindan dusup dusmedigini
// belirler -- sadece entitlement_type "yillik" olan turler yillik bakiyeyi etkiler
// (hastalik/ucretsiz izin vb. dusulmez).
export function isAnnualLeaveType(leaveTypeName, leaveTypes) {
  const mt = (leaveTypes || []).find(
    (t) => slugifyTr(t.name) === slugifyTr(leaveTypeName) || t.name === leaveTypeName
  );
  return mt?.entitlement_type === "yillik";
}

// Onayli izin taleplerinden (sadece yillik izin turleri) + eski sistemden devreden
// kullanimdan gercek kullanilan gun sayisini hesaplar.
export function calculateActualUsedDays(leaveRequests, leaveTypes, leaveUsedBefore = 0) {
  const fromRequests = (leaveRequests || [])
    .filter((l) => isAnnualLeaveType(l.leave_type, leaveTypes))
    .reduce((sum, l) => sum + (Number(l.day_count) || 0), 0);
  return fromRequests + (Number(leaveUsedBefore) || 0);
}


// ===== Is gunu hesabi (hafta sonu + resmi tatil haric) =====
// Turkiye resmi tatilleri (sabit liste, YYYY-MM-DD). Dini bayramlar yaklasik
// resmi tarihlerle girilmistir; yillik guncelleme gerekebilir.
export const TR_HOLIDAYS = new Set([
  // 2025
  "2025-01-01", // Yilbasi
  "2025-03-30", "2025-03-31", "2025-04-01", // Ramazan Bayrami
  "2025-04-23", // Ulusal Egemenlik
  "2025-05-01", // Emek ve Dayanisma
  "2025-05-19", // Genclik ve Spor
  "2025-06-06", "2025-06-07", "2025-06-08", "2025-06-09", // Kurban Bayrami
  "2025-07-15", // Demokrasi
  "2025-08-30", // Zafer
  "2025-10-29", // Cumhuriyet
  // 2026
  "2026-01-01",
  "2026-03-20", "2026-03-21", "2026-03-22", // Ramazan Bayrami
  "2026-04-23",
  "2026-05-01",
  "2026-05-19",
  "2026-05-27", "2026-05-28", "2026-05-29", "2026-05-30", // Kurban Bayrami
  "2026-07-15",
  "2026-08-30",
  "2026-10-29",
  // 2027
  "2027-01-01",
  "2027-03-10", "2027-03-11", "2027-03-12", // Ramazan Bayrami
  "2027-04-23",
  "2027-05-01",
  "2027-05-19",
  "2027-05-17", "2027-05-18", "2027-05-19", "2027-05-20", // Kurban Bayrami
  "2027-07-15",
  "2027-08-30",
  "2027-10-29",
]);

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// start ve end (ISO string veya Date) arasindaki IS GUNU sayisi (her iki uc dahil).
// Pazar(0) ve TR_HOLIDAYS haric tutulur; Cumartesi artik is gunu sayilir.
export function countBusinessDays(start, end, holidays = TR_HOLIDAYS) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const last = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  while (cur <= last) {
    const dow = cur.getDay();
    const iso = toISODate(cur);
    if (dow !== 0 && !holidays.has(iso)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function isNonBusinessDay(d, holidays) {
  return d.getDay() === 0 || holidays.has(toISODate(d));
}

// end_date'ten bir sonraki IS GUNU (ise donus tarihi hesabi icin).
export function nextBusinessDay(date, holidays = TR_HOLIDAYS) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 1);
  while (isNonBusinessDay(d, holidays)) d.setDate(d.getDate() + 1);
  return d;
}

// ise donus tarihinden bir onceki IS GUNU (end_date'i geriye dogru turetmek icin).
export function previousBusinessDay(date, holidays = TR_HOLIDAYS) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 1);
  while (isNonBusinessDay(d, holidays)) d.setDate(d.getDate() - 1);
  return d;
}
