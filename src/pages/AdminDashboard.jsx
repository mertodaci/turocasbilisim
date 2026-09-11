import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import ContractAlerts from "@/components/dashboard/ContractAlerts";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Users, Briefcase, ClipboardList, CheckSquare, ArrowUpRight, AlertTriangle, TrendingUp, Umbrella, DollarSign, Wallet, Building2, ScrollText, Boxes, PackageX, FileClock, UserX, Clock, Megaphone, Cake, Warehouse, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTicketStatuses } from "@/lib/jobTrackingLabels";
import { useStokAlerts } from "@/lib/NotificationContext";
import { kisa } from "@/lib/hakedisUtils";

const TONES = {
  red:    "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
  rose:   "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900",
  amber:  "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900",
  blue:   "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  violet: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900",
  slate:  "bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
  sky:    "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900",
  indigo: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900",
  cyan:   "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900",
  teal:   "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-900",
  purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900",
};

const DONEM_DURUM = { taslak: "Taslak", onayli: "Onaylı", kapali: "Kapalı", yok: "Oluşmadı" };

export default function AdminDashboard() {
  const { statusName } = useTicketStatuses();
  const { user } = useAuth();
  const { stokUyari } = useStokAlerts();

  const { data: summary = { openTickets: [], openCount: 0, byStatus: [], dailyTrend: [] } } = useQuery({ queryKey: ["admin-summary"], queryFn: () => fetch("/api/dashboard/admin-summary", { credentials: "include" }).then(r => r.json()), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000 });
  const { data: exec } = useQuery({ queryKey: ["dashboard-executive"], queryFn: () => fetch("/api/dashboard/executive", { credentials: "include" }).then(r => r.json()), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false });
  const { data: ikData } = useQuery({ queryKey: ["ik-dashboard-admin"], queryFn: () => flowApi.ik.dashboard(), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false });
  const { data: announcements = [] } = useQuery({ queryKey: ["announcements-active"], queryFn: () => flowApi.entities.Announcement.filter({ is_active: 1 }) });
  const { data: stokDeger } = useQuery({ queryKey: ["stok-degerleme-admin"], queryFn: () => flowApi.stok.rapor("degerleme"), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false });
  const { data: stokPanel } = useQuery({ queryKey: ["stok-dashboard-admin"], queryFn: () => flowApi.stok.dashboard(), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false });

  const ik = ikData?.kpi || {};
  const donem = ikData?.bordro_donem || {};
  const dogumGunu = ikData?.dogum_gunu || [];
  const hr = exec?.hr || {};
  const izinliList = hr.onLeaveTodayList || [];
  const sales = exec?.sales || {};
  const contracts = exec?.contracts || {};
  const isTakibi = exec?.is_takibi || {};
  const su = stokUyari || {};

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const firstName = user?.full_name?.split(" ")[0] || "";
  const dayName = format(new Date(), "EEEE", { locale: tr });
  const dateStr = format(new Date(), "d MMMM yyyy", { locale: tr });

  const activeAnnouncements = announcements.filter(a => {
    const dateOk = (!a.start_date || a.start_date <= format(new Date(), "yyyy-MM-dd")) &&
      (!a.end_date || a.end_date >= format(new Date(), "yyyy-MM-dd"));
    const roles = (a.target_roles || "all").toString();
    const roleOk = roles === "all" || roles.split(",").map(r => r.trim()).includes(user?.role);
    return dateOk && roleOk;
  });

  const openTickets = summary.openTickets || [];
  const expiring = contracts.expiring || [];

  const aktifSozlesme = (contracts.stats || []).find(s => s.status === "aktif")?.c || 0;
  const donemDurum = DONEM_DURUM[donem.durum] || "—";
  const stokUrunSayisi = new Set((stokDeger?.rows || []).map(r => r.urun_id)).size;
  const stokBugunGiris = stokPanel?.bugun_giris?.n || 0;
  const stokBugunCikis = stokPanel?.bugun_cikis?.n || 0;

  // ── Hero KPI'lar — en çarpıcı 2 ₺ metriği, büyük gösterilir ──
  const heroKpis = [
    { label: "Sözleşme Değeri", value: `${kisa(contracts.valueActive || 0)} ₺`, sub: "aktif sözleşme toplamı", color: "from-emerald-500 to-emerald-700", icon: DollarSign, path: "/sozlesmeler" },
    { label: "Stok Değeri", value: `${kisa(stokDeger?.toplam_deger || 0)} ₺`, sub: `${stokUrunSayisi} ürün`, color: "from-amber-500 to-amber-700", icon: Warehouse, path: "/stok/raporlar" },
  ];

  // ── Secondary KPI'lar — küçük/sade kartlar, İş Takibi bilinçli olarak son 2'de ──
  const kpis = [
    { label: "Aktif Sözleşme", value: aktifSozlesme, sub: `${expiring.length} yaklaşan bitiş`, tone: "blue", icon: ScrollText, path: "/sozlesmeler" },
    { label: "Toplam Müşteri", value: sales.totalCustomers || 0, sub: `${sales.potentialCustomers || 0} aday müşteri`, tone: "sky", icon: Building2, path: "/musteriler" },
    { label: "Aktif Personel", value: ik.aktif_personel ?? hr.totalEmployees ?? 0, sub: `${ik.bugun_izinli || 0} bugün izinli`, tone: "indigo", icon: Users, path: "/calisanlar" },
    { label: "Bordro Dönemi", value: donem.ay ? `${String(donem.ay).padStart(2, "0")}/${donem.yil}` : "—", sub: `${donemDurum} · ${ik.bekleyen_mesai || 0} bekleyen mesai`, tone: "slate", icon: Wallet, path: "/ik/bordro" },
    { label: "Kritik Stok", value: (su.kritik?.length) || 0, sub: `${su.bekleyen_fis || 0} bekleyen fiş`, tone: "rose", icon: Boxes, path: "/stok" },
    { label: "Bugünkü Stok Hareketi", value: stokBugunGiris + stokBugunCikis, sub: `${stokBugunGiris} giriş · ${stokBugunCikis} çıkış`, tone: "cyan", icon: ArrowLeftRight, path: "/stok/fisler" },
    { label: "Açık Bilet", value: summary.openCount || 0, sub: `${summary.overdueTickets || 0} geciken`, tone: "teal", icon: ClipboardList, path: "/is-takibi/tickets" },
    { label: "Aktif Proje", value: isTakibi.activeProjects ?? summary.projectCount ?? 0, sub: `${summary.thisMonthOpened || 0} bu ay açılan bilet`, tone: "purple", icon: Briefcase, path: "/is-takibi" },
  ];

  // ── Son Aktiviteler — bilet + stok hareketi karışık, tarihe göre sıralı ──
  const aktiviteler = [
    ...openTickets.slice(0, 6).map(t => ({
      key: `t-${t.id}`, tarih: t.created_date, title: t.title, sub: t.customer_name || "—",
      badge: statusName(t.status),
      tone: { kritik: "red", yuksek: "orange", orta: "amber", dusuk: "slate" }[t.priority] || "slate",
      icon: ClipboardList, to: "/is-takibi/tickets",
    })),
    ...(stokPanel?.son_hareket || []).slice(0, 6).map((r, i) => ({
      key: `s-${i}-${r.fis_no}`, tarih: r.tarih, title: r.urun_adi, sub: `${r.depo_adi} · ${r.fis_no}`,
      badge: { giris: "Giriş", cikis: "Çıkış", transfer: "Transfer", iade: "İade" }[r.tip] || r.tip,
      tone: r.tip === "giris" ? "blue" : r.tip === "cikis" ? "rose" : "amber",
      icon: Warehouse, to: "/stok/fisler",
    })),
  ].sort((a, b) => new Date(b.tarih) - new Date(a.tarih)).slice(0, 10);

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

  const bekleyenOnaylar = [
    { n: summary.pendingLeaves || 0, label: "İzin", to: "/ik-izin-yonetimi" },
    { n: summary.pendingExpenses || 0, label: "Harcama", to: "/ik-harcama-yonetimi" },
    { n: ik.bekleyen_mesai || 0, label: "Mesai", to: "/ik/mesai" },
  ];

  return (
    <div className="space-y-5">

      {/* SÖZLEŞME UYARILARI */}
      <ContractAlerts />

      {/* BAŞLIK */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{greeting}, {firstName}</p>
          <h1 className="text-2xl font-bold mt-0.5">Yönetim Merkezi</h1>
          <p className="text-sm text-muted-foreground mt-1">Tüm operasyonlarınız bugün de sorunsuz ilerliyor.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground capitalize">{dayName}, {dateStr}</p>
          <p className="text-sm text-muted-foreground mt-1">İyi bir hafta geçirmeniz dileğiyle.</p>
        </div>
      </div>

      {/* DİKKAT GEREKTİRENLER */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {alerts.map((a, i) => (
            <Link key={i} to={a.to}
              className={cn("flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 hover:shadow-sm transition-all", TONES[a.tone])}>
              <a.icon className="w-3.5 h-3.5" /> {a.n} {a.label}
            </Link>
          ))}
        </div>
      )}

      {/* DUYURU */}
      {activeAnnouncements.length > 0 && (
        <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/25">
          <div className="flex items-stretch">
            <div className="flex-shrink-0 px-5 py-3.5 bg-white/15 flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              <span className="text-sm font-extrabold uppercase tracking-widest">Duyuru</span>
            </div>
            <div className="overflow-hidden flex-1 py-3.5 px-5">
              <div className="animate-marquee whitespace-nowrap">
                {activeAnnouncements.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-2 mr-14">
                    {a.title && <span className="font-bold text-white">{a.title}:</span>}
                    <span className="text-white/90 text-sm">{a.content}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BUGÜN — operasyon paneli */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bugün İzinli */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Umbrella className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bugün İzinli</h3>
            <span className="ml-auto text-lg font-black text-amber-600">{izinliList.length}</span>
          </div>
          {izinliList.length === 0 ? (
            <p className="text-xs text-muted-foreground">Bugün izinli personel yok</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {izinliList.slice(0, 10).map((l) => (
                <span key={l.id} className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-full px-2 py-0.5">
                  {l.employee_full_name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bugün Doğum Günü */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cake className="w-4 h-4 text-pink-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bugün Doğum Günü</h3>
            <span className="ml-auto text-lg font-black text-pink-600">{dogumGunu.length}</span>
          </div>
          {dogumGunu.length === 0 ? (
            <p className="text-xs text-muted-foreground">Bugün doğum günü yok</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {dogumGunu.map((ad, i) => (
                <span key={i} className="text-xs bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-900 rounded-full px-2 py-0.5">
                  🎂 {ad}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bekleyen Onaylar */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bekleyen Onaylar</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {bekleyenOnaylar.map((o, i) => (
              <Link key={i} to={o.to} className="rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors px-2 py-2 text-center">
                <div className={cn("text-xl font-black", o.n > 0 ? "text-indigo-600" : "text-muted-foreground/50")}>{o.n}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{o.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* HERO KPI — en çarpıcı 2 ₺ metriği */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {heroKpis.map((item, i) => (
          <Link key={i} to={item.path}
            className="rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <div className={`bg-gradient-to-br ${item.color} p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <item.icon size={28} className="opacity-80" />
                <ArrowUpRight size={18} className="opacity-50" />
              </div>
              <div className="text-4xl font-black truncate">{item.value}</div>
              <div className="text-white/80 text-sm mt-1.5">{item.label}</div>
            </div>
            <div className="bg-card px-5 py-2.5">
              <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* SECONDARY KPI — küçük/sade kartlar, İş Takibi son sırada */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((item, i) => (
          <Link key={i} to={item.path}
            className="bg-card rounded-xl border border-border/50 shadow-sm p-3.5 hover:shadow-md transition-all">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", TONES[item.tone])}>
              <item.icon size={16} />
            </div>
            <div className="text-xl font-bold truncate">{item.value}</div>
            <div className="text-xs text-muted-foreground truncate">{item.label}</div>
          </Link>
        ))}
      </div>

      {/* YAKLAŞAN SÖZLEŞME BİTİŞLERİ + SON AKTİVİTELER (karışık: bilet + stok) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-blue-500" /> Yaklaşan Sözleşme Bitişleri
            </h3>
            <Link to="/sozlesmeler" className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">Tümü <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {expiring.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Yaklaşan sözleşme bitişi yok</p></div>
          ) : (
            <div className="space-y-2">
              {expiring.map((c, i) => (
                <Link key={i} to="/sozlesmeler" className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.company_name || "—"}</p>
                    {c.title && <p className="text-xs text-muted-foreground truncate">{c.title}</p>}
                  </div>
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 shrink-0">{c.end_date}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> Son Aktiviteler
          </h3>
          {aktiviteler.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Henüz aktivite yok</p></div>
          ) : (
            <div className="space-y-1.5">
              {aktiviteler.map(a => (
                <Link key={a.key} to={a.to} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", TONES[a.tone])}>
                    <a.icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.sub}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full shrink-0 text-muted-foreground">{a.badge}</span>
                </Link>
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
