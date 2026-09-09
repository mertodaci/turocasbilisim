import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Activity, Trash2, Pencil, Plus, Search, Filter, X, Phone, Users, MapPin, Mail, FileText, Monitor, BookOpen, Presentation, TestTube, TrendingUp, Clock, Building2, ChevronRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ActivityEditDialog from "@/components/activities/ActivityEditDialog";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const OUTCOME_CFG = {
  basarili:      { label:"✅ Başarılı",      cls:"bg-emerald-100 text-emerald-700 border-emerald-200" },
  basarisiz:     { label:"❌ Başarısız",     cls:"bg-red-100 text-red-700 border-red-200" },
  takip_gerekli: { label:"🔄 Takip Gerekli", cls:"bg-amber-100 text-amber-700 border-amber-200" },
  iptal:         { label:"🚫 İptal",         cls:"bg-gray-100 text-gray-600 border-gray-200" },
  belirsiz:      { label:"❓ Belirsiz",      cls:"bg-blue-100 text-blue-700 border-blue-200" },
};

const TYPE_CFG = {
  telefon_gorusmesi: { label:"Telefon",          icon: Phone,        bg:"bg-blue-100",    ic:"text-blue-600" },
  musteri_toplantisi:{ label:"Müşteri Toplantısı",icon: Users,        bg:"bg-indigo-100",  ic:"text-indigo-600" },
  ofis_toplantisi:   { label:"Ofis Toplantısı",  icon: Users,        bg:"bg-purple-100",  ic:"text-purple-600" },
  saha_ziyareti:     { label:"Saha Ziyareti",    icon: MapPin,       bg:"bg-emerald-100", ic:"text-emerald-600" },
  email_yazisma:     { label:"E-posta",          icon: Mail,         bg:"bg-cyan-100",    ic:"text-cyan-600" },
  rapor_yazimi:      { label:"Rapor",            icon: FileText,     bg:"bg-orange-100",  ic:"text-orange-600" },
  is_takibi:         { label:"İş Takibi",         icon: Monitor,      bg:"bg-slate-100",   ic:"text-slate-600" },
  egitim:            { label:"Eğitim",           icon: BookOpen,     bg:"bg-yellow-100",  ic:"text-yellow-600" },
  sunum:             { label:"Sunum",            icon: Presentation, bg:"bg-pink-100",    ic:"text-pink-600" },
  test:              { label:"Test",             icon: TestTube,     bg:"bg-teal-100",    ic:"text-teal-600" },
  satis:             { label:"Satış",            icon: TrendingUp,   bg:"bg-green-100",   ic:"text-green-600" },
  satis_gorusmesi:   { label:"Satış Görüşmesi",  icon: TrendingUp,   bg:"bg-green-100",   ic:"text-green-600" },
};

const getTypeCfg = (t) => TYPE_CFG[t] || { label: (t||"").replace(/_/g," "), icon: Activity, bg:"bg-gray-100", ic:"text-gray-600" };

