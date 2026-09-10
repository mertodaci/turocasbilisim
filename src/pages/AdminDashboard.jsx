import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import ContractAlerts from "@/components/dashboard/ContractAlerts";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users, Briefcase, Activity, ClipboardList, CheckSquare, ArrowUpRight, Zap, AlertTriangle, TrendingUp, Umbrella, DollarSign, Wallet, Building2, ScrollText, Boxes, PackageX, FileClock, UserX, Clock } from "lucide-react";
import { activityTypes } from "@/lib/activityHelpers";
import { cn } from "@/lib/utils";
import { useTicketStatuses } from "@/lib/jobTrackingLabels";
import { useStokAlerts } from "@/lib/NotificationContext";

const TONES = {
  red:    "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
  rose:   "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900",
  amber:  "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900",
  blue:   "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  violet: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900",
  slate:  "bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
};

const DONEM_DURUM = { taslak: "Taslak", onayli: "Onaylı", kapali: "Kapalı", yok: "Oluşmadı" };

export default function AdminDashboard() {
  const { statusName } = useTicketStatuses();
  const { user } = useAuth();
  const { stokUyari } = useStokAlerts();

  const { data: activities = [] } = useQuery({ queryKey: ["activities-admin"], queryFn: () => flowApi.entities.Activity.list("-created_date", 40) });
  const { data: summary = { openTickets: [], openCount: 0, byStatus: [], dailyTrend: [] } } = useQuery({ queryKey: ["admin-summary"], queryFn: () => fetch("/api/dashboard/admin-summary", { credentials: "include" }).then(r => r.json()), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000 });
  const { data: exec } = useQuery({ queryKey: ["dashboard-executive"], queryFn: () => fetch("/api/dashboard/executive", { credentials: "include" }).then(r => r.json()), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false });
  const { data: ikData } = useQuery({ queryKey: ["ik-dashboard-admin"], queryFn: () => flowApi.ik.dashboard(), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false });
  const { data: announcements = [] } = useQuery({ queryKey: ["announcements-active"], queryFn: () => flowApi.entities.Announcement.filter({ is_active: 1 }) });

  const ik = ikData?.kpi || {};
  const donem = ikData?.bordro_donem || {};
  const sales = exec?.sales || {};
  const contracts = exec?.contracts || {};
  const isTakibi = exec?.is_takibi || {};
  const su = stokUyari || {};

  const activeAnnouncements = announcements.filter(a => {
    const dateOk = (!a.start_date || a.start_date <= format(new Date(), "yyyy-MM-dd")) &&
      (!a.end_date || a.end_date >= format(new Date(), "yyyy-MM-dd"));
    const roles = (a.target_roles || "all").toString();
    const roleOk = roles === "all" || roles.split(",").map(r => r.trim()).includes(user?.role);
    return dateOk && roleOk;
  });

  const openTickets = summary.openTickets || [];
  const recentActivities = [...activities].filter(a => a.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  const aktifSozlesme = (contracts.stats || []).find(s => s.status === "aktif")?.c || 0;
  const yaklasanSozlesme = (contracts.expiring || []).length;
  const donemDurum = DONEM_DURUM[donem.durum] || "—";

  // ── Modül KPI kartları (her modülden bir kart) ──
  const kpis = [
    { label: "Açık Bilet", value: summary.openCount || 0, sub: `${summary.overdueTickets || 0} geciken`, color: "from-teal-500 to-teal-700", icon: ClipboardList, path: "/is-takibi/tickets" },
    { label: "Aktif Proje", value: isTakibi.activeProjects ?? summary.projectCount ?? 0, sub: `${summary.thisMonthOpened || 0} bu ay açılan bilet`, color: "from-purple-500 to-purple-700", icon: Briefcase, path: "/is-takibi" },
    { label: "Aktif Personel", value: ik.aktif_personel ?? exec?.hr?.totalEmployees ?? 0, sub: `${ik.bugun_izinli || 0} bugün izinli`, color: "from-indigo-500 to-indigo-700", icon: Users, path: "/calisanlar" },
    { label: "Bordro Dönemi", value: donem.ay ? `${String(donem.ay).padStart(2, "0")}/${donem.yil}` : "—", sub: `${donemDurum} · ${ik.bekleyen_mesai || 0} bekleyen mesai`, color: "from-slate-500 to-slate-700", icon: Wallet, path: "/ik/bordro" },
    { label: "Toplam Müşteri", value: sales.totalCustomers || 0, sub: `${sales.potentialCustomers || 0} aday müşteri`, color: "from-emerald-500 to-emerald-700", icon: Building2, path: "/musteriler" },
    { label: "Bu Ay Teklif", value: sales.thisMonthOffers?.c || 0, sub: sales.winRate != null ? `%${sales.winRate} kazanma oranı` : "teklif sunumu", color: "from-amber-400 to-orange-500", icon: TrendingUp, path: "/musteriler" },
    { label: "Aktif Sözleşme", value: aktifSozlesme, sub: `${yaklasanSozlesme} yaklaşan bitiş`, color: "from-blue-500 to-blue-700", icon: ScrollText, path: "/sozlesmeler" },
    { label: "Kritik Stok", value: (su.kritik?.length) || 0, sub: `${su.bekleyen_fis || 0} bekleyen fiş`, color: "from-rose-500 to-rose-700", icon: Boxes, path: "/stok" },
  ];

  // ── Dikkat gerektiren uyarı çipleri (modüller arası, yalnız > 0) ──
  const alerts = [
    { n: summary.overdueTickets, label: "geciken bilet", to: "/is-takibi/tickets", icon: AlertTriangle, tone: "red" },
    { n: summary.pendingLeaves, label: "bekleyen izin", to: "/ik-izin-yonetimi", icon: Umbrella, tone: "amber" },
    { n: summary.pendingExpenses, label: "bekleyen harcama", to: "/ik-harcama-yonetimi", icon: DollarSign, tone: "blue" },
    { n: ik.bekleyen_mesai, label: "bekleyen mesai onayı", to: "/ik/mesai", icon: Clock, tone: "violet" },
    { n: ik.tutarsiz_personel, label: "tutarsız personel", to: "/calisanlar?f=bordro", icon: UserX, tone: "orange" },
    { n: ik.eksik_evrakli_izin, label: "eksik izin evrakı", to: "/ik/izin-evrak", icon: FileClock, tone: "amber" },
    { n: su.kritik?.length, label: "kritik stok", to: "/stok", icon: PackageX, tone: "rose" },
    { n: su.skt_gecen?.length, label: "SKT geçen parti", to: "/stok/partiler", icon: AlertTriangle, tone: "rose" },
    { n: su.bekleyen_fis, label: "bekleyen stok fişi", to: "/stok/fisler", icon: ClipboardList, tone: "slate" },
    { n: su.geciken_zimmet, label: "geciken zimmet", to: "/stok/zimmet", icon: Clock, tone: "amber" },
  ].filter(a => (a.n || 0) > 0);

  return (
    <div className="space-y-5">

      {/* SÖZLEŞME UYARILARI */}
      <ContractAlerts />

      {/* BAŞLIK */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Yönetim Merkezi</h1>
        <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Canlı · {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
        </div>
      </div>

      {/* DUYURULAR */}
      {activeAnnouncements.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
          <div className="flex items-center">
            <div className="flex-shrink-0 px-4 py-3 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-l-2xl flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Duyuru
            </div>
            <div className="overflow-hidden flex-1 py-3 px-4">
              <div className="animate-marquee whitespace-nowrap">
                {activeAnnouncements.map((a, i) => (
                  <span key={a.id} className="inline-flex items-center gap-2 mr-12">
                    {a.title && <span className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">{a.title}:</span>}
                    <span className="text-sm text-muted-foreground">{a.content}</span>
                    {i < activeAnnouncements.length - 1 && <span className="text-muted-foreground mx-4">•</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BUGÜN + DİKKAT GEREKTİRENLER — kompakt tek şerit */}
      <div className="flex items-center flex-wrap gap-x-6 gap-y-2 bg-card border border-border/50 rounded-2xl px-5 py-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bugün</span>
        {[
          { label: "açılan bilet", value: summary.todayOpened || 0, color: "text-blue-600" },
          { label: "aktivite", value: summary.todayActivities || 0, color: "text-purple-600" },
          { label: "izinli", value: summary.onLeaveToday || 0, color: "text-amber-600" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={`text-lg font-black ${item.color}`}>{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}

        {alerts.length > 0 && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {alerts.map((a, i) => (
              <Link key={i} to={a.to}
                className={cn("flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 hover:shadow-sm transition-all", TONES[a.tone])}>
                <a.icon className="w-3.5 h-3.5" /> {a.n} {a.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* MODÜL KPI BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map((item, i) => (
          <Link key={i} to={item.path}
            className="rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <div className={`bg-gradient-to-br ${item.color} p-5 text-white`}>
              <div className="flex items-center justify-between mb-3">
                <item.icon size={22} className="opacity-80" />
                <ArrowUpRight size={16} className="opacity-50" />
              </div>
              <div className="text-3xl font-black truncate">{item.value}</div>
              <div className="text-white/80 text-sm mt-1">{item.label}</div>
            </div>
            <div className="bg-card px-4 py-2">
              <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* SON 7 GÜN · BİLET HAREKETİ */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" /> Son 7 Gün · Bilet Hareketi
        </h3>
        {(summary.dailyTrend || []).length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Veri yok</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={(summary.dailyTrend || []).map(d => ({ name: format(new Date(d.d), "EEE", { locale: tr }), acilan: d.opened, kapanan: d.closed }))}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="acilan" fill="#6366f1" radius={[4, 4, 0, 0]} name="Açılan" />
              <Bar dataKey="kapanan" fill="#10b981" radius={[4, 4, 0, 0]} name="Kapanan" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* SON AÇIK BİLETLER + SON AKTİVİTELER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-teal-500" /> Son Açık Biletler
            </h3>
            <Link to="/is-takibi/tickets" className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">Tümü <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {openTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Açık bilet yok</p></div>
          ) : (
            <div className="space-y-2">
              {openTickets.slice(0, 8).map(t => {
                const pc = { kritik: "bg-red-500", yuksek: "bg-orange-500", orta: "bg-amber-400", dusuk: "bg-green-500" }[t.priority] || "bg-gray-400";
                return (
                  <Link key={t.id} to="/is-takibi/tickets" className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", pc)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      {t.customer_name && <p className="text-xs text-muted-foreground truncate">{t.customer_name}</p>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full shrink-0 text-muted-foreground">{statusName(t.status)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" /> Son Aktiviteler
            </h3>
            <Link to="/aktiviteler" className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">Tümü <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Aktivite yok</div>
          ) : (
            <div className="space-y-2">
              {recentActivities.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0"><Activity className="w-4 h-4 text-indigo-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activityTypes[a.activity_type]?.label || a.activity_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.employee_name}{a.customer_name ? ` · ${a.customer_name}` : ""}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{a.date && format(new Date(a.date), "d MMM", { locale: tr })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground pb-2">
        Canlı veri · Her 10 dakikada otomatik yenilenir
      </div>
    </div>
  );
}
