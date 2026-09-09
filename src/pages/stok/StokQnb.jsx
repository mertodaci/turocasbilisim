import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { FileCode2, Plus, Trash2, ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "panel", label: "Panel" }, { id: "ayarlar", label: "Ayarlar" }, { id: "cari", label: "Cari Sorgu" },
  { id: "gelen", label: "Gelen e-Fatura" }, { id: "giden", label: "Giden / e-Arşiv" }, { id: "irsaliye", label: "Sevk İrsaliyesi" },
  { id: "arsiv", label: "Arşiv" }, { id: "log", label: "Loglar" },
];

function parseUbl(xml) {
  const out = [];
  const re = /<cac:InvoiceLine>([\s\S]*?)<\/cac:InvoiceLine>/g;
  let m;
  while ((m = re.exec(xml))) {
    const blk = m[1];
    const name = (blk.match(/<cbc:Name>([^<]+)<\/cbc:Name>/) || [])[1] || "";
    const qty = parseFloat((blk.match(/<cbc:InvoicedQuantity[^>]*>([\d.,]+)</) || [])[1]?.replace(",", ".")) || 0;
    const price = parseFloat((blk.match(/<cbc:PriceAmount[^>]*>([\d.,]+)</) || [])[1]?.replace(",", ".")) || 0;
    const unit = (blk.match(/<cbc:InvoicedQuantity unitCode="([^"]+)"/) || [])[1] || "ADET";
    if (name) out.push({ satici_urun_adi: name, satici_kodu: "", miktar: qty, birim: unit, birim_fiyat: price, eslesen_urun_id: "" });
  }
  return out;
}

