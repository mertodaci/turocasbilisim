import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Receipt, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { paraSade as nf } from "@/lib/ikFormat";

export default function IkZam() {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    hedef: "tek_personel", personel_id: "", meslek_kodu: "", maas_min: "", maas_max: "",
    zam_alani: "resmi", islem: "yuzde", deger: "", gecerlilik: new Date().toISOString().slice(0, 10), aciklama: "",
  });

  const { data: personeller = [] } = useQuery({ queryKey: ["ik_personel_full"], queryFn: () => flowApi.entities.Employee.list("full_name", 8000) });
  const { data: gecmis = [] } = useQuery({ queryKey: ["ik_ucret_gecmisi"], queryFn: () => flowApi.entities.IkUcretGecmisi.list("-created_date", 500) });

  const aktif = personeller.filter((p) => p.app_role !== "musteri" && p.is_deleted !== 1 && p.status !== "pasif" && !p.exit_date);
  const meslekKodlari = useMemo(() => [...new Set(aktif.map((p) => p.meslek_kodu).filter(Boolean))].sort(), [aktif]);

  const etkilenen = useMemo(() => {
    if (f.hedef === "tumu") return aktif.length;
    if (f.hedef === "tek_personel") return f.personel_id ? 1 : 0;
    if (f.hedef === "meslek_grubu") return f.meslek_kodu ? aktif.filter((p) => p.meslek_kodu === f.meslek_kodu).length : 0;
    if (f.hedef === "maas_araligi") {
      const lo = Number(f.maas_min) || 0, hi = Number(f.maas_max) || 1e12;
      return aktif.filter((p) => (Number(p.aylik_ucret) || 0) >= lo && (Number(p.aylik_ucret) || 0) <= hi).length;
    }
    return 0;
  }, [f, aktif]);

  const uygula = useMutation({
    mutationFn: () => flowApi.ik.zamUygula({
      ...f, deger: Number(f.deger),
      maas_min: f.maas_min === "" ? undefined : Number(f.maas_min),
      maas_max: f.maas_max === "" ? undefined : Number(f.maas_max),
    }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["ik_personel_full"] });
      queryClient.invalidateQueries({ queryKey: ["ik_ucret_gecmisi"] });
      toast.success(`Zam uygulandı — ${r.etkilenen} personel`);
    },
    onError: (e) => toast.error(String(e?.message || "Uygulanamadı")),
  });

  const islemAdi = { yuzde: "Yüzde Zam (%)", sabit: "Sabit Tutar Ekle (₺)", yeni: "Yeni Tutar Yap (₺)" }[f.islem];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wand2 className="w-6 h-6 text-primary" /> Özlük & Zam Uygulama Sihirbazı</h1>
        <p className="text-sm text-muted-foreground mt-1">Toplu veya bireysel ücret artışı. Resmî maaş değişince saatlik/dakikalık türetilir; her değişim ücret geçmişine yazılır.</p>
      </div>

      <div className="bg-card border rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Kime?</Label>
            <Select value={f.hedef} onValueChange={(v) => setF({ ...f, hedef: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tek_personel">Tek Personel</SelectItem>
                <SelectItem value="meslek_grubu">Meslek Grubu</SelectItem>
                <SelectItem value="maas_araligi">Maaş Aralığı</SelectItem>
                <SelectItem value="tumu">Tüm Aktif Personel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f.hedef === "tek_personel" && (
            <div>
              <Label className="mb-1.5 block">Personel</Label>
              <SearchableSelect value={f.personel_id} onChange={(v) => setF({ ...f, personel_id: v })}
                options={aktif.map((p) => ({ value: p.id, label: `${p.full_name}${p.aylik_ucret ? ` · ${nf(p.aylik_ucret)} ₺` : ""}` }))} placeholder="Personel seçin" />
            </div>
          )}
          {f.hedef === "meslek_grubu" && (
            <div>
              <Label className="mb-1.5 block">Meslek Kodu</Label>
              <SearchableSelect value={f.meslek_kodu} onChange={(v) => setF({ ...f, meslek_kodu: v })}
                options={meslekKodlari.map((m) => ({ value: m, label: m }))} placeholder="Meslek kodu" />
            </div>
          )}
          {f.hedef === "maas_araligi" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Min Maaş</Label><Input type="number" value={f.maas_min} onChange={(e) => setF({ ...f, maas_min: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Max Maaş</Label><Input type="number" value={f.maas_max} onChange={(e) => setF({ ...f, maas_max: e.target.value })} /></div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="mb-1.5 block">Zam Alanı</Label>
            <Select value={f.zam_alani} onValueChange={(v) => setF({ ...f, zam_alani: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="resmi">Resmî Maaş</SelectItem>
                <SelectItem value="sahsi">Şahsi Hesap</SelectItem>
                <SelectItem value="her_ikisi">Her İkisi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">İşlem</Label>
            <Select value={f.islem} onValueChange={(v) => setF({ ...f, islem: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yuzde">Yüzde Zam</SelectItem>
                <SelectItem value="sabit">Sabit Tutar Ekle</SelectItem>
                <SelectItem value="yeni">Yeni Tutar Yap</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="mb-1.5 block">{islemAdi}</Label><Input type="number" value={f.deger} onChange={(e) => setF({ ...f, deger: e.target.value })} /></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label className="mb-1.5 block">Geçerlilik Tarihi</Label><Input type="date" value={f.gecerlilik} onChange={(e) => setF({ ...f, gecerlilik: e.target.value })} /></div>
          <div><Label className="mb-1.5 block">Açıklama</Label><Input value={f.aciklama} onChange={(e) => setF({ ...f, aciklama: e.target.value })} /></div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-muted-foreground">Etkilenecek personel: <b className="text-foreground">{etkilenen}</b></p>
          <Button disabled={uygula.isPending || !f.deger || etkilenen === 0}
            onClick={() => { if (confirm(`${etkilenen} personele zam uygulanacak. Onaylıyor musunuz?`)) uygula.mutate(); }}>
            {uygula.isPending ? "Uygulanıyor..." : "Zammı Uygula"}
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <div className="px-4 py-3 border-b flex items-center gap-2"><Receipt className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-semibold">Ücret Değişim Geçmişi</p></div>
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Tarih</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Personel</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Alan</th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Eski → Yeni</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Kaynak</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {gecmis.slice(0, 200).map((g) => (
              <tr key={g.id} className="border-b last:border-0">
                <td className="px-4 py-2 text-muted-foreground">{(g.created_date || "").slice(0, 10)}</td>
                <td className="px-4 py-2">{g.personel_adi}</td>
                <td className="px-4 py-2 text-muted-foreground">{g.alan === "resmi_maas" ? "Resmî Maaş" : g.alan === "sahsi_hesap" ? "Şahsi Hesap" : g.alan}</td>
                <td className="px-4 py-2 text-right">{nf(g.eski_tutar)} → <b>{nf(g.yeni_tutar)}</b></td>
                <td className="px-4 py-2 text-muted-foreground">{g.kaynak}</td>
                <td className="px-4 py-2 text-muted-foreground">{g.aciklama || "—"}</td>
              </tr>
            ))}
            {!gecmis.length && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
