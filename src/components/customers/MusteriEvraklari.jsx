import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2, Paperclip } from "lucide-react";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
  if (!res.ok) throw new Error("upload");
  return res.json();
}

export function MusteriEvraklari({ customerId, customerName, readOnly = false }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [evrakTipi, setEvrakTipi] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: evraklar = [] } = useQuery({
    queryKey: ["musteri_evraklari", customerId],
    queryFn: () => flowApi.entities.MusteriEvrak.filter({ customer_id: customerId }, "-created_date", 500),
    enabled: !!customerId,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["musteri_evraklari", customerId] });
  const delM = useMutation({ mutationFn: (id) => flowApi.entities.MusteriEvrak.delete(id), onSuccess: () => { invalidate(); toast.success("Silindi"); } });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !customerId) { toast.error("Önce müşteri seçin"); return; }
    setBusy(true);
    try {
      const up = await uploadFile(file);
      await flowApi.entities.MusteriEvrak.create({
        customer_id: customerId, customer_name: customerName || "",
        evrak_tipi: evrakTipi || "Diğer", dosya_url: up.url, dosya_adi: file.name,
        tarih: new Date().toISOString().slice(0, 10), aciklama, yukleyen: user?.full_name || "",
      });
      setEvrakTipi(""); setAciklama("");
      invalidate();
      toast.success("Evrak yüklendi");
    } catch { toast.error("Yüklenemedi"); }
    finally { setBusy(false); e.target.value = ""; }
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex gap-2 flex-wrap items-end">
          <div className="w-44">
            <Label className="mb-1.5 block text-xs">Evrak Tipi</Label>
            <Input value={evrakTipi} onChange={(e) => setEvrakTipi(e.target.value)} placeholder="Sözleşme, kimlik vb." />
          </div>
          <div className="flex-1 min-w-[160px]">
            <Label className="mb-1.5 block text-xs">Açıklama</Label>
            <Input value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
          </div>
          <Button asChild disabled={!customerId || busy}>
            <label className="cursor-pointer"><Upload className="w-4 h-4 mr-1.5" /> {busy ? "Yükleniyor..." : "Evrak Yükle"}
              <input type="file" className="hidden" onChange={onFile} disabled={!customerId || busy} />
            </label>
          </Button>
        </div>
      )}

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {!customerId ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Müşteri seçin.</div> :
          evraklar.length === 0 ? <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Bu müşteride evrak yok.</div> : (
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
                  <td className="px-4 py-2.5">{r.evrak_tipi || "Diğer"}</td>
                  <td className="px-4 py-2.5"><a href={r.dosya_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> {r.dosya_adi || "Aç"}</a></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{(r.tarih || "").slice(0, 10)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.aciklama || "—"}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Evrak silinsin mi?")) delM.mutate(r.id); }} title="Sil"><Trash2 className="w-3.5 h-3.5" /></Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
