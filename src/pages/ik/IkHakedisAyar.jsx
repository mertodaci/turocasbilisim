import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, ShieldAlert, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { paraSade as nf } from "@/lib/ikFormat";
const GENEL_ALANLAR = [
  ["ticket_qr_yoksa_kes", "Normal çalışma gününde QR girişi yoksa Ticket kes"],
  ["ticket_e_kes", "E / Gelmedi durumunda Ticket kes"],
  ["ticket_izin_rapor_kes", "İzin, rapor, ücretsiz ve mazerette Ticket kes"],
  ["ticket_rt_kesme", "T / RT resmî tatilde Ticket KESME"],
  ["ticket_cumartesi_yemek_kurali", "Dönüşümlü cumartesi Ticket'ta yemek kuralını izle"],
];

export default function IkHakedisAyar() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [subeF, setSubeF] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(new Set());
  const [toplu, setToplu] = useState({ tur: "yemek", aktif: true, baz_gun: 26, aylik_tutar: 0 });

  const { data, isLoading } = useQuery({ queryKey: ["ik_hakedis_liste"], queryFn: () => flowApi.ik.hakedisListe() });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const { data: vergiAyarlariData } = useQuery({ queryKey: ["ik_vergi_ayarlari"], queryFn: () => flowApi.entities.IkVergiAyar.get(1) });
  const currentYil = new Date().getFullYear();
  const { data: dilimlerData = [] } = useQuery({ queryKey: ["ik_gelir_vergisi_dilimleri", currentYil], queryFn: () => flowApi.entities.IkGelirVergisiDilim.filter({ yil: currentYil }, "sira") });
  const rows = data?.rows || [];
  const genel = data?.genel || {};

  const [genelForm, setGenelForm] = useState(null);
  const g = genelForm || genel;
  const [vergiForm, setVergiForm] = useState(null);
  const va = vergiForm || vergiAyarlariData || {};
  const [yeniDilim, setYeniDilim] = useState({ alt_sinir: "", ust_sinir: "", oran: "" });

  const vergiKaydet = useMutation({
    mutationFn: () => flowApi.entities.IkVergiAyar.update(1, {
      sgk_isci_orani: Number(va.sgk_isci_orani) || 0, issizlik_isci_orani: Number(va.issizlik_isci_orani) || 0,
      sgk_taban: Number(va.sgk_taban) || 0, sgk_tavan: Number(va.sgk_tavan) || 0,
      asgari_ucret_brut: Number(va.asgari_ucret_brut) || 0, damga_vergisi_orani: Number(va.damga_vergisi_orani) || 0,
      dogrulanmis_mi: va.dogrulanmis_mi ? 1 : 0,
      dogrulayan: va.dogrulanmis_mi ? (user?.email || null) : null,
      dogrulama_tarihi: va.dogrulanmis_mi ? new Date().toISOString().slice(0, 10) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ik_vergi_ayarlari"] }); setVergiForm(null); toast.success("Vergi oranları kaydedildi"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });
  const dilimEkle = useMutation({
    mutationFn: () => flowApi.entities.IkGelirVergisiDilim.create({ yil: currentYil, alt_sinir: Number(yeniDilim.alt_sinir) || 0, ust_sinir: yeniDilim.ust_sinir === "" ? null : Number(yeniDilim.ust_sinir), oran: Number(yeniDilim.oran) || 0, sira: dilimlerData.length }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ik_gelir_vergisi_dilimleri"] }); setYeniDilim({ alt_sinir: "", ust_sinir: "", oran: "" }); toast.success("Dilim eklendi"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });
  const dilimSil = useMutation({
    mutationFn: (id) => flowApi.entities.IkGelirVergisiDilim.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ik_gelir_vergisi_dilimleri"] }); toast.success("Dilim silindi"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });

  const subeAdi = (id) => subeler.find((s) => s.id === id)?.ad || "";
  const filtered = useMemo(() => rows.filter((r) => {
    if (subeF && r.sube_id !== subeF) return false;
    if (q && !r.personel_adi.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, subeF, q]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ik_hakedis_liste"] });
  const genelKaydet = useMutation({
    mutationFn: () => flowApi.entities.IkHakedisAyar.update(1, {
      varsayilan_baz_gun: Number(g.varsayilan_baz_gun) || 26,
      cumartesi_tatil: g.cumartesi_tatil === 0 ? 0 : 1,
      ...Object.fromEntries(GENEL_ALANLAR.map(([k]) => [k, g[k] ? 1 : 0])),
    }),
    onSuccess: () => { invalidate(); toast.success("Genel kurallar kaydedildi"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });
  const topluKaydet = useMutation({
    mutationFn: () => flowApi.ik.hakedisToplu({ personel_ids: [...sel], ...toplu }),
    onSuccess: (r) => { invalidate(); setSel(new Set()); toast.success(`${r.guncellenen} personel güncellendi`); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });

  const hucre = (t) => t ? `${t.aktif ? "✓" : "✗"} ${nf(t.aylik_tutar)}₺ / ${t.baz_gun}g` : "—";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="w-6 h-6 text-primary" /> Bordrolama Ayarları (Yol / Yemek / Ticket)</h1>
        <p className="text-sm text-muted-foreground mt-1">Aylık tutar ÷ baz gün = günlük birim. Bordroda günlük birim × hak edilen gün. Devam kodları (E/İ/R/Ü/M/Cumartesi) ve QR yokluğu hak gününü azaltır; maaş değişmez.</p>
      </div>

      <div className="bg-card border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold">Genel Kurallar</p>
        <div className="flex items-center gap-3">
          <Label className="text-xs">Varsayılan Baz Gün</Label>
          <Input type="number" className="w-24" value={g.varsayilan_baz_gun ?? 26} onChange={(e) => setGenelForm({ ...g, varsayilan_baz_gun: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={g.cumartesi_tatil !== 0} onCheckedChange={(v) => setGenelForm({ ...g, cumartesi_tatil: v ? 1 : 0 })} />
          <Label className="text-xs">İşyeri cumartesi çalışmıyor — puantajda kart geçişi yoksa "Cumartesi (CT)", "Gelmedi (E)" değil. (Kişi bazlı istisna: Bordro Yemek &amp; Cumartesi ekranı)</Label>
        </div>
        {GENEL_ALANLAR.map(([k, l]) => (
          <div key={k} className="flex items-center gap-3">
            <Switch checked={!!g[k]} onCheckedChange={(v) => setGenelForm({ ...g, [k]: v ? 1 : 0 })} />
            <Label className="text-xs">{l}</Label>
          </div>
        ))}
        <Button size="sm" onClick={() => genelKaydet.mutate()} disabled={genelKaydet.isPending}>Kuralları Kaydet</Button>
      </div>

      <div className="bg-card border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${va.dogrulanmis_mi ? "text-emerald-600" : "text-red-500"}`} />
          <p className="text-sm font-semibold">SGK / Gelir Vergisi / Damga Vergisi Oranları</p>
        </div>
        {!va.dogrulanmis_mi && (
          <p className="text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5">
            ⚠ Bu oranlar örnek/placeholder değerlerdir. Muhasebecinizle güncel resmi oranları teyit edip aşağıdaki değerleri güncelleyin, sonra "Teyit ettim" kutusunu işaretleyip kaydedin.
          </p>
        )}
        {va.dogrulanmis_mi === 1 && (
          <p className="text-xs text-emerald-600">✓ {va.dogrulayan || "bilinmiyor"} tarafından {va.dogrulama_tarihi} tarihinde teyit edildi.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label className="mb-1.5 block text-xs">SGK Primi (İşçi) %</Label><Input type="number" step="0.01" value={va.sgk_isci_orani ?? 0} onChange={(e) => setVergiForm({ ...va, sgk_isci_orani: e.target.value })} /></div>
          <div><Label className="mb-1.5 block text-xs">İşsizlik Sigortası (İşçi) %</Label><Input type="number" step="0.01" value={va.issizlik_isci_orani ?? 0} onChange={(e) => setVergiForm({ ...va, issizlik_isci_orani: e.target.value })} /></div>
          <div><Label className="mb-1.5 block text-xs">Damga Vergisi %</Label><Input type="number" step="0.001" value={va.damga_vergisi_orani ?? 0} onChange={(e) => setVergiForm({ ...va, damga_vergisi_orani: e.target.value })} /></div>
          <div><Label className="mb-1.5 block text-xs">SGK Taban (₺)</Label><Input type="number" value={va.sgk_taban ?? 0} onChange={(e) => setVergiForm({ ...va, sgk_taban: e.target.value })} /></div>
          <div><Label className="mb-1.5 block text-xs">SGK Tavan (₺)</Label><Input type="number" value={va.sgk_tavan ?? 0} onChange={(e) => setVergiForm({ ...va, sgk_tavan: e.target.value })} /></div>
          <div><Label className="mb-1.5 block text-xs">Asgari Ücret (Brüt, ₺)</Label><Input type="number" value={va.asgari_ucret_brut ?? 0} onChange={(e) => setVergiForm({ ...va, asgari_ucret_brut: e.target.value })} /></div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={!!va.dogrulanmis_mi} onCheckedChange={(v) => setVergiForm({ ...va, dogrulanmis_mi: v ? 1 : 0 })} />
          <Label className="text-xs">Bu oranları muhasebeci/yetkili olarak teyit ettim, gerçek bordro hesabında kullanılabilir.</Label>
        </div>

        <p className="text-sm font-semibold pt-2 border-t">Gelir Vergisi Dilimleri ({currentYil})</p>
        <table className="w-full text-sm max-w-xl">
          <thead><tr className="text-xs text-muted-foreground"><th className="text-left py-1">Alt Sınır</th><th className="text-left py-1">Üst Sınır</th><th className="text-left py-1">Oran %</th><th></th></tr></thead>
          <tbody>
            {dilimlerData.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="py-1">{nf(d.alt_sinir)}</td>
                <td className="py-1">{d.ust_sinir == null ? "∞" : nf(d.ust_sinir)}</td>
                <td className="py-1">%{d.oran}</td>
                <td className="py-1 text-right"><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => dilimSil.mutate(d.id)}><Trash2 className="w-3 h-3" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-2 items-end">
          <div><Label className="mb-1 block text-[11px]">Alt Sınır</Label><Input type="number" className="w-28" value={yeniDilim.alt_sinir} onChange={(e) => setYeniDilim({ ...yeniDilim, alt_sinir: e.target.value })} /></div>
          <div><Label className="mb-1 block text-[11px]">Üst Sınır (boş=sonsuz)</Label><Input type="number" className="w-28" value={yeniDilim.ust_sinir} onChange={(e) => setYeniDilim({ ...yeniDilim, ust_sinir: e.target.value })} /></div>
          <div><Label className="mb-1 block text-[11px]">Oran %</Label><Input type="number" className="w-20" value={yeniDilim.oran} onChange={(e) => setYeniDilim({ ...yeniDilim, oran: e.target.value })} /></div>
          <Button size="sm" variant="outline" disabled={dilimEkle.isPending || yeniDilim.alt_sinir === "" || yeniDilim.oran === ""} onClick={() => dilimEkle.mutate()}><Plus className="w-3.5 h-3.5 mr-1" /> Dilim Ekle</Button>
        </div>
        <Button size="sm" onClick={() => vergiKaydet.mutate()} disabled={vergiKaydet.isPending}>Vergi Oranlarını Kaydet</Button>
      </div>

      <div className="bg-card border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold">Seçili Personele Toplu Tanım</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div><Label className="mb-1 block text-xs">Tür</Label>
            <Select value={toplu.tur} onValueChange={(v) => setToplu({ ...toplu, tur: v })}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="yol">Yol</SelectItem><SelectItem value="yemek">Yemek</SelectItem><SelectItem value="ticket">Ticket</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-1"><Switch checked={toplu.aktif} onCheckedChange={(v) => setToplu({ ...toplu, aktif: v })} /><Label className="text-xs">Aktif</Label></div>
          <div><Label className="mb-1 block text-xs">Baz Gün</Label><Input type="number" className="w-24" value={toplu.baz_gun} onChange={(e) => setToplu({ ...toplu, baz_gun: e.target.value })} /></div>
          <div><Label className="mb-1 block text-xs">Aylık Tutar (₺)</Label><Input type="number" className="w-32" value={toplu.aylik_tutar} onChange={(e) => setToplu({ ...toplu, aylik_tutar: e.target.value })} /></div>
          <p className="text-xs text-muted-foreground pb-2">Günlük: {toplu.baz_gun > 0 ? nf((Number(toplu.aylik_tutar) || 0) / Number(toplu.baz_gun)) : "0,00"} ₺</p>
          <Button size="sm" disabled={topluKaydet.isPending || sel.size === 0} onClick={() => topluKaydet.mutate()}>Uygula ({sel.size})</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={subeF || "hepsi"} onValueChange={(v) => setSubeF(v === "hepsi" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="max-w-xs" placeholder="Personel ara" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button size="sm" variant="outline" onClick={() => setSel(new Set(filtered.map((r) => r.personel_id)))}>Görünenleri Seç</Button>
        <Button size="sm" variant="outline" onClick={() => setSel(new Set())}>Temizle</Button>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {isLoading ? <div className="h-32 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> : (
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-2.5 w-10"></th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Personel</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Şube</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Yol</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Yemek</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.personel_id} className={`border-b last:border-0 ${sel.has(r.personel_id) ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-2 text-center"><input type="checkbox" checked={sel.has(r.personel_id)} onChange={() => setSel((s) => { const n = new Set(s); n.has(r.personel_id) ? n.delete(r.personel_id) : n.add(r.personel_id); return n; })} /></td>
                  <td className="px-4 py-2 font-medium">{r.personel_adi}</td>
                  <td className="px-4 py-2 text-muted-foreground">{subeAdi(r.sube_id) || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{hucre(r.yol)}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{hucre(r.yemek)}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{hucre(r.ticket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
