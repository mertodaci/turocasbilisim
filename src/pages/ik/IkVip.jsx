import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";
import { toast } from "sonner";

export default function IkVip() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [sube, setSube] = useState("");
  const [sadeceVip, setSadeceVip] = useState(false);

  const { data: personeller = [], isLoading } = useQuery({
    queryKey: ["ik_personel_vip"],
    queryFn: () => flowApi.entities.Employee.list("full_name", 5000),
  });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const subeById = useMemo(() => Object.fromEntries(subeler.map((s) => [s.id, s])), [subeler]);

  const toggleM = useMutation({
    mutationFn: ({ id, vip }) => flowApi.entities.Employee.update(id, { vip_mi: vip ? 1 : 0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ik_personel_vip"] }); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });

  const aktif = personeller.filter((p) => (p.status || "aktif") !== "pasif");
  const filtered = aktif.filter((p) =>
    (!q || (p.full_name || "").toLowerCase().includes(q.toLowerCase())) &&
    (!sube || p.sube_id === sube) &&
    (!sadeceVip || p.vip_mi === 1 || p.vip_mi === true));
  const vipSayisi = aktif.filter((p) => p.vip_mi === 1 || p.vip_mi === true).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="w-6 h-6 text-primary" /> VIP Personeller</h1>
        <p className="text-sm text-muted-foreground mt-1">QR/puantaj muaf personel. VIP işaretli personel puantajda "Yönetici" kayıt tipiyle tam gün (N) sayılır; giriş/çıkış saati beklenmez.</p>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Input className="max-w-xs" placeholder="Personel ara" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={sube || "hepsi"} onValueChange={(v) => setSube(v === "hepsi" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent><SelectItem value="hepsi">Tüm şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm"><Switch checked={sadeceVip} onCheckedChange={setSadeceVip} /> Sadece VIP</label>
        <span className="text-sm text-muted-foreground ml-auto">Aktif VIP: <b className="text-foreground">{vipSayisi}</b></span>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? <div className="h-40 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> :
          filtered.length === 0 ? <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2"><Star className="w-8 h-8 opacity-40" /><p>Personel yok.</p></div> : (
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Personel</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Şube</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Görev</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">VIP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{p.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{subeById[p.sube_id]?.ad || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.position || p.title || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Switch checked={p.vip_mi === 1 || p.vip_mi === true} onCheckedChange={(v) => toggleM.mutate({ id: p.id, vip: v })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
