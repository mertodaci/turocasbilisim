import { Link, useLocation } from "react-router-dom";
import { Star, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useMessages, useTodos, useLeave, useExpense, useJTNotifications, useStokAlerts } from "@/lib/NotificationContext";
import { useLanguage } from "@/lib/LanguageContext";
import { flowApi } from "@/api/flowApiClient";
import { allNavItems } from "./navItems";

// Sağ kenar dikey ray — BottomNav'ın (alt bar) yanında, ikinci/ek bir
// navigasyon yüzeyi. Aynı navItems.js verisini ve aynı görünürlük/rozet/
// favori mantığını kullanır (BottomNav.jsx ile kasıtlı kod tekrarı —
// ikisi bağımsız çalışan iki ayrı navigasyon). Yalnızca masaüstünde
// görünür; dar ekranda yalnız BottomNav kalır.
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
  const [flyout, setFlyout] = useState(null); // { key, right, top }

  useEffect(() => {
    if (!user) return;
    flowApi.auth.getFavorites().then(setFavorites).catch(() => setFavorites([]));
  }, [user]);

  useEffect(() => { setFlyout(null); }, [location.pathname]);

  const openFlyout = (key, el, hasSubgroups) => {
    const r = el.getBoundingClientRect();
    const width = hasSubgroups ? Math.min(680, window.innerWidth - 16) : 256;
    const top = Math.max(8, Math.min(r.top, window.innerHeight - 16 - 40));
    const right = window.innerWidth - r.left + 12;
    setFlyout({ key, right, top, width });
  };

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

  const renderFlyoutLeaf = (it) => {
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
        onClick={() => setFlyout(null)}
        className={cn(
          "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
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

  const renderFlyoutColumn = (child) => {
    const hasKids = child.children && child.children.length > 0;
    if (!hasKids) {
      return <div key={child.labelKey} className="min-w-[180px]">{renderFlyoutLeaf(child)}</div>;
    }
    return (
      <div key={child.labelKey} className="min-w-[180px]">
        <p className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t(child.labelKey)}</p>
        <div className="space-y-0.5">{child.children.map(renderFlyoutLeaf)}</div>
      </div>
    );
  };

  const flyoutItem = flyout ? navItems.find((i) => i.labelKey === flyout.key) : null;
  const flyoutHasSubgroups = flyoutItem ? flyoutItem.children.some((c) => c.children && c.children.length > 0) : false;

  return (
    <>
      <nav className="hidden md:flex fixed right-0 top-16 bottom-0 z-40 w-16 bg-card border-l border-border flex-col items-center gap-1 py-3 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const hasChildren = item.children && item.children.length > 0;
          const showSupportBadge = item.labelKey === "support_center" && (unreadMessageCount + unreadTodoCount + pendingLeaveCount + pendingExpenseCount) > 0;
          const showHrBadge = item.labelKey === "insan_kaynaklari" && (pendingLeaveCount > 0 || pendingExpenseIKCount > 0);
          const showJTBadge = item.labelKey === "is_takibi" && assignedTicketCount > 0;
          const showStokBadge = item.labelKey === "stok_yonetimi" && stokUyariCount > 0;
          const anyBadge = showSupportBadge || showHrBadge || showJTBadge || showStokBadge;
          const isFlyoutOpen = flyout?.key === item.labelKey;

          const itemClasses = cn(
            "relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all shrink-0",
            (isActive || isFlyoutOpen)
              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/25"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          );

          if (!hasChildren) {
            return (
              <Link key={item.labelKey} to={item.path} title={t(item.labelKey)} className={itemClasses}>
                <item.icon className="w-5 h-5" />
                {anyBadge && <span className="absolute top-1 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />}
              </Link>
            );
          }
          const itemHasSubgroups = item.children.some((c) => c.children && c.children.length > 0);
          return (
            <button
              key={item.labelKey}
              title={t(item.labelKey)}
              onClick={(e) => (isFlyoutOpen ? setFlyout(null) : openFlyout(item.labelKey, e.currentTarget, itemHasSubgroups))}
              className={itemClasses}>
              <item.icon className="w-5 h-5" />
              {anyBadge && <span className="absolute top-1 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {flyout && flyoutItem && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setFlyout(null)} />
          <div
            className={cn(
              "fixed z-[70] bg-card text-foreground border border-border rounded-2xl shadow-2xl overflow-hidden",
              flyoutHasSubgroups ? "w-[min(92vw,680px)]" : "w-64"
            )}
            style={{ right: flyout.right, top: flyout.top }}>
            <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
              <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">{t(flyoutItem.labelKey)}</p>
            </div>
            <div
              className={cn("px-3 pb-3 pt-1 max-h-[70vh] overflow-y-auto scrollbar-thin", flyoutHasSubgroups && "grid gap-x-4 gap-y-1")}
              style={flyoutHasSubgroups ? { gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" } : undefined}>
              {flyoutItem.children.map(renderFlyoutColumn)}
            </div>
          </div>
        </>
      )}
    </>
  );
}
