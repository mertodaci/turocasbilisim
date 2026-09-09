import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, differenceInDays, max, min, parseISO, isSameMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

const TYPE_CONFIG = {
  kurulum: { label: "Kurulum", color: "bg-blue-500", light: "bg-blue-100 text-blue-700" },
  egitim: { label: "Eğitim", color: "bg-green-500", light: "bg-green-100 text-green-700" },
  destek: { label: "Destek", color: "bg-orange-500", light: "bg-orange-100 text-orange-700" },
  diger: { label: "Diğer", color: "bg-slate-500", light: "bg-slate-100 text-slate-700" },
};

const STATUS_CONFIG = {
  beklemede: { label: "Beklemede", color: "text-slate-500" },
  devam_ediyor: { label: "Devam Ediyor", color: "text-blue-500" },
  tamamlandi: { label: "Tamamlandı", color: "text-green-500" },
  iptal: { label: "İptal", color: "text-red-500" },
};

const empty = {
  customer_id: "", customer_name: "", title: "", type: "kurulum",
  start_date: "", end_date: "", status: "devam_ediyor", notes: ""
};

export default function ProjectPlanning() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(empty);
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [tooltip, setTooltip] = useState(null);

  const viewStart = startOfMonth(subMonths(currentDate, 1));
  const viewEnd = endOfMonth(addMonths(currentDate, 4));
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;

  const { data: projects = [] } = useQuery({
    queryKey: ["customer-projects"],
    queryFn: () => flowApi.entities.CustomerProject.list("-start_date", 200),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-active"],
    queryFn: () => flowApi.entities.Customer.filter({ status: "aktif" }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingProject
      ? flowApi.entities.CustomerProject.update(editingProject.id, data)
      : flowApi.entities.CustomerProject.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-projects"] });
      setShowForm(false);
      setEditingProject(null);
      setForm(empty);
      toast.success(editingProject ? "Proje güncellendi" : "Proje eklendi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.CustomerProject.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-projects"] });
      toast.success("Proje silindi");
    },
  });

  const handleEdit = (project) => {
    setEditingProject(project);
    setForm({
      customer_id: project.customer_id || "",
      customer_name: project.customer_name || "",
      title: project.title || "",
      type: project.type || "kurulum",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      status: project.status || "devam_ediyor",
      notes: project.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.start_date || !form.end_date) {
      toast.error("Başlık, başlangıç ve bitiş tarihi zorunlu");
      return;
    }
    saveMutation.mutate(form);
  };

  const getBarStyle = (project) => {
    if (!project.start_date || !project.end_date) return null;
    const pStart = max([parseISO(project.start_date), viewStart]);
    const pEnd = min([parseISO(project.end_date), viewEnd]);
    if (pEnd < viewStart || pStart > viewEnd) return null;
    const left = (differenceInDays(pStart, viewStart) / totalDays) * 100;
    const width = ((differenceInDays(pEnd, pStart) + 1) / totalDays) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  };

  // Bugünün pozisyonu
  const todayPosition = () => {
    const today = new Date();
    if (today < viewStart || today > viewEnd) return null;
    return (differenceInDays(today, viewStart) / totalDays) * 100;
  };

  const months = [];
  let d = viewStart;
  while (d <= viewEnd) {
    months.push(new Date(d));
    d = addMonths(d, 1);
  }

  const uniqueCustomers = [...new Set(projects.map(p => p.customer_name).filter(Boolean))].sort();

  const filtered = projects.filter(p => {
    const matchCustomer = filterCustomer === "all" || p.customer_name === filterCustomer;
    const matchType = filterType === "all" || p.type === filterType;
    return matchCustomer && matchType;
  });

  const todayPos = todayPosition();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proje Planlama</h1>
          <p className="text-sm text-muted-foreground mt-1">Müşteri kurulum ve eğitim süreçleri</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${cfg.color}`} />
                <span className="text-xs text-muted-foreground">{cfg.label}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => { setEditingProject(null); setForm(empty); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Yeni Proje
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex gap-3">
        <Select value={filterCustomer} onValueChange={setFilterCustomer}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Tüm Müşteriler" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Müşteriler</SelectItem>
            {uniqueCustomers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tüm Tipler" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Tipler</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground self-center">{filtered.length} proje</span>
      </div>

      {/* Gantt Chart */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Tarih Navigasyon */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(viewStart, "MMM yyyy", { locale: tr })} — {format(viewEnd, "MMM yyyy", { locale: tr })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Ay başlıkları */}
            <div className="flex border-b border-border/50">
              <div className="w-64 shrink-0 px-4 py-2 text-xs font-semibold text-muted-foreground border-r border-border/50">Proje</div>
              <div className="flex-1 flex">
                {months.map((m, i) => (
                  <div key={i} className={`flex-1 text-center text-xs font-semibold py-2 border-r border-border/30 last:border-r-0 ${isSameMonth(m, new Date()) ? "text-primary bg-primary/5" : "text-muted-foreground"}`}>
                    {format(m, "MMM yyyy", { locale: tr })}
                  </div>
                ))}
              </div>
            </div>

            {/* Proje satırları */}
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Henüz proje yok. Yeni proje ekleyin.
              </div>
            ) : (
              filtered.map((project) => {
                const barStyle = getBarStyle(project);
                const typeCfg = TYPE_CONFIG[project.type] || TYPE_CONFIG.diger;
                const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.devam_ediyor;
                return (
                  <div key={project.id} className="flex border-b border-border/20 hover:bg-muted/20 group">
                    <div className="w-64 shrink-0 px-4 py-3 border-r border-border/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{project.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{project.customer_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${typeCfg.color}`}>{typeCfg.label}</span>
                            <span className={`text-[10px] ${statusCfg.color}`}>{statusCfg.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(project)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                            if (confirm("Proje silinsin mi?")) deleteMutation.mutate(project.id);
                          }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 relative py-3 px-1" style={{ minHeight: "52px" }}>
                      {/* Ay çizgileri */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {months.map((m, i) => (
                          <div key={i} className={`flex-1 border-r border-border/20 last:border-r-0 ${isSameMonth(m, new Date()) ? "bg-primary/3" : ""}`} />
                        ))}
                      </div>

                      {/* Gantt bar */}
                      {barStyle && (
                        <div
                          className={`absolute top-2.5 h-6 rounded-full ${typeCfg.color} opacity-85 flex items-center px-2 cursor-pointer hover:opacity-100 transition-opacity`}
                          style={barStyle}
                          onMouseEnter={(e) => setTooltip({ project, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="text-[10px] text-white font-medium truncate">{project.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>


      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-card border border-border rounded-xl shadow-lg p-3 text-xs pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-semibold">{tooltip.project.title}</p>
          <p className="text-muted-foreground">{tooltip.project.customer_name}</p>
          <p className="mt-1">📅 {tooltip.project.start_date} → {tooltip.project.end_date}</p>
          <p>{TYPE_CONFIG[tooltip.project.type]?.label} · {STATUS_CONFIG[tooltip.project.status]?.label}</p>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditingProject(null); setForm(empty); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Proje Düzenle" : "Yeni Proje"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block">Müşteri</Label>
              <Select value={form.customer_id} onValueChange={(v) => {
                const c = customers.find(c => c.id === v);
                setForm({ ...form, customer_id: v, customer_name: c?.company_name || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Müşteri seçin" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Proje Başlığı *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Kurulum, Eğitim..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Tür</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Durum</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Başlangıç *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1.5 block">Bitiş *</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Notlar</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Opsiyonel..." />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>İptal</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={saveMutation.isPending}>
                {editingProject ? "Güncelle" : "Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
