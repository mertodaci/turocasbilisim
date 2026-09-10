import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { ShieldOff, Users as UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

const ROLE_LABELS = {
  admin: "Admin",
  yonetici: "Yönetici",
  ik: "IK",
  kullanici: "Kullanıcı",
  stajer: "Stajer",
  musteri: "Müşteri",
};

// "Su an aktif" gostergesi icin esik: son 10 dakika icinde istek atmissa
// yesil, atmamissa (revoked degil ama bir sure sessiz) gri "son gorulme".
const ACTIVE_THRESHOLD_MS = 10 * 60 * 1000;

export default function SessionManagement() {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions-list"],
    queryFn: () => flowApi.auth.sessions(),
    refetchInterval: 30000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => flowApi.auth.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions-list"] });
      toast.success("Oturum sonlandırıldı");
    },
    onError: () => toast.error("Oturum sonlandırılamadı"),
  });

  const isActive = (lastSeenAt) => Date.now() - new Date(lastSeenAt).getTime() < ACTIVE_THRESHOLD_MS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UsersIcon className="w-6 h-6 text-primary" /> Oturum Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Şu anda sonlandırılmamış oturumlar. Her akşam 21:00'de tüm oturumlar otomatik sonlandırılır.
        </p>
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
                      {s.created_at ? format(new Date(s.created_at), "d MMM HH:mm", { locale: tr }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {s.last_seen_at ? format(new Date(s.last_seen_at), "d MMM HH:mm", { locale: tr }) : "—"}
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
