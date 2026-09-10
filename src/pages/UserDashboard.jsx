import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import ContractAlerts from "@/components/dashboard/ContractAlerts";
import { useNotifications } from "@/lib/NotificationContext";
import { CheckSquare, Umbrella, ClipboardList, Receipt, ArrowUpRight, Zap } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTicketStatuses } from "@/lib/jobTrackingLabels";

export default function UserDashboard() {
  const { user } = useAuth();
  const { assignedTicketCount } = useNotifications();
  const { statusName } = useTicketStatuses();
  const isIK = user?.role === "ik";

  const { data: employeeRecord } = useQuery({ queryKey: ["my-employee-record"], queryFn: () => fetch("/api/auth/me/employee", { credentials: "include" }).then(r=>r.json()), staleTime: 30*60*1000 });

  const { data: myLeaves = [] } = useQuery({ queryKey: ["my-leaves-dash", user?.email], queryFn: () => flowApi.entities.LeaveRequest.filter({ employee_email: user.email }), enabled: !!user?.email });
  const { data: allTickets = [] } = useQuery({ queryKey: ["my-assigned-tickets"], queryFn: () => fetch("/api/auth/me/tickets", { credentials: "include" }).then(r=>r.json()), staleTime: 5*60*1000 });
  const myTickets = allTickets.filter(t => {
    if (["sonuclanan","iptal","arsivlendi"].includes(t.status)) return false;
    if (t.assigned_to_id === employeeRecord?.id) return true;
    const ids = Array.isArray(t.assigned_to_ids) ? t.assigned_to_ids : (typeof t.assigned_to_ids === 'string' ? JSON.parse(t.assigned_to_ids || '[]') : []);
    return ids.includes(employeeRecord?.id);
  });
  const { data: myTodos = [] } = useQuery({ queryKey: ["my-todos-dash", user?.email], queryFn: () => flowApi.entities.Todo.filter({ owner_email: user.email }), enabled: !!user?.email });
  const { data: announcements = [] } = useQuery({ queryKey: ["announcements-active"], queryFn: () => flowApi.entities.Announcement.filter({ is_active: 1 }) });
  const { data: pendingLeavesIK = [] } = useQuery({ queryKey: ["pending-leaves-ik"], queryFn: () => flowApi.entities.LeaveRequest.list(), enabled: isIK, select: d => d.filter(l=>["ik_onayi_bekliyor","yonetici_onayi_bekliyor"].includes(l.status)) });
  const { data: pendingExpensesIK = [] } = useQuery({ queryKey: ["pending-expenses-ik"], queryFn: () => flowApi.entities.ExpenseReport.list(), enabled: isIK, select: d => d.filter(r=>["ik_onayi_bekliyor","yonetici_onayi_bekliyor"].includes(r.status)) });

  const activeAnnouncements = announcements.filter(a => (a.is_active===1||a.is_active===true) && (a.target_roles==="all"||!a.target_roles||a.target_roles.split(",").includes(user?.role))).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

  const pendingLeaves = myLeaves.filter(l=>["beklemede","yonetici_onayi_bekliyor","ik_onayi_bekliyor"].includes(l.status));
  const approvedLeaves = myLeaves.filter(l=>l.status==="onaylandi");
  const pendingTodos = myTodos.filter(t=>t.status!=="tamamlandi");

  const dayName = format(new Date(), "EEEE", { locale: tr });
  const dateStr = format(new Date(), "d MMMM yyyy", { locale: tr });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const name = employeeRecord?.full_name?.split(" ")[0] || user?.full_name?.split(" ")[0] || "";

  const kpis = [
    { to:"/yapilacaklar", val:pendingTodos.length, label:"Bekleyen Görev", sub:`${myTodos.length} toplam`, grad:"from-amber-500 to-orange-500", icon:CheckSquare },
    { to:"/izinlerim", val:pendingLeaves.length, label:"Bekleyen İzin", sub:`${approvedLeaves.length} onaylı`, grad:"from-orange-500 to-red-500", icon:Umbrella },
    { to:"/is-takibi/tickets", val:myTickets.length, label:"Açık Bilet", sub:`${assignedTicketCount} atanan`, grad:"from-teal-500 to-emerald-600", icon:ClipboardList },
  ];

  return (
    <div className="space-y-5 max-w-7xl">
      <ContractAlerts />

      {/* BAŞLIK */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {name} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dayName}, {dateStr}</p>
        </div>
      </div>

      {/* DUYURULAR */}
      {activeAnnouncements.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
          <div className="flex items-center">
            <div className="flex-shrink-0 px-4 py-3 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-l-2xl flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5"/>Duyuru
            </div>
            <div className="overflow-hidden flex-1 py-3 px-4">
              <div className="animate-marquee whitespace-nowrap">
                {activeAnnouncements.map((a)=>(
                  <span key={a.id} className="inline-flex items-center gap-2 mr-12">
                    {a.title&&<span className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">{a.title}:</span>}
                    <span className="text-sm text-muted-foreground">{a.content}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI KARTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map(({to,val,label,sub,grad,icon:Icon})=>(
          <Link key={to} to={to} className="bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group overflow-hidden">
            <div className={cn("p-4 bg-gradient-to-br",grad)}>
              <Icon className="w-6 h-6 text-white/80"/>
            </div>
            <div className="p-4">
              <div className="text-3xl font-black text-foreground">{val}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-1">{label}</div>
              <div className="text-xs text-muted-foreground/60 mt-0.5">{sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* IK KARTLARI */}
      {isIK && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/ik-izin-yonetimi" className="bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
              <Umbrella className="w-7 h-7 text-white"/>
            </div>
            <div>
              <div className="text-3xl font-black text-orange-600">{pendingLeavesIK.length}</div>
              <div className="text-sm font-medium text-muted-foreground">Onay Bekleyen İzin</div>
            </div>
          </Link>
          <Link to="/ik-harcama-yonetimi" className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shrink-0">
              <Receipt className="w-7 h-7 text-white"/>
            </div>
            <div>
              <div className="text-3xl font-black text-amber-600">{pendingExpensesIK.length}</div>
              <div className="text-sm font-medium text-muted-foreground">Onay Bekleyen Harcama</div>
            </div>
          </Link>
        </div>
      )}

      {/* BİLETLER + YAPILACAKLAR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-teal-500"/>Bana Atanan Biletler
            </h3>
            <Link to="/is-takibi/tickets" className="text-[10px] text-indigo-500 flex items-center gap-0.5">Tümü<ArrowUpRight className="w-3 h-3"/></Link>
          </div>
          {myTickets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Atanmış bilet yok</p>
          ) : (
            <div className="space-y-1.5">
              {myTickets.slice(0,8).map(t=>{
                const pc = {kritik:"bg-red-500",yuksek:"bg-orange-500",orta:"bg-amber-400",dusuk:"bg-green-500"}[t.priority]||"bg-gray-400";
                return (
                  <Link key={t.id} to="/is-takibi/tickets" className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",pc)}/>
                    <p className="text-xs font-medium truncate flex-1">{t.title}</p>
                    <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded-full shrink-0 text-muted-foreground">{statusName(t.status)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-amber-500"/>Yapılacaklar
            </h3>
            <Link to="/yapilacaklar" className="text-[10px] text-indigo-500 flex items-center gap-0.5">Tümü<ArrowUpRight className="w-3 h-3"/></Link>
          </div>
          {pendingTodos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Bekleyen görev yok 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {pendingTodos.slice(0,8).map(t=>(
                <Link key={t.id} to="/yapilacaklar" className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="w-3.5 h-3.5 rounded border-2 border-amber-400 shrink-0"/>
                  <p className="text-xs font-medium truncate">{t.title}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
