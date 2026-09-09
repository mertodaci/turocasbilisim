import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Search, List, LayoutGrid, AlertTriangle, Clock, CheckCircle2, Circle, ArrowUpCircle, Filter, X, User } from "lucide-react";
import WorkTaskCard from "@/components/work-tasks/WorkTaskCard";
import WorkTaskKanban from "@/components/work-tasks/WorkTaskKanban";
import WorkTaskFormDialog from "@/components/work-tasks/WorkTaskFormDialog";
import { cn } from "@/lib/utils";

const STATUS_CFG = {
  beklemede:    { label:"Beklemede",    icon: Circle,        color:"text-slate-500",  bg:"bg-slate-100",  light:"bg-slate-50 border-slate-200" },
  devam_ediyor: { label:"Devam Ediyor", icon: ArrowUpCircle, color:"text-blue-500",   bg:"bg-blue-100",   light:"bg-blue-50 border-blue-200" },
  onay_bekliyor:{ label:"Onay Bekliyor",icon: Clock,         color:"text-amber-500",  bg:"bg-amber-100",  light:"bg-amber-50 border-amber-200" },
  tamamlandi:   { label:"Tamamlandı",   icon: CheckCircle2,  color:"text-emerald-500",bg:"bg-emerald-100",light:"bg-emerald-50 border-emerald-200" },
  iptal:        { label:"İptal",        icon: Circle,        color:"text-red-500",    bg:"bg-red-100",    light:"bg-red-50 border-red-200" },
};

const PRIORITY_CFG = {
  dusuk:  { label:"Düşük",  cls:"bg-slate-100 text-slate-600 border-slate-200",  dot:"bg-slate-400" },
  orta:   { label:"Orta",   cls:"bg-blue-100 text-blue-700 border-blue-200",     dot:"bg-blue-500" },
  yuksek: { label:"Yüksek", cls:"bg-orange-100 text-orange-700 border-orange-200",dot:"bg-orange-500" },
  kritik: { label:"Kritik", cls:"bg-red-100 text-red-700 border-red-200",        dot:"bg-red-500" },
};

