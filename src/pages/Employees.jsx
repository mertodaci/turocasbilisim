import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Phone, Mail, Briefcase, Trash2, Users, ChevronRight, Wallet, AlertTriangle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import EmployeeFormDialog from "@/components/employees/EmployeeFormDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/lib/RolePermissionsContext";
import { toast } from "sonner";

const AVATAR_COLORS = ["bg-indigo-500","bg-purple-500","bg-pink-500","bg-teal-500","bg-blue-500","bg-emerald-500","bg-orange-500","bg-rose-500"];

// Bordro hazırlık: kritik özlük/ücret alanı eksik = "tutarsız" (bordro eksik hesaplar)
const tutarsizMi = (e) => !e.tc || !e.sube_id || !e.hire_date || !(Number(e.aylik_ucret) > 0);

export default function Employees() {
  const [params, setParams] = useSearchParams();
  const bordroMode = params.get("f") === "bordro";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("aktif");
  const [deptFilter, setDeptFilter] = useState("all");
  const [subeFilter, setSubeFilter] = useState("");
  const [sadeceTutarsiz, setSadeceTutarsiz] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [cikisFor, setCikisFor] = useState(null);
  const [cikisForm, setCikisForm] = useState({ exit_date: "", exit_reason: "", exit_notes: "" });
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { can } = useRolePermissions();
  const isPrivileged = user?.role === "admin" || user?.role === "yonetici" || can(user?.role, "employees", "add");

  const { data: subeler = [] } = useQuery({
    queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000), enabled: bordroMode,
  });
  const subeAd = (id) => subeler.find((s) => s.id === id)?.ad || "";
  const cikisMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.ik.cikisVer(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setCikisFor(null); toast.success("Çıkış işlendi"); },
    onError: (e) => toast.error(String(e?.message || "İşlenemedi")),
  });
  const toggleBordro = () => setParams(bordroMode ? {} : { f: "bordro" }, { replace: true });

  const { data: departmentDefs = [] } = useQuery({ queryKey: ["definitions","departman"], queryFn: () => flowApi.entities.Definition.filter({ category: "departman" }) });
  const { data: positionDefs = [] } = useQuery({ queryKey: ["definitions","pozisyon"], queryFn: () => flowApi.entities.Definition.filter({ category: "pozisyon" }) });
  const getDeptLabel = (val) => departmentDefs.find(d=>d.value===val)?.label || val || "-";
  const getPosLabel = (val) => positionDefs.find(p=>p.value===val)?.label || val || "-";

  const { data: employees = [], isLoading } = useQuery({ queryKey: ["employees"], queryFn: () => flowApi.entities.Employee.list() });

  const loginToast = (res) => toast.success(
    res?._login_created
      ? `Çalışan kaydedildi. Giriş hesabı oluşturuldu — geçici şifre: ${res?._generated_password || "(sistem yöneticisine sorun)"} (ilk girişte değiştirilecek).`
      : "Çalışan kaydedildi.",
    res?._login_created ? { duration: 15000 } : undefined
  );
  const createMutation = useMutation({ mutationFn: (data) => flowApi.entities.Employee.create(data), onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setShowForm(false); loginToast(res); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => flowApi.entities.Employee.update(id, data), onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setShowForm(false); setEditingEmployee(null); loginToast(res); } });
  const deleteMutation = useMutation({ mutationFn: (id) => flowApi.entities.Employee.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }) });

  // Musteri rollu kisiler CALISAN degildir; calisan ekraninda gosterme (veri silinmez, sadece filtre)
  const staffEmployees = employees.filter(e => e.app_role !== "musteri" && e.is_deleted !== 1 && e.is_deleted !== true);
  const departments = [...new Set(staffEmployees.map(e=>e.department).filter(Boolean))];

  const filtered = staffEmployees.filter(e => {
    const matchSearch = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase()) || e.phone?.includes(search);
    const matchStatus = statusFilter==="hepsi" || e.status===statusFilter || (!e.status && statusFilter==="aktif");
    const matchDept = deptFilter==="all" || e.department===deptFilter;
    const matchSube = !bordroMode || !subeFilter || e.sube_id === subeFilter;
    const matchTutarsiz = !bordroMode || !sadeceTutarsiz || tutarsizMi(e);
    return matchSearch && matchStatus && matchDept && matchSube && matchTutarsiz;
  }).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "tr"));
  const tutarsizSayi = staffEmployees.filter(e => e.status !== "pasif" && tutarsizMi(e)).length;

  const activeCount = staffEmployees.filter(e=>e.status!=="pasif").length;
  const deptCounts = departments.reduce((acc,d)=>{ acc[d]=staffEmployees.filter(e=>e.department===d&&e.status!=="pasif").length; return acc; },{});

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-5 max-w-7xl">
      {/* BAŞLIK */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-indigo-500"/>Çalışanlar{bordroMode && <span className="text-sm font-medium text-amber-600 flex items-center gap-1"><Wallet className="w-4 h-4"/>Bordro Hazırlık</span>}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{activeCount} aktif çalışan{bordroMode && tutarsizSayi > 0 ? ` · ${tutarsizSayi} tutarsız kayıt` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {isPrivileged && (
            <button onClick={toggleBordro}
              className={cn("flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors font-medium border",
                bordroMode ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" : "text-muted-foreground border-border hover:text-foreground")}>
              <Wallet className="w-4 h-4"/>{bordroMode ? "Normal Görünüm" : "Bordro Hazırlık"}
            </button>
          )}
          {isPrivileged && (
            <button onClick={()=>{ setEditingEmployee(null); setShowForm(true); }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium">
              <Plus className="w-4 h-4"/>Çalışan Ekle
            </button>
          )}
        </div>
      </div>

      {bordroMode && (
        <div className="flex flex-wrap gap-2 items-center bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3">
          <span className="text-xs text-muted-foreground">Bordro için gerekli alanları (TC, şube, işe giriş, aylık ücret) eksik personel <b>tutarsız</b> işaretlenir; bordro bunları eksik hesaplar.</span>
          <div className="flex gap-2 items-center ml-auto">
            <Select value={subeFilter || "hepsi"} onValueChange={(v)=>setSubeFilter(v==="hepsi"?"":v)}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Şube"/></SelectTrigger>
              <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s)=><SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
            </Select>
            <button onClick={()=>setSadeceTutarsiz(v=>!v)}
              className={cn("text-xs px-3 py-1.5 rounded-full border font-medium transition-all flex items-center gap-1",
                sadeceTutarsiz ? "bg-red-600 text-white border-red-600" : "border-border text-muted-foreground hover:border-red-400")}>
              <AlertTriangle className="w-3.5 h-3.5"/>Sadece tutarsız ({tutarsizSayi})
            </button>
          </div>
        </div>
      )}

      {/* FİLTRELER */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="İsim, e-posta veya telefon ara..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
        </div>
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {[{v:"aktif",l:"Aktif"},{v:"pasif",l:"Pasif"},{v:"hepsi",l:"Hepsi"}].map(o=>(
            <button key={o.v} onClick={()=>setStatusFilter(o.v)}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                statusFilter===o.v?"bg-card shadow text-foreground":"text-muted-foreground hover:text-foreground")}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* DEPARTMAN FİLTRELERİ */}
      {departments.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>setDeptFilter("all")}
            className={cn("text-xs px-3 py-1.5 rounded-full border transition-all font-medium",
              deptFilter==="all"?"bg-indigo-600 text-white border-indigo-600":"border-border text-muted-foreground hover:border-indigo-400")}>
            Tümü ({activeCount})
          </button>
          {departments.map(d=>(
            <button key={d} onClick={()=>setDeptFilter(deptFilter===d?"all":d)}
              className={cn("text-xs px-3 py-1.5 rounded-full border transition-all font-medium",
                deptFilter===d?"bg-indigo-600 text-white border-indigo-600":"border-border text-muted-foreground hover:border-indigo-400")}>
              {getDeptLabel(d)} ({deptCounts[d]||0})
            </button>
          ))}
        </div>
      )}

      {/* GRID */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20"/>
          <p className="text-sm text-muted-foreground">{search?"Sonuç bulunamadı":"Henüz çalışan eklenmemiş"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((emp, idx) => {
            const initials = emp.full_name?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()||"?";
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const isPassive = emp.status === "pasif";

            return (
              <div key={emp.id} className={cn("bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all group overflow-hidden", isPassive&&"opacity-60")}>
                {/* KART ÜSTÜ */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt={emp.full_name} className="w-12 h-12 rounded-2xl object-cover"/>
                    ) : (
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shrink-0", avatarColor)}>
                        {initials}
                      </div>
                    )}
                    {isPassive && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full font-medium">Pasif</span>
                    )}
                    {!isPassive && emp.department && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-medium dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-400">
                        {getDeptLabel(emp.department)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-foreground leading-tight flex items-center gap-1">
                    {emp.full_name}
                    {bordroMode && tutarsizMi(emp) && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Eksik özlük/ücret bilgisi" />}
                  </h3>
                  {bordroMode
                    ? <p className="text-xs text-muted-foreground mt-0.5">{subeAd(emp.sube_id) || "şube yok"}{Number(emp.aylik_ucret) > 0 ? ` · ${Number(emp.aylik_ucret).toLocaleString("tr-TR")} ₺` : " · ücret yok"}</p>
                    : (emp.position && <p className="text-xs text-muted-foreground mt-0.5">{getPosLabel(emp.position)}</p>)}
                </div>

                {/* İLETİŞİM */}
                <div className="px-5 pb-4 space-y-1.5 border-t border-border/30 pt-3">
                  {emp.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60"/>
                      <span className="truncate">{emp.email}</span>
                    </div>
                  )}
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60"/>
                      <span>{emp.phone}</span>
                    </div>
                  )}
                  {!emp.email && !emp.phone && (
                    <p className="text-xs text-muted-foreground/40">İletişim bilgisi yok</p>
                  )}
                </div>

                {/* ALT KISIM */}
                <div className="px-4 pb-4 flex items-center gap-2">
                  <Link to={`/calisan/${emp.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl py-2 transition-colors">
                    Detayları Gör <ChevronRight className="w-3.5 h-3.5"/>
                  </Link>
                  {isPrivileged && (
                    <button onClick={()=>{ if(confirm(`${emp.full_name} silinsin mi?`)) deleteMutation.mutate(emp.id); }}
                      disabled={deleteMutation.isPending}
                      className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-100 transition-colors">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  )}
                  {isPrivileged && bordroMode && !isPassive && (
                    <button onClick={()=>{ setCikisForm({ exit_date: new Date().toISOString().slice(0,10), exit_reason: "", exit_notes: "" }); setCikisFor(emp); }}
                      title="Çıkış Ver"
                      className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-100 transition-colors">
                      <LogOut className="w-3.5 h-3.5"/>
                    </button>
                  )}
                  {isPrivileged && (
                    <button onClick={()=>{ setEditingEmployee(emp); setShowForm(true); }}
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-colors">
                      <Briefcase className="w-3.5 h-3.5"/>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isPrivileged && (
        <EmployeeFormDialog
          open={showForm}
          onOpenChange={setShowForm}
          employee={editingEmployee}
          onSubmit={(data) => {
            if (editingEmployee) updateMutation.mutate({ id: editingEmployee.id, data });
            else createMutation.mutate(data);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <Dialog open={!!cikisFor} onOpenChange={(v)=>!v && setCikisFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Çıkış Ver — {cikisFor?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">Personel pasife alınır; puantaj/bordro dönemlerinde çıkış tarihinden sonrası hesaplanmaz.</p>
            <div><Label className="mb-1.5 block">Çıkış Tarihi *</Label><Input type="date" value={cikisForm.exit_date} onChange={(e)=>setCikisForm({ ...cikisForm, exit_date: e.target.value })}/></div>
            <div><Label className="mb-1.5 block">Çıkış Nedeni</Label><Input value={cikisForm.exit_reason} onChange={(e)=>setCikisForm({ ...cikisForm, exit_reason: e.target.value })} placeholder="istifa / fesih / …"/></div>
            <div><Label className="mb-1.5 block">Not</Label><Textarea rows={2} value={cikisForm.exit_notes} onChange={(e)=>setCikisForm({ ...cikisForm, exit_notes: e.target.value })}/></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={()=>setCikisFor(null)} className="text-sm px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground">İptal</button>
              <button disabled={cikisMutation.isPending || !cikisForm.exit_date}
                onClick={()=>cikisMutation.mutate({ id: cikisFor.id, data: cikisForm })}
                className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50">
                {cikisMutation.isPending ? "İşleniyor..." : "Çıkış Ver"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
