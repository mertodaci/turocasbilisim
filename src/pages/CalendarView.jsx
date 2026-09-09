import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, addWeeks, subWeeks
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Activity, Umbrella, Ticket, TrendingUp, MapPin, Plus, Calendar, LayoutGrid, List, Clock, User, X, Filter, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const ET = {
  activity:   { label:"Aktivite",      bg:"bg-indigo-500",   text:"text-indigo-600",   light:"bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800",   dot:"bg-indigo-500",  icon: Activity },
  sales_activity: { label:"Satış Aktivitesi", bg:"bg-teal-500", text:"text-teal-600", light:"bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800", dot:"bg-teal-500", icon: Briefcase },
  leave:      { label:"İzin",          bg:"bg-amber-500",    text:"text-amber-600",    light:"bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800",       dot:"bg-amber-500",   icon: Umbrella },
  ticket:     { label:"Bilet",         bg:"bg-rose-500",     text:"text-rose-600",     light:"bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800",           dot:"bg-rose-500",    icon: Ticket },
  offer:      { label:"Teklif Sonu",   bg:"bg-purple-500",   text:"text-purple-600",   light:"bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800",   dot:"bg-purple-500",  icon: TrendingUp },
  next_visit: { label:"Ziyaret Planı", bg:"bg-emerald-500",  text:"text-emerald-600",  light:"bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800", dot:"bg-emerald-500", icon: MapPin },
};

const actLabel = (t) => {
  const map = { telefon_gorusmesi:"Telefon", musteri_toplantisi:"Müşteri Toplantısı", ofis_toplantisi:"Ofis Toplantısı", saha_ziyareti:"Saha Ziyareti", email_yazisma:"E-posta", rapor_yazimi:"Rapor", taskqube:"TaskQube", egitim:"Eğitim", sunum:"Sunum", test:"Test", satis:"Satış", satis_gorusmesi:"Satış Görüşmesi", musteri_ziyareti:"Müşteri Ziyareti", demo_sunum:"Demo / Sunum", teklif_sunumu:"Teklif Sunumu", diger:"Diğer" };
  return map[t] || (t||"").replace(/_/g," ");
};

