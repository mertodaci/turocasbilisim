import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Wallet, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { paraSade as nf } from "@/lib/ikFormat";
const now = new Date();
const KAYNAK_MASRAF = { sadece_not: "Sadece Bordro Notu", maas: "Maaştan", yol: "Yoldan", yemek: "Yemekten", ticket: "Ticket'tan", sahsi: "Şahsi Hesaptan" };

export default function IkIcBorcMasraf({ mode = "borc" }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const [yil, setYil] = useState(now.getFullYear());
  const [ay, setAy] = useState(now.getMonth() + 1);

  const { data: borclar = [] } = useQuery({ queryKey: ["ik_ic_borclar"], queryFn: () => flowApi.entities.IkIcBorc.list("-created_date", 3000), enabled: mode === "borc" });
  const { data: masraflar = [] } = useQuery({ queryKey: ["ik_personel_masraf"], queryFn: () => flowApi.entities.IkPersonelMasraf.list("-created_date", 3000), enabled: mode === "masraf" });
  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_full"], queryFn: () => flowApi.entities.Employee.list("full_name", 8000) });
  const aktif = useMemo(() => personeller.filter((p) => p.app_role !== "musteri" && p.is_deleted !== 1 && p.status !== "pasif" && !p.exit_date), [personeller]);

  const invalidate = () => qc.invalidateQueries({ queryKey: [mode === "borc" ? "ik_ic_borclar" : "ik_personel_masraf"] });
  const ekleBorc = useMutation({
    mutationFn: (d) => flowApi.entities.IkIcBorc.create(d),
    onSuccess: () => { invalidate(); setDialog(false); toast.success("Borç kaydı eklendi"); }, onError: (e) => toast.error(String(e?.message || "hata")),
  });
  const ekleMasraf = useMutation({
    mutationFn: (d) => flowApi.entities.IkPersonelMasraf.create(d),
    onSuccess: () => { invalidate(); setDialog(false); toast.success("Masraf eklendi"); }, onError: (e) => toast.error(String(e?.message || "hata")),
  });
  const silBorc = useMutation({ mutationFn: (id) => flowApi.entities.IkIcBorc.delete(id), onSuccess: () => { invalidate(); toast.success("Silindi"); } });
  const silMasraf = useMutation({ mutationFn: (id) => flowApi.entities.IkPersonelMasraf.delete(id), onSuccess: () => { invalidate(); toast.success("Silindi"); } });

  const open = () => {
    setForm(mode === "borc"
      ? { personel_id: "", acilis_tutar: "", aylik_taksit: "", varsayilan_kaynak: "maas", tarih: new Date().toISOString().slice(0, 10), aciklama: "" }
      : { personel_id: "", tutar: "", donem_yil: yil, donem_ay: ay, kesinti_kaynagi: "sadece_not", aciklama: "" });
    setDialog(true);
  };
  const submit = () => {
    const emp = aktif.find((p) => p.id === form.personel_id);
    if (!form.personel_id) { toast.error("Personel seçin"); return; }
    if (mode === "borc") {
      if (!(Number(form.acilis_tutar) > 0)) { toast.error("Tutar gerekli"); return; }
      ekleBorc.mutate({ ...form, personel_adi: emp?.full_name, acilis_tutar: Number(form.acilis_tutar), aylik_taksit: Number(form.aylik_taksit) || 0, kalan_bakiye: Number(form.acilis_tutar), durum: "acik" });
    } else {
      if (!(Number(form.tutar) > 0)) { toast.error("Tutar gerekli"); return; }
      ekleMasraf.mutate({ ...form, personel_adi: emp?.full_name, tutar: Number(form.tutar), donem_yil: Number(form.donem_yil), donem_ay: Number(form.donem_ay) });
    }
  };

  const list = mode === "borc" ? borclar.filter((b) => b.is_deleted !== 1) : masraflar.filter((m) => m.is_deleted !== 1 && (!yil || m.donem_yil === yil) && (!ay || m.donem_ay === ay));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-6 h-6 text-primary" /> {mode === "borc" ? "İçeriye Borçlar" : "Bordro Masraf Kesintisi"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{mode === "borc"
            ? "Personelin şirkete borcu; bordrodan seçilen kaynaktan taksitle tahsil edilir."
            : "Personelin şirket kanalıyla (maaş/yol/yemek/ticket) harcadığı tutar; bordroda genel net'ten kesilir. Bu, çalışana geri ödenen \"Harcamalar\" (masraf raporu) modülünden farklıdır. \"Sadece Bordro Notu\" hak edişten düşmez, yalnız pusulada görünür."}</p>
        </div>
        <div className="flex gap-2">
          {mode === "masraf" && (
            <>
              <Input type="number" className="w-20" value={yil} onChange={(e) => setYil(Number(e.target.value))} />
              <Select value={String(ay)} onValueChange={(v) => setAy(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</SelectContent>
              </Select>
            </>
          )}
          <Button onClick={open}><Plus className="w-4 h-4 mr-1.5" /> Yeni Kayıt</Button>
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Personel</th>
              {mode === "borc"
                ? <><th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Açılış / Kalan</th><th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Kaynak</th><th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Durum</th></>
                : <><th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Dönem</th><th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Tutar</th><th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Kaynak</th></>}
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Açıklama</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{r.personel_adi}</td>
                {mode === "borc"
                  ? <><td className="px-4 py-2 text-right">{nf(r.acilis_tutar)} / <b>{nf(r.kalan_bakiye)}</b> ₺{Number(r.aylik_taksit) > 0 ? <span className="text-xs text-muted-foreground block">taksit {nf(r.aylik_taksit)} ₺/ay</span> : null}</td><td className="px-4 py-2 text-muted-foreground">{r.varsayilan_kaynak === "maas" ? "Maaş" : "Yol/Yemek/Ticket"}</td><td className="px-4 py-2">{r.durum === "kapali" ? "Kapalı" : "Açık"}</td></>
                  : <><td className="px-4 py-2 text-muted-foreground">{r.donem_ay}/{r.donem_yil}</td><td className="px-4 py-2 text-right font-medium">{nf(r.tutar)} ₺</td><td className="px-4 py-2 text-muted-foreground">{KAYNAK_MASRAF[r.kesinti_kaynagi]}</td></>}
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.aciklama || "—"}</td>
                <td className="px-4 py-2 text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => (mode === "borc" ? silBorc : silMasraf).mutate(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{mode === "borc" ? "İç Borç Kaydı" : "Masraf Kesintisi Kaydı"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="mb-1.5 block">Personel</Label>
              <SearchableSelect value={form.personel_id} onChange={(v) => setForm({ ...form, personel_id: v })} options={aktif.map((p) => ({ value: p.id, label: p.full_name }))} placeholder="Personel seçin" />
            </div>
            {mode === "borc" ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="mb-1.5 block">Açılış Tutarı (₺)</Label><Input type="number" value={form.acilis_tutar} onChange={(e) => setForm({ ...form, acilis_tutar: e.target.value })} /></div>
                  <div><Label className="mb-1.5 block">Aylık Taksit (₺)</Label><Input type="number" value={form.aylik_taksit} onChange={(e) => setForm({ ...form, aylik_taksit: e.target.value })} placeholder="boş = tek seferde" /></div>
                  <div><Label className="mb-1.5 block">Tarih</Label><Input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} /></div>
                </div>
                <p className="text-xs text-muted-foreground">Aylık taksit girilirse her ay "Kesinti Merkezi &rarr; Dönemi Üret" ile o kadar tahsil edilir, kalan bakiye düşer. Boş bırakılırsa ilk dönemde tamamı kesilir.</p>
                <div><Label className="mb-1.5 block">Varsayılan Kesinti Kaynağı</Label>
                  <Select value={form.varsayilan_kaynak} onValueChange={(v) => setForm({ ...form, varsayilan_kaynak: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="maas">Maaş</SelectItem><SelectItem value="yol_yemek_ticket">Yol / Yemek / Ticket</SelectItem></SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="mb-1.5 block">Tutar (₺)</Label><Input type="number" value={form.tutar} onChange={(e) => setForm({ ...form, tutar: e.target.value })} /></div>
                  <div><Label className="mb-1.5 block">Yıl</Label><Input type="number" value={form.donem_yil} onChange={(e) => setForm({ ...form, donem_yil: e.target.value })} /></div>
                  <div><Label className="mb-1.5 block">Ay</Label><Input type="number" value={form.donem_ay} onChange={(e) => setForm({ ...form, donem_ay: e.target.value })} /></div>
                </div>
                <div><Label className="mb-1.5 block">Kesinti Kaynağı</Label>
                  <Select value={form.kesinti_kaynagi} onValueChange={(v) => setForm({ ...form, kesinti_kaynagi: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(KAYNAK_MASRAF).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div><Label className="mb-1.5 block">Açıklama</Label><Input value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog(false)}>İptal</Button>
              <Button onClick={submit} disabled={ekleBorc.isPending || ekleMasraf.isPending}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
