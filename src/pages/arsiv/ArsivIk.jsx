import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BelgeEkleDialog from "@/components/arsiv/BelgeEkleDialog";
import { Users, Paperclip, Plus } from "lucide-react";

export default function ArsivIk() {
  const { data, isLoading } = useQuery({ queryKey: ["arsiv", "ik"], queryFn: flowApi.arsiv.ik });
  const pasif = data?.pasif_personel || [];
  const evraklar = data?.evraklar || [];
  const tutanaklar = data?.tutanaklar || [];
  const [belgeDialog, setBelgeDialog] = useState({ open: false, personel: null });

  const { data: belgeler = {} } = useQuery({
    queryKey: ["arsiv_belgeler_ik"],
    queryFn: async () => {
      const rows = await flowApi.entities.ArsivBelge.filter({ kaynak_modul: "ik" }, "-created_date", 1000);
      return rows.reduce((acc, r) => { (acc[r.kaynak_kayit_id] ||= []).push(r); return acc; }, {});
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5" /> İnsan Kaynakları Arşivi</h1>
        <p className="text-sm text-muted-foreground mt-1">Ayrılmış personel ve onlara ait özlük evrakı / tutanaklar.</p>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <div className="px-4 py-2.5 border-b bg-muted/40 text-xs font-semibold text-muted-foreground">Ayrılmış Personel ({pasif.length})</div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground"><tr>
            <th className="text-left px-4 py-2">Ad Soyad</th>
            <th className="text-left px-4 py-2">Departman</th>
            <th className="text-left px-4 py-2">Belgeler</th>
            <th className="text-left px-4 py-2"></th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && pasif.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Kayıt yok</td></tr>}
            {pasif.map((r) => {
              const arsivBelgeleri = belgeler[r.id] || [];
              return (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-4 py-2"><Link to={`/calisan/${r.id}`} className="text-primary hover:underline">{r.full_name}</Link></td>
                  <td className="px-4 py-2">{r.department || "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      {r.exit_document && (
                        <a href={r.exit_document} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-xs hover:underline"><Paperclip className="w-3 h-3" /> Çıkış Belgesi</a>
                      )}
                      {arsivBelgeleri.map((b) => (
                        <a key={b.id} href={b.dosya_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-xs hover:underline"><Paperclip className="w-3 h-3" /> {b.baslik}</a>
                      ))}
                      {!r.exit_document && arsivBelgeleri.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Button size="sm" variant="outline" onClick={() => setBelgeDialog({ open: true, personel: r })}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Belge Ekle
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <div className="px-4 py-2.5 border-b bg-muted/40 text-xs font-semibold text-muted-foreground">Özlük Evrakı ({evraklar.length})</div>
        <table className="w-full text-sm">
          <tbody>
            {evraklar.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.personel_adi}</td>
                <td className="px-4 py-2">{r.evrak_tipi}</td>
                <td className="px-4 py-2"><a href={r.dosya_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> {r.dosya_adi}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <div className="px-4 py-2.5 border-b bg-muted/40 text-xs font-semibold text-muted-foreground">Tutanaklar ({tutanaklar.length})</div>
        <table className="w-full text-sm">
          <tbody>
            {tutanaklar.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.personel_adi}</td>
                <td className="px-4 py-2">{(r.tarih || "").slice(0, 10)}</td>
                <td className="px-4 py-2">{r.aciklama || "—"}</td>
                <td className="px-4 py-2">
                  {r.dosya_url ? (
                    <a href={r.dosya_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Belge</a>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BelgeEkleDialog
        open={belgeDialog.open}
        onOpenChange={(v) => setBelgeDialog({ open: v, personel: v ? belgeDialog.personel : null })}
        kaynakModul="ik"
        kaynakKayitId={belgeDialog.personel?.id}
        kaynakKayitOzet={belgeDialog.personel?.full_name}
        queryKeyToInvalidate={["arsiv_belgeler_ik"]}
      />
    </div>
  );
}
