import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSignature, Plus, Paperclip } from "lucide-react";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

const KEP_LABEL = { gonderilmedi: "KEP: Gönderilmedi", beklemede: "KEP: Beklemede", gonderildi: "KEP: Gönderildi", teslim_edildi: "KEP: Teslim Edildi", hata: "KEP: Hata" };
const EIMZA_LABEL = { imzalanmadi: "İmza: Yok", beklemede: "İmza: Beklemede", imzalandi: "İmza: İmzalandı" };

const emptyForm = {
  direction: "giden", subject: "", document_type: "", customer_id: "", customer_name: "",
  date: new Date().toISOString().slice(0, 10), content: "", recipient_names: "", attachments: [],
};

export default function EbysEvraklar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("gelen");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data: evraklar = [], isLoading } = useQuery({
    queryKey: ["correspondences"],
    queryFn: () => flowApi.entities.Correspondence.list("-created_date", 500),
  });
  const { data: evrakTurleri = [] } = useQuery({
    queryKey: ["definitions", "ebys_evrak_turu"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "ebys_evrak_turu" }),
  });
  const { data: settingsList = [] } = useQuery({ queryKey: ["ebys_ayarlari"], queryFn: () => flowApi.entities.EbysAyarlar.list("id", 5) });
  const settings = settingsList[0];

  const filtered = evraklar.filter((e) => (tab === "gelen" ? e.direction === "gelen" : e.direction !== "gelen"));

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, direction: tab === "gelen" ? "gelen" : "giden" }); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...emptyForm, ...row, attachments: row.attachments || [] });
    setOpen(true);
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: formData });
    if (!res.ok) throw new Error("Dosya yüklenemedi");
    const data = await res.json();
    return data.url;
  };

  const handleAttach = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map(async (f) => ({ name: f.name, url: `${BASE_URL}${await uploadFile(f)}` })));
      setForm((prev) => ({ ...prev, attachments: [...(prev.attachments || []), ...uploaded] }));
    } catch (err) {
      toast.error("Ek yüklenemedi: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? flowApi.entities.Correspondence.update(editing.id, data)
      : flowApi.entities.Correspondence.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["correspondences"] });
      toast.success(editing ? "Evrak güncellendi" : "Evrak oluşturuldu");
      setOpen(false);
    },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><FileSignature className="w-5 h-5" /> Gelen / Giden Evrak</h1>
          <p className="text-sm text-muted-foreground mt-1">Evrak/yazışma yönetimi — KEP ve e-imza altyapısı hazırlık aşamasında.</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Yeni Evrak</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="gelen">Gelen</TabsTrigger>
          <TabsTrigger value="giden">Giden</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-card border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">Evrak No</th>
              <th className="text-left px-4 py-2">Konu</th>
              <th className="text-left px-4 py-2">Tür</th>
              <th className="text-left px-4 py-2">Tarih</th>
              <th className="text-left px-4 py-2">Durum</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Kayıt yok</td></tr>}
            {filtered.map((row) => (
              <tr key={row.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => openEdit(row)}>
                <td className="px-4 py-2 font-mono text-xs">{row.document_number || "—"}</td>
                <td className="px-4 py-2">{row.subject}</td>
                <td className="px-4 py-2">{row.document_type || "—"}</td>
                <td className="px-4 py-2">{row.date}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted">{KEP_LABEL[row.kep_durum] || "KEP: —"}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted">{EIMZA_LABEL[row.eimza_durum] || "İmza: —"}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Evrakı Düzenle" : "Yeni Evrak"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs">Yön</Label>
                <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="giden">Giden</SelectItem>
                    <SelectItem value="gelen">Gelen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Evrak Türü</Label>
                <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>
                    {evrakTurleri.map((t) => <SelectItem key={t.id} value={t.value || t.name}>{t.value || t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Konu *</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs">Tarih</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block text-xs">İlgili Müşteri (ops.)</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Alıcılar</Label>
              <Input value={form.recipient_names || ""} onChange={(e) => setForm({ ...form, recipient_names: e.target.value })} placeholder="Ad Soyad, Ad Soyad…" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">İçerik</Label>
              <Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Ekler</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(form.attachments || []).map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded-full bg-muted flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> {a.name}
                  </a>
                ))}
              </div>
              <Input type="file" multiple onChange={handleAttach} disabled={uploading} />
            </div>

            {!settings?.kep_aktif && !settings?.eimza_aktif && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
                KEP/e-imza bağlantısı henüz tamamlanmadı — Ayarlar'dan KEP kullanıcı adı/e-imza sağlayıcı bilgisini girip aktif edin.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button
                onClick={() => saveMutation.mutate({ ...form, author_id: user?.id, author_name: user?.full_name })}
                disabled={saveMutation.isPending || !form.subject}
              >
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
