import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useRolePermissions } from "@/lib/RolePermissionsContext";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, Archive, ArrowUpDown, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import TQTicketDetailDialog from "./TQTicketDetailDialog";
import { CUSTOMER_APPROVAL_STATUSES } from "@/lib/taskqubeStatus";
import TQTicketFormDialog from "./TQTicketFormDialog";
import { invalidateTicketQueries } from "@/lib/taskqubeQueryUtils";

const COLOR_DOT = {
  slate: "bg-slate-500", purple: "bg-purple-500", blue: "bg-blue-500",
  orange: "bg-orange-500", yellow: "bg-yellow-500", green: "bg-green-500",
  red: "bg-red-500", pink: "bg-pink-500", teal: "bg-teal-500",
};
const COLOR_COLUMN_BG = {
  slate: "bg-slate-100/80 dark:bg-slate-800/40",
  purple: "bg-purple-50 dark:bg-purple-950/30",
  blue: "bg-blue-50 dark:bg-blue-950/30",
  orange: "bg-orange-50 dark:bg-orange-950/30",
  yellow: "bg-yellow-50 dark:bg-yellow-950/30",
  green: "bg-green-50 dark:bg-green-950/30",
  red: "bg-red-50 dark:bg-red-950/30",
  pink: "bg-pink-50 dark:bg-pink-950/30",
  teal: "bg-teal-50 dark:bg-teal-950/30",
};
const COLOR_BADGE = {
  slate: "bg-slate-200 text-slate-700",
  purple: "bg-purple-100 text-purple-700",
  blue: "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  pink: "bg-pink-100 text-pink-700",
  teal: "bg-teal-100 text-teal-700",
};
const COLOR_HEADER = {
  slate: "border-slate-300",
  purple: "border-purple-300",
  blue: "border-blue-300",
  orange: "border-orange-300",
  yellow: "border-yellow-300",
  green: "border-green-300",
  red: "border-red-300",
  pink: "border-pink-300",
  teal: "border-teal-300",
};

const PRIORITY_CONFIG = {
  dusuk: "bg-slate-100 text-slate-700",
  orta: "bg-blue-100 text-blue-700",
  yuksek: "bg-orange-100 text-orange-700",
  kritik: "bg-red-100 text-red-700",
};

const PRIORITY_LABELS = { dusuk: "Düşük", orta: "Orta", yuksek: "Yüksek", kritik: "Kritik" };

const DEFAULT_COLLAPSED = [...CUSTOMER_APPROVAL_STATUSES, "sonuclanan"];

