import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const categoryLabels = {
  surec_iyilestirme: "Süreç İyileştirme",
  musteri_deneyimi: "Müşteri Deneyimi",
  urun_gelistirme: "Ürün Geliştirme",
  tasarruf: "Tasarruf",
  motivasyon: "Motivasyon",
  diger: "Diğer",
};

const empty = { title: "", description: "", category: "diger" };

export default function IdeaFormDialog({ open, onClose, idea, onSubmit, isLoading }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    setForm(idea ? { title: idea.title || "", description: idea.description || "", category: idea.category || "diger" } : empty);
  }, [idea, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{idea ? "Fikri Düzenle" : "Yeni Fikir"}</DialogTitle>
          <DialogDescription>Fikrinizi başlık, açıklama ve kategori ile paylaşın.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Başlık *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Fikrinizi kısaca özetleyin"
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Açıklama *</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Fikrinizi detaylıca anlatın..."
              className="rounded-xl h-28"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>İptal</Button>
            <Button type="submit" className="rounded-xl" disabled={isLoading}>
              {isLoading ? "Kaydediliyor..." : idea ? "Güncelle" : "Gönder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}