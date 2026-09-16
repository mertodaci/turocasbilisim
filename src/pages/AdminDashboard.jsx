import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users, ClipboardList, CheckSquare, ArrowUpRight, AlertTriangle, TrendingUp, Umbrella, DollarSign, Wallet, Building2, ScrollText, Boxes, PackageX, FileClock, UserX, Clock, Megaphone, Cake, UserPlus, FileSignature, PackagePlus, ClipboardPlus, FileBarChart, History, CalendarClock, CalendarDays, ListChecks, Bell, Square, Star, GripVertical, X, Plus, Save, Undo2, ChevronDown, ChevronUp, Mail, Phone, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import MiniCalendarWidget from "@/components/dashboard/MiniCalendarWidget";
import { useTicketStatuses } from "@/lib/jobTrackingLabels";
import { useStokAlerts, useTodos, useJTNotifications } from "@/lib/NotificationContext";
import { useContractAlerts } from "@/lib/useContractAlerts";
import { useActiveAnnouncements } from "@/lib/useActiveAnnouncements";
import { useRecentlyVisited } from "@/lib/useRecentlyVisited";
import { useLanguage } from "@/lib/LanguageContext";
import { getAllLeafItems } from "@/components/layout/navItems";
import { WIDGET_DEFS, DEFAULT_LAYOUT, reconcileLayout, widgetLabel, isTopLevelWidget } from "@/lib/dashboardWidgets";
import { NotificationBell } from "@/components/layout/TopBar";

const QUICK_ACTIONS = [
  { label: "Yeni Müşteri", to: "/musteriler", icon: UserPlus },
  { label: "Yeni Sözleşme", to: "/sozlesmeler", icon: FileSignature },
  { label: "Personel Ekle", to: "/calisanlar", icon: Users },
  { label: "Stok Girişi", to: "/stok/fisler", icon: PackagePlus },
  { label: "İş Talebi Oluştur", to: "/is-takibi/tickets", icon: ClipboardPlus },
  { label: "Rapor Al", to: "/hizli-rapor", icon: FileBarChart },
];

const TONES = {
  red:    "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
  rose:   "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900",
  amber:  "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900",
  blue:   "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  violet: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900",
  slate:  "bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
};

const ICON_TONES = {
  red: "text-red-600", rose: "text-rose-600", amber: "text-amber-600", orange: "text-orange-600",
  blue: "text-blue-600", violet: "text-violet-600", slate: "text-slate-600",
};

const ICON_SQUARE = {
  blue: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400",
  indigo: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400",
  slate: "bg-slate-200 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300",
  rose: "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
  teal: "bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400",
  purple: "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
  amber: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  pink: "bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400",
  violet: "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
  orange: "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400",
  red: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400",
};

const DONEM_DURUM = { taslak: "Taslak", onayli: "Onaylı", kapali: "Kapalı", yok: "Oluşmadı" };

const initialsOf = (name) => name?.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";

