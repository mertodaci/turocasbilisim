import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const COLOR_OPTIONS = [
  { value: "blue", label: "Mavi", bg: "bg-blue-500" },
  { value: "green", label: "Yeşil", bg: "bg-green-500" },
  { value: "orange", label: "Turuncu", bg: "bg-orange-500" },
  { value: "red", label: "Kırmızı", bg: "bg-red-500" },
  { value: "purple", label: "Mor", bg: "bg-purple-500" },
  { value: "yellow", label: "Sarı", bg: "bg-yellow-500" },
];

const empty = { title: "", content: "", color: "blue", is_active: 1, sort_order: 0, target_roles: "all" };

export default function Announcements() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => flowApi.entities.Announcement.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.Announcement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); setDialog({ open: false, item: null }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Announcement.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); setDialog({ open: false, item: null }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.Announcement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  });

  const openCreate = () => { setForm(empty); setDialog({ open: true, item: null }); };
  const openEdit = (item) => { setForm({ title: item.title || "", content: item.content || "", color: item.color || "blue", is_active: item.is_active ?? 1, sort_order: item.sort_order || 0, target_roles: item.target_roles || "all" }); setDialog({ open: true, item }); };

  const handleSubmit = () => {
    if (!form.content) return;
    if (dialog.item) {
      updateMutation.mutate({ id: dialog.item.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> Duyurular
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Anasayfada görüntülenecek duyuruları yönetin</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Yeni Duyuru
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Megaphone className="w-8 h-8 opacity-40" />
            <p>Henüz duyuru eklenmemiş.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Duyuru</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Renk</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Sıra</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {announcements.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((a, i) => {
                const colorCfg = COLOR_OPTIONS.find(c => c.value === a.color) || COLOR_OPTIONS[0];
                return (
                  <tr key={a.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.title || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-md">{a.content}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colorCfg.bg}`} />
                        <span className="text-muted-foreground">{colorCfg.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={a.is_active === 1 || a.is_active === true}
                        onCheckedChange={(v) => updateMutation.mutate({ id: a.id, data: { is_active: v ? 1 : 0 } })}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.sort_order || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Silinsin mi?")) deleteMutation.mutate(a.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog.open} onOpenChange={(v) => !v && setDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.item ? "Duyuru Düzenle" : "Yeni Duyuru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block">Başlık</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Duyuru başlığı" />
            </div>
            <div>
              <Label className="mb-1.5 block">İçerik *</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Duyuru metni..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Renk</Label>
                <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${c.bg}`} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Sıra</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Hedef Roller</Label>
              <select
                multiple
                value={form.target_roles === "all" ? ["all"] : (form.target_roles || "all").split(",")}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                  setForm({ ...form, target_roles: selected.includes("all") ? "all" : selected.join(",") });
                }}
                className="w-full border border-input rounded-lg p-2 text-sm bg-background"
                size={6}
              >
                <option value="all">Tümü</option>
                <option value="admin">Admin</option>
                <option value="yonetici">Yönetici</option>
                <option value="ik">IK</option>
                <option value="kullanici">Kullanıcı</option>
                <option value="stajer">Stajer</option>
                <option value="musteri">Müşteri</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Ctrl ile birden fazla seçebilirsiniz</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active === 1} onCheckedChange={(v) => setForm({ ...form, is_active: v ? 1 : 0 })} />
              <Label>Aktif</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog({ open: false, item: null })}>İptal</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