export default function TQKanbanBoard({ tickets, employees = [], projects = [], customers = [], boardId = null, boardName = null }) {
  const queryClient = useQueryClient();
  const [boardTickets, setBoardTickets] = useState(tickets);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicketStatus, setNewTicketStatus] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [editName, setEditName] = useState("");
  const [sortByStatus, setSortByStatus] = useState({});

  const getInitialCollapsed = () => {
    try {
      const saved = localStorage.getItem("tq-kanban-collapsed");
      return saved ? JSON.parse(saved) : DEFAULT_COLLAPSED;
    } catch {
      return DEFAULT_COLLAPSED;
    }
  };
  const [collapsedColumns, setCollapsedColumns] = useState(getInitialCollapsed);

  const toggleCollapse = (key) => {
    setCollapsedColumns(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem("tq-kanban-collapsed", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => { setBoardTickets(tickets); }, [tickets]);

  // Acik olan detay dialogundaki bilet, liste tazelendiginde de guncel
  // kalsin -- yoksa "Duzenle" ile kaydedilen degisiklik, dialog kapatilip
  // tekrar acilana kadar goruntude yansimiyordu.
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find((t) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  }, [tickets]);

  const { data: statuses = [] } = useQuery({
    queryKey: ["tq-statuses"],
    queryFn: () => flowApi.entities.TQTicketStatus.filter({ is_active: true }, "sort_order", 500),
  });
  // Sadece bu panoya ait (veya tum panolarda gorunen) durumlari goster
  const { can } = useRolePermissions();
  const { user } = useAuth();
  const _role = user?.role || "kullanici";
  const canDeleteList = can(_role, "taskqube_kanban", "delete");
  const canEditList = can(_role, "taskqube_kanban", "edit");
  const boardStatuses = statuses.filter((s) => {
    if (!(s.is_active == 1 || s.is_active === true)) return false;
    const ids = Array.isArray(s.board_ids) ? s.board_ids : [];
    return ids.length === 0 || (boardId && ids.includes(boardId));
  });

  const deleteStatusMutation = useMutation({
    mutationFn: (id) => flowApi.entities.TQTicketStatus.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-statuses"] });
      toast.success("Liste silindi");
    },
    onError: () => toast.error("Liste silinemedi"),
  });

  const renameStatusMutation = useMutation({
    mutationFn: ({ id, name }) => flowApi.entities.TQTicketStatus.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-statuses"] });
      toast.success("Liste adı güncellendi");
      setEditingStatus(null);
    },
    onError: () => toast.error("Liste adı güncellenemedi"),
  });

  // Kolonlari surukle-birak ile sirala: yeni sort_order = dizideki indeks
  const reorderStatusMutation = useMutation({
    mutationFn: ({ id, sort_order }) => flowApi.entities.TQTicketStatus.update(id, { sort_order }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tq-statuses"] }),
    onError: () => toast.error("Liste sırası güncellenemedi"),
  });

  const archiveTicketsMutation = useMutation({
    mutationFn: async (ticketIds) => {
      await Promise.all(ticketIds.map(id => flowApi.entities.TQTicket.update(id, { status: "arsivlendi" })));
    },
    onSuccess: () => {
      invalidateTicketQueries(queryClient);
      toast.success("Biletler arşivlendi");
    },
    onError: () => toast.error("Arşivleme başarısız"),
  });

  // Varsayilan: kolon ici manuel/kalici sira (board_sort) -- ekip biletleri
  // onem derecesine gore elle diziyor, bu sira surukle-birakla degismedikce
  // sabit kalmali. "Durum degisince en uste gelsin" ihtiyaci artik burada
  // (goruntude/siralama kriterinde) degil, backend'de (entityRouter.js PUT)
  // cozuluyor: durum degisip board_sort acikca gonderilmediyse (yani
  // surukleme degilse) bilet otomatik yeni kolonun en ustune yerlesiyor --
  // sonrasinda elle surukleninceye kadar orada kalir.
  const byBoardSort = (a, b) =>
    ((a.board_sort ?? 1e9) - (b.board_sort ?? 1e9)) ||
    (Number(a.ticket_number || 0) - Number(b.ticket_number || 0));

  // Bilet kartinda yazilimci/analizci adini gostermek icin: sorumlulardan
  // pozisyonu/departmani ilgili anahtar kelimeyi iceren ilk kisi
  // (assigned_to_ids ekleme sirasi).
  const empRoleText = (e) => `${e?.position || ""} ${e?.department || ""}`.toLocaleLowerCase("tr");
  const isDeveloper = (e) => { const s = empRoleText(e); return s.includes("yazilim") || s.includes("yazılım"); };
  const isAnalyst = (e) => { const s = empRoleText(e); return s.includes("analiz") || s.includes("analist"); };
  const firstAssigneeMatching = (t, pred) => {
    const ids = Array.isArray(t.assigned_to_ids) && t.assigned_to_ids.length
      ? t.assigned_to_ids
      : (t.assigned_to_id ? [t.assigned_to_id] : []);
    for (const id of ids) {
      const emp = employees.find(e => e.id === id);
      if (emp && pred(emp)) return emp.full_name;
    }
    return null;
  };
  const developerName = (t) => firstAssigneeMatching(t, isDeveloper);
  const analystName = (t) => firstAssigneeMatching(t, isAnalyst);

  const ticketsByStatus = boardStatuses.reduce((acc, s) => {
    let list = boardTickets.filter((t) => t.status === s.key);
    const sortKey = sortByStatus[s.key];
    if (sortKey === "name_asc") {
      list = [...list].sort((a, b) => (a.customer_name || "").localeCompare(b.customer_name || "", "tr"));
    } else if (sortKey === "name_desc") {
      list = [...list].sort((a, b) => (b.customer_name || "").localeCompare(a.customer_name || "", "tr"));
    } else if (sortKey === "ticket_asc") {
      list = [...list].sort((a, b) => Number(a.ticket_number || 0) - Number(b.ticket_number || 0));
    } else if (sortKey === "ticket_desc") {
      list = [...list].sort((a, b) => Number(b.ticket_number || 0) - Number(a.ticket_number || 0));
    } else {
      list = [...list].sort(byBoardSort);
    }
    acc[s.key] = list;
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    const { destination, draggableId, source } = result;
    if (!destination) return;

    // Kolon (durum) siralamasi
    if (result.type === "column") {
      if (source.index === destination.index) return;
      const ordered = [...boardStatuses];
      const [moved] = ordered.splice(source.index, 1);
      ordered.splice(destination.index, 0, moved);
      ordered.forEach((s, i) => {
        if (s.sort_order !== i) reorderStatusMutation.mutate({ id: s.id, sort_order: i });
      });
      return;
    }

    // Bilet surukleme: hem farkli kolona tasima hem ayni kolonda yeniden siralama.
    const ticket = boardTickets.find((t) => t.id === draggableId);
    if (!ticket) return;
    const srcKey = source.droppableId;
    const destKey = destination.droppableId;
    if (srcKey === destKey && source.index === destination.index) return;

    const prevSnapshot = boardTickets;
    const prevStatus = ticket.status;
    const prevSort = ticket.board_sort;

    // Hedef kolonun (taşınan hariç) mevcut görsel sırası
    const destList = (ticketsByStatus[destKey] || []).filter((t) => t.id !== draggableId);
    const insertIdx = Math.max(0, Math.min(destination.index, destList.length));
    const before = destList[insertIdx - 1];
    const after = destList[insertIdx];
    const bS = before && typeof before.board_sort === "number" ? before.board_sort : null;
    const aS = after && typeof after.board_sort === "number" ? after.board_sort : null;

    const writes = []; // {id, data}
    let newSort;
    if (bS !== null && aS !== null && aS - bS > 1e-4) {
      newSort = (bS + aS) / 2;
    } else if (bS !== null && aS === null) {
      newSort = bS + 1;
    } else if (aS !== null && bS === null) {
      newSort = aS - 1;
    } else if (bS === null && aS === null) {
      newSort = 0;
    } else {
      // Aralik cakismasi -> hedef kolonu 1..n yeniden indeksle
      const reindexed = [...destList];
      reindexed.splice(insertIdx, 0, { ...ticket, board_sort: 0 });
      reindexed.forEach((t, i) => {
        const val = (i + 1) * 1.0;
        if (t.id === draggableId) { newSort = val; }
        else if (t.board_sort !== val) writes.push({ id: t.id, data: { board_sort: val } });
      });
    }

    // Taşınan bilet için yazma (kolon degistiyse status da)
    writes.push({
      id: draggableId,
      data: { board_sort: newSort, ...(srcKey !== destKey ? { status: destKey } : {}) },
    });

    // Iyimser guncelleme
    setBoardTickets((prev) =>
      prev.map((t) => {
        const w = writes.find((x) => x.id === t.id);
        return w ? { ...t, ...w.data } : t;
      })
    );

    // Kolonda gorunum-siralamasi aktifse temizle ki manuel sira gorunsun
    if (sortByStatus[destKey]) {
      setSortByStatus((s) => { const n = { ...s }; delete n[destKey]; return n; });
    }

    // Kalici yazma
    Promise.all(writes.map((w) => flowApi.entities.TQTicket.update(w.id, w.data)))
      .then(() => invalidateTicketQueries(queryClient))
      .catch((err) => {
        setBoardTickets(prevSnapshot.map((t) => t.id === draggableId ? { ...t, status: prevStatus, board_sort: prevSort } : t));
        invalidateTicketQueries(queryClient);
        toast.error(err?.message || "Sıra güncellenemedi");
      });
  };

  const handleDeleteStatus = (status) => {
    const count = (ticketsByStatus[status.key] || []).length;
    if (count > 0) {
      toast.error(`Bu listede ${count} bilet var. Önce biletleri taşıyın veya arşivleyin.`);
      return;
    }
    if (confirm(`"${status.name}" listesini silmek istediğinize emin misiniz?`)) {
      deleteStatusMutation.mutate(status.id);
    }
  };

  const handleArchiveAll = (status) => {
    const colTickets = ticketsByStatus[status.key] || [];
    if (colTickets.length === 0) {
      toast.error("Bu listede arşivlenecek bilet yok.");
      return;
    }
    if (confirm(`"${status.name}" listesindeki ${colTickets.length} bilet arşivlensin mi?`)) {
      archiveTicketsMutation.mutate(colTickets.map(t => t.id));
    }
  };

  const openEditStatus = (status) => {
    setEditingStatus(status);
    setEditName(status.name);
  };

  const saveEditStatus = () => {
    if (!editName.trim()) return;
    renameStatusMutation.mutate({ id: editingStatus.id, name: editName.trim() });
  };

  if (statuses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Bilet durumları tanımlanmamış. TaskQube Tanımlar ekranından durum ekleyin.
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="column">
          {(colsProvided) => (
        <div
          ref={colsProvided.innerRef}
          {...colsProvided.droppableProps}
          className="flex gap-4 overflow-x-auto pb-4"
        >
          {boardStatuses.map((status, colIdx) => {
            const colTickets = ticketsByStatus[status.key] || [];
            const dotCls = COLOR_DOT[status.color] || COLOR_DOT.slate;
            const isCollapsed = collapsedColumns.includes(status.key);
            return (
              <Draggable key={status.key} draggableId={`col-${status.key}`} index={colIdx} isDragDisabled={!canEditList}>
                {(colDrag) => {
                  const dragHandle = canEditList ? (
                    <span
                      {...colDrag.dragHandleProps}
                      className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0"
                      title="Listeyi sürükleyerek sırala"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                  ) : null;
                  return (
                  <div ref={colDrag.innerRef} {...colDrag.draggableProps} className="flex-shrink-0">
              <Droppable droppableId={status.key} type="ticket">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-xl border transition-colors ${
                      isCollapsed ? "w-14" : "w-64"
                    } ${
                      COLOR_COLUMN_BG[status.color] || COLOR_COLUMN_BG.slate
                    } ${COLOR_HEADER[status.color] || "border-border/50"} ${
                      snapshot.isDraggingOver ? "ring-2 ring-primary/20" : ""
                    }`}
                  >
                    {isCollapsed ? (
                      /* Kapalı kolon görünümü */
                      <div
                        className="flex flex-col items-center gap-2 py-3 px-2 cursor-pointer h-full min-h-[120px]"
                        onClick={() => toggleCollapse(status.key)}
                        title={`${status.name} (${colTickets.length} bilet) - Açmak için tıkla`}
                      >
                        {dragHandle}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <div className={`w-2 h-2 rounded-full ${dotCls}`} />
                        <span
                          className="text-xs font-semibold text-muted-foreground"
                          style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
                        >
                          {status.name}
                        </span>
                        <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${COLOR_BADGE[status.color] || COLOR_BADGE.slate}`}>
                          {colTickets.length}
                        </span>
                        {provided.placeholder}
                      </div>
                    ) : (
                      /* Açık kolon görünümü */
                      <>
                        {/* Liste işlem butonları */}
                        <div className="flex items-center gap-1 px-3 pt-3 pb-1">
                          {dragHandle}
                          {canDeleteList && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            title="Listeyi sil"
                            onClick={() => handleDeleteStatus(status)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-primary hover:bg-primary/10"
                            title="Bu listeye bilet ekle"
                            onClick={() => setNewTicketStatus(status.key)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          {canEditList && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:bg-muted"
                            title="Liste adını düzenle"
                            onClick={() => openEditStatus(status)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          )}
                          {canDeleteList && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:bg-muted"
                            title="Listedeki tüm biletleri arşivle"
                            onClick={() => handleArchiveAll(status)}
                          >
                            <Archive className="w-3 h-3" />
                          </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:bg-muted"
                                title="Liste sıralama"
                              >
                                <ArrowUpDown className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuLabel>Liste Sıralama</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSortByStatus(s => ({ ...s, [status.key]: "name_asc" }))}>
                                Kurum Adına Göre (A-Z)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSortByStatus(s => ({ ...s, [status.key]: "name_desc" }))}>
                                Kurum Adına Göre (Z-A)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSortByStatus(s => ({ ...s, [status.key]: "ticket_asc" }))}>
                                Bilet No (Küçükten Büyüğe)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSortByStatus(s => ({ ...s, [status.key]: "ticket_desc" }))}>
                                Bilet No (Büyükten Küçüğe)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-2 px-3 pb-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${dotCls}`} />
                          <h3
                            className="font-semibold text-sm flex-1 truncate cursor-pointer hover:text-muted-foreground"
                            onClick={() => toggleCollapse(status.key)}
                            title="Listeyi daralt"
                          >
                            {status.name}
                          </h3>
                          <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${COLOR_BADGE[status.color] || COLOR_BADGE.slate}`}>
                            {colTickets.length}
                          </span>
                          <ChevronDown
                            className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground"
                            onClick={() => toggleCollapse(status.key)}
                            title="Listeyi daralt"
                          />
                        </div>

                        <div className="space-y-2 px-3 pb-3 min-h-[100px] max-h-[calc(100vh-320px)] overflow-y-auto">
                          {colTickets.map((ticket, idx) => (
                            <Draggable key={ticket.id} draggableId={ticket.id} index={idx}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => setSelectedTicket(ticket)}
                                  className={`cursor-pointer transition-all hover:shadow-md ${
                                    snapshot.isDragging ? "shadow-lg rotate-1 opacity-90" : ""
                                  }`}
                                >
                                  <CardContent className="p-3 space-y-2">
                                    {ticket.ticket_number && (
                                      <p className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_number}</p>
                                    )}
                                    <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.title}</p>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge className={`${PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.orta} text-[10px] py-0 px-1.5`}>
                                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                                      </Badge>
                                    </div>
                                    {ticket.customer_name && (
                                      <p className="text-[11px] text-muted-foreground truncate">{ticket.customer_name}</p>
                                    )}
                                    {ticket.product_name && (
                                      <p className="text-[11px] text-muted-foreground truncate">
                                        📦 {ticket.product_name}
                                      </p>
                                    )}
                                    {(() => {
                                      const dev = developerName(ticket);
                                      const analyst = analystName(ticket);
                                      const primary = ticket.assigned_to_name;
                                      return (
                                        <>
                                          {primary && primary !== dev && primary !== analyst && (
                                            <p className="text-[11px] text-muted-foreground truncate">
                                              👤 {primary}
                                            </p>
                                          )}
                                          {analyst && (
                                            <p className="text-[11px] text-muted-foreground truncate">
                                              🔎 {analyst}
                                            </p>
                                          )}
                                          {dev && (
                                            <p className="text-[11px] text-muted-foreground truncate">
                                              💻 {dev}
                                            </p>
                                          )}
                                        </>
                                      );
                                    })()}
                                    {ticket.due_date && (
                                      <p className="text-[11px] text-muted-foreground">
                                        📅 {new Date(ticket.due_date).toLocaleDateString("tr-TR")}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {colTickets.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center py-4 text-xs text-muted-foreground/40">Bilet yok</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Droppable>
                  </div>
                  );
                }}
              </Draggable>
            );
          })}
          {colsProvided.placeholder}
        </div>
          )}
        </Droppable>
      </DragDropContext>

      {selectedTicket && (
        <TQTicketDetailDialog
          ticket={selectedTicket}
          employees={employees}
          projects={projects}
          customers={customers}
          open={!!selectedTicket}
          onOpenChange={(v) => !v && setSelectedTicket(null)}
        />
      )}

      {newTicketStatus && (
        <TQTicketFormDialog
          ticket={null}
          projects={projects}
          customers={customers}
          employees={employees}
          defaultBoardId={boardId}
          defaultBoardName={boardName}
          open={!!newTicketStatus}
          onOpenChange={(v) => !v && setNewTicketStatus(null)}
          defaultStatus={newTicketStatus}
        />
      )}

      {/* Liste adı düzenleme */}
      <Dialog open={!!editingStatus} onOpenChange={(v) => !v && setEditingStatus(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Liste Adını Düzenle</DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveEditStatus()}
            placeholder="Liste adı"
            className="rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStatus(null)} className="rounded-xl">İptal</Button>
            <Button onClick={saveEditStatus} disabled={!editName.trim()} className="rounded-xl">Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
