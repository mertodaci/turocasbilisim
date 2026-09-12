import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import QRCode from "qrcode";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CameraScanDialog from "@/components/stok/CameraScanDialog";
import { Printer, Camera, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function QrImage({ value, size = 160 }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 0, width: size }).then((d) => alive && setSrc(d)).catch(() => {});
    return () => { alive = false; };
  }, [value, size]);
  if (!src) return <div className="bg-muted rounded" style={{ width: size, height: size }} />;
  return <img src={src} alt="QR" width={size} height={size} />;
}

export default function DevriyeQrYazdir() {
  const [lokasyonId, setLokasyonId] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [testSonuc, setTestSonuc] = useState(null);

  const { data: lokasyonlar = [] } = useQuery({ queryKey: ["devriye_lokasyonlar"], queryFn: () => flowApi.entities.DevriyeLokasyon.list("ad", 500) });
  const { data: noktalar = [] } = useQuery({ queryKey: ["devriye_noktalar"], queryFn: () => flowApi.entities.DevriyeNokta.list("sira", 5000) });

  const okuM = useMutation({
    mutationFn: (qr_token) => flowApi.devriye.qrOku(qr_token),
    onSuccess: (r) => { setTestSonuc(r); toast.success("Test okuma başarılı"); },
    onError: (e) => toast.error("Test okuma başarısız: " + (e?.message || "hata")),
  });

  const secilenNoktalar = noktalar.filter((n) => n.lokasyon_id === lokasyonId).sort((a, b) => a.sira - b.sira);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Printer className="w-6 h-6 text-primary" /> QR Yazdır & Test Merkezi</h1>
          <p className="text-sm text-muted-foreground mt-1">Lokasyon seçip tüm noktaların QR'larını yazdırın veya kamerayla test edin.</p>
        </div>
        <div className="flex gap-2">
          <Select value={lokasyonId} onValueChange={setLokasyonId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Lokasyon seçin" /></SelectTrigger>
            <SelectContent>{lokasyonlar.map((l) => <SelectItem key={l.id} value={l.id}>{l.ad}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()} disabled={!lokasyonId}><Printer className="w-4 h-4 mr-2" /> Yazdır</Button>
        </div>
      </div>

      {lokasyonId && (
        <div className="bg-white rounded-2xl border border-border/50 p-6 grid grid-cols-2 sm:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
          {secilenNoktalar.map((n) => (
            <div key={n.id} className="flex flex-col items-center gap-2 border border-dashed border-border rounded-xl p-4 break-inside-avoid">
              <QrImage value={n.qr_token} />
              <p className="text-sm font-semibold text-center">{n.sira}. {n.nokta_adi}</p>
              <p className="text-xs text-muted-foreground">Saat: {n.olmasi_gereken_saat}</p>
            </div>
          ))}
          {secilenNoktalar.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Bu lokasyonda nokta yok.</p>}
        </div>
      )}

      <div className="print:hidden bg-card rounded-2xl border border-border/50 shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-semibold">Admin Kamera Testi</h3>
        <Button variant="outline" onClick={() => setScanOpen(true)}><Camera className="w-4 h-4 mr-2" /> Kamera ile Test Et</Button>
        {testSonuc && (
          <div className="flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {testSonuc.nokta_adi || "Nokta"} — {testSonuc.durum}
          </div>
        )}
      </div>

      <CameraScanDialog open={scanOpen} onOpenChange={setScanOpen} onScan={(code) => okuM.mutate(code)} />
    </div>
  );
}
