import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, BarChart3, Activity, Menu, X, CalendarDays, Building2, ClipboardList, MessageCircle, CheckSquare, Umbrella, FileSpreadsheet, ChevronDown, Wrench, ShieldCheck, ShieldOff, ChevronLeft, ChevronRight, Star, Receipt, Megaphone, FileText, Trash2, ScrollText, Clock, CreditCard, Wallet, Boxes, Package, Warehouse, Rows3, MapPin, MapPinned, PackageSearch, ArrowLeftRight, Layers, ClipboardCheck, ShoppingCart, HardHat, Smartphone, Tags, FileUp, FileCode2, UserCircle2, LogOut, HelpCircle, CalendarClock, Calculator, Lock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";



import { useMessages, useTodos, useLeave, useExpense, useJTNotifications, useStokAlerts } from '@/lib/NotificationContext';

import { useLanguage } from "@/lib/LanguageContext";

import { useRolePermissions } from "@/lib/RolePermissionsContext";

import { flowApi } from "@/api/flowApiClient";
import { useQuery } from "@tanstack/react-query";

export const allNavItems = [
{ labelKey: "dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "yonetici", "kullanici"] },

{
  labelKey: "is_takibi", path: null, icon: ClipboardList, roles: ["admin", "yonetici", "kullanici", "musteri"],
  children: [
    { labelKey: "is_takibi_tanimlar", path: "/is-takibi/tanimlar", icon: Wrench, roles: ["admin", "yonetici"] },
    {
      labelKey: "is_takibi_islem", path: null, icon: ClipboardList, roles: ["admin", "yonetici", "kullanici", "musteri"],
      children: [
        { labelKey: "is_takibi_projeler", path: "/is-takibi", icon: Building2, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "is_takibi_biletler", path: "/is-takibi/tickets", icon: ClipboardList, roles: ["admin", "yonetici", "kullanici", "musteri"] },
        { labelKey: "is_takibi_kanban", path: "/is-takibi/kanban", icon: CheckSquare, roles: ["admin", "yonetici", "kullanici"] },
      ]
    },
    { labelKey: "is_takibi_dashboard", path: "/is-takibi/dashboard", icon: BarChart3, roles: ["admin", "yonetici", "kullanici"] },
  ]
},
{
  labelKey: "support_center", path: null, icon: Wrench, roles: ["admin", "yonetici", "kullanici", "ik", "stajer"],
  children: [
    { labelKey: "messages", path: "/mesajlar", icon: MessageCircle, roles: ["admin", "yonetici", "kullanici", "ik", "stajer"] },
    { labelKey: "todos", path: "/yapilacaklar", icon: CheckSquare, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "expenses", path: "/harcamalar", icon: FileSpreadsheet, roles: ["admin", "yonetici", "kullanici", "ik"] },
    { labelKey: "my_leave_requests", path: "/izinlerim", icon: Umbrella, roles: ["admin", "yonetici", "kullanici", "ik", "stajer"] },
  ]
},
{
  labelKey: "insan_kaynaklari", path: null, icon: Users, roles: ["admin", "yonetici", "kullanici", "ik"],
  children: [
    {
      labelKey: "ik_grp_personel", path: null, icon: Users, roles: ["admin", "yonetici", "kullanici", "ik"],
      children: [
        { labelKey: "employees", path: "/calisanlar", icon: Users, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "ikb_zam", path: "/ik/zam", icon: Receipt, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_ozluk_evrak", path: "/ik/ozluk-evrak", icon: FileText, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_tutanak", path: "/ik/tutanak", icon: ScrollText, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_ilan", path: "/ik/ilan", icon: Megaphone, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "org_chart", path: "/org-sema", icon: Users, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "ik_grp_puantaj", path: null, icon: Clock, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "pdks_kart_yonetimi", path: "/kart-yonetimi", icon: CreditCard, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "personel_hareketleri", path: "/personel-hareketleri", icon: Clock, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_vardiya_atama", path: "/ik/vardiya-transfer", icon: ArrowLeftRight, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "ik_grp_izin", path: null, icon: Umbrella, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "ik_leave_requests", path: "/ik-izin-yonetimi", icon: Umbrella, roles: ["admin", "yonetici"] },
        { labelKey: "ikb_izin_evrak", path: "/ik/izin-evrak", icon: ClipboardCheck, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ik_expense_requests", path: "/ik-harcama-yonetimi", icon: Receipt, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "ik_grp_bordro", path: null, icon: Wallet, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "ikb_puantaj", path: "/ik/puantaj", icon: CalendarClock, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_mesai", path: "/ik/mesai", icon: Clock, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_kesinti", path: "/ik/kesinti", icon: Receipt, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_ic_borc", path: "/ik/ic-borc", icon: Wallet, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_personel_masraf", path: "/ik/personel-masraf", icon: Wallet, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_bordro", path: "/ik/bordro", icon: Calculator, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_ay_kapanis", path: "/ik/ay-kapanis", icon: Lock, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "ik_grp_tanim", path: null, icon: Wrench, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "ik_tanimlar", path: "/ik-tanimlar", icon: Wrench, roles: ["admin", "yonetici"] },
        { labelKey: "ikb_subeler", path: "/ik/subeler", icon: MapPin, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_bolumler", path: "/ik/bolumler", icon: Building2, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_vardiyalar", path: "/ik/vardiyalar", icon: Clock, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_vardiya_planlari", path: "/ik/vardiya-planlari", icon: CalendarDays, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_tatil_sihirbazi", path: "/ik/tatil-sihirbazi", icon: CalendarDays, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "leave_types", path: "/izin-turleri", icon: CalendarDays, roles: ["admin", "yonetici"] },
        { labelKey: "leave_allowances", path: "/izin-haklari", icon: CalendarDays, roles: ["admin", "yonetici"] },
        { labelKey: "ikb_hakedis_ayar", path: "/ik/hakedis-ayar", icon: Wrench, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_bordro_yemek", path: "/ik/bordro-yemek", icon: Wrench, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_sirket", path: "/ik/sirket", icon: Building2, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "ik_grp_rapor", path: null, icon: BarChart3, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "employee_report", path: "/calisan-raporu", icon: FileSpreadsheet, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_puantaj_rapor", path: "/ik/puantaj-rapor", icon: BarChart3, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_maas_ozet", path: "/ik/maas-ozet", icon: FileSpreadsheet, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "quick_report", path: "/hizli-rapor", icon: FileSpreadsheet, roles: ["admin", "yonetici", "kullanici", "ik"] },
      ]
    },
  ]
},
{
  labelKey: "musteriler_menu", path: null, icon: Building2, roles: ["admin", "yonetici"],
  children: [
    { labelKey: "customers", path: "/musteriler", icon: Building2, roles: ["admin", "yonetici"] },
    { labelKey: "musteri_kullanicilari", path: "/musteri-kullanicilari", icon: Users, roles: ["admin", "yonetici"] },
  ]
},
{
  labelKey: "sozlesme_yonetimi", path: null, icon: ScrollText, roles: ["admin", "yonetici", "ik"],
  children: [
    { labelKey: "sozlesmeler", path: "/sozlesmeler", icon: FileText, roles: ["admin", "yonetici", "ik"] },
    { labelKey: "hakedisler", path: "/hakedisler", icon: Wallet, roles: ["admin", "yonetici", "ik"] },
  ]
},
{
  labelKey: "system_admin", path: null, icon: ShieldCheck, roles: ["admin", "yonetici", "kullanici", "ik", "stajer"],
  children: [
    { labelKey: "users", path: "/kullanicilar", icon: Users, roles: ["admin", "yonetici", "kullanici", "ik", "stajer", "musteri"] },
    { labelKey: "role_permissions", path: "/yetkilendirme", icon: ShieldCheck, roles: ["admin"] },
    { labelKey: "oturum_yonetimi", path: "/oturum-yonetimi", icon: ShieldOff, roles: ["admin", "yonetici"] },
    { labelKey: "announcements", path: "/duyurular", icon: Megaphone, roles: ["admin", "yonetici"] },
    { labelKey: "cop_kutusu", path: "/cop-kutusu", icon: Trash2, roles: ["admin"] },
    { labelKey: "denetim_kaydi", path: "/denetim-kaydi", icon: ScrollText, roles: ["admin"] },
  ]
},
{
  labelKey: "stok_yonetimi", path: null, icon: Boxes, roles: ["admin", "yonetici", "kullanici"],
  children: [
    {
      labelKey: "stok_tanim", path: null, icon: Wrench, roles: ["admin", "yonetici", "kullanici"],
      children: [
        { labelKey: "stok_urunler", path: "/stok/urunler", icon: Package, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_gruplar", path: "/stok/gruplar", icon: FileText, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_depolar", path: "/stok/depolar", icon: Warehouse, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_raflar", path: "/stok/raflar", icon: Rows3, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_urun_raf", path: "/stok/urun-raf", icon: PackageSearch, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_sahalar", path: "/stok/sahalar", icon: MapPin, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_zimmet_yerleri", path: "/stok/zimmet-yerleri", icon: MapPinned, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_tedarikciler", path: "/stok/tedarikciler", icon: Building2, roles: ["admin", "yonetici", "kullanici"] },
      ]
    },
    {
      labelKey: "stok_islem", path: null, icon: ArrowLeftRight, roles: ["admin", "yonetici", "kullanici"],
      children: [
        { labelKey: "stok_mobil", path: "/stok/mobil", icon: Smartphone, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_fisler", path: "/stok/fisler", icon: FileText, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_sayim", path: "/stok/sayim", icon: ClipboardCheck, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_satinalma", path: "/stok/satin-alma", icon: ShoppingCart, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_zimmet", path: "/stok/zimmet", icon: HardHat, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_etiket", path: "/stok/etiket", icon: Tags, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_excel", path: "/stok/excel", icon: FileUp, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_qnb", path: "/stok/qnb", icon: FileCode2, roles: ["admin", "yonetici", "kullanici"] },
      ]
    },
    {
      labelKey: "stok_rapor", path: null, icon: BarChart3, roles: ["admin", "yonetici", "kullanici"],
      children: [
        { labelKey: "stok_dashboard", path: "/stok", icon: Boxes, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_raporlar", path: "/stok/raporlar", icon: BarChart3, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_parti_takibi", path: "/stok/partiler", icon: Layers, roles: ["admin", "yonetici", "kullanici"] },
      ]
    },
  ]
},
];

function getAllLeafItems() {
  const items = [];
  function walk(list) {
    for (const item of list) {
      if (item.children) {
        walk(item.children);
      } else {
        items.push(item);
      }
    }
  }
  walk(allNavItems);
  return items;
}

// Profil bloğu — menünün en üstünde (avatar + isim + rol), /profil'e link.
function SidebarProfile({ collapsed }) {
  const { user } = useAuth();

  const { data: employeeRecord } = useQuery({
    queryKey: ["sidebar-employee", user?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0],
  });

  const roleLabels = { admin: "Admin", yonetici: "Yönetici", kullanici: "Kullanıcı", ik: "İK", stajer: "Stajyer", musteri: "Müşteri" };
  const roleLabel = roleLabels[user?.role] || user?.role || "";
  const name = user?.full_name || user?.email || "Kullanıcı";

  const body = (
    <Link
      to="/profil"
      className={cn(
        "flex items-center gap-3 mx-3 mb-2 px-2 py-2 rounded-xl hover:bg-sidebar-accent transition-colors",
        collapsed && "mx-1 px-0 justify-center"
      )}
    >
      <div className="w-9 h-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center overflow-hidden shrink-0">
        {employeeRecord?.avatar_url ? (
          <img src={employeeRecord.avatar_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <UserCircle2 className="w-5 h-5 text-sidebar-primary" />
        )}
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-sidebar-primary truncate">{name}</p>
          <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 leading-tight truncate">{roleLabel}</p>
        </div>
      )}
    </Link>
  );

  if (!collapsed) return body;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent side="right" className="bg-slate-900 text-white border-slate-800">{name}</TooltipContent>
    </Tooltip>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar_collapsed") === "1"; } catch { return false; }
  });
  const [expandedMenus, setExpandedMenus] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [flyout, setFlyout] = useState(null); // { key, top } — daraltılmış grup uçan alt-menüsü
  const flyoutTimer = useRef(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const checkViewport = () => setIsMobileViewport(window.innerWidth < 768);
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);
  const { user, logout } = useAuth();
  const { unreadMessageCount } = useMessages();
  const { unreadTodoCount } = useTodos();
  const { pendingLeaveCount } = useLeave();
  const { pendingExpenseCount, pendingExpenseIKCount } = useExpense();
  const { assignedTicketCount } = useJTNotifications();
  const { stokUyariCount } = useStokAlerts();
  const { t } = useLanguage();
  const { hasPermission } = useRolePermissions();
  const userPerms = user?.permissions || [];
  // TEK DOĞRULUK KAYNAĞI: admin her şeyi görür, diğerleri sadece DB role_permissions.can_view.
  // Kod içi roles dizileri artık menü görünürlüğünü ETKİLEMEZ (yetki tamamen Yetkilendirme ekranından yönetilir).
  const canViewModule = (moduleKey) => {
    if (userRole === "admin") return true;
    const perm = userPerms.find(p => p.module === moduleKey);
    return perm ? perm.can_view == 1 : false; // DB'de kayıt yoksa kapalı (fail-closed)
  };

  const userRole = user?.role || "kullanici";
  const isPrivileged = userRole === "admin" || userRole === "yonetici";

  useEffect(() => {
    if (!user) return;
    flowApi.auth.getFavorites().then(setFavorites).catch(() => setFavorites([]));
  }, [user]);

  useEffect(() => {
    try { localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0"); } catch { /* storage yoksa sorun değil */ }
  }, [collapsed]);

  // Gezinince / menü genişleyince uçan alt-menüyü kapat.
  useEffect(() => { setFlyout(null); }, [location.pathname]);
  useEffect(() => { if (!collapsed) setFlyout(null); }, [collapsed]);

  const openFlyout = (key, el) => {
    clearTimeout(flyoutTimer.current);
    const r = el.getBoundingClientRect();
    setFlyout({ key, top: r.top });
  };
  const scheduleCloseFlyout = () => {
    clearTimeout(flyoutTimer.current);
    flyoutTimer.current = setTimeout(() => setFlyout(null), 150);
  };
  const cancelCloseFlyout = () => clearTimeout(flyoutTimer.current);

  const toggleFavorite = async (e, labelKey) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavorites = favorites.includes(labelKey)
      ? favorites.filter(f => f !== labelKey)
      : [...favorites, labelKey];
    setFavorites(newFavorites);
    await flowApi.auth.updateFavorites(newFavorites).catch(() => {});
  };

  function filterNavTree(items) {
    return items
      .map((item) => ({
        ...item,
        children: item.children ? filterNavTree(item.children) : undefined,
      }))
      .filter((item) => {
        if (item.children) return item.children.length > 0;
        return canViewModule(item.labelKey);
      });
  }
  const navItems = filterNavTree(allNavItems);
  const allLeaf = getAllLeafItems();
  const favoriteItems = favorites
    .map(key => allLeaf.find(i => i.labelKey === key))
    .filter(Boolean)
    .filter(i => canViewModule(i.labelKey));
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (main) main.style.marginLeft = isMobileViewport ? "0" : (collapsed ? "4rem" : "16rem");
  }, [collapsed, isMobileViewport]);

  const toggleMenu = (labelKey) => {
    setExpandedMenus((prev) => ({ ...prev, [labelKey]: !prev[labelKey] }));
  };

  const renderChildLink = (child) => {
    const isChildActive = location.pathname === child.path;
    const childShowLeaveBadge = (child.labelKey === "my_leave_requests" || child.labelKey === "ik_leave_requests") && pendingLeaveCount > 0;
    const childShowExpenseBadge = child.labelKey === "expenses" && pendingExpenseCount > 0;
    const childShowExpenseIKBadge = child.labelKey === "ik_expense_requests" && pendingExpenseIKCount > 0;
    const childShowJTBadge = child.labelKey === "is_takibi_biletler" && assignedTicketCount > 0;
    const childShowMessageBadge = child.labelKey === "messages" && unreadMessageCount > 0;
    const childShowTodoBadge = child.labelKey === "todos" && unreadTodoCount > 0;
    const childShowStokBadge = child.labelKey === "stok_dashboard" && stokUyariCount > 0;
    const isFav = favorites.includes(child.labelKey);

    return (
      <Link key={child.path} to={child.path} onClick={() => setMobileOpen(false)}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",
          isChildActive
            ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-fuchsia-500/20"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}>
        <child.icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{t(child.labelKey)}</span>
        {childShowLeaveBadge && <span className="flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full">{pendingLeaveCount}</span>}
            {childShowExpenseBadge && <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full">{pendingExpenseCount}</span>}
            {childShowExpenseIKBadge && <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full">{pendingExpenseIKCount}</span>}
        {childShowJTBadge && <span className="flex items-center justify-center w-5 h-5 bg-teal-500 text-white text-xs font-bold rounded-full">{assignedTicketCount}</span>}
        {childShowMessageBadge && <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">{unreadMessageCount}</span>}
        {childShowTodoBadge && <span className="flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full">{unreadTodoCount}</span>}
        {childShowStokBadge && <span className="flex items-center justify-center min-w-5 h-5 px-1 bg-orange-500 text-white text-xs font-bold rounded-full">{stokUyariCount}</span>}
        {!collapsed && (
          <button
            onClick={(e) => toggleFavorite(e, child.labelKey)}
            className={cn("ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-sidebar-accent", isFav && "opacity-100")}
            title={isFav ? "Favorilerden cıkar" : "Favorilere ekle"}>
            <Star className={cn("w-3.5 h-3.5", isFav ? "fill-yellow-400 text-yellow-400" : "text-sidebar-foreground/30")} />
          </button>
        )}
      </Link>
    );
  };

  const renderNavChild = (child) => {
    const hasKids = child.children && child.children.length > 0;
    if (!hasKids) return renderChildLink(child);
    const isSubExpanded = expandedMenus[child.labelKey];
    return (
      <div key={child.labelKey}>
        <button onClick={() => toggleMenu(child.labelKey)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",
            isSubExpanded ? "text-sidebar-foreground bg-sidebar-accent/60" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          )}>
          <child.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{t(child.labelKey)}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform shrink-0", isSubExpanded && "rotate-180")} />
        </button>
        {isSubExpanded && (
          <div className="space-y-1 pl-4 mt-1 border-l-2 border-sidebar-accent">
            {child.children.map(renderNavChild)}
          </div>
        )}
      </div>
    );
  };

  // Daraltılmış grup uçan alt-menüsü — beyaz kart, alt-gruplar bölüm başlığı olur.
  const renderFlyoutTree = (items) => items.map((it) => {
    if (it.children && it.children.length > 0) {
      return (
        <div key={it.labelKey} className="mt-1 first:mt-0">
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">{t(it.labelKey)}</p>
          <div>{renderFlyoutTree(it.children)}</div>
        </div>
      );
    }
    const active = location.pathname === it.path;
    return (
      <Link key={it.path} to={it.path}
        onClick={() => { setFlyout(null); setMobileOpen(false); }}
        className={cn(
          "flex items-center gap-2.5 mx-1 px-2.5 py-2 rounded-lg text-sm transition-colors",
          active ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "text-foreground/70 hover:bg-muted"
        )}>
        <it.icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{t(it.labelKey)}</span>
      </Link>
    );
  });
  const flyoutItem = flyout ? navItems.find(i => i.labelKey === flyout.key) : null;

  return (
    <TooltipProvider delayDuration={0} disableHoverableContent>
      <button onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 bg-sidebar text-sidebar-foreground p-2 rounded-lg shadow-lg" style={{display: window.innerWidth < 768 ? 'block' : 'none'}}>
        <Menu className="w-5 h-5" />
      </button>

      {isMobileViewport && mobileOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}

      {!isMobileViewport && (
        <button
          onClick={() => { setCollapsed((v) => !v); setExpandedMenus({}); setFlyout(null); }}
          className="fixed top-5 z-[60] hidden md:flex w-6 h-6 rounded-full bg-sidebar border border-sidebar-border shadow-md items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground"
          style={{ left: collapsed ? "3.25rem" : "15.25rem", transitionProperty: "left, color", transitionDuration: "300ms" }}
          title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}>
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}

      <aside className={cn(
        "fixed top-0 left-0 h-full bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-all duration-300 overflow-y-auto scrollbar-thin",
        collapsed ? "w-16" : "w-64",
        isMobileViewport ? (mobileOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
      )}>
        <div className={cn("p-4 flex items-center justify-between", collapsed && "justify-center")}>
          <div className="flex items-center gap-3">
            <Link to="/" className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity" onClick={() => setMobileOpen(false)}>
              <Activity className="w-5 h-5 text-white" />
            </Link>
            {!collapsed && (
              <div>
                <Link to="/" className="text-base font-bold tracking-tight hover:opacity-80 transition-opacity">Turkonix</Link>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={() => setMobileOpen(false)} className="md:hidden text-sidebar-foreground/60">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <SidebarProfile collapsed={collapsed} />

        {!collapsed && favoriteItems.length > 0 && (
          <div className="px-3 mb-3">
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest px-2 mb-1">Favoriler</p>
            <div className="space-y-0.5">
              {favoriteItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.labelKey} to={item.path} onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                      isActive ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                    {t(item.labelKey)}
                    <button
                      onClick={(e) => toggleFavorite(e, item.labelKey)}
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-sidebar-accent"
                      title="Favorilerden cıkar">
                      <X className="w-3 h-3 text-sidebar-foreground/40" />
                    </button>
                  </Link>
                );
              })}
            </div>
            <div className="mt-2 border-t border-sidebar-border/20" />
          </div>
        )}

        <nav className="flex-1 px-2 space-y-1 mt-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isMenuExpanded = expandedMenus[item.labelKey];
            const hasChildren = item.children && item.children.length > 0;
            const showMessageBadge = item.labelKey === "messages" && unreadMessageCount > 0;
            const myWorkspaceTotal = unreadTodoCount + unreadMessageCount + pendingLeaveCount + pendingExpenseCount;
            const showTodoBadge = item.labelKey === "my_workspace" && myWorkspaceTotal > 0;
            const showHrBadge = item.labelKey === "hr" && (pendingLeaveCount > 0 || pendingExpenseIKCount > 0);
            const showMyLeaveBadge = false;
            const supportTotal = unreadMessageCount + unreadTodoCount + pendingLeaveCount + pendingExpenseCount;
            const showSupportBadge = item.labelKey === "support_center" && supportTotal > 0;
            const showJTBadge = item.labelKey === "is_takibi" && assignedTicketCount > 0;
            const showStokBadge = item.labelKey === "stok_yonetimi" && stokUyariCount > 0;
            const anyBadge = showTodoBadge || showHrBadge || showMyLeaveBadge || showSupportBadge || showJTBadge || showStokBadge;

            return (
              <div key={item.labelKey}>
                {hasChildren ? (
                  collapsed ? (
                    <button
                      onMouseEnter={(e) => openFlyout(item.labelKey, e.currentTarget)}
                      onMouseLeave={scheduleCloseFlyout}
                      onClick={(e) => (flyout?.key === item.labelKey ? setFlyout(null) : openFlyout(item.labelKey, e.currentTarget))}
                      className={cn(
                        "w-full flex items-center justify-center px-2 py-3 rounded-xl transition-all duration-200 relative",
                        isActive || flyout?.key === item.labelKey
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25"
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}>
                      <item.icon className="w-5 h-5 shrink-0" />
                      {anyBadge && <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />}
                    </button>
                  ) : (
                    <button onClick={() => toggleMenu(item.labelKey)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200 relative text-xs",
                        isActive || isMenuExpanded ?
                          "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25" :
                          "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}>
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span>{t(item.labelKey)}</span>
                      {showTodoBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full">{myWorkspaceTotal}</span>}
                      {showHrBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full">{pendingLeaveCount + pendingExpenseIKCount}</span>}
                      {showSupportBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-purple-500 text-white text-xs font-bold rounded-full">{supportTotal}</span>}
                      {showJTBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-teal-500 text-white text-xs font-bold rounded-full">{assignedTicketCount}</span>}
                      {showStokBadge && <span className="ml-auto flex items-center justify-center min-w-5 h-5 px-1 bg-orange-500 text-white text-xs font-bold rounded-full">{stokUyariCount}</span>}
                      <ChevronDown className={cn("ml-auto w-4 h-4 transition-transform shrink-0", isMenuExpanded && "rotate-180")} />
                    </button>
                  )
                ) : (
                  collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link to={item.path} onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center justify-center px-2 py-3 rounded-xl transition-all duration-200 relative",
                            isActive ?
                              "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25" :
                              "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          )}>
                          <item.icon className="w-5 h-5 shrink-0" />
                          {showMessageBadge && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-slate-900 text-white border-slate-800">{t(item.labelKey)}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link to={item.path} onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative",
                        isActive ?
                          "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25" :
                          "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}>
                      <item.icon className="w-5 h-5 shrink-0" />
                      {t(item.labelKey)}
                      {showMessageBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">{unreadMessageCount}</span>}
                    </Link>
                  )
                )}
                {hasChildren && isMenuExpanded && !collapsed && (
                  <div className="space-y-1 pl-4 mt-1 border-l-2 border-sidebar-accent">
                    {item.children.map(renderNavChild)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={cn("px-2 py-2 border-t border-sidebar-border/30 space-y-1", collapsed && "px-1")}>
          {(collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/yardim" onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center px-2 py-2.5 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-900 text-white border-slate-800">Yardım</TooltipContent>
            </Tooltip>
          ) : (
            <Link to="/yardim" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Yardım</span>
            </Link>
          ))}
          {(collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={logout}
                  className="w-full flex items-center justify-center px-2 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors">
                  <LogOut className="w-4 h-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-900 text-white border-slate-800">Çıkış</TooltipContent>
            </Tooltip>
          ) : (
            <button onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors">
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Çıkış</span>
            </button>
          ))}
        </div>
      </aside>

      {flyout && flyoutItem && (
        <div
          onMouseEnter={cancelCloseFlyout}
          onMouseLeave={scheduleCloseFlyout}
          className="fixed z-[70] w-56 bg-card text-foreground border border-border rounded-xl shadow-2xl py-1.5 overflow-y-auto scrollbar-thin"
          style={{
            left: "3.5rem",
            top: Math.max(8, Math.min(flyout.top, (typeof window !== "undefined" ? window.innerHeight : 800) - 360)),
            maxHeight: "calc(100vh - 16px)",
          }}>
          <p className="px-3 pt-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t(flyoutItem.labelKey)}</p>
          {renderFlyoutTree(flyoutItem.children)}
        </div>
      )}
    </TooltipProvider>
  );
}