export default function AdminDashboard() {
  const { statusName } = useTicketStatuses();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { stokUyari } = useStokAlerts();
  const { unreadTodoCount } = useTodos();
  const { assignedTicketCount } = useJTNotifications();
  const recentlyVisited = useRecentlyVisited();
  const { expired: sozlesmeSonaEren, upcoming: sozlesmeYaklasan, nameOf: sozlesmeFirmaAdi } = useContractAlerts();
  const queryClient = useQueryClient();

  const { data: summary = { openTickets: [], openCount: 0, byStatus: [], dailyTrend: [] } } = useQuery({ queryKey: ["admin-summary"], queryFn: () => fetch("/api/dashboard/admin-summary", { credentials: "include" }).then(r => r.json()), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000 });
  const { data: exec } = useQuery({ queryKey: ["dashboard-executive"], queryFn: () => fetch("/api/dashboard/executive", { credentials: "include" }).then(r => r.json()), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false });
  const { data: ikData } = useQuery({ queryKey: ["ik-dashboard-admin"], queryFn: () => flowApi.ik.dashboard(), staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false });
  const { activeAnnouncements } = useActiveAnnouncements();
  const { data: recentCustomers = [] } = useQuery({ queryKey: ["recent-customers"], queryFn: () => flowApi.entities.Customer.list("-created_date", 3) });
  const { data: recentContracts = [] } = useQuery({ queryKey: ["recent-contracts"], queryFn: () => flowApi.entities.CustomerContract.list("-created_date", 3) });
  const { data: favorites = [] } = useQuery({ queryKey: ["favorites"], queryFn: () => flowApi.auth.getFavorites() });
  const favoriteItems = getAllLeafItems().filter((it) => favorites.includes(it.labelKey));
  const { data: myEmployee } = useQuery({
    queryKey: ["topbar-employee", user?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0],
  });
  const { data: departmentDefs = [] } = useQuery({
    queryKey: ["definitions", "departman"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "departman" }),
  });
  const { data: positionDefs = [] } = useQuery({
    queryKey: ["definitions", "pozisyon"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "pozisyon" }),
  });
  const getDeptLabel = (val) => departmentDefs.find((d) => d.value === val)?.label || val;
  const getPosLabel = (val) => positionDefs.find((p) => p.value === val)?.label || val;

  // Widget düzeni (sürükle-bırak + aç/kapa), kullanıcı bazlı kayıtlı
  const { data: savedLayout } = useQuery({ queryKey: ["dashboard-layout"], queryFn: () => flowApi.auth.getDashboardLayout() });
  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState(DEFAULT_LAYOUT);
  const [showAllGorevler, setShowAllGorevler] = useState(false);
  useEffect(() => {
    if (!editMode) setDraftLayout(reconcileLayout(savedLayout));
  }, [savedLayout, editMode]);

  const saveLayoutMutation = useMutation({
    mutationFn: (layout) => flowApi.auth.updateDashboardLayout(layout),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layout"] });
      setEditMode(false);
      toast.success("Widget düzeni kaydedildi");
    },
    onError: () => toast.error("Kaydedilemedi"),
  });

  const startEdit = () => { setDraftLayout(reconcileLayout(savedLayout)); setEditMode(true); };
  const cancelEdit = () => { setDraftLayout(reconcileLayout(savedLayout)); setEditMode(false); };

  // TopBar'daki "Widget'ları Düzenle" ikonu başka bir sayfadan buraya
  // ?edit=widgets ile yönlendirebiliyor -- geldiyse düzenleme modu otomatik açılır.
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("edit") === "widgets") startEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const removeWidget = (id) => {
    setDraftLayout((prev) => {
      const columns = {};
      for (const c of ["sol", "orta", "sag"]) columns[c] = prev.columns[c].filter((x) => x !== id);
      return { hidden: [...prev.hidden, id], columns };
    });
  };
  const addWidgetBack = (id) => {
    if (!isTopLevelWidget(id)) {
      // Alt-öğe (ör. tek bir KPI kartı) — sütuna eklenmez, yalnızca gizli değil sayılır.
      setDraftLayout((prev) => ({ ...prev, hidden: prev.hidden.filter((x) => x !== id) }));
      return;
    }
    const col = WIDGET_DEFS.find((w) => w.id === id)?.column || "orta";
    setDraftLayout((prev) => ({
      hidden: prev.hidden.filter((x) => x !== id),
      columns: { ...prev.columns, [col]: [...prev.columns[col], id] },
    }));
  };
  const handleWidgetDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    setDraftLayout((prev) => {
      const columns = { sol: [...prev.columns.sol], orta: [...prev.columns.orta], sag: [...prev.columns.sag] };
      columns[source.droppableId].splice(source.index, 1);
      columns[destination.droppableId].splice(destination.index, 0, draggableId);
      return { hidden: prev.hidden, columns };
    });
  };

  const ik = ikData?.kpi || {};
  const donem = ikData?.bordro_donem || {};
  const dogumGunu = ikData?.dogum_gunu || [];
  const hr = exec?.hr || {};
  const izinliList = hr.onLeaveTodayList || [];
  const sales = exec?.sales || {};
  const contracts = exec?.contracts || {};
  const su = stokUyari || {};

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const firstName = user?.full_name?.split(" ")[0] || "";
  const dayName = format(new Date(), "EEEE", { locale: tr });
  const dateStr = format(new Date(), "d MMMM yyyy", { locale: tr });

  const openTickets = summary.openTickets || [];
  const expiring = contracts.expiring || [];

  const aktifSozlesme = (contracts.stats || []).find(s => s.status === "aktif")?.c || 0;
  const donemDurum = DONEM_DURUM[donem.durum] || "—";

  const kpis = [
    { id: "kpi_aktif_sozlesme", label: "Aktif Sözleşme", value: aktifSozlesme, sub: `${expiring.length} yaklaşan bitiş`, tone: "blue", icon: ScrollText, path: "/sozlesmeler" },
    { id: "kpi_toplam_musteri", label: "Toplam Müşteri", value: sales.totalCustomers || 0, sub: `${sales.potentialCustomers || 0} aday müşteri`, tone: "sky", icon: Building2, path: "/musteriler" },
    { id: "kpi_aktif_personel", label: "Aktif Personel", value: ik.aktif_personel ?? hr.totalEmployees ?? 0, sub: `${ik.bugun_izinli || 0} bugün izinli`, tone: "indigo", icon: Users, path: "/calisanlar" },
    { id: "kpi_bordro_donemi", label: "Bordro Dönemi", value: donem.ay ? `${String(donem.ay).padStart(2, "0")}/${donem.yil}` : "—", sub: `${donemDurum} · ${ik.bekleyen_mesai || 0} bekleyen mesai`, tone: "slate", icon: Wallet, path: "/ik/bordro" },
    { id: "kpi_kritik_stok", label: "Kritik Stok", value: (su.kritik?.length) || 0, sub: `${su.bekleyen_fis || 0} bekleyen fiş`, tone: "rose", icon: Boxes, path: "/stok" },
    { id: "kpi_acik_bilet", label: "Açık Bilet", value: summary.openCount || 0, sub: `${summary.overdueTickets || 0} geciken`, tone: "teal", icon: ClipboardList, path: "/is-takibi/tickets" },
  ];

  // ── Dikkat gerektiren uyarılar (modüller arası, yalnız > 0) — her biri
  // sözleşme satırlarıyla aynı "ikon + açıklayıcı cümle" formatında ──
  const alerts = [
    { n: summary.overdueTickets, desc: (n) => `${n} bilet gecikmiş durumda:`, to: "/is-takibi/tickets", icon: AlertTriangle, tone: "red" },
    { n: summary.pendingLeaves, desc: (n) => `${n} izin talebi onay bekliyor:`, to: "/ik-izin-yonetimi", icon: Umbrella, tone: "amber" },
    { n: summary.pendingExpenses, desc: (n) => `${n} harcama talebi onay bekliyor:`, to: "/ik-harcama-yonetimi", icon: DollarSign, tone: "blue" },
    { n: ik.bekleyen_mesai, desc: (n) => `${n} mesai kaydı onay bekliyor:`, to: "/ik/mesai", icon: Clock, tone: "violet" },
    { n: ik.tutarsiz_personel, desc: (n) => `${n} personel kaydı tutarsız görünüyor:`, to: "/calisanlar?f=bordro", icon: UserX, tone: "orange" },
    { n: ik.eksik_evrakli_izin, desc: (n) => `${n} izin evrakı eksik:`, to: "/ik/izin-evrak", icon: FileClock, tone: "amber" },
    { n: su.kritik?.length, desc: (n) => `${n} ürün kritik stok seviyesinde:`, to: "/stok", icon: PackageX, tone: "rose", items: su.kritik, itemLabel: (it) => `${it.urun_adi} (${it.depo_adi})` },
    { n: su.skt_gecen?.length, desc: (n) => `${n} parti son kullanma tarihini geçmiş:`, to: "/stok/partiler", icon: AlertTriangle, tone: "rose", items: su.skt_gecen, itemLabel: (it) => `${it.urun_adi} (${it.depo_adi})` },
    { n: su.bekleyen_fis, desc: (n) => `${n} stok fişi onay bekliyor:`, to: "/stok/fisler", icon: ClipboardList, tone: "slate" },
    { n: su.geciken_zimmet, desc: (n) => `${n} zimmet iade tarihini geçmiş:`, to: "/stok/zimmet", icon: Clock, tone: "amber" },
  ].filter(a => (a.n || 0) > 0);

  const bekleyenOnaylar = [
    { n: summary.pendingLeaves || 0, label: "İzin", to: "/ik-izin-yonetimi" },
    { n: summary.pendingExpenses || 0, label: "Harcama", to: "/ik-harcama-yonetimi" },
    { n: ik.bekleyen_mesai || 0, label: "Mesai", to: "/ik/mesai" },
  ];
  const toplamBekleyenOnay = bekleyenOnaylar.reduce((s, o) => s + o.n, 0);

  const benimIslerim = [
    { n: toplamBekleyenOnay, label: "Onay Bekleyen İşler", to: "/ik-izin-yonetimi", icon: CheckSquare, tone: "amber" },
    { n: assignedTicketCount || 0, label: "Bana Atananlar", to: "/is-takibi/tickets", icon: ClipboardList, tone: "blue" },
    { n: unreadTodoCount || 0, label: "Yapılacaklarım", to: "/yapilacaklar", icon: ListChecks, tone: "violet" },
  ];

  const sonIslemler = [
    ...recentCustomers.map((c) => ({ key: `c-${c.id}`, ts: c.created_date, text: `${c.company_name || "Yeni müşteri"} eklendi`, to: `/musteri/${c.id}`, icon: Building2 })),
    ...recentContracts.map((c) => ({ key: `s-${c.id}`, ts: c.created_date, text: `${c.title || "Sözleşme"} oluşturuldu`, to: "/sozlesmeler", icon: ScrollText })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 5);

  // ── Görevlerim — sözleşme bitişleri + modüller arası uyarılar tek listede.
  // Gerçek bir tamamlama durumu tutmuyor, yalnızca görsel/navigasyonel bir liste.
  const gorevler = [
    ...sozlesmeSonaEren.map((c) => ({ key: `exp-${c.id}`, text: `${sozlesmeFirmaAdi(c.customer_id)} sözleşmesi sona erdi`, date: c.end_date, to: `/musteri/${c.customer_id}`, tone: "rose" })),
    ...sozlesmeYaklasan.map((c) => ({ key: `up-${c.id}`, text: `${sozlesmeFirmaAdi(c.customer_id)} sözleşmesi 30 gün içinde doluyor`, date: c.end_date, to: `/musteri/${c.customer_id}`, tone: "amber" })),
    ...alerts.map((a, i) => ({ key: `a-${i}`, text: a.desc(a.n), date: null, to: a.to, tone: a.tone })),
  ];

  // ── Widget içerikleri — her biri kendi id'siyle haritada; sıra/sütun/
  // görünürlük artık sabit JSX sırası değil, `draftLayout`'tan okunuyor.
  const roleLabels = { admin: "Sistem Yöneticisi", yonetici: "Yönetici", kullanici: "Kullanıcı", ik: "İK", stajer: "Stajyer", musteri: "Müşteri", guvenlik: "Güvenlik" };

  const widgetNodes = {
    profil_karti: (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="h-14 bg-gradient-to-br from-violet-600 to-fuchsia-600" />
        <div className="px-4 pb-4 -mt-8">
          <div className="w-16 h-16 rounded-2xl border-4 border-card bg-primary/15 flex items-center justify-center overflow-hidden text-lg font-bold text-primary shrink-0">
            {(user?.avatar_url || myEmployee?.avatar_url) ? (
              <img src={user?.avatar_url || myEmployee?.avatar_url} alt={user?.full_name} className="w-full h-full object-cover" />
            ) : initialsOf(user?.full_name)}
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold text-foreground truncate">{user?.full_name || "Kullanıcı"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <NotificationBell />
            <a href={`mailto:${user?.email || ""}`} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors" title="E-posta gönder">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </a>
            <Link to="/profil" className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors" title="Profili Aç">
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <span className={cn("ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full border", TONES.violet)}>
              {roleLabels[user?.role] || user?.role}
            </span>
          </div>
          {(myEmployee?.department || myEmployee?.phone || myEmployee?.hire_date) && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
              {myEmployee?.department && (
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate">{getDeptLabel(myEmployee.department)}{myEmployee.position ? ` - ${getPosLabel(myEmployee.position)}` : ""}</span>
                </div>
              )}
              {myEmployee?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate">{myEmployee.phone}</span>
                </div>
              )}
              {myEmployee?.hire_date && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate">İşe giriş: {format(new Date(myEmployee.hire_date), "d MMMM yyyy", { locale: tr })}</span>
                </div>
              )}
            </div>
          )}
          <Link to="/profil" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-3">
            Profili Aç <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    ),
    favoriler: (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ICON_SQUARE.amber)}><Star className="w-4 h-4" /></span>
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Favoriler</h3>
        </div>
        <div className="p-4 pt-3">
          {favoriteItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">Henüz favori eklenmedi — alt menüdeki bir öğenin üzerine gelip yıldıza tıklayarak ekleyebilirsiniz.</p>
          ) : (
            <div className="space-y-1">
              {favoriteItems.map((it) => (
                <Link key={it.labelKey} to={it.path} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted/60 transition-colors text-sm truncate">
                  <it.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{t(it.labelKey)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    hizli_islemler: (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ICON_SQUARE.indigo)}><Boxes className="w-4 h-4" /></span>
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Hızlı İşlemler</h3>
        </div>
        <div className="space-y-1 p-4 pt-3">
          {QUICK_ACTIONS.map((a, i) => (
            <Link key={i} to={a.to} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-muted/60 transition-colors text-sm">
              <a.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{a.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    ),
    son_kullanilanlar: (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ICON_SQUARE.slate)}><History className="w-4 h-4" /></span>
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Son Kullanılanlar</h3>
        </div>
        <div className="p-4 pt-3">
          {recentlyVisited.length === 0 ? (
            <p className="text-xs text-muted-foreground">Henüz sayfa gezilmedi</p>
          ) : (
            <div className="space-y-1">
              {recentlyVisited.map((v) => (
                <Link key={v.path} to={v.path} className="block px-2.5 py-1.5 rounded-xl hover:bg-muted/60 transition-colors text-sm truncate">
                  {t(v.labelKey)}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    duyuru: activeAnnouncements.length > 0 ? (
      <div className="rounded-2xl overflow-hidden bg-violet-50 dark:bg-violet-950/95 border border-violet-200/50 dark:border-violet-900/40 flex items-stretch shadow-sm">
        <div className="shrink-0 px-4 py-3 flex items-center gap-2 bg-violet-100/60 dark:bg-violet-900/90">
          <Megaphone className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-bold uppercase tracking-wide text-violet-700 dark:text-violet-400">Duyuru</span>
        </div>
        <div className="overflow-hidden flex-1 py-3 px-4 flex items-center">
          <div className="animate-marquee whitespace-nowrap">
            {activeAnnouncements.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-2 mr-14">
                {a.title && <span className="font-bold text-foreground text-sm">{a.title}:</span>}
                <span className="text-foreground/80 text-sm sm:text-base font-medium">{a.content}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <div className="rounded-2xl overflow-hidden bg-violet-50 dark:bg-violet-950/95 border border-violet-200/50 dark:border-violet-900/40 px-4 py-3">
        <p className="text-xs text-violet-700 dark:text-violet-400">Aktif duyuru yok</p>
      </div>
    ),
    gorevlerim_pair: (() => {
      const showGorevlerim = !draftLayout.hidden.includes("gorevlerim");
      const showBenimIslerim = !draftLayout.hidden.includes("benim_islerim");
      if (!showGorevlerim && !showBenimIslerim) return null;
      const visibleGorevler = showAllGorevler ? gorevler : gorevler.slice(0, 5);

      const gorevlerimCard = gorevler.length > 0 ? (
        <div className="relative rounded-2xl overflow-hidden bg-amber-50 dark:bg-amber-950/95 border border-amber-200/50 dark:border-amber-900/40 h-full flex flex-col">
          {editMode && (
            <button type="button" onClick={() => removeWidget("gorevlerim")} className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-destructive hover:bg-destructive/10" title="Gizle">
              <X className="w-3 h-3" />
            </button>
          )}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200/50 dark:border-amber-900/40">
            <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ICON_SQUARE.amber)}><ListChecks className="w-4 h-4" /></span>
            <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Görevlerim</h3>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">{gorevler.length} görev</span>
              {gorevler.length > 5 && (
                <button type="button" onClick={() => setShowAllGorevler((v) => !v)}
                  className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                  title={showAllGorevler ? "Daha az göster" : "Tümünü göster"}>
                  {showAllGorevler ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
          <div className={cn("p-2 space-y-0.5 flex-1", showAllGorevler && "max-h-72 overflow-y-auto")}>
            {visibleGorevler.map((g) => (
              <div key={g.key} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors">
                <Square className={cn("w-4 h-4 shrink-0", ICON_TONES[g.tone])} />
                <span className="flex-1 min-w-0 text-sm truncate">{g.text}</span>
                {g.date && <span className="text-[11px] text-muted-foreground shrink-0">{new Date(g.date).toLocaleDateString("tr-TR")}</span>}
                <Link to={g.to} className="text-xs font-medium text-primary hover:underline shrink-0">Görüntüle</Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-amber-50 dark:bg-amber-950/95 border border-amber-200/50 dark:border-amber-900/40 px-4 py-3">
          {editMode && (
            <button type="button" onClick={() => removeWidget("gorevlerim")} className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-destructive hover:bg-destructive/10" title="Gizle">
              <X className="w-3 h-3" />
            </button>
          )}
          <p className="text-xs text-amber-700 dark:text-amber-400">Bugün için bekleyen bir görev yok</p>
        </div>
      );

      const benimIslerimCard = (
        <div className="relative bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden h-full flex flex-col">
          {editMode && (
            <button type="button" onClick={() => removeWidget("benim_islerim")} className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-destructive hover:bg-destructive/10" title="Gizle">
              <X className="w-3 h-3" />
            </button>
          )}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
            <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ICON_SQUARE.amber)}><Bell className="w-4 h-4" /></span>
            <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Benim İşlerim</h3>
          </div>
          <div className="p-3 space-y-2 flex-1">
            {benimIslerim.map((it, i) => (
              <Link key={i} to={it.to} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm", TONES[it.tone])}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-card/70">
                  <it.icon className={cn("w-5 h-5", ICON_TONES[it.tone])} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xl font-bold leading-none", it.n > 0 ? ICON_TONES[it.tone] : "text-muted-foreground/50")}>{it.n}</p>
                  <p className="text-xs text-foreground/80 truncate mt-1">{it.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      );

      if (showGorevlerim && showBenimIslerim) {
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            <div className="lg:col-span-2">{gorevlerimCard}</div>
            <div>{benimIslerimCard}</div>
          </div>
        );
      }
      return showGorevlerim ? gorevlerimCard : benimIslerimCard;
    })(),
    sozlesme_bilet_pair: (() => {
      const showSozlesme = !draftLayout.hidden.includes("yaklasan_sozlesme_bitisleri");
      const showBilet = !draftLayout.hidden.includes("bilet_hareketi");
      if (!showSozlesme && !showBilet) return null;

      const sozlesmeCard = (
        <div className="relative bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          {editMode && (
            <button type="button" onClick={() => removeWidget("yaklasan_sozlesme_bitisleri")} className="absolute top-3 right-3 z-10 w-5 h-5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-destructive hover:bg-destructive/10" title="Gizle">
              <X className="w-3 h-3" />
            </button>
          )}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className={cn("w-6 h-6 rounded-md flex items-center justify-center", ICON_SQUARE.blue)}><ScrollText className="w-3.5 h-3.5" /></span> Yaklaşan Sözleşme Bitişleri
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
      );

      const biletCard = (
        <div className="relative bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          {editMode && (
            <button type="button" onClick={() => removeWidget("bilet_hareketi")} className="absolute top-3 right-3 z-10 w-5 h-5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-destructive hover:bg-destructive/10" title="Gizle">
              <X className="w-3 h-3" />
            </button>
          )}
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <span className={cn("w-6 h-6 rounded-md flex items-center justify-center", ICON_SQUARE.indigo)}><TrendingUp className="w-3.5 h-3.5" /></span> Son 7 Gün · Bilet Hareketi
          </h3>
          {(summary.dailyTrend || []).length === 0 ? (
            <div className="flex items-center justify-center h-28 text-muted-foreground text-sm">Veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={(summary.dailyTrend || []).map(d => ({ name: format(new Date(d.d), "EEE", { locale: tr }), acilan: d.opened, kapanan: d.closed }))}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="acilan" fill="#6366f1" radius={[4, 4, 0, 0]} name="Açılan" />
                <Bar dataKey="kapanan" fill="#10b981" radius={[4, 4, 0, 0]} name="Kapanan" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      );

      return (
        <div className={cn("grid grid-cols-1 gap-5", showSozlesme && showBilet && "lg:grid-cols-2")}>
          {showSozlesme && sozlesmeCard}
          {showBilet && biletCard}
        </div>
      );
    })(),
    son_acik_biletler: (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className={cn("w-6 h-6 rounded-md flex items-center justify-center", ICON_SQUARE.teal)}><ClipboardList className="w-3.5 h-3.5" /></span> Son Açık Biletler
          </h3>
          <Link to="/is-takibi/tickets" className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">Tümü <ArrowUpRight className="w-3 h-3" /></Link>
        </div>
        {openTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground"><CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Açık bilet yok</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {openTickets.slice(0, 8).map(tk => {
              const pc = { kritik: "bg-red-500", yuksek: "bg-orange-500", orta: "bg-amber-400", dusuk: "bg-green-500" }[tk.priority] || "bg-gray-400";
              return (
                <Link key={tk.id} to="/is-takibi/tickets" className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", pc)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tk.title}</p>
                    {tk.customer_name && <p className="text-xs text-muted-foreground truncate">{tk.customer_name}</p>}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full shrink-0 text-muted-foreground">{statusName(tk.status)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    ),
    takvim: <MiniCalendarWidget />,
    yaklasan_takvim: (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ICON_SQUARE.blue)}><CalendarClock className="w-4 h-4" /></span>
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Yaklaşan Takvim</h3>
        </div>
        <div className="p-4 pt-3">
        {sozlesmeYaklasan.length === 0 ? (
          <p className="text-xs text-muted-foreground">Yaklaşan bir şey yok</p>
        ) : (
          <div className="space-y-1.5">
            {sozlesmeYaklasan.slice(0, 5).map((c) => (
              <Link key={c.id} to={`/musteri/${c.customer_id}`} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl hover:bg-muted/60 transition-colors">
                <span className="text-xs truncate">{sozlesmeFirmaAdi(c.customer_id)}</span>
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 shrink-0">{c.end_date}</span>
              </Link>
            ))}
          </div>
        )}
        </div>
      </div>
    ),
    ekip_bugun: (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Ekip Bugün</h3>
        <div className="space-y-3">
          {[
            { icon: Umbrella, tone: "amber", label: "Bugün İzinli", list: izinliList.map((l) => l.employee_full_name) },
            { icon: Cake, tone: "pink", label: "Bugün Doğum Günü", list: dogumGunu },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ICON_SQUARE[row.tone])}><row.icon className="w-4 h-4" /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.list.length > 0 ? `${row.list.length} Personel` : "Yok"}</p>
              </div>
              {row.list.length > 0 && (
                <div className="flex -space-x-2 shrink-0">
                  {row.list.slice(0, 4).map((name, i) => (
                    <span key={i} title={name} className={cn("w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-card", ICON_SQUARE[row.tone])}>
                      {initialsOf(name)}
                    </span>
                  ))}
                  {row.list.length > 4 && <span className="w-7 h-7 rounded-full bg-muted text-[10px] font-bold flex items-center justify-center border-2 border-card">+{row.list.length - 4}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    son_islemler: (
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", ICON_SQUARE.teal)}><TrendingUp className="w-4 h-4" /></span>
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Son İşlemler</h3>
        </div>
        <div className="p-4 pt-3">
          {sonIslemler.length === 0 ? (
            <p className="text-xs text-muted-foreground">Henüz kayıt yok</p>
          ) : (
            <div className="space-y-1">
              {sonIslemler.map((it) => (
                <Link key={it.key} to={it.to} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-muted/60 transition-colors">
                  <it.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate">{it.text}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
  };
  widgetNodes.kpi_banner = (() => {
    const visibleKpis = kpis.filter((k) => !draftLayout.hidden.includes(k.id));
    if (visibleKpis.length === 0) return null;
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {visibleKpis.map((k) => (
          <Link key={k.id} to={k.path}
            className="relative bg-card rounded-2xl border border-border/50 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 block">
            {editMode && (
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeWidget(k.id); }}
                className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-destructive hover:bg-destructive/10" title="Gizle">
                <X className="w-3 h-3" />
              </button>
            )}
            <div className="flex items-center justify-between mb-3">
              <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center", ICON_SQUARE[k.tone])}>
                <k.icon size={20} />
              </span>
              <ArrowUpRight size={16} className="text-muted-foreground/40" />
            </div>
            <div className="text-2xl font-bold text-foreground truncate">{k.value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{k.label}</div>
            <p className="text-xs text-muted-foreground/80 mt-1 truncate">{k.sub}</p>
          </Link>
        ))}
      </div>
    );
  })();

  // Düzenleme modunda her widget'ı saran, tutamaç + kaldır (X) butonu
  // ekleyen kabuk. Normal görünümde widget aynen (kabuksuz) render edilir.
  const renderWidget = (id, dragHandleProps) => (
    <div className="relative group">
      {editMode && (
        <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1">
          <span {...dragHandleProps} className="w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground" title="Sürükle">
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <button type="button" onClick={() => removeWidget(id)} className="w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-destructive hover:bg-destructive/10" title="Kaldır">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className={cn(editMode && "pointer-events-none opacity-90")}>{widgetNodes[id]}</div>
    </div>
  );

  const renderColumn = (col, className, header) => (
    editMode ? (
      <Droppable droppableId={col} type="widget">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className={cn(className, "min-h-[60px] rounded-2xl", "outline-dashed outline-1 outline-border/50 p-1")}>
            {header}
            {draftLayout.columns[col].map((id, index) => (
              <Draggable key={id} draggableId={id} index={index}>
                {(dragProvided) => (
                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className="mb-4 last:mb-0">
                    {renderWidget(id, dragProvided.dragHandleProps)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    ) : (
      <div className={className}>
        {header}
        {draftLayout.columns[col].map((id) => <div key={id}>{widgetNodes[id]}</div>)}
      </div>
    )
  );


  const content = (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_320px] gap-5 items-start">
      {renderColumn("sol", "space-y-4 xl:sticky xl:top-24 order-2 xl:order-1")}

      <div className="order-1 xl:order-2 min-w-0 space-y-5">
        {/* BAŞLIK */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-lg text-muted-foreground">{greeting}, {firstName}</p>
            <h1 className="text-lg font-normal mt-0.5">Yönetim Merkezi</h1>
            <p className="text-sm text-muted-foreground mt-1">Tüm operasyonlarınız bugün de sorunsuz ilerliyor.</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground capitalize">{dayName}, {dateStr}</p>
            <p className="text-sm text-muted-foreground mt-1">İyi bir hafta geçirmeniz dileğiyle.</p>
          </div>
        </div>

        {editMode && (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-medium text-foreground">Widget Düzenleme Modu — sürükleyip taşıyın, X ile kaldırın</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={cancelEdit}>
                  <Undo2 className="w-3.5 h-3.5" /> Vazgeç
                </Button>
                <Button size="sm" className="gap-1.5" disabled={saveLayoutMutation.isPending} onClick={() => saveLayoutMutation.mutate(draftLayout)}>
                  <Save className="w-3.5 h-3.5" /> Kaydet
                </Button>
              </div>
            </div>
            {draftLayout.hidden.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Gizli Widget'lar</p>
                <div className="flex flex-wrap gap-2">
                  {draftLayout.hidden.map((id) => (
                    <button key={id} type="button" onClick={() => addWidgetBack(id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium bg-card border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors">
                      <Plus className="w-3 h-3" /> {widgetLabel(id)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {renderColumn("orta", "space-y-5")}

        <div className="text-center text-xs text-muted-foreground pb-2">
          Canlı veri · Her 10 dakikada otomatik yenilenir
        </div>
      </div>

      {renderColumn("sag", "space-y-4 xl:sticky xl:top-24 order-3")}
    </div>
  );

  if (!editMode) return content;

  return (
    <DragDropContext onDragEnd={handleWidgetDragEnd}>
      {content}
    </DragDropContext>
  );
}
