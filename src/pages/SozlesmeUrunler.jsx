import { Package } from "lucide-react";
import { DefinitionsScreen } from "@/components/definitions/DefinitionsScreen";

const CATEGORIES = [
  { key: "urun", label: "Ürünler", group: "Ürün" },
];

const GROUPS = [
  { key: "Ürün", icon: Package, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800" },
];

export default function SozlesmeUrunler() {
  return (
    <DefinitionsScreen
      groups={GROUPS}
      categories={CATEGORIES}
      title="Ürünler"
      subtitle="Sözleşmelerde ve modüllerde kullanılan ürünleri yönetin"
    />
  );
}
