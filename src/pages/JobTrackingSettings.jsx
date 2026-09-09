import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Settings, CheckCircle2, Tag, Pencil, Check, X, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  { value: "slate", label: "Gri", dot: "bg-slate-500" },
  { value: "purple", label: "Mor", dot: "bg-purple-500" },
  { value: "blue", label: "Mavi", dot: "bg-blue-500" },
  { value: "orange", label: "Turuncu", dot: "bg-orange-500" },
  { value: "yellow", label: "Sari", dot: "bg-yellow-500" },
  { value: "green", label: "Yesil", dot: "bg-green-500" },
  { value: "red", label: "Kirmizi", dot: "bg-red-500" },
  { value: "pink", label: "Pembe", dot: "bg-pink-500" },
  { value: "teal", label: "Teal", dot: "bg-teal-500" },
];

const COLOR_BADGE = {
  slate: "bg-slate-100 text-slate-700",
  purple: "bg-purple-100 text-purple-700",
  blue: "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  pink: "bg-pink-100 text-pink-700",
  teal: "bg-teal-100 text-teal-700",
};

const DEFAULT_STATUSES = [
  { name: "Musteri Talep", key: "musteri_talep", color: "slate", sort_order: 1, is_active: 1, is_final: 0 },
  { name: "Cevap Bekleniyor", key: "cevap_bekleniyor", color: "yellow", sort_order: 2, is_active: 1, is_final: 0 },
  { name: "Analiz Gelistiriliyor", key: "analiz_gelistiriliyor", color: "blue", sort_order: 3, is_active: 1, is_final: 0 },
  { name: "Analiz Onaylandi", key: "analiz_onaylandi", color: "teal", sort_order: 4, is_active: 1, is_final: 0 },
  { name: "Acil Isler", key: "acil_isler", color: "red", sort_order: 5, is_active: 1, is_final: 0 },
  { name: "Yazilim Onay Bekliyor", key: "yazilim_onay_bekliyor", color: "orange", sort_order: 6, is_active: 1, is_final: 0 },
  { name: "Yapilacak", key: "yapilacak", color: "slate", sort_order: 7, is_active: 1, is_final: 0 },
  { name: "Merge Bekleniyor", key: "merge_bekleniyor", color: "purple", sort_order: 8, is_active: 1, is_final: 0 },
  { name: "Yazilim Gelistiriliyor", key: "yazilim_gelistiriliyor", color: "blue", sort_order: 9, is_active: 1, is_final: 0 },
  { name: "Musteri Testten Donen", key: "musteri_testten_donen", color: "yellow", sort_order: 10, is_active: 1, is_final: 0 },
  { name: "Testten Donen", key: "testten_donen", color: "orange", sort_order: 11, is_active: 1, is_final: 0 },
  { name: "Guncelleme Bekleniyor", key: "guncelleme_bekleniyor", color: "pink", sort_order: 12, is_active: 1, is_final: 0 },
  { name: "Musteri Onay", key: "musteri_onay", color: "teal", sort_order: 13, is_active: 1, is_final: 0 },
  { name: "Sonuclanan", key: "sonuclanan", color: "green", sort_order: 14, is_active: 1, is_final: 1 },
  { name: "Iptal", key: "iptal", color: "red", sort_order: 15, is_active: 1, is_final: 1 },
];

const STATUS_GROUPS = [
  { value: "talep", label: "Talep" },
  { value: "analiz", label: "Analiz" },
  { value: "gelistirme", label: "Geliştirme" },
  { value: "test_onay", label: "Test / Onay" },
  { value: "tamamlanan", label: "Tamamlanan" },
  { value: "diger", label: "Diğer" },
];

