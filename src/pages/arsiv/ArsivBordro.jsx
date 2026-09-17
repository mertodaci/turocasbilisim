import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import { Wallet, ChevronDown, ChevronRight, Paperclip } from "lucide-react";

const AYLAR = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export default function ArsivBordro() {
  const { data = [], isLoading } = useQuery({ queryKey: ["arsiv", "bordro"], queryFn: flowApi.arsiv.bordro });
  const [expanded, setExpanded] = useState({});

  // Kaynak "bordro" olan tüm arşiv belgeleri tek seferde çekilip dönem (yıl-ay)
  // bazında gruplanıyor -- her dönem satırı açılınca kendi personel pusulalarını
  // gösterir. Bu turdan ÖNCE kapatılmış dönemlerde hiç kayıt olmayacağı için o
  // durumda boş-durum mesajı + eski "anlık görüntüle" linki devrede kalıyor.
  const { data: pusulalar = {} } = useQuery({
    queryKey: ["arsiv_belgeler_bordro"],
    queryFn: async () => {
      const rows = await flowApi.entities.ArsivBelge.filter({ kaynak_modul: "bordro" }, "-created_date", 2000);
      return rows.reduce((acc, r) => { (acc[r.tarih] ||= []).push(r); return acc; }, {});
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Wallet className="w-5 h-5" /> Bordro Arşivi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kapatılmış bordro dönemleri. Dönem kapatıldığında her personel için gerçek
          bir pusula dosyası arşivleniyor.
        </p>
      </div>
      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="text-left px-4 py-2"></th>
            <th className="text-left px-4 py-2">Dönem</th>
            <th className="text-left px-4 py-2">Onaylayan</th>
            <th className="text-left px-4 py-2">Kapanış Tarihi</th>
            <th className="text-left px-4 py-2"></th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Kapatılmış dönem yok</td></tr>}
            {data.map((r) => {
              const donemTarih = `${r.yil}-${String(r.ay).padStart(2, "0")}`;
              const donemPusulalari = pusulalar[donemTarih] || [];
              const isOpen = !!expanded[r.id];
              return (
                <Fragment key={r.id}>
                  <tr className="border-t cursor-pointer hover:bg-muted/20" onClick={() => setExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))}>
                    <td className="px-4 py-2">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                    <td className="px-4 py-2">{AYLAR[r.ay]} {r.yil}</td>
                    <td className="px-4 py-2">{r.onaylayan || "—"}</td>
                    <td className="px-4 py-2">{(r.kapanis_tarihi || "").slice(0, 10) || "—"}</td>
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <Link to="/ik/bordro" className="text-primary hover:underline text-sm">Bordrolamada Görüntüle →</Link>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t bg-muted/10">
                      <td colSpan={5} className="px-4 py-3">
                        {donemPusulalari.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Bu dönem için arşivlenmiş pusula yok — bu özellik eklenmeden önce
                            kapatılmış olabilir. Bordrolama ekranından anlık görüntüleyebilirsiniz.
                          </p>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Arşivlenmiş Pusulalar ({donemPusulalari.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {donemPusulalari.map((p) => (
                                <a key={p.id} href={p.dosya_url} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1.5 bg-card border rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted transition-colors">
                                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground" /> {p.kaynak_kayit_ozet}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