export default function WorkTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterMine, setFilterMine] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["work-tasks"],
    queryFn: () => flowApi.entities.WorkTask.list("-created_date", 200),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.WorkTask.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["work-tasks"] }); setShowForm(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.WorkTask.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["work-tasks"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.WorkTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["work-tasks"] }),
  });

  const stats = useMemo(() => ({
    total: tasks.length,
    devam: tasks.filter(t=>t.status==="devam_ediyor").length,
    bekleyen: tasks.filter(t=>t.status==="beklemede"||t.status==="onay_bekliyor").length,
    tamamlanan: tasks.filter(t=>t.status==="tamamlandi").length,
    gecikmiş: tasks.filter(t=>t.due_date && new Date(t.due_date)<new Date() && t.status!=="tamamlandi" && t.status!=="iptal").length,
    kritik: tasks.filter(t=>t.priority==="kritik" && t.status!=="tamamlandi" && t.status!=="iptal").length,
  }), [tasks]);

  const filtered = useMemo(() => tasks.filter(t => {
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase()) && !t.assigned_to_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterMine && t.assigned_to_id !== user?.id && t.assigned_by_id !== user?.id) return false;
    return true;
  }), [tasks, search, filterStatus, filterPriority, filterMine, user]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage-1)*pageSize, currentPage*pageSize);

  const urgentTasks = tasks.filter(t => {
    const overdue = t.due_date && new Date(t.due_date)<new Date() && t.status!=="tamamlandi" && t.status!=="iptal";
    const critical = t.priority==="kritik" && t.status!=="tamamlandi" && t.status!=="iptal";
    return overdue || critical;
  });

  const hasFilter = filterStatus!=="all"||filterPriority!=="all"||filterMine||search;
  const clearFilters = () => { setFilterStatus("all"); setFilterPriority("all"); setFilterMine(false); setSearch(""); };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* BAŞLIK */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-indigo-500"/>İş Takip
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} görev listeleniyor</p>
        </div>
        <button onClick={()=>setShowForm(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium">
          <Plus className="w-4 h-4"/>Yeni Görev
        </button>
      </div>

      {/* STAT KARTLARI */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label:"Toplam",     val:stats.total,      color:"bg-indigo-500", onClick:()=>{setFilterStatus("all");setFilterPriority("all")} },
          { label:"Devam Eden", val:stats.devam,      color:"bg-blue-500",   onClick:()=>setFilterStatus("devam_ediyor") },
          { label:"Bekleyen",   val:stats.bekleyen,   color:"bg-amber-500",  onClick:()=>setFilterStatus("beklemede") },
          { label:"Tamamlanan", val:stats.tamamlanan, color:"bg-emerald-500",onClick:()=>setFilterStatus("tamamlandi") },
          { label:"Gecikmiş",   val:stats.gecikmiş,   color:"bg-red-500",    onClick:()=>{} },
          { label:"Kritik",     val:stats.kritik,     color:"bg-rose-600",   onClick:()=>setFilterPriority("kritik") },
        ].map((s,i)=>(
          <button key={i} onClick={s.onClick}
            className="bg-card border border-border/50 rounded-2xl p-3 text-left hover:border-indigo-200 transition-all shadow-sm">
            <div className={cn("w-2 h-2 rounded-full mb-2", s.color)}/>
            <div className="text-2xl font-bold">{s.val}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      {/* ACİL UYARI */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5"/>
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400">{urgentTasks.length} acil / vadesi geçmiş görev</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
              {urgentTasks.slice(0,3).map(t=>t.title).join(" · ")}{urgentTasks.length>3&&` +${urgentTasks.length-3} diğer`}
            </p>
          </div>
        </div>
      )}

      {/* FİLTRE & GÖRÜNÜM */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Görev veya kişi ara..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
          </div>
          <button onClick={()=>setFilterOpen(p=>!p)}
            className={cn("flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-all font-medium",
              filterOpen||hasFilter?"bg-indigo-600 text-white border-indigo-600":"border-border text-muted-foreground hover:border-indigo-400")}>
            <Filter className="w-3.5 h-3.5"/>Filtrele
            {hasFilter&&<span className="bg-white/20 text-xs rounded-full px-1.5">{[filterStatus!=="all",filterPriority!=="all",filterMine,!!search].filter(Boolean).length}</span>}
          </button>
          <button onClick={()=>setFilterMine(p=>!p)}
            className={cn("flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-all font-medium",
              filterMine?"bg-purple-600 text-white border-purple-600":"border-border text-muted-foreground hover:border-purple-400")}>
            <User className="w-3.5 h-3.5"/>Benim Görevlerim
          </button>
          {hasFilter && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1"><X className="w-3 h-3"/>Temizle</button>}
          <div className="ml-auto flex items-center gap-0.5 bg-muted rounded-xl p-1">
            {[{v:"list",i:List,l:"Liste"},{v:"kanban",i:LayoutGrid,l:"Kanban"}].map(({v,i:Icon,l})=>(
              <button key={v} onClick={()=>setView(v)}
                className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all font-medium",
                  view===v?"bg-white dark:bg-card shadow-sm text-foreground":"text-muted-foreground hover:text-foreground")}>
                <Icon className="w-3.5 h-3.5"/>{l}
              </button>
            ))}
          </div>
        </div>

        {filterOpen && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Durum</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={()=>setFilterStatus("all")}
                  className={cn("text-xs px-2.5 py-1 rounded-full border transition-all",filterStatus==="all"?"bg-indigo-600 text-white border-indigo-600":"border-border text-muted-foreground hover:border-indigo-400")}>
                  Tümü
                </button>
                {Object.entries(STATUS_CFG).map(([k,v])=>(
                  <button key={k} onClick={()=>setFilterStatus(filterStatus===k?"all":k)}
                    className={cn("text-xs px-2.5 py-1 rounded-full border transition-all",
                      filterStatus===k?`${v.bg} ${v.color} border-current`:"border-border text-muted-foreground hover:border-indigo-400")}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Öncelik</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={()=>setFilterPriority("all")}
                  className={cn("text-xs px-2.5 py-1 rounded-full border transition-all",filterPriority==="all"?"bg-indigo-600 text-white border-indigo-600":"border-border text-muted-foreground hover:border-indigo-400")}>
                  Tümü
                </button>
                {Object.entries(PRIORITY_CFG).map(([k,v])=>(
                  <button key={k} onClick={()=>setFilterPriority(filterPriority===k?"all":k)}
                    className={cn("text-xs px-2.5 py-1 rounded-full border transition-all",
                      filterPriority===k?`${v.cls}`:"border-border text-muted-foreground hover:border-indigo-400")}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* İÇERİK */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"/>
        </div>
      ) : view === "kanban" ? (
        <WorkTaskKanban tasks={filtered} onUpdate={(id,data)=>updateMutation.mutate({id,data})}/>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-20"/>
          <p className="text-sm text-muted-foreground">Görev bulunamadı</p>
          {hasFilter && <button onClick={clearFilters} className="text-xs text-indigo-500 mt-2 underline">Filtreleri temizle</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map(task=>(
            <WorkTaskCard key={task.id} task={task}
              onUpdate={(data)=>updateMutation.mutate({id:task.id,data})}
              onDelete={(id)=>deleteMutation.mutate(id)}/>
          ))}
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

      <WorkTaskFormDialog open={showForm} onOpenChange={setShowForm} employees={employees}
        onSubmit={(data)=>createMutation.mutate(data)}/>
    </div>
  );
}
