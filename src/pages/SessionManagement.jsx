import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShieldOff, Users as UsersIcon, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

const GUN_ETIKET = { 1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cmt", 7: "Paz" };
const emptySettings = {
  idle_timeout_dakika: 60,
  calisma_saatleri_aktif: 0,
  calisma_baslangic: "08:00",
  calisma_bitis: "19:00",
  calisma_gunleri: "1,2,3,4,5",
};

const ROLE_LABELS = {
  admin: "Admin",
  yonetici: "Yönetici",
  ik: "IK",
  kullanici: "Kullanıcı",
  stajer: "Stajer",
  musteri: "Müşteri",
  guvenlik: "Güvenlik",
};

// "Su an aktif" gostergesi icin esik: son 10 dakika icinde istek atmissa
// yesil, atmamissa (revoked degil ama bir sure sessiz) gri "son gorulme".
const ACTIVE_THRESHOLD_MS = 10 * 60 * 1000;

export default function SessionManagement() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptySettings);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions-list"],
    queryFn: () => flowApi.auth.sessions(),
    refetchInterval: 30000,
  });

  const { data: ayarlarListe = [] } = useQuery({
    queryKey: ["guvenlik_ayarlari"],
    queryFn: () => flowApi.entities.GuvenlikAyarlari.list("id", 5),
  });
  const ayarlar = ayarlarListe[0];
  useEffect(() => { if (ayarlar) setForm({ ...emptySettings, ...ayarlar }); }, [ayarlar]);

  const revokeMutation = useMutation({
    mutationFn: (id) => flowApi.auth.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions-list"] });
      toast.success("Oturum sonlandırıldı");
    },
    onError: () => toast.error("Oturum sonlandırılamadı"),
  });

  const kaydetAyarlar = useMutation({
    mutationFn: () => {
      const payload = {
        idle_timeout_dakika: Number(form.idle_timeout_dakika) || 60,
        calisma_saatleri_aktif: form.calisma_saatleri_aktif ? 1 : 0,
        calisma_baslangic: form.calisma_baslangic,
        calisma_bitis: form.calisma_bitis,
        calisma_gunleri: form.calisma_gunleri,
      };
      return ayarlar
        ? flowApi.entities.GuvenlikAyarlari.update(ayarlar.id, payload)
        : flowApi.entities.GuvenlikAyarlari.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guvenlik_ayarlari"] });
      toast.success("Güvenlik ayarları kaydedildi");
    },
    onError: (e) => toast.error(String(e?.message || "Kaydedilemedi")),
  });

  const gunToggle = (gun) => {
    const mevcut = String(form.calisma_gunleri || "").split(",").map((s) => s.trim()).filter(Boolean);
    const varMi = mevcut.includes(String(gun));
    const yeni = varMi ? mevcut.filter((g) => g !== String(gun)) : [...mevcut, String(gun)];
    yeni.sort((a, b) => Number(a) - Number(b));
    setForm((f) => ({ ...f, calisma_gunleri: yeni.join(",") }));
  };

  // Backend datetime('now') UTC yazıyor ama "Z" son eki olmadan dönüyor —
  // new Date(...) bunu yerel saat sanıp yanlış yorumluyor (AuditLog.jsx'teki
  // aynı düzeltme). Saat kıyaslaması/gösterimi buradan geçmeli.
  const toLocalDate = (dbTime) => dbTime ? new Date(dbTime.includes("Z") ? dbTime : dbTime + "Z") : null;
  const isActive = (lastSeenAt) => Date.now() - (toLocalDate(lastSeenAt)?.getTime() || 0) < ACTIVE_THRESHOLD_MS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UsersIcon className="w-6 h-6 text-primary" /> Oturum Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Şu anda sonlandırılmamış oturumlar. Her akşam 21:00'de tüm oturumlar otomatik sonlandırılır;
          hareketsizlik süresi aşıldığında sunucu oturumu ayrıca kendisi sonlandırır.
        </p>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Güvenlik Ayarları
        </h2>

        <div className="flex items-center gap-3">
          <Label className="text-sm w-56 shrink-0">Hareketsizlik Süresi (dakika)</Label>
          <Input
            type="number"
            min={1}
            className="w-32"
            value={form.idle_timeout_dakika}
            onChange={(e) => setForm((f) => ({ ...f, idle_timeout_dakika: e.target.value }))}
          />
          <span className="text-xs text-muted-foreground">Bu süre boyunca hiç işlem yapılmazsa oturum otomatik kapanır.</span>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm w-56 shrink-0">Çalışma Saatleri Kısıtı</Label>
          <Switch
            checked={form.calisma_saatleri_aktif == 1}
            onCheckedChange={(v) => setForm((f) => ({ ...f, calisma_saatleri_aktif: v ? 1 : 0 }))}
          />
          <span className="text-xs text-muted-foreground">Açıksa, belirlenen saat/gün aralığı dışında sisteme girilemez (admin muaf).</span>
        </div>

        {form.calisma_saatleri_aktif == 1 && (
          <div className="pl-0 sm:pl-[15.5rem] space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-xs w-20">Başlangıç</Label>
              <Input type="time" className="w-32" value={form.calisma_baslangic} onChange={(e) => setForm((f) => ({ ...f, calisma_baslangic: e.target.value }))} />
              <Label className="text-xs w-14 text-center">Bitiş</Label>
              <Input type="time" className="w-32" value={form.calisma_bitis} onChange={(e) => setForm((f) => ({ ...f, calisma_bitis: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(GUN_ETIKET).map(([gun, etiket]) => {
                const secili = String(form.calisma_gunleri || "").split(",").map((s) => s.trim()).includes(gun);
                return (
                  <button
                    key={gun}
                    type="button"
                    onClick={() => gunToggle(gun)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      secili ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {etiket}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <Button size="sm" disabled={kaydetAyarlar.isPending} onClick={() => kaydetAyarlar.mutate()}>
            Kaydet
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Kullanıcı</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">IP</th>
                <th className="px-4 py-3 font-semibold">Giriş</th>
                <th className="px-4 py-3 font-semibold">Son Görülme</th>
                <th className="px-4 py-3 font-semibold text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Yükleniyor...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aktif oturum yok.</td></tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="border-t border-border/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isActive(s.last_seen_at) ? "bg-green-500" : "bg-slate-300"}`} title={isActive(s.last_seen_at) ? "Aktif" : "Sessiz"} />
                        <div>
                          <p className="font-medium">{s.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ROLE_LABELS[s.role] || s.role}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.ip || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {s.created_at ? format(toLocalDate(s.created_at), "d MMM HH:mm", { locale: tr }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {s.last_seen_at ? format(toLocalDate(s.last_seen_at), "d MMM HH:mm", { locale: tr }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(s.id)}
                      >
                        <ShieldOff className="w-3.5 h-3.5" /> Oturumu Sonlandır
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
