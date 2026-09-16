import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday,
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

// PersonalCalendar.jsx ile aynı query key'ler -- sayfalar arası React Query
// cache'i paylaşılır, ekstra ağ isteği olmaz.
export default function MiniCalendarWidget() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());

  const { data: todos = [] } = useQuery({
    queryKey: ["personal-todos", user?.email],
    queryFn: () => flowApi.entities.Todo.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
  });
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["personal-leaves", user?.email],
    queryFn: () => flowApi.entities.LeaveRequest.filter({ employee_email: user.email, status: "onaylandi" }),
    enabled: !!user?.email,
  });
  const { data: events = [] } = useQuery({
    queryKey: ["personal-events", user?.email],
    queryFn: () => flowApi.entities.TakvimEtkinlik.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
  });

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(addDays(monthEnd, 1), { weekStartsOn: 1 });
  const days = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const marksForDay = (day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return {
      todo: todos.some((t) => t.due_date === dateStr),
      leave: leaveRequests.some((l) => dateStr >= l.start_date && dateStr <= l.end_date),
      event: events.some((e) => e.tarih === dateStr),
    };
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <CalendarDays className="w-4 h-4" />
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground truncate">Takvim</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs font-medium text-foreground capitalize w-20 text-center">
            {format(month, "MMMM yyyy", { locale: tr })}
          </span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS.map((wd) => (
            <div key={wd} className="text-center text-[10px] font-semibold text-muted-foreground uppercase">{wd}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day, i) => {
            const { todo, leave, event } = marksForDay(day);
            const hasMark = todo || leave || event;
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span
                  className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-[11px]",
                    !inMonth && "opacity-30",
                    today ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                <span className="flex items-center gap-0.5 h-1">
                  {hasMark && !today && (
                    <>
                      {todo && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                      {leave && <span className="w-1 h-1 rounded-full bg-green-500" />}
                      {event && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-2.5">
        <Link to="/kisisel-takvim" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Takvimi Aç <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