export default function CalendarView() {
  const [view, setView] = useState("month"); // month | week | list
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [activeTypes, setActiveTypes] = useState(Object.keys(ET));
  const [filterOpen, setFilterOpen] = useState(false);
  const [selEmployee, setSelEmployee] = useState("");
  const [detailEvent, setDetailEvent] = useState(null);

  const { data: activities = [] } = useQuery({ queryKey: ["cal-act"], queryFn: () => flowApi.entities.Activity.list("-date", 1000) });
  const { data: leaves = [] } = useQuery({ queryKey: ["cal-lv"], queryFn: () => flowApi.entities.LeaveRequest.filter({ status: "onaylandi" }) });
  const { data: tickets = [] } = useQuery({ queryKey: ["cal-tq"], queryFn: () => flowApi.entities.TQTicket.list("-created_date", 500) });
  const { data: offers = [] } = useQuery({ queryKey: ["cal-of"], queryFn: () => flowApi.entities.SalesActivity.filter({ activity_type: "teklif_sunumu" }, "-valid_until", 300) });
  const { data: salesActivities = [] } = useQuery({ queryKey: ["cal-sa"], queryFn: () => flowApi.entities.SalesActivity.list("-date", 1000) });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }) });

  const toggleType = (t) => setActiveTypes(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t]);

  const allEvents = useMemo(() => {
    const evs = [];
    if (activeTypes.includes("activity")) {
      activities.filter(a => !selEmployee || a.employee_id===selEmployee).forEach(a => {
        if (a.date) evs.push({ date:a.date, type:"activity", title:actLabel(a.activity_type), sub:a.customer_name||"", person:a.employee_name, duration:a.duration_minutes, outcome:a.outcome, id:a.id });
      });
    }
    if (activeTypes.includes("next_visit")) {
      salesActivities.filter(a => a.next_visit_date && (!selEmployee || a.employee_id===selEmployee)).forEach(a => {
        evs.push({ date:a.next_visit_date, type:"next_visit", title:"Ziyaret: "+(a.customer_name||""), sub:a.employee_name, person:a.employee_name, id:a.id+"_nv" });
      });
    }
    if (activeTypes.includes("sales_activity")) {
      salesActivities.filter(a => a.date && (!selEmployee || a.employee_id===selEmployee)).forEach(a => {
        evs.push({ date:a.date, type:"sales_activity", title:(a.customer_name||a.title||"Satış"), sub:actLabel(a.activity_type), person:a.employee_name, id:a.id+"_sa" });
      });
    }
    if (activeTypes.includes("leave")) {
      leaves.forEach(l => {
        let d = l.start_date;
        while (d && l.end_date && d <= l.end_date) {
          evs.push({ date:d, type:"leave", title:l.employee_full_name||l.employee_email, sub:(l.leave_type||"").replace(/_/g," "), person:l.employee_full_name, id:l.id+"_"+d });
          const next = new Date(d); next.setDate(next.getDate()+1); d = format(next,"yyyy-MM-dd");
        }
      });
    }
    if (activeTypes.includes("ticket")) {
      tickets.filter(t=>t.created_date).forEach(t => {
        evs.push({ date:String(t.created_date).split("T")[0], type:"ticket", title:t.title, sub:t.customer_name||t.assigned_to_name, person:t.assigned_to_name, id:t.id });
      });
    }
    if (activeTypes.includes("offer")) {
      offers.filter(o=>o.valid_until&&o.deal_status!=="iptal"&&o.deal_status!=="kaybedildi").forEach(o => {
        evs.push({ date:o.valid_until, type:"offer", title:o.customer_name, sub:o.title, id:o.id });
      });
    }
    return evs;
  }, [activities,leaves,tickets,offers,salesActivities,activeTypes,selEmployee]);

  const getDay = (dateStr) => allEvents.filter(e=>e.date===dateStr);

  // Month grid
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, {weekStartsOn:1});
  const calEnd = endOfWeek(addDays(monthEnd,1), {weekStartsOn:1});
  const days = [];
  let dd = calStart;
  while (dd <= calEnd) { days.push(dd); dd = addDays(dd,1); }

  // Week grid
  const weekStart = startOfWeek(current, {weekStartsOn:1});
  const weekDays = Array.from({length:7},(_,i)=>addDays(weekStart,i));

  // List (30 days)
  const listDays = Array.from({length:30},(_,i)=>addDays(new Date(),i)).filter(d=>getDay(format(d,"yyyy-MM-dd")).length>0);

  const selStr = format(selectedDay,"yyyy-MM-dd");
  const selEvents = getDay(selStr);

  const monthStats = useMemo(()=>{
    const s=format(monthStart,"yyyy-MM-dd"), e=format(monthEnd,"yyyy-MM-dd");
    return Object.fromEntries(Object.keys(ET).map(k=>[k, allEvents.filter(ev=>ev.type===k&&ev.date>=s&&ev.date<=e).length]));
  },[allEvents,current]);

  return (
    <div className="min-h-screen bg-background">
      {/* TOP BAR */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 py-3">
        <div className="flex items-center justify-between gap-4 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Şirket Takvimi</h1>
              <p className="text-xs text-muted-foreground">Tüm etkinlikler tek ekranda</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-muted rounded-xl p-1">
              {[{v:"month",l:"Ay",i:LayoutGrid},{v:"week",l:"Hafta",i:Calendar},{v:"list",l:"Liste",i:List}].map(({v,l,i:Icon})=>(
                <button key={v} onClick={()=>setView(v)} className={cn("flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all font-medium", view===v?"bg-white dark:bg-card shadow-sm text-foreground":"text-muted-foreground hover:text-foreground")}>
                  <Icon className="w-3.5 h-3.5"/>{l}
                </button>
              ))}
            </div>
            {/* Nav */}
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              <button onClick={()=>setCurrent(view==="week"?subWeeks(current,1):subMonths(current,1))} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-card transition-colors"><ChevronLeft className="w-4 h-4"/></button>
              <button onClick={()=>setCurrent(new Date())} className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-card transition-colors min-w-[120px] text-center capitalize">
                {view==="week" ? `${format(weekStart,"d MMM",{locale:tr})} – ${format(addDays(weekStart,6),"d MMM yyyy",{locale:tr})}` : format(current,"MMMM yyyy",{locale:tr})}
              </button>
              <button onClick={()=>setCurrent(view==="week"?addWeeks(current,1):addMonths(current,1))} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-card transition-colors"><ChevronRight className="w-4 h-4"/></button>
            </div>
            <Link to="/aktivite-ekle" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium">
              <Plus className="w-4 h-4"/>Ekle
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-4 space-y-4">
        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(ET).map(([key,cfg])=>(
            <button key={key} onClick={()=>toggleType(key)}
              className={cn("rounded-2xl p-3 border-2 text-left transition-all", activeTypes.includes(key)?`${cfg.light} border-current`:"bg-muted/30 border-transparent opacity-50")}>
              <div className="flex items-center justify-between mb-1">
                <div className={cn("p-1.5 rounded-lg",cfg.bg)}><cfg.icon className="w-3.5 h-3.5 text-white"/></div>
                <span className={cn("text-xl font-bold",cfg.text)}>{monthStats[key]||0}</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground">{cfg.label}</p>
            </button>
          ))}
        </div>

        {/* FİLTRE */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>setFilterOpen(p=>!p)} className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all font-medium", filterOpen?"bg-indigo-600 text-white border-indigo-600":"border-border hover:border-indigo-400 text-muted-foreground")}>
            <Filter className="w-3 h-3"/>Çalışan Filtrele
          </button>
          {selEmployee && (
            <button onClick={()=>setSelEmployee("")} className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-xl border border-indigo-200 font-medium">
              <User className="w-3 h-3"/>{employees.find(e=>e.id===selEmployee)?.full_name}<X className="w-3 h-3 ml-1"/>
            </button>
          )}
        </div>
        {filterOpen && (
          <div className="bg-card border border-border/50 rounded-2xl p-4">
            <div className="flex flex-wrap gap-1.5">
              {employees.map(e=>(
                <button key={e.id} onClick={()=>{setSelEmployee(selEmployee===e.id?"":e.id);setFilterOpen(false);}}
                  className={cn("text-xs px-3 py-1.5 rounded-xl border transition-all font-medium",
                    selEmployee===e.id?"bg-indigo-600 text-white border-indigo-600":"border-border text-muted-foreground hover:border-indigo-400 hover:text-indigo-600")}>
                  {e.full_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {view==="month" && (
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 border-b border-border/50">
              {["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map((d,i)=>(
                <div key={d} className={cn("py-3 text-center text-xs font-bold tracking-wide", i>=5?"text-rose-400 bg-rose-50/50 dark:bg-rose-950/10":"text-muted-foreground")}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day,idx)=>{
                const ds=format(day,"yyyy-MM-dd");
                const evs=getDay(ds);
                const inMonth=isSameMonth(day,current);
                const isSel=isSameDay(day,selectedDay);
                const isTod=isToday(day);
                const isWE=day.getDay()===0||day.getDay()===6;
                return (
                  <div key={idx} onClick={()=>setSelectedDay(day)}
                    className={cn("min-h-[100px] p-2 border-b border-r border-border/20 cursor-pointer transition-all group",
                      !inMonth&&"opacity-25",
                      isSel&&"bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-300 dark:ring-indigo-700 ring-inset",
                      isTod&&!isSel&&"bg-amber-50/60 dark:bg-amber-950/20",
                      isWE&&inMonth&&!isSel&&!isTod&&"bg-slate-50/60 dark:bg-slate-900/20",
                      "hover:bg-muted/40")}>
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mb-1.5 mx-auto transition-all",
                      isTod?"bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900":
                      isSel?"bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-white":
                      isWE&&inMonth?"text-rose-400":"text-foreground group-hover:text-indigo-600")}>
                      {format(day,"d")}
                    </div>
                    <div className="space-y-0.5">
                      {evs.slice(0,3).map((ev,i)=>{
                        const cfg=ET[ev.type];
                        return (
                          <div key={i} onClick={e=>{e.stopPropagation();setDetailEvent(ev);}}
                            className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium border cursor-pointer hover:opacity-80", cfg.light)}>
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",cfg.dot)}/>
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}
                      {evs.length>3&&<div className="text-[10px] text-muted-foreground text-center font-medium">+{evs.length-3} daha</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {view==="week" && (
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-7">
              {weekDays.map((day,i)=>{
                const ds=format(day,"yyyy-MM-dd");
                const evs=getDay(ds);
                const isTod=isToday(day);
                const isWE=day.getDay()===0||day.getDay()===6;
                return (
                  <div key={i} className={cn("border-r border-border/30 last:border-0", isWE&&"bg-slate-50/60 dark:bg-slate-900/20")}>
                    <div className={cn("py-3 text-center border-b border-border/30", isTod&&"bg-indigo-600")}>
                      <div className={cn("text-xs font-semibold", isTod?"text-indigo-200":"text-muted-foreground")}>{["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"][i]}</div>
                      <div className={cn("text-xl font-bold mt-0.5", isTod?"text-white":"text-foreground")}>{format(day,"d")}</div>
                      <div className={cn("text-xs", isTod?"text-indigo-200":"text-muted-foreground")}>{evs.length>0&&`${evs.length} etkinlik`}</div>
                    </div>
                    <div className="p-2 space-y-1.5 min-h-[300px]">
                      {evs.map((ev,j)=>{
                        const cfg=ET[ev.type];
                        return (
                          <div key={j} onClick={()=>setDetailEvent(ev)} className={cn("p-2 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity", cfg.light)}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className={cn("p-1 rounded-md",cfg.bg)}><cfg.icon className="w-2.5 h-2.5 text-white"/></div>
                              <span className="text-[11px] font-bold truncate">{ev.title}</span>
                            </div>
                            {ev.sub&&<p className="text-[10px] opacity-60 truncate">{ev.sub}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {view==="list" && (
          <div className="space-y-4">
            {listDays.length===0&&<div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-20"/><p>Önümüzdeki 30 günde etkinlik yok</p></div>}
            {listDays.map((day,i)=>{
              const ds=format(day,"yyyy-MM-dd");
              const evs=getDay(ds);
              const isTod=isToday(day);
              return (
                <div key={i} className="flex gap-4">
                  <div className={cn("w-16 shrink-0 text-center py-3 rounded-2xl border", isTod?"bg-indigo-600 border-indigo-600 text-white":"bg-card border-border/50")}>
                    <div className="text-xs font-semibold capitalize">{format(day,"EEE",{locale:tr})}</div>
                    <div className="text-2xl font-bold leading-none mt-0.5">{format(day,"d")}</div>
                    <div className="text-xs opacity-70">{format(day,"MMM",{locale:tr})}</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {evs.map((ev,j)=>{
                      const cfg=ET[ev.type];
                      return (
                        <div key={j} onClick={()=>setDetailEvent(ev)} className={cn("flex items-center gap-3 p-3 rounded-2xl border cursor-pointer hover:opacity-80 transition-opacity", cfg.light)}>
                          <div className={cn("p-2 rounded-xl",cfg.bg)}><cfg.icon className="w-4 h-4 text-white"/></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{ev.title}</p>
                            {ev.sub&&<p className="text-xs opacity-60 truncate">{ev.sub}</p>}
                          </div>
                          <span className={cn("text-xs font-semibold px-2 py-1 rounded-lg",cfg.light)}>{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAY MODAL */}
      {detailEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={()=>setDetailEvent(null)}>
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-sm" onClick={e=>e.stopPropagation()}>
            {(() => {
              const cfg=ET[detailEvent.type];
              return (
                <>
                  <div className={cn("flex items-center justify-between px-5 py-4 rounded-t-2xl",cfg.bg)}>
                    <div className="flex items-center gap-2">
                      <cfg.icon className="w-5 h-5 text-white"/>
                      <span className="text-white font-bold">{cfg.label}</span>
                    </div>
                    <button onClick={()=>setDetailEvent(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="text-base font-bold">{detailEvent.title}</h3>
                    {detailEvent.sub&&<p className="text-sm text-muted-foreground">{detailEvent.sub}</p>}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {detailEvent.person&&<span className="flex items-center gap-1"><User className="w-3.5 h-3.5"/>{detailEvent.person}</span>}
                      {detailEvent.duration&&<span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/>{detailEvent.duration}dk</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
                      <Calendar className="w-3.5 h-3.5"/>
                      {detailEvent.date}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
