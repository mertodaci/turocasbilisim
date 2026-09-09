import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ScanLine, Minus, Plus, Trash2, Check, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";

export default function StokMobil() {
  const [mode, setMode] = useState("giris");
  const [depoId, setDepoId] = useState("");
  const [sahaId, setSahaId] = useState("");
  const [lines, setLines] = useState([]);
  const [scan, setScan] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 8000) });
  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });
  const { data: sahalar = [] } = useQuery({ queryKey: ["stok_sahalar"], queryFn: () => flowApi.entities.StokSaha.list("ad", 5000) });
  const { data: barkodlar = [] } = useQuery({ queryKey: ["stok_urun_barkodlari-all"], queryFn: () => flowApi.entities.StokUrunBarkod.list("", 20000) });

  const barkodMap = useMemo(() => {
    const m = {};
    for (const u of urunler) { if (u.barkod) m[String(u.barkod).trim()] = u; if (u.kod) m[String(u.kod).trim().toUpperCase()] = u; }
    for (const b of barkodlar) { const u = urunler.find((x) => x.id === b.urun_id); if (u && b.barkod) m[String(b.barkod).trim()] = u; }
    return m;
  }, [urunler, barkodlar]);

  const ekle = (u) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.urun_id === u.id);
      if (i >= 0) return ls.map((l, idx) => idx === i ? { ...l, miktar: l.miktar + 1 } : l);
      return [{ urun_id: u.id, urun_adi: u.ad, urun_kodu: u.kod, birim: u.ana_birim || "ADET", miktar: 1, birim_fiyat: mode === "giris" ? (u.alis_fiyati || 0) : (u.satis_fiyati || 0) }, ...ls];
    });
  };
  const onScan = () => {
    const s = scan.trim();
    if (!s) return;
    const u = barkodMap[s] || barkodMap[s.toUpperCase()] || urunler.find((x) => (x.ad || "").toLowerCase().includes(s.toLowerCase()));
    if (u) { ekle(u); setScan(""); inputRef.current?.focus(); }
    else toast.error("Ürün bulunamadı: " + s);
  };
  const setQ = (i, d) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, miktar: Math.max(0.001, +(l.miktar + d).toFixed(3)) } : l));
  const setQV = (i, v) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, miktar: parseFloat(v) || 0 } : l));
  const del = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const kaydet = async () => {
    if (!depoId) { toast.error("Depo seçin"); return; }
    if (mode === "cikis" && !sahaId && !depoId) { toast.error("Hedef gerekli"); return; }
    const satirlar = lines.filter((l) => l.miktar > 0);
    if (!satirlar.length) { toast.error("Ürün yok"); return; }
    const depoAdi = depolar.find((d) => d.id === depoId)?.ad;
    const fis = mode === "giris"
      ? { tip: "giris", hedef_depo_id: depoId, hedef_depo_adi: depoAdi, belge_no: "MOBIL-" + Date.now() }
      : { tip: "cikis", kaynak_depo_id: depoId, kaynak_depo_adi: depoAdi, hedef_saha_id: sahaId || null, hedef_saha_adi: sahalar.find((s) => s.id === sahaId)?.ad, hedef_depo_id: sahaId ? null : depoId, hedef_depo_adi: sahaId ? null : depoAdi, belge_no: "MOBIL-" + Date.now() };
    setSaving(true);
    try {
      const saved = await flowApi.stok.createFis(fis, satirlar.map((l) => ({ ...l, carpan: 1 })));
      await flowApi.stok.onayla(saved.id);
      toast.success(`${saved.fis_no} onaylandı`);
      setLines([]);
    } catch (e) { toast.error(String(e?.message || "Kaydedilemedi")); }
    finally { setSaving(false); }
  };

  const toplam = lines.reduce((a, l) => a + (l.miktar || 0), 0);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button variant={mode === "giris" ? "default" : "outline"} className="h-12 text-base" onClick={() => { setMode("giris"); setLines([]); }}>
          <ArrowDownToLine className="w-5 h-5 mr-2" /> Giriş
        </Button>
        <Button variant={mode === "cikis" ? "default" : "outline"} className="h-12 text-base" onClick={() => { setMode("cikis"); setLines([]); }}>
          <ArrowUpFromLine className="w-5 h-5 mr-2" /> Çıkış
        </Button>
      </div>

      <div className="space-y-2">
        <SearchableSelect value={depoId} onChange={setDepoId} options={depolar.map((d) => ({ value: d.id, label: d.ad }))} placeholder={mode === "giris" ? "Hedef depo" : "Kaynak depo"} className="h-11" />
        {mode === "cikis" && <SearchableSelect value={sahaId} onChange={setSahaId} options={[{ value: "", label: "Hedef: aynı depo" }, ...sahalar.map((s) => ({ value: s.id, label: "Saha: " + s.ad }))]} placeholder="Hedef saha (ops.)" className="h-11" />}
      </div>

      <div className="flex gap-2">
        <Input ref={inputRef} autoFocus inputMode="text" className="h-12 text-base" placeholder="Barkod okut / ürün adı" value={scan}
          onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onScan(); }} />
        <Button className="h-12 px-4" onClick={onScan}><ScanLine className="w-5 h-5" /></Button>
      </div>

      <div className="space-y-2">
        {lines.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">Barkod okutarak ürün ekleyin.</p>
        : lines.map((l, i) => (
          <div key={l.urun_id} className="border rounded-xl p-3 bg-card flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{l.urun_adi}</p>
              <p className="text-xs text-muted-foreground">{l.urun_kodu} · {l.birim}</p>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQ(i, -1)}><Minus className="w-4 h-4" /></Button>
            <Input type="number" className="h-9 w-16 text-center shrink-0" value={l.miktar} onChange={(e) => setQV(i, e.target.value)} />
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQ(i, 1)}><Plus className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => del(i)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
      </div>

      <div className="sticky bottom-2 pt-2">
        <Button className="w-full h-14 text-base" disabled={saving || !lines.length || !depoId} onClick={kaydet}>
          <Check className="w-5 h-5 mr-2" /> {saving ? "Kaydediliyor..." : `Kaydet ve Onayla (${lines.length} kalem · ${toplam})`}
        </Button>
      </div>
    </div>
  );
}
