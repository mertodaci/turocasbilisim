import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function StokFiyatArastir() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [degerler, setDegerler] = useState({});

  const { data: urunler = [], isLoading } = useQuery({ queryKey: ["stok_urunler"], queryFn: () => flowApi.entities.StokUrun.list("ad", 8000) });

  const uygula = useMutation({
    mutationFn: ({ urun_id, hedef }) => flowApi.stok.fiyatArastirUygula({ urun_id, fiyat: degerler[urun_id], hedef }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["stok_urunler"] }); toast.success("Fiyat yazıldı"); },
    onError: (e) => toast.error(String(e?.message)),
  });

  const filtered = urunler.filter((u) => u.is_deleted !== 1 && (!q || `${u.kod} ${u.ad} ${u.barkod} ${u.marka}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 300);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Search className="w-6 h-6 text-primary" /> Fiyat Araştır</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Piyasa fiyatını araştırıp ürün kartındaki Alış / Satış alanına tek tıkla yazın. Alışa yazınca fiyat geçmişine de işlenir.
          <br /><span className="text-xs">Not: Otomatik web fiyat çekme (Cimri vb.) sunucu tarafında ayrı yapılandırma gerektirir; şu an manuel/yarı-otomatik.</span>
        </p></div>

      <Input className="max-w-md" placeholder="Ürün adı / kod / barkod / marka ara" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="bg-card border rounded-2xl overflow-x-auto">
        {isLoading ? <div className="py-10 text-center text-muted-foreground">Yükleniyor...</div> : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-muted/40 border-b"><tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ürün</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Kart Alış</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Kart Satış</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Araştırılan Fiyat</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <p className="font-medium">{u.ad}</p>
                    <p className="text-xs text-muted-foreground">{u.kod} · {u.barkod || "—"}
                      {(u.barkod || u.ad) && <a className="ml-2 text-primary inline-flex items-center gap-0.5" target="_blank" rel="noreferrer"
                        href={`https://www.cimri.com/arama?q=${encodeURIComponent(u.barkod || u.ad)}`}>Cimri'de ara <ExternalLink className="w-3 h-3" /></a>}
                    </p>
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{(u.alis_fiyati ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{(u.satis_fiyati ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <Input type="number" className="h-8 w-28" value={degerler[u.id] ?? ""} onChange={(e) => setDegerler({ ...degerler, [u.id]: e.target.value })} placeholder="0,00" />
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" className="h-8" disabled={!degerler[u.id] || uygula.isPending} onClick={() => uygula.mutate({ urun_id: u.id, hedef: "alis" })}>Alışa</Button>
                    <Button size="sm" className="h-8 ml-1.5" disabled={!degerler[u.id] || uygula.isPending} onClick={() => uygula.mutate({ urun_id: u.id, hedef: "satis" })}>Satışa Yaz</Button>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Ürün yok.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
