import { useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Eye, Pencil, Trash2, FileSpreadsheet, ChevronDown, Clock } from "lucide-react";
import TQTicketFormDialog from "@/components/taskqube/TQTicketFormDialog";
import TQTicketDetailDialog from "@/components/taskqube/TQTicketDetailDialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { invalidateTicketQueries } from "@/lib/taskqubeQueryUtils";
import { CUSTOMER_APPROVAL_STATUSES } from "@/lib/taskqubeStatus";

const COLOR_BADGE = {
  slate: "bg-slate-100 text-slate-700", purple: "bg-purple-100 text-purple-700",
  blue: "bg-blue-100 text-blue-700", orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700", green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700", pink: "bg-pink-100 text-pink-700", teal: "bg-teal-100 text-teal-700",
};

const PRIORITY_CONFIG = {
  dusuk: { label: "Düşük", color: "bg-slate-100 text-slate-600" },
  orta: { label: "Orta", color: "bg-blue-100 text-blue-700" },
  yuksek: { label: "Yüksek", color: "bg-orange-100 text-orange-700" },
  kritik: { label: "Kritik", color: "bg-red-100 text-red-700" },
};

const TYPE_LABELS = {
  yazilim: "Yazılım", donanim: "Donanım", danismanlik: "Danışmanlık",
  bakim: "Bakım", destek: "Destek", egitim: "Eğitim", toplandi: "Toplantı", diger: "Diğer"
};

