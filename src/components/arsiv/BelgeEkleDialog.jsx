import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

const KATEGORILER = ["Sözleşme Taraması", "Fatura", "Tutanak", "Genel Belge", "Diğer"];

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
  if (!res.ok) throw new Error("upload");
  return res.json();
}

// Dijital Arşiv'e (arsiv_belgeler) bir kapanmış/arşivlenmiş kayda belge eklemek
// için ortak dialog — MusteriEvraklari.jsx'teki upload deseninin kopyası.
// kaynakModul/kaynakKayitId/kaynakKayitOzet ile belge, ilgili kayda bağlanır.
export default function BelgeEkleDialog({ open, onOpenChange, kaynakModul, kaynakKayitId, kaynakKayitOzet, queryKeyToInvalidate }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [baslik, setBaslik] = useState("");
  const [kategori, setKategori] = useState(KATEGORILER[0]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const createM = useMutation({
    mutationFn: (data) => flowApi.entities.ArsivBelge.create(data),
    onSuccess: () => {
      if (queryKeyToInvalidate) qc.invalidateQueries({ queryKey: queryKeyToInvalidate });
      toast.success("Belge arşive eklendi");
      onOpenChange(false);
      setBaslik(""); setKategori(KATEGORILER[0]); setFile(null);
    },
    onError: () => toast.error("Eklenemedi"),
  });

  const submit = async () => {
    if (!file) { toast.error("Dosya seçin"); return; }
    setBusy(true);
    try {
      const up = await uploadFile(file);
      createM.mutate({
        kategori,
        kaynak_modul: kaynakModul,
        kaynak_kayit_id: kaynakKayitId || null,
        kaynak_kayit_ozet: kaynakKayitOzet || "",
        baslik: baslik || file.name,
        dosya_url: up.url,
        dosya_adi: file.name,
        tarih: new Date().toISOString().slice(0, 10),
        yukleyen: user?.full_name || "",
      });
    } catch {
      toast.error("Dosya yüklenemedi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Arşive Belge Ekle</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          {kaynakKayitOzet && <p className="text-xs text-muted-foreground">İlgili kayıt: <b>{kaynakKayitOzet}</b></p>}
          <div>
            <Label className="mb-1.5 block">Başlık</Label>
            <Input value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="Boş bırakılırsa dosya adı kullanılır" />
          </div>
          <div>
            <Label className="mb-1.5 block">Kategori</Label>
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KATEGORILER.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Dosya *</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button onClick={submit} disabled={busy || createM.isPending}>
              <Upload className="w-4 h-4 mr-1.5" /> {busy || createM.isPending ? "Yükleniyor..." : "Ekle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
