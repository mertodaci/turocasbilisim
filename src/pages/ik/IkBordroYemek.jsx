import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

const KESINTI = { hic: "Hiç Kesme", yemek: "Yemekten Kes", yol: "Yoldan Kes", her_ikisi: "Her İkisi", maas: "Maaştan Kes" };

export default function IkBordroYemek() {
  const qc = useQueryClient();
  const [subeF, setSubeF] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(new Set());
  const [toplu, setToplu] = useState({ cumartesi_kurali: "calismaz", kesinti_tipi: "yemek", aciklama: "" });

  const { data: kurallar = [], isLoading } = useQuery({ queryKey: ["ik_bordro_yemek_kural"], queryFn: () => flowApi.entities.IkBordroYemekKural.list("personel_adi", 5000) });
  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_full"], queryFn: () => flowApi.entities.Employee.list("full_name", 8000) });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });

  const aktif = useMemo(() => personeller.filter((p) => p.app_role !== "musteri" && p.is_deleted !== 1 && p.status !== "pasif" && !p.exit_date), [personeller]);
  const kuralByP = kurallar.reduce((m, k) => { m[k.personel_id] = k; return m; }, {});
  const subeAdi = (id) => subeler.find((s) => s.id === id)?.ad || "";

  const filtered = aktif.filter((p) => {
    if (subeF && p.sube_id !== subeF) return false;
    if (q && !p.full_name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ik_bordro_yemek_kural"] });
  const uygula = useMutation({
    mutationFn: async () => {
      for (const pid of sel) {
        const emp = aktif.find((p) => p.id === pid);
        const mevcut = kuralByP[pid];
        const data = { personel_id: pid, personel_adi: emp?.full_name || null, ...toplu, aktif: 1 };
        if (mevcut) await flowApi.entities.IkBordroYemekKural.update(mevcut.id, data);
        else await flowApi.entities.IkBordroYemekKural.create(data);
      }
    },
    onSuccess: () => { invalidate(); setSel(new Set()); toast.success(`${sel.size} personele uygulandı`); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });
  const sil = useMutation({
    mutationFn: (id) => flowApi.entities.IkBordroYemekKural.delete(id),
    onSuccess: () => { invalidate(); toast.success("Kural kaldırıldı"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });

  const ozet = kurallar.reduce((m, k) => { m.toplam++; m[k.kesinti_tipi] = (m[k.kesinti_tipi] || 0) + 1; return m; }, { toplam: 0 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><UtensilsCrossed className="w-6 h-6 text-primary" /> Bordro Yemek & Cumartesi Opsiyonları</h1>
        <p className="text-sm text-muted-foreground mt-1">Kişi bazlı cumartesi çalışma kuralı. Cumartesi çalışılmadığında yol/yemek/maaş kesintisi uygulanır (Bordrolama Ayarları'ndaki genel kuralın kişi bazlı override'ı).</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Toplam Kural</p><p className="text-xl font-bold">{ozet.toplam}</p></div>
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Yemekten Kes</p><p className="text-xl font-bold">{ozet.yemek || 0}</p></div>
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Yoldan Kes</p><p className="text-xl font-bold">{ozet.yol || 0}</p></div>
        <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Her İkisi</p><p className="text-xl font-bold">{ozet.her_ikisi || 0}</p></div>
      </div>

      <div className="bg-card border rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div><Label className="mb-1 block text-xs">Cumartesi Kuralı</Label>
          <Select value={toplu.cumartesi_kurali} onValueChange={(v) => setToplu({ ...toplu, cumartesi_kurali: v })}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="calismaz">Cumartesi Çalışmaz</SelectItem><SelectItem value="girisi_varsa_kesme">Girişi Varsa Kesme</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label className="mb-1 block text-xs">Kesinti Tipi</Label>
          <Select value={toplu.kesinti_tipi} onValueChange={(v) => setToplu({ ...toplu, kesinti_tipi: v })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(KESINTI).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="mb-1 block text-xs">Açıklama</Label><Input value={toplu.aciklama} onChange={(e) => setToplu({ ...toplu, aciklama: e.target.value })} /></div>
        <Button size="sm" disabled={uygula.isPending || sel.size === 0} onClick={() => uygula.mutate()}>Seçilenlere Uygula ({sel.size})</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={subeF || "hepsi"} onValueChange={(v) => setSubeF(v === "hepsi" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="max-w-xs" placeholder="Personel ara" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button size="sm" variant="outline" onClick={() => setSel(new Set(filtered.map((p) => p.id)))}>Görünenleri Seç</Button>
        <Button size="sm" variant="outline" onClick={() => setSel(new Set())}>Temizle</Button>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {isLoading ? <div className="h-32 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> : (
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-2.5 w-10"></th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Personel</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Şube</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Cumartesi</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Kesinti</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const k = kuralByP[p.id];
                return (
                  <tr key={p.id} className={`border-b last:border-0 ${sel.has(p.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-2 text-center"><input type="checkbox" checked={sel.has(p.id)} onChange={() => setSel((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} /></td>
                    <td className="px-4 py-2 font-medium">{p.full_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{subeAdi(p.sube_id) || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{k ? (k.cumartesi_kurali === "calismaz" ? "Çalışmaz" : "Girişi Varsa Kesme") : "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{k ? KESINTI[k.kesinti_tipi] : "—"}</td>
                    <td className="px-4 py-2 text-right">{k && <Button variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => sil.mutate(k.id)}>Kaldır</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
