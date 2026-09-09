import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Activity, Umbrella, ClipboardList, Ticket, Phone, Mail, User } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS = {
  kritik: "bg-red-500",
  yuksek: "bg-orange-500",
  orta: "bg-amber-400",
  dusuk: "bg-green-500",
};

const PRIORITY_LABELS = {
  kritik: "Kritik",
  yuksek: "Yüksek",
  orta: "Orta",
  dusuk: "Düşük",
};

const activityTypeLabels = {
  telefon_gorusmesi: "Telefon Görüşmesi",
  ofis_toplantisi: "Ofis Toplantısı",
  musteri_toplantisi: "Müşteri Toplantısı",
  saha_ziyareti: "Saha Ziyareti",
  rapor_yazimi: "Rapor Yazımı",
  email_yazisma: "E-posta Yazışma",
  egitim: "Eğitim",
  sunum: "Sunum",
  taskqube: "TaskQube",
  test: "Test",
  analiz: "Analiz",
  diger: "Diğer",
};

const leaveTypeLabels = {
  yillik_izin: "Yıllık İzin",
  hastalik_izni: "Hastalık İzni",
  mazeret_izni: "Mazeret İzni",
  ucretsiz_izin: "Ücretsiz İzin",
  dogum_izni: "Doğum İzni",
  babalik_izni: "Babalık İzni",
  egitim_izni: "Eğitim İzni",
  dugun_izni: "Düğün İzni",
  olum_izni: "Vefat İzni",
};