export default function StokQnb() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("panel");
  const [xml, setXml] = useState("");
  const [glines, setGlines] = useState([]);
  const [ghead, setGhead] = useState({ belge_no: "", cari_id: "", cari_adi: "", vkn: "", tarih: new Date().toISOString().slice(0, 10), depo_id: "" });
  const [csForm, setCsForm] = useState({ cari_id: "", vkn: "", tip: "e-Fatura", durum: "Mükellef", alici_etiketi: "" });
  const [tsForm, setTsForm] = useState({ fis_id: "", tur: "e_fatura" });

  const panel = useQuery({ queryKey: ["qnb_panel"], queryFn: () => flowApi.stok.qnbPanel(), enabled: tab === "panel" });
  const { data: ayar } = useQuery({ queryKey: ["qnb_ayar"], queryFn: async () => (await flowApi.entities.StokQnbAyar.list("", 1))[0] || { id: 1, ortam: "test" } });
  const { data: belgeler = [] } = useQuery({ queryKey: ["qnb_belgeler"], queryFn: () => flowApi.entities.StokQnbBelge.list("-created_date", 1000) });
  const { data: loglar = [] } = useQuery({ queryKey: ["qnb_loglar"], queryFn: () => flowApi.entities.StokQnbLog.list("-created_date", 500), enabled: tab === "log" });
  const { data: sorgular = [] } = useQuery({ queryKey: ["qnb_cari_sorgu"], queryFn: () => flowApi.entities.StokQnbCariSorgu.list("-created_date", 500), enabled: tab === "cari" });
  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 8000) });
  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });
  const { data: cariler = [] } = useQuery({ queryKey: ["customers-all"], queryFn: () => flowApi.entities.Customer.list("company_name", 5000) });
  const { data: cikisFisleri = [] } = useQuery({ queryKey: ["stok_fisler-cikis"], queryFn: () => flowApi.entities.StokFis.filter({ tip: "cikis" }, "-created_date", 500), enabled: tab === "giden" || tab === "irsaliye" });

  const [ayarForm, setAyarForm] = useState(null);
  const af = ayarForm || ayar || {};
  const setAf = (patch) => setAyarForm({ ...af, ...patch });

  const ayarKaydet = useMutation({
    mutationFn: () => flowApi.entities.StokQnbAyar.update(1, af),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["qnb_ayar"] }); setAyarForm(null); toast.success("QNB ayarları kaydedildi"); },
    onError: (e) => toast.error(String(e?.message)),
  });
  const gelenAktar = useMutation({
    mutationFn: () => flowApi.stok.qnbGelenAktar({ belge: ghead, satirlar: glines, depo_id: ghead.depo_id }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["qnb_belgeler"] }); setGlines([]); setXml(""); toast.success(`Stok giriş fişi ${r.stok_fis_no} oluşturuldu`); },
    onError: (e) => toast.error(String(e?.message)),
  });
  const csKaydet = useMutation({
    mutationFn: () => flowApi.entities.StokQnbCariSorgu.create({ ...csForm, cari_adi: cariler.find((c) => c.id === csForm.cari_id)?.company_name, tarih: new Date().toISOString().slice(0, 10) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["qnb_cari_sorgu"] }); toast.success("Sorgu kaydı eklendi"); },
  });
  const taslakOlustur = useMutation({
    mutationFn: () => flowApi.stok.qnbTaslak(tsForm.fis_id, tsForm.tur),
    onSuccess: (b) => { qc.invalidateQueries({ queryKey: ["qnb_belgeler"] }); toast.success(`${b.belge_no} taslağı oluşturuldu`); },
    onError: (e) => toast.error(String(e?.message)),
  });

  const p = panel.data || {};
  const Th = ({ children }) => <th className="px-3 py-2 font-semibold text-muted-foreground text-left">{children}</th>;
  const Td = ({ children, b }) => <td className={`px-3 py-1.5 ${b ? "font-semibold" : "text-muted-foreground"}`}>{children}</td>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileCode2 className="w-6 h-6 text-primary" /> QNB e-Belge</h1>
          <p className="text-sm text-muted-foreground mt-1">e-Fatura / e-Arşiv / e-İrsaliye. <b>Test/taslak modu</b> — gerçek QNB API kimlikleri Ayarlar'dan girilene kadar belgeler yalnız taslak üretir.</p></div>
        <span className={`text-xs px-3 py-1 rounded-full ${(ayar?.aktif === 1) ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{ayar?.ortam === "canli" ? "CANLI" : "TEST"} {ayar?.aktif === 1 ? "· aktif" : "· pasif"}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b">
        {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t.label}</button>)}
      </div>

      {tab === "panel" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[["Bekleyen Gelen", p.bekleyen_gelen], ["Stok Girişe Aktarılan", p.stok_girise_aktarilan], ["Giden Taslak", p.giden_taslak], ["İrsaliye Taslak", p.irsaliye_taslak], ["Toplam Belge", p.toplam_belge], ["7 Gün Log", p.log_7gun]].map(([l, v]) => (
              <div key={l} className="bg-card border rounded-xl p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold mt-1">{v ?? 0}</p></div>
            ))}
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm font-semibold mb-2">Son Belgeler</p>
            <table className="w-full text-sm"><tbody>
              {(p.son_belgeler || []).map((b, i) => <tr key={i} className="border-b last:border-0"><td className="py-1.5">{b.belge_no}</td><td className="py-1.5 text-muted-foreground">{b.yon} · {b.tur}</td><td className="py-1.5 text-muted-foreground">{b.cari_adi || "—"}</td><td className="py-1.5 text-right">{b.durum}</td></tr>)}
              {!(p.son_belgeler || []).length && <tr><td className="py-4 text-center text-muted-foreground">Belge yok</td></tr>}
            </tbody></table>
          </div>
        </div>
      )}

      {tab === "ayarlar" && (
        <div className="bg-card border rounded-2xl p-4 space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1.5 block">Ortam</Label>
              <Select value={af.ortam || "test"} onValueChange={(v) => setAf({ ortam: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="test">Test</SelectItem><SelectItem value="canli">Canlı</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 pb-1"><Switch checked={af.aktif === 1} onCheckedChange={(v) => setAf({ aktif: v ? 1 : 0 })} /><Label>Aktif</Label></div>
            {["genel_url", "efatura_url", "earsiv_url", "eirsaliye_url", "api_kullanici", "api_sifre", "firma_unvan", "vkn", "vergi_dairesi", "adres", "il", "ilce", "eposta", "telefon"].map((f) => (
              <div key={f}><Label className="mb-1.5 block capitalize">{f.replace(/_/g, " ")}</Label><Input type={f === "api_sifre" ? "password" : "text"} autoComplete={f === "api_sifre" ? "new-password" : undefined} value={af[f] || ""} onChange={(e) => setAf({ [f]: e.target.value })} /></div>
            ))}
            <div><Label className="mb-1.5 block">Log Saklama (gün)</Label><Input type="number" value={af.log_saklama_gun ?? 90} onChange={(e) => setAf({ log_saklama_gun: parseInt(e.target.value) || 0 })} /></div>
            <div><Label className="mb-1.5 block">Geçici Eşleşme (gün)</Label><Input type="number" value={af.gecici_eslesme_gun ?? 30} onChange={(e) => setAf({ gecici_eslesme_gun: parseInt(e.target.value) || 0 })} /></div>
          </div>
          <div className="flex items-center gap-3"><Switch checked={(af.alis_fiyat_gecmisine_isle ?? 1) === 1} onCheckedChange={(v) => setAf({ alis_fiyat_gecmisine_isle: v ? 1 : 0 })} /><Label>Alış fiyat geçmişine işle</Label></div>
          <div className="flex justify-end"><Button disabled={ayarKaydet.isPending} onClick={() => ayarKaydet.mutate()}>Kaydet</Button></div>
        </div>
      )}

      {tab === "cari" && (
        <div className="space-y-3">
          <div className="bg-card border rounded-xl p-4 flex flex-wrap gap-2 items-end">
            <div className="w-56"><Label className="mb-1.5 block">Cari</Label><SearchableSelect value={csForm.cari_id} onChange={(v) => setCsForm({ ...csForm, cari_id: v })} options={cariler.map((c) => ({ value: c.id, label: c.company_name }))} placeholder="Cari" /></div>
            <div><Label className="mb-1.5 block">VKN/TCKN</Label><Input value={csForm.vkn} onChange={(e) => setCsForm({ ...csForm, vkn: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Tip</Label>
              <Select value={csForm.tip} onValueChange={(v) => setCsForm({ ...csForm, tip: v })}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="e-Fatura">e-Fatura</SelectItem><SelectItem value="e-İrsaliye">e-İrsaliye</SelectItem></SelectContent></Select>
            </div>
            <div><Label className="mb-1.5 block">Durum</Label><Input value={csForm.durum} onChange={(e) => setCsForm({ ...csForm, durum: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Alıcı Etiketi</Label><Input value={csForm.alici_etiketi} onChange={(e) => setCsForm({ ...csForm, alici_etiketi: e.target.value })} /></div>
            <Button disabled={!csForm.cari_id || csKaydet.isPending} onClick={() => csKaydet.mutate()}>Kaydet</Button>
          </div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm"><thead className="bg-muted/40 border-b"><tr><Th>Cari</Th><Th>VKN/TCKN</Th><Th>Tip</Th><Th>Durum</Th><Th>Etiket</Th><Th>Tarih</Th></tr></thead>
              <tbody>{sorgular.map((s) => <tr key={s.id} className="border-b last:border-0"><Td b>{s.cari_adi}</Td><Td>{s.vkn}</Td><Td>{s.tip}</Td><Td>{s.durum}</Td><Td>{s.alici_etiketi}</Td><Td>{s.tarih}</Td></tr>)}
                {!sorgular.length && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Kayıt yok.</td></tr>}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "gelen" && (
        <div className="space-y-3">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><Label className="mb-1.5 block">Fatura No</Label><Input value={ghead.belge_no} onChange={(e) => setGhead({ ...ghead, belge_no: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Tarih</Label><Input type="date" value={ghead.tarih} onChange={(e) => setGhead({ ...ghead, tarih: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Tedarikçi</Label><SearchableSelect value={ghead.cari_id} onChange={(v) => setGhead({ ...ghead, cari_id: v, cari_adi: cariler.find((c) => c.id === v)?.company_name })} options={cariler.filter((c) => c.is_supplier === 1).map((c) => ({ value: c.id, label: c.company_name }))} placeholder="Tedarikçi" /></div>
              <div><Label className="mb-1.5 block">Hedef Depo *</Label><SearchableSelect value={ghead.depo_id} onChange={(v) => setGhead({ ...ghead, depo_id: v })} options={depolar.map((d) => ({ value: d.id, label: d.ad }))} placeholder="Depo" /></div>
            </div>
            <div>
              <Label className="mb-1.5 block">UBL XML yapıştır (opsiyonel — satırları otomatik çıkarır)</Label>
              <Textarea rows={3} value={xml} onChange={(e) => setXml(e.target.value)} placeholder="<Invoice> ... </Invoice>" />
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => { const l = parseUbl(xml); if (l.length) { setGlines(l); toast.success(`${l.length} satır çıkarıldı`); } else toast.error("Satır bulunamadı — manuel ekleyin"); }}>XML'den Satır Çıkar</Button>
                <Button size="sm" variant="outline" onClick={() => setGlines([...glines, { satici_urun_adi: "", satici_kodu: "", miktar: 1, birim: "ADET", birim_fiyat: 0, eslesen_urun_id: "" }])}><Plus className="w-3.5 h-3.5 mr-1" />Manuel Satır</Button>
              </div>
            </div>
            {glines.length > 0 && (
              <table className="w-full text-xs">
                <thead className="bg-muted/40"><tr><th className="text-left px-2 py-1.5">Satıcı Ürün</th><th className="text-right px-2 py-1.5">Miktar</th><th className="text-right px-2 py-1.5">Fiyat</th><th className="text-left px-2 py-1.5">→ Stok Kartı Eşleştir</th><th></th></tr></thead>
                <tbody>
                  {glines.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1"><Input className="h-8" value={l.satici_urun_adi} onChange={(e) => setGlines(glines.map((x, idx) => idx === i ? { ...x, satici_urun_adi: e.target.value } : x))} /></td>
                      <td className="px-2 py-1"><Input type="number" className="h-8 w-20 text-right" value={l.miktar} onChange={(e) => setGlines(glines.map((x, idx) => idx === i ? { ...x, miktar: parseFloat(e.target.value) || 0 } : x))} /></td>
                      <td className="px-2 py-1"><Input type="number" className="h-8 w-20 text-right" value={l.birim_fiyat} onChange={(e) => setGlines(glines.map((x, idx) => idx === i ? { ...x, birim_fiyat: parseFloat(e.target.value) || 0 } : x))} /></td>
                      <td className="px-2 py-1"><SearchableSelect value={l.eslesen_urun_id} onChange={(v) => setGlines(glines.map((x, idx) => idx === i ? { ...x, eslesen_urun_id: v } : x))} options={urunler.map((u) => ({ value: u.id, label: u.ad }))} placeholder="Ürün seç" /></td>
                      <td className="px-2 py-1 text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setGlines(glines.filter((_, idx) => idx !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex justify-end">
              <Button disabled={!ghead.depo_id || !glines.some((l) => l.eslesen_urun_id) || gelenAktar.isPending} onClick={() => gelenAktar.mutate()}>
                <ArrowDownToLine className="w-4 h-4 mr-1.5" /> Stok Giriş Fişi Oluştur
              </Button>
            </div>
          </div>
        </div>
      )}

      {(tab === "giden" || tab === "irsaliye") && (
        <div className="bg-card border rounded-xl p-4 space-y-3 max-w-xl">
          <p className="text-sm text-muted-foreground">{tab === "giden" ? "Stok çıkış fişinden e-Fatura / e-Arşiv taslağı." : "Stok çıkış / transfer fişinden e-İrsaliye taslağı."}</p>
          <div><Label className="mb-1.5 block">Stok Fişi</Label>
            <SearchableSelect value={tsForm.fis_id} onChange={(v) => setTsForm({ ...tsForm, fis_id: v, tur: tab === "irsaliye" ? "e_irsaliye" : tsForm.tur })}
              options={cikisFisleri.filter((f) => f.durum === "onayli").map((f) => ({ value: f.id, label: `${f.fis_no} · ${f.cari_adi || f.hedef_saha_adi || "—"}` }))} placeholder="Fiş seç" />
          </div>
          {tab === "giden" && (
            <div><Label className="mb-1.5 block">Belge Tipi</Label>
              <Select value={tsForm.tur} onValueChange={(v) => setTsForm({ ...tsForm, tur: v })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="e_fatura">e-Fatura</SelectItem><SelectItem value="e_arsiv">e-Arşiv</SelectItem></SelectContent></Select>
            </div>
          )}
          <Button disabled={!tsForm.fis_id || taslakOlustur.isPending} onClick={() => taslakOlustur.mutate()}>Taslak Oluştur</Button>
        </div>
      )}

      {tab === "arsiv" && (
        <div className="bg-card border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm"><thead className="bg-muted/40 border-b"><tr><Th>Belge No</Th><Th>Yön / Tür</Th><Th>Cari</Th><Th>Tarih</Th><Th>Tutar</Th><Th>Durum</Th><Th>Stok Fiş</Th></tr></thead>
            <tbody>{belgeler.filter((b) => b.is_deleted !== 1).map((b) => <tr key={b.id} className="border-b last:border-0"><Td b>{b.belge_no}</Td><Td>{b.yon} · {b.tur}</Td><Td>{b.cari_adi || "—"}</Td><Td>{b.tarih}</Td><Td>{(b.tutar ?? 0).toFixed(2)}</Td><Td>{b.durum}</Td><Td>{b.stok_fis_no || b.kaynak_fis_no || "—"}</Td></tr>)}
              {!belgeler.length && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">Belge yok.</td></tr>}</tbody>
          </table>
        </div>
      )}

      {tab === "log" && (
        <div className="bg-card border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm"><thead className="bg-muted/40 border-b"><tr><Th>Tarih</Th><Th>İşlem</Th><Th>Durum</Th><Th>Mesaj</Th></tr></thead>
            <tbody>{loglar.map((l) => <tr key={l.id} className="border-b last:border-0"><Td>{(l.tarih || "").slice(0, 19).replace("T", " ")}</Td><Td>{l.islem}</Td><Td><span className={l.durum === "hata" ? "text-red-600" : "text-emerald-600"}>{l.durum}</span></Td><Td>{l.mesaj}</Td></tr>)}
              {!loglar.length && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Log yok.</td></tr>}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
