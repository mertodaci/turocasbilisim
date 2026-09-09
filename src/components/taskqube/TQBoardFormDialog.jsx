import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  { value: "blue", label: "Mavi", cls: "bg-blue-500" },
  { value: "purple", label: "Mor", cls: "bg-purple-500" },
  { value: "green", label: "Yeşil", cls: "bg-green-500" },
  { value: "orange", label: "Turuncu", cls: "bg-orange-500" },
  { value: "red", label: "Kırmızı", cls: "bg-red-500" },
  { value: "slate", label: "Gri", cls: "bg-slate-500" },
];

const EMOJI_OPTIONS = ["📋", "💻", "🔧", "🎯", "📦", "🚀", "🛠️", "📊", "🔍", "⚡"];

export default function TQBoardFormDialog({ board, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: board?.name || "",
    description: board?.description || "",
    color: board?.color || "blue",
    icon: board?.icon || "📋",
    is_active: board ? (board.is_active === 1 || board.is_active === true ? 1 : 0) : 1,
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.TQKanbanBoard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-boards"] });
      toast.success("Pano oluşturuldu");
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.TQKanbanBoard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-boards"] });
      toast.success("Pano güncellendi");
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (board) {
      updateMutation.mutate({ id: board.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{board ? "Pano Düzenle" : "Yeni Pano Oluştur"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Pano Adı</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="örn: Yazılım Ekibi, Destek Ekibi"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Bu panonun amacı..."
              className="min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Renk</Label>
              <Select value={formData.color} onValueChange={(v) => setFormData({ ...formData, color: v })}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${COLOR_OPTIONS.find(c => c.value === formData.color)?.cls}`} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${c.cls}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>İkon</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={`w-8 h-8 rounded-md text-base flex items-center justify-center transition-colors ${
                      formData.icon === emoji
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Durum</Label>
            <Select value={String(formData.is_active)} onValueChange={(v) => setFormData({ ...formData, is_active: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Aktif</SelectItem>
                <SelectItem value="0">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}