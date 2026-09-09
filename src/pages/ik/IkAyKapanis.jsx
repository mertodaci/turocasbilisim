import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Unlock, Download } from "lucide-react";
import { toast } from "sonner";

const now = new Date();
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export default function IkAyKapanis() {
  const qc = useQueryClient();
  const [yil, setYil] = useState(now.getFullYear());
  const [ay, setAy] = useState(now.getMonth() + 1);
  const [sube, setSube] = useState("");

  const { data } = useQuery({ queryKey: ["ik_bordro_liste", yil, ay, ""], queryFn: () => flowApi.ik.bordroListe({ yil, ay }) });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const donem = data?.donem;
  const kapali = donem?.durum === "kapali";

  const kapat = useMutation({
    mutationFn: (geri_al) => flowApi.ik.bordroKapat({ yil, ay, geri_al }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["ik_bordro_liste"] }); toast.success(`Dönem ${r.durum}`); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Lock className="w-6 h-6 text-primary" /> Ay Kapanışı & Bordro</h1>
        <p className="text-sm text-muted-foreground mt-1">Dönem kilitlenince bordro/puantaj/kesinti satırları değiştirilemez. Geri alınabilir. SGK devam kodları CSV bu ekrandan indirilir.</p>
      </div>

      <div className="flex gap-2 items-center">
        <Input type="number" className="w-20" value={yil} onChange={(e) => setYil(Number(e.target.value))} />
        <Select value={String(ay)} onValueChange={(v) => setAy(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{AYLAR.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        {donem && <span className={`text-xs px-2 py-1 rounded font-medium ${kapali ? "bg-slate-200 text-slate-700" : donem.durum === "onayli" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{kapali ? "KAPALI" : donem.durum === "onayli" ? "ONAYLI" : "TASLAK"}</span>}
      </div>

      <div className="bg-card border rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold">Dönem Kilitleme</p>
        {!donem ? <p className="text-sm text-muted-foreground">Bu dönem için henüz bordro hesaplanmamış.</p> : kapali ? (
          <Button variant="outline" disabled={kapat.isPending} onClick={() => kapat.mutate(true)}><Unlock className="w-4 h-4 mr-1.5" /> Kilidi Aç (Geri Al)</Button>
        ) : (
          <Button disabled={kapat.isPending || donem.durum !== "onayli"} onClick={() => { if (confirm("Dönem kilitlenecek — bordro/puantaj/kesinti değiştirilemez. Devam?")) kapat.mutate(false); }}>
            <Lock className="w-4 h-4 mr-1.5" /> Seçilen Ayı Kapat
          </Button>
        )}
        {donem && donem.durum !== "onayli" && !kapali && <p className="text-xs text-amber-600">Önce Bordrolama ekranından "Bordroyu Onayla".</p>}
      </div>

      <div className="bg-card border rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold">SGK Puantaj CSV</p>
        <p className="text-xs text-muted-foreground">Seçilen ayın devam kodları + eksik gün nedenleri (01-Ücretsiz, 02-İstirahat, 18-Devamsızlık). Ayda olmayan 29/30/31. gün kolonları boş.</p>
        <div className="flex gap-2">
          <Select value={sube || "hepsi"} onValueChange={(v) => setSube(v === "hepsi" ? "" : v)}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Şube" /></SelectTrigger>
            <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
          </Select>
          <a href={flowApi.ik.sgkCsvUrl(yil, ay, sube)}>
            <Button variant="outline"><Download className="w-4 h-4 mr-1.5" /> CSV İndir</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
