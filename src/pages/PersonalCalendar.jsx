import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PersonalCalendarDayDetail from "@/components/calendar/PersonalCalendarDayDetail";

export default function PersonalCalendar() {
  const { user } = useAuth();
  // Satis rolunde kisisel aktiviteler sales_activities tablosunda tutuluyor.
  const isSatis = user?.role === "satis";
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Kullanıcının Employee kaydını bul
  const { data: employeeRecord } = useQuery({
    queryKey: ["my-employee", user?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (data) => data[0],
  });

  // Kişisel aktiviteler (employee_id ile) — satış rolünde sales_activities
  const { data: activities = [] } = useQuery({
    queryKey: [isSatis ? "personal-sales-activities" : "personal-activities", employeeRecord?.id],
    queryFn: () => (isSatis ? flowApi.entities.SalesActivity : flowApi.entities.Activity)
      .filter({ employee_id: employeeRecord.id }),
    enabled: !!employeeRecord?.id,
  });

  // Yapılacaklar
  const { data: todos = [] } = useQuery({
    queryKey: ["personal-todos", user?.email],
    queryFn: () => flowApi.entities.Todo.list(),
    enabled: !!user,
  });

  // Onaylanmış izin talepleri (employee_id veya email ile)
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["personal-leaves", user?.email],
    queryFn: () => flowApi.entities.LeaveRequest.filter({ employee_email: user.email, status: "onaylandi" }),
    enabled: !!user?.email,
  });

  // Bana atanan iş görevleri
  const { data: workTasks = [] } = useQuery({
    queryKey: ["personal-work-tasks", user?.id],
    queryFn: () => flowApi.entities.WorkTask.filter({ assigned_to_id: user.id }),
    enabled: !!user?.id,
  });

  // Takvim grid oluştur
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(addDays(monthEnd, 1), { weekStartsOn: 1 });
  const days = [];
  let d = calendarStart;
  while (d <= calendarEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const getEventsForDay = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayActivities = activities.filter((a) => a.date === dateStr);
    const dayTodos = todos.filter((t) => t.due_date === dateStr);
    const dayLeaves = leaveRequests.filter((l) => dateStr >= l.start_date && dateStr <= l.end_date);
    const dayWorkTasks = workTasks.filter((t) => t.due_date === dateStr || t.start_date === dateStr);
    return { activities: dayActivities, todos: dayTodos, leaves: dayLeaves, workTasks: dayWorkTasks };
  };

  const selectedDayEvents = getEventsForDay(selectedDay);
  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Kişisel Takvim
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Yapılacaklar, aktiviteler ve izinlerinizi tek bir takvimde görün
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-36 text-center">
            <span className="text-base font-semibold text-foreground capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: tr })}
            </span>
          </div>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="rounded-xl text-sm" onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}>
            Bugün
          </Button>
        </div>
      </div>

      {/* Renk Açıklamaları */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" />Aktivite</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" />Yapılacak</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" />Onaylı İzin</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500" />İş Görevi</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Takvim Grid */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((wd) => (
              <div key={wd} className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {wd}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const { activities: da, todos: dt, leaves: dl, workTasks: dw } = getEventsForDay(day);
              const totalEvents = da.length + dt.length + dl.length + dw.length;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDay);
              const isTodayDate = isToday(day);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "relative min-h-[80px] p-1.5 border-b border-r border-border/40 text-left transition-all",
                    "hover:bg-primary/5",
                    !isCurrentMonth && "opacity-40",
                    isSelected && "bg-primary/10 ring-2 ring-inset ring-primary/30",
                    isWeekend && isCurrentMonth && "bg-muted/20",
                    i % 7 === 6 && "border-r-0"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium",
                      isTodayDate && "bg-primary text-primary-foreground font-bold",
                      isSelected && !isTodayDate && "bg-primary/20 text-primary",
                      !isTodayDate && !isSelected && "text-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {da.slice(0, 1).map((_, ai) => (
                      <div key={`a-${ai}`} className="h-1.5 w-full rounded-full bg-blue-500 opacity-80" />
                    ))}
                    {dt.slice(0, 1).map((_, ti) => (
                      <div key={`t-${ti}`} className="h-1.5 w-full rounded-full bg-amber-500 opacity-80" />
                    ))}
                    {dl.slice(0, 1).map((_, li) => (
                      <div key={`l-${li}`} className="h-1.5 w-full rounded-full bg-green-500 opacity-80" />
                    ))}
                    {dw.slice(0, 1).map((_, wi) => (
                      <div key={`w-${wi}`} className="h-1.5 w-full rounded-full bg-purple-500 opacity-80" />
                    ))}
                    {totalEvents > 3 && (
                      <span className="text-[9px] text-muted-foreground pl-1">+{totalEvents - 3} daha</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gün Detay Paneli */}
        <PersonalCalendarDayDetail
          date={selectedDay}
          activities={selectedDayEvents.activities}
          todos={selectedDayEvents.todos}
          leaves={selectedDayEvents.leaves}
          workTasks={selectedDayEvents.workTasks || []}
        />
      </div>
    </div>
  );
}