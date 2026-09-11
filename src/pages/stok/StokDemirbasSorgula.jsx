import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CameraScanDialog from "@/components/stok/CameraScanDialog";
import { ScanSearch, Camera, ArrowDownToLine, ArrowUpFromLine, HardHat, MapPin } from "lucide-react";
import { toast } from "sonner";

const tarihSaat = (v) => {
  if (!v) return "—";
  try { return format(new Date(v), "dd.MM.yyyy HH:mm"); } catch { return v; }
};

export default function StokDemirbasSorgula() {
  const [seriNo, setSeriNo] = useState("");
  const [kameraAcik, setKameraAcik] = useState(false);
  const [sonuc, setSonuc] = useState(null);

  const ara = useMutation({
    mutationFn: (sn) => flowApi.stok.demirbasSorgula(sn),
    onSuccess: (r) => setSonuc(r),
    onError: (e) => { setSonuc(null); toast.error(String(e?.message || "Sicil no bulunamadı")); },
  });

  const gonder = (sn) => {
    const deger = (sn ?? seriNo).trim();
    if (!deger) return;
    setSeriNo(deger);
    ara.mutate(deger);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-violet-600"><ScanSearch className="w-6 h-6" /> Demirbaş Sorgula</h1>
        <p className="text-sm text-muted-foreground mt-1">Bir demirbaşın sicil no'sunu yazın ya da QR etiketini okutun — şu an nerede olduğunu, zimmetli mi olduğunu ve tüm geçmişini görün.</p>
      </div>

      <div className="flex gap-2">
        <Input autoFocus inputMode="text" className="h-12 text-base" placeholder="Sicil no (ör. 20260001)" value={seriNo}
          onChange={(e) => setSeriNo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") gonder(); }} />
        <Button variant="outline" className="h-12 px-3" onClick={() => setKameraAcik(true)} title="QR okut"><Camera className="w-5 h-5" /></Button>
        <Button className="h-12 px-5" onClick={() => gonder()} disabled={ara.isPending}>{ara.isPending ? "Aranıyor..." : "Ara"}</Button>
      </div>

      <CameraScanDialog open={kameraAcik} onOpenChange={setKameraAcik} onScan={(kod) => gonder(kod)} />

      {sonuc && (
        <div className="space-y-4">
          <div className="bg-card border rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Sicil No</p>
                <p className="text-lg font-bold font-mono">{sonuc.seri_no}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ürün</p>
                <p className="text-lg font-bold">{sonuc.urun?.ad || "—"}</p>
                <p className="text-xs text-muted-foreground">{sonuc.urun?.kod}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>Şu an: <b>{sonuc.mevcut_depo?.depo_adi || "hiçbir depoda görünmüyor"}</b></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <HardHat className="w-4 h-4 text-muted-foreground shrink-0" />
                {sonuc.acik_zimmet ? (
                  <span>Zimmetli: <b className="text-amber-600">{sonuc.acik_zimmet.personel_adi || sonuc.acik_zimmet.yer_adi}</b>
                    {" "}<span className="text-muted-foreground">({sonuc.acik_zimmet.zimmet_no}, {sonuc.acik_zimmet.teslim_tarihi})</span></span>
                ) : (
                  <span className="text-emerald-600">Zimmetli değil</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl overflow-hidden">
            <h2 className="font-semibold px-4 pt-4 pb-2">Hareket Geçmişi</h2>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-y"><tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tip</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Depo</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Fiş No</th>
              </tr></thead>
              <tbody>
                {sonuc.hareketler.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-muted-foreground">{tarihSaat(h.created_date)}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${h.tip === "giris" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {h.tip === "giris" ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                        {h.tip === "giris" ? "Giriş" : "Çıkış"}
                      </span>
                    </td>
                    <td className="px-4 py-2">{h.depo_adi}</td>
                    <td className="px-4 py-2 font-medium">{h.fis_no}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sonuc.zimmet_gecmisi.length > 0 && (
            <div className="bg-card border rounded-2xl overflow-hidden">
              <h2 className="font-semibold px-4 pt-4 pb-2">Zimmet Geçmişi</h2>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-y"><tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Zimmet No</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Kime / Nereye</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Teslim</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">İade</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Durum</th>
                </tr></thead>
                <tbody>
                  {sonuc.zimmet_gecmisi.map((z, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{z.zimmet_no}</td>
                      <td className="px-4 py-2">{z.personel_adi || z.yer_adi || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{z.teslim_tarihi}</td>
                      <td className="px-4 py-2 text-muted-foreground">{z.iade_tarihi || (z.iade_miktar > 0 ? tarihSaat(z.updated_date) : "—")}</td>
                      <td className="px-4 py-2">{z.durum === "acik" ? "Açık" : z.durum === "kismen_iade" ? "Kısmen İade" : "İade Edildi"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
