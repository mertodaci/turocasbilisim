import { Calculator } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";
import IkTatilSihirbazi from "@/pages/ik/IkTatilSihirbazi";
import IkHakedisAyar from "@/pages/ik/IkHakedisAyar";
import IkBordroYemek from "@/pages/ik/IkBordroYemek";
import IkSirket from "@/pages/ik/IkSirket";

const CATEGORIES = [
  { key: "tatil_sihirbazi", label: "Tatil Sihirbazı",                    group: "Bordro Ayarları", component: IkTatilSihirbazi },
  { key: "hakedis_ayar",    label: "Bordrolama Ayarları",                group: "Bordro Ayarları", component: IkHakedisAyar },
  { key: "bordro_yemek",    label: "Bordro Yemek & Cumartesi Opsiyonları",group: "Bordro Ayarları", component: IkBordroYemek },
  { key: "sirket",          label: "Şirket Bilgileri",                   group: "Bordro Ayarları", component: IkSirket },
];

const GROUPS = [
  { key: "Bordro Ayarları", icon: Calculator, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
];

// Maaş Bordro Yönetimi > Tanım — tek konsolide ekran. Eski ayrı sayfalar
// (IkTatilSihirbazi/IkHakedisAyar/IkBordroYemek/IkSirket.jsx) route/yetki
// anahtarlarıyla birlikte dokunulmadan duruyor, yalnızca nav'dan kaldırıldı.
export default function BordroGenelTanimlar() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Genel Tanımlar"
      subtitle="Tatil, bordrolama, yemek ve şirket ayarlarını yönetin"
    />
  );
}
