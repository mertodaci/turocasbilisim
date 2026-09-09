import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderArchive, Upload, Trash2, Paperclip, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
const EVRAK_TIPLERI = ["kimlik", "diploma", "sozlesme", "saglik_raporu", "ehliyet", "adli_sicil", "ikametgah", "sgk_ise_giris", "fotograf", "banka", "diger"];
const tipLabel = (t) => ({ kimlik: "Kimlik", diploma: "Diploma", sozlesme: "İş Sözleşmesi", saglik_raporu: "Sağlık Raporu", ehliyet: "Ehliyet / SRC", adli_sicil: "Adli Sicil", ikametgah: "İkametgah", sgk_ise_giris: "SGK İşe Giriş", fotograf: "Fotoğraf", banka: "Banka / IBAN", diger: "Diğer" }[t] || t);

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
  if (!res.ok) throw new Error("upload");
  return res.json();
}

function PersonelBazli({ personeller }) {
  const qc = useQueryClient();
  const [personelId, setPersonelId] = useState("");
  const [tip, setTip] = useState("kimlik");
  const [aciklama, setAciklama] = useState("");
  const [busy, setBusy] = useState(false);
  const persById = useMemo(() => Object.fromEntries(personeller.map((p) => [p.id, p])), [personeller]);

  const { data: evraklar = [] } = useQuery({
    queryKey: ["ik_ozluk_evrak", personelId],
    queryFn: () => flowApi.entities.IkOzlukEvrak.filter({ personel_id: personelId }, "-created_date", 500),
    enabled: !!personelId,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ik_ozluk_evrak", personelId] });
  const delM = useMutation({ mutationFn: (id) => flowApi.entities.IkOzlukEvrak.delete(id), onSuccess: () => { invalidate(); toast.success("Silindi"); } });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !personelId) { toast.error("Önce personel seçin"); return; }
    setBusy(true);
    try {
      const up = await uploadFile(file);
      await flowApi.entities.IkOzlukEvrak.create({
        personel_id: personelId, personel_adi: persById[personelId]?.full_name || "",
        evrak_tipi: tip, dosya_url: up.url, dosya_adi: file.name,
        tarih: new Date().toISOString().slice(0, 10), aciklama,
      });
      setAciklama("");
      invalidate();
      toast.success("Evrak yüklendi");
    } catch { toast.error("Yüklenemedi"); }
    finally { setBusy(false); e.target.value = ""; }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-end">
        <div className="min-w-[220px]">
          <Label className="mb-1.5 block text-xs">Personel</Label>
          <Select value={personelId} onValueChange={setPersonelId}>
            <SelectTrigger><SelectValue placeholder="Personel seç" /></SelectTrigger>
            <SelectContent>{personeller.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Label className="mb-1.5 block text-xs">Evrak Tipi</Label>
          <Select value={tip} onValueChange={setTip}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EVRAK_TIPLERI.map((t) => <SelectItem key={t} value={t}>{tipLabel(t)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <Label className="mb-1.5 block text-xs">Açıklama</Label>
          <Input value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
        </div>
        <Button asChild disabled={!personelId || busy}>
          <label className="cursor-pointer"><Upload className="w-4 h-4 mr-1.5" /> {busy ? "Yükleniyor..." : "Evrak Yükle"}
            <input type="file" className="hidden" onChange={onFile} disabled={!personelId || busy} />
          </label>
        </Button>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {!personelId ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Personel seçin.</div> :
          evraklar.length === 0 ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Bu personelde evrak yok.</div> : (
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-muted/40 border-b"><tr>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tip</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Dosya</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tarih</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Açıklama</th>
              <th className="px-4 py-2.5"></th>
            </tr></thead>
            <tbody>
              {evraklar.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">{tipLabel(r.evrak_tipi)}</td>
                  <td className="px-4 py-2.5"><a href={r.dosya_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> {r.dosya_adi || "Aç"}</a></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{(r.tarih || "").slice(0, 10)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.aciklama || "—"}</td>
                  <td className="px-4 py-2.5 text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Evrak silinsin mi?")) delM.mutate(r.id); }}><Trash2 className="w-3.5 h-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TopluYukleme() {
  const [rows, setRows] = useState([]); // {dosya_url, dosya_adi, personel_id, personel_adi, evrak_tipi, eslesme}
  const [busy, setBusy] = useState(false);
  const [uygulandi, setUygulandi] = useState(0);
  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_min"], queryFn: () => flowApi.entities.Employee.list("full_name", 5000) });

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true); setUygulandi(0);
    try {
      const uploaded = [];
      for (const f of files) {
        const up = await uploadFile(f);
        uploaded.push({ dosya_url: up.url, dosya_adi: f.name });
      }
      const r = await flowApi.ik.ozlukEvrakOnizle({ dosyalar: uploaded });
      setRows(r.satirlar || []);
      toast.success(`${r.eslesen}/${r.toplam} dosya personele eşleşti`);
    } catch { toast.error("Yükleme/eşleştirme hatası"); }
    finally { setBusy(false); e.target.value = ""; }
  };
  const setRow = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const uygula = async () => {
    const gecerli = rows.filter((r) => r.personel_id && r.dosya_url);
    if (!gecerli.length) { toast.error("Eşleşmiş satır yok"); return; }
    setBusy(true);
    try {
      const r = await flowApi.ik.ozlukEvrakTopluUygula({ satirlar: gecerli });
      setUygulandi(r.uygulanan || 0);
      setRows([]);
      toast.success(`${r.uygulanan} evrak arşive işlendi`);
    } catch { toast.error("Uygulanamadı"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border rounded-xl p-4 text-sm text-muted-foreground">
        Dosya adında <b>11 haneli TC</b> varsa personel otomatik seçilir (yoksa ad-soyad denemesi). Evrak tipi dosya adındaki anahtar kelimeden tahmin edilir
        (örn. <code>12345678901_kimlik.pdf</code>). Aşağıda düzeltip <b>Uygula</b> deyin.
      </div>
      <div>
        <Button asChild disabled={busy}>
          <label className="cursor-pointer"><Upload className="w-4 h-4 mr-1.5" /> {busy ? "İşleniyor..." : "Dosya Seç (çoklu)"}
            <input type="file" multiple className="hidden" onChange={onFiles} disabled={busy} />
          </label>
        </Button>
        {uygulandi > 0 && <span className="ml-3 text-sm text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {uygulandi} evrak işlendi</span>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-muted/40 border-b"><tr>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Dosya</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Personel</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Evrak Tipi</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Eşleşme</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 text-xs">{r.dosya_adi}</td>
                    <td className="px-3 py-2">
                      <Select value={r.personel_id || "yok"} onValueChange={(v) => setRow(i, { personel_id: v === "yok" ? null : v, personel_adi: personeller.find((p) => p.id === v)?.full_name || null, eslesme: v === "yok" ? "yok" : "elle" })}>
                        <SelectTrigger className="h-8 w-56"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent><SelectItem value="yok">— eşleşme yok —</SelectItem>{personeller.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={r.evrak_tipi || "diger"} onValueChange={(v) => setRow(i, { evrak_tipi: v })}>
                        <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>{EVRAK_TIPLERI.map((t) => <SelectItem key={t} value={t}>{tipLabel(t)}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.personel_id
                        ? <span className="text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {r.eslesme === "tc" ? "TC ile" : r.eslesme === "ad" ? "Ad ile" : "Elle"}</span>
                        : <span className="text-amber-600 inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Seçin</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button onClick={uygula} disabled={busy}>{busy ? "Uygulanıyor..." : `Uygula (${rows.filter((r) => r.personel_id).length})`}</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function IkOzlukEvrak() {
  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_min"], queryFn: () => flowApi.entities.Employee.list("full_name", 5000) });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FolderArchive className="w-6 h-6 text-primary" /> Özlük Evrakları</h1>
        <p className="text-sm text-muted-foreground mt-1">Personel bazlı evrak arşivi + dosya adından otomatik eşleştirmeli toplu yükleme.</p>
      </div>
      <Tabs defaultValue="personel">
        <TabsList>
          <TabsTrigger value="personel">Personel Bazlı</TabsTrigger>
          <TabsTrigger value="toplu">Toplu Yükleme</TabsTrigger>
        </TabsList>
        <TabsContent value="personel" className="pt-4"><PersonelBazli personeller={personeller} /></TabsContent>
        <TabsContent value="toplu" className="pt-4"><TopluYukleme /></TabsContent>
      </Tabs>
    </div>
  );
}
