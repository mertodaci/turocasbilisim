import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { activityTypes, outcomeLabels } from "@/lib/activityHelpers";
import {
  Activity as ActivityIcon, TrendingUp, FileText, Search, Filter, X, Plus, Trash2,
  Clock, MapPin, CalendarDays, ChevronRight, Link2, MoreHorizontal,
  Phone, Users, Mail, Presentation, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

const SALES_TYPE_ICON = {
  telefon_gorusmesi: { icon: Phone, bg: "bg-blue-100", ic: "text-blue-600" },
  musteri_ziyareti: { icon: MapPin, bg: "bg-emerald-100", ic: "text-emerald-600" },
  musteri_toplantisi: { icon: Users, bg: "bg-indigo-100", ic: "text-indigo-600" },
  saha_ziyareti: { icon: MapPin, bg: "bg-orange-100", ic: "text-orange-600" },
  demo_sunum: { icon: Presentation, bg: "bg-pink-100", ic: "text-pink-600" },
  teklif_sunumu: { icon: FileText, bg: "bg-violet-100", ic: "text-violet-600" },
  email_yazisma: { icon: Mail, bg: "bg-cyan-100", ic: "text-cyan-600" },
  satis_gorusmesi: { icon: TrendingUp, bg: "bg-green-100", ic: "text-green-600" },
};
const getTypeCfg = (t) => SALES_TYPE_ICON[t] || { icon: ActivityIcon, bg: "bg-gray-100", ic: "text-gray-600" };

// "HH:MM" iki saat arasi dakika farki (gece yarisini gecerse +24s)
function minutesBetween(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export default function AddSalesActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const parentId = urlParams.get("parent_id") || "";
  const canDelete = user?.role === "admin" || user?.role === "satis";

  // ---- liste + filtre state ----
  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toDelete, setToDelete] = useState(null);

  // ---- form (dialog) state ----
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    employee_id: "",
    activity_type: "",
    duration_minutes: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "",
    end_time: "",
    customer_id: "",
    customer_name: "",
    notes: "",
    outcome: "",
    note_type: "",
    next_visit_date: "",
    parent_activity_id: parentId,
    title: "",
    valid_until: "",
    deal_status: "taslak",
    products: "",
    amount: "",
    currency: "TRY",
  });

  const { data: salesList = [], isLoading } = useQuery({
    queryKey: ["sales_activities", "list"],
    queryFn: () => flowApi.entities.SalesActivity.list("-date", 500),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.filter({ status: "aktif" }),
  });
  const { data: activityTypeOptions = [] } = useQuery({
    queryKey: ["definitions", "satis_aktivite_tipi"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "satis_aktivite_tipi", is_active: true }),
  });

  const getTypeLabel = (val) =>
    activityTypeOptions.find((d) => d.value === val)?.label ||
    activityTypes[val]?.label ||
    (val || "").replace(/_/g, " ");

  // Giriş yapan kullanıcıyla eşleşen çalışanı forma otomatik seç
  useEffect(() => {
    if (!user || form.employee_id || employees.length === 0) return;
    const matched = employees.find((e) => e.email === user.email);
    if (matched) setForm((f) => ({ ...f, employee_id: matched.id }));
  }, [employees, user]); // eslint-disable-line

  // URL parametreleriyle gelindiyse (add=1, parent_id, customer_id, activity_type)
  // formu otomatik aç ve ön-doldur -- kisayol butonlari (panel, musteri detayi) icin.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const wantOpen = p.get("add") === "1" || p.get("parent_id") || p.get("customer_id") || p.get("activity_type");
    if (!wantOpen) return;
    setEditing(null);
    setForm((f) => ({
      ...f,
      parent_activity_id: p.get("parent_id") || "",
      customer_id: p.get("customer_id") || "",
      customer_name: p.get("customer_name") || "",
      activity_type: p.get("activity_type") || f.activity_type,
      date: p.get("date") || f.date,
      notes: p.get("notes") || f.notes,
    }));
    setShowForm(true);
  }, []); // eslint-disable-line

  const selectedEmployee = employees.find((e) => e.id === form.employee_id);

  // ---- filtreleme ----
  const filtered = useMemo(() => salesList.filter((a) => {
    if (filterEmployee !== "all" && a.employee_id !== filterEmployee) return false;
    if (filterType !== "all" && a.activity_type !== filterType) return false;
    if (filterOutcome !== "all" && a.outcome !== filterOutcome) return false;
    if (filterMonth !== "all" && !a.date?.startsWith(filterMonth)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.customer_name?.toLowerCase().includes(q) &&
          !a.employee_name?.toLowerCase().includes(q) &&
          !a.notes?.toLowerCase().includes(q) &&
          !a.title?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [salesList, filterEmployee, filterType, filterOutcome, filterMonth, search]);

  const stats = useMemo(() => ({
    total: filtered.length,
    teklif: filtered.filter((a) => a.activity_type === "teklif_sunumu").length,
    ziyaret: filtered.filter((a) => (a.activity_type || "").includes("ziyaret")).length,
    planned: filtered.filter((a) => a.next_visit_date).length,
  }), [filtered]);

  const months = useMemo(() => {
    const s = new Set(salesList.map((a) => a.date?.substring(0, 7)).filter(Boolean));
    return [...s].sort().reverse();
  }, [salesList]);

  const typeOptions = useMemo(
    () => [...new Set(salesList.map((a) => a.activity_type).filter(Boolean))],
    [salesList]
  );

  const hasFilter = filterEmployee !== "all" || filterType !== "all" || filterOutcome !== "all" || filterMonth !== "all" || !!search;
  const clearFilters = () => {
    setFilterEmployee("all"); setFilterType("all"); setFilterOutcome("all"); setFilterMonth("all"); setSearch("");
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ---- mutations ----
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.SalesActivity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_activities"] });
      setToDelete(null);
      toast.success("Aktivite silindi");
    },
    onError: (e) => toast.error(e?.message || "Silme başarısız"),
  });

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.SalesActivity.create(data),
    onError: (err) => toast.error("Aktivite kaydedilemedi: " + (err?.message || "Bilinmeyen hata")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_activities"] });
      toast.success("Aktivite kaydedildi");
      closeForm();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.SalesActivity.update(id, data),
    onError: (err) => toast.error("Güncellenemedi: " + (err?.message || "Bilinmeyen hata")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_activities"] });
      toast.success("Aktivite güncellendi");
      closeForm();
    },
  });
  const saving = createMutation.isPending || updateMutation.isPending;

  const openForm = (activity = null) => {
    setEditing(activity);
    if (activity) {
      setForm({
        employee_id: activity.employee_id || form.employee_id || "",
        activity_type: activity.activity_type || "",
        duration_minutes: activity.duration_minutes ?? "",
        date: activity.date || format(new Date(), "yyyy-MM-dd"),
        start_time: activity.start_time || "",
        end_time: activity.end_time || "",
        customer_id: activity.customer_id || "",
        customer_name: activity.customer_name || "",
        notes: activity.notes || "",
        outcome: activity.outcome || "",
        note_type: activity.note_type || "",
        next_visit_date: activity.next_visit_date || "",
        parent_activity_id: activity.parent_activity_id || "",
        title: activity.title || "",
        valid_until: activity.valid_until || "",
        deal_status: activity.deal_status || "taslak",
        products: activity.products || "",
        amount: activity.amount ?? "",
        currency: activity.currency || "TRY",
      });
    } else {
      setForm((f) => ({
        employee_id: f.employee_id || "",
        activity_type: "", duration_minutes: "",
        date: format(new Date(), "yyyy-MM-dd"),
        start_time: "", end_time: "",
        customer_id: "", customer_name: "",
        notes: "", outcome: "", note_type: "",
        next_visit_date: "", parent_activity_id: parentId || "",
        title: "", valid_until: "", deal_status: "taslak",
        products: "", amount: "", currency: "TRY",
      }));
    }
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.activity_type || !form.duration_minutes || !form.outcome) {
      toast.error("Aktivite tipi, süre ve sonuç alanları zorunludur!");
      return;
    }
    const selectedCustomer = customers.find((c) => c.id === form.customer_id);
    const payload = {
      ...form,
      employee_name: selectedEmployee?.full_name || editing?.employee_name || "",
      duration_minutes: Number(form.duration_minutes),
      customer_name: selectedCustomer?.company_name || form.customer_name || "",
      customer_id: form.customer_id || "",
      amount: form.activity_type === "teklif_sunumu" && form.amount ? Number(form.amount) : null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* BAŞLIK */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-500" />Satış Aktiviteleri
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} aktivite listeleniyor</p>
        </div>
        <button
          onClick={() => openForm(null)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />Aktivite Ekle
        </button>
      </div>

      {parentId && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <Link2 className="w-4 h-4 shrink-0" />
          <span>Bu aktivite bir önceki aktiviteye bağlı olarak kaydedilecek.</span>
        </div>
      )}

      {/* STAT KARTLARI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam", val: stats.total, icon: ActivityIcon, color: "bg-indigo-500" },
          { label: "Teklif", val: stats.teklif, icon: FileText, color: "bg-emerald-500" },
          { label: "Ziyaret", val: stats.ziyaret, icon: MapPin, color: "bg-amber-500" },
          { label: "Ziyaret Planı", val: stats.planned, icon: CalendarDays, color: "bg-purple-500" },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className={cn("p-2.5 rounded-xl", s.color)}><s.icon className="w-4 h-4 text-white" /></div>
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
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Müşteri, çalışan veya not ara..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={() => setFilterOpen((p) => !p)}
            className={cn(
              "flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-all font-medium",
              filterOpen || hasFilter ? "bg-indigo-600 text-white border-indigo-600" : "border-border text-muted-foreground hover:border-indigo-400"
            )}
          >
            <Filter className="w-3.5 h-3.5" />Filtrele
            {hasFilter && (
              <span className="bg-white/20 text-xs rounded-full px-1.5">
                {[filterEmployee !== "all", filterType !== "all", filterOutcome !== "all", filterMonth !== "all", !!search].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasFilter && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline flex items-center gap-1">
              <X className="w-3 h-3" />Temizle
            </button>
          )}
        </div>

        {filterOpen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border/30">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Çalışan</p>
              <select value={filterEmployee} onChange={(e) => { setFilterEmployee(e.target.value); setPage(1); }} className="w-full text-xs border border-border/50 rounded-xl px-3 py-2 bg-background">
                <option value="all">Tümü</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Aktivite Tipi</p>
              <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} className="w-full text-xs border border-border/50 rounded-xl px-3 py-2 bg-background">
                <option value="all">Tümü</option>
                {typeOptions.map((t) => <option key={t} value={t}>{getTypeLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Sonuç</p>
              <select value={filterOutcome} onChange={(e) => { setFilterOutcome(e.target.value); setPage(1); }} className="w-full text-xs border border-border/50 rounded-xl px-3 py-2 bg-background">
                <option value="all">Tümü</option>
                {Object.entries(outcomeLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Ay</p>
              <select value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }} className="w-full text-xs border border-border/50 rounded-xl px-3 py-2 bg-background">
                <option value="all">Tümü</option>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* LİSTE */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <ActivityIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aktivite bulunamadı</p>
          {hasFilter && <button onClick={clearFilters} className="text-xs text-indigo-500 mt-2 underline">Filtreleri temizle</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((a) => {
            const cfg = getTypeCfg(a.activity_type);
            const Icon = cfg.icon;
            const outcome = outcomeLabels[a.outcome];
            return (
              <div
                key={a.id}
                className="bg-card border border-border/50 rounded-2xl px-4 py-3 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => openForm(a)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                    <Icon className={cn("w-5 h-5", cfg.ic)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{a.customer_name || a.title || "-"}</span>
                      <span className="text-xs font-medium text-muted-foreground">{getTypeLabel(a.activity_type)}</span>
                      {a.employee_name && <span className="text-xs text-muted-foreground">{a.employee_name}</span>}
                      {outcome && <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", outcome.bg, outcome.color)}>{outcome.label}</span>}
                      {a.activity_type === "teklif_sunumu" && a.amount ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {parseFloat(a.amount).toLocaleString("tr-TR")} {a.currency || "TRY"}
                        </span>
                      ) : null}
                    </div>
                    {a.notes && <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-lg">{a.notes}</p>}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {a.duration_minutes > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{a.duration_minutes}dk</span>}
                      {a.location && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{a.location}</span>}
                      {a.next_visit_date && <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200"><CalendarDays className="w-3 h-3" />Sonraki: {a.next_visit_date}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 mr-1">
                    <p className="text-sm font-bold text-foreground">{a.date ? format(new Date(a.date), "d MMM", { locale: tr }) : "-"}</p>
                    <p className="text-xs text-muted-foreground">{a.date ? format(new Date(a.date), "yyyy") : ""}</p>
                  </div>
                  {canDelete && (
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" onClick={() => setToDelete(a)} disabled={deleteMutation.isPending}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-indigo-400 transition-colors shrink-0" />
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
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-border/50 rounded-lg px-2 py-1 text-xs bg-background">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>{filtered.length} kayıt</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors text-xs font-medium">← Önceki</button>
            <span className="text-xs text-muted-foreground font-medium">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors text-xs font-medium">Sonraki →</button>
          </div>
        </div>
      )}

      {/* FORM DIALOG */}
      <Dialog open={showForm} onOpenChange={(v) => !v && closeForm()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Satış Aktivitesi Düzenle" : "Satış Aktivitesi Ekle"}</DialogTitle>
          </DialogHeader>

          {form.parent_activity_id && !editing && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              <Link2 className="w-4 h-4 shrink-0" />
              <span>Bu aktivite bir önceki aktiviteye bağlı olarak kaydedilecek.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {selectedEmployee && (
              <div className="space-y-2">
                <Label>Çalışan</Label>
                <div className="px-4 py-3 rounded-xl bg-muted border border-border/50 text-sm font-medium text-foreground">
                  {selectedEmployee.full_name}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Aktivite Tipi *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(activityTypeOptions.length > 0
                  ? activityTypeOptions
                  : Object.entries(activityTypes).map(([k, v]) => ({ value: k, label: v.label }))
                ).map((opt) => {
                  const key = opt.value;
                  const Icon = activityTypes[key]?.icon || MoreHorizontal;
                  const isSelected = form.activity_type === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, activity_type: key })}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium",
                        isSelected ? "border-primary bg-primary/5 text-primary" : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-center leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tarih *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-xl" required />
              </div>
              <div className="space-y-2">
                <Label>Süre (dk) *</Label>
                <Input type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="30" className="rounded-xl" required />
              </div>
              <div className="space-y-2">
                <Label>Başlangıç Saati</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => {
                    const start_time = e.target.value;
                    const mins = minutesBetween(start_time, form.end_time);
                    setForm((f) => ({ ...f, start_time, ...(mins != null ? { duration_minutes: String(mins) } : {}) }));
                  }}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Bitiş Saati</Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => {
                    const end_time = e.target.value;
                    const mins = minutesBetween(form.start_time, end_time);
                    setForm((f) => ({ ...f, end_time, ...(mins != null ? { duration_minutes: String(mins) } : {}) }));
                  }}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Müşteri</Label>
                <Select value={form.customer_id || "none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Müşteri seçiniz (opsiyonel)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Seçilmedi —</SelectItem>
                    {[...customers].sort((a, b) => (a.company_name || "").localeCompare(b.company_name || "", "tr")).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sonuç *</Label>
                <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seçiniz (zorunlu)" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(outcomeLabels).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Aktivite hakkında notlar..." className="rounded-xl h-20" />
            </div>

            {form.activity_type === "teklif_sunumu" && (
              <div className="space-y-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <FileText className="w-4 h-4" /> Teklif Bilgileri
                </div>
                <div className="space-y-2">
                  <Label>Teklif Başlığı</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Teklif adı..." className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Geçerlilik Tarihi</Label>
                    <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Durum</Label>
                    <Select value={form.deal_status} onValueChange={(v) => setForm({ ...form, deal_status: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="taslak">Taslak</SelectItem>
                        <SelectItem value="gonderildi">Gönderildi</SelectItem>
                        <SelectItem value="gorusulmede">Görüşmede</SelectItem>
                        <SelectItem value="kazanildi">Kazanıldı</SelectItem>
                        <SelectItem value="kaybedildi">Kaybedildi</SelectItem>
                        <SelectItem value="iptal">İptal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tutar</Label>
                    <Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Para Birimi</Label>
                    <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">TRY ₺</SelectItem>
                        <SelectItem value="USD">USD $</SelectItem>
                        <SelectItem value="EUR">EUR €</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ürünler / Açıklama</Label>
                  <Textarea value={form.products} onChange={(e) => setForm({ ...form, products: e.target.value })} placeholder="Teklif edilen ürün ve hizmetler..." className="rounded-xl h-20" />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={closeForm}>İptal</Button>
              <Button type="submit" className="flex-1 rounded-xl h-11" disabled={!form.activity_type || !form.duration_minutes || !form.outcome || saving}>
                {saving ? "Kaydediliyor..." : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />{editing ? "Güncelle" : "Kaydet"}
                  </span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SİLME ONAYI */}
      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktivite silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toDelete?.customer_name || toDelete?.title || "-"}</strong> kaydı silinecek
              ({toDelete?.date || "-"}). Kayıt geri getirilebilir şekilde saklanır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(toDelete.id)} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
