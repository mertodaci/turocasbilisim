import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";

// Yönetim Merkezi/Kullanıcı Paneli/Müşteri Paneli'ndeki duyuru banner'ları
// ortak kullanır — rol + tarih aralığı + şube/bölüm hedeflemesini tek
// yerde uygular. Şube/bölüm hedefli bir duyuru, çalışan kaydı olmayan
// (ör. müşteri) kullanıcılara gösterilmez; hedefsiz ("Tümü") duyurular
// herkese görünür.
export function useActiveAnnouncements() {
  const { user } = useAuth();

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements-active"],
    queryFn: () => flowApi.entities.Announcement.filter({ is_active: 1 }),
  });

  const { data: employee } = useQuery({
    queryKey: ["notif-employee", user?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (d) => d[0],
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  const activeAnnouncements = announcements
    .filter((a) => {
      const dateOk = (!a.start_date || a.start_date <= todayStr) && (!a.end_date || a.end_date >= todayStr);
      const roles = (a.target_roles || "all").toString();
      const roleOk = roles === "all" || roles.split(",").map((r) => r.trim()).includes(user?.role);
      const subeOk = !a.target_sube_id || a.target_sube_id === employee?.sube_id;
      const bolumOk = !a.target_bolum_id || a.target_bolum_id === employee?.bolum_id;
      return dateOk && roleOk && subeOk && bolumOk;
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return { activeAnnouncements };
}
