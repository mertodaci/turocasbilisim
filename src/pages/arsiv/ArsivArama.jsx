import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Paperclip } from "lucide-react";

const KATEGORILER = ["Sözleşme Taraması", "Fatura", "Tutanak", "Genel Belge", "Diğer", "Bordro Pusulası"];
const KAYNAKLAR = [
  { value: "sozlesme", label: "Sözleşme" },
  { value: "is_takibi", label: "İş Takibi" },
  { value: "ik", label: "İnsan Kaynakları" },
  { value: "bordro", label: "Bordro" },
  { value: "genel", label: "Genel" },
];
const ANY = "__hepsi__";

export default function ArsivArama() {
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState(ANY);
  const [kaynakModul, setKaynakModul] = useState(ANY);
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");

  const filters = {
    q: q || undefined,
    kategori: kategori === ANY ? undefined : kategori,
    kaynak_modul: kaynakModul === ANY ? undefined : kaynakModul,
    baslangic: baslangic || undefined,
    bitis: bitis || undefined,
  };

  const { data = [], isLoading } = useQuery({
    queryKey: ["arsiv_ara", filters],
    queryFn: () => flowApi.arsiv.ara(filters),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Search className="w-5 h-5" /> Arşiv Arama</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sözleşme, İş Takibi, İK ve Bordro arşivlerine eklenen tüm belgelerde tek yerden arayın.
        </p>
      </div>

      <div className="bg-card border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <Label className="mb-1.5 block text-xs">Serbest Metin</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Başlık, dosya adı, etiket…" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Kategori</Label>
          <Select value={kategori} onValueChange={setKategori}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Tümü</SelectItem>
              {KATEGORILER.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Kaynak</Label>
          <Select value={kaynakModul} onValueChange={setKaynakModul}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Tümü</SelectItem>
              {KAYNAKLAR.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Başlangıç</Label>
          <Input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Bitiş</Label>
          <Input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} />
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="text-left px-4 py-2">Başlık</th>
            <th className="text-left px-4 py-2">Kategori</th>
            <th className="text-left px-4 py-2">Kaynak</th>
            <th className="text-left px-4 py-2">Kaynak Kayıt</th>
            <th className="text-left px-4 py-2">Tarih</th>
            <th className="text-left px-4 py-2">Yükleyen</th>
            <th className="text-left px-4 py-2"></th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">Yükleniyor…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">Sonuç yok</td></tr>}
            {data.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.baslik}</td>
                <td className="px-4 py-2">{r.kategori || "—"}</td>
                <td className="px-4 py-2">{KAYNAKLAR.find((k) => k.value === r.kaynak_modul)?.label || r.kaynak_modul || "—"}</td>
                <td className="px-4 py-2">{r.kaynak_kayit_ozet || "—"}</td>
                <td className="px-4 py-2">{(r.tarih || "").slice(0, 10) || "—"}</td>
                <td className="px-4 py-2">{r.yukleyen || "—"}</td>
                <td className="px-4 py-2">
                  <a href={r.dosya_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5" /> Aç
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