export default function TaskQubeTickets() {
  const queryClient = useQueryClient();
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterBoard, setFilterBoard] = useState("all");
  const [searchParams] = useSearchParams();
  const exactStatusParam = searchParams.get("status");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("group") || searchParams.get("status") || "all");
  const [filterStatusKeys, setFilterStatusKeys] = useState([]); // cok secimli durum filtresi
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  const GROUP_META = {
    talep:      { label: "Talep",       color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",     ring: "ring-blue-400" },
    analiz:     { label: "Analiz",      color: "text-violet-600", bg: "bg-violet-50 border-violet-200", ring: "ring-violet-400" },
    gelistirme: { label: "Geli\u015ftirme", color: "text-purple-600", bg: "bg-purple-50 border-purple-200", ring: "ring-purple-400" },
    test_onay:  { label: "Test / Onay", color: "text-orange-600", bg: "bg-orange-50 border-orange-200", ring: "ring-orange-400" },
    tamamlanan: { label: "Tamamlanan",  color: "text-green-600",  bg: "bg-green-50 border-green-200",   ring: "ring-green-400" },
    diger:      { label: "Di\u011fer",      color: "text-slate-600",  bg: "bg-slate-50 border-slate-200",   ring: "ring-slate-400" },
  };
  const GROUP_ORDER = ["talep", "analiz", "gelistirme", "test_onay", "tamamlanan", "diger"];
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const { user } = useAuth();
  const isMusteri = user?.role === "musteri";
  const [filterCustomer, setFilterCustomer] = useState(isMusteri ? (user?.customer_id || "all") : "all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.TQTicket.delete(id),
    onSuccess: () => {
      invalidateTicketQueries(queryClient);
      setDeletingTicket(null);
      toast.success("Bilet silindi");
    },
    onError: (err) => {
      setDeletingTicket(null);
      toast.error(err?.message || "Bu işlem için yetkiniz yok");
    },
  });
  const [rejectingTicket, setRejectingTicket] = useState(null);
  const [rejectComment, setRejectComment] = useState("");
  const approveMutation = useMutation({
    mutationFn: (ticket) => flowApi.entities.TQTicket.update(ticket.id, { status: "sonuclanan" }),
    onSuccess: (_, ticket) => {
      invalidateTicketQueries(queryClient);
      flowApi.entities.TQComment.create({
        ticket_id: ticket.id,
        author_id: user?.id || "musteri",
        author_name: user?.full_name || "Müşteri",
        content: "Müşteri bileti onayladı.",
        is_internal: false,
      });
      toast.success("Bilet onaylandı");
    },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ ticket, comment }) => flowApi.entities.TQTicket.update(ticket.id, { status: "musteri_testten_donen" }),
    onSuccess: (_, { ticket, comment }) => {
      invalidateTicketQueries(queryClient);
      flowApi.entities.TQComment.create({
        ticket_id: ticket.id,
        author_id: user?.id || "musteri",
        author_name: user?.full_name || "Müşteri",
        content: comment,
        is_internal: false,
      });
      setRejectingTicket(null);
      setRejectComment("");
      toast.success("Bilet reddedildi");
    },
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["tq-statuses"],
    queryFn: () => flowApi.entities.TQTicketStatus.filter({ is_active: true }, "sort_order", 500),
  });
  const { data: archivedData } = useQuery({
    queryKey: ["archived-count"],
    queryFn: () => fetch("/api/dashboard/archived-count", { credentials: "include" }).then(r=>r.json()),
    staleTime: 5*60*1000,
  });
  const archivedCount = archivedData?.count || 0;

  // group_key DB'den gelir; GROUP_ORDER'da olmayan (bilinmeyen) bir deger 'diger' grubuna dusurulur ki hicbir status kaybolmasin
  const normGroup = (gk) => GROUP_ORDER.includes(gk) ? gk : "diger";
  const ALL_GROUPS = GROUP_ORDER
    .map(gk => ({ key: gk, ...GROUP_META[gk], keys: [...new Set(statuses.filter(s => normGroup(s.group_key) === gk).map(s => s.key))] }))
    .filter(g => g.keys.length > 0);
  const _mg = (k) => ALL_GROUPS.find(g => g.key === k);
  const MUSTERI_GROUPS = [
    { key: "talep_analiz", label: "Talep-Analiz", color: GROUP_META.talep.color, bg: GROUP_META.talep.bg, ring: GROUP_META.talep.ring, keys: [...((_mg("talep")||{}).keys||[]), ...((_mg("analiz")||{}).keys||[])] },
    _mg("gelistirme"),
    _mg("test_onay"),
    _mg("tamamlanan"),
  ].filter(g => g && g.keys && g.keys.length > 0);
  const getActiveGroupKeys = (status) => {
    if (status === "all") return null;
    const group = ALL_GROUPS.find(g => g.keys.includes(status) || g.key === status);
    return group ? group.keys : [status];
  };

  const getStatusCfg = (key) => {
    const s = statuses.find(s => s.key === key);
    if (!s) return { label: key, color: "bg-slate-100 text-slate-700" };
    return { label: s.name, color: COLOR_BADGE[s.color] || "bg-slate-100 text-slate-700" };
  };

  const uniqueStatuses = (() => {
    const seen = new Set();
    return statuses.filter(s => { if (seen.has(s.key)) return false; seen.add(s.key); return true; });
  })();
  const toggleStatusKey = (key) => {
    setFilterStatus("all"); // cok secimli filtre aktifken grup/tekil filtreyi devre disi birak
    setFilterStatusKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const statusFilterLabel = filterStatusKeys.length === 0
    ? "Tüm Durumlar"
    : filterStatusKeys.length === 1
      ? (getStatusCfg(filterStatusKeys[0]).label)
      : `${filterStatusKeys.length} durum seçili`;

  // "Biten" durumlar: DB is_final bayragi + kesin kapali key'ler. Durum filtresi
  // acikca secilmediyse ("Tüm Durumlar") liste bunlari varsayilan gizler --
  // grup kartina ya da belirli bir duruma tiklaninca yine gorunurler.
  // Board'a ozgu ozel statuler (or. "Arsivlendi" / "Sonuclandi") cogu zaman
  // is_final=0 ve group_key='diger' ile olusturulmus -- bayraklara guvenemeyiz,
  // bu yuzden statu ADINA gore de "biten" tespiti yapiyoruz.
  const FINAL_NAME_RE = /(ar[sş]iv|iptal|reddedil|tamamlan|[cç][oö]z[uü]ld|kapat[iı]ld|kapand|sonu[cç]land|sonu[cç]lan)/i;
  const finalStatusKeys = useMemo(() => new Set([
    ...statuses.filter(s =>
      s.is_final == 1 || s.is_final === true ||
      s.is_closed == 1 || s.is_closed === true ||
      normGroup(s.group_key) === "tamamlanan" ||
      FINAL_NAME_RE.test(String(s.name || "").toLocaleLowerCase("tr"))
    ).map(s => s.key),
    "sonuclanan", "iptal", "arsivlendi", "sonuclandi", "arsiv",
  ]), [statuses]);
  // Herhangi bir kriter (arama, oncelik, musteri, pano, sorumlu, tarih araligi,
  // gecikme, durum) uygulanmis mi? Uygulanmissa kullanici acikca "belirli bir
  // seye bakiyorum" demektir -- o kritere uyan HER sey (durumu ne olursa olsun)
  // gorunmeli. Ornegin sadece musteri filtresiyle daraltip rapor/Excel
  // alirken, o musterinin sonuclanmis/iptal isleri sessizce dusmemeli.
  const anyFilterActive = !!searchQuery.trim() ||
    filterPriority !== "all" || filterCustomer !== "all" || filterBoard !== "all" ||
    filterAssignee !== "all" || !!filterDateFrom || !!filterDateTo || filterOverdue ||
    filterStatus !== "all" || filterStatusKeys.length > 0;

  // Yalnizca ic rollerde ve HICBIR kriter uygulanmamisken bitenleri gizle
  // (musteri portalinda davranis degismesin -- "biletim kayboldu" sorusu olmasin).
  const hideFinalByDefault = !isMusteri && !anyFilterActive;

  // Herhangi bir kriter aktifse arsivlenmisleri de getir -- yoksa (ozellikle
  // arama veya musteri filtresiyle) arsivlenmis/sonuclanan/iptal bir bileti
  // hicbir zaman bulamiyordu / rapora dahil edemiyorduk.
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tq-tickets-active", anyFilterActive],
    queryFn: () => flowApi.entities.TQTicket.filter(anyFilterActive ? {} : { exclude_archived: 1 }),
    staleTime: 2 * 60 * 1000,
  });

  // Acik olan detay dialogundaki bilet, liste tazelendiginde de guncel
  // kalsin -- yoksa "Duzenle" ile kaydedilen degisiklik, dialog kapatilip
  // tekrar acilana kadar goruntude yansimiyordu (selectedTicket, tickets
  // yenilense bile eski referansta kalip donuyordu).
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find((t) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  }, [tickets]);

  const { data: allProjects = [] } = useQuery({
    queryKey: ["tq-projects"],
    queryFn: () => flowApi.entities.TQProject.filter({ is_active: 1 }),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.filter({ status: "aktif" }),
  });
  // Isim cozumu icin TUM musteriler (pasifler dahil) -- bilette customer_name
  // bos ama customer_id dolu olabiliyor; liste/Excel/arama bunu cozebilsin.
  const { data: allCustomersIdName = [] } = useQuery({
    queryKey: ["customers-idname"],
    queryFn: () => flowApi.entities.Customer.list("company_name", 5000),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  const { data: boards = [] } = useQuery({
    queryKey: ["tq-boards"],
    queryFn: () => flowApi.entities.TQKanbanBoard.filter({ is_active: true }),
  });

  const trSort = (arr, key) => [...arr].sort((a, b) => String(a[key] || "").localeCompare(String(b[key] || ""), "tr"));
  const activeProjects = allProjects.filter(p => (p.is_active == 1 || p.is_active === true) && p.is_deleted != 1);
  const projectsRaw = isMusteri
    ? activeProjects.filter(p => p.customer_id === user?.customer_id)
    : activeProjects;
  const projects = trSort(projectsRaw, "name");
  const sortedCustomers = trSort(customers, "company_name");
  const customerNameById = useMemo(() => {
    const m = new Map();
    for (const c of allCustomersIdName) m.set(c.id, c.company_name);
    for (const c of customers) if (!m.has(c.id)) m.set(c.id, c.company_name);
    return m;
  }, [allCustomersIdName, customers]);
  const ticketCustomerName = (t) => t.customer_name || customerNameById.get(t.customer_id) || "";
  // Musteri filtresi secenekleri: yalnizca durumu BITEN OLMAYAN (arsiv/iptal/
  // sonuclandi/tamamlandi disi) en az bir bileti olan musteriler listelenir.
  // Boylece pasif / TaskQube kullanmayan, sadece kapali bileti kalmis musteri
  // (or. Balikesir BASKI) burada gozukmez. Ad ticket'ta yoksa customers'tan
  // cozulur, o da yoksa secenek eklenmez.
  const ticketCustomerOptions = useMemo(() => {
    const map = new Map();
    for (const t of tickets) {
      if (finalStatusKeys.has(t.status)) continue;
      if (!t.customer_id || map.has(t.customer_id)) continue;
      const name = ticketCustomerName(t) || null;
      if (name) map.set(t.customer_id, name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [tickets, finalStatusKeys, customers]);
  const sortedEmployees = trSort(employees, "full_name");
  const taskqubeEmployees = sortedEmployees.filter(e => e.show_in_taskqube == 1 || e.show_in_taskqube === true);
  const sortedBoards = trSort(boards, "name");

  // Filtrele -- durum disi ("non-status") kriterler ayri, ki gizlenen "biten"
  // bilet sayisini da ayni kriterlerle sayabilelim.
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const matchesNonStatus = (t) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q ||
      t.title?.toLowerCase().includes(q) ||
      ticketCustomerName(t).toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      String(t.ticket_number ?? "").toLowerCase().includes(q);
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    const matchCustomer = filterCustomer === "all" || t.customer_id === filterCustomer;
    const matchBoard = filterBoard === "all" || t.board_id === filterBoard;
    const matchAssignee = filterAssignee === "all" ||
      (filterAssignee === "__unassigned__"
        ? !finalStatusKeys.has(t.status)   // "Atanmamis" filtresi biten/arsiv biletleri hic gostermesin
          && !t.assigned_to_id
          && !(Array.isArray(t.assigned_to_ids) && t.assigned_to_ids.length > 0)
          && !t.assigned_to_name
          && !(Array.isArray(t.assigned_to_names) && t.assigned_to_names.length > 0)
        : t.assigned_to_id === filterAssignee ||
          (Array.isArray(t.assigned_to_ids) && t.assigned_to_ids.includes(filterAssignee)));
    const createdDay = t.created_date ? String(t.created_date).slice(0, 10) : "";
    const matchDateFrom = !filterDateFrom || (createdDay && createdDay >= filterDateFrom);
    const matchDateTo = !filterDateTo || (createdDay && createdDay <= filterDateTo);
    const matchOverdue = !filterOverdue ||
      (t.due_date && String(t.due_date).slice(0, 10) < todayStr && !finalStatusKeys.has(t.status));
    return matchSearch && matchPriority && matchCustomer && matchBoard && matchAssignee
      && matchDateFrom && matchDateTo && matchOverdue;
  };
  const matchesStatus = (t) => {
    // Grup kartından seçilince grup tüm key'leri; select'ten seçilince sadece o status
    const isGroupKey = !exactStatusParam && ALL_GROUPS.some(g => g.key === filterStatus);
    const activeKeys = isGroupKey ? getActiveGroupKeys(filterStatus) : null;
    if (filterStatusKeys.length > 0) return filterStatusKeys.includes(t.status);
    if (filterStatus === "all") return hideFinalByDefault ? !finalStatusKeys.has(t.status) : true;
    return activeKeys ? activeKeys.includes(t.status) : t.status === filterStatus;
  };
  const filteredTickets = tickets.filter((t) => matchesNonStatus(t) && matchesStatus(t));
  // "Tüm Durumlar" görünümünde gizlenen biten bilet sayısı (kullanıcıya ipucu)
  const hiddenClosedCount = hideFinalByDefault
    ? tickets.filter((t) => matchesNonStatus(t) && finalStatusKeys.has(t.status)).length
    : 0;
  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const statusName = (key) => (statuses.find(s => s.key === key)?.name) || key || "";
    const prioName = (p) => (PRIORITY_CONFIG[p]?.label) || p || "";
    const rows = filteredTickets.map((t) => ({
      "Bilet No": t.ticket_number || "",
      "Baslik": t.title || "",
      "Aciklama": t.description || "",
      "Durum": statusName(t.status),
      "Oncelik": prioName(t.priority),
      "Musteri": ticketCustomerName(t),
      "Proje": t.project_name || "",
      "Urun/Modul": t.product_name || "",
      "Atanan": t.assigned_to_name || (Array.isArray(t.assigned_to_names) ? t.assigned_to_names.join(", ") : "") || "",
      "Pano": t.board_name || "",
      "Olusturma": t.created_date ? String(t.created_date).slice(0, 10) : "",
      "Beklenen Bitis": t.due_date ? String(t.due_date).slice(0, 10) : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Biletler");
    const bugun = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `biletler-${bugun}.xlsx`);
  };
  const pendingApprovalTickets = isMusteri ? filteredTickets.filter(t => CUSTOMER_APPROVAL_STATUSES.includes(t.status)) : [];
  const otherTickets = isMusteri ? filteredTickets.filter(t => !CUSTOMER_APPROVAL_STATUSES.includes(t.status)) : filteredTickets;

  // Durum sayıları
  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Biletler</h1>
          <p className="text-sm text-muted-foreground mt-1">Müşteri talepleri ve destek biletleri</p>
        </div>
        <div className="flex items-center gap-2">
          {!isMusteri && (
            <Button variant="outline" onClick={exportExcel} disabled={filteredTickets.length === 0}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
          )}
          <Button onClick={() => { setEditingTicket(null); setShowTicketForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Yeni Bilet
          </Button>
        </div>
      </div>

      {/* Durum Özeti */}
      {isMusteri ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MUSTERI_GROUPS.map(g => {
            const count = g.keys.reduce((sum, k) => sum + (statusCounts[k] || 0), 0);
            const isActive = g.keys.includes(filterStatus);
            return (
              <button
                key={g.key}
                onClick={() => { setFilterStatusKeys([]); isActive ? setFilterStatus("all") : setFilterStatus(g.keys[0]); }}
                className={`rounded-xl p-4 text-left border transition-all hover:shadow-sm ${isActive ? "ring-2 ring-primary shadow-sm " + g.bg : "bg-card border-border/50"}`}
              >
                <span className={`text-xs font-medium block mb-1 ${g.color}`}>{g.label}</span>
                <p className={`text-2xl font-bold ${g.color}`}>{count}</p>
              </button>
            );
          })}
        </div>
      ) : (
        (() => {
          const INNER_GROUPS = ALL_GROUPS;
          return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              {INNER_GROUPS.map(g => {
                const count = g.keys.reduce((sum, k) => sum + (statusCounts[k] || 0), 0);
                const isActive = g.keys.includes(filterStatus) || g.key === filterStatus;
                const activeStatuses = g.keys.filter(k => statuses.find(s => s.key === k));
                return (
                  <div key={g.key} className="relative">
                    <button
                      onClick={() => { setFilterStatusKeys([]); isActive ? setFilterStatus("all") : setFilterStatus(g.key); }}
                      className={`w-full rounded-xl p-4 text-left border transition-all hover:shadow-md ${isActive ? "ring-2 " + g.ring + " shadow-sm " + g.bg : "bg-card border-border/50 hover:" + g.bg}`}
                    >
                      <span className={`text-xs font-semibold block mb-1 ${g.color}`}>{g.label}</span>
                      <p className={`text-2xl font-bold ${g.color}`}>{count}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activeStatuses.length} durum</p>
                    </button>
                    {isActive && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {activeStatuses.map(k => {
                          const st = statuses.find(s => s.key === k);
                          if (!st) return null;
                          const c = k === 'arsivlendi' ? archivedCount : (statusCounts[k] || 0);
                          if (k === 'arsivlendi') {
                            return (
                              <span key={k} className="text-[10px] px-2 py-1 rounded-full border bg-card border-border/50 text-muted-foreground cursor-default">
                                {st.name} ({c})
                              </span>
                            );
                          }
                          return (
                            <button
                              key={k}
                              onClick={() => setFilterStatus(filterStatus === k ? "all" : k)}
                              className={`text-[10px] px-2 py-1 rounded-full border transition-all ${filterStatus === k ? g.bg + " " + g.color + " font-semibold border-current" : "bg-card border-border/50 text-muted-foreground"}`}
                            >
                              {st.name} ({c})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {(() => {
                const archiveActive = filterStatusKeys.length === 1 && filterStatusKeys[0] === "arsivlendi";
                return (
                  <div className="relative">
                    <button
                      onClick={() => {
                        if (archiveActive) { setFilterStatusKeys([]); }
                        else { setFilterStatus("all"); setFilterStatusKeys(["arsivlendi"]); }
                      }}
                      className={`w-full rounded-xl p-4 text-left border transition-all hover:shadow-md ${archiveActive ? "ring-2 ring-amber-400 shadow-sm bg-amber-50 border-amber-200" : "bg-card border-border/50 hover:bg-amber-50"}`}
                    >
                      <span className="text-xs font-semibold block mb-1 text-amber-700">Arşiv</span>
                      <p className="text-2xl font-bold text-amber-700">{archivedCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">arşivlenen</p>
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        })()
      )}

      {/* Filtreler */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-52 justify-between font-normal">
                <span className="truncate">{statusFilterLabel}</span>
                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto w-56">
              <DropdownMenuLabel>Durum (çoklu seçim)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterStatusKeys.length > 0 && (
                <>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setFilterStatusKeys([]); }}>
                    Seçimi temizle
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {uniqueStatuses.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s.key}
                  checked={filterStatusKeys.includes(s.key)}
                  onCheckedChange={() => toggleStatusKey(s.key)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {s.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Öncelik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Öncelikler</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCustomer} onValueChange={setFilterCustomer} disabled={isMusteri}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Müşteri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Müşteriler</SelectItem>
              {ticketCustomerOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isMusteri && (
            <Select value={filterBoard} onValueChange={setFilterBoard}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Panolar</SelectItem>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!isMusteri && (
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Kullanıcı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kullanıcılar</SelectItem>
                <SelectItem value="__unassigned__">Atanmamış</SelectItem>
                {taskqubeEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!isMusteri && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={filterDateFrom}
                max={filterDateTo || undefined}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-40"
                title="Oluşturma tarihi - başlangıç"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="date"
                value={filterDateTo}
                min={filterDateFrom || undefined}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-40"
                title="Oluşturma tarihi - bitiş"
              />
            </div>
          )}
          {!isMusteri && (
            <Button
              variant={filterOverdue ? "default" : "outline"}
              size="sm"
              className={filterOverdue ? "gap-1.5 bg-red-600 hover:bg-red-700" : "gap-1.5"}
              onClick={() => setFilterOverdue((v) => !v)}
              title="Son tarihi geçmiş açık biletler"
            >
              <Clock className="w-4 h-4" /> Geciken
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {searchOpen ? (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  autoFocus
                  className="pl-9 pr-8"
                  placeholder="Bilet ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                >
                  &#10005;
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSearchOpen(true)}>
                <Search className="w-4 h-4" /> Ara
              </Button>
            )}
          </div>
          {(filterStatus !== "all" || filterStatusKeys.length > 0 || filterPriority !== "all" || filterCustomer !== "all" || filterBoard !== "all" || filterAssignee !== "all" || filterDateFrom || filterDateTo || filterOverdue || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={() => {
              setFilterStatus("all"); setFilterStatusKeys([]); setFilterPriority("all");
              setFilterCustomer("all"); setFilterBoard("all");
              setFilterAssignee("all"); setFilterDateFrom(""); setFilterDateTo(""); setFilterOverdue(false);
              setSearchQuery(""); setSearchOpen(false);
            }}>
              Temizle
            </Button>
          )}
        </div>
      </div>

      {hiddenClosedCount > 0 && (
        <p className="text-xs text-muted-foreground -mt-2 px-1">
          {hiddenClosedCount} biten bilet (sonuçlandı / iptal) gizli. Görmek için Durum filtresini ya da üstteki
          {" "}<strong>Tamamlanan</strong> / <strong>Diğer</strong> kartını kullanın.
        </p>
      )}

      {isMusteri && pendingApprovalTickets.length > 0 && (
        <div className="bg-card rounded-2xl border border-teal-300 shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 bg-teal-50 border-b border-teal-200">
            <h3 className="font-semibold text-teal-800">Onayınızı Bekleyen Biletler</h3>
          </div>
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="hidden sm:table-column w-[90px]" />
              <col />
              <col className="hidden md:table-column w-[110px]" />
              <col className="w-[200px]" />
            </colgroup>
            <thead className="bg-muted/40 border-b border-border/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Bilet No</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Başlık</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Tip</th>
                <th className="px-2 py-3 font-medium text-muted-foreground text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovalTickets.map((ticket, idx) => (
                <tr
                  key={ticket.id}
                  className={`border-b border-border/30 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                >
                  <td className="px-4 py-3 text-foreground hidden sm:table-cell font-mono text-lg font-bold">
                    {ticket.ticket_number || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground truncate max-w-xs">{ticket.title}</p>
                    {ticket.project_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{ticket.project_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">{ticket.type || "-"}</Badge>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
                        onClick={(e) => { e.stopPropagation(); approveMutation.mutate(ticket); }}
                        disabled={approveMutation.isPending}
                      >
                        Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8"
                        onClick={(e) => { e.stopPropagation(); setRejectingTicket(ticket); setRejectComment(""); }}
                      >
                        Reddet
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Tablo */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : otherTickets.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {tickets.length === 0 ? "Henüz bilet eklenmemiş." : "Filtre kriterlerine uyan bilet bulunamadı."}
          </div>
        ) : (
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="hidden sm:table-column w-[90px]" />
              <col />
              <col className="hidden sm:table-column w-[140px]" />
              <col className="hidden md:table-column w-[110px]" />
              <col className="w-[130px]" />
              <col className="hidden md:table-column w-[90px]" />
              <col className="hidden lg:table-column w-[150px]" />
              <col className="hidden lg:table-column w-[100px]" />
              <col className="hidden lg:table-column w-[100px]" />
              <col className="w-[120px]" />
            </colgroup>
            <thead className="bg-muted/40 border-b border-border/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Bilet No</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Başlık</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Müşteri</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Tip</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Durum</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Öncelik</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Atanan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Açılış</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Son Tarih</th>
                <th className="px-2 py-3 font-medium text-muted-foreground text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {otherTickets.slice((currentPage-1)*pageSize, currentPage*pageSize).map((ticket, idx) => {
                const sCfg = getStatusCfg(ticket.status);
                const pCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.orta;
                return (
                  <tr
                    key={ticket.id}
                    className={`border-b border-border/30 hover:bg-muted/30 transition-colors ${
                      idx % 2 === 0 ? "" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-3 text-foreground hidden sm:table-cell font-mono text-lg font-bold">
                      {ticket.ticket_number || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground truncate max-w-xs">{ticket.title}</p>
                      {ticket.project_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{ticket.project_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate">{ticketCustomerName(ticket) || "-"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{ticket.type || "-"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${sCfg.color} text-xs`}>{sCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge className={`${pCfg.color} text-xs`}>{pCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-[160px]">
                      {ticket.assigned_to_names?.length > 0 ? (
                        <span className="block truncate" title={ticket.assigned_to_names.join(", ")}>
                          {ticket.assigned_to_names[0]}
                          {ticket.assigned_to_names.length > 1 && (
                            <span className="text-xs text-muted-foreground"> +{ticket.assigned_to_names.length - 1}</span>
                          )}
                        </span>
                      ) : (ticket.assigned_to_name || "-")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {ticket.created_date ? String(ticket.created_date).slice(0, 10).split("-").reverse().join(".") : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {ticket.due_date ? format(new Date(ticket.due_date), "dd.MM.yyyy") : "-"}
                    </td>
                    <td className="px-2 py-3">
                     <div className="flex items-center justify-end gap-0.5 min-w-[112px]">
                       <Button
                         size="icon"
                         variant="ghost"
                         className="h-8 w-8 text-muted-foreground hover:text-foreground"
                         onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); }}
                       >
                         <Eye className="w-4 h-4" />
                       </Button>
                       {(!isMusteri || ticket.status === "musteri_talep") && (
                         <>
                         <Button
                           size="icon"
                           variant="ghost"
                           className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                           onClick={(e) => { e.stopPropagation(); setEditingTicket(ticket); setShowTicketForm(true); }}
                         >
                           <Pencil className="w-4 h-4" />
                         </Button>
                         {!isMusteri && <Button
                           size="icon"
                           variant="ghost"
                           className="h-8 w-8 text-muted-foreground hover:text-red-600"
                           onClick={(e) => { e.stopPropagation(); setDeletingTicket(ticket); }}
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>}
                         </>
                       )}
                     </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {otherTickets.length > 0 && (
          <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Sayfa başına:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-border rounded px-2 py-1 text-xs bg-background"
              >
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{otherTickets.length} bilet</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-border rounded disabled:opacity-40 hover:bg-muted"
              >← Önceki</button>
              <span className="text-xs px-2 text-muted-foreground">{currentPage} / {Math.ceil(otherTickets.length / pageSize)}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(otherTickets.length / pageSize), p+1))}
                disabled={currentPage >= Math.ceil(otherTickets.length / pageSize)}
                className="px-2 py-1 text-xs border border-border rounded disabled:opacity-40 hover:bg-muted"
              >Sonraki →</button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showTicketForm && (
        <TQTicketFormDialog
          ticket={editingTicket}
          projects={projects}
          customers={sortedCustomers}
          employees={sortedEmployees}
          boards={sortedBoards}
          isMusteri={isMusteri}
          currentUser={user}
          open={showTicketForm}
          onOpenChange={setShowTicketForm}
        />
      )}

      {selectedTicket && (
        <TQTicketDetailDialog
          ticket={selectedTicket}
          employees={employees}
          projects={projects}
          customers={customers}
          open={!!selectedTicket}
          isMusteri={isMusteri}
          canEdit={!isMusteri || selectedTicket?.status === 'musteri_talep'}
          onOpenChange={(v) => !v && setSelectedTicket(null)}
        />
      )}

      <AlertDialog open={!!deletingTicket} onOpenChange={(v) => !v && setDeletingTicket(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bileti sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletingTicket?.title}</strong> bileti kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteMutation.mutate(deletingTicket.id)}
              disabled={deleteMutation.isPending}
            >
              Evet, Sil
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!rejectingTicket} onOpenChange={(v) => { if (!v) { setRejectingTicket(null); setRejectComment(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bileti Reddet</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{rejectingTicket?.title}</strong> bileti reddedilecek ve "Müşteri Testten Donen" durumuna alınacak. Lütfen red gerekçenizi belirtin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Red gerekçenizi yazın (zorunlu)..."
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!rejectComment.trim() || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ ticket: rejectingTicket, comment: rejectComment })}
            >
              Reddet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}