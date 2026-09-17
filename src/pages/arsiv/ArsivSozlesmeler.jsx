import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BelgeEkleDialog from "@/components/arsiv/BelgeEkleDialog";
import { ScrollText, Paperclip, Plus } from "lucide-react";

export default function ArsivSozlesmeler() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["arsiv", "sozlesmeler"], queryFn: flowApi.arsiv.sozlesmeler });
  const [belgeDialog, setBelgeDialog] = useState({ open: false, sozlesme: null });
  const filtered = data.filter((r) => !q || (r.company_name || "").toLowerCase().includes(q.toLowerCase()) || (r.title || "").toLowerCase().includes(q.toLowerCase()));

  const { data: belgeler = {} } = useQuery({
    queryKey: ["arsiv_belgeler_sozlesme"],
    queryFn: async () => {
      const rows = await flowApi.entities.ArsivBelge.filter({ kaynak_modul: "sozlesme" }, "-created_date", 1000);
      return rows.reduce((acc, r) => { (acc[r.kaynak_kayit_id] ||= []).push(r); return acc; }, {});
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><ScrollText className="w-5 h-5" /> Sözleşme Arşivi</h1>
        <p className="text-sm text-muted-foreground mt-1">Süresi dolmuş veya iptal edilmiş sözleşmeler.</p>
      </div>
      <Input placeholder="Firma veya sözleşme ara…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="text-left px-4 py-2">Firma</th>
            <th className="text-left px-4 py-2">Sözleşme</th>
            <th className="text-left px-4 py-2">Durum</th>
            <th className="text-left px-4 py-2">Bitiş Tarihi</th>
            <th className="text-left px-4 py-2">Belgeler</th>
            <th className="text-left px-4 py-2"></th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Kayıt yok</td></tr>}
            {filtered.map((r) => {
              const arsivBelgeleri = belgeler[r.id] || [];
              return (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-4 py-2"><Link to={`/musteri/${r.customer_id}`} className="text-primary hover:underline">{r.company_name || "—"}</Link></td>
                  <td className="px-4 py-2">{r.title}</td>
                  <td className="px-4 py-2">{r.status === "iptal" ? "İptal" : "Süresi Doldu"}</td>
                  <td className="px-4 py-2">{(r.end_date || "").slice(0, 10) || "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                          <Paperclip className="w-3 h-3" /> Sözleşme Dosyası
                        </a>
                      )}
                      {arsivBelgeleri.map((b) => (
                        <a key={b.id} href={b.dosya_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                          <Paperclip className="w-3 h-3" /> {b.baslik}
                        </a>
                      ))}
                      {!r.file_url && arsivBelgeleri.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Button size="sm" variant="outline" onClick={() => setBelgeDialog({ open: true, sozlesme: r })}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Belge Ekle
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <BelgeEkleDialog
        open={belgeDialog.open}
        onOpenChange={(v) => setBelgeDialog({ open: v, sozlesme: v ? belgeDialog.sozlesme : null })}
        kaynakModul="sozlesme"
        kaynakKayitId={belgeDialog.sozlesme?.id}
        kaynakKayitOzet={belgeDialog.sozlesme ? `${belgeDialog.sozlesme.company_name || ""} — ${belgeDialog.sozlesme.title || ""}` : ""}
        queryKeyToInvalidate={["arsiv_belgeler_sozlesme"]}
      />
    </div>
  );
}
