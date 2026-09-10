import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Timer, Plus, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ymd } from "@/lib/dateUtils";
import { useAuth } from "@/lib/AuthContext";

import { paraSade as nf } from "@/lib/ikFormat";
// ymd(): toISOString().slice(0,10) UTC donusumu yuzunden Turkiye (+3) saat
// diliminde ay basini bir gun geriye kaydiriyordu.
const ay0 = () => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), 1)); };
const bugun = () => ymd(new Date());

export default function IkMesai() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [t1, setT1] = useState(ay0());
  const [t2, setT2] = useState(bugun());
  const [sel, setSel] = useState(new Set());
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ personel_id: "", tarih: bugun(), tur: "fazla", katsayi: 1.5, rt_tipi: "tam", saat: 0, dakika: 0, aciklama: "" });

  const { data: kayitlar = [] } = useQuery({
    queryKey: ["ik_mesai_kayitlari"],
    queryFn: () => flowApi.entities.IkMesai.list("-tarih", 3000),
  });
  const { data: adaylarR } = useQuery({
    queryKey: ["ik_mesai_adaylar", t1, t2],
    queryFn: () => flowApi.ik.mesaiAdaylar({ t1, t2 }),
  });
  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_full"], queryFn: () => flowApi.entities.Employee.list("full_name", 8000) });
  const aktif = useMemo(() => personeller.filter((p) => p.app_role !== "musteri" && p.is_deleted !== 1 && p.status !== "pasif" && !p.exit_date), [personeller]);
  // Kendi kendini onaylama engeli: giris yapan kullanicinin kendi personel kaydi
  // bulunursa, o personele ait mesai satirlari toplu onay icin secilemez.
  const myEmpId = useMemo(() => personeller.find((p) => p.email && user?.email && p.email.toLowerCase() === user.email.toLowerCase())?.id, [personeller, user]);

  const donem = kayitlar.filter((k) => k.is_deleted !== 1 && k.tarih >= t1 && k.tarih <= t2);
  const adaylar = adaylarR?.rows || [];

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["ik_mesai_kayitlari"] }); qc.invalidateQueries({ queryKey: ["ik_mesai_adaylar"] }); };
  const ekle = useMutation({
    mutationFn: (body) => flowApi.ik.mesaiEkle(body),
    onSuccess: () => { invalidate(); setDialog(false); toast.success("Mesai kaydı eklendi"); },
    onError: (e) => toast.error(String(e?.message || "Eklenemedi")),
  });
  const topluOnay = useMutation({
    mutationFn: (islem) => flowApi.ik.mesaiTopluOnay({ ids: [...sel], islem }),
    onSuccess: (r) => { invalidate(); setSel(new Set()); toast.success(`${r.guncellenen} kayıt → ${r.durum}`); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });

  const submitForm = () => {
    const sure = (Number(form.saat) || 0) * 60 + (Number(form.dakika) || 0);
    if (!form.personel_id || sure <= 0) { toast.error("Personel ve süre gerekli"); return; }
    ekle.mutate({ personel_id: form.personel_id, tarih: form.tarih, tur: form.tur, katsayi: Number(form.katsayi), rt_tipi: form.rt_tipi, sure_dk: sure, aciklama: form.aciklama });
  };
  const adayEkle = (a) => ekle.mutate({ personel_id: a.personel_id, tarih: a.tarih, tur: "fazla", katsayi: 1.5, sure_dk: a.fazla_mesai_dk, kaynak: "puantaj", aciklama: "Puantajdan (vardiya dışı çalışma)" });

  const toplamOnayli = donem.filter((k) => k.onay === "onayli").reduce((a, k) => a + (k.tutar || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Timer className="w-6 h-6 text-primary" /> Mesai Onayları</h1>
          <p className="text-sm text-muted-foreground mt-1">Fazla mesai 1×1,5; resmî tatil tam gün 1×1, yarım 1×0,5. Hesap: saatlik ücret × süre × katsayı. Onaylanmayan kayıt bordroya geçmez.</p>
        </div>
        <Button onClick={() => setDialog(true)}><Plus className="w-4 h-4 mr-1.5" /> Manuel Kayıt</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div><label className="text-xs text-muted-foreground block mb-1">Başlangıç</label><Input type="date" className="w-40" value={t1} onChange={(e) => setT1(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground block mb-1">Bitiş</label><Input type="date" className="w-40" value={t2} onChange={(e) => setT2(e.target.value)} /></div>
        <div className="ml-auto text-sm text-muted-foreground">Onaylı toplam: <b className="text-foreground">{nf(toplamOnayli)} ₺</b></div>
      </div>

      {adaylar.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2"><Sparkles className="w-4 h-4" /> Puantajdan {adaylar.length} fazla mesai adayı</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {adaylar.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-card/60 rounded px-3 py-1.5">
                <span>{a.personel_adi} · {a.tarih} · {a.fazla_mesai_dk} dk (~{nf((Number(a.saatlik_ucret) || 0) * (a.fazla_mesai_dk / 60) * 1.5)} ₺)</span>
                <Button size="sm" variant="outline" onClick={() => adayEkle(a)}>Kayıt Oluştur</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sel.size > 0 && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => topluOnay.mutate("onayla")}><Check className="w-3.5 h-3.5 mr-1" /> Seçilenleri Onayla ({sel.size})</Button>
          <Button size="sm" variant="outline" onClick={() => topluOnay.mutate("kaldir")}>Onayı Kaldır</Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => topluOnay.mutate("reddet")}><X className="w-3.5 h-3.5 mr-1" /> Reddet</Button>
        </div>
      )}

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="px-4 py-2.5 w-10"></th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tarih</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Personel</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tür</th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Süre / Katsayı</th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Tutar</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Onay</th>
            </tr>
          </thead>
          <tbody>
            {donem.map((k) => {
              const kendisi = myEmpId && k.personel_id === myEmpId && user?.role !== "admin";
              return (
              <tr key={k.id} className={`border-b last:border-0 ${sel.has(k.id) ? "bg-primary/5" : ""}`}>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={sel.has(k.id)} disabled={kendisi} title={kendisi ? "Kendi mesai kaydınızı onaylayamazsınız" : undefined}
                    onChange={() => setSel((s) => { const n = new Set(s); n.has(k.id) ? n.delete(k.id) : n.add(k.id); return n; })} />
                </td>
                <td className="px-4 py-2 text-muted-foreground">{k.tarih}</td>
                <td className="px-4 py-2 font-medium">{k.personel_adi}{kendisi && <span className="ml-1.5 text-[10px] text-muted-foreground">(siz)</span>}</td>
                <td className="px-4 py-2">{k.tur === "tatil" ? `Tatil (${k.rt_tipi})` : "Fazla Mesai"}</td>
                <td className="px-4 py-2 text-right">{k.sure_dk} dk · {k.katsayi}x</td>
                <td className="px-4 py-2 text-right font-medium">{nf(k.tutar)} ₺</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${k.onay === "onayli" ? "bg-emerald-100 text-emerald-700" : k.onay === "red" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"}`}>
                    {k.onay === "onayli" ? "Onaylı" : k.onay === "red" ? "Reddedildi" : "Taslak"}
                  </span>
                </td>
              </tr>
              );
            })}
            {!donem.length && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Bu aralıkta mesai kaydı yok.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Manuel Mesai Kaydı</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="mb-1.5 block">Personel</Label>
              <SearchableSelect value={form.personel_id} onChange={(v) => setForm({ ...form, personel_id: v })}
                options={aktif.map((p) => ({ value: p.id, label: `${p.full_name}${p.saatlik_ucret ? ` · ${nf(p.saatlik_ucret)} ₺/s` : ""}` }))} placeholder="Personel seçin" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Tarih</Label><Input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Tür</Label>
                <Select value={form.tur} onValueChange={(v) => setForm({ ...form, tur: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fazla">Fazla Mesai</SelectItem><SelectItem value="tatil">Tatil Mesai</SelectItem></SelectContent>
                </Select>
              </div>
              {form.tur === "fazla" ? (
                <div><Label className="mb-1.5 block">Katsayı</Label>
                  <Select value={String(form.katsayi)} onValueChange={(v) => setForm({ ...form, katsayi: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["0.5", "1", "1.5", "2", "3"].map((k) => <SelectItem key={k} value={k}>{k}x</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div><Label className="mb-1.5 block">Tatil Tipi</Label>
                  <Select value={form.rt_tipi} onValueChange={(v) => setForm({ ...form, rt_tipi: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="tam">Tam Gün (1x)</SelectItem><SelectItem value="yarim">Yarım Gün (0.5x)</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              <div><Label className="mb-1.5 block">Saat</Label><Input type="number" value={form.saat} onChange={(e) => setForm({ ...form, saat: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Dakika</Label><Input type="number" value={form.dakika} onChange={(e) => setForm({ ...form, dakika: e.target.value })} /></div>
            </div>
            <div><Label className="mb-1.5 block">Açıklama</Label><Input value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog(false)}>İptal</Button>
              <Button onClick={submitForm} disabled={ekle.isPending}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
