import { useState, useEffect, lazy, Suspense } from "react";
const CustomerMapSummary = lazy(() => import("@/components/dashboard/CustomerMapSummary"));
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, Briefcase, Clock, Activity, ArrowUpRight, LayoutGrid, TrendingUp, UserCircle2, Ticket, CheckCircle2, FileText, Wallet } from "lucide-react";
import { MONTHS as HK_MONTHS } from "@/lib/hakedisUtils";
const fmt = (n) => new Intl.NumberFormat("tr-TR").format(Math.round(n || 0));
const fmtMoney = (n) => new Intl.NumberFormat("tr-TR").format(Math.round(n || 0));
const monthLabel = (m) => { if (!m) return ""; const [y, mo] = m.split("-"); const months = ["","Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"]; return months[parseInt(mo)]; };
const DEAL_LABELS = { kazanildi: "Kazanildi", kaybedildi: "Kaybedildi", beklemede: "Beklemede", devam_ediyor: "Devam" };
const DEAL_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#6366f1", "#94a3b8"];
const pct = (a, b) => b ? Math.round(((a - b) / b) * 100) : 0;
const statusLabel = (s) => ({ pending:"Beklemede", accepted:"Kabul", rejected:"Red", draft:"Taslak", sent:"Gönderildi" }[s] || s);

const TABS = [
  { key: "genel", label: "Genel Bakış", icon: LayoutGrid },
  { key: "satis", label: "Satış", icon: TrendingUp },
  { key: "satis_sonrasi", label: "Satış Sonrası", icon: Wallet },
  { key: "ik", label: "İnsan Kaynakları", icon: UserCircle2 },
  { key: "taskqube", label: "TaskQube & Aktiviteler", icon: Ticket },
];

const CONTRACT_STATUS_LABELS = {
  taslak: "Taslak", aktif: "Aktif", suresi_dolmak_uzere: "Süresi Dolmak Üzere",
  suresi_doldu: "Süresi Doldu", iptal: "İptal",
};

const CUSTOMER_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#0ea5e9", "#eab308", "#f43f5e", "#22c55e",
];

