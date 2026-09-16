import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import { Users, Paperclip } from "lucide-react";

export default function ArsivIk() {
  const { data, isLoading } = useQuery({ queryKey: ["arsiv", "ik"], queryFn: flowApi.arsiv.ik });
  const pasif = data?.pasif_personel || [];
  const evraklar = data?.evraklar || [];
  const tutanaklar = data?.tutanaklar || [];

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
            <th className="text-left px-4 py-2">Çıkış Belgesi</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={3} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && pasif.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-muted-foreground">Kayıt yok</td></tr>}
            {pasif.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2"><Link to={`/calisan/${r.id}`} className="text-primary hover:underline">{r.full_name}</Link></td>
                <td className="px-4 py-2">{r.department || "—"}</td>
                <td className="px-4 py-2">{r.exit_document ? <a href={r.exit_document} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Belge</a> : "—"}</td>
              </tr>
            ))}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
