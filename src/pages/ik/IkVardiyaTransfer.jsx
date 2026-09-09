import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

export default function IkVardiyaTransfer() {
  const qc = useQueryClient();
  const [hedefVardiya, setHedefVardiya] = useState("");
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [aciklama, setAciklama] = useState("");
  const [secili, setSecili] = useState(new Set());
  const [q, setQ] = useState("");
  const [subeF, setSubeF] = useState("");

  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_full"], queryFn: () => flowApi.entities.Employee.list("full_name", 8000) });
  const { data: vardiyalar = [] } = useQuery({ queryKey: ["ik_vardiyalar"], queryFn: () => flowApi.entities.IkVardiya.list("ad", 500) });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const { data: atamalar = [] } = useQuery({ queryKey: ["ik_vardiya_atamalari"], queryFn: () => flowApi.entities.IkVardiyaAtama.list("-created_date", 300) });

  const vardiyaAdi = (id) => vardiyalar.find((v) => v.id === id)?.ad || "—";
  const subeAdi = (id) => subeler.find((s) => s.id === id)?.ad || "";

  const aktif = useMemo(() => personeller.filter((p) => p.app_role !== "musteri" && p.is_deleted !== 1 && p.status !== "pasif" && !p.exit_date), [personeller]);
  const filtered = aktif.filter((p) => {
    if (subeF && p.sube_id !== subeF) return false;
    if (q && !`${p.full_name} ${p.meslek_kodu}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const toggle = (id) => setSecili((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const transfer = useMutation({
    mutationFn: () => flowApi.ik.vardiyaTransfer({ personel_ids: [...secili], vardiya_id: hedefVardiya, transfer_tarihi: tarih, aciklama }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["ik_personel_full"] });
      qc.invalidateQueries({ queryKey: ["ik_vardiya_atamalari"] });
      setSecili(new Set());
      toast.success(`${r.transfer} personel transfer edildi`);
    },
    onError: (e) => toast.error(String(e?.message || "Transfer edilemedi")),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowLeftRight className="w-6 h-6 text-primary" /> Vardiya Personel Transferi</h1>
        <p className="text-sm text-muted-foreground mt-1">Seçili personel hedef vardiyaya atanır; eski vardiyadan çıkar. Transfer tarihi öncesi geçmiş korunur, tarihten itibaren personelin ana vardiyası değişir.</p>
      </div>

      <div className="bg-card border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="mb-1.5 block">Hedef Vardiya *</Label>
          <Select value={hedefVardiya} onValueChange={setHedefVardiya}>
            <SelectTrigger><SelectValue placeholder="Vardiya seçin" /></SelectTrigger>
            <SelectContent>{vardiyalar.map((v) => <SelectItem key={v.id} value={v.id}>{v.ad} · {v.baslama_saati}-{v.bitis_saati}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="mb-1.5 block">Transfer Tarihi *</Label><Input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} /></div>
        <div><Label className="mb-1.5 block">Açıklama</Label><Input value={aciklama} onChange={(e) => setAciklama(e.target.value)} /></div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={subeF || "hepsi"} onValueChange={(v) => setSubeF(v === "hepsi" ? "" : v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent><SelectItem value="hepsi">Tüm Şubeler</SelectItem>{subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="max-w-xs" placeholder="Ad / meslek ara" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button size="sm" variant="outline" onClick={() => setSecili(new Set(filtered.map((p) => p.id)))}>Görünenleri Seç</Button>
        <Button size="sm" variant="outline" onClick={() => setSecili(new Set())}>Temizle</Button>
        <Button className="ml-auto" disabled={transfer.isPending || !hedefVardiya || !tarih || secili.size === 0}
          onClick={() => transfer.mutate()}>
          {transfer.isPending ? "Aktarılıyor..." : `Transfer Et (${secili.size})`}
        </Button>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="px-4 py-2.5 w-10"></th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Personel</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Şube</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Mevcut Vardiya</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/20 ${secili.has(p.id) ? "bg-primary/5" : ""}`}>
                <td className="px-4 py-2 text-center"><input type="checkbox" checked={secili.has(p.id)} onChange={() => toggle(p.id)} /></td>
                <td className="px-4 py-2 font-medium">{p.full_name}<span className="text-xs text-muted-foreground ml-1">{p.meslek_kodu || ""}</span></td>
                <td className="px-4 py-2 text-muted-foreground">{subeAdi(p.sube_id) || "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{vardiyaAdi(p.vardiya_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <div className="px-4 py-3 border-b"><p className="text-sm font-semibold">Son Transfer Kayıtları</p></div>
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Tarih</th>
              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Personel</th>
              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Vardiya</th>
              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {atamalar.slice(0, 100).map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="px-4 py-2 text-muted-foreground">{a.baslangic_tarihi}</td>
                <td className="px-4 py-2">{a.personel_adi}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.vardiya_adi}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.aciklama || "—"}</td>
              </tr>
            ))}
            {!atamalar.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
