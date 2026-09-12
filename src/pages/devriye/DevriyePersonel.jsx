import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Radar, ToggleLeft, ToggleRight, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const empty = { full_name: "", email: "", password: "" };

export default function DevriyePersonel() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(empty);
  const [pwDialog, setPwDialog] = useState({ open: false, user: null, value: "" });

  const { data: users = [], isLoading } = useQuery({ queryKey: ["users-list"], queryFn: () => flowApi.auth.users() });
  const guvenlikler = users.filter((u) => u.role === "guvenlik");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users-list"] });
  const createM = useMutation({
    mutationFn: (d) => flowApi.auth.createUser({ ...d, role: "guvenlik" }),
    onSuccess: () => { invalidate(); setDialog(false); setForm(empty); toast.success("Güvenlik personeli eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateM = useMutation({
    mutationFn: ({ id, data }) => flowApi.auth.updateUser(id, data),
    onSuccess: () => { invalidate(); toast.success("Güncellendi"); },
  });
  const deleteM = useMutation({
    mutationFn: (id) => flowApi.auth.deleteUser(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
  });

  const submit = () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) { toast.error("Tüm alanları doldurun"); return; }
    createM.mutate(form);
  };
  const submitPw = () => {
    if (!pwDialog.value.trim()) { toast.error("Şifre girin"); return; }
    updateM.mutate({ id: pwDialog.user.id, data: { password: pwDialog.value } });
    setPwDialog({ open: false, user: null, value: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Radar className="w-6 h-6 text-primary" /> Güvenlik Personeli</h1>
          <p className="text-sm text-muted-foreground mt-1">Sahada QR devriye okutacak güvenlik kullanıcıları.</p>
        </div>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-2" /> Yeni Personel</Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? <div className="h-40 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> :
          guvenlikler.length === 0 ? <div className="h-40 flex items-center justify-center text-muted-foreground">Güvenlik personeli yok.</div> : (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ad Soyad</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Kullanıcı Adı</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {guvenlikler.map((u, i) => (
                <tr key={u.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => updateM.mutate({ id: u.id, data: { status: u.status === "pasif" ? "aktif" : "pasif" } })}
                      className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium", u.status === "pasif" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                      {u.status === "pasif" ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />} {u.status === "pasif" ? "Pasif" : "Aktif"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPwDialog({ open: true, user: u, value: "" })}><KeyRound className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Personel silinsin mi?")) deleteM.mutate(u.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Yeni Güvenlik Personeli</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="mb-1.5 block">Ad Soyad *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Kullanıcı Adı (e-posta) *</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Şifre *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog(false)}>İptal</Button>
              <Button onClick={submit} disabled={createM.isPending}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pwDialog.open} onOpenChange={(v) => !v && setPwDialog({ open: false, user: null, value: "" })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Yeni Şifre — {pwDialog.user?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input type="password" placeholder="Yeni şifre" value={pwDialog.value} onChange={(e) => setPwDialog({ ...pwDialog, value: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setPwDialog({ open: false, user: null, value: "" })}>İptal</Button>
              <Button onClick={submitPw}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
