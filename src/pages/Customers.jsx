import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import { Plus, Search, Building2, MapPin, Users, Briefcase, Trash2, Pencil, ChevronRight, TrendingUp, UserCheck, Activity } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/lib/RolePermissionsContext";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEFAULT_STATUSES = [
  { name: "Musteri Talep", key: "musteri_talep", color: "slate", sort_order: 1, is_active: 1, is_final: 0 },
  { name: "Cevap Bekleniyor", key: "cevap_bekleniyor", color: "yellow", sort_order: 2, is_active: 1, is_final: 0 },
  { name: "Sonuclanan", key: "sonuclanan", color: "green", sort_order: 14, is_active: 1, is_final: 1 },
  { name: "Iptal", key: "iptal", color: "red", sort_order: 15, is_active: 1, is_final: 1 },
];

const TYPE_CFG = {
  musteri: { label:"Müşteri",       cls:"bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" },
  aday:    { label:"Aday Müşteri",  cls:"bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
};

const customerTypeLabels = { belediye:"Belediye", il_ozel_idaresi:"İl Özel İdaresi", kamu_kurumu:"Kamu Kurumu", su_idaresi:"Su İdaresi", ozel_sektor:"Özel Sektör", sivil_toplum:"STK", diger:"Diğer" };
const municipalityTypeLabels = { buyuksehir:"Büyükşehir", il_belediyesi:"İl Belediyesi", ilce_belediyesi:"İlçe Belediyesi", il:"İl", ilce:"İlçe", belde:"Belde", koy:"Köy", diger:"Diğer" };
const AVATAR_COLORS = ["bg-indigo-500","bg-purple-500","bg-teal-500","bg-blue-500","bg-emerald-500","bg-orange-500","bg-rose-500","bg-pink-500"];

async function createJobTrackingDefaults(customerId, customerName) {
  const existingStatuses = await flowApi.entities.JTTicketStatus.list();
  if (existingStatuses.length === 0) {
    for (const s of DEFAULT_STATUSES) await flowApi.entities.JTTicketStatus.create(s);
  }
  await flowApi.entities.JTProject.create({
    customer_id: customerId, customer_name: customerName,
    name: customerName + " - Genel", description: "Otomatik oluşturulan proje",
    status: "devam_ediyor", priority: "orta",
  });
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("aktif");
  const [potentialFilter, setPotentialFilter] = useState("all"); // all | musteri | aday
  const [typeFilter, setTypeFilter] = useState("all");
  const [specialFilter, setSpecialFilter] = useState("none"); // none | potansiyel | is_takibi
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { can } = useRolePermissions();
  const canAddCustomer = user?.role === "admin" || user?.role === "yonetici" || can(user?.role, "customers", "add");
  const canEditCustomer = user?.role === "admin" || user?.role === "yonetici" || can(user?.role, "customers", "edit");
  const isPrivileged = canAddCustomer || canEditCustomer;

  const { data: customersRaw = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.list("-created_date", 500),
  });
  // Stok modülünden eklenen saf tedarikçiler (is_customer=0) satış müşteri
  // listesine karışmaz; hem müşteri hem tedarikçi olan firmalar (is_customer=1) görünür.
  const customers = useMemo(() => customersRaw.filter(c => c.is_customer !== 0), [customersRaw]);

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.Customer.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        const wasEnabled = editingCustomer.use_job_tracking == 1 || editingCustomer.use_job_tracking === true;
        const isNowEnabled = data.use_job_tracking === true || data.use_job_tracking === 1;
        await flowApi.entities.Customer.update(editingCustomer.id, data);
        if (!wasEnabled && isNowEnabled) {
          await createJobTrackingDefaults(editingCustomer.id, data.company_name);
          toast.success("İş Takibi aktif edildi!");
        } else { toast.success("Müşteri güncellendi."); }
      } else {
        const newCustomer = await flowApi.entities.Customer.create(data);
        if (data.use_job_tracking) {
          await createJobTrackingDefaults(newCustomer.id, data.company_name);
          toast.success("Müşteri eklendi! İş Takibi projesi oluşturuldu.");
        } else { toast.success("Müşteri eklendi."); }
      }
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDialogOpen(false); setEditingCustomer(null);
    } catch (err) { toast.error("Hata: " + err.message); }
    finally { setIsSubmitting(false); }
  };

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter(c=>c.status==="aktif"||!c.status).length,
    potential: customers.filter(c=>c.is_potential==1||c.is_potential===true).length,
    passive: customers.filter(c=>c.status==="pasif").length,
    is_takibi: customers.filter(c=>c.use_job_tracking==1||c.use_job_tracking===true).length,
  }), [customers]);

  const filtered = customers.filter(c => {
    const matchSearch = !search ||
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase()) ||
      c.top_manager?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter==="hepsi" || c.status===statusFilter || (!c.status && statusFilter==="aktif");
    const isAday = c.is_potential==1||c.is_potential===true;
    const matchPotential = potentialFilter==="all"
      || (potentialFilter==="aday" && isAday)
      || (potentialFilter==="musteri" && !isAday);
    const matchSpecial = specialFilter==="none"
      || (specialFilter==="is_takibi" && (c.use_job_tracking==1||c.use_job_tracking===true));
    const matchType = typeFilter==="all" || c.customer_type===typeFilter;
    return matchSearch && matchStatus && matchPotential && matchType && matchSpecial;
  });

  const filteredSorted = [...filtered].sort((a,b) => (a.company_name||'').localeCompare(b.company_name||'', 'tr'));
  const types = [...new Set(customers.map(c=>c.customer_type).filter(Boolean))];

  return (
    <div className="space-y-5 max-w-7xl">
      {/* BAŞLIK */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-indigo-500"/>Müşteriler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{stats.active} aktif müşteri ({customers.length} toplam)</p>
        </div>
        {canAddCustomer && (
          <button onClick={()=>{ setEditingCustomer(null); setDialogOpen(true); }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium">
            <Plus className="w-4 h-4"/>Müşteri Ekle
          </button>
        )}
      </div>

      {/* KPI KARTLARI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:"Aktif Müşteri", val:stats.active, icon:UserCheck, color:"bg-emerald-500", onClick:()=>{ setStatusFilter("aktif"); setPotentialFilter("all"); setSpecialFilter("none"); } },
          { label:"Aday Müşteri", val:stats.potential, icon:TrendingUp, color:"bg-amber-500", onClick:()=>{ setPotentialFilter("aday"); setStatusFilter("hepsi"); setSpecialFilter("none"); } },
          { label:"Pasif Müşteri", val:stats.passive, icon:Activity, color:"bg-slate-500", onClick:()=>{ setStatusFilter("pasif"); setPotentialFilter("all"); setSpecialFilter("none"); } },
          { label:"İş Takibi Aktif", val:stats.is_takibi, icon:Briefcase, color:"bg-purple-500", onClick:()=>{ setSpecialFilter("is_takibi"); setStatusFilter("hepsi"); setPotentialFilter("all"); } },
        ].map(({label,val,icon:Icon,color,onClick})=>(
          <button key={label} onClick={onClick}
            className="bg-card border border-border/50 rounded-2xl p-4 text-left hover:shadow-md transition-all hover:-translate-y-0.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className={cn("p-2 rounded-xl",color)}><Icon className="w-4 h-4 text-white"/></div>
            </div>
            <div className="text-2xl font-black text-foreground">{val}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {/* FİLTRELER */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Firma adı, şehir veya yönetici ara..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            className="text-sm border border-border/50 rounded-xl px-3 py-1.5 bg-card text-foreground focus:outline-none">
            <option value="hepsi">Tüm Durumlar</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>
          <select value={potentialFilter} onChange={e=>setPotentialFilter(e.target.value)}
            className="text-sm border border-border/50 rounded-xl px-3 py-1.5 bg-card text-foreground focus:outline-none">
            <option value="all">Müşteri + Aday</option>
            <option value="musteri">Müşteri</option>
            <option value="aday">Aday Müşteri</option>
          </select>
        </div>
      </div>



      {/* GRID */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20"/>
          <p className="text-sm text-muted-foreground">{search?"Sonuç bulunamadı":"Henüz müşteri eklenmemiş"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSorted.map((c, idx) => {
            const initials = c.company_name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()||"?";
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const isAday = c.is_potential==1||c.is_potential===true;
            const typeCfg = isAday ? TYPE_CFG.aday : TYPE_CFG.musteri;
            const typeLabel = customerTypeLabels[c.customer_type];
            const munLabel = municipalityTypeLabels[c.municipality_type];

            return (
              <div key={c.id} className="bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group overflow-hidden flex">
                {/* Sol accent seridi */}
                <div className={cn("w-1.5 shrink-0", isAday ? "bg-gradient-to-b from-amber-400 to-orange-400" : "bg-gradient-to-b from-emerald-400 to-teal-500")} />
                <div className="flex-1 min-w-0 flex flex-col">
                {/* KART ÜSTÜ */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm", isAday ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-emerald-500 to-teal-600")}>
                      {initials}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", typeCfg.cls)}>
                        {typeCfg.label}
                      </span>
                      {(c.use_job_tracking==1||c.use_job_tracking===true) && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-semibold dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-400">TQ</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", c.status === "pasif" ? "bg-slate-400" : "bg-emerald-500")} />
                    <h3 className="font-bold text-sm text-foreground leading-tight line-clamp-2">{c.company_name}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {typeLabel && <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">{typeLabel}</span>}
                    {munLabel && <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">{munLabel}</span>}
                  </div>
                </div>

                {/* BİLGİLER */}
                <div className="px-5 pb-3 space-y-1.5 border-t border-border/30 pt-3 flex-1">
                  {c.city && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60"/>
                      <span>{c.city}</span>
                    </div>
                  )}
                  {c.top_manager && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60"/>
                      <span className="truncate">{c.top_manager}</span>
                    </div>
                  )}
                  {c.project_manager && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Briefcase className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60"/>
                      <span className="truncate">{c.project_manager}</span>
                    </div>
                  )}
                  {!c.city && !c.top_manager && !c.project_manager && (
                    <p className="text-xs text-muted-foreground/40">Bilgi girilmemiş</p>
                  )}
                </div>

                {/* ALT BUTONLAR */}
                <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                  <Link to={`/musteri/${c.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl py-2 transition-colors">
                    Detayları Gör <ChevronRight className="w-3.5 h-3.5"/>
                  </Link>
                  {canEditCustomer && (
                    <>
                      <button onClick={()=>{ setEditingCustomer(c); setDialogOpen(true); }}
                        className="p-2 rounded-xl text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors">
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={()=>{ if(confirm(`"${c.company_name}" silinsin mi?`)) deleteMutation.mutate(c.id); }}
                        className="p-2 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isPrivileged && (
        <CustomerFormDialog
          open={dialogOpen}
          onClose={()=>{ setDialogOpen(false); setEditingCustomer(null); }}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          customer={editingCustomer}
        />
      )}
    </div>
  );
}
