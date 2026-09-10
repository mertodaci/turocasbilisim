import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Tags, Plus, Trash2, Printer, ListPlus } from "lucide-react";
import { toast } from "sonner";

const ETIKET_BOYUTLARI = {
  standart: { label: "Standart (220×120px, A4 yazıcı)" },
  termal: { label: "Termal Etiket (40×30mm rulo)" },
};

export default function StokEtiket() {
  const qc = useQueryClient();
  const [sepet, setSepet] = useState([]);
  const [sel, setSel] = useState("");
  const [adet, setAdet] = useState(1);
  const [boyut, setBoyut] = useState("standart");

  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 8000) });
  const { data: fisler = [] } = useQuery({ queryKey: ["stok_etiket_fisleri"], queryFn: () => flowApi.entities.StokEtiketFis.list("-created_date", 500) });

  const ekle = () => {
    const u = urunler.find((x) => x.id === sel);
    if (!u) return;
    setSepet((s) => {
      const i = s.findIndex((x) => x.urun_id === u.id);
      if (i >= 0) return s.map((x, idx) => idx === i ? { ...x, adet: x.adet + (adet || 1) } : x);
      return [...s, { urun_id: u.id, urun_adi: u.ad, urun_kodu: u.kod, barkod: u.barkod, adet: adet || 1 }];
    });
    setSel(""); setAdet(1);
  };

  const topluEkle = (filtreFn, uyariMetin) => {
    const adaylar = urunler.filter((u) => u.is_deleted !== 1 && u.aktif !== 0 && filtreFn(u));
    if (!adaylar.length) { toast.error(uyariMetin); return; }
    setSepet((s) => {
      const mevcut = new Set(s.map((x) => x.urun_id));
      const yeni = adaylar.filter((u) => !mevcut.has(u.id)).map((u) => ({ urun_id: u.id, urun_adi: u.ad, urun_kodu: u.kod, barkod: u.barkod, adet: 1 }));
      return [...s, ...yeni];
    });
    toast.success(`${adaylar.length} ürün sepete eklendi`);
  };

  const kaydetM = useMutation({
    mutationFn: () => {
      const yil = new Date().getFullYear();
      return flowApi.entities.StokEtiketFis.create({
        fis_no: `ETK-${yil}-${Date.now().toString().slice(-6)}`, tarih: new Date().toISOString().slice(0, 10),
        satirlar_json: sepet, toplam_etiket: sepet.reduce((a, x) => a + x.adet, 0), durum: "aktif", dizayn: "standart",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stok_etiket_fisleri"] }); toast.success("Etiket listesi kaydedildi"); },
  });

  const yazdir = () => {
    if (!sepet.length) return;
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) { toast.error("Yazdırma penceresi açılamadı (popup engelli olabilir)"); return; }
    const labels = sepet.flatMap((s) => Array.from({ length: s.adet }, () => s));
    const isTermal = boyut === "termal";
    w.document.write(`<html><head><title>Etiketler</title><style>
      *{box-sizing:border-box;font-family:system-ui,Arial,sans-serif}
      body{margin:0;padding:${isTermal ? 0 : "8px"};display:flex;flex-wrap:wrap;gap:${isTermal ? 0 : "6px"}}
      .lbl{width:${isTermal ? "40mm" : "220px"};height:${isTermal ? "30mm" : "120px"};border:1px solid #000;padding:${isTermal ? "2mm" : "8px"};display:flex;flex-direction:column;justify-content:space-between}
      .ad{font-size:${isTermal ? "9px" : "12px"};font-weight:600;line-height:1.2;overflow:hidden}
      .kod{font-size:${isTermal ? "8px" : "11px"};color:#333}
      .bar{font-family:'Libre Barcode 128',monospace;font-size:${isTermal ? "22px" : "34px"};letter-spacing:0;text-align:center;border-top:1px solid #ccc;padding-top:2px}
      .barnum{font-size:${isTermal ? "8px" : "11px"};text-align:center;letter-spacing:2px}
      @media print{.lbl{page-break-inside:avoid}${isTermal ? "@page{size:40mm 30mm;margin:0;}" : ""}}
    </style></head><body>${labels.map((l) => `
      <div class="lbl"><div><div class="ad">${(l.urun_adi || "").replace(/</g, "&lt;")}</div><div class="kod">${l.urun_kodu || ""}</div></div>
      <div><div class="barnum">${l.barkod || l.urun_kodu || "-"}</div></div></div>`).join("")}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 300);
    kaydetM.mutate();
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Tags className="w-6 h-6 text-primary" /> Toplu QR/Barkod Yazdırma</h1>
        <p className="text-sm text-muted-foreground mt-1">Ürün seç → etiket sepetine ekle → yazdır. Basılan listeler kayıt altına alınır.</p></div>

      <div className="bg-card border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[240px]"><SearchableSelect value={sel} onChange={setSel} options={urunler.map((u) => ({ value: u.id, label: `${u.kod ? u.kod + " · " : ""}${u.ad}`, keywords: u.barkod || "" }))} placeholder="Ürün ara / okut" /></div>
          <Input type="number" className="w-24" value={adet} onChange={(e) => setAdet(parseInt(e.target.value) || 1)} />
          <Button onClick={ekle} disabled={!sel}><Plus className="w-4 h-4 mr-1.5" /> Sepete Ekle</Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1 border-t">
          <Button variant="outline" size="sm" onClick={() => topluEkle((u) => !u.barkod, "Barkodu olmayan ürün yok")}>
            <ListPlus className="w-3.5 h-3.5 mr-1.5" /> Barkodu Olmayan Tüm Ürünleri Ekle
          </Button>
          <Button variant="outline" size="sm" onClick={() => topluEkle(() => true, "Ürün yok")}>
            <ListPlus className="w-3.5 h-3.5 mr-1.5" /> Tüm Aktif Ürünleri Ekle
          </Button>
          <Select value={boyut} onValueChange={setBoyut}>
            <SelectTrigger className="w-64 ml-auto"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(ETIKET_BOYUTLARI).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {sepet.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-muted/40"><tr><th className="text-left px-3 py-2">Ürün</th><th className="text-left px-3 py-2">Kod / Barkod</th><th className="text-right px-3 py-2">Adet</th><th className="px-3 py-2"></th></tr></thead>
            <tbody>
              {sepet.map((s, i) => (
                <tr key={s.urun_id} className="border-t">
                  <td className="px-3 py-1.5">{s.urun_adi}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{s.urun_kodu} / {s.barkod || "—"}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Input type="number" className="h-8 w-20 text-right inline-block" value={s.adet}
                      onChange={(e) => setSepet(sepet.map((x, idx) => idx === i ? { ...x, adet: parseInt(e.target.value) || 1 } : x))} />
                  </td>
                  <td className="px-3 py-1.5 text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSepet(sepet.filter((_, idx) => idx !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-muted-foreground">Toplam etiket: {sepet.reduce((a, x) => a + x.adet, 0)}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSepet([])}>Sepeti Temizle</Button>
            <Button disabled={!sepet.length} onClick={yazdir}><Printer className="w-4 h-4 mr-1.5" /> Yazdır ve Kaydet</Button>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <p className="px-4 py-3 text-sm font-semibold border-b">Basılan Etiket Listesi</p>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b"><tr><th className="text-left px-4 py-2 text-muted-foreground">Fiş No</th><th className="text-left px-4 py-2 text-muted-foreground">Tarih</th><th className="text-right px-4 py-2 text-muted-foreground">Ürün</th><th className="text-right px-4 py-2 text-muted-foreground">Toplam Etiket</th></tr></thead>
          <tbody>
            {fisler.filter((f) => f.is_deleted !== 1).map((f) => (
              <tr key={f.id} className="border-b last:border-0"><td className="px-4 py-1.5">{f.fis_no}</td><td className="px-4 py-1.5 text-muted-foreground">{f.tarih}</td><td className="px-4 py-1.5 text-right text-muted-foreground">{(f.satirlar_json || []).length}</td><td className="px-4 py-1.5 text-right">{f.toplam_etiket}</td></tr>
            ))}
            {!fisler.length && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
