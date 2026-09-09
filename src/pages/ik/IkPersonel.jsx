import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmployeeFormDialog from "@/components/employees/EmployeeFormDialog";
import { Users, Pencil, LogOut, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const nf = (v) => (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "Tutarsız" = kritik özlük/ücret alanı eksik (bordro hesaplanamaz)
const tutarsizMi = (p) => !p.tc || !p.sube_id || !p.hire_date || !(Number(p.aylik_ucret) > 0);

export default function IkPersonel() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("aktif");
  const [q, setQ] = useState("");
  const [subeFilter, setSubeFilter] = useState("");
  const [editing, setEditing] = useState(null);   // EmployeeFormDialog'a geçilen personel
  const [showForm, setShowForm] = useState(false);
  const [cikisFor, setCikisFor] = useState(null);
  const [cikisForm, setCikisForm] = useState({ exit_date: "", exit_reason: "", exit_notes: "" });

  const { data: personeller = [], isLoading } = useQuery({
    queryKey: ["ik_personel_full"],
    queryFn: () => flowApi.entities.Employee.list("full_name", 8000),
  });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const { data: bolumler = [] } = useQuery({ queryKey: ["ik_bolumler_min"], queryFn: () => flowApi.entities.IkBolum.list("ad", 3000) });

  const subeAdi = (id) => subeler.find((s) => s.id === id)?.ad || "";
  const bolumAdi = (id) => bolumler.find((b) => b.id === id)?.ad || "";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ik_personel_full"] });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Employee.update(id, data),
    onSuccess: async (_r, v) => { try { await flowApi.ik.ucretSenkron(v.id); } catch { /* opsiyonel */ } invalidate(); queryClient.invalidateQueries({ queryKey: ["employees"] }); setShowForm(false); setEditing(null); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const cikisMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.ik.cikisVer(id, data),
    onSuccess: () => { invalidate(); setCikisFor(null); toast.success("Çıkış işlendi"); },
    onError: (e) => toast.error(String(e?.message || "İşlenemedi")),
  });

  const filtered = useMemo(() => personeller.filter((p) => {
    if (p.app_role === "musteri" || p.is_deleted === 1) return false;
    const cikisli = p.status === "pasif" || !!p.exit_date;
    if (tab === "aktif" && cikisli) return false;
    if (tab === "cikis" && !cikisli) return false;
    if (tab === "tutarsiz" && !tutarsizMi(p)) return false;
    if (subeFilter && p.sube_id !== subeFilter) return false;
    if (q && !`${p.full_name} ${p.tc} ${p.meslek_kodu} ${p.position}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [personeller, tab, subeFilter, q]);

  const openEdit = (p) => { setEditing(p); setShowForm(true); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Personel Listesi (Bordro Hazırlık)</h1>
          <p className="text-sm text-muted-foreground mt-1">Özlük + ücret bilgisi <b>Çalışanlar</b> ekranındaki kartta tutulur (buradan da aynı form açılır). Bu ekran bordro açısından şube filtresi, eksik/tutarsız kayıt tespiti ve çıkış işlemleri için kullanılır.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {[["aktif", "Aktif"], ["cikis", "Çıkışı Yapılanlar"], ["tutarsiz", "Tutarsız Kayıtlar"]].map(([k, l]) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>{l}</Button>
        ))}
        <Select value={subeFilter || "hepsi"} onValueChange={(v) => setSubeFilter(v === "hepsi" ? "" : v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hepsi">Tüm Şubeler</SelectItem>
            {subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="max-w-xs ml-auto" placeholder="Ad / TC / meslek ara" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"><Users className="w-8 h-8 opacity-40" /><p>Kayıt yok.</p></div>
        ) : (
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ad Soyad</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Şube / Bölüm</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Meslek / Görev</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İşe Giriş</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Aylık Ücret</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium flex items-center gap-1.5">
                      {p.full_name}
                      {tutarsizMi(p) && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title="Eksik özlük/ücret bilgisi" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.tc || "TC yok"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{subeAdi(p.sube_id) || "—"}{p.bolum_id ? ` · ${bolumAdi(p.bolum_id)}` : ""}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.meslek_kodu || p.position || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.hire_date || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{Number(p.aylik_ucret) > 0 ? `${nf(p.aylik_ucret)} ₺` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Kartı Aç / Düzenle" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      {!(p.status === "pasif" || p.exit_date) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Çıkış Ver"
                          onClick={() => { setCikisForm({ exit_date: new Date().toISOString().slice(0, 10), exit_reason: "", exit_notes: "" }); setCikisFor(p); }}>
                          <LogOut className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EmployeeFormDialog
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditing(null); }}
        employee={editing}
        isLoading={updateMutation.isPending}
        onSubmit={(data) => { if (editing) updateMutation.mutate({ id: editing.id, data }); }}
      />

      {/* Çıkış Ver */}
      <Dialog open={!!cikisFor} onOpenChange={(v) => !v && setCikisFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Çıkış Ver — {cikisFor?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">Personel pasife alınır; puantaj/bordro dönemlerinde çıkış tarihinden sonrası hesaplanmaz.</p>
            <div><Label className="mb-1.5 block">Çıkış Tarihi *</Label><Input type="date" value={cikisForm.exit_date} onChange={(e) => setCikisForm({ ...cikisForm, exit_date: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Çıkış Nedeni</Label><Input value={cikisForm.exit_reason} onChange={(e) => setCikisForm({ ...cikisForm, exit_reason: e.target.value })} placeholder="istifa / fesih / …" /></div>
            <div><Label className="mb-1.5 block">Not</Label><Textarea rows={2} value={cikisForm.exit_notes} onChange={(e) => setCikisForm({ ...cikisForm, exit_notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setCikisFor(null)}>İptal</Button>
              <Button variant="destructive" disabled={cikisMutation.isPending || !cikisForm.exit_date}
                onClick={() => cikisMutation.mutate({ id: cikisFor.id, data: cikisForm })}>
                {cikisMutation.isPending ? "İşleniyor..." : "Çıkış Ver"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
