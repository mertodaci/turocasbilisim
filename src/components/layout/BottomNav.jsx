import { Link, useLocation } from "react-router-dom";
import { Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useMessages, useTodos, useLeave, useExpense, useJTNotifications, useStokAlerts } from "@/lib/NotificationContext";
import { useLanguage } from "@/lib/LanguageContext";
import { flowApi } from "@/api/flowApiClient";
import { allNavItems } from "./navItems";

// Alt navigasyon çubuğu — sol dikey menünün yerini alan tek navigasyon.
// Üst-seviye 8 öğe ikon+etiket olarak sabit barda durur; alt öğesi olan
// gruplar tıklanınca/hover'da yukarı açılan bir "flyout" kartıyla gezilir
// (mekanizma, daraltılmış sidebar için yazılmış flyout'un yeniden kullanımı
// — yalnız yönü sağa değil yukarı).
export default function BottomNav() {
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

  const openFlyout = (key, el) => {
    clearTimeout(flyoutTimer.current);
    const r = el.getBoundingClientRect();
    const width = 224; // w-56
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

  // Bir grubun uçan alt-menüsü — beyaz kart, alt-gruplar tıklanamaz bölüm
  // başlığı olur, leaf'ler tıklanabilir satır (rozet + favori yıldızı dahil).
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
          "group flex items-center gap-2.5 mx-1 px-2.5 py-2 rounded-lg text-sm transition-colors",
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
  });

  const flyoutItem = flyout ? navItems.find((i) => i.labelKey === flyout.key) : null;

  return (
    <>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-xl rounded-2xl px-2 py-1.5 flex items-center gap-1 overflow-x-auto max-w-[95vw]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const hasChildren = item.children && item.children.length > 0;
          const supportTotal = unreadMessageCount + unreadTodoCount + pendingLeaveCount + pendingExpenseCount;
          const showSupportBadge = item.labelKey === "support_center" && supportTotal > 0;
          const showHrBadge = item.labelKey === "insan_kaynaklari" && (pendingLeaveCount > 0 || pendingExpenseIKCount > 0);
          const showJTBadge = item.labelKey === "is_takibi" && assignedTicketCount > 0;
          const showStokBadge = item.labelKey === "stok_yonetimi" && stokUyariCount > 0;
          const anyBadge = showSupportBadge || showHrBadge || showJTBadge || showStokBadge;
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
                {anyBadge && <span className="absolute top-1.5 right-3 w-2 h-2 bg-orange-500 rounded-full" />}
              </Link>
            );
          }
          return (
            <button
              key={item.labelKey}
              onMouseEnter={(e) => openFlyout(item.labelKey, e.currentTarget)}
              onMouseLeave={scheduleCloseFlyout}
              onClick={(e) => (isFlyoutOpen ? setFlyout(null) : openFlyout(item.labelKey, e.currentTarget))}
              className={itemClasses}>
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">{t(item.labelKey)}</span>
              {anyBadge && <span className="absolute top-1.5 right-3 w-2 h-2 bg-orange-500 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {flyout && flyoutItem && (
        <div
          onMouseEnter={cancelCloseFlyout}
          onMouseLeave={scheduleCloseFlyout}
          className="fixed z-[70] w-56 max-h-[70vh] overflow-y-auto scrollbar-thin bg-card text-foreground border border-border rounded-xl shadow-2xl py-1.5"
          style={{ left: flyout.left, bottom: flyout.bottom }}>
          <p className="px-3 pt-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t(flyoutItem.labelKey)}</p>
          {renderFlyoutTree(flyoutItem.children)}
        </div>
      )}
    </>
  );
}
