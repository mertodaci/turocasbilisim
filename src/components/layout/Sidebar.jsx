import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, BarChart3, Activity, Menu, X, CalendarDays, Lightbulb, Building2, ClipboardList, MessageCircle, CheckSquare, Umbrella, FileSpreadsheet, ChevronDown, Wrench, ShieldCheck, ShieldOff, Info, ChevronLeft, ChevronRight, Star, Receipt, Megaphone, TrendingUp, FileText, Trash2, ScrollText, Clock, CreditCard, Wallet, Boxes, Package, Warehouse, Rows3, MapPin, PackageSearch, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";



import { useMessages, useTodos, useLeave, useExpense, useWorkTasks, useTQNotifications } from '@/lib/NotificationContext';

import { useLanguage } from "@/lib/LanguageContext";

import { useRolePermissions } from "@/lib/RolePermissionsContext";

import { flowApi } from "@/api/flowApiClient";

export const allNavItems = [
{ labelKey: "dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "yonetici", "kullanici", "satis"] },
{ labelKey: "yonetici_masasi", path: "/yonetici-masasi", icon: LayoutDashboard, roles: ["admin", "yonetici"] },
{ labelKey: "calendar", path: "/takvim", icon: CalendarDays, roles: ["admin", "yonetici", "kullanici", "ik", "satis", "stajer"] },

{
  labelKey: "taskqube_v3", path: null, icon: ClipboardList, roles: ["admin", "yonetici", "kullanici", "musteri"],
  children: [
    { labelKey: "taskqube_dashboard", path: "/taskqube-v3/dashboard", icon: BarChart3, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "taskqube_projects", path: "/taskqube-v3", icon: Building2, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "taskqube_tickets", path: "/taskqube-v3/tickets", icon: ClipboardList, roles: ["admin", "yonetici", "kullanici", "musteri"] },
    { labelKey: "taskqube_kanban", path: "/taskqube-v3/kanban", icon: CheckSquare, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "taskqube_settings", path: "/taskqube-v3/tanimlar", icon: Wrench, roles: ["admin", "yonetici"] }
  ]
},
{
  labelKey: "support_center", path: null, icon: Wrench, roles: ["admin", "yonetici", "kullanici", "ik", "satis", "stajer"],
  children: [
    { labelKey: "control_panel", path: "/takvim-v2", icon: CalendarDays, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "work_tracking", path: "/is-takip", icon: ClipboardList, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "activities", path: "/aktiviteler", icon: ClipboardList, roles: ["admin", "yonetici", "kullanici", "satis"] },
    { labelKey: "messages", path: "/mesajlar", icon: MessageCircle, roles: ["admin", "yonetici", "kullanici", "ik", "satis", "stajer"] },
    { labelKey: "todos", path: "/yapilacaklar", icon: CheckSquare, roles: ["admin", "yonetici", "kullanici", "satis"] },
    { labelKey: "project_planning", path: "/proje-planlama", icon: BarChart3, roles: ["admin", "yonetici"] },
    { labelKey: "expenses", path: "/harcamalar", icon: FileSpreadsheet, roles: ["admin", "yonetici", "kullanici", "ik", "satis"] },
    { labelKey: "my_leave_requests", path: "/izinlerim", icon: Umbrella, roles: ["admin", "yonetici", "kullanici", "ik", "satis", "stajer"] },
  ]
},
{
  labelKey: "hr", path: null, icon: Users, roles: ["admin", "yonetici", "kullanici"],
  children: [
    { labelKey: "employees", path: "/calisanlar", icon: Users, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "ik_leave_requests", path: "/ik-izin-yonetimi", icon: Umbrella, roles: ["admin", "yonetici"] },
    { labelKey: "ik_expense_requests", path: "/ik-harcama-yonetimi", icon: Receipt, roles: ["admin", "yonetici", "ik"] },
    { labelKey: "leave_allowances", path: "/izin-haklari", icon: CalendarDays, roles: ["admin", "yonetici"] },
    { labelKey: "leave_types", path: "/izin-turleri", icon: CalendarDays, roles: ["admin", "yonetici"] },
    { labelKey: "employee_report", path: "/calisan-raporu", icon: FileSpreadsheet, roles: ["admin", "yonetici", "ik"] },
    {
      labelKey: "pdks", path: null, icon: Clock, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "personel_hareketleri", path: "/personel-hareketleri", icon: Clock, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "pdks_kart_yonetimi", path: "/kart-yonetimi", icon: CreditCard, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    { labelKey: "org_chart", path: "/org-sema", icon: Users, roles: ["admin", "yonetici", "ik"] }
  ]
},
{
  labelKey: "musteriler_menu", path: null, icon: Building2, roles: ["admin", "yonetici", "satis"],
  children: [
    { labelKey: "customers", path: "/musteriler", icon: Building2, roles: ["admin", "yonetici", "satis"] },
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
  labelKey: "satis", path: null, icon: TrendingUp, roles: ["admin", "yonetici", "satis"],
  children: [
    { labelKey: "satis_masasi", path: "/satis-raporlari", icon: BarChart3, roles: ["admin", "yonetici", "satis"] },
    { labelKey: "satis_aktivite_ekle", path: "/satis-aktivite-ekle", icon: ClipboardList, roles: ["admin", "yonetici", "satis"] },
    { labelKey: "satis_teklifleri", path: "/satis-teklifleri", icon: FileText, roles: ["admin", "yonetici", "satis"] }
  ]
},
{
  labelKey: "reports", path: null, icon: BarChart3, roles: ["admin", "yonetici", "kullanici", "ik"],
  children: [

    { labelKey: "quick_report", path: "/hizli-rapor", icon: FileSpreadsheet, roles: ["admin", "yonetici", "kullanici", "ik"] }
  ]
},
{
  labelKey: "system_admin", path: null, icon: ShieldCheck, roles: ["admin", "yonetici", "kullanici", "ik", "stajer"],
  children: [
    { labelKey: "users", path: "/kullanicilar", icon: Users, roles: ["admin", "yonetici", "kullanici", "ik", "stajer", "musteri"] },
    { labelKey: "role_permissions", path: "/yetkilendirme", icon: ShieldCheck, roles: ["admin"] },
    { labelKey: "definitions", path: "/tanimlar", icon: Wrench, roles: ["admin", "yonetici", "kullanici", "ik", "stajer", "musteri"] },
    { labelKey: "cop_kutusu", path: "/cop-kutusu", icon: Trash2, roles: ["admin"] },
    { labelKey: "denetim_kaydi", path: "/denetim-kaydi", icon: ScrollText, roles: ["admin"] },
    { labelKey: "oturum_yonetimi", path: "/oturum-yonetimi", icon: ShieldOff, roles: ["admin", "yonetici"] },
    { labelKey: "announcements", path: "/duyurular", icon: Megaphone, roles: ["admin", "yonetici"] },
    { labelKey: "app_version", path: "/versiyon", icon: Info, roles: ["admin", "yonetici", "kullanici", "ik", "stajer", "musteri"] }
  ]
},
{
  labelKey: "ideas", path: "/fikirler", icon: Lightbulb, roles: ["admin", "yonetici", "kullanici"]
},
{
  labelKey: "stok_yonetimi", path: null, icon: Boxes, roles: ["admin", "yonetici", "kullanici"],
  children: [
    { labelKey: "stok_urunler", path: "/stok/urunler", icon: Package, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "stok_gruplar", path: "/stok/gruplar", icon: FileText, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "stok_depolar", path: "/stok/depolar", icon: Warehouse, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "stok_raflar", path: "/stok/raflar", icon: Rows3, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "stok_urun_raf", path: "/stok/urun-raf", icon: PackageSearch, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "stok_sahalar", path: "/stok/sahalar", icon: MapPin, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "stok_tedarikciler", path: "/stok/tedarikciler", icon: Building2, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "stok_giris", path: "/stok/giris", icon: ArrowDownToLine, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "stok_cikis", path: "/stok/cikis", icon: ArrowUpFromLine, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "stok_transfer", path: "/stok/transfer", icon: ArrowLeftRight, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "stok_fisler", path: "/stok/fisler", icon: FileText, roles: ["admin", "yonetici", "kullanici"] },
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

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const checkViewport = () => setIsMobileViewport(window.innerWidth < 768);
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);
  const { user } = useAuth();
  const { unreadMessageCount } = useMessages();
  const { unreadTodoCount } = useTodos();
  const { pendingLeaveCount } = useLeave();
  const { pendingExpenseCount, pendingExpenseIKCount } = useExpense();
  const { assignedTicketCount } = useTQNotifications();
  const { pendingWorkTaskCount } = useWorkTasks();
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
    if (collapsed) {
      setCollapsed(false);
      setExpandedMenus({ [labelKey]: true });
      return;
    }
    setExpandedMenus((prev) => ({ ...prev, [labelKey]: !prev[labelKey] }));
  };

  const renderChildLink = (child) => {
    const isChildActive = location.pathname === child.path;
    const childShowLeaveBadge = (child.labelKey === "leave_requests" || child.labelKey === "my_leave_requests" || child.labelKey === "ik_leave_requests") && pendingLeaveCount > 0;
    const childShowExpenseBadge = child.labelKey === "expenses" && pendingExpenseCount > 0;
    const childShowExpenseIKBadge = child.labelKey === "ik_expense_requests" && pendingExpenseIKCount > 0;
    const childShowTQBadge = child.labelKey === "taskqube_tickets" && assignedTicketCount > 0;
    const childShowMessageBadge = child.labelKey === "messages" && unreadMessageCount > 0;
    const childShowTodoBadge = child.labelKey === "todos" && unreadTodoCount > 0;
    const childShowWorkTaskBadge = child.labelKey === "work_tracking" && pendingWorkTaskCount > 0;
    const isFav = favorites.includes(child.labelKey);

    return (
      <Link key={child.path} to={child.path} onClick={() => setMobileOpen(false)}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",
          isChildActive
            ? "bg-sidebar-primary/15 text-sidebar-primary"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}>
        <child.icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{t(child.labelKey)}</span>
        {childShowLeaveBadge && <span className="flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full">{pendingLeaveCount}</span>}
            {childShowExpenseBadge && <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full">{pendingExpenseCount}</span>}
            {childShowExpenseIKBadge && <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full">{pendingExpenseIKCount}</span>}
        {childShowTQBadge && <span className="flex items-center justify-center w-5 h-5 bg-teal-500 text-white text-xs font-bold rounded-full">{assignedTicketCount}</span>}
        {childShowMessageBadge && <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">{unreadMessageCount}</span>}
        {childShowTodoBadge && <span className="flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full">{unreadTodoCount}</span>}
        {childShowWorkTaskBadge && <span className="flex items-center justify-center w-5 h-5 bg-purple-500 text-white text-xs font-bold rounded-full">{pendingWorkTaskCount}</span>}
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
  return (
    <>
      <button onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 bg-sidebar text-sidebar-foreground p-2 rounded-lg shadow-lg" style={{display: window.innerWidth < 768 ? 'block' : 'none'}}>
        <Menu className="w-5 h-5" />
      </button>

      {isMobileViewport && mobileOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}

      <aside className={cn(
        "fixed top-0 left-0 h-full bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-all duration-300 overflow-y-auto scrollbar-thin",
        collapsed ? "w-16" : "w-64",
        isMobileViewport ? (mobileOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
      )}>
        <div className={cn("p-4 flex items-center justify-between", collapsed && "justify-center")}>
          <div className="flex items-center gap-3">
            <Link to="/" className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity" onClick={() => setMobileOpen(false)}>
              <Activity className="w-5 h-5 text-sidebar-primary-foreground" />
            </Link>
            {!collapsed && (
              <div>
                <Link to="/" className="text-base font-bold tracking-tight hover:opacity-80 transition-opacity">Turocas</Link>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={() => setMobileOpen(false)} className="md:hidden text-sidebar-foreground/60">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className={cn("hidden md:flex px-3 mb-2", collapsed ? "justify-center" : "justify-end")}>
          <button
            onClick={() => { setCollapsed(!collapsed); if (!collapsed) setExpandedMenus({}); }}
            className="p-1.5 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title={collapsed ? "Menuyu Genislet" : "Menuyu Daralt"}>
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!collapsed && favoriteItems.length > 0 && (
          <div className="px-3 mb-3">
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest px-2 mb-1">Favoriler</p>
            <div className="space-y-0.5">
              {favoriteItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isFav = favorites.includes(item.labelKey);
                return (
                  <Link key={item.labelKey} to={item.path} onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                      isActive ? "bg-sidebar-primary/20 text-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
            const supportTotal = pendingWorkTaskCount + unreadMessageCount + unreadTodoCount + pendingLeaveCount + pendingExpenseCount;
            const showSupportBadge = item.labelKey === "support_center" && supportTotal > 0;
            const showTQBadge = item.labelKey === "taskqube_v3" && assignedTicketCount > 0;

            return (
              <div key={item.labelKey}>
                {hasChildren ? (
                  <button onClick={() => toggleMenu(item.labelKey)}
                    title={collapsed ? t(item.labelKey) : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200 relative text-xs",
                      collapsed && "justify-center px-2",
                      isActive || isMenuExpanded ?
                        "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25" :
                        "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span>{t(item.labelKey)}</span>
                        {showTodoBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full">{myWorkspaceTotal}</span>}
                        {showHrBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full">{pendingLeaveCount + pendingExpenseIKCount}</span>}
                        {showMyLeaveBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full">{pendingLeaveCount}</span>}
                        {showSupportBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-purple-500 text-white text-xs font-bold rounded-full">{supportTotal}</span>}
                        {showTQBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-teal-500 text-white text-xs font-bold rounded-full">{assignedTicketCount}</span>}
                        <ChevronDown className={cn("ml-auto w-4 h-4 transition-transform shrink-0", isMenuExpanded && "rotate-180")} />
                      </>
                    )}
                    {collapsed && (showTodoBadge || showHrBadge || showMyLeaveBadge || showSupportBadge || showTQBadge) && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
                    )}
                  </button>
                ) : (
                  <Link to={item.path} onClick={() => setMobileOpen(false)}
                    title={collapsed ? t(item.labelKey) : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative",
                      collapsed && "justify-center px-2",
                      isActive ?
                        "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25" :
                        "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && (
                      <>
                        {t(item.labelKey)}
                        {showMessageBadge && <span className="ml-auto flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">{unreadMessageCount}</span>}
                      </>
                    )}
                  </Link>
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

        {!collapsed && (
          <div className="px-6 py-4 border-t border-sidebar-border/30">
            <p className="text-[10px] text-sidebar-foreground/30 text-center">Turocas v3.0</p>
          </div>
        )}
      </aside>
    </>
  );
}
