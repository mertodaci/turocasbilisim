import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Plus, Pencil, Trash2, Phone, Mail,
  Star, AlertCircle, Shield, Wrench, User, Puzzle,
  Briefcase, HardDrive, FileText, ExternalLink, FileCheck,
  Building2, Users2, Tag, ChevronDown, MapPin, Wallet
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/lib/RolePermissionsContext";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import ContactFormDialog from "@/components/customers/ContactFormDialog";
import ModuleFormDialog from "@/components/customers/ModuleFormDialog";
import { toast } from "sonner";
import { MONTHS, num, tl, kisa, rowTahsilEdilen, rowAdet, buildHakedisPayloads } from "@/lib/hakedisUtils";

const statusConfig = {
  aktif: { label: "Aktif", className: "bg-emerald-50 text-emerald-700" },
  pasif: { label: "Pasif", className: "bg-slate-100 text-slate-500" },
};

const contactTypeConfig = {
  anahtar_kullanici: { label: "Anahtar Kullanıcı", icon: Star, color: "text-yellow-500", bg: "bg-yellow-50", border: "border-yellow-200" },
  kritik_kullanici: { label: "Kritik Kullanıcı", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
  karar_verici: { label: "Karar Verici", icon: Shield, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200" },
  teknik_yetkili: { label: "Teknik Yetkili", icon: Wrench, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  diger: { label: "Diğer", icon: User, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
};

const contractTypeLabels = {
  hizmet_sozlesmesi: "Hizmet Sözleşmesi",
  bakim_sozlesmesi: "Bakım Sözleşmesi",
  bakim_destek: "Bakım & Destek",
  lisans: "Lisans",
  gizlilik: "Gizlilik",
  is_ortakligi: "İş Ortaklığı",
  diger: "Diğer",
};

const contractStatusConfig = {
  aktif: { label: "Aktif", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  suresi_dolmak_uzere: { label: "Süresi Dolmak Üzere", className: "bg-amber-50 text-amber-700 border-amber-200" },
  suresi_doldu: { label: "Süresi Doldu", className: "bg-red-50 text-red-700 border-red-200" },
  iptal: { label: "İptal", className: "bg-slate-100 text-slate-500 border-slate-200" },
  taslak: { label: "Taslak", className: "bg-blue-50 text-blue-700 border-blue-200" },
};

const customerTypeLabels = {
  belediye: "Belediye",
  il_ozel_idaresi: "İl Özel İdaresi",
  kamu_kurumu: "Kamu Kurumu",
  su_idaresi: "Su İdaresi",
  ozel_sektor: "Özel Sektör",
  sivil_toplum: "Sivil Toplum",
  diger: "Diğer",
};

const customerDetailLabels = {
  yazilim: "Yazılım",
  donanim: "Donanım",
  danismanlik: "Danışmanlık",
  bakim_destek: "Bakım & Destek",
  egitim: "Eğitim",
  entegrasyon: "Entegrasyon",
  diger: "Diğer",
};

const populationLabels = {
  "0_10k": "0–10K",
  "10k_50k": "10K–50K",
  "50k_100k": "50K–100K",
  "100k_500k": "100K–500K",
  "500k_1m": "500K–1M",
  "1m_ustu": "1M+",
};


// ── ContactFormDialog (inline) ────────────────────────────────────────────────
const emptyContact = { full_name: "", title: "", phone: "", email: "", contact_type: "diger", notes: "" };

function ContactFormDialogInline({ open, onClose, onSubmit, isLoading, contact }) {
  const [form, setForm] = useState(emptyContact);
  useState(() => { setForm(contact ? { ...emptyContact, ...contact } : emptyContact); }, [contact, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold">{contact ? "Kişiyi Düzenle" : "Yeni Kişi Ekle"}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ad Soyad *</label>
            <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Ad Soyad" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ünvan / Pozisyon</label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Örn: IT Müdürü" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kişi Tipi</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.contact_type} onChange={(e) => set("contact_type", e.target.value)}>
                <option value="anahtar_kullanici">Anahtar Kullanıcı</option>
                <option value="kritik_kullanici">Kritik Kullanıcı</option>
                <option value="karar_verici">Karar Verici</option>
                <option value="teknik_yetkili">Teknik Yetkili</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Telefon</label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="05xx xxx xx xx" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">E-posta</label>
              <input type="email" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ornek@firma.com" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notlar</label>
            <textarea className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ek notlar..." />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-muted/30 transition-colors">İptal</button>
          <button onClick={() => onSubmit(form)} disabled={isLoading || !form.full_name} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm hover:opacity-90 disabled:opacity-50">{isLoading ? "Kaydediliyor..." : "Kaydet"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = ["Kişiler", "Sözleşmeler", "Hakediş", "Modüller", "İş Takibi"];

export default function CustomerDetail() {
  const customerId = window.location.pathname.split("/").pop();
  const [activeTab, setActiveTab] = useState("Kişiler");
  const [editOpen, setEditOpen] = useState(false);
  const [statusDropdown, setStatusDropdown] = useState(false);
  const { user } = useAuth();
  const { can } = useRolePermissions();
  const canEdit =
    user?.role === "admin" ||
    user?.role === "yonetici" ||
    can(user?.role, "customers", "edit") ||
    can(user?.role, "customers", "add");

  const [contactDialog, setContactDialog] = useState({ open: false, contact: null });
  const [moduleDialog, setModuleDialog] = useState({ open: false, module: null });
  const [moduleSearch, setModuleSearch] = useState("");
  const [moduleStatusFilter, setModuleStatusFilter] = useState("all");

  const queryClient = useQueryClient();

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => (await flowApi.entities.Customer.filter({ id: customerId }))[0],
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["contacts", customerId],
    queryFn: () => flowApi.entities.CustomerContact.filter({ customer_id: customerId }),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["modules", customerId],
    queryFn: () => flowApi.entities.CustomerModule.filter({ customer_id: customerId }),
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts", customerId],
    queryFn: () => flowApi.entities.CustomerContract.filter({ customer_id: customerId }),
  });

  const { data: custHakedis = [] } = useQuery({
    queryKey: ["hakedisler-customer", customerId],
    queryFn: () => flowApi.entities.Hakedis.filter({ customer_id: customerId }),
  });
  const [hakedisBusy, setHakedisBusy] = useState(false);
  const generateHakedis = async (contract) => {
    const payloads = buildHakedisPayloads(contract, customer);
    if (payloads.length === 0) {
      toast.error("Sözleşmede tutar, hakediş başlangıç tarihi ve taksit sayısı dolu olmalı");
      return;
    }
    const existing = custHakedis.filter((h) => h.contract_id === contract.id);
    if (existing.length && !window.confirm(`Bu sözleşme için ${existing.length} hakediş kaydı var. Silinip yeniden oluşturulsun mu?`)) return;
    setHakedisBusy(true);
    try {
      for (const h of existing) { try { await flowApi.entities.Hakedis.delete(h.id); } catch { /* devam */ } }
      let ok = 0;
      for (const p of payloads) { try { await flowApi.entities.Hakedis.create(p); ok++; } catch { /* devam */ } }
      queryClient.invalidateQueries({ queryKey: ["hakedisler-customer", customerId] });
      queryClient.invalidateQueries({ queryKey: ["hakedisler"] });
      toast.success(`${ok} hakediş kaydı oluşturuldu`);
    } finally {
      setHakedisBusy(false);
    }
  };

  const { data: jtProjects = [] } = useQuery({
    queryKey: ["tq-projects-customer", customerId],
    queryFn: () => flowApi.entities.JTProject.filter({ customer_id: customerId }),
  });

  const { data: jtTickets = [] } = useQuery({
    queryKey: ["tq-tickets-customer", customerId],
    queryFn: () => flowApi.entities.JTTicket.filter({ customer_id: customerId }),
  });

  const { data: cityOptions = [] } = useQuery({
    queryKey: ["definitions", "sehir"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "sehir", is_active: true }),
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (data) => flowApi.entities.Customer.update(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      setEditOpen(false);
    },
  });

  const saveContactMutation = useMutation({
    mutationFn: (data) =>
      data.id
        ? flowApi.entities.CustomerContact.update(data.id, data)
        : flowApi.entities.CustomerContact.create({ ...data, customer_id: customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", customerId] });
      setContactDialog({ open: false, contact: null });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => flowApi.entities.CustomerContact.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts", customerId] }),
  });

  const saveModuleMutation = useMutation({
    mutationFn: (data) =>
      data.id
        ? flowApi.entities.CustomerModule.update(data.id, data)
        : flowApi.entities.CustomerModule.create({ ...data, customer_id: customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules", customerId] });
      setModuleDialog({ open: false, module: null });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id) => flowApi.entities.CustomerModule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["modules", customerId] }),
  });

  if (loadingCustomer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!customer) {
    return <div className="text-center py-12 text-muted-foreground">Müşteri bulunamadı</div>;
  }

  const statusCfg = statusConfig[customer.status] || statusConfig.aktif;
  const initials = customer.company_name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const contactOrder = ["kritik_kullanici", "anahtar_kullanici", "karar_verici", "teknik_yetkili", "diger"];
  const sortedContacts = [...contacts].sort(
    (a, b) => contactOrder.indexOf(a.contact_type) - contactOrder.indexOf(b.contact_type)
  );

  const moduleStatusLabel = { aktif: "Aktif", pasif: "Pasif", kurulum_asamasinda: "Kurulum", egitim_asamasinda: "Eğitim" };

  const MODULE_DOT = {
    aktif: "bg-emerald-500", pasif: "bg-slate-400",
    kurulum_asamasinda: "bg-blue-500", egitim_asamasinda: "bg-amber-500",
  };
  const ModuleCard = (m) => (
    <div
      key={m.id}
      title={m.module_name + (m.notes ? ` — ${m.notes}` : "")}
      className="group flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-sm hover:border-primary/40 hover:bg-muted/30 transition-colors min-w-0"
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", MODULE_DOT[m.status] || MODULE_DOT.aktif)} />
      <span className="truncate flex-1">{m.module_name}</span>
      {m.status !== "aktif" && (
        <span className="text-[10px] text-muted-foreground shrink-0">{moduleStatusLabel[m.status]}</span>
      )}
      <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => setModuleDialog({ open: true, module: m })} className="text-muted-foreground hover:text-foreground">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={() => deleteModuleMutation.mutate(m.id)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3 h-3" />
        </button>
      </span>
    </div>
  );

  const moduleStatusCounts = modules.reduce((a, m) => { a[m.status] = (a[m.status] || 0) + 1; return a; }, {});
  const _mq = moduleSearch.trim().toLocaleLowerCase("tr");
  const visibleModules = modules.filter((m) =>
    (moduleStatusFilter === "all" || m.status === moduleStatusFilter) &&
    (!_mq || String(m.module_name || "").toLocaleLowerCase("tr").includes(_mq))
  );
  const _sortMods = (arr) => [...arr].sort((a, b) => String(a.module_name || "").localeCompare(String(b.module_name || ""), "tr"));
  const linkedModules = visibleModules.filter((m) => m.contract_id);
  const unlinkedModules = _sortMods(visibleModules.filter((m) => !m.contract_id));
  const contractsWithModules = contracts
    .map((c) => ({ contract: c, mods: _sortMods(linkedModules.filter((m) => m.contract_id === c.id)) }))
    .filter((x) => x.mods.length > 0);

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Ust Kart */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Renkli accent seridi */}
        <div className={cn("h-1.5 w-full", customer.is_potential ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-primary to-blue-500")} />
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Sol: Kimlik */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-4">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", customer.is_potential ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-primary to-blue-600")}>
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-foreground leading-tight">{customer.company_name}</h1>
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-md", customer.is_potential ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>
                      {customer.is_potential ? "Aday Musteri" : "Musteri"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                    {customer.city && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {cityOptions.find((c) => c.value === customer.city)?.label || customer.city}
                        {customer.district ? ` / ${customer.district}` : ""}
                      </span>
                    )}
                    <span className="text-muted-foreground/40">|</span>
                    {canEdit ? (
                      <div className="relative">
                        <button
                          onClick={() => setStatusDropdown(!statusDropdown)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer"
                        >
                          <span className={cn("w-2 h-2 rounded-full", customer.status === "aktif" ? "bg-emerald-500" : customer.status === "pasif" ? "bg-slate-400" : "bg-amber-500")} />
                          {statusCfg.label}
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {statusDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden min-w-[130px]">
                            {Object.entries(statusConfig).map(([k, v]) => (
                              <button
                                key={k}
                                onClick={() => { updateCustomerMutation.mutate({ status: k }); setStatusDropdown(false); }}
                                className={cn("w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted transition-colors flex items-center gap-2", customer.status === k && "font-bold")}
                              >
                                <span className={cn("w-2 h-2 rounded-full", k === "aktif" ? "bg-emerald-500" : k === "pasif" ? "bg-slate-400" : "bg-amber-500")} />
                                {v.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                        <span className={cn("w-2 h-2 rounded-full", customer.status === "aktif" ? "bg-emerald-500" : customer.status === "pasif" ? "bg-slate-400" : "bg-amber-500")} />
                        {statusCfg.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Meta rozet seridi */}
              <div className="flex flex-wrap gap-2 mt-4">
                {customer.customer_type && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg">
                    <Building2 className="w-3.5 h-3.5" />
                    {customerTypeLabels[customer.customer_type] || customer.customer_type}
                  </span>
                )}
                {customer.customer_detail && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg">
                    <Tag className="w-3.5 h-3.5" />
                    {customerDetailLabels[customer.customer_detail] || customer.customer_detail}
                  </span>
                )}
                {customer.population && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
                    <Users2 className="w-3.5 h-3.5" />
                    {populationLabels[customer.population] || customer.population}
                  </span>
                )}
              </div>

              {customer.notes && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed bg-muted/30 rounded-lg px-3 py-2">{customer.notes}</p>
              )}

              {/* Bilgi izgarasi */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-border/40">
                {[
                  { label: "Adres", value: customer.address, icon: MapPin },
                  { label: "Parti", value: customer.party, icon: Tag },
                ]
                  .filter((x) => x.value)
                  .map((x, i) => {
                    const Icon = x.icon;
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 mb-0.5">{x.label}</p>
                          <p className="text-sm font-medium text-foreground truncate">{x.value}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Sag: Sorumlular + Duzenle */}
            <div className="flex flex-col gap-3 lg:w-64 shrink-0">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setEditOpen(true)}>
                  <Pencil className="w-3.5 h-3.5" /> Duzenle
                </Button>
              </div>
              {(customer.project_manager || customer.deploy_responsible) && (
                <div className="bg-muted/30 rounded-xl p-3 space-y-3">
                  {customer.project_manager && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <HardDrive className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground/60 leading-none mb-0.5">Proje Sorumlusu</p>
                        <p className="text-sm font-semibold text-foreground truncate">{customer.project_manager}</p>
                      </div>
                    </div>
                  )}
                  {customer.deploy_responsible && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground/60 leading-none mb-0.5">Deploy Sorumlusu</p>
                        <p className="text-sm font-semibold text-foreground truncate">{customer.deploy_responsible}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab'lar */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex border-b border-border/50">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Kişiler */}
          {activeTab === "Kişiler" && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-foreground">Kişiler</h2>
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => setContactDialog({ open: true, contact: null })}>
                  <Plus className="w-3.5 h-3.5" /> Kişi Ekle
                </Button>
              </div>
              {loadingContacts ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : sortedContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Henüz kişi eklenmemiş</div>
              ) : (
                <div className="space-y-3">
                  {sortedContacts.map((c) => {
                    const cfg = contactTypeConfig[c.contact_type] || contactTypeConfig.diger;
                    const Icon = cfg.icon;
                    return (
                      <div key={c.id} className={cn("flex items-start gap-3 p-4 rounded-xl border", cfg.bg, cfg.border)}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/70">
                          <Icon className={cn("w-4 h-4", cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{c.full_name}</p>
                            <Badge className={cn("text-[10px] px-1.5 py-0 bg-white/70", cfg.color)}>{cfg.label}</Badge>
                          </div>
                          {c.title && <p className="text-xs text-muted-foreground mt-0.5">{c.title}</p>}
                          <div className="flex flex-wrap gap-3 mt-2">
                            {c.phone && (
                              <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                <Phone className="w-3 h-3" /> {c.phone}
                              </a>
                            )}
                            {c.email && (
                              <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                <Mail className="w-3 h-3" /> {c.email}
                              </a>
                            )}
                          </div>
                          {c.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">{c.notes}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setContactDialog({ open: true, contact: c })}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive" onClick={() => deleteContactMutation.mutate(c.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Modüller */}
          {activeTab === "Modüller" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Puzzle className="w-4 h-4 text-primary" /> Modüller
                  <span className="text-xs font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">{modules.length}</span>
                </h2>
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => setModuleDialog({ open: true, module: null })}>
                  <Plus className="w-3.5 h-3.5" /> Modül Ekle
                </Button>
              </div>

              {modules.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Henüz modül eklenmemiş</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <input
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                      placeholder="Modül ara..."
                      className="h-8 w-full sm:w-56 rounded-lg border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {[
                      ["all", "Tümü", modules.length],
                      ["aktif", "Aktif", moduleStatusCounts.aktif || 0],
                      ["kurulum_asamasinda", "Kurulum", moduleStatusCounts.kurulum_asamasinda || 0],
                      ["egitim_asamasinda", "Eğitim", moduleStatusCounts.egitim_asamasinda || 0],
                      ["pasif", "Pasif", moduleStatusCounts.pasif || 0],
                    ].filter(([k, , n]) => k === "all" || n > 0).map(([k, label, n]) => (
                      <button
                        key={k}
                        onClick={() => setModuleStatusFilter(k)}
                        className={cn(
                          "text-xs rounded-full px-2.5 py-1 border transition-colors",
                          moduleStatusFilter === k
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border/60 text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {label} <span className="opacity-70">{n}</span>
                      </button>
                    ))}
                  </div>

                  {visibleModules.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">Eşleşen modül yok</div>
                  ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                      {contractsWithModules.map(({ contract, mods }) => (
                        <div key={contract.id}>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                            {contract.title} <span className="opacity-60">({mods.length})</span>
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">{mods.map(ModuleCard)}</div>
                        </div>
                      ))}
                      {unlinkedModules.length > 0 && (
                        <div>
                          {contractsWithModules.length > 0 && (
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Sözleşmesiz <span className="opacity-60">({unlinkedModules.length})</span></p>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">{unlinkedModules.map(ModuleCard)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* İş Takibi */}
          {activeTab === "İş Takibi" && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-primary" /> İş Takibi
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">İş Takibi Kullanımı</span>
                  <Switch
                    checked={customer?.use_job_tracking == 1 || customer?.use_job_tracking === true}
                    onCheckedChange={async (checked) => {
                      const wasEnabled = customer?.use_job_tracking == 1 || customer?.use_job_tracking === true;
                      await flowApi.entities.Customer.update(customerId, { use_job_tracking: checked ? 1 : 0 });
                      if (!wasEnabled && checked) {
                        const statuses = await flowApi.entities.JTTicketStatus.list();
                        if (statuses.length === 0) {
                          const defaults = [
                            { name: "Musteri Talep", key: "musteri_talep", color: "slate", sort_order: 1, is_active: 1, is_final: 0 },
                            { name: "Analiz", key: "analiz", color: "blue", sort_order: 2, is_active: 1, is_final: 0 },
                            { name: "Gelistirme", key: "gelistirme", color: "purple", sort_order: 3, is_active: 1, is_final: 0 },
                            { name: "Test", key: "test", color: "orange", sort_order: 4, is_active: 1, is_final: 0 },
                            { name: "Sonuclanan", key: "sonuclanan", color: "green", sort_order: 5, is_active: 1, is_final: 1 },
                          ];
                          for (const s of defaults) await flowApi.entities.JTTicketStatus.create(s);
                        }
                        await flowApi.entities.JTProject.create({
                          customer_id: customerId,
                          customer_name: customer.company_name,
                          name: customer.company_name + " - Genel",
                          status: "devam_ediyor",
                          priority: "orta",
                        });
                      }
                      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
                      queryClient.invalidateQueries({ queryKey: ["tq-projects-customer", customerId] });
                    }}
                  />
                </div>
              </div>
              {jtProjects.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">Bu müşteriye ait proje bulunmuyor.</div>
              ) : (
                <div className="space-y-4">
                  {jtProjects.map((proj) => {
                    const projTickets = jtTickets.filter((t) => t.project_id === proj.id);
                    const openTickets = projTickets.filter((t) => t.status !== "kapali" && t.status !== "tamamlandi");
                    return (
                      <div key={proj.id} className="rounded-xl border border-border/60 bg-background p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold text-sm text-foreground">{proj.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {openTickets.length} açık bilet / {projTickets.length} toplam
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            proj.status === "devam_ediyor" ? "bg-blue-100 text-blue-700" :
                            proj.status === "tamamlandi" ? "bg-green-100 text-green-700" :
                            proj.status === "beklemede" ? "bg-yellow-100 text-yellow-700" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {proj.status === "devam_ediyor" ? "Devam Ediyor" :
                             proj.status === "tamamlandi" ? "Tamamlandı" :
                             proj.status === "beklemede" ? "Beklemede" : proj.status}
                          </span>
                        </div>
                        {openTickets.length > 0 && (
                          <div className="space-y-1.5">
                            {openTickets.slice(0, 5).map((t) => (
                              <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  t.priority === "kritik" ? "bg-red-500" :
                                  t.priority === "yuksek" ? "bg-orange-500" :
                                  t.priority === "orta" ? "bg-amber-400" : "bg-green-500"
                                }`} />
                                <span className="flex-1 truncate">{t.title}</span>
                                <span className="text-[10px] opacity-70">{t.status}</span>
                              </div>
                            ))}
                            {openTickets.length > 5 && (
                              <p className="text-xs text-muted-foreground pl-3">+{openTickets.length - 5} daha</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Sözleşmeler */}
          {activeTab === "Sözleşmeler" && (
            <>
              <div className="flex items-center justify-between mb-5 gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-primary" /> Sözleşmeler
                  </h2>
                  <span className="text-[11px] text-muted-foreground">Yalnızca görüntüleme · düzenleme için Sözleşme Yönetimi</span>
                </div>
                <Button size="sm" variant="ghost" className="text-xs gap-1 shrink-0"
                  onClick={() => (window.location.href = `/sozlesmeler?customer=${customerId}`)}>
                  Sözleşmeler <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
              {loadingContracts ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">Henüz sözleşme eklenmemiş</div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((c) => {
                    const cfg = contractStatusConfig[c.status] || contractStatusConfig.taslak;
                    return (
                      <div key={c.id} className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-background hover:bg-muted/30 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{c.title}</p>
                            <Badge className={cn("text-[10px] px-1.5 py-0 border", cfg.className)}>{cfg.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {contractTypeLabels[c.contract_type] || c.contract_type}
                          </p>
                          {(c.start_date || c.end_date) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {c.start_date && <>Başlangıç: <span className="font-medium">{c.start_date}</span></>}
                              {c.start_date && c.end_date && " — "}
                              {c.end_date && <>Bitiş: <span className="font-medium">{c.end_date}</span></>}
                            </p>
                          )}
                          {c.notes && <p className="text-xs text-muted-foreground mt-1 italic">{c.notes}</p>}
                          {(c.contract_value || c.installment_count || c.hakedis_start_date) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Hakediş: {c.contract_value ? tl(num(c.contract_value)) + " ₺" : "–"}
                              {c.installment_count ? ` · ${c.installment_count} taksit` : ""}
                              {c.hakedis_start_date ? ` · başlangıç ${c.hakedis_start_date}` : ""}
                            </p>
                          )}
                          {c.file_url && (
                            <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline font-medium">
                              <ExternalLink className="w-3 h-3" /> Belgeyi Görüntüle
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Hakediş */}
          {activeTab === "Hakediş" && (
            <HakedisTab
              contracts={contracts}
              custHakedis={custHakedis}
              hakedisBusy={hakedisBusy}
              onGenerate={generateHakedis}
              onOpenModule={() => (window.location.href = "/hakedisler")}
            />
          )}

        </div>
      </div>

      {/* Diyaloglar */}
      <CustomerFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        customer={customer}
        onSubmit={async (data) => {
          const wasEnabled = customer?.use_job_tracking == 1 || customer?.use_job_tracking === true;
          const willEnable = data.use_job_tracking === true || data.use_job_tracking === 1;
          await flowApi.entities.Customer.update(customerId, data);
          if (!wasEnabled && willEnable) {
            const statuses = await flowApi.entities.JTTicketStatus.list();
            if (statuses.length === 0) {
              const defaults = [
                { name: "Musteri Talep", key: "musteri_talep", color: "slate", sort_order: 1, is_active: 1, is_final: 0 },
                { name: "Analiz", key: "analiz", color: "blue", sort_order: 2, is_active: 1, is_final: 0 },
                { name: "Gelistirme", key: "gelistirme", color: "purple", sort_order: 3, is_active: 1, is_final: 0 },
                { name: "Test", key: "test", color: "orange", sort_order: 4, is_active: 1, is_final: 0 },
                { name: "Sonuclanan", key: "sonuclanan", color: "green", sort_order: 5, is_active: 1, is_final: 1 },
              ];
              for (const s of defaults) await flowApi.entities.JTTicketStatus.create(s);
            }
            await flowApi.entities.JTProject.create({
              customer_id: customerId,
              customer_name: data.company_name,
              name: data.company_name + " - Genel",
              status: "devam_ediyor",
              priority: "orta",
            });
          }
          queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
          setEditOpen(false);
        }}
        isLoading={updateCustomerMutation.isPending}
      />

      <ContactFormDialog
        open={contactDialog.open}
        onClose={() => setContactDialog({ open: false, contact: null })}
        contact={contactDialog.contact}
        onSubmit={(data) => saveContactMutation.mutate(data)}
        isLoading={saveContactMutation.isPending}
      />

      <ModuleFormDialog
        open={moduleDialog.open}
        onClose={() => setModuleDialog({ open: false, module: null })}
        module={moduleDialog.module}
        contracts={contracts}
        onSubmit={(data) => saveModuleMutation.mutate(data)}
        isLoading={saveModuleMutation.isPending}
      />

    </div>
  );
}

function HakedisTab({ contracts = [], custHakedis = [], hakedisBusy, onGenerate, onOpenModule }) {
  const durumBadge = (d) => (d === "pasif" ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700");
  const years = [...new Set(custHakedis.map((h) => Number(h.year)).filter(Boolean))].sort((a, b) => b - a);
  const eligible = contracts.filter((c) => c.contract_value && c.hakedis_start_date && c.installment_count);
  const generated = new Set(custHakedis.map((h) => h.contract_id).filter(Boolean));
  const notGenerated = eligible.filter((c) => !generated.has(c.id));

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" /> Hakediş
        </h2>
        <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={onOpenModule}>
          Hakediş <ExternalLink className="w-3 h-3" />
        </Button>
      </div>

      {notGenerated.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Hakediş üretilmemiş sözleşme(ler):</p>
          {notGenerated.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{c.title} — {tl(num(c.contract_value))} ₺ · {c.installment_count} taksit</span>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" disabled={hakedisBusy} onClick={() => onGenerate(c)}>
                <Wallet className="w-3 h-3" /> Oluştur
              </Button>
            </div>
          ))}
        </div>
      )}

      {custHakedis.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Bu müşteri için hakediş kaydı yok. Sözleşmelere tutar / hakediş başlangıç / taksit sayısı girip "Hakediş Oluştur" deyin.
        </div>
      ) : (
        <div className="space-y-6">
          {years.map((y) => {
            const rows = custHakedis.filter((h) => Number(h.year) === y);
            const sums = rows.reduce((a, r) => {
              const g = rowTahsilEdilen(r);
              a.tutar += num(r.toplam_sozlesme_tutari) || 0;
              a.hedef += num(r.yil_hedefi) || 0;
              a.gerc += g;
              return a;
            }, { tutar: 0, hedef: 0, gerc: 0 });
            return (
              <div key={y} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{y}</span>
                  <span className="text-xs text-muted-foreground">
                    Tutar {tl(sums.tutar)} ₺ · Hedef {tl(sums.hedef)} ₺ · Gerçekleşen {tl(sums.gerc)} ₺ · Kalan {tl(sums.hedef - sums.gerc)} ₺
                  </span>
                </div>
                {rows.map((r) => {
                  const g = rowTahsilEdilen(r);
                  const kalan = (num(r.yil_hedefi) || 0) - g;
                  return (
                    <div key={r.id} className="border border-border/50 rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{r.is_konusu || "(iş konusu yok)"}</span>
                        <Badge className={durumBadge(r.durum)}>{r.durum === "pasif" ? "Pasif" : "Aktif"}</Badge>
                        {r.contract_id && <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">Sözleşmeden</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {[["Yıl Hedefi", num(r.yil_hedefi) || 0, "text-blue-600"], ["Gerçekleşen", g, "text-emerald-600"], ["Kalan", kalan, kalan > 0 ? "text-orange-600" : ""]].map(([l, v, c]) => (
                          <div key={l} className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                            <p className="text-[11px] text-muted-foreground">{l}</p>
                            <p className={`font-bold tabular-nums whitespace-nowrap ${c}`}>{tl(v)}&nbsp;₺</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aylık Kırılım · {rowAdet(r)} taksit</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                          {MONTHS.map(([k, l]) => {
                            const v = num(r[k]);
                            return (
                              <div key={k} title={v ? `${tl(v)} ₺` : ""}
                                className={`rounded-lg border text-center py-1.5 px-1 min-w-0 overflow-hidden ${v
                                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                                  : "border-border/40 bg-muted/20"}`}>
                                <div className="text-[10px] uppercase text-muted-foreground">{l}</div>
                                <div className={`text-xs font-semibold tabular-nums mt-0.5 truncate ${v ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground/40"}`}>{v ? kisa(v) : "–"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {r.aciklama && <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">{r.aciklama}</p>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
