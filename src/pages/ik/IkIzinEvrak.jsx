import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { FileCheck2, Plus, Trash2, Paperclip, AlertTriangle, Upload, Camera } from "lucide-react";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
const DURUM = [["eksik", "Eksik"], ["fiziki", "Fiziki Verildi"], ["dijital", "Dijital Yüklendi"]];
const durumLabel = (d) => (DURUM.find(([k]) => k === d) || [, d])[1];

export default function IkIzinEvrak() {
  const qc = useQueryClient();
  const [leaveId, setLeaveId] = useState("");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ durum: "eksik", dosya_url: "", aciklama: "" });
  const [busy, setBusy] = useState(false);
  const [sadeceEvraksiz, setSadeceEvraksiz] = useState(true);

  const { data: leaves = [] } = useQuery({ queryKey: ["leave_requests_min"], queryFn: () => flowApi.entities.LeaveRequest.list("-start_date", 2000) });
  const { data: evraklar = [] } = useQuery({ queryKey: ["ik_izin_evrak_all"], queryFn: () => flowApi.entities.IkIzinEvrak.list("-created_date", 5000) });

  const evrakByLeave = useMemo(() => {
    const m = {};
    for (const e of evraklar) (m[e.leave_id] = m[e.leave_id] || []).push(e);
    return m;
  }, [evraklar]);
  const selLeave = leaves.find((l) => l.id === leaveId);
  const selEvrak = evrakByLeave[leaveId] || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ik_izin_evrak_all"] });
  const createM = useMutation({
    mutationFn: (d) => flowApi.entities.IkIzinEvrak.create(d),
    onSuccess: () => { invalidate(); setDialog(false); setForm({ durum: "eksik", dosya_url: "", aciklama: "" }); toast.success("Evrak eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateM = useMutation({ mutationFn: ({ id, data }) => flowApi.entities.IkIzinEvrak.update(id, data), onSuccess: invalidate });
  const deleteM = useMutation({ mutationFn: (id) => flowApi.entities.IkIzinEvrak.delete(id), onSuccess: () => { invalidate(); toast.success("Silindi"); } });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      setForm((f) => ({ ...f, dosya_url: data.url, durum: f.durum === "eksik" ? "dijital" : f.durum }));
    } catch { toast.error("Yüklenemedi"); }
    finally { setBusy(false); }
  };
  const submit = () => {
    if (!leaveId) { toast.error("İzin kaydı seçin"); return; }
    if (!form.dosya_url) { toast.error("Taranmış evrak dosyası ekleyin — kanunen ıslak imzasız izinler kullanılmamış sayılır"); return; }
    createM.mutate({
      leave_id: leaveId, personel_id: selLeave?.employee_id || "", personel_adi: selLeave?.employee_full_name || "",
      ...form,
    });
  };

  // "Eksik" artik durum alanina degil, ilgili izin kaydinin hic evragi olup
  // olmamasina bakar -- her yeni evrak artik mutlaka gercek bir dosyayla
  // birlikte olusturuldugu icin (bkz. submit), "adi girilmis ama dosyasiz"
  // yer tutucu durumu artik olusmuyor.
  const evraksizIzinler = useMemo(() => leaves.filter((l) => !(evrakByLeave[l.id]?.length)), [leaves, evrakByLeave]);
  const eksikSayisi = evraksizIzinler.length;
  const dropdownIzinler = sadeceEvraksiz ? evraksizIzinler : leaves;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileCheck2 className="w-6 h-6 text-primary" /> İzin & Rapor Evrak Takibi</h1>
        <p className="text-sm text-muted-foreground mt-1">İzin/rapor kayıtlarına bağlı taranmış (ıslak imzalı) evrak takibi. Evrağı eklenen izin, evraksız listesinden otomatik çıkar.</p>
      </div>

      {eksikSayisi > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {eksikSayisi} iznin evrağı eksik.
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-end">
        <div className="min-w-[320px]">
          <Label className="mb-1.5 block text-xs">İzin / Rapor Kaydı</Label>
          <Select value={leaveId} onValueChange={setLeaveId}>
            <SelectTrigger><SelectValue placeholder="İzin kaydı seç" /></SelectTrigger>
            <SelectContent>
              {dropdownIzinler.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.employee_full_name} · {l.leave_type} · {l.start_date ? format(new Date(l.start_date), "dd/MM/yyyy") : "—"}
                  {!(evrakByLeave[l.id]?.length) ? "  ⚠" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button disabled={!leaveId} onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-1.5" /> Evrak Ekle</Button>
        <div className="flex items-center gap-2 pb-2">
          <Switch id="sadece-evraksiz" checked={sadeceEvraksiz} onCheckedChange={setSadeceEvraksiz} />
          <Label htmlFor="sadece-evraksiz" className="text-xs font-normal text-muted-foreground cursor-pointer">Sadece evraksız kayıtları göster</Label>
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {!leaveId ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">İzin kaydı seçin.</div> :
          selEvrak.length === 0 ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Bu izne bağlı evrak yok.</div> : (
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-muted/40 border-b"><tr>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Durum</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Dosya</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Açıklama</th>
              <th className="px-4 py-2.5"></th>
            </tr></thead>
            <tbody>
              {selEvrak.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    <Select value={r.durum} onValueChange={(v) => updateM.mutate({ id: r.id, data: { durum: v } })}>
                      <SelectTrigger className={`h-8 w-40 ${r.durum === "eksik" ? "text-amber-600" : ""}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{DURUM.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5">{r.dosya_url ? <a href={r.dosya_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-xs"><Paperclip className="w-3.5 h-3.5" /> Aç</a> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.aciklama || "—"}</td>
                  <td className="px-4 py-2.5 text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Evrak silinsin mi?")) deleteM.mutate(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Evrak Ekle</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1.5 block">Taranmış Evrak *</Label>
              <p className="text-xs text-muted-foreground mb-2">Kanunen ıslak imzalı evrak saklanmak zorunda — sadece taranmış/fotoğraflanmış dosyayı ekleyin.</p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1" disabled={busy}>
                  <label className="cursor-pointer justify-center">
                    <Upload className="w-4 h-4 mr-1.5" /> Dosya Seç
                    <input type="file" className="hidden" onChange={onFile} disabled={busy} />
                  </label>
                </Button>
                <Button asChild variant="outline" className="flex-1" disabled={busy}>
                  <label className="cursor-pointer justify-center">
                    <Camera className="w-4 h-4 mr-1.5" /> Kamera Aç
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} disabled={busy} />
                  </label>
                </Button>
              </div>
              {busy && <p className="text-xs text-muted-foreground mt-1">Yükleniyor...</p>}
              {form.dosya_url && !busy && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Dosya eklendi</p>
              )}
            </div>
            <div><Label className="mb-1.5 block">Açıklama (opsiyonel)</Label><Input value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog(false)}>İptal</Button>
              <Button onClick={submit} disabled={createM.isPending || !form.dosya_url}>Ekle</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
