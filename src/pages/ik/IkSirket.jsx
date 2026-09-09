import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

const empty = { bolum_adi: "", unvan: "", vergi_dairesi: "", vergi_no: "", sgk_sicil: "", mersis: "", adres: "", merkez_adres: "", web: "" };

export default function IkSirket() {
  const qc = useQueryClient();
  const [kapsam, setKapsam] = useState("genel");
  const [form, setForm] = useState(empty);

  const { data: kayitlar = [] } = useQuery({ queryKey: ["ik_sirket_bilgileri"], queryFn: () => flowApi.entities.IkSirket.list("kapsam", 200) });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });

  const mevcut = kayitlar.find((k) => k.kapsam === kapsam);
  useEffect(() => { setForm(mevcut ? { ...empty, ...mevcut } : empty); }, [kapsam, mevcut]);

  const kaydet = useMutation({
    mutationFn: () => mevcut
      ? flowApi.entities.IkSirket.update(mevcut.id, { ...form, kapsam })
      : flowApi.entities.IkSirket.create({ ...form, kapsam }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ik_sirket_bilgileri"] }); toast.success("Kaydedildi"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" /> Şirket Bilgileri</h1>
        <p className="text-sm text-muted-foreground mt-1">Puantaj CSV / bordro çıktı başlığında yer alan ünvan, vergi, SGK sicil ve Mersis bilgileri. Genel varsayılan veya şube bazlı kapsam.</p>
      </div>

      <div className="flex gap-2 items-center">
        <Label className="text-xs">Kapsam</Label>
        <Select value={kapsam} onValueChange={setKapsam}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="genel">Genel Varsayılan / Tüm Şubeler</SelectItem>
            {subeler.map((s) => <SelectItem key={s.id} value={`sube:${s.id}`}>{s.ad}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-2xl p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="mb-1 block text-xs">Bölüm Adı (CSV başlığı)</Label><Input value={form.bolum_adi} onChange={(e) => setForm({ ...form, bolum_adi: e.target.value })} /></div>
          <div><Label className="mb-1 block text-xs">Şirket Ünvanı</Label><Input value={form.unvan} onChange={(e) => setForm({ ...form, unvan: e.target.value })} /></div>
          <div><Label className="mb-1 block text-xs">Vergi Dairesi</Label><Input value={form.vergi_dairesi} onChange={(e) => setForm({ ...form, vergi_dairesi: e.target.value })} /></div>
          <div><Label className="mb-1 block text-xs">Vergi No</Label><Input value={form.vergi_no} onChange={(e) => setForm({ ...form, vergi_no: e.target.value })} /></div>
          <div><Label className="mb-1 block text-xs">SGK Sicil No</Label><Input value={form.sgk_sicil} onChange={(e) => setForm({ ...form, sgk_sicil: e.target.value })} /></div>
          <div><Label className="mb-1 block text-xs">Mersis No</Label><Input value={form.mersis} onChange={(e) => setForm({ ...form, mersis: e.target.value })} /></div>
        </div>
        <div><Label className="mb-1 block text-xs">Adres</Label><Textarea rows={2} value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} /></div>
        <div><Label className="mb-1 block text-xs">Merkez Adres</Label><Textarea rows={2} value={form.merkez_adres} onChange={(e) => setForm({ ...form, merkez_adres: e.target.value })} /></div>
        <div><Label className="mb-1 block text-xs">Web</Label><Input value={form.web} onChange={(e) => setForm({ ...form, web: e.target.value })} /></div>
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={() => kaydet.mutate()} disabled={kaydet.isPending}>Kaydet</Button>
        </div>
      </div>
    </div>
  );
}
