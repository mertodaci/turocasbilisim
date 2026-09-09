import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Wrench, Plus, Pencil, Trash2, ArrowRightLeft, Undo2 } from "lucide-react";
import { toast } from "sonner";

const TABS = [{ id: "merkez", label: "Merkez" }, { id: "aletler", label: "El Aletleri" }, { id: "zimmetler", label: "Zimmetler" }, { id: "personel", label: "Personeller" }];
const D_DURUM = { kullanilabilir: "bg-emerald-100 text-emerald-700", personelde: "bg-amber-100 text-amber-700", bakimda: "bg-blue-100 text-blue-700", hurda: "bg-red-100 text-red-600" };
const D_LBL = { kullanilabilir: "Kullanılabilir", personelde: "Personelde", bakimda: "Bakımda", hurda: "Hurda" };
const dEmpty = { urun_id: "", depo_id: "", seri_no: "", barkod: "", alis_tarihi: "", garanti_bitis: "", kondisyon: "", durum: "kullanilabilir", not_: "" };
const pEmpty = { ad_soyad: "", telefon: "", eposta: "", departman: "Zimmet Personeli", aktif: 1, not_: "" };

export default function StokZimmet() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("merkez");
  const [dDlg, setDDlg] = useState({ open: false, item: null });
  const [pDlg, setPDlg] = useState({ open: false, item: null });
  const [zDlg, setZDlg] = useState(false);
  const [df, setDf] = useState(dEmpty);
  const [pf, setPf] = useState(pEmpty);
  const [zf, setZf] = useState({ demirbas_id: "", personel_id: "", saha_id: "", teslim_tarihi: new Date().toISOString().slice(0, 10), termin_tarihi: "", teslim_notu: "" });
  const [zFilter, setZFilter] = useState("acik");

  const ozet = useQuery({ queryKey: ["zimmet_ozet"], queryFn: () => flowApi.stok.zimmetOzet() });
  const { data: demirbaslar = [] } = useQuery({ queryKey: ["stok_demirbaslar"], queryFn: () => flowApi.entities.StokDemirbas.list("-created_date", 5000) });
  const { data: personeller = [] } = useQuery({ queryKey: ["stok_personeller"], queryFn: () => flowApi.entities.StokPersonel.list("ad_soyad", 5000) });
  const { data: zimmetler = [] } = useQuery({ queryKey: ["stok_zimmetler", zFilter], queryFn: () => flowApi.stok.zimmetList({ durum: zFilter }), enabled: tab === "zimmetler" || tab === "merkez" });
  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 5000) });
  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });
  const { data: sahalar = [] } = useQuery({ queryKey: ["stok_sahalar"], queryFn: () => flowApi.entities.StokSaha.list("ad", 5000) });

  const invAll = () => ["zimmet_ozet", "stok_demirbaslar", "stok_zimmetler", "stok_personeller"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const dSave = useMutation({
    mutationFn: () => { const data = { ...df, urun_adi: urunler.find((u) => u.id === df.urun_id)?.ad, depo_adi: depolar.find((x) => x.id === df.depo_id)?.ad }; return dDlg.item ? flowApi.entities.StokDemirbas.update(dDlg.item.id, data) : flowApi.entities.StokDemirbas.create(data); },
    onSuccess: () => { invAll(); setDDlg({ open: false, item: null }); toast.success("Kaydedildi"); }, onError: (e) => toast.error(String(e?.message)),
  });
  const dDel = useMutation({ mutationFn: (id) => flowApi.entities.StokDemirbas.delete(id), onSuccess: () => { invAll(); toast.success("Silindi"); } });
  const pSave = useMutation({
    mutationFn: () => pDlg.item ? flowApi.entities.StokPersonel.update(pDlg.item.id, pf) : flowApi.entities.StokPersonel.create(pf),
    onSuccess: () => { invAll(); setPDlg({ open: false, item: null }); toast.success("Kaydedildi"); }, onError: (e) => toast.error(String(e?.message)),
  });
  const pDel = useMutation({ mutationFn: (id) => flowApi.entities.StokPersonel.delete(id), onSuccess: () => { invAll(); toast.success("Silindi"); } });
  const zSave = useMutation({
    mutationFn: () => flowApi.stok.zimmetle(zf),
    onSuccess: (z) => { invAll(); setZDlg(false); toast.success(`${z.zimmet_no} — zimmetlendi`); }, onError: (e) => toast.error(String(e?.message)),
  });
  const zIade = useMutation({ mutationFn: (id) => flowApi.stok.zimmetIade(id), onSuccess: () => { invAll(); toast.success("İade alındı"); }, onError: (e) => toast.error(String(e?.message)) });

  const k = ozet.data || {};
  const musait = demirbaslar.filter((d) => d.durum === "kullanilabilir");
  const Th = ({ children }) => <th className="px-3 py-2 font-semibold text-muted-foreground text-left">{children}</th>;
  const Td = ({ children, b }) => <td className={`px-3 py-1.5 ${b ? "font-semibold" : "text-muted-foreground"}`}>{children}</td>;

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="w-6 h-6 text-primary" /> El Aletleri & Zimmet</h1>
        <p className="text-sm text-muted-foreground mt-1">Fiziksel el aleti/demirbaş kartları + terminli zimmet (personel + şantiye + termin + iade).</p></div>

      <div className="flex flex-wrap gap-1.5 border-b">
        {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t.label}</button>)}
      </div>

      {tab === "merkez" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[["Kullanılabilir", k.kullanilabilir], ["Personelde", k.personelde], ["Geciken", k.geciken], ["Bakımda", k.bakimda], ["Hurda", k.hurda]].map(([l, v]) => (
              <div key={l} className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold mt-1">{v ?? 0}</p></div>
            ))}
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm font-semibold mb-2">Geciken Teslimatlar</p>
            {(zimmetler.filter((z) => z.geciken) || []).map((z) => (
              <div key={z.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span>{z.zimmet_no} · {z.demirbas_adi} → {z.personel_adi}</span><span className="text-red-600">termin {z.termin_tarihi}</span>
              </div>
            ))}
            {!zimmetler.some((z) => z.geciken) && <p className="text-sm text-muted-foreground">Geciken teslimat yok.</p>}
          </div>
        </div>
      )}

      {tab === "aletler" && (
        <div className="space-y-3">
          <div className="flex justify-between"><p className="text-sm text-muted-foreground">Not: El aleti/demirbaş deposunu Depolar ekranında "El Aletleri" işletim moduna alın.</p>
            <Button onClick={() => { setDf(dEmpty); setDDlg({ open: true, item: null }); }}><Plus className="w-4 h-4 mr-2" /> El Aleti Ekle</Button></div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[840px]">
              <thead className="bg-muted/40 border-b"><tr><Th>Varlık Kodu</Th><Th>Ürün</Th><Th>Seri / Barkod</Th><Th>Depo</Th><Th>Garanti</Th><Th>Durum</Th><Th></Th></tr></thead>
              <tbody>
                {demirbaslar.filter((d) => d.is_deleted !== 1).map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <Td b>{d.varlik_kodu}</Td><Td>{d.urun_adi}</Td><Td>{[d.seri_no, d.barkod].filter(Boolean).join(" / ") || "—"}</Td><Td>{d.depo_adi || "—"}</Td><Td>{d.garanti_bitis || "—"}</Td>
                    <td className="px-3 py-1.5"><span className={`px-2 py-0.5 rounded text-xs font-medium ${D_DURUM[d.durum] || ""}`}>{D_LBL[d.durum] || d.durum}</span></td>
                    <td className="px-3 py-1.5 text-right">
                      {d.durum === "kullanilabilir" && <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Zimmetle" onClick={() => { setZf({ ...zf, demirbas_id: d.id }); setZDlg(true); }}><ArrowRightLeft className="w-3.5 h-3.5" /></Button>}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDf({ ...dEmpty, ...d }); setDDlg({ open: true, item: d }); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Silinsin mi?")) dDel.mutate(d.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {!demirbaslar.length && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">El aleti yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "zimmetler" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {["acik", "geciken", "iade", ""].map((v) => <Button key={v || "hepsi"} size="sm" variant={zFilter === v ? "default" : "outline"} onClick={() => setZFilter(v)}>{v === "acik" ? "Açık" : v === "geciken" ? "Geciken" : v === "iade" ? "İade" : "Tümü"}</Button>)}
            <Button className="ml-auto" onClick={() => { setZf({ demirbas_id: "", personel_id: "", saha_id: "", teslim_tarihi: new Date().toISOString().slice(0, 10), termin_tarihi: "", teslim_notu: "" }); setZDlg(true); }}><Plus className="w-4 h-4 mr-2" /> Yeni Zimmet</Button>
          </div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead className="bg-muted/40 border-b"><tr><Th>Zimmet No</Th><Th>El Aleti</Th><Th>Personel</Th><Th>Saha</Th><Th>Teslim</Th><Th>Termin</Th><Th>Durum</Th><Th></Th></tr></thead>
              <tbody>
                {zimmetler.map((z) => (
                  <tr key={z.id} className="border-b last:border-0">
                    <Td b>{z.zimmet_no}</Td><Td>{z.demirbas_adi} <span className="text-xs">({z.varlik_kodu})</span></Td><Td>{z.personel_adi}</Td><Td>{z.saha_adi || "—"}</Td><Td>{z.teslim_tarihi}</Td>
                    <td className={`px-3 py-1.5 ${z.geciken ? "text-red-600 font-medium" : "text-muted-foreground"}`}>{z.termin_tarihi || "—"}</td>
                    <td className="px-3 py-1.5"><span className={`px-2 py-0.5 rounded text-xs font-medium ${z.durum === "iade" ? "bg-emerald-100 text-emerald-700" : z.geciken ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{z.durum === "iade" ? "İade" : z.geciken ? "Geciken" : "Açık"}</span></td>
                    <td className="px-3 py-1.5 text-right">{z.durum === "acik" && <Button variant="ghost" size="sm" className="h-7 text-emerald-700" onClick={() => { if (confirm("İade alınsın mı?")) zIade.mutate(z.id); }}><Undo2 className="w-3.5 h-3.5 mr-1" /> İade Al</Button>}</td>
                  </tr>
                ))}
                {!zimmetler.length && <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">Zimmet yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "personel" && (
        <div className="space-y-3">
          <div className="flex justify-end"><Button onClick={() => { setPf(pEmpty); setPDlg({ open: true, item: null }); }}><Plus className="w-4 h-4 mr-2" /> Yeni Personel</Button></div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 border-b"><tr><Th>Kod</Th><Th>Ad Soyad</Th><Th>İletişim</Th><Th>Departman</Th><Th>Durum</Th><Th></Th></tr></thead>
              <tbody>
                {personeller.filter((p) => p.is_deleted !== 1).map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <Td>{p.kod}</Td><Td b>{p.ad_soyad}</Td><Td>{[p.telefon, p.eposta].filter(Boolean).join(" · ") || "—"}</Td><Td>{p.departman}</Td>
                    <td className="px-3 py-1.5"><Switch checked={p.aktif === 1} onCheckedChange={(v) => flowApi.entities.StokPersonel.update(p.id, { aktif: v ? 1 : 0 }).then(invAll)} /></td>
                    <td className="px-3 py-1.5 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPf({ ...pEmpty, ...p }); setPDlg({ open: true, item: p }); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Silinsin mi?")) pDel.mutate(p.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {!personeller.length && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Personel yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* El aleti dialog */}
      <Dialog open={dDlg.open} onOpenChange={(v) => !v && setDDlg({ open: false, item: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{dDlg.item ? "El Aleti Düzenle" : "Yeni El Aleti / Demirbaş"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label className="mb-1.5 block">Ürün *</Label><SearchableSelect value={df.urun_id} onChange={(v) => setDf({ ...df, urun_id: v })} options={urunler.map((u) => ({ value: u.id, label: u.ad }))} placeholder="Ürün" fixDialogWheelScroll /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">El Aletleri Deposu</Label><SearchableSelect value={df.depo_id} onChange={(v) => setDf({ ...df, depo_id: v })} options={depolar.map((x) => ({ value: x.id, label: x.ad }))} placeholder="Depo" fixDialogWheelScroll /></div>
              <div><Label className="mb-1.5 block">Seri No</Label><Input value={df.seri_no} onChange={(e) => setDf({ ...df, seri_no: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Barkod</Label><Input value={df.barkod} onChange={(e) => setDf({ ...df, barkod: e.target.value })} placeholder="Boşsa otomatik" /></div>
              <div><Label className="mb-1.5 block">Kondisyon</Label><Input value={df.kondisyon} onChange={(e) => setDf({ ...df, kondisyon: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Alış Tarihi</Label><Input type="date" value={df.alis_tarihi} onChange={(e) => setDf({ ...df, alis_tarihi: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Garanti Bitişi</Label><Input type="date" value={df.garanti_bitis} onChange={(e) => setDf({ ...df, garanti_bitis: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Durum</Label>
                <Select value={df.durum} onValueChange={(v) => setDf({ ...df, durum: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(D_LBL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="mb-1.5 block">Not</Label><Textarea rows={2} value={df.not_} onChange={(e) => setDf({ ...df, not_: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={() => setDDlg({ open: false, item: null })}>İptal</Button><Button disabled={!df.urun_id || dSave.isPending} onClick={() => dSave.mutate()}>Kaydet</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Personel dialog */}
      <Dialog open={pDlg.open} onOpenChange={(v) => !v && setPDlg({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{pDlg.item ? "Personel Düzenle" : "Yeni Personel"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="mb-1.5 block">Ad Soyad *</Label><Input value={pf.ad_soyad} onChange={(e) => setPf({ ...pf, ad_soyad: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Telefon</Label><Input value={pf.telefon} onChange={(e) => setPf({ ...pf, telefon: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">E-posta</Label><Input value={pf.eposta} onChange={(e) => setPf({ ...pf, eposta: e.target.value })} /></div>
            </div>
            <div><Label className="mb-1.5 block">Departman</Label><Input value={pf.departman} onChange={(e) => setPf({ ...pf, departman: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Not</Label><Textarea rows={2} value={pf.not_} onChange={(e) => setPf({ ...pf, not_: e.target.value })} /></div>
            <div className="flex items-center gap-3"><Switch checked={pf.aktif === 1} onCheckedChange={(v) => setPf({ ...pf, aktif: v ? 1 : 0 })} /><Label>Aktif</Label></div>
            <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={() => setPDlg({ open: false, item: null })}>İptal</Button><Button disabled={!pf.ad_soyad || pSave.isPending} onClick={() => pSave.mutate()}>Kaydet</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zimmet dialog */}
      <Dialog open={zDlg} onOpenChange={setZDlg}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Yeni Terminli Zimmet</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="mb-1.5 block">Kullanılabilir El Aleti *</Label><SearchableSelect value={zf.demirbas_id} onChange={(v) => setZf({ ...zf, demirbas_id: v })} options={musait.map((d) => ({ value: d.id, label: `${d.varlik_kodu} · ${d.urun_adi}` }))} placeholder="El aleti" fixDialogWheelScroll /></div>
            <div><Label className="mb-1.5 block">Personel *</Label><SearchableSelect value={zf.personel_id} onChange={(v) => setZf({ ...zf, personel_id: v })} options={personeller.filter((p) => p.aktif === 1).map((p) => ({ value: p.id, label: `${p.kod || ""} ${p.ad_soyad}`.trim() }))} placeholder="Personel" fixDialogWheelScroll /></div>
            <div><Label className="mb-1.5 block">Görev Sitesi</Label><SearchableSelect value={zf.saha_id} onChange={(v) => setZf({ ...zf, saha_id: v })} options={[{ value: "", label: "— Yok" }, ...sahalar.map((s) => ({ value: s.id, label: s.ad }))]} placeholder="Şantiye" fixDialogWheelScroll /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Teslim Tarihi</Label><Input type="date" value={zf.teslim_tarihi} onChange={(e) => setZf({ ...zf, teslim_tarihi: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Termin *</Label><Input type="date" value={zf.termin_tarihi} onChange={(e) => setZf({ ...zf, termin_tarihi: e.target.value })} /></div>
            </div>
            <div><Label className="mb-1.5 block">Teslim Notu / Kondisyon</Label><Textarea rows={2} value={zf.teslim_notu} onChange={(e) => setZf({ ...zf, teslim_notu: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={() => setZDlg(false)}>İptal</Button><Button disabled={!zf.demirbas_id || !zf.personel_id || zSave.isPending} onClick={() => zSave.mutate()}>Zimmetle</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
