import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";

import { Sun, Moon, Monitor, Bell, CheckSquare, MessageCircle, Umbrella, LogOut, UserCircle2, ChevronDown, ClipboardList } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";



import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useMessages, useTodos, useLeave, useExpense, useWorkTasks, useTQNotifications } from "@/lib/NotificationContext";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";

const themes = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

function NotificationBell() {
  const { unreadMessageCount } = useMessages();
  const { unreadTodoCount } = useTodos();
  const { pendingLeaveCount } = useLeave();
  const { pendingExpenseCount, pendingExpenseIKCount } = useExpense();
  const { pendingWorkTaskCount } = useWorkTasks();
  const { assignedTicketCount } = useTQNotifications();
  const { user } = useAuth();

  const isPrivileged = user?.role === "admin" || user?.role === "yonetici";
  const total = unreadMessageCount + unreadTodoCount + (isPrivileged ? pendingLeaveCount : 0) + pendingWorkTaskCount + assignedTicketCount + (isPrivileged ? pendingExpenseIKCount : pendingExpenseCount);

  // Yeni bir bildirim gelince zil birkac saniyeligine "sallaniyor" -- boylece
  // uygulama icindeyken de (baska sekmeye gecmeden) yeni bir sey geldigini
  // fark etmek icin zile tiklamaya gerek kalmiyor.
  const prevTotalRef = useRef(total);
  const [justUpdated, setJustUpdated] = useState(false);
  useEffect(() => {
    if (total > prevTotalRef.current) {
      setJustUpdated(true);
      const timer = setTimeout(() => setJustUpdated(false), 4000);
      prevTotalRef.current = total;
      return () => clearTimeout(timer);
    }
    prevTotalRef.current = total;
  }, [total]);

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setOpen(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const items = [
    unreadMessageCount > 0 && { label: "Okunmamış mesaj", count: unreadMessageCount, path: "/mesajlar", icon: MessageCircle, color: "text-red-500" },
    unreadTodoCount > 0 && { label: "Bekleyen görev", count: unreadTodoCount, path: "/yapilacaklar", icon: CheckSquare, color: "text-blue-500" },
    isPrivileged && pendingLeaveCount > 0 && { label: "Bekleyen izin talebi", count: pendingLeaveCount, path: "/izin-talepleri", icon: Umbrella, color: "text-orange-500" },
    pendingWorkTaskCount > 0 && { label: "Bekleyen iş görevi", count: pendingWorkTaskCount, path: "/is-takip", icon: ClipboardList, color: "text-purple-500" },
    assignedTicketCount > 0 && { label: "Atanan TaskQube bileti", count: assignedTicketCount, path: "/taskqube-v3/tickets", icon: ClipboardList, color: "text-teal-500" },
    isPrivileged && pendingExpenseIKCount > 0 && { label: "Bekleyen harcama onayı", count: pendingExpenseIKCount, path: "/ik-harcama-yonetimi", icon: ClipboardList, color: "text-amber-500" },
    !isPrivileged && pendingExpenseCount > 0 && { label: "Bekleyen harcamam", count: pendingExpenseCount, path: "/harcamalar", icon: ClipboardList, color: "text-amber-500" },
  ].filter(Boolean);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-muted transition-colors"
      >
        <Bell className={cn("w-5 h-5 text-muted-foreground", justUpdated && "animate-bounce text-indigo-600")} />
        {justUpdated && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-400 animate-ping" />
        )}
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-card border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-semibold">Bildirimler</p>
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Yeni bildirim yok
              </div>
            ) : (
              <div className="divide-y">
                {items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <item.icon className={cn("w-4 h-4", item.color)} />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.count} adet</p>
                    </div>
                    <span className={cn("ml-auto text-sm font-bold", item.color)}>{item.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-xl p-1">
      {themes.map(({ value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            theme === value
              ? "bg-card shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <Select value={language} onValueChange={setLanguage}>
      <SelectTrigger className="w-16 h-9 text-sm font-semibold">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="tr" className="text-base font-semibold">TR</SelectItem>
        <SelectItem value="en" className="text-base font-semibold">EN</SelectItem>
      </SelectContent>
    </Select>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) { const t = setTimeout(() => setOpen(false), 5000); return () => clearTimeout(t); } }, [open]);

  const { data: employeeRecord } = useQuery({
    queryKey: ["topbar-employee", user?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0],
  });

  const roleLabels = { admin: "Admin", yonetici: "Yönetici", kullanici: "Kullanıcı" };
  const roleLabel = roleLabels[user?.role] || user?.role || "";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {employeeRecord?.avatar_url ? (
            <img src={employeeRecord.avatar_url} alt={user?.full_name} className="w-full h-full object-cover" />
          ) : (
            <UserCircle2 className="w-4 h-4 text-primary" />
          )}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold leading-tight text-foreground">{user?.full_name || user?.email}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{roleLabel}</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-card border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-semibold truncate">{user?.full_name || "Kullanıcı"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <p className="text-xs text-primary font-medium mt-0.5">{roleLabel}</p>
            </div>
            <div className="p-1">
              <Link
                to="/profil"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
              >
                <UserCircle2 className="w-4 h-4 text-muted-foreground" />
                Profilim
              </Link>
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TopBar() {
  return (
    <div className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 gap-2 relative z-50">
      <div className="text-sm font-semibold text-foreground truncate min-w-0 hidden md:block">
        Turocas Bilişim – Sektöre Özel Yazılım Çözümleri
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <LanguageSelector />
        <ThemeToggle />
        <NotificationBell />
        <div className="w-px h-6 bg-border mx-1" />
        <UserMenu />
      </div>
    </div>
  );
}