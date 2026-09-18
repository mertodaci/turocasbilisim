import { Users, Building2, CalendarDays } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";
import IkSubeler from "@/pages/ik/IkSubeler";
import IkBolumler from "@/pages/ik/IkBolumler";
import LeaveTypeManager from "@/components/leave/LeaveTypeManager";
import LeaveAllowanceManager from "@/components/leave/LeaveAllowanceManager";

const CATEGORIES = [
  { key: "departman",      label: "Departmanlar",      group: "Çalışan" },
  { key: "pozisyon",       label: "Pozisyonlar",       group: "Çalışan" },
  { key: "egitim_seviyesi",label: "Eğitim Seviyeleri", group: "Çalışan" },
  { key: "ayrilis_nedeni", label: "Ayrılış Nedenleri", group: "Çalışan" },
  { key: "belge_turu",     label: "Belge Türleri",     group: "Çalışan" },
  { key: "uyruk",          label: "Uyruklar",          group: "Çalışan" },
  { key: "meslek_kodu",    label: "Meslek Kodları (SGK)", group: "Çalışan" },
  { key: "subeler",        label: "Şubeler / Lokasyonlar", group: "Organizasyon", component: IkSubeler },
  { key: "bolumler",       label: "Bölümler",             group: "Organizasyon", component: IkBolumler },
  { key: "izin_turleri",   label: "İzin Türleri ve Kuralları", group: "İzin", component: LeaveTypeManager },
  { key: "izin_haklari",   label: "İzin Hakları Yönetimi",     group: "İzin", component: LeaveAllowanceManager },
];

const GROUPS = [
  { key: "Çalışan",      icon: Users,        color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200 dark:border-blue-800" },
  { key: "Organizasyon", icon: Building2,    color: "text-teal-500",   bg: "bg-teal-50 dark:bg-teal-950/30",   border: "border-teal-200 dark:border-teal-800" },
  { key: "İzin",         icon: CalendarDays, color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
];

// Tek "Genel Tanımlar" ekranı: çalışan + müşteri parametrik tanımları +
// (pilot) Şubeler/Bölümler/İzin Türleri/İzin Hakları Yönetimi buraya
// gömülü sekmeler olarak katlandı — bu 4'ünün kendi route'u/yetki
// anahtarı hâlâ duruyor (App.jsx), yalnızca nav'dan kaldırıldılar.
// Sözleşme Türleri / Ürünler / Modüller kendi ayrı Tanım ekranlarına
// taşındı (bkz. SozlesmeTurleri.jsx / SozlesmeUrunler.jsx /
// SozlesmeModuller.jsx), Sözleşme Yönetimi menüsü altında.
// İnsan Kaynakları › Tanımlar altında, /ik-tanimlar yolunda.
export default function Definitions() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Çalışan, organizasyon ve izin tanımlarını yönetin"
    />
  );
}