function BoardBadge({ status, boards, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const ids = Array.isArray(status.board_ids) ? status.board_ids : [];
  const label = ids.length === 0 ? "Tuüm Panolar" : `${ids.length} Pano`;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`px-2 py-0.5 rounded-md text-[11px] border transition-colors ${ids.length === 0 ? "bg-background text-muted-foreground border-border/50" : "bg-indigo-600 text-white border-indigo-600"}`}
      >
        {label}
      </button>
      {open && (
        <div className="absolute z-50 top-7 left-0 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[180px] space-y-1">
          {boards.map(bd => {
            const sel = ids.includes(bd.id);
            const next = sel ? ids.filter(x => x !== bd.id) : [...ids, bd.id];
            return (
              <button
                type="button"
                key={bd.id}
                onClick={() => onToggle(next)}
                className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 transition-colors ${sel ? "bg-indigo-600 text-white" : "hover:bg-muted text-foreground"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sel ? "bg-white" : "bg-muted-foreground"}`} />
                {bd.name}
              </button>
            );
          })}
          {boards.length === 0 && <p className="text-xs text-muted-foreground px-2">Pano yok</p>}
        </div>
      )}
    </div>
  );
}

function AddStatusForm({ onAdd, isPending, boards = [] }) {
  const [form, setForm] = useState({ name: "", key: "", color: "slate", is_final: false, board_ids: [], group_key: "diger" });

  const handleNameChange = (name) => {
    const key = name.toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    setForm({ ...form, name, key });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.key.trim()) { toast.error("Durum adi ve anahtar zorunludur!"); return; }
    onAdd(form);
    setForm({ name: "", key: "", color: "slate", is_final: false, board_ids: [], group_key: "diger" });
  };

  return (
    <form onSubmit={handleSubmit} className="border border-dashed border-border rounded-xl p-4 bg-muted/20">
      <p className="text-sm font-medium mb-3">Yeni Durum Ekle</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="space-y-1">
          <Label className="text-xs">Durum Adi</Label>
          <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Inceleme" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sistem Anahtari</Label>
          <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="inceleme" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
          <SelectTrigger className="w-36">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${COLOR_OPTIONS.find(c => c.value === form.color)?.dot}`} />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map(c => (
              <SelectItem key={c.value} value={c.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${c.dot}`} />
                  {c.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={form.group_key} onValueChange={(v) => setForm({ ...form, group_key: v })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Grup" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_GROUPS.map(g => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Panolar (seçili değilse tümünde görünür)</Label>
          <div className="flex flex-wrap gap-2">
            {boards.map(b => {
              const sel = form.board_ids.includes(b.id);
              return (
                <button type="button" key={b.id}
                  onClick={() => setForm({ ...form, board_ids: sel ? form.board_ids.filter(x => x !== b.id) : [...form.board_ids, b.id] })}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${sel ? "bg-indigo-600 text-white border-indigo-600" : "bg-background text-muted-foreground border-border/50 hover:bg-muted"}`}>
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_final} onCheckedChange={(v) => setForm({ ...form, is_final: v })} />
          <Label className="text-xs text-muted-foreground">Son Durum</Label>
        </div>
        <Button type="submit" size="sm" disabled={isPending} className="ml-auto">
          <Plus className="w-3.5 h-3.5 mr-1" /> Ekle
        </Button>
      </div>
    </form>
  );
}

function TicketTypeManager() {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState("");

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["definitions-ticket-types"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "bilet_tipi" }, "sort_order", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.Definition.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["definitions-ticket-types"] }); toast.success("Tip eklendi"); setNewLabel(""); setNewValue(""); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Definition.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["definitions-ticket-types"] }); setEditingId(null); toast.success("Tip guncellendi"); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => flowApi.entities.Definition.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["definitions-ticket-types"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.Definition.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["definitions-ticket-types"] }); toast.success("Tip silindi"); },
  });

  const handleLabelChange = (label) => {
    const value = label.toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    setNewLabel(label);
    setNewValue(value);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newValue.trim()) { toast.error("Tip adi ve deger zorunludur!"); return; }
    createMutation.mutate({ category: "bilet_tipi", label: newLabel, value: newValue, is_active: true, sort_order: types.length + 1 });
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-base flex items-center gap-2"><Tag className="w-4 h-4" /> Bilet Tipleri</h2>
        <span className="text-sm text-muted-foreground">{types.filter(t => t.is_active).length} aktif</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      ) : types.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">Henuz bilet tipi eklenmemis.</div>
      ) : (
        <div className="space-y-2">
          {types.map((t) => (
            <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border ${t.is_active ? "bg-background border-border/40" : "bg-muted/30 border-border/20 opacity-60"}`}>
              {editingId === t.id ? (
                <>
                  <Input
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    className="h-7 text-sm flex-1"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
                    onClick={() => updateMutation.mutate({ id: t.id, data: { label: editingLabel } })}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => setEditingId(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{t.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">{t.value}</span>
                  <Switch checked={!!t.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: t.id, is_active: v })} />
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { setEditingId(t.id); setEditingLabel(t.label); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => { if (confirm("Bu tipi silmek istediginize emin misiniz?")) deleteMutation.mutate(t.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="border border-dashed border-border rounded-xl p-4 bg-muted/20">
        <p className="text-sm font-medium mb-3">Yeni Tip Ekle</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <Label className="text-xs">Tip Adi</Label>
            <Input value={newLabel} onChange={(e) => handleLabelChange(e.target.value)} placeholder="Yazilim" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sistem Degeri</Label>
            <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="yazilim" />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={createMutation.isPending}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Ekle
        </Button>
      </form>
    </div>
  );
}

export default function JobTrackingSettings() {
  const queryClient = useQueryClient();
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingStatusName, setEditingStatusName] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState("");

  // NOT: TQ Tanimlar TUM durumlari (is_active=0 dahil) ceker -> kendi anahtari
  // ["tq-statuses-all"]. Diger tum ekranlar ["tq-statuses"] altinda yalniz aktif
  // durumlari cekiyor; ayni anahtari paylassaydik pano vb. pasif durumlari da
  // gosterirdi (React Query onbellek cakismasi).
  const refreshStatuses = () => {
    queryClient.invalidateQueries({ queryKey: ["tq-statuses-all"] });
    queryClient.invalidateQueries({ queryKey: ["tq-statuses"] });
  };

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ["tq-statuses-all"],
    queryFn: () => flowApi.entities.JTTicketStatus.list("sort_order", 500),
  });
  const { data: boards = [] } = useQuery({
    queryKey: ["tq-kanban-boards"],
    queryFn: () => flowApi.entities.JTKanbanBoard.filter({ is_active: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.JTTicketStatus.create(data),
    onSuccess: () => { refreshStatuses(); toast.success("Durum eklendi"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.JTTicketStatus.update(id, data),
    onSuccess: () => { refreshStatuses(); setEditingStatusId(null); },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, data }) => Promise.all(ids.map((id) => flowApi.entities.JTTicketStatus.update(id, data))),
    onSuccess: () => { refreshStatuses(); setEditingStatusId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all((Array.isArray(ids) ? ids : [ids]).map((id) => flowApi.entities.JTTicketStatus.delete(id))),
    onSuccess: () => { refreshStatuses(); toast.success("Durum silindi"); },
  });

  // "Tüm Panolar (özet)" modunda aynı key birden çok satırda; o modda değişiklik
  // TÜM satırlara uygulanmalı (yoksa yalnız bir panonun satırı değişir).
  const statusIdsForAction = (status) =>
    selectedBoardId ? [status.id] : statuses.filter((s) => s.key === status.key).map((s) => s.id);
  const applyStatus = (status, data) => {
    const ids = statusIdsForAction(status);
    if (ids.length <= 1) updateMutation.mutate({ id: status.id, data });
    else bulkUpdateMutation.mutate({ ids, data });
  };

  const handleSeedDefaults = async () => {
    for (const s of DEFAULT_STATUSES) {
      await flowApi.entities.JTTicketStatus.create(s);
    }
    refreshStatuses();
    toast.success("Varsayilan durumlar yuklendi");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6" /> İş Takibi Tanimlar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Bilet durumlari ve sistem tanimlari</p>
        </div>
        {statuses.length === 0 && (
          <Button variant="outline" onClick={handleSeedDefaults}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Varsayilanlari Yukle
          </Button>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-base">Bilet Durumlari</h2>
          <div className="flex items-center gap-3">
            <Select value={selectedBoardId || "all"} onValueChange={(v) => setSelectedBoardId(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Pano seç" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Panolar (özet)</SelectItem>
                {boards.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {selectedBoardId
                ? statuses.filter(s => s.is_active).length
                : new Set(statuses.filter(s => s.is_active).map(s => s.key)).size} aktif
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : statuses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Henuz durum tanimlanmamis. "Varsayilanlari Yukle" butonuna tiklayin.
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              let list = statuses;
              if (selectedBoardId) {
                list = statuses.filter(st => {
                  const ids = Array.isArray(st.board_ids) ? st.board_ids : [];
                  return ids.length === 0 || ids.includes(selectedBoardId);
                });
              } else {
                const seen = new Set();
                list = statuses.filter(st => { if (seen.has(st.key)) return false; seen.add(st.key); return true; });
              }
              return list;
            })().map((status) => (
              <div
                key={status.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  status.is_active ? "bg-background border-border/40" : "bg-muted/30 border-border/20 opacity-60"
                }`}
              >
                <div className="flex flex-col shrink-0 -my-1">
                  <button
                    type="button"
                    disabled={statuses.findIndex(s => s.id === status.id) === 0}
                    title="Yukarı taşı"
                    onClick={() => {
                      const idx = statuses.findIndex(s => s.id === status.id);
                      if (idx <= 0) return;
                      const prev = statuses[idx - 1];
                      updateMutation.mutate({ id: status.id, data: { sort_order: prev.sort_order } });
                      updateMutation.mutate({ id: prev.id, data: { sort_order: status.sort_order } });
                    }}
                    className="text-muted-foreground/50 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={statuses.findIndex(s => s.id === status.id) === statuses.length - 1}
                    title="Aşağı taşı"
                    onClick={() => {
                      const idx = statuses.findIndex(s => s.id === status.id);
                      if (idx >= statuses.length - 1) return;
                      const next = statuses[idx + 1];
                      updateMutation.mutate({ id: status.id, data: { sort_order: next.sort_order } });
                      updateMutation.mutate({ id: next.id, data: { sort_order: status.sort_order } });
                    }}
                    className="text-muted-foreground/50 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_OPTIONS.find(c => c.value === status.color)?.dot || "bg-slate-400"}`} />

                {editingStatusId === status.id ? (
                  <>
                    <Input
                      value={editingStatusName}
                      onChange={(e) => setEditingStatusName(e.target.value)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
                      onClick={() => applyStatus(status, { name: editingStatusName })}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setEditingStatusId(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge className={`${COLOR_BADGE[status.color] || "bg-slate-100 text-slate-700"} text-xs shrink-0`}>
                      {status.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono flex-1">{status.key}</span>
                      <BoardBadge
                        status={status}
                        boards={boards}
                        onToggle={(next) => updateMutation.mutate({ id: status.id, data: { board_ids: next } })}
                      />
                    {status.is_final == 1 && (
                      <Badge variant="outline" className="text-xs shrink-0">Son Durum</Badge>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <Switch
                        checked={!!status.is_active}
                        onCheckedChange={(v) => applyStatus(status, { is_active: v ? 1 : 0 })}
                      />
                      <Select
                        value={status.group_key || "diger"}
                        onValueChange={(v) => applyStatus(status, { group_key: v })}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_GROUPS.map(g => (
                            <SelectItem key={g.value} value={g.value} className="text-xs">{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={status.color}
                        onValueChange={(v) => applyStatus(status, { color: v })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${COLOR_OPTIONS.find(c => c.value === status.color)?.dot}`} />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {COLOR_OPTIONS.map(c => (
                            <SelectItem key={c.value} value={c.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${c.dot}`} />
                                {c.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditingStatusId(status.id); setEditingStatusName(status.name); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Bu durumu silmek istediginize emin misiniz?")) deleteMutation.mutate(statusIdsForAction(status)); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <AddStatusForm boards={boards} onAdd={(data) => createMutation.mutate({ ...data, sort_order: statuses.length + 1 })} isPending={createMutation.isPending} />
      </div>

      <TicketTypeManager />
    </div>
  );
}
