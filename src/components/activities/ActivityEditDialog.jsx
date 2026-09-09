import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activityTypes, outcomeLabels, calcDurationStr } from "@/lib/activityHelpers";
import { Building2, Home, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const locations = [
  { key: "ofis", label: "Ofis", icon: Building2, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-300" },
  { key: "evden", label: "Evden", icon: Home, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-300" },
  { key: "saha", label: "Saha", icon: MapPin, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-300" },
];

export default function ActivityEditDialog({ activity, employees, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (activity) setForm({ ...activity });
  }, [activity]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === form.employee_id);
    onSubmit({ ...form, employee_name: emp?.full_name || form.employee_name, duration_minutes: Number(form.duration_minutes) });
  };

  return (
    <Dialog open={!!activity} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aktiviteyi Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Çalışan</Label>
            <Select value={form.employee_id} onValueChange={(v) => set("employee_id", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Aktivite Tipi</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(activityTypes).map(([key, val]) => {
                const Icon = val.icon;
                const isSelected = form.activity_type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("activity_type", key)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs font-medium",
                      isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{val.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Lokasyon</Label>
            <div className="grid grid-cols-3 gap-2">
              {locations.map(({ key, label, icon: Icon, color, bg, border }) => {
                const isSelected = form.location === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("location", key)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs font-medium",
                      isSelected ? `${border} ${bg} ${color}` : "border-border/50 hover:border-border text-muted-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tarih</Label>
              <Input type="date" value={form.date || ""} onChange={(e) => set("date", e.target.value)} className="rounded-xl" required />
            </div>
            <div className="space-y-1.5">
              <Label>Süre (dk)</Label>
              <Input type="number" min="1" value={form.duration_minutes || ""} onChange={(e) => set("duration_minutes", e.target.value)} className="rounded-xl" required />
              <p className="text-[11px] text-muted-foreground">Başlangıç ve bitiş saatinden otomatik hesaplanır.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Başlangıç</Label>
              <Input
                type="time"
                value={form.start_time || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const d = calcDurationStr(v, form.end_time);
                  setForm((f) => ({ ...f, start_time: v, ...(d ? { duration_minutes: d } : {}) }));
                }}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bitiş</Label>
              <Input
                type="time"
                value={form.end_time || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const d = calcDurationStr(form.start_time, v);
                  setForm((f) => ({ ...f, end_time: v, ...(d ? { duration_minutes: d } : {}) }));
                }}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Müşteri</Label>
              <Input value={form.customer_name || ""} onChange={(e) => set("customer_name", e.target.value)} placeholder="Müşteri adı" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Sonuç</Label>
              <Select value={form.outcome || ""} onValueChange={(v) => set("outcome", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(outcomeLabels).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Notlar..." className="rounded-xl h-20" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Not Türü</Label>
                <Select value={form.note_type || ""} onValueChange={(v) => set("note_type", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="genel">Genel</SelectItem>
                    <SelectItem value="satis_ekibi">Satış Ekibi</SelectItem>
                    <SelectItem value="teknik_ekip">Teknik Ekip</SelectItem>
                    <SelectItem value="yonetim">Yönetim</SelectItem>
                    <SelectItem value="gizli">Gizli</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Sonraki Görüşme Tarihi</Label>
                <Input type="date" value={form.next_visit_date || ""} onChange={(e) => set("next_visit_date", e.target.value)} className="rounded-xl" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Kaydediliyor..." : "Güncelle"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}