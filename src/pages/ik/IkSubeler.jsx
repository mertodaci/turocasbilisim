import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, MapPin, Check, X } from "lucide-react";
import { formatTrPhone } from "@/lib/utils";
import { toast } from "sonner";

const empty = {
  ad: "", adres: "", ip_araligi: "", gps_enlem: "", gps_boylam: "", sapma_metre: 0,
  telefon: "", yetkili: "", sira: 0, aktif: 1,
};

export default function IkSubeler() {
  const queryClient = useQueryClient();
  // Diger Genel Tanimlar sekmeleriyle (ör. Izin Turleri) ayni standart:
  // pop-up dialog yerine, duzenlenirken/eklenirken form listenin ustunde
  // gomulu acilir (#1049).
  const [formOpen, setFormOpen] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [initialForm, setInitialForm] = useState(empty);
  const [q, setQ] = useState("");

  const { data: subeler = [], isLoading } = useQuery({
    queryKey: ["ik_subeler"],
    queryFn: () => flowApi.entities.IkSube.list("sira", 2000),
  });
  const { data: personeller = [] } = useQuery({
    queryKey: ["ik_personel_min"],
    queryFn: () => flowApi.entities.Employee.list("full_name", 5000),
  });

  const sayimBySube = personeller.reduce((m, p) => {
    if (p.sube_id) m[p.sube_id] = (m[p.sube_id] || 0) + 1;
    return m;
  }, {});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ik_subeler"] });
  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.IkSube.create(data),
    onSuccess: () => { invalidate(); setFormOpen({ open: false, item: null }); toast.success("Şube eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.IkSube.update(id, data),
    onSuccess: () => { invalidate(); setFormOpen({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.IkSube.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const openCreate = () => { setForm(empty); setInitialForm(empty); setFormOpen({ open: true, item: null }); };
  const openEdit = (s) => {
    const f = {
      ad: s.ad || "", adres: s.adres || "", ip_araligi: s.ip_araligi || "",
      gps_enlem: s.gps_enlem ?? "", gps_boylam: s.gps_boylam ?? "", sapma_metre: s.sapma_metre ?? 0,
      telefon: s.telefon || "", yetkili: s.yetkili || "", sira: s.sira ?? 0, aktif: s.aktif ?? 1,
    };
    setForm(f); setInitialForm(f);
    setFormOpen({ open: true, item: s });
  };
  // Formda girilmis veri varsa sessizce kapatmak yerine onay sorar; veri
  // yoksa (veya edit'te hicbir sey degistirilmediyse) direkt kapanir (#1028).
  const closeForm = () => {
    const degisti = JSON.stringify(form) !== JSON.stringify(initialForm);
    if (degisti && !confirm("Kaydedilmemiş değişiklikler var. Kapatılsın mı?")) return;
    setFormOpen({ open: false, item: null });
  };
  const handleSubmit = () => {
    if (!form.ad.trim()) { toast.error("Şube adı zorunlu"); return; }
    const data = {
      ...form,
      gps_enlem: form.gps_enlem === "" ? null : Number(form.gps_enlem),
      gps_boylam: form.gps_boylam === "" ? null : Number(form.gps_boylam),
      sapma_metre: Number(form.sapma_metre) || 0,
      sira: Number(form.sira) || 0,
    };
    if (formOpen.item) updateMutation.mutate({ id: formOpen.item.id, data });
    else createMutation.mutate(data);
  };

  const filtered = subeler.filter((s) => !q || `${s.ad} ${s.yetkili} ${s.telefon} ${s.adres}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Input className="max-w-xs" placeholder="Ad / yetkili / adres ara" value={q} onChange={(e) => setQ(e.target.value)} />
        {!formOpen.open && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Şube</Button>}
      </div>

      {formOpen.open && (
        <div className="bg-muted/40 border border-border/50 rounded-xl px-4 py-4 space-y-4">
          <p className="text-sm font-semibold">{formOpen.item ? "Şube Düzenle" : "Yeni Şube / Lokasyon"}</p>
          <div>
            <Label className="mb-1.5 block">Şube Adı *</Label>
            <Input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block">Adres</Label>
            <Textarea rows={2} value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Yetkili</Label>
              <Input value={form.yetkili} onChange={(e) => setForm({ ...form, yetkili: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Telefon</Label>
              <Input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: formatTrPhone(e.target.value) })} placeholder="0(5xx) xxx xx xx" />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">IP Aralığı (QR geofence)</Label>
            <Input value={form.ip_araligi} onChange={(e) => setForm({ ...form, ip_araligi: e.target.value })} placeholder="örn: 88.240.10.0/24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="mb-1.5 block">GPS Enlem</Label>
              <Input type="number" step="any" value={form.gps_enlem} onChange={(e) => setForm({ ...form, gps_enlem: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">GPS Boylam</Label>
              <Input type="number" step="any" value={form.gps_boylam} onChange={(e) => setForm({ ...form, gps_boylam: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Sapma (metre)</Label>
              <Input type="number" value={form.sapma_metre} onChange={(e) => setForm({ ...form, sapma_metre: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Sıra</Label>
              <Input type="number" value={form.sira} onChange={(e) => setForm({ ...form, sira: e.target.value })} />
            </div>
            <div className="flex items-end gap-3 pb-1">
              <Switch checked={form.aktif === 1} onCheckedChange={(v) => setForm({ ...form, aktif: v ? 1 : 0 })} />
              <Label>Aktif</Label>
            </div>
          </div>
          <div className="flex items-end justify-end gap-2 pt-2">
            <Button type="button" size="sm" variant="ghost" onClick={closeForm}>
              <X className="w-3.5 h-3.5 mr-1" /> İptal
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              <Check className="w-3.5 h-3.5 mr-1" /> {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <MapPin className="w-8 h-8 opacity-40" /><p>Şube yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Şube</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Güvenlik (IP / GPS)</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Personel</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.ad}</p>
                    {s.adres && <p className="text-xs text-muted-foreground truncate max-w-xs">{s.adres}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <p>{s.ip_araligi ? `IP: ${s.ip_araligi}` : "IP girilmemiş"}</p>
                    <p>{s.gps_enlem != null && s.gps_boylam != null ? `GPS: ${s.gps_enlem}, ${s.gps_boylam} (±${s.sapma_metre || 0} m)` : "GPS eksik"}</p>
                  </td>
                  <td className="px-4 py-3 text-right">{sayimBySube[s.id] || 0}</td>
                  <td className="px-4 py-3">
                    <Switch checked={s.aktif === 1 || s.aktif === true}
                      onCheckedChange={(v) => updateMutation.mutate({ id: s.id, data: { aktif: v ? 1 : 0 } })} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Şube silinsin mi? (bağlı personel varsa önce taşıyın)")) deleteMutation.mutate(s.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