const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function CalendarV2() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Employee kaydı
  const { data: employeeRecord } = useQuery({
    queryKey: ["my-employee", user?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (d) => d[0],
  });
  const { data: positionDefs = [] } = useQuery({ queryKey: ["definitions", "pozisyon"], queryFn: () => flowApi.entities.Definition.filter({ category: "pozisyon", is_active: true }) });
  const { data: departmentDefs = [] } = useQuery({ queryKey: ["definitions", "departman"], queryFn: () => flowApi.entities.Definition.filter({ category: "departman", is_active: true }) });

  // Aktiviteler
  const { data: activities = [] } = useQuery({
    queryKey: ["cal2-activities", employeeRecord?.id],
    queryFn: () => flowApi.entities.Activity.filter({ employee_id: employeeRecord.id }),
    enabled: !!employeeRecord?.id,
  });

  // Onaylı izinler
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["cal2-leaves", user?.email],
    queryFn: () => flowApi.entities.LeaveRequest.filter({ employee_email: user.email, status: "onaylandi" }),
    enabled: !!user?.email,
  });

  // İş görevleri
  const { data: workTasks = [] } = useQuery({
    queryKey: ["cal2-worktasks", employeeRecord?.id],
    queryFn: () => flowApi.entities.WorkTask.filter({ assigned_to_id: employeeRecord?.id }),
    enabled: !!employeeRecord?.id,
  });

  // TaskQube biletleri — /me/tickets hem tekil (assigned_to_id) hem coklu
  // (assigned_to_ids) atamalari kapsar, kapali durumlari haric tutar.
  const { data: tickets = [] } = useQuery({
    queryKey: ["cal2-tickets", employeeRecord?.id],
    queryFn: () => fetch("/api/auth/me/tickets", { credentials: "include" }).then((r) => r.json()),
    enabled: !!employeeRecord?.id,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  // Takvim grid
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(addDays(monthEnd, 1), { weekStartsOn: 1 });
  const days = [];
  let d = calendarStart;
  while (d <= calendarEnd) { days.push(d); d = addDays(d, 1); }

  const getEventsForDay = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return {
      activities: activities.filter((a) => a.date === dateStr),
      leaves: leaveRequests.filter((l) => dateStr >= l.start_date && dateStr <= l.end_date),
      workTasks: workTasks.filter((t) => t.due_date === dateStr || t.start_date === dateStr),
      tickets: tickets.filter((t) => t.due_date === dateStr),
    };
  };

  const selectedEvents = getEventsForDay(selectedDay);
  const allSelectedEvents = [
    ...selectedEvents.activities.map((e) => ({ ...e, _type: "activity" })),
    ...selectedEvents.leaves.map((e) => ({ ...e, _type: "leave" })),
    ...selectedEvents.workTasks.map((e) => ({ ...e, _type: "worktask" })),
    ...selectedEvents.tickets.map((e) => ({ ...e, _type: "ticket" })),
  ];

  // Sol panel için yaklaşan etkinlikler (bugünden itibaren 14 gün)
  const today = new Date();
  const upcomingActivities = activities
    .filter((a) => a.date >= format(today, "yyyy-MM-dd"))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const openTickets = tickets.filter((t) => t.status !== "sonuclanan" && t.status !== "iptal" && t.status !== "arsivlendi");
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");
  const monthActivityCount = activities.filter((a) => a.date >= monthStartStr && a.date <= monthEndStr).length;

  const dayOfWeekTR = format(selectedDay, "EEEE", { locale: tr });
  const dayNum = format(selectedDay, "d");
  const monthYearTR = format(selectedDay, "MMMM yyyy", { locale: tr });

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 bg-background overflow-hidden rounded-2xl border border-border/50 shadow-sm">

      {/* SOL PANEL */}
      <div className="w-72 flex-shrink-0 border-r border-border/50 flex flex-col bg-card overflow-y-auto">

        {/* Kişi Kartı */}
        <div className="p-4 border-b border-border/30">
          <div className="flex flex-col items-center text-center">
            {employeeRecord?.avatar_url ? (
              <img
                src={employeeRecord.avatar_url}
                alt={employeeRecord.full_name}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20 mb-3"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 ring-2 ring-primary/20">
                <User className="w-7 h-7 text-primary" />
              </div>
            )}
            <p className="text-sm font-bold text-foreground">{employeeRecord?.full_name || user?.full_name || "—"}</p>
            {employeeRecord?.position && (
              <p className="text-xs text-primary font-medium mt-0.5">{positionDefs.find(d => d.value === employeeRecord.position)?.label || employeeRecord.position}</p>
            )}
            {employeeRecord?.department && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{departmentDefs.find(d => d.value === employeeRecord.department)?.label || employeeRecord.department}</p>
            )}
            <div className="flex flex-col gap-1 mt-3 w-full">
              {employeeRecord?.phone && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{employeeRecord.phone}</span>
                </div>
              )}
              {employeeRecord?.email && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{employeeRecord.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mini Takvim Başlık */}
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: tr })}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Mini takvim grid */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((wd) => (
              <div key={wd} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {wd[0]}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((day, i) => {
              const { activities: da, leaves: dl, workTasks: dw, tickets: dt } = getEventsForDay(day);
              const hasEvents = da.length + dl.length + dw.length + dt.length > 0;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDay);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "relative w-7 h-7 mx-auto flex items-center justify-center rounded-full text-[11px] font-medium transition-all",
                    !isCurrentMonth && "opacity-30",
                    isSelected && "bg-primary text-primary-foreground",
                    isTodayDate && !isSelected && "ring-2 ring-primary text-primary",
                    !isSelected && !isTodayDate && "hover:bg-muted text-foreground",
                  )}
                >
                  {format(day, "d")}
                  {hasEvents && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}
            className="mt-3 w-full text-xs text-center text-primary hover:underline"
          >
            Bugüne dön
          </button>
        </div>

        {/* Aktiviteler */}
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Aktivite</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
              {upcomingActivities.length}
            </span>
          </div>
          {upcomingActivities.length === 0 ? (
            <p className="text-xs text-muted-foreground">Yaklaşan aktivite yok</p>
          ) : (
            <div className="space-y-2">
              {upcomingActivities.map((a) => (
                <Link key={a.id} to="/aktiviteler" className="flex items-start gap-2 hover:opacity-70 transition-opacity">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {activityTypeLabels[a.activity_type] || a.activity_type}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(a.date), "d MMM", { locale: tr })}
                      {a.duration_minutes && ` · ${a.duration_minutes} dk`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* TaskQube Biletleri */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">TaskQube</span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {openTickets.length}
            </span>
          </div>
          {openTickets.length === 0 ? (
            <p className="text-xs text-muted-foreground">Açık bilet yok</p>
          ) : (
            <div className="space-y-2">
              {openTickets.slice(0,5).map((t) => (
                <div key={t.id} className="flex items-start gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", PRIORITY_COLORS[t.priority] || "bg-muted-foreground")} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground">{PRIORITY_LABELS[t.priority] || t.priority}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SAĞ PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* İstatistik Bandı */}
        <div className="px-8 pt-4 pb-0 grid grid-cols-4 gap-3">
          <Link to="/aktiviteler" className="bg-blue-50 dark:bg-blue-950/20 rounded-xl px-3 py-2 text-center hover:bg-blue-100 transition-colors">
            <p className="text-xl font-black text-blue-600">{monthActivityCount}</p>
            <p className="text-[10px] text-muted-foreground">Bu Ay Aktivite</p>
          </Link>
          <Link to="/taskqube-v3/tickets" className="bg-amber-50 dark:bg-amber-950/20 rounded-xl px-3 py-2 text-center hover:bg-amber-100 transition-colors">
            <p className="text-xl font-black text-amber-600">{openTickets.length}</p>
            <p className="text-[10px] text-muted-foreground">Açık Bilet</p>
          </Link>
          <Link to="/is-takip" className="bg-purple-50 dark:bg-purple-950/20 rounded-xl px-3 py-2 text-center hover:bg-purple-100 transition-colors">
            <p className="text-xl font-black text-purple-600">{workTasks.filter(t => t.status !== "tamamlandi" && t.status !== "iptal").length}</p>
            <p className="text-[10px] text-muted-foreground">Görev</p>
          </Link>
          <Link to="/izinlerim" className="bg-green-50 dark:bg-green-950/20 rounded-xl px-3 py-2 text-center hover:bg-green-100 transition-colors">
            <p className="text-xl font-black text-green-600">{leaveRequests.reduce((s, l) => s + (l.day_count || 0), 0)}</p>
            <p className="text-[10px] text-muted-foreground">İzin Günü</p>
          </Link>
        </div>

        {/* Büyük tarih başlık */}
        <div className="px-8 pt-6 pb-4 border-b border-border/30 flex items-end justify-between">
          <div>
            <div className="flex items-end gap-4">
              <span className="text-8xl font-black text-foreground leading-none">{dayNum}</span>
              <div className="pb-2">
                <p className="text-2xl font-semibold text-primary capitalize">{dayOfWeekTR.charAt(0).toUpperCase() + dayOfWeekTR.slice(1)}</p>
                <p className="text-sm text-muted-foreground capitalize">{monthYearTR}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={() => setSelectedDay(addDays(selectedDay, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDay(addDays(selectedDay, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Etkinlik listesi */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
          {allSelectedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <p className="text-sm">Bu gün için etkinlik bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedEvents.activities.map((a) => (
                <Link key={a.id} to="/aktiviteler" className="flex gap-4 items-start group hover:opacity-80 transition-opacity">
                  <div className="w-16 flex-shrink-0 text-right">
                    {a.start_time && <span className="text-xs font-semibold text-foreground">{a.start_time}</span>}
                    {a.duration_minutes && <p className="text-[10px] text-muted-foreground">{a.duration_minutes} dk</p>}
                  </div>
                  <div className="w-1 self-stretch rounded-full bg-blue-400 flex-shrink-0" />
                  <div className="flex-1 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        {activityTypeLabels[a.activity_type] || a.activity_type}
                      </p>
                      <Activity className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    {a.customer_name && <p className="text-xs text-muted-foreground mt-0.5">{a.customer_name}</p>}
                    {a.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.notes}</p>}
                  </div>
                </Link>
              ))}

              {selectedEvents.leaves.map((l) => (
                <div key={l.id} className="flex gap-4 items-start">
                  <div className="w-16 flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-foreground">Tüm gün</span>
                  </div>
                  <div className="w-1 self-stretch rounded-full bg-green-400 flex-shrink-0" />
                  <div className="flex-1 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        {leaveTypeLabels[l.leave_type] || l.leave_type}
                      </p>
                      <Umbrella className="w-3.5 h-3.5 text-green-400" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{l.day_count} gün · Onaylı İzin</p>
                  </div>
                </div>
              ))}

              {selectedEvents.workTasks.map((t) => (
                <Link key={t.id} to="/is-takip" className="flex gap-4 items-start hover:opacity-80 transition-opacity">
                  <div className="w-16 flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-foreground">{t.due_date === format(selectedDay, "yyyy-MM-dd") ? "Son gün" : "Başlangıç"}</span>
                  </div>
                  <div className="w-1 self-stretch rounded-full bg-purple-400 flex-shrink-0" />
                  <div className="flex-1 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{t.title}</p>
                      <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                  </div>
                </Link>
              ))}

              {selectedEvents.tickets.map((t) => (
                <Link key={t.id} to="/taskqube-v3/tickets" className="flex gap-4 items-start hover:opacity-80 transition-opacity">
                  <div className="w-16 flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-foreground">Son gün</span>
                  </div>
                  <div className={cn("w-1 self-stretch rounded-full flex-shrink-0", PRIORITY_COLORS[t.priority] || "bg-amber-400")} />
                  <div className="flex-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{t.title}</p>
                      <Ticket className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.priority && (
                        <span className="text-[10px] font-medium text-amber-600">{PRIORITY_LABELS[t.priority]}</span>
                      )}
                      {t.project_name && <span className="text-[10px] text-muted-foreground">· {t.project_name}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
