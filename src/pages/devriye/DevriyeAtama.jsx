import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function DevriyeAtama() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ guvenlik_user_id: "", lokasyon_id: "", vardiya_id: "", tarih: new Date().toISOString().slice(0, 10) });

  const { data: users = [] } = useQuery({ queryKey: ["users-list"], queryFn: () => flowApi.auth.users() });
  const guvenlikler = users.filter((u) => u.role === "guvenlik" && u.status !== "pasif");

  const { data: lokasyonlar = [] } = useQuery({ queryKey: ["devriye_lokasyonlar"], queryFn: () => flowApi.entities.DevriyeLokasyon.list("ad", 500) });
  const { data: vardiyalar = [] } = useQuery({ queryKey: ["devriye_vardiyalar"], queryFn: () => flowApi.entities.DevriyeVardiya.list("ad", 500) });
  const { data: atamalar = [], isLoading } = useQuery({ queryKey: ["devriye_atamalar"], queryFn: () => flowApi.entities.DevriyeAtama.list("-tarih", 2000) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["devriye_atamalar"] });
  const createM = useMutation({
    mutationFn: (d) => flowApi.entities.DevriyeAtama.create(d),
    onSuccess: () => { invalidate(); toast.success("Atama yapıldı"); },
    onError: (e) => toast.error("Atanamadı: " + (e?.message || "hata")),
  });
  const deleteM = useMutation({
    mutationFn: (id) => flowApi.entities.DevriyeAtama.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
  });

  const submit = () => {
    if (!form.guvenlik_user_id || !form.lokasyon_id || !form.vardiya_id || !form.tarih) { toast.error("Tüm alanları doldurun"); return; }
    const g = guvenlikler.find((u) => u.id === form.guvenlik_user_id);
    const l = lokasyonlar.find((x) => x.id === form.lokasyon_id);
    const v = vardiyalar.find((x) => x.id === form.vardiya_id);
    createM.mutate({ ...form, guvenlik_adi: g?.full_name || "", lokasyon_adi: l?.ad || "", vardiya_adi: v?.ad || "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="w-6 h-6 text-primary" /> Vardiya & Devriye Planı</h1>
        <p className="text-sm text-muted-foreground mt-1">Güvenlik personelini lokasyon + vardiya + tarihe ata.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <Label className="mb-1.5 block">Güvenlik</Label>
          <Select value={form.guvenlik_user_id} onValueChange={(v) => setForm({ ...form, guvenlik_user_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
            <SelectContent>{guvenlikler.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block">Lokasyon</Label>
          <Select value={form.lokasyon_id} onValueChange={(v) => setForm({ ...form, lokasyon_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
            <SelectContent>{lokasyonlar.map((l) => <SelectItem key={l.id} value={l.id}>{l.ad}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block">Vardiya</Label>
          <Select value={form.vardiya_id} onValueChange={(v) => setForm({ ...form, vardiya_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
            <SelectContent>{vardiyalar.map((v) => <SelectItem key={v.id} value={v.id}>{v.ad}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block">Tarih</Label>
          <Input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} />
        </div>
        <Button onClick={submit} disabled={createM.isPending}><Plus className="w-4 h-4 mr-2" /> Ata</Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? <div className="h-40 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> :
          atamalar.length === 0 ? <div className="h-40 flex items-center justify-center text-muted-foreground">Atama yok.</div> : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Güvenlik</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Lokasyon</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vardiya</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {atamalar.map((a, i) => (
                <tr key={a.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3">{(a.tarih || "").slice(0, 10)}</td>
                  <td className="px-4 py-3 font-medium">{a.guvenlik_adi}</td>
                  <td className="px-4 py-3">{a.lokasyon_adi}</td>
                  <td className="px-4 py-3">{a.vardiya_adi}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Atama silinsin mi?")) deleteM.mutate(a.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
