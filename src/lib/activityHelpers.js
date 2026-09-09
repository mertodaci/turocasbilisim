import { Phone, Users, Briefcase, MapPin, FileText, Mail, GraduationCap, MoreHorizontal, MonitorPlay, LayoutDashboard, FlaskConical, BarChart2 } from "lucide-react";

export const activityTypes = {
  telefon_gorusmesi: { label: "Telefon Görüşmesi", icon: Phone, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  ofis_toplantisi: { label: "Ofis Toplantısı", icon: Users, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200" },
  musteri_toplantisi: { label: "Müşteri Toplantısı", icon: Briefcase, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
  saha_ziyareti: { label: "Saha Ziyareti", icon: MapPin, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
  rapor_yazimi: { label: "Rapor Yazımı", icon: FileText, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
  email_yazisma: { label: "E-mail Yazışma", icon: Mail, color: "text-cyan-500", bg: "bg-cyan-50", border: "border-cyan-200" },
  egitim: { label: "Eğitim", icon: GraduationCap, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200" },
  sunum: { label: "Sunum", icon: MonitorPlay, color: "text-pink-500", bg: "bg-pink-50", border: "border-pink-200" },
  taskqube: { label: "Taskqube", icon: LayoutDashboard, color: "text-violet-500", bg: "bg-violet-50", border: "border-violet-200" },
  test: { label: "Test", icon: FlaskConical, color: "text-teal-500", bg: "bg-teal-50", border: "border-teal-200" },
  analiz: { label: "Analiz", icon: BarChart2, color: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-200" },
  satis: { label: "Satış Görüşmesi", icon: Briefcase, color: "text-green-500", bg: "bg-green-50", border: "border-green-200" },
  diger: { label: "Diğer", icon: MoreHorizontal, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
};

export const departmentLabels = {
  satis: "Satış",
  pazarlama: "Pazarlama",
  musteri_hizmetleri: "Belediye Hizmetleri",
  teknik: "Teknik",
  yonetim: "Yönetim",
  insan_kaynaklari: "İnsan Kaynakları",
  finans: "Finans",
};

export const outcomeLabels = {
  basarili: { label: "Başarılı", color: "text-emerald-600", bg: "bg-emerald-50" },
  takip_gerekli: { label: "Takip Gerekli", color: "text-amber-600", bg: "bg-amber-50" },
  olumsuz: { label: "Olumsuz", color: "text-red-600", bg: "bg-red-50" },
  devam_ediyor: { label: "Devam Ediyor", color: "text-blue-600", bg: "bg-blue-50" },
};

export const locationLabels = {
  ofis: { label: "Ofis", color: "text-blue-600", bg: "bg-blue-50" },
  evden: { label: "Evden", color: "text-emerald-600", bg: "bg-emerald-50" },
  saha: { label: "Saha", color: "text-orange-600", bg: "bg-orange-50" },
};

// "HH:MM" iki saat arasi dakika farki (gece yarisini gecerse +24s). Eksik/gecersizse "".
export function calcDurationStr(start, end) {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "";
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return String(diff);
}

export function formatDuration(minutes) {
  if (!minutes) return "0dk";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}sa`;
  return `${h}sa ${m}dk`;
}