export default function Activities() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterType, setFilterType] = useState(searchParams.get("type") || "all");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities-list"],
    queryFn: () => flowApi.entities.Activity.list("-date", 1000),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });
  const { data: activityTypeDefs = [] } = useQuery({
    queryKey: ["definitions", "aktivite_tipi"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "aktivite_tipi" }),
  });

  const getTypeLabel = (val) => activityTypeDefs.find(d=>d.value===val)?.label || getTypeCfg(val).label;

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.Activity.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities-list"] }); toast.success("Aktivite silindi"); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Activity.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities-list"] }); setEditActivity(null); toast.success("Aktivite güncellendi"); },
  });

  const months = useMemo(() => {
    const s = new Set(activities.map(a=>a.date?.substring(0,7)).filter(Boolean));
    return [...s].sort().reverse();
  }, [activities]);

  const filtered = useMemo(() => activities.filter(a => {
    if (filterEmployee !== "all" && a.employee_id !== filterEmployee) return false;
    if (filterType !== "all" && a.activity_type !== filterType) return false;
    if (filterOutcome !== "all" && a.outcome !== filterOutcome) return false;
    if (filterMonth !== "all" && !a.date?.startsWith(filterMonth)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.employee_name?.toLowerCase().includes(q) && !a.customer_name?.toLowerCase().includes(q) && !a.notes?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [activities, filterEmployee, filterType, filterOutcome, filterMonth, search]);

  const stats = useMemo(() => ({
    total: filtered.length,
    basarili: filtered.filter(a=>a.outcome==="basarili").length,
    totalMin: filtered.reduce((s,a)=>s+(a.duration_minutes||0),0),
    withVisit: filtered.filter(a=>a.next_visit_date).length,
  }), [filtered]);

  const hasFilter = filterEmployee!=="all"||filterType!=="all"||filterOutcome!=="all"||filterMonth!=="all"||search;

  const clearFilters = () => { setFilterEmployee("all"); setFilterType("all"); setFilterOutcome("all"); setFilterMonth("all"); setSearch(""); };

  const typeOptions = useMemo(() => {
    const s = new Set(activities.map(a=>a.activity_type).filter(Boolean));
    return [...s];
  }, [activities]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage-1)*pageSize, currentPage*pageSize);

  // Filtre değişince sayfayı sıfırla
  const resetPage = () => setCurrentPage(1);

  return (
    <div className="space-y-5 max-w-6xl">
      {/* BAŞLIK */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6 text-indigo-500"/>Aktiviteler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} aktivite listeleniyor</p>
        </div>
        <Link to="/aktivite-ekle" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium">
          <Plus className="w-4 h-4"/>Aktivite Ekle
        </Link>
      </div>

      {/* STAT KARTLARI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Toplam Aktivite", val: stats.total, icon: Activity, color:"bg-indigo-500" },
          { label:"Başarılı", val: stats.basarili, icon: CheckCircle2, color:"bg-emerald-500" },
          { label:"Toplam Süre", val: stats.totalMin >= 60 ? Math.round(stats.totalMin/60*10)/10+"s" : stats.totalMin+"dk", icon: Clock, color:"bg-amber-500" },
          { label:"Ziyaret Planı", val: stats.withVisit, icon: CalendarDays, color:"bg-purple-500" },
        ].map((s,i) => (
          <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className={cn("p-2.5 rounded-xl", s.color)}><s.icon className="w-4 h-4 text-white"/></div>
            <div>
              <div className="text-2xl font-bold">{s.val}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FİLTRELER */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Arama */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Çalışan, müşteri veya not ara..." className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
          </div>
          <button onClick={()=>setFilterOpen(p=>!p)} className={cn("flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-all font-medium", filterOpen||hasFilter?"bg-indigo-600 text-white border-indigo-600":"border-border text-muted-foreground hover:border-indigo-400")}>
            <Filter className="w-3.5 h-3.5"/>Filtrele
            {hasFilter&&<span className="bg-white/20 text-xs rounded-full px-1.5">{[filterEmployee!=="all",filterType!=="all",filterOutcome!=="all",filterMonth!=="all",!!search].filter(Boolean).length}</span>}
          </button>
          {hasFilter && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1"><X className="w-3 h-3"/>Temizle</button>}
        </div>

        {filterOpen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border/30">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Çalışan</p>
              <select value={filterEmployee} onChange={e=>setFilterEmployee(e.target.value)} className="w-full text-xs border border-border/50 rounded-xl px-3 py-2 bg-background">
                <option value="all">Tümü</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Aktivite Tipi</p>
              <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="w-full text-xs border border-border/50 rounded-xl px-3 py-2 bg-background">
                <option value="all">Tümü</option>
                {typeOptions.map(t=><option key={t} value={t}>{getTypeLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Sonuç</p>
              <select value={filterOutcome} onChange={e=>setFilterOutcome(e.target.value)} className="w-full text-xs border border-border/50 rounded-xl px-3 py-2 bg-background">
                <option value="all">Tümü</option>
                {Object.entries(OUTCOME_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Ay</p>
              <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className="w-full text-xs border border-border/50 rounded-xl px-3 py-2 bg-background">
                <option value="all">Tümü</option>
                {months.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* LİSTE */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30"/>
          <p className="text-sm text-muted-foreground">Aktivite bulunamadı</p>
          {hasFilter && <button onClick={clearFilters} className="text-xs text-indigo-500 mt-2 underline">Filtreleri temizle</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((a) => {
            const cfg = getTypeCfg(a.activity_type);
            const Icon = cfg.icon;
            const outcome = OUTCOME_CFG[a.outcome];
            const canEditDelete = user?.email === a.created_by || user?.role === "admin" || user?.role === "yonetici";
            return (
              <div key={a.id} className="bg-card border border-border/50 rounded-2xl px-4 py-3 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm transition-all cursor-pointer group"
                onClick={()=>navigate(`/aktivite/${a.id}`)}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                    <Icon className={cn("w-5 h-5", cfg.ic)}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{a.employee_name}</span>
                      <span className="text-xs font-medium text-muted-foreground">{getTypeLabel(a.activity_type)}</span>
                      {a.customer_name && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3"/>{a.customer_name}
                        </span>
                      )}
                      {outcome && <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", outcome.cls)}>{outcome.label}</span>}
                      {a.note_type && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">{a.note_type}</span>}
                    </div>
                    {a.notes && <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-lg">{a.notes}</p>}
                    {a.outcome_detail && <p className="text-xs text-muted-foreground/70 truncate mt-0.5 max-w-lg italic">"{a.outcome_detail}"</p>}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {a.duration_minutes > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3"/>{a.duration_minutes}dk</span>}
                      {a.location && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3"/>{a.location}</span>}
                      {a.next_visit_date && <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200"><CalendarDays className="w-3 h-3"/>Sonraki: {a.next_visit_date}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 mr-1">
                    <p className="text-sm font-bold text-foreground">{a.date ? format(new Date(a.date),"d MMM",{locale:tr}) : "-"}</p>
                    <p className="text-xs text-muted-foreground">{a.date ? format(new Date(a.date),"yyyy") : ""}</p>
                  </div>
                  {canEditDelete && (
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e=>e.stopPropagation()}>
                      <button className="p-1.5 rounded-lg hover:bg-muted transition-colors" onClick={()=>setEditActivity(a)}><Pencil className="w-3.5 h-3.5 text-muted-foreground"/></button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" onClick={()=>deleteMutation.mutate(a.id)} disabled={deleteMutation.isPending}><Trash2 className="w-3.5 h-3.5 text-red-400"/></button>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-indigo-400 transition-colors shrink-0"/>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* SAYFALAMA */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-card border border-border/50 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Sayfa başına:</span>
            <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setCurrentPage(1);}}
              className="border border-border/50 rounded-lg px-2 py-1 text-xs bg-background">
              {[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
            <span>{filtered.length} kayıt</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors text-xs font-medium">
              ← Önceki
            </button>
            <span className="text-xs text-muted-foreground font-medium">{currentPage} / {totalPages}</span>
            <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors text-xs font-medium">
              Sonraki →
            </button>
          </div>
        </div>
      )}

      <ActivityEditDialog
        activity={editActivity}
        employees={employees}
        onClose={()=>setEditActivity(null)}
        onSubmit={(data)=>updateMutation.mutate({id:editActivity.id,data})}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
