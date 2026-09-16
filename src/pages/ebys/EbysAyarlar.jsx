import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const empty = {
  kep_kullanici_adi: "", kep_api_anahtari: "", kep_aktif: 0,
  eimza_saglayici: "", eimza_api_anahtari: "", eimza_aktif: 0,
};

export default function EbysAyarlar() {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  const { data: kayitlar = [] } = useQuery({ queryKey: ["ebys_ayarlari"], queryFn: () => flowApi.entities.EbysAyarlar.list("id", 5) });
  const mevcut = kayitlar[0];
  useEffect(() => { setForm(mevcut ? { ...empty, ...mevcut } : empty); }, [mevcut]);

  const kaydet = useMutation({
    mutationFn: () => mevcut
      ? flowApi.entities.EbysAyarlar.update(mevcut.id, form)
      : flowApi.entities.EbysAyarlar.create({ ...form, id: "varsayilan" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ebys_ayarlari"] }); toast.success("Kaydedildi"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <p className="text-sm text-muted-foreground">
        KEP (Kayıtlı Elektronik Posta) ve elektronik imza altyapısı hazırlık ayarları.
        Gerçek bir sağlayıcı bağlantısı henüz kurulmadı — bilgiler girildiğinde evrak
        kayıtlarındaki durum rozetleri buna göre güncellenecek.
      </p>

      <div className="bg-card border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">KEP (PTT)</h3>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Aktif</Label>
            <Switch checked={!!form.kep_aktif} onCheckedChange={(v) => setForm({ ...form, kep_aktif: v ? 1 : 0 })} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="mb-1 block text-xs">KEP Kullanıcı Adı</Label><Input value={form.kep_kullanici_adi || ""} onChange={(e) => setForm({ ...form, kep_kullanici_adi: e.target.value })} /></div>
          <div><Label className="mb-1 block text-xs">KEP API Anahtarı</Label><Input type="password" value={form.kep_api_anahtari || ""} onChange={(e) => setForm({ ...form, kep_api_anahtari: e.target.value })} /></div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Elektronik İmza</h3>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Aktif</Label>
            <Switch checked={!!form.eimza_aktif} onCheckedChange={(v) => setForm({ ...form, eimza_aktif: v ? 1 : 0 })} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="mb-1 block text-xs">E-İmza Sağlayıcı</Label><Input value={form.eimza_saglayici || ""} onChange={(e) => setForm({ ...form, eimza_saglayici: e.target.value })} /></div>
          <div><Label className="mb-1 block text-xs">E-İmza API Anahtarı</Label><Input type="password" value={form.eimza_api_anahtari || ""} onChange={(e) => setForm({ ...form, eimza_api_anahtari: e.target.value })} /></div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => kaydet.mutate()} disabled={kaydet.isPending}>Kaydet</Button>
      </div>
    </div>
  );
}
