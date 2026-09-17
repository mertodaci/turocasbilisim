import { useState } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/button";
import CameraScanDialog from "@/components/stok/CameraScanDialog";
import { seriNoCoz } from "@/lib/stokScan";
import { Camera } from "lucide-react";
import { toast } from "sonner";

/**
 * Demirbaş sicil no seçimi için SearchableSelect + QR okutma butonu.
 * Okutulan kod, çağıranın zaten hesapladığı `options` listesine göre
 * doğrulanır (Zimmet'te "bu depoda müsait", Transfer/Çıkış/İade'de "bu
 * depoda fiilen mevcut ve bloklu değil") -- yani hangi ekranda kullanılırsa
 * o ekranın kuralı geçerli olur, sabit bir hedef yoktur.
 */
export default function SicilNoScanSelect({ value, onChange, options, placeholder, className }) {
  const [kameraAcik, setKameraAcik] = useState(false);

  const handleScan = (kod) => {
    const trimmed = seriNoCoz(kod);
    const match = options.find((o) => o.value === trimmed);
    if (match) { onChange(trimmed); toast.success(`Sicil ${trimmed} seçildi`); }
    else toast.error(`"${trimmed}" bu listede müsait değil (yanlış ürün, başka depoda, ya da zaten bloklu/zimmetli olabilir)`);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className || ""}`}>
      <div className="flex-1 min-w-0">
        <SearchableSelect value={value} onChange={onChange} options={options} placeholder={placeholder} fixDialogWheelScroll />
      </div>
      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setKameraAcik(true)} title="QR Okut">
        <Camera className="w-4 h-4" />
      </Button>
      <CameraScanDialog open={kameraAcik} onOpenChange={setKameraAcik} onScan={handleScan} />
    </div>
  );
}
