import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import {
  format, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PersonalCalendarDayDetail from "@/components/calendar/PersonalCalendarDayDetail";

const emptyEventForm = { baslik: "", aciklama: "", tarih: "", baslangic_saat: "", bitis_saat: "" };

export default function PersonalCalendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const dayParam = searchParams.get("day");
  const initialDay = dayParam ? parse(dayParam, "yyyy-MM-dd", new Date()) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDay);
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEventForm);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Yapılacaklar (yalnız kendi kayıtları)
  const { data: todos = [] } = useQuery({
    queryKey: ["personal-todos", user?.email],
    queryFn: () => flowApi.entities.Todo.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
  });

  // Onaylanmış izin talepleri
  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["personal-leaves", user?.email],
    queryFn: () => flowApi.entities.LeaveRequest.filter({ employee_email: user.email, status: "onaylandi" }),
    enabled: !!user?.email,
  });

  // Serbest takvim etkinlikleri (toplantı/hatırlatma)
  const { data: events = [] } = useQuery({
    queryKey: ["personal-events", user?.email],
    queryFn: () => flowApi.entities.TakvimEtkinlik.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => flowApi.entities.TakvimEtkinlik.create({ ...data, owner_email: user?.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-events", user?.email] });
      setEventDialogOpen(false);
      setEventForm(emptyEventForm);
      toast.success("Etkinlik eklendi");
    },
    onError: () => toast.error("Etkinlik eklenemedi"),
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => flowApi.entities.TakvimEtkinlik.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-events", user?.email] });
      toast.success("Etkinlik silindi");
    },
    onError: () => toast.error("Etkinlik silinemedi"),
  });

  const openNewEvent = (date) => {
    setEventForm({ ...emptyEventForm, tarih: format(date, "yyyy-MM-dd") });
    setEventDialogOpen(true);
  };

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
    const dayTodos = todos.filter((t) => t.due_date === dateStr);
    const dayLeaves = leaveRequests.filter((l) => dateStr >= l.start_date && dateStr <= l.end_date);
    const dayEvents = events.filter((e) => e.tarih === dateStr);
    return { todos: dayTodos, leaves: dayLeaves, events: dayEvents };
  };

  const selectedDayEvents = getEventsForDay(selectedDay);
  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Kişisel Takvim
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Yapılacaklar ve izinlerinizi tek bir takvimde görün
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
          <Button className="rounded-xl text-sm gap-1.5" onClick={() => openNewEvent(selectedDay)}>
            <Plus className="w-4 h-4" /> Etkinlik Ekle
          </Button>
        </div>
      </div>

      {/* Renk Açıklamaları */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" />Yapılacak</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" />Onaylı İzin</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" />Etkinlik</span>
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
              const { todos: dt, leaves: dl, events: de } = getEventsForDay(day);
              const totalEvents = dt.length + dl.length + de.length;
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
                    {dt.slice(0, 1).map((_, ti) => (
                      <div key={`t-${ti}`} className="h-1.5 w-full rounded-full bg-amber-500 opacity-80" />
                    ))}
                    {dl.slice(0, 1).map((_, li) => (
                      <div key={`l-${li}`} className="h-1.5 w-full rounded-full bg-green-500 opacity-80" />
                    ))}
                    {de.slice(0, 1).map((_, ei) => (
                      <div key={`e-${ei}`} className="h-1.5 w-full rounded-full bg-blue-500 opacity-80" />
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
          todos={selectedDayEvents.todos}
          leaves={selectedDayEvents.leaves}
          events={selectedDayEvents.events}
          onAddEvent={() => openNewEvent(selectedDay)}
          onDeleteEvent={(id) => deleteEventMutation.mutate(id)}
        />
      </div>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Etkinlik Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Başlık *</Label>
              <Input value={eventForm.baslik} onChange={(e) => setEventForm((f) => ({ ...f, baslik: e.target.value }))} placeholder="Toplantı, hatırlatma..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tarih *</Label>
              <Input type="date" value={eventForm.tarih} onChange={(e) => setEventForm((f) => ({ ...f, tarih: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Başlangıç Saati</Label>
                <Input type="time" value={eventForm.baslangic_saat} onChange={(e) => setEventForm((f) => ({ ...f, baslangic_saat: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bitiş Saati</Label>
                <Input type="time" value={eventForm.bitis_saat} onChange={(e) => setEventForm((f) => ({ ...f, bitis_saat: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Açıklama</Label>
              <Textarea rows={3} value={eventForm.aciklama} onChange={(e) => setEventForm((f) => ({ ...f, aciklama: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>İptal</Button>
            <Button
              disabled={!eventForm.baslik.trim() || !eventForm.tarih || createEventMutation.isPending}
              onClick={() => createEventMutation.mutate(eventForm)}
            >
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
