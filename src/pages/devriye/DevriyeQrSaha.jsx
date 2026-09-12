import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import CameraScanDialog from "@/components/stok/CameraScanDialog";
import { QrCode, Camera, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DURUM_LABEL = { zamaninda: "Zamanında", gec: "Geç", erken: "Erken", plan_disi: "Plan Dışı" };
const DURUM_TONE = { zamaninda: "bg-emerald-100 text-emerald-700", gec: "bg-amber-100 text-amber-700", erken: "bg-blue-100 text-blue-700", plan_disi: "bg-slate-100 text-slate-700" };

export default function DevriyeQrSaha() {
  const [scanOpen, setScanOpen] = useState(false);
  const [sonuc, setSonuc] = useState(null);

  const { data: vardiyalarim = [], isLoading } = useQuery({
    queryKey: ["devriye-bugunku-vardiyalarim"],
    queryFn: () => flowApi.devriye.bugunkuVardiyalarim(),
  });

  const okuM = useMutation({
    mutationFn: (qr_token) => flowApi.devriye.qrOku(qr_token),
    onSuccess: (r) => { setSonuc(r); toast.success("Okundu: " + (DURUM_LABEL[r.durum] || r.durum)); },
    onError: (e) => toast.error("Okuma başarısız: " + (e?.message || "hata")),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><QrCode className="w-6 h-6 text-primary" /> QR Devriye (Saha)</h1>
        <p className="text-sm text-muted-foreground mt-1">Bugünkü vardiyalarınız ve checkpoint QR okutma.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><CalendarClock className="w-4 h-4" /> Bugünkü Vardiyalarım</h3>
        {isLoading ? <p className="text-sm text-muted-foreground">Yükleniyor...</p> :
          vardiyalarim.length === 0 ? <p className="text-sm text-muted-foreground">Bugün için atamanız yok.</p> : (
          <div className="space-y-2">
            {vardiyalarim.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm border border-border/50 rounded-xl px-3 py-2">
                <span className="font-medium">{v.lokasyon_adi}</span>
                <span className="text-muted-foreground">{v.vardiya_adi}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button size="lg" className="w-full" onClick={() => setScanOpen(true)}><Camera className="w-5 h-5 mr-2" /> Kamera ile QR Okut</Button>

      {sonuc && (
        <div className={cn("rounded-2xl border p-4 flex items-center gap-3", sonuc.durum === "zamaninda" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
          {sonuc.durum === "zamaninda" ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <XCircle className="w-6 h-6 text-amber-600" />}
          <div>
            <p className="font-semibold text-sm">{sonuc.nokta_adi || "Nokta okundu"}</p>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", DURUM_TONE[sonuc.durum])}>{DURUM_LABEL[sonuc.durum] || sonuc.durum}</span>
          </div>
        </div>
      )}

      <CameraScanDialog open={scanOpen} onOpenChange={setScanOpen} onScan={(code) => okuM.mutate(code)} />
    </div>
  );
}
