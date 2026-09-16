import { Link, useLocation } from "react-router-dom";
import { Star, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useMessages, useTodos, useLeave, useExpense, useJTNotifications, useStokAlerts } from "@/lib/NotificationContext";
import { useLanguage } from "@/lib/LanguageContext";
import { flowApi } from "@/api/flowApiClient";
import { allNavItems } from "./navItems";
import { useRecentlyVisited } from "@/lib/useRecentlyVisited";

// Bir düğümün altındaki tüm tıklanabilir yaprak sayısını özyinelemeli sayar.
function countLeaves(node) {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

// Bir düğümün altındaki tüm yaprakların labelKey'lerini düz bir diziye toplar.
function collectLeafKeys(node) {
  if (!node.children || node.children.length === 0) return [node.labelKey];
  return node.children.flatMap(collectLeafKeys);
}

// Alt navigasyon çubuğu — sol dikey menünün yerini alan tek navigasyon.
// Üst-seviye 8 öğe ikon+etiket olarak sabit barda durur; alt öğesi olan
// gruplar tıklanınca/hover'da yukarı açılan bir "flyout" kartıyla gezilir
// (mekanizma, daraltılmış sidebar için yazılmış flyout'un yeniden kullanımı
// — yalnız yönü sağa değil yukarı).
export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const recentlyVisited = useRecentlyVisited();
  const { unreadMessageCount } = useMessages();
  const { unreadTodoCount } = useTodos();
  const { pendingLeaveCount } = useLeave();
  const { pendingExpenseCount, pendingExpenseIKCount } = useExpense();
  const { assignedTicketCount } = useJTNotifications();
  const { stokUyariCount } = useStokAlerts();
  const { t } = useLanguage();
  const userPerms = user?.permissions || [];
  const userRole = user?.role || "kullanici";

  // TEK DOĞRULUK KAYNAĞI: admin her şeyi görür, diğerleri sadece DB role_permissions.can_view.
  // Kod içi roles dizileri menü görünürlüğünü ETKİLEMEZ (yetki tamamen Yetkilendirme ekranından yönetilir).
  const canViewModule = (moduleKey) => {
    if (userRole === "admin") return true;
    const perm = userPerms.find((p) => p.module === moduleKey);
    return perm ? perm.can_view == 1 : false; // DB'de kayıt yoksa kapalı (fail-closed)
  };

  const [favorites, setFavorites] = useState([]);
  const [flyout, setFlyout] = useState(null); // { key, left, bottom }
  const flyoutTimer = useRef(null);

  useEffect(() => {
    if (!user) return;
    flowApi.auth.getFavorites().then(setFavorites).catch(() => setFavorites([]));
  }, [user]);

  // Gezinince uçan alt-menüyü kapat.
  useEffect(() => { setFlyout(null); }, [location.pathname]);

  const openFlyout = (key, el, hasSubgroups) => {
    clearTimeout(flyoutTimer.current);
    const r = el.getBoundingClientRect();
    const width = hasSubgroups ? Math.min(680, window.innerWidth - 16) : 256; // w-64
    const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - 8 - width));
    const bottom = window.innerHeight - r.top + 12;
    setFlyout({ key, left, bottom });
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
      ? favorites.filter((f) => f !== labelKey)
      : [...favorites, labelKey];
    setFavorites(newFavorites);
    await flowApi.auth.updateFavorites(newFavorites).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["favorites"] });
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

  // Tek satır — hem tekil (alt-grupsuz) kolonlarda hem bir alt-grup
  // kolonunun içinde kullanılır. Rozet + favori yıldızı + sağda ok (›).
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
        <span className="truncate flex-1 min-w-0" title={t(it.labelKey)}>{t(it.labelKey)}</span>
        {showLeaveBadge && <span className="flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full">{pendingLeaveCount}</span>}
        {showExpenseBadge && <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{pendingExpenseCount}</span>}
        {showExpenseIKBadge && <span className="flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{pendingExpenseIKCount}</span>}
        {showJTBadge && <span className="flex items-center justify-center w-5 h-5 bg-teal-500 text-white text-[10px] font-bold rounded-full">{assignedTicketCount}</span>}
        {showMessageBadge && <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full">{unreadMessageCount}</span>}
        {showTodoBadge && <span className="flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full">{unreadTodoCount}</span>}
        {showStokBadge && <span className="flex items-center justify-center min-w-5 h-5 px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full">{stokUyariCount}</span>}
        {active && <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-white/20 shrink-0">şu an</span>}
        <button
          onClick={(e) => toggleFavorite(e, it.labelKey)}
          className={cn("opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted shrink-0", isFav && "opacity-100")}
          title={isFav ? "Favorilerden çıkar" : "Favorilere ekle"}>
          <Star className={cn("w-3.5 h-3.5", isFav ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40")} />
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-current opacity-30 group-hover:opacity-60 shrink-0" />
      </Link>
    );
  };

  // Bir düğümü özyinelemeli render eder — alt-grubu varsa kalın
  // (tıklanamaz) başlık + altında çocuklarını (yine düğüm ya da yaprak
  // olabilir) render eder; yaprak ise tek satırlık tıklanabilir satır.
  // Bu sayede kolonlar (grubun doğrudan çocuğu) kendi içinde bir kat daha
  // alt-gruba sahip olabilir (ör. İnsan Kaynakları > Maaş & Bordro >
  // Tanım/İşlem/Rapor) — 2-seviye gruplarda (Stok, İş Takibi, PDKS)
  // davranış birebir eskisiyle aynı kalır.
  const renderFlyoutNode = (node, depth = 0) => {
    const hasKids = node.children && node.children.length > 0;
    if (!hasKids) return renderFlyoutLeaf(node);
    return (
      <div key={node.labelKey} className={depth > 0 ? "mt-2" : ""}>
        <p className={cn(
          "px-2.5 py-1.5 font-bold uppercase tracking-wide text-muted-foreground",
          depth === 0 ? "text-[11px]" : "text-[10px] opacity-70"
        )}>{t(node.labelKey)}</p>
        <div className="space-y-0.5">{node.children.map((c) => renderFlyoutNode(c, depth + 1))}</div>
      </div>
    );
  };
  const renderFlyoutColumn = (child) => (
    <div key={child.labelKey} className="min-w-[260px]">{renderFlyoutNode(child, 0)}</div>
  );

  const flyoutItem = flyout ? navItems.find((i) => i.labelKey === flyout.key) : null;
  const flyoutHasSubgroups = flyoutItem ? flyoutItem.children.some((c) => c.children && c.children.length > 0) : false;
  const flyoutLeafCount = flyoutItem ? countLeaves(flyoutItem) : 0;
  const flyoutLeafKeys = flyoutItem ? collectLeafKeys(flyoutItem) : [];
  const flyoutRecent = flyoutItem
    ? recentlyVisited.filter((v) => flyoutLeafKeys.includes(v.labelKey)).slice(0, 3)
    : [];

  return (
    <>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-xl rounded-2xl px-2 py-1.5 flex items-center gap-1 overflow-x-auto max-w-[95vw]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const hasChildren = item.children && item.children.length > 0;
          const badgeCount = {
            support_center: unreadMessageCount + unreadTodoCount + pendingLeaveCount + pendingExpenseCount,
            insan_kaynaklari: pendingLeaveCount + pendingExpenseIKCount,
            is_takibi: assignedTicketCount,
            stok_yonetimi: stokUyariCount,
          }[item.labelKey] || 0;
          const isFlyoutOpen = flyout?.key === item.labelKey;

          const itemClasses = cn(
            "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[11px] font-medium transition-all shrink-0 relative min-w-[64px]",
            (isActive || isFlyoutOpen)
              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/25"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          );

          if (!hasChildren) {
            return (
              <Link key={item.labelKey} to={item.path} className={itemClasses}>
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap">{t(item.labelKey)}</span>
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full border-2 border-card">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </Link>
            );
          }
          const itemHasSubgroups = item.children.some((c) => c.children && c.children.length > 0);
          return (
            <button
              key={item.labelKey}
              onMouseEnter={(e) => openFlyout(item.labelKey, e.currentTarget, itemHasSubgroups)}
              onMouseLeave={scheduleCloseFlyout}
              onClick={(e) => (isFlyoutOpen ? setFlyout(null) : openFlyout(item.labelKey, e.currentTarget, itemHasSubgroups))}
              className={itemClasses}>
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">{t(item.labelKey)}</span>
              {badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full border-2 border-card">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {flyout && flyoutItem && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setFlyout(null)} />
          <div
            onMouseEnter={cancelCloseFlyout}
            onMouseLeave={scheduleCloseFlyout}
            className={cn(
              "fixed z-[70] bg-card text-foreground border border-border rounded-2xl shadow-2xl overflow-hidden",
              flyoutHasSubgroups ? "w-[min(92vw,900px)]" : "w-64"
            )}
            style={{ left: flyout.left, bottom: flyout.bottom }}>
            <div className="px-4 pt-3 pb-1">
              <p className="text-sm font-bold text-foreground">
                {t(flyoutItem.labelKey)}
                <span className="ml-1.5 font-normal text-muted-foreground">· {flyoutLeafCount} işlem</span>
              </p>
            </div>
            <div
              className={cn("px-3 pb-3 pt-1 max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-thin", flyoutHasSubgroups && "grid gap-x-4 gap-y-1")}
              style={flyoutHasSubgroups ? { gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" } : undefined}>
              {flyoutItem.children.map(renderFlyoutColumn)}
            </div>
            {flyoutRecent.length > 0 && (
              <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 px-4 py-2 border-t border-border text-xs text-muted-foreground bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20">
                <span className="shrink-0">Son kullanılan:</span>
                {flyoutRecent.map((v, i) => (
                  <span key={v.path} className="flex items-center gap-1.5">
                    <Link to={v.path} onClick={() => setFlyout(null)} className="text-primary hover:underline">{t(v.labelKey)}</Link>
                    {i < flyoutRecent.length - 1 && <span className="text-muted-foreground/40">·</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
