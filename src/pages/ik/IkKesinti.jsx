import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Scissors, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const nf = (v) => (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TUR_L = { avans: "Avans", icra: "İcra", bes: "BES", diger: "Diğer", gun_kes: "Gün Kesintisi" };

export default function IkKesinti() {
  const qc = useQueryClient();
  // "now" module-scope sabit degil, component ilk render edildiginde hesaplanir --
  // eskiden module ilk yuklendiginde bir kere hesaplanip donuyordu, uzun surebilen
  // bir SPA oturumunda ay/yil degisse de varsayilan hep eski ayda kalirdi.
  const [yil, setYil] = useState(() => new Date().getFullYear());
  const [ay, setAy] = useState(() => new Date().getMonth() + 1);
  const [tab, setTab] = useState("ozet");
  const [dialog, setDialog] = useState(null); // 'avans' | 'diger' | 'plan'
  const [form, setForm] = useState({});

  const { data: donem } = useQuery({ queryKey: ["ik_kesinti_donem", yil, ay], queryFn: () => flowApi.ik.kesintiDonem({ donem_yil: yil, donem_ay: ay }) });
  const { data: planlar = [] } = useQuery({ queryKey: ["ik_kesinti_planlari"], queryFn: () => flowApi.entities.IkKesintiPlan.list("-created_date", 2000) });
  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_full"], queryFn: () => flowApi.entities.Employee.list("full_name", 8000) });
  const aktif = useMemo(() => personeller.filter((p) => p.app_role !== "musteri" && p.is_deleted !== 1 && p.status !== "pasif" && !p.exit_date), [personeller]);

  const rows = donem?.rows || [];
  const ozet = donem?.ozet || {};
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["ik_kesinti_donem"] }); qc.invalidateQueries({ queryKey: ["ik_kesinti_planlari"] }); };

  const donemUret = useMutation({
    mutationFn: () => flowApi.ik.kesintiDonemUret({ donem_yil: yil, donem_ay: ay }),
    onSuccess: (r) => { invalidate(); toast.success(`${r.plan_taksiti} plan taksiti + ${r.gun_kesintisi} gün kesintisi üretildi`); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });
  const elleEkle = useMutation({
    mutationFn: (data) => flowApi.entities.IkKesinti.create(data),
    onSuccess: () => { invalidate(); setDialog(null); toast.success("Kesinti eklendi"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });
  const planEkle = useMutation({
    mutationFn: (data) => flowApi.ik.kesintiPlan(data),
    onSuccess: () => { invalidate(); setDialog(null); toast.success("Plan oluşturuldu"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });
  const sil = useMutation({
    mutationFn: (id) => flowApi.entities.IkKesinti.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
    onError: (e) => toast.error(String(e?.message || "hata")),
  });

  const openElle = (tur) => { setForm({ tur, personel_id: "", tutar: "", aciklama: "", donem_yil: yil, donem_ay: ay, kaynak: "elle", tarih: new Date().toISOString().slice(0, 10) }); setDialog(tur); };
  const openPlan = () => { setForm({ tur: "icra", personel_id: "", toplam_tutar: "", taksit_sayisi: 1, baslangic_yil: yil, baslangic_ay: ay, aciklama: "" }); setDialog("plan"); };

  const submitElle = () => {
    if (!form.personel_id || !(Number(form.tutar) > 0)) { toast.error("Personel ve tutar gerekli"); return; }
    const emp = aktif.find((p) => p.id === form.personel_id);
    elleEkle.mutate({ ...form, personel_adi: emp?.full_name, tutar: Number(form.tutar) });
  };
  const submitPlan = () => {
    if (!form.personel_id || !(Number(form.toplam_tutar) > 0)) { toast.error("Personel ve toplam tutar gerekli"); return; }
    planEkle.mutate({ ...form, toplam_tutar: Number(form.toplam_tutar), taksit_sayisi: Number(form.taksit_sayisi) || 1 });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Scissors className="w-6 h-6 text-primary" /> Kesinti Merkezi</h1>
          <p className="text-sm text-muted-foreground mt-1">Avans, İcra (aylık maaşın 1/4'ü), BES (toplam ÷ ay) ve açıklamalı diğer kesintiler + puantaj kaynaklı gün kesintisi → bordroya çekilir.</p>
        </div>
        <div className="flex gap-2">
          <Input type="number" className="w-20" value={yil} onChange={(e) => setYil(Number(e.target.value))} />
          <Select value={String(ay)} onValueChange={(v) => setAy(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][i]}</SelectItem>)}</SelectContent>
          </Select>
          <Button disabled={donemUret.isPending} onClick={() => donemUret.mutate()}><RefreshCw className={`w-4 h-4 mr-1.5 ${donemUret.isPending ? "animate-spin" : ""}`} /> Dönemi Üret</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl">
        {["avans", "icra", "bes", "diger", "gun_kes"].map((t) => (
          <div key={t} className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">{TUR_L[t]}</p><p className="text-lg font-bold">{nf(ozet[t] || 0)} ₺</p></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => openElle("avans")}><Plus className="w-3.5 h-3.5 mr-1" /> Avans</Button>
        <Button size="sm" variant="outline" onClick={() => openElle("diger")}><Plus className="w-3.5 h-3.5 mr-1" /> Açıklamalı Kesinti</Button>
        <Button size="sm" variant="outline" onClick={openPlan}><Plus className="w-3.5 h-3.5 mr-1" /> İcra / BES Planı</Button>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant={tab === "ozet" ? "default" : "ghost"} onClick={() => setTab("ozet")}>Dönem Kayıtları</Button>
          <Button size="sm" variant={tab === "plan" ? "default" : "ghost"} onClick={() => setTab("plan")}>Planlar</Button>
        </div>
      </div>

      {tab === "ozet" ? (
        <div className="bg-card border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Personel</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tür</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Tutar</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Açıklama</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Kaynak</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{r.personel_adi}</td>
                  <td className="px-4 py-2">{TUR_L[r.tur] || r.tur}</td>
                  <td className="px-4 py-2 text-right font-medium">{nf(r.tutar)} ₺</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.aciklama || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.kaynak}</td>
                  <td className="px-4 py-2 text-right">{r.kaynak === "elle" && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => sil.mutate(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Kayıt yok — "Dönemi Üret" ile plan+puantaj kesintilerini oluşturun.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Personel</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tür</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Toplam / Aylık</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Başlangıç</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Taksit</th>
              </tr>
            </thead>
            <tbody>
              {planlar.filter((p) => p.is_deleted !== 1).map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{p.personel_adi}</td>
                  <td className="px-4 py-2">{p.tur.toUpperCase()}</td>
                  <td className="px-4 py-2 text-right">{nf(p.toplam_tutar)} / {nf(p.aylik_taksit)} ₺</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.baslangic_ay}/{p.baslangic_yil}</td>
                  <td className="px-4 py-2 text-right">{p.taksit_sayisi} ay</td>
                </tr>
              ))}
              {!planlar.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Plan yok.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Elle avans / diğer */}
      <Dialog open={dialog === "avans" || dialog === "diger"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{dialog === "avans" ? "Avans Girişi" : "Açıklamalı Kesinti"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="mb-1.5 block">Personel</Label>
              <SearchableSelect value={form.personel_id} onChange={(v) => setForm({ ...form, personel_id: v })} options={aktif.map((p) => ({ value: p.id, label: p.full_name }))} placeholder="Personel seçin" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Tutar (₺)</Label><Input type="number" value={form.tutar} onChange={(e) => setForm({ ...form, tutar: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Tarih</Label><Input type="date" value={form.tarih} onChange={(e) => setForm({ ...form, tarih: e.target.value })} /></div>
            </div>
            <div><Label className="mb-1.5 block">Açıklama {dialog === "diger" ? "*" : ""}</Label><Input value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog(null)}>İptal</Button>
              <Button onClick={submitElle} disabled={elleEkle.isPending || (dialog === "diger" && !form.aciklama)}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* İcra / BES planı */}
      <Dialog open={dialog === "plan"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>İcra / BES Planı</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="mb-1.5 block">Personel</Label>
              <SearchableSelect value={form.personel_id} onChange={(v) => setForm({ ...form, personel_id: v })} options={aktif.map((p) => ({ value: p.id, label: `${p.full_name}${p.aylik_ucret ? ` · ${nf(p.aylik_ucret)} ₺` : ""}` }))} placeholder="Personel seçin" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Tür</Label>
                <Select value={form.tur} onValueChange={(v) => setForm({ ...form, tur: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="icra">İcra</SelectItem><SelectItem value="bes">BES</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="mb-1.5 block">Toplam Tutar (₺)</Label><Input type="number" value={form.toplam_tutar} onChange={(e) => setForm({ ...form, toplam_tutar: e.target.value })} /></div>
              {form.tur === "bes" && <div><Label className="mb-1.5 block">Taksit Sayısı</Label><Input type="number" value={form.taksit_sayisi} onChange={(e) => setForm({ ...form, taksit_sayisi: e.target.value })} /></div>}
              <div><Label className="mb-1.5 block">Başlangıç Yıl</Label><Input type="number" value={form.baslangic_yil} onChange={(e) => setForm({ ...form, baslangic_yil: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Başlangıç Ay</Label><Input type="number" value={form.baslangic_ay} onChange={(e) => setForm({ ...form, baslangic_ay: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">{form.tur === "icra" ? "İcra: ayda en fazla maaşın 1/4'ü, son taksit bakiye kadar." : "BES: toplam ÷ taksit sayısı, her ay otomatik bordroya."}</p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialog(null)}>İptal</Button>
              <Button onClick={submitPlan} disabled={planEkle.isPending}>Plan Oluştur</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
