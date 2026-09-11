import { Link, useLocation } from "react-router-dom";
import { Star, Menu, X, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useMessages, useTodos, useLeave, useExpense, useJTNotifications, useStokAlerts } from "@/lib/NotificationContext";
import { useLanguage } from "@/lib/LanguageContext";
import { flowApi } from "@/api/flowApiClient";
import { allNavItems } from "./navItems";

// Sol kenar dikey ray — BottomNav'ın (alt bar) yanında, ikinci/ek bir
// navigasyon yüzeyi. Aynı navItems.js verisini ve aynı görünürlük/rozet/
// favori mantığını kullanır (BottomNav.jsx ile kasıtlı kod tekrarı —
// ikisi bağımsız çalışan iki ayrı navigasyon). Dar hâlde yalnız ikonlar;
// hamburger'e tıklayınca tüm çubuk etiketli geniş panele dönüşür, alt
// gruplar accordion olarak açılır/kapanır. Yalnızca masaüstünde görünür.
export default function SideRail() {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadMessageCount } = useMessages();
  const { unreadTodoCount } = useTodos();
  const { pendingLeaveCount } = useLeave();
  const { pendingExpenseCount, pendingExpenseIKCount } = useExpense();
  const { assignedTicketCount } = useJTNotifications();
  const { stokUyariCount } = useStokAlerts();
  const { t } = useLanguage();
  const userPerms = user?.permissions || [];
  const userRole = user?.role || "kullanici";

  const canViewModule = (moduleKey) => {
    if (userRole === "admin") return true;
    const perm = userPerms.find((p) => p.module === moduleKey);
    return perm ? perm.can_view == 1 : false;
  };

  const [favorites, setFavorites] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [openGroup, setOpenGroup] = useState(null); // { top-level labelKey açık mı }
  const [openSubGroup, setOpenSubGroup] = useState(null); // iç içe (Tanım/İşlem/Rapor gibi) açık alt-grup

  useEffect(() => {
    if (!user) return;
    flowApi.auth.getFavorites().then(setFavorites).catch(() => setFavorites([]));
  }, [user]);

  useEffect(() => {
    setExpanded(false);
    setOpenGroup(null);
    setOpenSubGroup(null);
  }, [location.pathname]);

  const toggleFavorite = async (e, labelKey) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavorites = favorites.includes(labelKey)
      ? favorites.filter((f) => f !== labelKey)
      : [...favorites, labelKey];
    setFavorites(newFavorites);
    await flowApi.auth.updateFavorites(newFavorites).catch(() => {});
  };

  function filterNavTree(items) {
    return items
      .map((item) => ({ ...item, children: item.children ? filterNavTree(item.children) : undefined }))
      .filter((item) => {
        if (item.children) return item.children.length > 0;
        return canViewModule(item.labelKey);
      });
  }
  const navItems = filterNavTree(allNavItems);

  const closeAll = () => {
    setExpanded(false);
    setOpenGroup(null);
    setOpenSubGroup(null);
  };

  const handleGroupClick = (labelKey) => {
    if (!expanded) setExpanded(true);
    setOpenGroup((k) => (k === labelKey ? null : labelKey));
    setOpenSubGroup(null);
  };

  const renderLeaf = (it, depth = 0) => {
    const active = location.pathname === it.path;
    const isFav = favorites.includes(it.labelKey);
    const showLeaveBadge = (it.labelKey === "my_leave_requests" || it.labelKey === "ik_leave_requests") && pendingLeaveCount > 0;
    const showExpenseBadge = it.labelKey === "expenses" && pendingExpenseCount > 0;
    const showExpenseIKBadge = it.labelKey === "ik_expense_requests" && pendingExpenseIKCount > 0;
    const showJTBadge = it.labelKey === "is_takibi_biletler" && assignedTicketCount > 0;
    const showMessageBadge = it.labelKey === "messages" && unreadMessageCount > 0;
    const showTodoBadge = it.labelKey === "todos" && unreadTodoCount > 0;
    const showStokBadge = it.labelKey === "stok_dashboard" && stokUyariCount > 0;
    return (
      <Link key={it.path} to={it.path}
        onClick={closeAll}
        style={{ paddingLeft: `${0.625 + depth * 1}rem` }}
        className={cn(
          "group flex items-center gap-2.5 pr-2.5 py-2 rounded-lg text-sm transition-colors",
          active ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" : "text-foreground/70 hover:bg-muted"
        )}>
        <it.icon className="w-4 h-4 shrink-0" />
        <span className="truncate flex-1">{t(it.labelKey)}</span>
        {showLeaveBadge && <span className="flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full">{pendingLeaveCount}</span>}
        {showExpenseBadge && <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{pendingExpenseCount}</span>}
        {showExpenseIKBadge && <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{pendingExpenseIKCount}</span>}
        {showJTBadge && <span className="flex items-center justify-center w-5 h-5 bg-teal-500 text-white text-[10px] font-bold rounded-full">{assignedTicketCount}</span>}
        {showMessageBadge && <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full">{unreadMessageCount}</span>}
        {showTodoBadge && <span className="flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full">{unreadTodoCount}</span>}
        {showStokBadge && <span className="flex items-center justify-center min-w-5 h-5 px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full">{stokUyariCount}</span>}
        <button
          onClick={(e) => toggleFavorite(e, it.labelKey)}
          className={cn("opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted shrink-0", isFav && "opacity-100")}
          title={isFav ? "Favorilerden çıkar" : "Favorilere ekle"}>
          <Star className={cn("w-3.5 h-3.5", isFav ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40")} />
        </button>
      </Link>
    );
  };

  // İç içe alt-grup (İK'nın Tanım/İşlem/Rapor'u gibi) — kendi accordion'u.
  const renderSubGroup = (child, depth) => {
    const hasKids = child.children && child.children.length > 0;
    if (!hasKids) return renderLeaf(child, depth);
    const isOpen = openSubGroup === child.labelKey;
    return (
      <div key={child.labelKey}>
        <button
          onClick={() => setOpenSubGroup((k) => (k === child.labelKey ? null : child.labelKey))}
          style={{ paddingLeft: `${0.625 + depth * 1}rem` }}
          className="w-full flex items-center gap-2.5 pr-2.5 py-2 rounded-lg text-sm text-foreground/80 hover:bg-muted transition-colors">
          <child.icon className="w-4 h-4 shrink-0" />
          <span className="truncate flex-1 text-left font-semibold text-xs uppercase tracking-wide">{t(child.labelKey)}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", isOpen && "rotate-180")} />
        </button>
        {isOpen && <div className="space-y-0.5">{child.children.map((c) => renderSubGroup(c, depth + 1))}</div>}
      </div>
    );
  };

  return (
    <>
      {expanded && <div className="fixed inset-0 z-30" onClick={closeAll} />}

      <nav className={cn(
        "hidden md:flex fixed left-0 top-16 bottom-0 z-40 bg-card border-r border-border flex-col overflow-y-auto scrollbar-thin transition-[width] duration-200",
        expanded ? "w-64" : "w-16"
      )}>
        <button
          onClick={() => { setExpanded((v) => !v); if (expanded) { setOpenGroup(null); setOpenSubGroup(null); } }}
          className="flex items-center justify-center w-full h-12 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border-b border-border"
          title={expanded ? "Menüyü daralt" : "Menüyü genişlet"}>
          {expanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex-1 py-2 flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const hasChildren = item.children && item.children.length > 0;
            const showSupportBadge = item.labelKey === "support_center" && (unreadMessageCount + unreadTodoCount + pendingLeaveCount + pendingExpenseCount) > 0;
            const showHrBadge = item.labelKey === "insan_kaynaklari" && (pendingLeaveCount > 0 || pendingExpenseIKCount > 0);
            const showJTBadge = item.labelKey === "is_takibi" && assignedTicketCount > 0;
            const showStokBadge = item.labelKey === "stok_yonetimi" && stokUyariCount > 0;
            const anyBadge = showSupportBadge || showHrBadge || showJTBadge || showStokBadge;
            const isGroupOpen = openGroup === item.labelKey;

            const rowClasses = cn(
              "relative flex items-center gap-2.5 rounded-xl transition-all shrink-0",
              expanded ? "w-full h-11 px-2.5" : "w-12 h-12 justify-center mx-auto",
              (isActive || isGroupOpen)
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/25"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            );

            if (!hasChildren) {
              return (
                <Link key={item.labelKey} to={item.path} title={t(item.labelKey)} onClick={closeAll} className={rowClasses}>
                  <item.icon className="w-5 h-5 shrink-0" />
                  {expanded && <span className="truncate text-sm font-medium">{t(item.labelKey)}</span>}
                  {anyBadge && <span className={cn("absolute w-2 h-2 bg-orange-500 rounded-full", expanded ? "top-2 left-7" : "top-1 right-1.5")} />}
                </Link>
              );
            }
            return (
              <div key={item.labelKey}>
                <button title={t(item.labelKey)} onClick={() => handleGroupClick(item.labelKey)} className={rowClasses}>
                  <item.icon className="w-5 h-5 shrink-0" />
                  {expanded && <span className="truncate text-sm font-medium flex-1 text-left">{t(item.labelKey)}</span>}
                  {expanded && <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", isGroupOpen && "rotate-180")} />}
                  {anyBadge && <span className={cn("absolute w-2 h-2 bg-orange-500 rounded-full", expanded ? "top-2 left-7" : "top-1 right-1.5")} />}
                </button>
                {expanded && isGroupOpen && (
                  <div className="mt-0.5 space-y-0.5 pl-1">
                    {item.children.map((c) => renderSubGroup(c, 1))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}
