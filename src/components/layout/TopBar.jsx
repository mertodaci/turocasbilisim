import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";

import { Sun, Moon, Monitor, Bell, CheckSquare, MessageCircle, Umbrella, ClipboardList, CloudSun, CloudRain, CloudSnow, Cloud, CloudLightning, CloudFog } from "lucide-react";
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

// İstanbul sabit konum — Open-Meteo, API anahtarı gerektirmez.
const ISTANBUL_LAT = 41.0082;
const ISTANBUL_LON = 28.9784;

// WMO hava kodu -> ikon/kısa Türkçe açıklama (https://open-meteo.com/en/docs)
function weatherFromCode(code) {
  if (code === 0) return { icon: Sun, label: "Açık" };
  if ([1, 2].includes(code)) return { icon: CloudSun, label: "Parçalı bulutlu" };
  if (code === 3) return { icon: Cloud, label: "Bulutlu" };
  if ([45, 48].includes(code)) return { icon: CloudFog, label: "Sisli" };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: CloudRain, label: "Yağmurlu" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: CloudSnow, label: "Karlı" };
  if ([95, 96, 99].includes(code)) return { icon: CloudLightning, label: "Fırtınalı" };
  return { icon: Cloud, label: "" };
}

function WeatherWidget() {
  const { data } = useQuery({
    queryKey: ["weather-istanbul"],
    queryFn: async () => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${ISTANBUL_LAT}&longitude=${ISTANBUL_LON}&current_weather=true`
      );
      if (!res.ok) throw new Error("weather fetch failed");
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 dakika
    retry: 1,
  });

  const current = data?.current_weather;
  if (!current) return null;

  const { icon: Icon, label } = weatherFromCode(current.weathercode);

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2 text-sm text-muted-foreground" title={label}>
      <Icon className="w-4 h-4 text-amber-500" />
      <span className="font-medium text-foreground">{Math.round(current.temperature)}°C</span>
      <span className="text-xs">İstanbul</span>
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
        <WeatherWidget />
        <LanguageSelector />
        <ThemeToggle />
        <NotificationBell />
      </div>
    </div>
  );
}