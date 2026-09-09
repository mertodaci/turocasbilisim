import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Users, Pencil, IdCard, LogOut, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const nf = (v) => (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "Tutarsız" = kritik özlük/ücret alanı eksik
const tutarsizMi = (p) => !p.tc || !p.sube_id || !p.hire_date || !(Number(p.aylik_ucret) > 0);

export default function IkPersonel() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("aktif");
  const [q, setQ] = useState("");
  const [subeFilter, setSubeFilter] = useState("");
  const [kart, setKart] = useState(null);          // düzenlenen personel
  const [cikisFor, setCikisFor] = useState(null);  // çıkış modalı personeli
  const [form, setForm] = useState({});
  const [cikisForm, setCikisForm] = useState({ exit_date: "", exit_reason: "", exit_notes: "" });

  const { data: personeller = [], isLoading } = useQuery({
    queryKey: ["ik_personel_full"],
    queryFn: () => flowApi.entities.Employee.list("full_name", 8000),
  });
  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const { data: bolumler = [] } = useQuery({ queryKey: ["ik_bolumler_min"], queryFn: () => flowApi.entities.IkBolum.list("ad", 3000) });

  const subeAdi = (id) => subeler.find((s) => s.id === id)?.ad || "";
  const bolumAdi = (id) => bolumler.find((b) => b.id === id)?.ad || "";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ik_personel_full"] });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Employee.update(id, data),
    onSuccess: async (_r, v) => { try { await flowApi.ik.ucretSenkron(v.id); } catch (e) { /* opsiyonel */ } invalidate(); setKart(null); toast.success("Güncellendi"); },
    onError: (e) => toast.error("Güncellenemedi: " + (e?.message || "hata")),
  });
  const cikisMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.ik.cikisVer(id, data),
    onSuccess: () => { invalidate(); setCikisFor(null); toast.success("Çıkış işlendi"); },
    onError: (e) => toast.error(String(e?.message || "İşlenemedi")),
  });

  const filtered = useMemo(() => personeller.filter((p) => {
    if (p.app_role === "musteri" || p.is_deleted === 1) return false;
    const cikisli = p.status === "pasif" || !!p.exit_date;
    if (tab === "aktif" && cikisli) return false;
    if (tab === "cikis" && !cikisli) return false;
    if (tab === "tutarsiz" && !tutarsizMi(p)) return false;
    if (subeFilter && p.sube_id !== subeFilter) return false;
    if (q && !`${p.full_name} ${p.tc} ${p.meslek_kodu} ${p.position}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [personeller, tab, subeFilter, q]);

  const openKart = (p) => {
    setForm({
      full_name: p.full_name || "", tc: p.tc || "", phone: p.phone || "", personel_adresi: p.personel_adresi || "",
      birth_date: p.birth_date || "", hire_date: p.hire_date || "", emekli_mi: p.emekli_mi ?? 0,
      sube_id: p.sube_id || "", bolum_id: p.bolum_id || "", meslek_kodu: p.meslek_kodu || "", kanun_no: p.kanun_no || "",
      position: p.position || "", vip_mi: p.vip_mi ?? 0,
      aylik_ucret: p.aylik_ucret ?? 0, ticket_aylik: p.ticket_aylik ?? 0,
      sahsi_hesap_aktif: p.sahsi_hesap_aktif ?? 0, sahsi_hesap_tutar: p.sahsi_hesap_tutar ?? 0,
      sahsi_hesap_banka: p.sahsi_hesap_banka || "", sahsi_hesap_iban: p.sahsi_hesap_iban || "", sahsi_hesap_aciklama: p.sahsi_hesap_aciklama || "",
    });
    setKart(p);
  };
  const kaydet = () => {
    if (!form.full_name.trim()) { toast.error("Ad soyad zorunlu"); return; }
    const data = {
      ...form,
      sube_adi: subeAdi(form.sube_id) || null, bolum_adi: bolumAdi(form.bolum_id) || null,
      aylik_ucret: Number(form.aylik_ucret) || 0, ticket_aylik: Number(form.ticket_aylik) || 0,
      sahsi_hesap_tutar: Number(form.sahsi_hesap_tutar) || 0,
      emekli_mi: form.emekli_mi ? 1 : 0, vip_mi: form.vip_mi ? 1 : 0, sahsi_hesap_aktif: form.sahsi_hesap_aktif ? 1 : 0,
    };
    updateMutation.mutate({ id: kart.id, data });
  };

  const saatlik = (Number(form.aylik_ucret) || 0) / 225;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Personel Listesi / Kartı</h1>
          <p className="text-sm text-muted-foreground mt-1">Özlük, görev/organizasyon ve ücret bilgileri. Aylık ücret girildiğinde saatlik (÷225) ve dakikalık türetilir; bordro ve mesai hesabında kullanılır.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {[["aktif", "Aktif"], ["cikis", "Çıkışı Yapılanlar"], ["tutarsiz", "Tutarsız Kayıtlar"]].map(([k, l]) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>{l}</Button>
        ))}
        <Select value={subeFilter || "hepsi"} onValueChange={(v) => setSubeFilter(v === "hepsi" ? "" : v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Şube" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hepsi">Tüm Şubeler</SelectItem>
            {subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="max-w-xs ml-auto" placeholder="Ad / TC / meslek ara" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"><Users className="w-8 h-8 opacity-40" /><p>Kayıt yok.</p></div>
        ) : (
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ad Soyad</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Şube / Bölüm</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Meslek / Görev</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">İşe Giriş</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Aylık Ücret</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium flex items-center gap-1.5">
                      {p.full_name}
                      {tutarsizMi(p) && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title="Eksik özlük/ücret bilgisi" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.tc || "TC yok"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{subeAdi(p.sube_id) || "—"}{p.bolum_id ? ` · ${bolumAdi(p.bolum_id)}` : ""}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.meslek_kodu || p.position || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.hire_date || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{Number(p.aylik_ucret) > 0 ? `${nf(p.aylik_ucret)} ₺` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Personel Kartı" onClick={() => openKart(p)}><IdCard className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Düzenle" onClick={() => openKart(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      {!(p.status === "pasif" || p.exit_date) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Çıkış Ver"
                          onClick={() => { setCikisForm({ exit_date: new Date().toISOString().slice(0, 10), exit_reason: "", exit_notes: "" }); setCikisFor(p); }}>
                          <LogOut className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Personel Kartı / Düzenle */}
      <Dialog open={!!kart} onOpenChange={(v) => !v && setKart(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{kart?.full_name} — Personel Kartı</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 max-h-[72vh] overflow-y-auto pr-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kimlik & İletişim</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">Ad Soyad *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">TC Kimlik No</Label><Input maxLength={11} value={form.tc} onChange={(e) => setForm({ ...form, tc: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Doğum Tarihi</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
              <div className="col-span-2"><Label className="mb-1 block text-xs">Adres</Label><Textarea rows={2} value={form.personel_adresi} onChange={(e) => setForm({ ...form, personel_adresi: e.target.value })} /></div>
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Görev & Organizasyon</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">İşe Giriş Tarihi</Label><Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} /></div>
              <div>
                <Label className="mb-1 block text-xs">Şube</Label>
                <SearchableSelect value={form.sube_id} onChange={(v) => setForm({ ...form, sube_id: v })}
                  options={[{ value: "", label: "— Yok" }, ...subeler.map((s) => ({ value: s.id, label: s.ad }))]} placeholder="Şube" fixDialogWheelScroll />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Bölüm</Label>
                <SearchableSelect value={form.bolum_id} onChange={(v) => setForm({ ...form, bolum_id: v })}
                  options={[{ value: "", label: "— Yok" }, ...bolumler.filter((b) => !form.sube_id || !b.sube_id || b.sube_id === form.sube_id).map((b) => ({ value: b.id, label: b.ad }))]} placeholder="Bölüm" fixDialogWheelScroll />
              </div>
              <div><Label className="mb-1 block text-xs">Meslek Kodu (SGK)</Label><Input value={form.meslek_kodu} onChange={(e) => setForm({ ...form, meslek_kodu: e.target.value })} placeholder="örn: 4225.03" /></div>
              <div><Label className="mb-1 block text-xs">Görev / Ünvan</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Kanun No (SGK teşvik)</Label><Input value={form.kanun_no} onChange={(e) => setForm({ ...form, kanun_no: e.target.value })} /></div>
              <div className="flex items-center gap-3 pt-5"><Switch checked={!!form.emekli_mi} onCheckedChange={(v) => setForm({ ...form, emekli_mi: v ? 1 : 0 })} /><Label className="text-xs">Emekli</Label></div>
              <div className="flex items-center gap-3 pt-1"><Switch checked={!!form.vip_mi} onCheckedChange={(v) => setForm({ ...form, vip_mi: v ? 1 : 0 })} /><Label className="text-xs">VIP (QR/puantaj muaf — tam gün sayılır)</Label></div>
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ücret & Şahsi Hesap</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="mb-1 block text-xs">Aylık Ücret (₺)</Label><Input type="number" value={form.aylik_ucret} onChange={(e) => setForm({ ...form, aylik_ucret: e.target.value })} /></div>
              <div><Label className="mb-1 block text-xs">Saatlik (türetilir)</Label><Input disabled value={saatlik ? saatlik.toFixed(2) : "0.00"} /></div>
              <div><Label className="mb-1 block text-xs">Ticket Aylık (₺)</Label><Input type="number" value={form.ticket_aylik} onChange={(e) => setForm({ ...form, ticket_aylik: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-3"><Switch checked={!!form.sahsi_hesap_aktif} onCheckedChange={(v) => setForm({ ...form, sahsi_hesap_aktif: v ? 1 : 0 })} /><Label className="text-xs">Şahsi hesap kullan (ayrı banka hesabına ödenen bileşen)</Label></div>
            {!!form.sahsi_hesap_aktif && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="mb-1 block text-xs">Aylık Şahsi Hesap (₺)</Label><Input type="number" value={form.sahsi_hesap_tutar} onChange={(e) => setForm({ ...form, sahsi_hesap_tutar: e.target.value })} /></div>
                <div><Label className="mb-1 block text-xs">Banka</Label><Input value={form.sahsi_hesap_banka} onChange={(e) => setForm({ ...form, sahsi_hesap_banka: e.target.value })} /></div>
                <div className="col-span-2"><Label className="mb-1 block text-xs">IBAN</Label><Input value={form.sahsi_hesap_iban} onChange={(e) => setForm({ ...form, sahsi_hesap_iban: e.target.value })} /></div>
                <div className="col-span-2"><Label className="mb-1 block text-xs">Açıklama</Label><Input value={form.sahsi_hesap_aciklama} onChange={(e) => setForm({ ...form, sahsi_hesap_aciklama: e.target.value })} /></div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setKart(null)}>İptal</Button>
              <Button onClick={kaydet} disabled={updateMutation.isPending}>{updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Çıkış Ver */}
      <Dialog open={!!cikisFor} onOpenChange={(v) => !v && setCikisFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Çıkış Ver — {cikisFor?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">Personel pasife alınır; puantaj/bordro dönemlerinde çıkış tarihinden sonrası hesaplanmaz.</p>
            <div><Label className="mb-1.5 block">Çıkış Tarihi *</Label><Input type="date" value={cikisForm.exit_date} onChange={(e) => setCikisForm({ ...cikisForm, exit_date: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Çıkış Nedeni</Label><Input value={cikisForm.exit_reason} onChange={(e) => setCikisForm({ ...cikisForm, exit_reason: e.target.value })} placeholder="istifa / fesih / …" /></div>
            <div><Label className="mb-1.5 block">Not</Label><Textarea rows={2} value={cikisForm.exit_notes} onChange={(e) => setCikisForm({ ...cikisForm, exit_notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setCikisFor(null)}>İptal</Button>
              <Button variant="destructive" disabled={cikisMutation.isPending || !cikisForm.exit_date}
                onClick={() => cikisMutation.mutate({ id: cikisFor.id, data: cikisForm })}>
                {cikisMutation.isPending ? "İşleniyor..." : "Çıkış Ver"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
