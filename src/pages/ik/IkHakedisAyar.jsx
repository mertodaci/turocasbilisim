import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench } from "lucide-react";
import { toast } from "sonner";

const nf = (v) => (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const GENEL_ALANLAR = [
  ["ticket_qr_yoksa_kes", "Normal çalışma gününde QR girişi yoksa Ticket kes"],
  ["ticket_e_kes", "E / Gelmedi durumunda Ticket kes"],
  ["ticket_izin_rapor_kes", "İzin, rapor, ücretsiz ve mazerette Ticket kes"],
  ["ticket_rt_kesme", "T / RT resmî tatilde Ticket KESME"],
  ["ticket_cumartesi_yemek_kurali", "Dönüşümlü cumartesi Ticket'ta yemek kuralını izle"],
];

export default function IkHakedisAyar() {
  const qc = useQueryClient();
  const [subeF, setSubeF] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(new Set());
  const [toplu, setToplu] = useState({ tur: "yemek", aktif: true, baz_gun: 26, aylik_tutar: 0 });

  const { data, isLoading } = useQuery({ queryKey: ["ik_hakedis_liste"], queryFn: () => flowApi.ik.hakedisListe() });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const rows = data?.rows || [];
  const genel = data?.genel || {};

  const [genelForm, setGenelForm] = useState(null);
  const g = genelForm || genel;

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
        <p className="text-sm font-semibold">Genel Ticket Kesinti Kuralları</p>
        <div className="flex items-center gap-3">
          <Label className="text-xs">Varsayılan Baz Gün</Label>
          <Input type="number" className="w-24" value={g.varsayilan_baz_gun ?? 26} onChange={(e) => setGenelForm({ ...g, varsayilan_baz_gun: e.target.value })} />
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
