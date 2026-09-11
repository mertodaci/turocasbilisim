import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";

// Ürün arama kutularında (Fiş, Zimmet, Etiket) barkod eşleşmesinin sadece ana
// barkoda değil, Ürün Kartı > Barkodlar sekmesinde tanımlı ikincil barkodlara da
// bakmasını sağlar. Mobil hızlı işlem zaten bu tabloyu backend'de sorguluyordu
// (barkod-coz); masaüstü arama kutuları görmüyordu.
export function useUrunEkBarkodMap() {
  const { data: ekBarkodlar = [] } = useQuery({
    queryKey: ["stok_urun_barkodlari-tumu"],
    queryFn: () => flowApi.entities.StokUrunBarkod.list("urun_id", 20000),
  });
  const map = {};
  for (const b of ekBarkodlar) {
    if (!b.urun_id || !b.barkod) continue;
    map[b.urun_id] = map[b.urun_id] ? `${map[b.urun_id]} ${b.barkod}` : b.barkod;
  }
  return map;
}
