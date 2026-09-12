import { Users, Building2 } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";

const CATEGORIES = [
  { key: "departman",      label: "Departmanlar",      group: "Çalışan" },
  { key: "pozisyon",       label: "Pozisyonlar",       group: "Çalışan" },
  { key: "egitim_seviyesi",label: "Eğitim Seviyeleri", group: "Çalışan" },
  { key: "ayrilis_nedeni", label: "Ayrılış Nedenleri", group: "Çalışan" },
  { key: "musteri_tipi",   label: "Müşteri Tipleri",   group: "Müşteri" },
  { key: "musteri_detayi", label: "Müşteri Detayları", group: "Müşteri" },
  { key: "belediye_tipi",  label: "Belediye Tipleri",  group: "Müşteri" },
  { key: "nufus_araligi",  label: "Nüfus Aralıkları",  group: "Müşteri" },
  { key: "sehir",          label: "Şehirler",           group: "Müşteri" },
];

const GROUPS = [
  { key: "Çalışan",    icon: Users,      color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/30",   border: "border-blue-200 dark:border-blue-800" },
  { key: "Müşteri",    icon: Building2,  color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
];

// Tek "Genel Tanımlar" ekranı: çalışan + müşteri parametrik tanımları.
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
      subtitle="Çalışan ve müşteri tanımlarını yönetin"
    />
  );
}
