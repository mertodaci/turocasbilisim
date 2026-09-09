import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import ContractAlerts from "@/components/dashboard/ContractAlerts";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from "date-fns";
import { tr } from "date-fns/locale";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users, Briefcase, Activity, Trophy, ClipboardList, CheckSquare, ArrowUpRight, Zap, AlertTriangle, TrendingUp, Umbrella, DollarSign, Layers } from "lucide-react";
import { activityTypes } from "@/lib/activityHelpers";
import CustomerMapSummary from "@/components/dashboard/CustomerMapSummary";
import { cn } from "@/lib/utils";
import { useTicketStatuses } from "@/lib/jobTrackingLabels";

export default function AdminDashboard() {
  const { statusName } = useTicketStatuses();
  const { user } = useAuth();

  const { data: activities = [] } = useQuery({ queryKey: ["activities-admin"], queryFn: () => flowApi.entities.Activity.list("-created_date", 200) });
  const { data: employees = [] } = useQuery({ queryKey: ["employees-admin"], queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }), select: (d) => d.filter(e => e.app_role !== "musteri") });
  const { data: summary = { openTickets: [], openCount: 0, byCustomer: [], byStatus: [], byAssignee: [] } } = useQuery({ queryKey: ["admin-summary"], queryFn: () => fetch("/api/dashboard/admin-summary", { credentials: "include" }).then(r=>r.json()), staleTime: 60*1000, refetchInterval: 10*60*1000 });
  const { data: announcements = [] } = useQuery({ queryKey: ["announcements-active"], queryFn: () => flowApi.entities.Announcement.filter({ is_active: 1 }) });

  const activeAnnouncements = announcements.filter(a => {
    const dateOk = (!a.start_date || a.start_date <= format(new Date(), "yyyy-MM-dd")) &&
      (!a.end_date || a.end_date >= format(new Date(), "yyyy-MM-dd"));
    const roles = (a.target_roles || "all").toString();
    const roleOk = roles === "all" || roles.split(",").map(r => r.trim()).includes(user?.role);
    return dateOk && roleOk;
  });

  const openTickets = summary.openTickets || [];
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekActivities = activities.filter(a => a.date && isWithinInterval(new Date(a.date), { start: weekStart, end: weekEnd }));

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const activityByDay = days.map(day => ({
    name: format(day, "EEE", { locale: tr }),
    count: weekActivities.filter(a => format(new Date(a.date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")).length,
  }));

  const empActivityCount = {};
  weekActivities.forEach(a => { if (a.employee_name) empActivityCount[a.employee_name] = (empActivityCount[a.employee_name] || 0) + 1; });
  const topEmployees = Object.entries(empActivityCount).sort((a,b) => b[1]-a[1]).slice(0, 6);

  const typeCount = {};
  weekActivities.forEach(a => { const t = a.activity_type || "diger"; typeCount[t] = (typeCount[t] || 0) + 1; });
  const activityTypeData = Object.entries(typeCount).map(([type, count]) => ({
    name: activityTypes[type]?.label || type,
    value: count,
  })).sort((a,b) => b.value - a.value);

  const recentActivities = [...activities].filter(a => a.date).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  const topCustomers = (summary.byCustomer || []).map(c => [c.customer_name, c.c]);

  const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];

  return (
    <div className="space-y-5">

      {/* SÖZLEŞME UYARILARI */}
      <ContractAlerts />

      {/* BAŞLIK */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Operasyon Merkezi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Günlük operasyon ve ekip durumu</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
          Canlı · {new Date().toLocaleDateString("tr-TR", { day:"numeric", month:"long" })}
        </div>
      </div>

      {/* DUYURULAR */}
      {activeAnnouncements.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
          <div className="flex items-center">
            <div className="flex-shrink-0 px-4 py-3 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-l-2xl flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5"/> Duyuru
            </div>
            <div className="overflow-hidden flex-1 py-3 px-4">
              <div className="animate-marquee whitespace-nowrap">
                {activeAnnouncements.map((a,i)=>(
                  <span key={a.id} className="inline-flex items-center gap-2 mr-12">
                    {a.title && <span className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">{a.title}:</span>}
                    <span className="text-sm text-muted-foreground">{a.content}</span>
                    {i < activeAnnouncements.length-1 && <span className="text-muted-foreground mx-4">•</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BUGÜN ÖZETİ + BEKLEYEN — kompakt tek şerit */}
      <div className="flex items-center flex-wrap gap-x-6 gap-y-2 bg-card border border-border/50 rounded-2xl px-5 py-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bugün</span>
        {[
          { label: "açılan bilet", value: summary.todayOpened || 0, color: "text-blue-600" },
          { label: "aktivite", value: summary.todayActivities || 0, color: "text-purple-600" },
          { label: "izinli", value: summary.onLeaveToday || 0, color: "text-amber-600" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={`text-lg font-black ${item.color}`}>{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}

        {/* Bekleyen uyarı çipleri — sağda, sadece varsa */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {(summary.pendingLeaves || 0) > 0 && (
            <Link to="/ik-izin-yonetimi" className="flex items-center gap-1.5 text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-full px-2.5 py-1 hover:shadow-sm transition-all">
              <Umbrella className="w-3.5 h-3.5"/> {summary.pendingLeaves} bekleyen izin
            </Link>
          )}
          {(summary.pendingExpenses || 0) > 0 && (
            <Link to="/ik-harcama-yonetimi" className="flex items-center gap-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-full px-2.5 py-1 hover:shadow-sm transition-all">
              <DollarSign className="w-3.5 h-3.5"/> {summary.pendingExpenses} bekleyen harcama
            </Link>
          )}
          {(summary.overdueTickets || 0) > 0 && (
            <Link to="/is-takibi/tickets" className="flex items-center gap-1.5 text-xs font-medium bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-full px-2.5 py-1 hover:shadow-sm transition-all">
              <AlertTriangle className="w-3.5 h-3.5"/> {summary.overdueTickets} geciken bilet
            </Link>
          )}
        </div>
      </div>

      {/* ANA KPI BANNER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aktif Personel", value: employees.length, sub: `${summary.onLeaveToday || 0} izinli`, color: "from-indigo-500 to-indigo-700", icon: Users, path: "/calisanlar" },
          { label: "Açık Bilet", value: summary.openCount || 0, sub: `${summary.overdueTickets || 0} geciken`, color: "from-teal-500 to-teal-700", icon: ClipboardList, path: "/is-takibi/tickets" },
          { label: "Bu Ay Açılan", value: summary.thisMonthOpened || 0, sub: `${weekActivities.length} bu hafta aktivite`, color: "from-amber-400 to-orange-500", icon: TrendingUp, path: "/is-takibi/tickets" },
          { label: "Aktif Proje", value: summary.projectCount || 0, sub: `${activities.length} aktivite kaydı`, color: "from-purple-500 to-purple-700", icon: Briefcase, path: "/is-takibi" },
        ].map((item, i) => (
          <Link key={i} to={item.path}
            className="rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <div className={`bg-gradient-to-br ${item.color} p-5 text-white`}>
              <div className="flex items-center justify-between mb-3">
                <item.icon size={22} className="opacity-80"/>
                <ArrowUpRight size={16} className="opacity-50"/>
              </div>
              <div className="text-3xl font-black">{item.value}</div>
              <div className="text-white/80 text-sm mt-1">{item.label}</div>
            </div>
            <div className="bg-card px-4 py-2">
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ═══ SON 7 GÜN AÇILAN BİLET ŞERİDİ ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500"/> Son 7 Gün · Bilet Hareketi
        </h3>
        {(summary.dailyTrend || []).length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Veri yok</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={(summary.dailyTrend||[]).map(d=>({name:format(new Date(d.d),"EEE",{locale:tr}), acilan:d.opened, kapanan:d.closed}))}>
              <XAxis dataKey="name" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
              <Legend wrapperStyle={{fontSize:"12px"}}/>
              <Bar dataKey="acilan" fill="#6366f1" radius={[4,4,0,0]} name="Açılan"/>
              <Bar dataKey="kapanan" fill="#10b981" radius={[4,4,0,0]} name="Kapanan"/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ═══ HARİTA ═══ */}
      <CustomerMapSummary />
      </div>

      {/* ═══ İŞ YÜKÜ ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Durum Dagilimi — DİKEY ÇUBUK */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-teal-500"/>
            <h3 className="text-sm font-semibold text-foreground">Bilet Durum Dağılımı</h3>
          </div>
          {(summary.byStatus || []).length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Açık bilet yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={(summary.byStatus||[]).map(s=>({name:s.status_label || statusName(s.status), c:s.c}))} margin={{top:10,right:10,left:0,bottom:40}}>
                <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} height={60}/>
                <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                <Bar dataKey="c" radius={[4,4,0,0]} name="Bilet">
                  {(summary.byStatus||[]).map((e,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Musteri Bazinda Yogunluk */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-indigo-500"/>
            <h3 className="text-sm font-semibold text-foreground">Müşteri Bazında Yoğunluk</h3>
          </div>
          {topCustomers.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Veri yok</div>
          ) : (
            <div className="space-y-2.5">
              {topCustomers.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-[10px] w-4 text-muted-foreground/60 text-right">{i+1}</span>
                  <p className="text-xs flex-1 truncate">{name}</p>
                  <div className="w-24 bg-muted rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{width:`${(count/topCustomers[0][1])*100}%`}}/></div>
                  <span className="text-xs font-bold text-indigo-600 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ekip Yükü + Son Açık Biletler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Atanan Kisi Yuku */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-teal-500"/>
            <h3 className="text-sm font-semibold text-foreground">Ekip Yükü (Açık Bilet)</h3>
          </div>
          {(summary.byAssignee || []).length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Veri yok</div>
          ) : (
            <div className="space-y-2.5">
              {(summary.byAssignee||[]).map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] w-4 text-muted-foreground/60 text-right">{i+1}</span>
                  <p className="text-xs flex-1 truncate">{a.name}</p>
                  <div className="w-24 bg-muted rounded-full h-1.5"><div className="bg-teal-500 h-1.5 rounded-full" style={{width:`${(a.c/summary.byAssignee[0].c)*100}%`}}/></div>
                  <span className="text-xs font-bold text-teal-600 w-6 text-right">{a.c}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Son Acik Biletler */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-teal-500"/> Son Açık Biletler
            </h3>
            <Link to="/is-takibi/tickets" className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">Tümü <ArrowUpRight className="w-3 h-3"/></Link>
          </div>
          {openTickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-20"/><p className="text-sm">Açık bilet yok</p></div>
          ) : (
            <div className="space-y-2">
              {openTickets.slice(0,8).map(t=>{
                const pc = {kritik:"bg-red-500",yuksek:"bg-orange-500",orta:"bg-amber-400",dusuk:"bg-green-500"}[t.priority]||"bg-gray-400";
                return (
                  <Link key={t.id} to="/is-takibi/tickets" className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className={cn("w-2 h-2 rounded-full shrink-0",pc)}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      {t.customer_name&&<p className="text-xs text-muted-foreground truncate">{t.customer_name}</p>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full shrink-0 text-muted-foreground">{statusName(t.status)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ EKİP ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Haftalik Aktivite */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500"/> Bu Hafta Aktivite Dağılımı
          </h3>
          {weekActivities.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Bu hafta veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityByDay}>
                <XAxis dataKey="name" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]} name="Aktivite"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Aktivite Tipi */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500"/> Aktivite Tipi Dağılımı
          </h3>
          {activityTypeData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Bu hafta veri yok</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={activityTypeData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {activityTypeData.map((e,i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 max-h-[180px] overflow-y-auto">
                {activityTypeData.map((d,i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:CHART_COLORS[i % CHART_COLORS.length]}}/><span className="text-muted-foreground truncate">{d.name}</span></div>
                    <span className="font-bold shrink-0">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* En Aktif Calisanlar */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500"/> Bu Hafta En Aktif Çalışanlar
          </h3>
          {topEmployees.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Bu hafta veri yok</div>
          ) : (
            <div className="space-y-3">
              {topEmployees.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                    i===0?"bg-amber-100 text-amber-700":i===1?"bg-slate-100 text-slate-600":i===2?"bg-orange-100 text-orange-700":"bg-muted text-muted-foreground")}>{i+1}</div>
                  <p className="text-sm flex-1 truncate">{name}</p>
                  <div className="w-24 bg-muted rounded-full h-2"><div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{width:`${(count/topEmployees[0][1])*100}%`}}/></div>
                  <span className="text-sm font-bold text-indigo-600 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Son Aktiviteler */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500"/> Son Aktiviteler
            </h3>
            <Link to="/aktiviteler" className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">Tümü <ArrowUpRight className="w-3 h-3"/></Link>
          </div>
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Aktivite yok</div>
          ) : (
            <div className="space-y-2">
              {recentActivities.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0"><Activity className="w-4 h-4 text-indigo-600"/></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activityTypes[a.activity_type]?.label || a.activity_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.employee_name}{a.customer_name?` · ${a.customer_name}`:""}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{a.date && format(new Date(a.date), "d MMM", { locale: tr })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground pb-2">
        Canlı veri · Her 10 dakikada otomatik yenilenir
      </div>
    </div>
  );
}
