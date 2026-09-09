import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarClock, RefreshCw, Pencil, Layers } from "lucide-react";
import { toast } from "sonner";

const DURUM = {
  N: { l: "Normal", c: "bg-emerald-100 text-emerald-700" },
  H: { l: "Hafta Tatili", c: "bg-slate-100 text-slate-600" },
  T: { l: "Resmi Tatil", c: "bg-blue-100 text-blue-700" },
  RT: { l: "Yarım Tatil", c: "bg-blue-50 text-blue-600" },
  E: { l: "Gelmedi", c: "bg-red-100 text-red-700" },
  R: { l: "Raporlu", c: "bg-purple-100 text-purple-700" },
  I: { l: "İzinli", c: "bg-amber-100 text-amber-700" },
  U: { l: "Ücretsiz", c: "bg-orange-100 text-orange-700" },
  M: { l: "Mazeret", c: "bg-yellow-100 text-yellow-700" },
  CT: { l: "Cumartesi", c: "bg-slate-100 text-slate-600" },
};

export default function IkPuantaj() {
  const qc = useQueryClient();
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [sube, setSube] = useState("");
  const [edit, setEdit] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [topluOpen, setTopluOpen] = useState(false);
  const [toplu, setToplu] = useState({ t1: "", t2: "", durum_kodu: "N", giris_saat: "", cikis_saat: "", aciklama: "", ids: new Set() });

  const { data: cetvel, isFetching } = useQuery({
    queryKey: ["ik_puantaj_cetvel", tarih, sube],
    queryFn: () => flowApi.ik.puantajCetvel({ tarih, ...(sube ? { sube_id: sube } : {}) }),
  });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_full"], queryFn: () => flowApi.entities.Employee.list("full_name", 8000) });
  const aktif = useMemo(() => personeller.filter((p) => p.app_role !== "musteri" && p.is_deleted !== 1 && p.status !== "pasif" && !p.exit_date), [personeller]);

  const rows = cetvel?.rows || [];

  const hesapla = useMutation({
    mutationFn: () => flowApi.ik.puantajHesapla({ tarih, ...(sube ? { sube_id: sube } : {}) }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["ik_puantaj_cetvel"] }); toast.success(`Puantaj hesaplandı — ${r.satir} satır`); },
    onError: (e) => toast.error(String(e?.message || "Hesaplanamadı")),
  });
  const duzelt = useMutation({
    mutationFn: ({ id, data }) => flowApi.ik.puantajDuzelt(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ik_puantaj_cetvel"] }); setEdit(null); toast.success("Kaydedildi"); },
    onError: (e) => toast.error(String(e?.message || "Kaydedilemedi")),
  });
  const topluM = useMutation({
    mutationFn: () => flowApi.ik.puantajToplu({ ...toplu, personel_ids: [...toplu.ids] }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["ik_puantaj_cetvel"] }); setTopluOpen(false); toast.success(`${r.satir} satır işlendi`); },
    onError: (e) => toast.error(String(e?.message || "İşlenemedi")),
  });

  const openEdit = (r) => { setEditForm({ giris_saat: r.giris_saat || "", cikis_saat: r.cikis_saat || "", durum_kodu: r.durum_kodu || "N", duzeltme_notu: "" }); setEdit(r); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="w-6 h-6 text-primary" /> Puantaj Cetveli</h1>
          <p className="text-sm text-muted-foreground mt-1">Kart geçişleri (RFID/QR) + izin + tatil → günlük devam kodu. "Hesapla" motoru yeniden üretir; elle düzeltilmiş satırlara dokunmaz.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTopluOpen(true)}><Layers className="w-4 h-4 mr-1.5" /> Toplu İşlem</Button>
          <Button disabled={hesapla.isPending} onClick={() => hesapla.mutate()}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${hesapla.isPending ? "animate-spin" : ""}`} /> Hesapla
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input type="date" className="w-40" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        <Select value={sube || "hepsi"} onValueChange={(v) => setSube(v === "hepsi" ? "" : v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground ml-auto">{rows.length} personel</p>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {isFetching && !rows.length ? <div className="h-40 flex items-center justify-center text-muted-foreground">Yükleniyor...</div> : rows.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2"><CalendarClock className="w-8 h-8 opacity-40" /><p>Bu tarih için puantaj yok — "Hesapla" ile üretin.</p></div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Personel</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Şube / Vardiya</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Giriş</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Çıkış</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Mesai (dk)</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Durum</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Özet</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const dd = DURUM[r.durum_kodu] || { l: r.durum_kodu, c: "bg-muted" };
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{r.personel_adi}<span className="text-xs text-muted-foreground ml-1">{r.meslek_kodu || ""}</span></td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{r.sube_adi || "—"}{r.vardiya_adi ? ` · ${r.vardiya_adi}` : ""}</td>
                    <td className="px-4 py-2">{r.giris_saat || "—"}</td>
                    <td className="px-4 py-2">{r.cikis_saat || "—"}</td>
                    <td className="px-4 py-2 text-right">{r.mesai_dk || 0}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${dd.c}`}>{r.durum_kodu} · {dd.l}</span></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {r.ozet || "—"}
                      {r.kaynak === "manuel" && <span className="ml-1 text-amber-600">(düzeltildi)</span>}
                    </td>
                    <td className="px-4 py-2 text-right"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Satır düzelt */}
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{edit?.personel_adi} — {edit?.tarih}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">Giriş</Label><Input type="time" value={editForm.giris_saat} onChange={(e) => setEditForm({ ...editForm, giris_saat: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Çıkış</Label><Input type="time" value={editForm.cikis_saat} onChange={(e) => setEditForm({ ...editForm, cikis_saat: e.target.value })} /></div>
            </div>
            <div><Label className="mb-1 block text-xs">Durum Kodu</Label>
              <Select value={editForm.durum_kodu} onValueChange={(v) => setEditForm({ ...editForm, durum_kodu: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DURUM).map(([k, v]) => <SelectItem key={k} value={k}>{k} · {v.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="mb-1 block text-xs">Düzeltme Notu</Label><Textarea rows={2} value={editForm.duzeltme_notu} onChange={(e) => setEditForm({ ...editForm, duzeltme_notu: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setEdit(null)}>İptal</Button>
              <Button disabled={duzelt.isPending} onClick={() => duzelt.mutate({ id: edit.id, data: editForm })}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toplu işlem */}
      <Dialog open={topluOpen} onOpenChange={setTopluOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Toplu Giriş / Çıkış / Durum</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2 max-h-[72vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">Başlangıç</Label><Input type="date" value={toplu.t1} onChange={(e) => setToplu({ ...toplu, t1: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Bitiş</Label><Input type="date" value={toplu.t2} onChange={(e) => setToplu({ ...toplu, t2: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Giriş</Label><Input type="time" value={toplu.giris_saat} onChange={(e) => setToplu({ ...toplu, giris_saat: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Çıkış</Label><Input type="time" value={toplu.cikis_saat} onChange={(e) => setToplu({ ...toplu, cikis_saat: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Durum</Label>
                <Select value={toplu.durum_kodu} onValueChange={(v) => setToplu({ ...toplu, durum_kodu: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(DURUM).map(([k, v]) => <SelectItem key={k} value={k}>{k} · {v.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="mb-1 block text-xs">Açıklama</Label><Input value={toplu.aciklama} onChange={(e) => setToplu({ ...toplu, aciklama: e.target.value })} /></div>
            </div>
            <div className="border rounded-lg max-h-48 overflow-y-auto p-2 text-sm">
              {aktif.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-0.5">
                  <input type="checkbox" checked={toplu.ids.has(p.id)} onChange={() => setToplu((t) => { const n = new Set(t.ids); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return { ...t, ids: n }; })} />
                  {p.full_name}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setTopluOpen(false)}>İptal</Button>
              <Button disabled={topluM.isPending || !toplu.t1 || !toplu.t2 || toplu.ids.size === 0} onClick={() => topluM.mutate()}>
                Uygula ({toplu.ids.size})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
