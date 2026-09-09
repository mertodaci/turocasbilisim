import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Plus, Pencil, Trash2, LayoutDashboard, Search, X } from "lucide-react";
import JTKanbanBoard from "@/components/jobtracking/JTKanbanBoard";
import JTBoardFormDialog from "@/components/jobtracking/JTBoardFormDialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/lib/RolePermissionsContext";
import { invalidateTicketQueries } from "@/lib/jobTrackingQueryUtils";

const COLOR_CLASSES = {
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  slate: "bg-slate-500",
};

const EMPTY_FILTERS = {
  customer_id: "all",
  product_name: "all",
  ticket_number: "",
  assigned_to_id: "all",
  type: "all",
  priority: "all",
};

// Gercek oncelik anahtarlari (JTKanbanBoard.jsx'teki PRIORITY_CONFIG ile
// ayni) -- sabit/kucuk bir kume oldugu icin panodaki biletlerden turetmek
// yerine burada sabit tanimlanir.
const PRIORITY_OPTIONS = [
  { value: "dusuk", label: "Düşük" },
  { value: "orta", label: "Orta" },
  { value: "yuksek", label: "Yüksek" },
  { value: "kritik", label: "Kritik" },
];

export default function JobTrackingKanban() {
  const { user } = useAuth();
  const { can } = useRolePermissions();
  const canAdd = can(user?.role, "is_takibi_kanban", "add");
  const canEdit = can(user?.role, "is_takibi_kanban", "edit");
  const canDelete = can(user?.role, "is_takibi_kanban", "delete");
  const queryClient = useQueryClient();
  // Seçili pano URL'de tutulur (?board=<id>) — böylece sayfa yenilenince pano açık kalır.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBoardId = searchParams.get("board") || null;
  const setSelectedBoardId = (id) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set("board", id);
      else next.delete("board");
      return next;
    }, { replace: true });
  };
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState("kanban");
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const { data: boards = [], isLoading: boardsLoading } = useQuery({
    queryKey: ["tq-boards"],
    queryFn: async () => {
      const list = await flowApi.entities.JTKanbanBoard.filter({ is_active: true });
      return (list || []).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "tr"));
    },
  });

  const { data: allBoardTickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["tq-tickets-board", selectedBoardId],
    queryFn: () => selectedBoardId
      ? flowApi.entities.JTTicket.filter({ board_id: selectedBoardId })
      : Promise.resolve([]),
    enabled: !!selectedBoardId,
  });

  // Pano seçim ekranındaki sayaçlar için hafif bir sorgu (sadece board_id alanı yeterli olurdu ama backend tam kayıt döndürüyor)
  const { data: allTicketsForCount = [] } = useQuery({
    queryKey: ["tq-tickets-count"],
    queryFn: () => flowApi.entities.JTTicket.filter({ exclude_archived: 1 }),
    enabled: !selectedBoardId,
  });

  // Canli guncelleme: baska bir kullanici bilet ekler/tasir/guncellerse pano
  // arka planda kendini tazeler (sayfa yenilenmez, ~3sn'de bir kontrol edilen
  // paylasilan SSE baglantisi uzerinden). Acik bir "Yeni Bilet" formu varsa
  // formun kendi state'i ayri oldugu icin bundan etkilenmez, veri kaybi olmaz.
  useEffect(() => {
    const unsubscribe = flowApi.entities.JTTicket.subscribe(() => {
      invalidateTicketQueries(queryClient);
    });
    return unsubscribe;
  }, [queryClient]);

  const { data: allProjects = [] } = useQuery({
    queryKey: ["tq-projects"],
    queryFn: () => flowApi.entities.JTProject.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.JTKanbanBoard.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-boards"] });
      if (selectedBoardId) setSelectedBoardId(null);
      toast.success("Pano silindi");
    },
  });

  const jobTrackingCustomerIds = customers.filter(c => c.use_job_tracking == true || c.use_job_tracking === 1).map(c => c.id);
  const projects = allProjects.filter(p => jobTrackingCustomerIds.includes(p.customer_id));

  const selectedBoard = boards.find(b => b.id === selectedBoardId);

  const boardTicketsRaw = selectedBoard ? allBoardTickets : [];

  // Filtre seçenekleri (sadece bu panodaki biletlerden türetilir)
  const productOptions = useMemo(() => {
    const set = new Set(boardTicketsRaw.map(t => t.product_name).filter(Boolean));
    return Array.from(set);
  }, [boardTicketsRaw]);

  const typeOptions = useMemo(() => {
    const set = new Set(boardTicketsRaw.map(t => t.type).filter(Boolean));
    return Array.from(set);
  }, [boardTicketsRaw]);

  const boardCustomerOptions = useMemo(() => {
    const ids = new Set(boardTicketsRaw.map(t => t.customer_id).filter(Boolean));
    return customers.filter(c => ids.has(c.id));
  }, [boardTicketsRaw, customers]);

  const boardAssigneeOptions = useMemo(() => {
    const ids = new Set();
    boardTicketsRaw.forEach(t => {
      if (Array.isArray(t.assigned_to_ids)) {
        t.assigned_to_ids.forEach(id => { if (id) ids.add(id); });
      }
      if (t.assigned_to_id) ids.add(t.assigned_to_id);
    });
    return employees.filter(e => ids.has(e.id));
  }, [boardTicketsRaw, employees]);

  // Filtreleri uygula
  const boardTickets = boardTicketsRaw.filter(t => {
    if (filters.customer_id !== "all" && t.customer_id !== filters.customer_id) return false;
    if (filters.product_name !== "all" && t.product_name !== filters.product_name) return false;
    if (filters.ticket_number.trim() && !String(t.ticket_number || "").includes(filters.ticket_number.trim())) return false;
    if (filters.assigned_to_id !== "all") {
      const inArray = Array.isArray(t.assigned_to_ids) && t.assigned_to_ids.includes(filters.assigned_to_id);
      const isSingle = t.assigned_to_id === filters.assigned_to_id;
      if (!inArray && !isSingle) return false;
    }
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (filters.priority !== "all" && t.priority !== filters.priority) return false;
    return true;
  });

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v && v !== "all").length;

  const resetFilters = () => setFilters(EMPTY_FILTERS);

  // Bilet sayıları per pano (sadece pano seçim ekranında kullanılır)
  const ticketCountByBoard = allTicketsForCount.reduce((acc, t) => {
    if (t.board_id) acc[t.board_id] = (acc[t.board_id] || 0) + 1;
    return acc;
  }, {});

  const isLoading = boardsLoading || ticketsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panolar</h1>
        </div>
        {selectedBoard ? (
          <Button
            variant="outline"
            className="rounded-xl gap-1.5"
            onClick={() => setFiltersOpen(true)}
          >
            <Search className="w-4 h-4" />
            Bilet Arama
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>
        ) : (
          <Button onClick={() => { setEditingBoard(null); setShowBoardForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Yeni Pano
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      ) : boards.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-16 text-center">
          <LayoutDashboard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Henüz pano oluşturulmamış.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Farklı ekipler için ayrı kanban panoları oluşturabilirsiniz.
          </p>
          <Button className="mt-4" onClick={() => setShowBoardForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> İlk Panoyu Oluştur
          </Button>
        </div>
      ) : !selectedBoard ? (
        /* Pano Seçim Ekranı */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => {
            const colorCls = COLOR_CLASSES[board.color] || COLOR_CLASSES.blue;
            const count = ticketCountByBoard[board.id] || 0;
            return (
              <div
                key={board.id}
                onClick={() => { setSelectedBoardId(board.id); resetFilters(); }}
                className="bg-card border border-border/50 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${colorCls} flex items-center justify-center text-xl shadow-sm`}>
                    {board.icon || "📋"}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); setEditingBoard(board); setShowBoardForm(true); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(board.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-base mb-1">{board.name}</h3>
                {board.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{board.description}</p>
                )}
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-semibold text-primary">{count}</span>
                  <span className="text-muted-foreground">bilet</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Seçili Pano - Kanban Görünümü */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { setSelectedBoardId(null); resetFilters(); }}>
              ← Panolar
            </Button>
            <div className={`w-7 h-7 rounded-lg ${COLOR_CLASSES[selectedBoard.color]} flex items-center justify-center text-sm`}>
              {selectedBoard.icon || "📋"}
            </div>
            <div>
              <h2 className="font-semibold">{selectedBoard.name}</h2>
              {selectedBoard.description && (
                <p className="text-xs text-muted-foreground">{selectedBoard.description}</p>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {boardTickets.length}{activeFilterCount > 0 && ` / ${boardTicketsRaw.length}`} bilet
            </span>
          </div>

          {/* Gorunum toggle kaldirildi - sadece kanban */}

          {viewMode === "kanban" && (
            <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
              <JTKanbanBoard
                tickets={boardTickets}
                employees={employees}
                projects={projects}
                customers={customers}
                boardId={selectedBoard.id}
                boardName={selectedBoard.name}
              />
            </div>
          )}

          {viewMode === "list" && (
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">No</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Başlık</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Durum</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Öncelik</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Müşteri</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Atanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {boardTickets.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Bilet bulunamadı</td></tr>
                  ) : boardTickets.map((t) => {
                    const customer = customers.find(c => c.id === t.customer_id);
                    const assignee = employees.find(e => e.id === t.assigned_to_id);
                    const priorityColors = { critical: "text-red-600 bg-red-50", high: "text-orange-600 bg-orange-50", medium: "text-yellow-600 bg-yellow-50", low: "text-green-600 bg-green-50" };
                    const priorityLabels = { critical: "Kritik", high: "Yüksek", medium: "Orta", low: "Düşük" };
                    return (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{t.ticket_number || "-"}</td>
                        <td className="px-4 py-3 font-medium max-w-xs truncate">{t.title}</td>
                        <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-muted rounded-full">{t.status}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[t.priority] || "text-muted-foreground bg-muted"}`}>{priorityLabels[t.priority] || t.priority || "-"}</span></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{customer?.company_name || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{assignee?.full_name || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {boardTickets.length === 0 ? (
                <div className="col-span-4 text-center py-10 text-muted-foreground">Bilet bulunamadı</div>
              ) : boardTickets.map((t) => {
                const customer = customers.find(c => c.id === t.customer_id);
                const assignee = employees.find(e => e.id === t.assigned_to_id);
                const priorityColors = { critical: "border-red-400", high: "border-orange-400", medium: "border-yellow-400", low: "border-green-400" };
                const priorityLabels = { critical: "Kritik", high: "Yüksek", medium: "Orta", low: "Düşük" };
                return (
                  <div key={t.id} className={`bg-card rounded-xl border border-border/50 border-l-4 p-4 shadow-sm hover:shadow-md transition-shadow ${priorityColors[t.priority] || "border-l-border"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-mono">#{t.ticket_number || "-"}</span>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{t.status}</span>
                    </div>
                    <h3 className="font-medium text-sm mb-2 line-clamp-2">{t.title}</h3>
                    {customer && <p className="text-xs text-muted-foreground mb-1">🏢 {customer.company_name}</p>}
                    {assignee && <p className="text-xs text-muted-foreground">👤 {assignee.full_name}</p>}
                    <div className="mt-3 pt-2 border-t border-border/30">
                      <span className="text-xs font-medium">{priorityLabels[t.priority] || t.priority || "-"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sağdan açılan filtre paneli */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setFiltersOpen(false)} />
          <div className="relative w-full max-w-sm bg-card h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-primary/5">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Bilet Arama</span>
              </div>
              <button onClick={() => setFiltersOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Müşteri</label>
                <SearchableSelect
                  value={filters.customer_id}
                  onChange={(v) => setFilters(f => ({ ...f, customer_id: v }))}
                  sort={false}
                  className="rounded-xl"
                  placeholder="Tüm Müşteriler"
                  searchPlaceholder="Müşteri ara..."
                  options={[
                    { value: "all", label: "Tüm Müşteriler" },
                    ...[...boardCustomerOptions]
                      .sort((a, b) => (a.company_name || "").localeCompare(b.company_name || "", "tr"))
                      .map(c => ({ value: c.id, label: c.company_name })),
                  ]}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Ürün</label>
                <SearchableSelect
                  value={filters.product_name}
                  onChange={(v) => setFilters(f => ({ ...f, product_name: v }))}
                  sort={false}
                  className="rounded-xl"
                  placeholder="Tüm Ürünler"
                  searchPlaceholder="Ürün ara..."
                  options={[
                    { value: "all", label: "Tüm Ürünler" },
                    ...[...productOptions]
                      .sort((a, b) => a.localeCompare(b, "tr"))
                      .map(p => ({ value: p, label: p })),
                  ]}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Bilet No</label>
                <Input
                  value={filters.ticket_number}
                  onChange={(e) => setFilters(f => ({ ...f, ticket_number: e.target.value.replace(/\D/g, "") }))}
                  inputMode="numeric"
                  placeholder="Bilet numarası ara..."
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Kullanıcı</label>
                <SearchableSelect
                  value={filters.assigned_to_id}
                  onChange={(v) => setFilters(f => ({ ...f, assigned_to_id: v }))}
                  sort={false}
                  className="rounded-xl"
                  placeholder="Tüm Kullanıcılar"
                  searchPlaceholder="Kullanıcı ara..."
                  options={[
                    { value: "all", label: "Tüm Kullanıcılar" },
                    ...[...boardAssigneeOptions]
                      .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "tr"))
                      .map(e => ({ value: e.id, label: e.full_name })),
                  ]}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Bilet Tipi</label>
                <SearchableSelect
                  value={filters.type}
                  onChange={(v) => setFilters(f => ({ ...f, type: v }))}
                  sort={false}
                  className="rounded-xl"
                  placeholder="Tüm Tipler"
                  searchPlaceholder="Tip ara..."
                  options={[
                    { value: "all", label: "Tüm Tipler" },
                    ...[...typeOptions]
                      .sort((a, b) => a.localeCompare(b, "tr"))
                      .map(t => ({ value: t, label: t })),
                  ]}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Öncelik</label>
                <SearchableSelect
                  value={filters.priority}
                  onChange={(v) => setFilters(f => ({ ...f, priority: v }))}
                  sort={false}
                  className="rounded-xl"
                  placeholder="Tüm Öncelikler"
                  searchPlaceholder="Öncelik ara..."
                  options={[
                    { value: "all", label: "Tüm Öncelikler" },
                    ...PRIORITY_OPTIONS,
                  ]}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border/50 flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={resetFilters}>
                <X className="w-3.5 h-3.5" /> Temizle
              </Button>
              <Button className="flex-1 rounded-xl gap-1.5" onClick={() => setFiltersOpen(false)}>
                <Search className="w-3.5 h-3.5" /> Ara
              </Button>
            </div>
          </div>
        </div>
      )}

      {showBoardForm && (
        <JTBoardFormDialog
          board={editingBoard}
          open={showBoardForm}
          onOpenChange={setShowBoardForm}
        />
      )}
    </div>
  );
}
