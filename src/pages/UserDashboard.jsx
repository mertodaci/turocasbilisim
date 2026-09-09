import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import ContractAlerts from "@/components/dashboard/ContractAlerts";
import { useNotifications } from "@/lib/NotificationContext";
import { CheckSquare, Umbrella, ClipboardList, Clock, TrendingUp, Receipt, Plus, Activity, ArrowUpRight, Zap } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { activityTypes, formatDuration, outcomeLabels } from "@/lib/activityHelpers";
import { cn } from "@/lib/utils";
import { useTicketStatuses } from "@/lib/taskqubeLabels";

const COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

const actLabel = (t) => {
  const map = { telefon_gorusmesi:"Telefon", musteri_toplantisi:"Müşteri Toplantısı", ofis_toplantisi:"Ofis Toplantısı", saha_ziyareti:"Saha Ziyareti", email_yazisma:"E-posta", rapor_yazimi:"Rapor", taskqube:"TaskQube", egitim:"Eğitim", sunum:"Sunum", test:"Test", satis:"Satış", satis_gorusmesi:"Satış Görüşmesi" };
  return map[t] || (t||"").replace(/_/g," ");
};

export default function UserDashboard() {
  const { user } = useAuth();
  const { pendingLeaveCount, unreadTodoCount, assignedTicketCount } = useNotifications();
  const { statusName } = useTicketStatuses();
  const isIK = user?.role === "ik";
  const isSatis = user?.role === "satis";

  const { data: employeeRecord } = useQuery({ queryKey: ["my-employee-record"], queryFn: () => fetch("/api/auth/me/employee", { credentials: "include" }).then(r=>r.json()), staleTime: 30*60*1000 });

  // Satis rolunde "aktivite" kayitlari sales_activities tablosunda tutuluyor;
  // bu roldeki kullanicilar icin panelde satis aktivitelerini goster.
  const { data: activities = [] } = useQuery({ queryKey: [isSatis ? "user-sales-activities" : "user-activities", employeeRecord?.id], queryFn: () => (isSatis ? flowApi.entities.SalesActivity : flowApi.entities.Activity).filter({ employee_id: employeeRecord?.id }), enabled: !!employeeRecord?.id });
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

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStartStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekActs = activities.filter(a => a.date && a.date >= weekStartStr && a.date <= weekEndStr);
  const todayActs = activities.filter(a => a.date === today);
  const todayMin = todayActs.reduce((s,a)=>s+(a.duration_minutes||0),0);
  const weekMin = weekActs.reduce((s,a)=>s+Math.min(a.duration_minutes||0,1440),0);

  const pendingLeaves = myLeaves.filter(l=>["beklemede","yonetici_onayi_bekliyor","ik_onayi_bekliyor"].includes(l.status));
  const approvedLeaves = myLeaves.filter(l=>l.status==="onaylandi");
  const pendingTodos = myTodos.filter(t=>t.status!=="tamamlandi");

  // Aktivite tipi dağılımı (bu hafta)
  const actChartData = useMemo(() => {
    const m = {};
    weekActs.forEach((a,i) => {
      if (!a.activity_type) return;
      if (!m[a.activity_type]) m[a.activity_type] = { name: actLabel(a.activity_type), value: 0, count: 0, color: COLORS[Object.keys(m).length % COLORS.length] };
      m[a.activity_type].value += Math.min(a.duration_minutes||0,1440);
      m[a.activity_type].count += 1;
    });
    return Object.values(m).filter(d=>d.value>0).sort((a,b)=>b.value-a.value);
  }, [weekActs]);

  // Son aktiviteler
  const recentActs = [...activities].sort((a,b)=>new Date(b.created_date)-new Date(a.created_date)).slice(0,5);

  const dayName = format(new Date(), "EEEE", { locale: tr });
  const dateStr = format(new Date(), "d MMMM yyyy", { locale: tr });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const name = employeeRecord?.full_name?.split(" ")[0] || user?.full_name?.split(" ")[0] || "";

  return (
    <div className="space-y-5 max-w-7xl">
      <ContractAlerts />

      {/* BAŞLIK */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {name} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dayName}, {dateStr}</p>
        </div>
        <Link to={isSatis ? "/satis-aktivite-ekle?add=1" : "/aktivite-ekle"}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium">
          <Plus className="w-4 h-4"/>Aktivite Ekle
        </Link>
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
                {activeAnnouncements.map((a,i)=>(
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to:"/aktiviteler", val:todayActs.length, label:"Bugünkü Aktivite", sub:`${Math.floor(todayMin/60)}sa ${todayMin%60}dk`, grad:"from-blue-500 to-indigo-600", icon:Activity },
          { to:"/yapilacaklar", val:pendingTodos.length, label:"Bekleyen Görev", sub:`${myTodos.length} toplam`, grad:"from-amber-500 to-orange-500", icon:CheckSquare },
          { to:"/izinlerim", val:pendingLeaves.length, label:"Bekleyen İzin", sub:`${approvedLeaves.length} onaylı`, grad:"from-orange-500 to-red-500", icon:Umbrella },
          { to:"/taskqube-v3/tickets", val:myTickets.length, label:"Açık Bilet", sub:"atanan", grad:"from-teal-500 to-emerald-600", icon:ClipboardList },
        ].map(({to,val,label,sub,grad,icon:Icon})=>(
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
        <div className="grid grid-cols-2 gap-4">
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

      {/* SATIŞ KARTLARI */}
      {isSatis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { to:"/satis-teklifleri", label:"Teklifler", sub:"Teklif yönetimi", grad:"from-blue-500 to-indigo-600", icon:ClipboardList },
            { to:"/satis-raporlari", label:"Satış Raporları", sub:"İstatistikler", grad:"from-purple-500 to-violet-600", icon:TrendingUp },
            { to:"/satis-aktivite-ekle?add=1", label:"Görüşme Ekle", sub:"Aktivite kaydı", grad:"from-orange-500 to-amber-500", icon:Plus },
          ].map(({to,label,sub,grad,icon:Icon})=>(
            <Link key={to} to={to} className="bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden group">
              <div className={cn("p-4 bg-gradient-to-br flex items-center justify-between",grad)}>
                <Icon className="w-6 h-6 text-white"/>
                <ArrowUpRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors"/>
              </div>
              <div className="p-4">
                <div className="text-sm font-bold text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* HAFTALIK ÖZET */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Aktivite Dağılımı */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500"/>Bu Hafta Aktivitelerim
          </h3>
          {actChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Activity className="w-10 h-10 mb-2 opacity-20"/>
              <p className="text-sm">Bu hafta aktivite yok</p>
              <Link to={isSatis ? "/satis-aktivite-ekle?add=1" : "/aktivite-ekle"} className="mt-2 text-xs text-indigo-500 hover:underline">Aktivite ekle →</Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={actChartData} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={55}>
                    {actChartData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>[formatDuration(v),"Süre"]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                <div className="text-center mb-2">
                  <div className="text-lg font-bold">{formatDuration(weekMin)}</div>
                  <div className="text-[10px] text-muted-foreground">{weekActs.length} aktivite</div>
                </div>
                {actChartData.slice(0,4).map((d,i)=>(
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:d.color}}/>
                      <span className="text-muted-foreground truncate max-w-[80px]">{d.name}</span>
                    </div>
                    <span className="font-semibold text-foreground shrink-0">{formatDuration(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Son Aktiviteler */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500"/>Son Aktiviteler
            </h3>
            <Link to="/aktiviteler" className="text-xs text-indigo-500 flex items-center gap-1">Tümü<ArrowUpRight className="w-3 h-3"/></Link>
          </div>
          {recentActs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Henüz aktivite yok</div>
          ) : (
            <div className="space-y-2">
              {recentActs.map(a=>{
                const typeInfo = activityTypes[a.activity_type]||activityTypes.diger;
                const Icon = typeInfo.icon;
                const outcome = a.outcome ? outcomeLabels[a.outcome] : null;
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", typeInfo.bg)}>
                      <Icon className={cn("w-3.5 h-3.5", typeInfo.color)}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{actLabel(a.activity_type)}</p>
                      {a.customer_name&&<p className="text-[10px] text-muted-foreground truncate">{a.customer_name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold">{formatDuration(a.duration_minutes)}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(a.date),"d MMM",{locale:tr})}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Biletler + Yapılacaklar */}
        <div className="space-y-4">
          {/* Atanan Biletler */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-teal-500"/>Bana Atanan Biletler
              </h3>
              <Link to="/taskqube-v3/tickets" className="text-[10px] text-indigo-500 flex items-center gap-0.5">Tümü<ArrowUpRight className="w-3 h-3"/></Link>
            </div>
            {myTickets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Atanmış bilet yok</p>
            ) : (
              <div className="space-y-1.5">
                {myTickets.slice(0,3).map(t=>{
                  const pc = {kritik:"bg-red-500",yuksek:"bg-orange-500",orta:"bg-amber-400",dusuk:"bg-green-500"}[t.priority]||"bg-gray-400";
                  return (
                    <Link key={t.id} to="/taskqube-v3/tickets" className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",pc)}/>
                      <p className="text-xs font-medium truncate flex-1">{t.title}</p>
                      <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded-full shrink-0 text-muted-foreground">{statusName(t.status)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Yapılacaklar */}
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
                {pendingTodos.slice(0,3).map(t=>(
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
    </div>
  );
}
