import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Info, Pencil, Printer, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";
import FaturaIslemFormDialog from "@/components/fatura/FaturaIslemFormDialog";
import { faturaOdemeEmriYazdir } from "@/lib/faturaBelge";

const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export default function FaturaIslemleri() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [detay, setDetay] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const [filtreYil, setFiltreYil] = useState("");
  const [filtreAy, setFiltreAy] = useState("");
  const [filtreSozlesmeNo, setFiltreSozlesmeNo] = useState("");
  const [filtreAboneTuru, setFiltreAboneTuru] = useState("");
  const [filtreAboneId, setFiltreAboneId] = useState("");
  const [filtreFaturaNo, setFiltreFaturaNo] = useState("");

  const { data: faturalar = [], isLoading } = useQuery({
    queryKey: ["fatura-islemler"],
    queryFn: () => flowApi.entities.FaturaIslem.list("-fatura_tarihi", 5000),
  });
  const { data: aboneler = [] } = useQuery({
    queryKey: ["fatura-aboneler"],
    queryFn: () => flowApi.entities.FaturaAbone.list("abone_adi", 5000),
  });
  const aboneMap = useMemo(() => Object.fromEntries(aboneler.map((a) => [a.id, a])), [aboneler]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fatura-islemler"] });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.FaturaIslem.create(data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Fatura eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.FaturaIslem.update(id, data),
    onSuccess: () => { invalidate(); setDialog({ open: false, item: null }); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.FaturaIslem.delete(id),
    onSuccess: () => { invalidate(); toast.success("Silindi"); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });
  const topluSilMutation = useMutation({
    mutationFn: (ids) => flowApi.fatura.islemlerTopluSil({ ids }),
    onSuccess: (r) => { invalidate(); setSelected(new Set()); toast.success(`${r.silinen} fatura silindi`); },
    onError: (e) => toast.error("Silinemedi: " + (e?.message || "hata")),
  });

  const filtered = faturalar.filter((f) => {
    if (filtreYil && !(f.fatura_tarihi || "").startsWith(filtreYil)) return false;
    if (filtreAy && (f.fatura_tarihi || "").slice(5, 7) !== filtreAy) return false;
    if (filtreSozlesmeNo && !(aboneMap[f.abone_id]?.sozlesme_no || "").toLowerCase().includes(filtreSozlesmeNo.toLowerCase())) return false;
    if (filtreAboneTuru && filtreAboneTuru !== "all" && aboneMap[f.abone_id]?.abone_turu !== filtreAboneTuru) return false;
    if (filtreAboneId && filtreAboneId !== "all" && f.abone_id !== filtreAboneId) return false;
    if (filtreFaturaNo && !(f.fatura_no || "").toLowerCase().includes(filtreFaturaNo.toLowerCase())) return false;
    return true;
  });

  const aboneTurleri = [...new Set(aboneler.map((a) => a.abone_turu).filter(Boolean))];

  const openCreate = () => setDialog({ open: true, item: null });
  const openEdit = (f) => setDialog({ open: true, item: f });
  const handleSubmit = (data) => {
    if (dialog.item) updateMutation.mutate({ id: dialog.item.id, data });
    else createMutation.mutate(data);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Receipt className="w-6 h-6 text-primary" /> Fatura İşlemleri</h1>
          <p className="text-sm text-muted-foreground mt-1">Fatura kayıtlarını görüntüleyin, ekleyin ve yönetin.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Yeni Fatura</Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 flex flex-wrap gap-3">
        <Input className="w-28" placeholder="Yıl" value={filtreYil} onChange={(e) => setFiltreYil(e.target.value)} />
        <Select value={filtreAy || "all"} onValueChange={(v) => setFiltreAy(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Ay" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Aylar</SelectItem>
            {AY_ADLARI.map((ad, i) => <SelectItem key={ad} value={String(i + 1).padStart(2, "0")}>{ad}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="w-44" placeholder="Sözleşme/Mukavele No" value={filtreSozlesmeNo} onChange={(e) => setFiltreSozlesmeNo(e.target.value)} />
        <Select value={filtreAboneTuru || "all"} onValueChange={setFiltreAboneTuru}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Abone Türü" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Abone Türleri</SelectItem>
            {aboneTurleri.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtreAboneId || "all"} onValueChange={setFiltreAboneId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Abone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Aboneler</SelectItem>
            {aboneler.map((a) => <SelectItem key={a.id} value={a.id}>{a.abone_adi}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="w-40" placeholder="Fatura No" value={filtreFaturaNo} onChange={(e) => setFiltreFaturaNo(e.target.value)} />
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-2.5">
          <span className="text-sm">{selected.size} fatura seçildi</span>
          <Button
            size="sm" variant="destructive"
            onClick={() => { if (confirm(`${selected.size} fatura silinsin mi?`)) topluSilMutation.mutate([...selected]); }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Seçilenleri Sil
          </Button>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Receipt className="w-8 h-8 opacity-40" /><p>Fatura yok.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fatura No</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Abone</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fatura Tarihi</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Son Ödeme</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Ödenecek Tutar</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Toplam Tutar</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr key={f.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3"><Checkbox checked={selected.has(f.id)} onCheckedChange={() => toggleSelect(f.id)} /></td>
                  <td className="px-4 py-3 font-medium">{f.fatura_no}</td>
                  <td className="px-4 py-3 text-muted-foreground">{aboneMap[f.abone_id]?.abone_adi || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.fatura_tarihi ? f.fatura_tarihi.slice(0, 10) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.son_odeme_tarihi ? f.son_odeme_tarihi.slice(0, 10) : "—"}</td>
                  <td className="px-4 py-3 text-right">{Number(f.odenecek_tutar || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
                  <td className="px-4 py-3 text-right font-medium">{Number(f.toplam_tutar || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Detay" onClick={() => setDetay(f)}><Info className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Düzenle" onClick={() => openEdit(f)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Yazdır" onClick={() => faturaOdemeEmriYazdir(f, aboneMap[f.abone_id])}><Printer className="w-3.5 h-3.5" /></Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Sil"
                      onClick={() => { if (confirm(`"${f.fatura_no}" faturası silinsin mi?`)) deleteMutation.mutate(f.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FaturaIslemFormDialog
        open={dialog.open}
        fatura={dialog.item}
        onClose={() => setDialog({ open: false, item: null })}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={!!detay} onOpenChange={(v) => !v && setDetay(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Fatura Detayı — {detay?.fatura_no}</DialogTitle></DialogHeader>
          {detay && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[11px] text-muted-foreground">Abone</p><p className="font-medium">{aboneMap[detay.abone_id]?.abone_adi || "—"}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Fatura Tanımı</p><p className="font-medium">{detay.fatura_tanimi || "—"}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Fatura Tarihi</p><p className="font-medium">{detay.fatura_tarihi ? detay.fatura_tarihi.slice(0, 10) : "—"}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Son Ödeme Tarihi</p><p className="font-medium">{detay.son_odeme_tarihi ? detay.son_odeme_tarihi.slice(0, 10) : "—"}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Tüketim Miktarı</p><p className="font-medium">{detay.tuketim_miktari ?? "—"}</p></div>
                <div><p className="text-[11px] text-muted-foreground">KDV Hariç Tutar</p><p className="font-medium">{Number(detay.tutar_kdv_haric || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</p></div>
                <div><p className="text-[11px] text-muted-foreground">KDV Tutarı (%{detay.kdv_orani})</p><p className="font-medium">{Number(detay.kdv_tutari || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</p></div>
                <div><p className="text-[11px] text-muted-foreground">Diğer Bedel</p><p className="font-medium">{Number(detay.diger_bedel || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</p></div>
                <div><p className="text-[11px] text-muted-foreground">Ödenecek Tutar</p><p className="font-semibold">{Number(detay.odenecek_tutar || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</p></div>
                <div><p className="text-[11px] text-muted-foreground">Toplam Tutar</p><p className="font-bold text-primary">{Number(detay.toplam_tutar || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</p></div>
              </div>
              {detay.aciklama && <div className="pt-2 border-t"><p className="text-[11px] text-muted-foreground">Açıklama</p><p>{detay.aciklama}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
