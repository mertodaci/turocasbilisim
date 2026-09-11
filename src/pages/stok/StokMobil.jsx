import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import CameraScanDialog from "@/components/stok/CameraScanDialog";
import { SEBEP_LISTESI } from "@/lib/stokSebepleri";
import { ScanLine, Minus, Plus, Trash2, Check, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Camera, Link2, PackagePlus } from "lucide-react";
import { toast } from "sonner";

export default function StokMobil() {
  const [mode, setMode] = useState("giris"); // giris | cikis | sayim
  const [depoId, setDepoId] = useState("");
  const [sahaId, setSahaId] = useState("");
  const [lines, setLines] = useState([]);
  const [scan, setScan] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [kameraAcik, setKameraAcik] = useState(false);
  const [bilinmeyen, setBilinmeyen] = useState(null); // { kod } -- barkod bulunamadi, baglama dialogu
  const [yeniUrunAdi, setYeniUrunAdi] = useState("");
  const [yeniUrunDemirbas, setYeniUrunDemirbas] = useState(false);
  const [baglanacakUrunId, setBaglanacakUrunId] = useState("");
  const [sebepKodu, setSebepKodu] = useState(SEBEP_LISTESI.giris[0].value);
  const [oneriler, setOneriler] = useState([]); // isimle arama sonuçları (2+ karakter sonrası)

  // sayım için
  const [sayimId, setSayimId] = useState(null);
  const [sayimSatirlari, setSayimSatirlari] = useState([]); // backend satır kayıtları (id, urun_id, urun_adi, sistem_miktar, sayilan_miktar)
  const [sayimBaslatiliyor, setSayimBaslatiliyor] = useState(false);

  // Mobil ekran tüm ürün/barkod kataloğunu indirmez — barkod sunucuda çözülür.
  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });
  const { data: sahalar = [] } = useQuery({ queryKey: ["stok_sahalar"], queryFn: () => flowApi.entities.StokSaha.list("ad", 5000) });
  // Sadece "bilinmeyen barkod -> mevcut ürüne bağla" dialogu açıkken yüklenir.
  const { data: tumUrunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 8000), enabled: !!bilinmeyen });

  const modDegistir = (m) => {
    setMode(m); setLines([]); setSayimId(null); setSayimSatirlari([]); setScan(""); setOneriler([]);
    if (SEBEP_LISTESI[m]) setSebepKodu(SEBEP_LISTESI[m][0].value);
  };

  // İsimle arama: 2+ karakter yazılınca (barkod tabancasının hızlı yazıp Enter'a
  // basmasından farklı olarak) elle yazan kullanıcı için debounce'lu öneri listesi.
  useEffect(() => {
    const q = scan.trim();
    if (q.length < 2) { setOneriler([]); return; }
    let iptal = false;
    const t = setTimeout(() => {
      flowApi.stok.barkodCoz({ q }).then((r) => { if (!iptal) setOneriler(r.adaylar || []); }).catch(() => { if (!iptal) setOneriler([]); });
    }, 300);
    return () => { iptal = true; clearTimeout(t); };
  }, [scan]);

  const oneriSec = (u) => {
    if (mode === "sayim") sayimaEkle(u); else ekle(u);
    setScan(""); setOneriler([]); inputRef.current?.focus();
  };

  const ekle = (u) => {
    const serili = u.seri_no_takip === 1 || u.seri_no_takip === true;
    setLines((ls) => {
      const i = ls.findIndex((l) => l.urun_id === u.id);
      if (i >= 0) return ls.map((l, idx) => idx === i ? { ...l, miktar: l.miktar + 1 } : l);
      return [{ urun_id: u.id, urun_adi: u.ad, urun_kodu: u.kod, birim: u.ana_birim || "ADET", miktar: 1, seri_no_takip: serili, birim_fiyat: mode === "giris" ? (u.alis_fiyati || 0) : (u.satis_fiyati || 0) }, ...ls];
    });
  };

  const sayimaEkle = (u) => {
    const satir = sayimSatirlari.find((s) => s.urun_id === u.id);
    if (!satir) { toast.error(`"${u.ad}" bu depoda kayıtlı değil — sayıma dahil edilemedi`); return; }
    setSayimSatirlari((ss) => ss.map((s) => s.id === satir.id ? { ...s, sayilan_miktar: (Number(s.sayilan_miktar) || 0) + 1, degisti: true } : s));
  };

  const barkodCoz = async (kod) => {
    const r = await flowApi.stok.barkodCoz({ kod, q: kod });
    const u = r.urun || (r.adaylar?.length === 1 ? r.adaylar[0] : null);
    if (u) return u;
    if (r.adaylar?.length > 1) { toast.error(`${r.adaylar.length} eşleşme — tam barkod / kod okutun`); return null; }
    setBilinmeyen({ kod });
    return null;
  };

  const onScan = async (kodOverride) => {
    const s = (kodOverride ?? scan).trim();
    if (!s || scanning) return;
    setScanning(true);
    try {
      const u = await barkodCoz(s);
      if (u) {
        if (mode === "sayim") sayimaEkle(u); else ekle(u);
        setScan(""); inputRef.current?.focus();
      }
    } catch (e) { toast.error(String(e?.message || "Arama hatası")); }
    finally { setScanning(false); }
  };

  const bilinmeyeniBagla = async () => {
    if (!baglanacakUrunId) return;
    try {
      await flowApi.entities.StokUrun.update(baglanacakUrunId, { barkod: bilinmeyen.kod });
      const u = tumUrunler.find((x) => x.id === baglanacakUrunId);
      toast.success(`Barkod "${u?.ad}" ürününe bağlandı`);
      if (mode === "sayim") sayimaEkle({ ...u, id: baglanacakUrunId }); else ekle({ ...u, id: baglanacakUrunId });
      setBilinmeyen(null); setBaglanacakUrunId(""); inputRef.current?.focus();
    } catch (e) { toast.error(String(e?.message || "Bağlanamadı")); }
  };

  const yeniUrunOlustur = async () => {
    if (!yeniUrunAdi.trim()) return;
    try {
      const u = await flowApi.entities.StokUrun.create({
        ad: yeniUrunAdi.trim(), barkod: bilinmeyen.kod, ana_birim: "ADET", kdv: 20, aktif: 1,
        urun_tipi: yeniUrunDemirbas ? "demirbas" : "tuketim", seri_no_takip: yeniUrunDemirbas ? 1 : 0,
      });
      toast.success(`"${u.ad}" oluşturuldu ve barkod bağlandı`);
      if (mode === "sayim") toast.error("Yeni ürün bu depo sayımında henüz yok — masaüstünden sayıma ekleyin"); else ekle(u);
      setBilinmeyen(null); setYeniUrunAdi(""); setYeniUrunDemirbas(false); inputRef.current?.focus();
    } catch (e) { toast.error(String(e?.message || "Oluşturulamadı")); }
  };

  const setQ = (i, d) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, miktar: Math.max(0.001, +(l.miktar + d).toFixed(3)) } : l));
  const setQV = (i, v) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, miktar: parseFloat(v) || 0 } : l));
  const del = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const sayimBaslat = async () => {
    if (!depoId) { toast.error("Depo seçin"); return; }
    setSayimBaslatiliyor(true);
    try {
      const s = await flowApi.stok.sayimOlustur({ depo_id: depoId, doldur: true });
      setSayimId(s.id);
      setSayimSatirlari((s.satirlar || []).map((r) => ({ ...r, sayilan_miktar: null, degisti: false })));
      toast.success(`${s.sayim_no} başlatıldı — ${s.satirlar?.length || 0} ürün yüklendi`);
    } catch (e) { toast.error(String(e?.message || "Sayım başlatılamadı")); }
    finally { setSayimBaslatiliyor(false); }
  };
  const sayimSatirMiktar = (id, v) => setSayimSatirlari((ss) => ss.map((s) => s.id === id ? { ...s, sayilan_miktar: v === "" ? null : parseFloat(v) || 0, degisti: true } : s));
  const sayimKaydet = async () => {
    const degisenler = sayimSatirlari.filter((s) => s.degisti);
    if (!degisenler.length) { toast.error("Kaydedilecek değişiklik yok"); return; }
    setSaving(true);
    try {
      await flowApi.stok.sayimKaydet(sayimId, { satirlar: degisenler, durum: "sayiliyor" });
      toast.success("Sayılan miktarlar kaydedildi — tamamlama masaüstünden yapılır");
      setSayimSatirlari((ss) => ss.map((s) => ({ ...s, degisti: false })));
    } catch (e) { toast.error(String(e?.message || "Kaydedilemedi")); }
    finally { setSaving(false); }
  };

  const kaydet = async () => {
    if (!depoId) { toast.error("Depo seçin"); return; }
    const satirlar = lines.filter((l) => l.miktar > 0);
    if (!satirlar.length) { toast.error("Ürün yok"); return; }
    const depoAdi = depolar.find((d) => d.id === depoId)?.ad;
    const fis = mode === "giris"
      ? { tip: "giris", hedef_depo_id: depoId, hedef_depo_adi: depoAdi, sebep_kodu: sebepKodu, belge_no: "MOBIL-" + Date.now() }
      : { tip: "cikis", kaynak_depo_id: depoId, kaynak_depo_adi: depoAdi, hedef_saha_id: sahaId || null, hedef_saha_adi: sahalar.find((s) => s.id === sahaId)?.ad, hedef_depo_id: sahaId ? null : depoId, hedef_depo_adi: sahaId ? null : depoAdi, sebep_kodu: sebepKodu, belge_no: "MOBIL-" + Date.now() };
    // Girişte demirbaş: kullanıcı tek satırda toplam adedi girer, her fiziksel
    // birim kendi satırına bölünür (masaüstü FisForm.jsx ile aynı mantık);
    // sicil no burada ÜRETİLMİYOR -- onaylama anında backend tarafından
    // atomik/sıralı olarak atanıyor.
    const genisletilmis = satirlar.flatMap((l) => {
      if (mode === "giris" && l.seri_no_takip) {
        const adet = Math.max(1, Math.round(l.miktar));
        return Array.from({ length: adet }, () => ({ ...l, miktar: 1, carpan: 1, seri_no: "" }));
      }
      return [{ ...l, carpan: 1 }];
    });
    setSaving(true);
    try {
      const saved = await flowApi.stok.createFis(fis, genisletilmis);
      await flowApi.stok.onayla(saved.id);
      toast.success(`${saved.fis_no} onaylandı`);
      setLines([]);
    } catch (e) { toast.error(String(e?.message || "Kaydedilemedi")); }
    finally { setSaving(false); }
  };

  const toplam = lines.reduce((a, l) => a + (l.miktar || 0), 0);
  const sayilanSatirlar = sayimSatirlari.filter((s) => s.sayilan_miktar != null);

  const oneriListesi = (
    oneriler.length > 0 && (
      <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-card border rounded-xl shadow-lg max-h-64 overflow-y-auto">
        {oneriler.map((u) => (
          <button key={u.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-0"
            onMouseDown={(e) => e.preventDefault()} onClick={() => oneriSec(u)}>
            <p className="font-medium truncate">{u.ad}</p>
            <p className="text-xs text-muted-foreground">{u.kod}{u.barkod ? " · " + u.barkod : ""}</p>
          </button>
        ))}
      </div>
    )
  );

  return (
    <div className="max-w-md mx-auto space-y-4 pb-16">
      <div className="grid grid-cols-3 gap-2">
        <Button variant={mode === "giris" ? "default" : "outline"} className="h-12 text-sm" onClick={() => modDegistir("giris")}>
          <ArrowDownToLine className="w-4 h-4 mr-1.5" /> Giriş
        </Button>
        <Button variant={mode === "cikis" ? "default" : "outline"} className="h-12 text-sm" onClick={() => modDegistir("cikis")}>
          <ArrowUpFromLine className="w-4 h-4 mr-1.5" /> Çıkış
        </Button>
        <Button variant={mode === "sayim" ? "default" : "outline"} className="h-12 text-sm" onClick={() => modDegistir("sayim")}>
          <ClipboardCheck className="w-4 h-4 mr-1.5" /> Sayım
        </Button>
      </div>

      {mode !== "sayim" ? (
        <>
          <div className="space-y-2">
            <SearchableSelect value={depoId} onChange={setDepoId} options={depolar.map((d) => ({ value: d.id, label: d.ad }))} placeholder={mode === "giris" ? "Hedef depo" : "Kaynak depo"} className="h-11" />
            {mode === "cikis" && <SearchableSelect value={sahaId} onChange={setSahaId} options={[{ value: "", label: "Hedef: aynı depo" }, ...sahalar.map((s) => ({ value: s.id, label: "Saha: " + s.ad }))]} placeholder="Hedef saha (ops.)" className="h-11" />}
            {SEBEP_LISTESI[mode] && (
              <Select value={sebepKodu} onValueChange={setSebepKodu}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEBEP_LISTESI[mode].map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="relative">
            <div className="flex gap-2">
              <Input ref={inputRef} autoFocus inputMode="text" className="h-12 text-base" placeholder="Barkod okut / ürün adı" value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onScan(); if (e.key === "Escape") setOneriler([]); }} />
              <Button variant="outline" className="h-12 px-3" onClick={() => setKameraAcik(true)} title="Kamera ile okut"><Camera className="w-5 h-5" /></Button>
              <Button className="h-12 px-4" onClick={() => onScan()} disabled={scanning}><ScanLine className={`w-5 h-5 ${scanning ? "animate-pulse" : ""}`} /></Button>
            </div>
            {oneriListesi}
          </div>

          <div className="space-y-2">
            {lines.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">Barkod okutarak ürün ekleyin.</p>
            : lines.map((l, i) => (
              <div key={l.urun_id} className="border rounded-xl p-3 bg-card flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.urun_adi}</p>
                  <p className="text-xs text-muted-foreground">{l.urun_kodu} · {l.birim}</p>
                  {mode === "giris" && l.seri_no_takip && <p className="text-[10px] text-amber-600">Demirbaş — her adet ayrı sicil no alacak</p>}
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQ(i, -1)}><Minus className="w-4 h-4" /></Button>
                <Input type="number" className="h-9 w-16 text-center shrink-0" value={l.miktar} onChange={(e) => setQV(i, e.target.value)} />
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setQ(i, 1)}><Plus className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => del(i)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>

          <div className="fixed inset-x-0 bottom-32 z-40 flex justify-center px-4 pointer-events-none">
            <div className="w-full max-w-md pointer-events-auto">
              <Button className="w-full h-14 text-base shadow-lg" disabled={saving || !lines.length || !depoId} onClick={kaydet}>
                <Check className="w-5 h-5 mr-2" /> {saving ? "Kaydediliyor..." : `Kaydet ve Onayla (${lines.length} kalem · ${toplam})`}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          {!sayimId ? (
            <div className="space-y-3">
              <SearchableSelect value={depoId} onChange={setDepoId} options={depolar.map((d) => ({ value: d.id, label: d.ad }))} placeholder="Sayılacak depo" className="h-11" />
              <Button className="w-full h-12" disabled={!depoId || sayimBaslatiliyor} onClick={sayimBaslat}>
                <ClipboardCheck className="w-4 h-4 mr-2" /> {sayimBaslatiliyor ? "Başlatılıyor..." : "Sayımı Başlat"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Bu depodaki tüm ürünler yeni bir sayıma yüklenir, siz okuttukça sayılan miktar artar.</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <div className="flex gap-2">
                  <Input ref={inputRef} autoFocus inputMode="text" className="h-12 text-base" placeholder="Barkod okut / ürün adı" value={scan}
                    onChange={(e) => setScan(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") onScan(); if (e.key === "Escape") setOneriler([]); }} />
                  <Button variant="outline" className="h-12 px-3" onClick={() => setKameraAcik(true)} title="Kamera ile okut"><Camera className="w-5 h-5" /></Button>
                  <Button className="h-12 px-4" onClick={() => onScan()} disabled={scanning}><ScanLine className={`w-5 h-5 ${scanning ? "animate-pulse" : ""}`} /></Button>
                </div>
                {oneriListesi}
              </div>
              <div className="space-y-2">
                {!sayilanSatirlar.length ? <p className="text-center text-muted-foreground py-8 text-sm">Barkod okutarak saymaya başlayın.</p>
                : sayilanSatirlar.map((s) => (
                  <div key={s.id} className="border rounded-xl p-3 bg-card flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.urun_adi}</p>
                      <p className="text-xs text-muted-foreground">Sistem: {s.sistem_miktar}</p>
                    </div>
                    <Input type="number" className="h-9 w-20 text-center shrink-0" value={s.sayilan_miktar ?? ""} onChange={(e) => sayimSatirMiktar(s.id, e.target.value)} />
                  </div>
                ))}
              </div>
              <div className="fixed inset-x-0 bottom-32 z-40 flex justify-center px-4 pointer-events-none">
                <div className="w-full max-w-md pointer-events-auto">
                  <Button className="w-full h-14 text-base shadow-lg" disabled={saving} onClick={sayimKaydet}>
                    <Check className="w-5 h-5 mr-2" /> {saving ? "Kaydediliyor..." : `Sayılanları Kaydet (${sayilanSatirlar.length} ürün)`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <CameraScanDialog open={kameraAcik} onOpenChange={setKameraAcik} onScan={(kod) => onScan(kod)} />

      <Dialog open={!!bilinmeyen} onOpenChange={(v) => !v && setBilinmeyen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Bilinmeyen Barkod</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">"<span className="font-mono">{bilinmeyen?.kod}</span>" hiçbir ürüne kayıtlı değil.</p>
          <div className="space-y-2 pt-1">
            <Label className="text-xs">Mevcut bir ürüne bağla</Label>
            <div className="flex gap-2">
              <div className="flex-1"><SearchableSelect value={baglanacakUrunId} onChange={setBaglanacakUrunId} options={tumUrunler.map((u) => ({ value: u.id, label: `${u.kod ? u.kod + " · " : ""}${u.ad}` }))} placeholder="Ürün seç" /></div>
              <Button disabled={!baglanacakUrunId} onClick={bilinmeyeniBagla}><Link2 className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Ya da yeni ürün oluştur</Label>
            <div className="flex items-center justify-between gap-2 py-1">
              <Label htmlFor="yeni-urun-demirbas" className="text-xs font-normal text-muted-foreground">Demirbaş (araç, ekipman vb. — sicil no ile takip edilir)</Label>
              <Switch id="yeni-urun-demirbas" checked={yeniUrunDemirbas} onCheckedChange={setYeniUrunDemirbas} />
            </div>
            <div className="flex gap-2">
              <Input placeholder="Ürün adı" value={yeniUrunAdi} onChange={(e) => setYeniUrunAdi(e.target.value)} />
              <Button disabled={!yeniUrunAdi.trim()} onClick={yeniUrunOlustur}><PackagePlus className="w-4 h-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
