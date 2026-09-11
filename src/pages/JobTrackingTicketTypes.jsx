import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Tag, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

// Eskiden "İş Takibi Tanımlar" ekranının bir bölümüydü (bkz. eski
// JobTrackingSettings.jsx, silindi) — Bilet Durumları'ndan ayrı, kendi
// ekranına taşındı. İşlevsellik birebir aynı.
export default function JobTrackingTicketTypes() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Tag className="w-6 h-6" /> Bilet Tipleri
        </h1>
        <p className="text-sm text-muted-foreground mt-1">İş Takibi biletlerinde kullanılan tip tanımlarını yönetin.</p>
      </div>

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
    </div>
  );
}