const SALES_ACT_COLORS = {
  musteri_ziyareti: { box: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900", num: "text-blue-600", lbl: "text-blue-500" },
  saha_ziyareti:    { box: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900", num: "text-amber-600", lbl: "text-amber-500" },
  demo_sunum:       { box: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900", num: "text-purple-600", lbl: "text-purple-500" },
  email_yazisma:    { box: "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800", num: "text-slate-600", lbl: "text-slate-500" },
  telefon_gorusmesi:{ box: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900", num: "text-teal-600", lbl: "text-teal-500" },
  musteri_toplantisi:{ box: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900", num: "text-indigo-600", lbl: "text-indigo-500" },
  ofis_toplantisi:  { box: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900", num: "text-cyan-600", lbl: "text-cyan-500" },
  satis_gorusmesi:  { box: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900", num: "text-emerald-600", lbl: "text-emerald-500" },
};
const SALES_ACT_FALLBACK = { box: "bg-muted/30 border-border", num: "text-foreground", lbl: "text-muted-foreground" };

const SALES_ACT_LABELS = {
  telefon_gorusmesi: "Telefon",
  musteri_toplantisi: "Müşteri Toplantısı",
  ofis_toplantisi: "Ofis Toplantısı",
  saha_ziyareti: "Saha Ziyareti",
  email_yazisma: "E-posta",
  musteri_ziyareti: "Müşteri Ziyareti",
  demo_sunum: "Demo / Sunum",
  satis_gorusmesi: "Satış Görüşmesi",
  sunum: "Sunum",
  egitim: "Eğitim",
  diger: "Diğer",
};

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("genel");
  const [hakedisYear, setHakedisYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchData = () => {
      fetch(`/api/dashboard/executive?hakedisYear=${hakedisYear}`, { credentials: "include" })
        .then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(console.error);
    };
    fetchData();
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hakedisYear]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"/>
        <p className="text-muted-foreground text-sm">Yönetici verileri hazırlanıyor...</p>
      </div>
    </div>
  );
  if (!data) return <div className="p-8 text-center text-muted-foreground">Veri alınamadı.</div>;

  const { hr, sales, taskqube, activities, trends } = data;
  const salesAct = data.salesActivities || {};
  const actTrend = pct(activities.thisMonthActivities, activities.lastMonthActivities);
  const ticketOpen = taskqube.ticketsByStatus.filter(t => !["sonuclanan","arsivlendi","iptal"].includes(t.status)).reduce((a,b)=>a+b.c,0);
  const ticketDone = taskqube.ticketsByStatus.filter(t => ["sonuclanan","arsivlendi"].includes(t.status)).reduce((a,b)=>a+b.c,0);
  const contractTotal = (data.contracts?.stats||[]).reduce((a,b)=>a+b.c,0);
  const contractActive = (data.contracts?.stats||[]).find(s=>s.status==='aktif')?.c || 0;
  const contractExpired = (data.contracts?.stats||[]).find(s=>s.status==='suresi_doldu')?.c || 0;

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto">

      {/* BAŞLIK */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Yönetici Masası</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tüm modüllerden gerçek zamanlı özet</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
          {new Date().toLocaleDateString("tr-TR", { day:"numeric", month:"long", year:"numeric" })}
        </div>
      </div>

      {/* 4 ANA KPI - her sekmede sabit */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aktif Personel", value: fmt(hr.totalEmployees), sub: `${hr.onLeaveToday} bugün izinli`, color: "from-indigo-500 to-indigo-700", icon: Users, path: "/calisanlar" },
          { label: "Aktif Müşteri", value: fmt(sales.totalCustomers), sub: `${fmt(sales.potentialCustomers)} aday müşteri`, color: "from-emerald-500 to-emerald-700", icon: Briefcase, path: "/musteriler" },
          { label: "Açık Bilet", value: fmt(ticketOpen), sub: `${fmt(taskqube.overdueTickets)} gecikmiş`, color: "from-amber-400 to-orange-500", icon: Clock, path: "/taskqube-v3/tickets" },
          { label: "Bu Ay Aktivite", value: fmt(activities.thisMonthActivities), sub: actTrend >= 0 ? `↑ ${actTrend}% geçen aya göre` : `↓ ${Math.abs(actTrend)}% geçen aya göre`, color: "from-purple-500 to-purple-700", icon: Activity, path: "/aktiviteler" },
        ].map((item, i) => (
          <div key={i} onClick={() => navigate(item.path)}
            className="rounded-2xl overflow-hidden shadow-sm border border-border cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
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
          </div>
        ))}
      </div>

      {/* SEKME ÇUBUĞU */}
      <div className="flex gap-1 bg-card border border-border rounded-2xl p-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${active ? "bg-indigo-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── GENEL BAKIŞ ─── */}
      {activeTab === "genel" && (
        <div className="space-y-4">
          {/* Bugun banti */}
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 bg-card border border-border rounded-2xl px-5 py-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bugün</span>
            <span className="text-sm"><span className="font-black text-blue-600">{fmt(taskqube.execTodayOpened)}</span> <span className="text-muted-foreground">açılan bilet</span></span>
            <span className="text-sm"><span className="font-black text-emerald-600">{fmt(taskqube.execTodayClosed)}</span> <span className="text-muted-foreground">kapanan</span></span>
            <span className="text-sm"><span className="font-black text-amber-600">{fmt(taskqube.overdueTickets)}</span> <span className="text-muted-foreground">geciken</span></span>
          </div>

          {/* Operasyonel nabiz - 4 renkli kart */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div onClick={() => navigate("/taskqube-v3/tickets")} className="rounded-xl p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 cursor-pointer hover:shadow-sm transition-all">
              <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-blue-600"/><span className="text-xs text-muted-foreground">Bu Ay Çözülen</span></div>
              <div className="text-2xl font-black text-blue-600">{fmt(taskqube.resolvedThisMonth)}</div>
            </div>
            <div onClick={() => navigate("/satis-teklifleri")} className="rounded-xl p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 cursor-pointer hover:shadow-sm transition-all">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-indigo-600"/><span className="text-xs text-muted-foreground">Pipeline (Açık Teklif)</span></div>
              <div className="text-2xl font-black text-indigo-600">{fmtMoney((sales.pipeline||{}).s || 0)} ₺</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{fmt((sales.pipeline||{}).c || 0)} teklif masada</div>
            </div>
            <div onClick={() => navigate("/musteriler")} className={`rounded-xl p-4 border cursor-pointer hover:shadow-sm transition-all ${contractExpired > 0 ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900" : "bg-muted/30 border-border"}`}>
              <div className="flex items-center gap-2 mb-1"><FileText className={`w-4 h-4 ${contractExpired > 0 ? "text-red-600" : "text-muted-foreground"}`}/><span className="text-xs text-muted-foreground">Biten Sözleşme</span></div>
              <div className={`text-2xl font-black ${contractExpired > 0 ? "text-red-600" : "text-muted-foreground"}`}>{fmt(contractExpired)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">süresi dolmuş</div>
            </div>
            <div onClick={() => navigate("/ik-izin-yonetimi")} className={`rounded-xl p-4 border cursor-pointer hover:shadow-sm transition-all ${(hr.pendingLeaves + hr.pendingExpenses) > 0 ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900" : "bg-muted/30 border-border"}`}>
              <div className="flex items-center gap-2 mb-1"><Clock className={`w-4 h-4 ${(hr.pendingLeaves + hr.pendingExpenses) > 0 ? "text-purple-600" : "text-muted-foreground"}`}/><span className="text-xs text-muted-foreground">Bekleyen Onay</span></div>
              <div className={`text-2xl font-black ${(hr.pendingLeaves + hr.pendingExpenses) > 0 ? "text-purple-600" : "text-muted-foreground"}`}>{fmt(hr.pendingLeaves + hr.pendingExpenses)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{fmt(hr.pendingLeaves)} izin · {fmt(hr.pendingExpenses)} harcama</div>
            </div>
          </div>

          {/* Harita (yarim) + Musteri Bazinda Yogunluk (yarim) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Müşteri Haritası</h3>
                <button onClick={() => navigate("/musteriler")} className="text-xs text-indigo-600 flex items-center gap-1">Müşteriler <ArrowUpRight size={12}/></button>
              </div>
              <Suspense fallback={<div className="h-72 flex items-center justify-center text-muted-foreground text-sm">Harita yükleniyor...</div>}>
                <div style={{height: 300}}>
                  <CustomerMapSummary />
                </div>
              </Suspense>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-500"/> Müşteri Bazında Yoğunluk <span className="text-xs text-muted-foreground font-normal">(açık bilet)</span></h3>
              {(taskqube.ticketByCustomer || []).length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Veri yok</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={(taskqube.ticketByCustomer||[]).map(d=>({name:d.customer_name, c:d.c}))}
                    margin={{top:10, right:10, left:0, bottom:70}}
                  >
                    <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={100}/>
                    <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                    <Bar dataKey="c" radius={[4,4,0,0]} name="Açık Bilet">
                      {(taskqube.ticketByCustomer||[]).map((entry, i) => (
                        <Cell key={i} fill={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bilet Durum Dagilimi - tam genislik */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Ticket className="w-4 h-4 text-indigo-500"/> Bilet Durum Dağılımı</h3>
              <button onClick={() => navigate("/taskqube-v3/tickets")} className="text-xs text-indigo-600 flex items-center gap-1">TaskQube <ArrowUpRight size={12}/></button>
            </div>
            {(taskqube.ticketByStatusOpen || []).length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Açık bilet yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={(taskqube.ticketByStatusOpen||[]).map(d=>({name:d.status_label || d.status, c:d.c}))}
                  margin={{top:10, right:10, left:0, bottom:70}}
                >
                  <XAxis
                    dataKey="name"
                    tick={{fontSize:10}}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                  <Bar dataKey="c" fill="#6366f1" radius={[4,4,0,0]} name="Bilet"/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ─── SATIŞ ─── */}
      {activeTab === "satis" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Satış & Teklifler</h3>
              <button onClick={() => navigate("/satis-teklifleri")} className="text-xs text-indigo-600 flex items-center gap-1">Teklifler <ArrowUpRight size={12}/></button>
            </div>
            <div className="space-y-2 mb-4">
              {[
                { label: "Bu Ay Teklif", value: `${fmt(sales.thisMonthOffers.c)} adet`, sub: `${fmtMoney(sales.thisMonthOffers.s)} ₺`, color: "text-foreground" },
                { label: "Pipeline (Açık Teklif)", value: `${fmtMoney((sales.pipeline||{}).s || 0)} ₺`, sub: `${fmt((sales.pipeline||{}).c || 0)} teklif masada`, color: "text-indigo-600" },
                { label: "Kazanma Oranı", value: sales.winRate === null || sales.winRate === undefined ? "—" : `%${sales.winRate}`, sub: `${fmt(sales.wonCount||0)} kazanıldı / ${fmt(sales.lostCount||0)} kaybedildi`, color: "text-emerald-600" },
                { label: "Yıllık Kabul", value: `${fmt(sales.acceptedOffers.c)} adet`, sub: `${fmtMoney(sales.acceptedOffers.s)} ₺`, color: "text-emerald-600" },
                { label: "Aday Müşteri", value: fmt(sales.potentialCustomers), sub: "takipte", color: "text-amber-600" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <div className="text-right">
                    <span className={`font-bold text-sm ${item.color}`}>{item.value}</span>
                    {item.sub && <span className="text-xs text-muted-foreground ml-1">{item.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={trends.offers.map(d=>({name:monthLabel(d.month),c:d.c}))}>
                <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                <Bar dataKey="c" fill="#6366f1" radius={[3,3,0,0]} name="Teklif"/>
                <Tooltip/>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Aylik Teklif Tutari (TL)</p>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={trends.offers.map(d=>({name:monthLabel(d.month),s:d.s}))}>
                  <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v)=>fmtMoney(v)+" TL"}/>
                  <Bar dataKey="s" fill="#10b981" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <h3 className="font-semibold text-foreground mb-4">Teklif Durum Dagilimi</h3>
            {(sales.offersByStatus||[]).filter(o=>o.status).length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie data={(sales.offersByStatus||[]).filter(o=>o.status).map(o=>({name:DEAL_LABELS[o.status]||o.status, value:o.c}))}
                      dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                      {(sales.offersByStatus||[]).filter(o=>o.status).map((o,i)=><Cell key={i} fill={DEAL_COLORS[i % DEAL_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {(sales.offersByStatus||[]).filter(o=>o.status).map((o,i)=>(
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:DEAL_COLORS[i % DEAL_COLORS.length]}}/><span className="text-muted-foreground">{DEAL_LABELS[o.status]||o.status}</span></div>
                      <span className="font-bold">{o.c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Teklif verisi yok</p>
            )}
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Musteri / Aday</p>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={[{name:"Musteri",v:sales.totalCustomers||0},{name:"Aday",v:sales.potentialCustomers||0}]} layout="vertical">
                  <XAxis type="number" tick={{fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={60} axisLine={false} tickLine={false}/>
                  <Tooltip/>
                  <Bar dataKey="v" radius={[0,4,4,0]}>
                    <Cell fill="#16a34a"/><Cell fill="#d97706"/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Satış Aktiviteleri</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Bu ay {salesAct.thisMonth || 0} · Geçen ay {salesAct.lastMonth || 0}
              </span>
            </div>
            {(salesAct.byType || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aktivite verisi yok</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {(salesAct.byType || []).map((t) => {
                    const c = SALES_ACT_COLORS[t.type] || SALES_ACT_FALLBACK;
                    return (
                      <div key={t.type} className={`border rounded-xl p-4 text-center ${c.box}`}>
                        <div className={`text-3xl font-black ${c.num}`}>{t.c}</div>
                        <div className={`text-xs mt-1 ${c.lbl}`}>
                          {SALES_ACT_LABELS[t.type] || t.type}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-3 border-t border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Son Aktiviteler</p>
                  <div className="space-y-2">
                    {(salesAct.recent || []).map((a) => (
                      <div key={a.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="truncate">
                            <span className="font-medium">{a.customer_name || "-"}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {SALES_ACT_LABELS[a.activity_type] || a.activity_type}
                            </span>
                          </div>
                          {(a.employee_name || a.contact_person) && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {a.employee_name}
                              {a.employee_name && a.contact_person ? " \u00b7 " : ""}
                              {a.contact_person}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{a.date ? a.date.split("-").reverse().join("/") : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Aylık Kazanılan / Kaybedilen Teklif</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Son 6 ay · {fmt((trends.offersWonLost||[]).reduce((a,b)=>a+(b.won||0),0))} kazanıldı / {fmt((trends.offersWonLost||[]).reduce((a,b)=>a+(b.lost||0),0))} kaybedildi
              </span>
            </div>
            {(trends.offersWonLost||[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Kazanılan/kaybedilen teklif yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={(trends.offersWonLost||[]).map(d=>({name:monthLabel(d.month), won:d.won, lost:d.lost}))} margin={{top:10,right:10,left:0,bottom:5}}>
                  <XAxis dataKey="name" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                  <Legend wrapperStyle={{fontSize:"12px"}}/>
                  <Bar dataKey="won" fill="#10b981" radius={[3,3,0,0]} name="Kazanıldı"/>
                  <Bar dataKey="lost" fill="#ef4444" radius={[3,3,0,0]} name="Kaybedildi"/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ─── SATIŞ SONRASI ─── */}
      {activeTab === "satis_sonrasi" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sözleşme Durumu */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500"/> Sözleşme Durumu</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{contractTotal} toplam</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 text-center cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => navigate("/musteriler")}>
                <div className="text-2xl font-black text-emerald-600">{contractActive}</div>
                <div className="text-xs text-emerald-500 mt-1">Aktif Sözleşme</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-indigo-600">{fmtMoney(data.contracts?.valueActive || 0)} ₺</div>
                <div className="text-xs text-indigo-500 mt-1">Aktif Sözleşme Değeri</div>
              </div>
            </div>
            {(data.contracts?.stats||[]).length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(data.contracts?.stats||[]).map(s=>({name:CONTRACT_STATUS_LABELS[s.status]||s.status, c:s.c}))} margin={{top:10,right:10,left:0,bottom:60}}>
                  <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={80}/>
                  <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}}/>
                  <Bar dataKey="c" radius={[4,4,0,0]} name="Sözleşme">
                    {(data.contracts?.stats||[]).map((e,i)=><Cell key={i} fill={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Sözleşme Türüne Göre + listeler */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Sözleşme Türüne Göre</h3>
              <button onClick={() => navigate("/musteriler")} className="text-xs text-indigo-600 flex items-center gap-1">Müşteriler <ArrowUpRight size={12}/></button>
            </div>
            {(data.contracts?.byType||[]).length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(data.contracts?.byType||[]).map(t=>({name:t.type, c:t.c, s:t.s}))} margin={{top:10,right:10,left:0,bottom:50}}>
                  <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={70}/>
                  <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}} formatter={(v,n,p)=>n==="Adet" ? [`${v} adet · ${fmtMoney(p.payload.s)} ₺`, "Sözleşme"] : v}/>
                  <Bar dataKey="c" radius={[4,4,0,0]} name="Adet">
                    {(data.contracts?.byType||[]).map((e,i)=><Cell key={i} fill={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {(data.contracts?.expiring||[]).length > 0 ? (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-semibold text-amber-600 mb-2">⚠️ 60 Gün İçinde Bitenler</p>
                <div className="space-y-2">
                  {data.contracts.expiring.map((c,i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{c.company_name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.title}</p>
                      </div>
                      <span className="text-[11px] text-amber-600 font-medium shrink-0 ml-2">{c.end_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (data.contracts?.active||[]).length > 0 ? (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Aktif Sözleşmeler</p>
                <div className="space-y-2">
                  {data.contracts.active.slice(0,5).map((c,i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{c.company_name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.title}</p>
                      </div>
                      <span className="text-[11px] text-emerald-600 font-medium shrink-0 ml-2">{c.end_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Hakediş — Aylık Gerçekleşme */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Wallet className="w-4 h-4 text-indigo-500"/> Hakediş — Aylık Gerçekleşme</h3>
              <select
                value={hakedisYear}
                onChange={(e) => setHakedisYear(Number(e.target.value))}
                className="text-xs text-foreground bg-muted border border-border rounded-full px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {(data.hakedis?.years?.length ? data.hakedis.years : [new Date().getFullYear()]).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Yıl Hedefi", value: fmtMoney(data.hakedis?.totals?.hedef || 0) + " ₺", color: "text-slate-600" },
                { label: "Gerçekleşen", value: fmtMoney(data.hakedis?.totals?.gerceklesen || 0) + " ₺", color: "text-emerald-600" },
                { label: "Oran", value: (data.hakedis?.totals?.hedef ? Math.round((data.hakedis.totals.gerceklesen / data.hakedis.totals.hedef) * 100) : 0) + "%", color: "text-indigo-600" },
              ].map((k, i) => (
                <div key={i} className="bg-muted/30 border border-border rounded-xl p-3 text-center">
                  <div className={`text-base font-black ${k.color}`}>{k.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{k.label}</div>
                </div>
              ))}
            </div>
            {(data.hakedis?.totals?.gerceklesen || 0) === 0 && (data.hakedis?.totals?.hedef || 0) === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Hakediş verisi yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={HK_MONTHS.map(([k, lbl]) => ({ name: lbl, v: (data.hakedis?.monthly?.[k]) || 0 }))} margin={{top:10,right:10,left:0,bottom:5}}>
                  <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false} interval={0}/>
                  <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v)=>fmtMoney(v)}/>
                  <Tooltip contentStyle={{borderRadius:"12px", fontSize:"12px"}} formatter={(v)=>[fmtMoney(v)+" ₺", "Gerçekleşen"]}/>
                  <Bar dataKey="v" fill="#6366f1" radius={[3,3,0,0]} name="Gerçekleşen"/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Hakediş Kırılımı: sektör + anlaşma türü */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <h3 className="font-semibold text-foreground mb-4">Hakediş Kırılımı ({data.hakedis?.year || "—"})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { baslik: "Sektöre Göre", veri: (data.hakedis?.bySektor || []).map(x => ({ name: x.sektor, v: x.gerceklesen })) },
                { baslik: "Anlaşma Türüne Göre", veri: (data.hakedis?.byAnlasma || []).map(x => ({ name: x.anlasma, v: x.gerceklesen })) },
              ].map((g) => (
                <div key={g.baslik}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{g.baslik}</p>
                  {g.veri.length === 0 ? (
                    <div className="flex items-center justify-center h-[180px] text-muted-foreground text-xs">Veri yok</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={g.veri} margin={{top:5,right:5,left:0,bottom:40}}>
                        <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={55}/>
                        <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} width={45} tickFormatter={(v)=>fmtMoney(v)}/>
                        <Tooltip formatter={(v)=>[fmtMoney(v)+" ₺", "Gerçekleşen"]}/>
                        <Bar dataKey="v" radius={[3,3,0,0]} name="Gerçekleşen">
                          {g.veri.map((e,i)=><Cell key={i} fill={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── İNSAN KAYNAKLARI ─── */}
      {activeTab === "ik" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">İnsan Kaynakları</h3>
              <button onClick={() => navigate("/calisanlar")} className="text-xs text-indigo-600 flex items-center gap-1">Çalışanlar <ArrowUpRight size={12}/></button>
            </div>
            <div className="space-y-1">
              {[
                { label: "Aktif Personel", value: fmt(hr.totalEmployees), color: "text-indigo-600", path: "/calisanlar" },
                { label: "Bugün İzinli", value: fmt(hr.onLeaveToday), color: "text-amber-600", path: "/ik-izin-yonetimi" },
                { label: "Bekleyen İzin", value: fmt(hr.pendingLeaves), color: hr.pendingLeaves > 0 ? "text-red-600" : "text-emerald-600", path: "/ik-izin-yonetimi" },
                { label: "Bu Ay Harcama", value: fmtMoney(hr.thisMonthExpenses) + " ₺", color: "text-green-600", path: "/ik-harcama-yonetimi" },
                { label: "Bekleyen Harcama", value: fmt(hr.pendingExpenses), color: hr.pendingExpenses > 0 ? "text-red-600" : "text-emerald-600", path: "/ik-harcama-yonetimi" },
              ].map((item, i) => (
                <div key={i} onClick={() => navigate(item.path)}
                  className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`font-bold text-sm ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* bugun-izinli-personel */}
            {(hr.onLeaveTodayList || []).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Bugün İzinli Personel</p>
                <div className="space-y-2">
                  {(hr.onLeaveTodayList || []).map((l) => (
                    <div
                      key={l.id}
                      onClick={() => navigate("/ik-izin-yonetimi")}
                      className="flex items-start justify-between gap-3 text-sm cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 py-1 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{l.employee_full_name || "-"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {l.leave_type || "-"}
                          {l.half_day_period
                            ? l.half_day_period === "ogleden_once"
                              ? " · yarım gün (öğleden önce)"
                              : " · yarım gün (öğleden sonra)"
                            : ""}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                        {l.end_date ? `${l.end_date.split("-").reverse().join("/")} dönüş` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <h3 className="font-semibold text-foreground mb-4">Aylık Harcama (Son 6 Ay)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { baslik: "Onaylanan", veri: trends.expenses, renk: "#10b981", etiket: "text-emerald-600" },
                { baslik: "Onay Bekleyen", veri: trends.expensesPending, renk: "#f59e0b", etiket: "text-amber-600" },
              ].map((g) => {
                const data = (g.veri || []).map(d => ({ name: monthLabel(d.month), total: d.total }));
                const toplam = data.reduce((s, d) => s + (d.total || 0), 0);
                return (
                  <div key={g.baslik}>
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground">{g.baslik}</p>
                      <p className={`text-sm font-bold ${g.etiket}`}>{fmtMoney(toplam)} ₺</p>
                    </div>
                    {data.length === 0 ? (
                      <div className="flex items-center justify-center h-[180px] text-muted-foreground text-xs">
                        Veri yok
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={data} margin={{top:5, right:5, left:0, bottom:5}}>
                          <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false} width={45}/>
                          <Tooltip formatter={(v)=>fmtMoney(v)+" TL"}/>
                          <Bar dataKey="total" fill={g.renk} radius={[3,3,0,0]} name={g.baslik}/>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TASKQUBE & AKTİVİTELER ─── */}
      {activeTab === "taskqube" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">TaskQube Bilet Durumu</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Aktif biletlerin dağılımı</p>
              </div>
              <button onClick={() => navigate("/taskqube-v3/tickets")} className="text-xs text-indigo-600 flex items-center gap-1">Biletler <ArrowUpRight size={12}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Açık Bilet", value: fmt(ticketOpen), color: "bg-amber-50 text-amber-600 border-amber-200" },
                { label: "Bu Ay Çözülen", value: fmt(taskqube.resolvedThisMonth), color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
                { label: "Gecikmiş", value: fmt(taskqube.overdueTickets), color: taskqube.overdueTickets > 0 ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-400 border-gray-200" },
                { label: "Tamamlanan", value: fmt(ticketDone), color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
              ].map((item, i) => (
                <div key={i} className={`${item.color} border rounded-xl p-3 text-center`}>
                  <div className="text-2xl font-black">{item.value}</div>
                  <div className="text-xs mt-1 opacity-80">{item.label}</div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={taskqube.ticketsByStatus.filter(t=>!['arsivlendi','sonuclanan','iptal'].includes(t.status)).slice(0,7).map(d=>({name:d.status_label || d.status.replace(/_/g," "), c:d.c}))} layout="vertical">
                <XAxis type="number" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{fontSize:8}} width={120} axisLine={false} tickLine={false}/>
                <Tooltip/>
                <Bar dataKey="c" fill="#6366f1" radius={[0,4,4,0]} name="Bilet"/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Aktiviteler</h3>
              <button onClick={() => navigate("/aktiviteler")} className="text-xs text-indigo-600 flex items-center gap-1">Aktiviteler <ArrowUpRight size={12}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Bu Ay Aktivite", value: fmt(activities.thisMonthActivities), color: "bg-purple-50 text-purple-600 border-purple-200" },
                { label: "Geçen Ay", value: fmt(activities.lastMonthActivities), color: "bg-slate-50 text-slate-600 border-slate-200" },
                { label: "Yaklaşan Ziyaret", value: fmt(activities.upcomingVisits), color: "bg-blue-50 text-blue-600 border-blue-200" },
                { label: "Değişim", value: `${actTrend >= 0 ? "↑" : "↓"} ${Math.abs(actTrend)}%`, color: actTrend >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200" },
              ].map((item, i) => (
                <div key={i} className={`${item.color} border rounded-xl p-3 text-center`}>
                  <div className="text-2xl font-black">{item.value}</div>
                  <div className="text-xs mt-1 opacity-80">{item.label}</div>
                </div>
              ))}
            </div>
            {trends?.activities?.length > 0 && (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={trends.activities.map(d=>({name:monthLabel(d.month),c:d.total}))}>
                  <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                  <Tooltip/>
                  <Bar dataKey="c" fill="#a855f7" radius={[3,3,0,0]} name="Aktivite"/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pb-2">
        Son güncelleme: {new Date(data.generatedAt).toLocaleTimeString("tr-TR")} · Her 10 dakikada otomatik yenilenir
      </div>
    </div>
  );
}
