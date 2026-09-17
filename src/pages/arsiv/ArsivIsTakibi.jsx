import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import BelgeEkleDialog from "@/components/arsiv/BelgeEkleDialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, Paperclip, Plus } from "lucide-react";

export default function ArsivIsTakibi() {
  const { data = [], isLoading } = useQuery({ queryKey: ["arsiv", "isTakibi"], queryFn: flowApi.arsiv.isTakibi });
  const [belgeDialog, setBelgeDialog] = useState({ open: false, ticket: null });

  const { data: belgeler = {} } = useQuery({
    queryKey: ["arsiv_belgeler_is_takibi"],
    queryFn: async () => {
      const rows = await flowApi.entities.ArsivBelge.filter({ kaynak_modul: "is_takibi" }, "-created_date", 1000);
      return rows.reduce((acc, r) => { (acc[r.kaynak_kayit_id] ||= []).push(r); return acc; }, {});
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5" /> İş Takibi Arşivi</h1>
        <p className="text-sm text-muted-foreground mt-1">Arşivlenmiş ya da kapanmış (çözülmüş) biletler.</p>
      </div>
      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="text-left px-4 py-2">Başlık</th>
            <th className="text-left px-4 py-2">Müşteri</th>
            <th className="text-left px-4 py-2">Durum</th>
            <th className="text-left px-4 py-2">Kapanış</th>
            <th className="text-left px-4 py-2">Ekler</th>
            <th className="text-left px-4 py-2"></th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Kayıt yok</td></tr>}
            {data.map((r) => {
              let ekler = [];
              try { ekler = JSON.parse(r.attachments || "[]") || []; } catch { /* noop */ }
              const arsivBelgeleri = belgeler[r.id] || [];
              return (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-4 py-2">{r.title}</td>
                  <td className="px-4 py-2">{r.customer_name || "—"}</td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2">{(r.resolved_at || "").slice(0, 10) || "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      {ekler.map((att, i) => (
                        <a key={i} href={att.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                          <Paperclip className="w-3 h-3" /> {att.name || "Ek"}
                        </a>
                      ))}
                      {arsivBelgeleri.map((b) => (
                        <a key={b.id} href={b.dosya_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                          <Paperclip className="w-3 h-3" /> {b.baslik}
                        </a>
                      ))}
                      {ekler.length === 0 && arsivBelgeleri.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Button size="sm" variant="outline" onClick={() => setBelgeDialog({ open: true, ticket: r })}>
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
        onOpenChange={(v) => setBelgeDialog({ open: v, ticket: v ? belgeDialog.ticket : null })}
        kaynakModul="is_takibi"
        kaynakKayitId={belgeDialog.ticket?.id}
        kaynakKayitOzet={belgeDialog.ticket?.title}
        queryKeyToInvalidate={["arsiv_belgeler_is_takibi"]}
      />
    </div>
  );
}
