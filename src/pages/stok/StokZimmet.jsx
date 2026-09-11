import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useUrunEkBarkodMap } from "@/hooks/useUrunEkBarkod";
import { HardHat, Plus, Trash2, Undo2, Eye } from "lucide-react";
import { toast } from "sonner";

const DURUM_BADGE = {
  acik: "bg-emerald-100 text-emerald-700",
  kismen_iade: "bg-amber-100 text-amber-700",
  iade: "bg-slate-100 text-slate-600",
};
const DURUM_LBL = { acik: "Açık", kismen_iade: "Kısmen İade", iade: "İade Edildi" };

const iadeZamani = (satir) => {
  if (!satir.iade_miktar || Number(satir.iade_miktar) <= 0 || !satir.updated_date) return null;
  try { return format(new Date(satir.updated_date), "dd.MM.yyyy HH:mm"); } catch { return null; }
};

const bosSatir = () => ({ urun_id: "", urun_adi: "", seri_no: "" });

export default function StokZimmet() {
  const qc = useQueryClient();
  const [durumTab, setDurumTab] = useState("acik");
  const [personelId, setPersonelId] = useState("");
  const [yerId, setYerId] = useState("");
  const [t1, setT1] = useState("");
  const [t2, setT2] = useState("");
  const [q, setQ] = useState("");
  const [yeniDialog, setYeniDialog] = useState(false);
  const [detay, setDetay] = useState(null); // { ...zimmet, satirlar }
  const [iadeMiktarlar, setIadeMiktarlar] = useState({});

  const filtre = { durum: durumTab === "hepsi" ? undefined : durumTab, personel_id: personelId || undefined, yer_id: yerId || undefined, t1: t1 || undefined, t2: t2 || undefined, q: q || undefined };
  const { data: zimmetler = [], isLoading } = useQuery({ queryKey: ["stok_zimmet_liste", filtre], queryFn: () => flowApi.stok.zimmetList(filtre) });
  const { data: ozet } = useQuery({ queryKey: ["stok_zimmet_ozet"], queryFn: () => flowApi.stok.zimmetOzet() });
  const { data: personeller = [] } = useQuery({ queryKey: ["employees-min"], queryFn: () => flowApi.entities.Employee.list("full_name", 3000) });
  const { data: yerler = [] } = useQuery({ queryKey: ["stok_zimmet_yerleri"], queryFn: () => flowApi.entities.StokZimmetYeri.list("ad", 1000) });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["stok_zimmet_liste"] }); qc.invalidateQueries({ queryKey: ["stok_zimmet_ozet"] }); };

  const iadeM = useMutation({
    mutationFn: ({ id, satirlar }) => flowApi.stok.zimmetIade(id, { satirlar }),
    onSuccess: () => { invalidate(); setDetay(null); toast.success("Zimmetten düşüldü"); },
    onError: (e) => toast.error(String(e?.message || "Zimmetten düşülemedi")),
  });

  const openDetay = async (z) => {
    try {
      const d = await flowApi.stok.zimmetGetir(z.id);
      setDetay(d);
      const m = {};
      d.satirlar.forEach((s) => { m[s.id] = +(s.miktar - s.iade_miktar).toFixed(6); });
      setIadeMiktarlar(m);
    } catch (e) { toast.error("Detay açılamadı: " + (e?.message || "hata")); }
  };
  const iadeGonder = () => {
    const satirlar = detay.satirlar
      .map((s) => ({ satir_id: s.id, iade_miktar: Math.min(Number(iadeMiktarlar[s.id]) || 0, +(s.miktar - s.iade_miktar).toFixed(6)) }))
      .filter((s) => s.iade_miktar > 1e-9);
    if (!satirlar.length) { toast.error("Düşülecek miktar girin"); return; }
    iadeM.mutate({ id: detay.id, satirlar });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><HardHat className="w-6 h-6 text-primary" /> Zimmet</h1>
          <p className="text-sm text-muted-foreground mt-1">Malzeme bir kişiye ve/veya bir yere zimmetlenir; zimmetli miktar kullanılabilir stoktan bloke edilir, iade edilene kadar başka bir çıkışa konu edilemez.</p>
        </div>
        <Button onClick={() => setYeniDialog(true)}><Plus className="w-4 h-4 mr-1.5" /> Yeni Zimmet</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[["Aktif", ozet?.aktif], ["Geciken", ozet?.geciken], ["İade Edilmiş", ozet?.iade], ["Toplam", ozet?.toplam]].map(([lbl, v]) => (
          <div key={lbl} className="bg-card border rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground">{lbl}</p>
            <p className="text-xl font-bold">{v ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {["hepsi", "acik", "geciken", "iade"].map((t) => (
          <Button key={t} size="sm" variant={durumTab === t ? "default" : "outline"} onClick={() => setDurumTab(t)}>
            {t === "hepsi" ? "Tümü" : t === "acik" ? "Aktif" : t === "geciken" ? "Geciken" : "İade Edilmiş"}
          </Button>
        ))}
        <div className="w-52"><SearchableSelect value={personelId} onChange={setPersonelId} options={[{ value: "", label: "Tüm Personel" }, ...personeller.map((p) => ({ value: p.id, label: p.full_name }))]} placeholder="Personel" /></div>
        <div className="w-52"><SearchableSelect value={yerId} onChange={setYerId} options={[{ value: "", label: "Tüm Yerler" }, ...yerler.map((y) => ({ value: y.id, label: y.ad }))]} placeholder="Zimmet Yeri" /></div>
        <div className="flex items-center gap-1.5">
          <Input type="date" className="w-[150px]" value={t1} onChange={(e) => setT1(e.target.value)} title="Başlangıç" />
          <span className="text-muted-foreground text-sm">–</span>
          <Input type="date" className="w-[150px]" value={t2} onChange={(e) => setT2(e.target.value)} title="Bitiş" />
        </div>
        <Input className="max-w-xs ml-auto" placeholder="Zimmet no / personel / yer / depo ara" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : !zimmetler.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"><HardHat className="w-8 h-8 opacity-40" /><p>Zimmet yok.</p></div>
        ) : (
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Zimmet No</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Personel / Yer</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Depo</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Kalem</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Termin</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {zimmetler.map((z, i) => (
                <tr key={z.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""} ${z.geciken ? "bg-red-50/50" : ""}`}>
                  <td className="px-4 py-3 font-medium">{z.zimmet_no}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[z.personel_adi, z.yer_adi].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{z.depo_adi}</td>
                  <td className="px-4 py-3 text-muted-foreground">{z.kalem_sayisi}</td>
                  <td className="px-4 py-3 text-muted-foreground">{z.teslim_tarihi}</td>
                  <td className="px-4 py-3 text-muted-foreground">{z.termin_tarihi || "—"}{z.geciken && <span className="ml-1 text-red-600 text-xs font-semibold">GECİKTİ</span>}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${DURUM_BADGE[z.durum] || ""}`}>{DURUM_LBL[z.durum] || z.durum}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Detay / Zimmetten Düş" onClick={() => openDetay(z)}><Eye className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <YeniZimmetDialog open={yeniDialog} onOpenChange={setYeniDialog} onCreated={invalidate} personeller={personeller} yerler={yerler} />

      <Dialog open={!!detay} onOpenChange={(v) => !v && setDetay(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{detay?.zimmet_no} — {[detay?.personel_adi, detay?.yer_adi].filter(Boolean).join(" · ")}</DialogTitle></DialogHeader>
          {detay && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>Depo: <b className="text-foreground">{detay.depo_adi}</b></div>
                <div>Durum: <b className="text-foreground">{DURUM_LBL[detay.durum] || detay.durum}</b></div>
                <div>Zimmet Tarihi: <b className="text-foreground">{detay.teslim_tarihi}</b></div>
                <div>Termin: <b className="text-foreground">{detay.termin_tarihi || "—"}</b></div>
              </div>
              {detay.teslim_notu && <p className="text-muted-foreground">Not: {detay.teslim_notu}</p>}
              <table className="w-full text-xs border rounded-lg overflow-hidden">
                <thead className="bg-muted/40"><tr>
                  <th className="text-left px-2 py-1.5">Ürün</th><th className="text-right px-2 py-1.5">Zimmetli</th>
                  <th className="text-right px-2 py-1.5">İade Edilen</th><th className="text-left px-2 py-1.5">İade Tarihi</th>
                  <th className="text-right px-2 py-1.5">Düşülecek Miktar</th>
                </tr></thead>
                <tbody>
                  {detay.satirlar.map((s) => {
                    const kalan = +(s.miktar - s.iade_miktar).toFixed(6);
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="px-2 py-1.5">{s.urun_adi}{s.seri_no ? ` · SN ${s.seri_no}` : ""}</td>
                        <td className="px-2 py-1.5 text-right">{s.miktar} {s.birim}</td>
                        <td className="px-2 py-1.5 text-right">{s.iade_miktar}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{iadeZamani(s) || "—"}</td>
                        <td className="px-2 py-1.5 text-right">
                          {kalan <= 1e-9 ? <span className="text-muted-foreground">—</span> : (
                            <Input type="number" className="h-7 w-20 text-right inline-block" value={iadeMiktarlar[s.id] ?? ""} max={kalan}
                              onChange={(e) => setIadeMiktarlar({ ...iadeMiktarlar, [s.id]: e.target.value })} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {detay.durum !== "iade" && (
                <div className="flex justify-end pt-2 border-t">
                  <Button disabled={iadeM.isPending} onClick={iadeGonder}><Undo2 className="w-4 h-4 mr-1.5" /> Zimmetten Düş</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function YeniZimmetDialog({ open, onOpenChange, onCreated, personeller, yerler }) {
  const [depoId, setDepoId] = useState("");
  const [personelId, setPersonelId] = useState("");
  const [yerId, setYerId] = useState("");
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [termin, setTermin] = useState("");
  const [notlar, setNotlar] = useState("");
  const [satirlar, setSatirlar] = useState([bosSatir()]);
  const [seriListeleri, setSeriListeleri] = useState({}); // { [urun_id]: [seri_no, ...] }
  const [saving, setSaving] = useState(false);

  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });
  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 8000), enabled: open });
  const demirbasUrunler = useMemo(() => urunler.filter((u) => u.urun_tipi === "demirbas"), [urunler]);
  const ekBarkodMap = useUrunEkBarkodMap();

  const sifirla = () => {
    setDepoId(""); setPersonelId(""); setYerId(""); setTarih(new Date().toISOString().slice(0, 10));
    setTermin(""); setNotlar(""); setSatirlar([bosSatir()]); setSeriListeleri({});
  };
  const kapat = () => { onOpenChange(false); sifirla(); };

  const setSatir = (i, patch) => setSatirlar((ss) => ss.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const ekleSatir = () => setSatirlar((ss) => [...ss, bosSatir()]);
  const silSatir = (i) => setSatirlar((ss) => ss.length > 1 ? ss.filter((_, idx) => idx !== i) : ss);

  const onPickUrun = async (i, urunId) => {
    const u = demirbasUrunler.find((x) => x.id === urunId);
    setSatir(i, { urun_id: urunId, urun_adi: u?.ad || "", seri_no: "" });
    if (depoId) {
      try {
        const liste = await flowApi.stok.zimmetSeriNoListesi(urunId, depoId);
        setSeriListeleri((sl) => ({ ...sl, [urunId]: liste }));
      } catch { setSeriListeleri((sl) => ({ ...sl, [urunId]: [] })); }
    }
  };

  const gonder = async () => {
    if (!depoId) { toast.error("Depo seçin"); return; }
    if (!personelId && !yerId) { toast.error("Personel veya Zimmet Yeri en az biri gerekli"); return; }
    const temiz = satirlar.filter((s) => s.urun_id && s.seri_no);
    if (!temiz.length) { toast.error("En az bir malzeme satırı ekleyin"); return; }
    setSaving(true);
    try {
      await flowApi.stok.zimmetle({ personel_id: personelId || null, yer_id: yerId || null, depo_id: depoId, tarih, termin_tarihi: termin || null, notlar: notlar || null, satirlar: temiz });
      toast.success("Zimmetlendi");
      onCreated(); kapat();
    } catch (e) { toast.error(String(e?.message || "Zimmetlenemedi")); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && kapat()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Yeni Zimmet</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <Label className="mb-1.5 block text-xs">Depo * <span className="text-muted-foreground font-normal">— malzeme hangi depodan zimmetlenecek</span></Label>
            <SearchableSelect value={depoId} onChange={(v) => { setDepoId(v); setSatirlar([bosSatir()]); }} options={depolar.map((d) => ({ value: d.id, label: d.ad }))} placeholder="Depo seçin" fixDialogWheelScroll />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Personel</Label>
              <SearchableSelect value={personelId} onChange={setPersonelId} options={[{ value: "", label: "— Yok" }, ...personeller.map((p) => ({ value: p.id, label: p.full_name }))]} placeholder="Personel seçin" fixDialogWheelScroll />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Zimmet Yeri</Label>
              <SearchableSelect value={yerId} onChange={setYerId} options={[{ value: "", label: "— Yok" }, ...yerler.map((y) => ({ value: y.id, label: y.ad }))]} placeholder="Yer seçin" fixDialogWheelScroll />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">Personel ve Zimmet Yeri'nden en az biri seçilmeli, ikisi birden de seçilebilir.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">Zimmet Tarihi</Label>
              <Input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Termin Tarihi</Label>
              <Input type="date" value={termin} onChange={(e) => setTermin(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Notlar</Label>
            <Textarea rows={2} value={notlar} onChange={(e) => setNotlar(e.target.value)} />
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Zimmetlenecek Malzemeler</Label>
              <Button size="sm" variant="outline" onClick={ekleSatir} disabled={!depoId}><Plus className="w-3.5 h-3.5 mr-1" /> Satır Ekle</Button>
            </div>
            {!depoId && <p className="text-xs text-muted-foreground">Önce depo seçin.</p>}
            {depoId && satirlar.map((s, i) => {
              // Aynı zimmet formundaki BAŞKA satırlarda seçilmiş sicil no'lar bu
              // satırın listesinden çıkarılır -- aynı fiziksel demirbaş bir
              // zimmete iki kez eklenemez.
              const digerSatirlardaSecili = new Set(
                satirlar.filter((_, idx) => idx !== i).filter((x) => x.urun_id === s.urun_id).map((x) => x.seri_no).filter(Boolean)
              );
              const musaitSicilListesi = (seriListeleri[s.urun_id] || []).filter((sn) => !digerSatirlardaSecili.has(sn));
              return (
              <div key={i} className="border rounded-xl p-2.5 space-y-2 bg-muted/10">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-7">
                    <Label className="mb-1 block text-[11px]">Ürün (Demirbaş)</Label>
                    <SearchableSelect value={s.urun_id} onChange={(v) => onPickUrun(i, v)}
                      options={demirbasUrunler.map((x) => ({ value: x.id, label: `${x.kod ? x.kod + " · " : ""}${x.ad}`, keywords: [x.barkod, ekBarkodMap[x.id]].filter(Boolean).join(" ") }))}
                      placeholder="Ürün kodu / adı / barkod" fixDialogWheelScroll />
                  </div>
                  <div className="col-span-4">
                    <Label className="mb-1 block text-[11px]">Sicil No</Label>
                    <SearchableSelect value={s.seri_no} onChange={(v) => setSatir(i, { seri_no: v })}
                      options={musaitSicilListesi.map((sn) => ({ value: sn, label: sn }))}
                      placeholder={musaitSicilListesi.length ? "Sicil no seç" : "Bu depoda müsait yok"} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => silSatir(i)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={kapat}>İptal</Button>
            <Button onClick={gonder} disabled={saving}>{saving ? "Zimmetleniyor..." : "Zimmetle"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
