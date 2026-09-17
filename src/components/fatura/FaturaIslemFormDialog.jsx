import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "sonner";

const empty = {
  fatura_no: "", fatura_tanimi: "", abone_id: "", fatura_tarihi: "", son_odeme_tarihi: "",
  tuketim_miktari: "", tutar_kdv_haric: "", kdv_orani: "20", diger_bedel: "0", aciklama: "",
};

export default function FaturaIslemFormDialog({ open, onClose, fatura, onSubmit, isLoading }) {
  const [form, setForm] = useState(empty);

  const { data: aboneler = [] } = useQuery({
    queryKey: ["fatura-aboneler"],
    queryFn: () => flowApi.entities.FaturaAbone.list("abone_adi", 5000),
    enabled: open,
  });
  const { data: tarifeTurleri = [] } = useQuery({
    queryKey: ["definitions", "fatura_tarife_turu"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "fatura_tarife_turu", is_active: true }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (fatura) {
      setForm({
        fatura_no: fatura.fatura_no || "", fatura_tanimi: fatura.fatura_tanimi || "", abone_id: fatura.abone_id || "",
        fatura_tarihi: fatura.fatura_tarihi || "", son_odeme_tarihi: fatura.son_odeme_tarihi || "",
        tuketim_miktari: fatura.tuketim_miktari ?? "", tutar_kdv_haric: fatura.tutar_kdv_haric ?? "",
        kdv_orani: fatura.kdv_orani ?? "20", diger_bedel: fatura.diger_bedel ?? "0", aciklama: fatura.aciklama || "",
      });
    } else {
      setForm(empty);
    }
  }, [fatura, open]);

  const hesap = useMemo(() => {
    const kdvHaric = Number(form.tutar_kdv_haric) || 0;
    const kdvOrani = Number(form.kdv_orani) || 0;
    const digerBedel = Number(form.diger_bedel) || 0;
    const kdvTutari = +(kdvHaric * kdvOrani / 100).toFixed(2);
    const odenecekTutar = +(kdvHaric + kdvTutari).toFixed(2);
    const toplamTutar = +(odenecekTutar + digerBedel).toFixed(2);
    return { kdvTutari, odenecekTutar, toplamTutar };
  }, [form.tutar_kdv_haric, form.kdv_orani, form.diger_bedel]);

  const handleSubmit = () => {
    if (!form.fatura_no.trim()) { toast.error("Fatura No zorunlu"); return; }
    if (!form.abone_id) { toast.error("Abone seçimi zorunlu"); return; }
    onSubmit({
      ...form,
      tuketim_miktari: Number(form.tuketim_miktari) || 0,
      tutar_kdv_haric: Number(form.tutar_kdv_haric) || 0,
      kdv_orani: Number(form.kdv_orani) || 0,
      diger_bedel: Number(form.diger_bedel) || 0,
      kdv_tutari: hesap.kdvTutari,
      odenecek_tutar: hesap.odenecekTutar,
      toplam_tutar: hesap.toplamTutar,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader><DialogTitle>{fatura ? "Faturayı Düzenle" : "Yeni Fatura"}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Fatura Tanımı</Label>
              <Select value={form.fatura_tanimi || "none"} onValueChange={(v) => setForm({ ...form, fatura_tanimi: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seçilmedi</SelectItem>
                  {tarifeTurleri.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Abone *</Label>
              <SearchableSelect
                value={form.abone_id}
                onChange={(v) => setForm({ ...form, abone_id: v })}
                options={aboneler.map((a) => ({ value: a.id, label: a.abone_adi }))}
                placeholder="Abone seçin"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Fatura No *</Label>
              <Input value={form.fatura_no} onChange={(e) => setForm({ ...form, fatura_no: e.target.value })} />
            </div>
            <div />
            <div>
              <Label className="mb-1.5 block">Fatura Tarihi</Label>
              <Input type="date" value={form.fatura_tarihi} onChange={(e) => setForm({ ...form, fatura_tarihi: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Son Ödeme Tarihi</Label>
              <Input type="date" value={form.son_odeme_tarihi} onChange={(e) => setForm({ ...form, son_odeme_tarihi: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div>
              <Label className="mb-1.5 block">Tüketim Miktarı</Label>
              <Input type="number" value={form.tuketim_miktari} onChange={(e) => setForm({ ...form, tuketim_miktari: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">KDV Hariç Tutar (₺)</Label>
              <Input type="number" value={form.tutar_kdv_haric} onChange={(e) => setForm({ ...form, tutar_kdv_haric: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">KDV Oranı (%)</Label>
              <Input type="number" value={form.kdv_orani} onChange={(e) => setForm({ ...form, kdv_orani: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Diğer Bedel (Kesinti vb.)</Label>
              <Input type="number" value={form.diger_bedel} onChange={(e) => setForm({ ...form, diger_bedel: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-muted/40 rounded-xl p-3">
            <div>
              <p className="text-[11px] text-muted-foreground">KDV Tutarı</p>
              <p className="text-sm font-semibold">{hesap.kdvTutari.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Ödenecek Tutar</p>
              <p className="text-sm font-semibold">{hesap.odenecekTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Toplam Tutar</p>
              <p className="text-sm font-bold text-primary">{hesap.toplamTutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</p>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Açıklama</Label>
            <Textarea rows={2} value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>İptal</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>{isLoading ? "Kaydediliyor..." : "Kaydet"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
