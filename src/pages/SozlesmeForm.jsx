import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Loader2, Plus, Trash2, ScrollText } from "lucide-react";
import { num, tl, KDV_OPTS } from "@/lib/hakedisUtils";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

const STATUSES = [
  { value: "taslak", label: "Taslak" },
  { value: "aktif", label: "Aktif" },
  { value: "suresi_dolmak_uzere", label: "Süresi Dolmak Üzere" },
  { value: "suresi_doldu", label: "Süresi Doldu" },
  { value: "iptal", label: "İptal" },
];
const PERIODS = [
  { value: "1", label: "1 Aylık" },
  { value: "2", label: "2 Aylık" },
  { value: "3", label: "3 Aylık" },
  { value: "6", label: "6 Aylık" },
];

const emptyForm = () => ({
  customer_id: "", title: "", contract_type: "", status: "taslak",
  start_date: "", end_date: "",
  contract_value: "", pesin_orani: "", pesin_tutari: "",
  hakedis_start_date: "", installment_count: "", hakedis_period: "1", kdv_durumu: "",
  file_url: "", notes: "", products: [],
});

// Binlik ayrac + tek ondalik virgul; bos ise ""
function fmtMoney(raw) {
  let s = String(raw ?? "").replace(/[^\d,]/g, "");
  const parts = s.split(",");
  let intPart = parts[0].replace(/^0+(?=\d)/, "");
  const dec = parts.length > 1 ? "," + parts.slice(1).join("").slice(0, 2) : "";
  if (intPart === "" && dec === "") return "";
  const grouped = intPart ? Number(intPart).toLocaleString("tr-TR") : "0";
  return grouped + dec;
}

function MoneyInput({ value, onChange, placeholder }) {
  return (
    <Input
      className="mt-1"
      inputMode="decimal"
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(fmtMoney(e.target.value))}
    />
  );
}

export default function SozlesmeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editing = !!id;

  const { data: rows = [] } = useQuery({
    queryKey: ["sozlesmeler-all"],
    queryFn: () => fetch(`${BASE_URL}/api/sozlesmeler`, { credentials: "include" }).then((r) => {
      if (!r.ok) throw new Error("Sözleşmeler alınamadı");
      return r.json();
    }),
    enabled: editing,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.filter({ status: "aktif" }),
  });
  const { data: contractTypes = [] } = useQuery({
    queryKey: ["definitions", "sozlesme_turu"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "sozlesme_turu", is_active: true }),
  });
  const { data: productDefinitions = [] } = useQuery({
    queryKey: ["definitions", "urun"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "urun", is_active: true }),
  });
  const { data: moduleDefinitions = [] } = useQuery({
    queryKey: ["definitions", "modul"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "modul", is_active: true }),
  });

  const [form, setForm] = useState(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [loaded, setLoaded] = useState(!editing);
  const fileRef = useRef();

  useEffect(() => {
    if (!editing || loaded) return;
    const c = rows.find((r) => r.id === id);
    if (!c) return;
    setForm({
      ...emptyForm(),
      ...c,
      contract_value: c.contract_value != null ? tl(c.contract_value) : "",
      pesin_orani: c.pesin_orani != null ? String(c.pesin_orani) : "",
      pesin_tutari: c.pesin_tutari != null ? tl(c.pesin_tutari) : "",
      hakedis_period: c.hakedis_period ? String(c.hakedis_period) : "1",
      kdv_durumu: c.kdv_durumu || "",
      products: c.products ? (typeof c.products === "string" ? JSON.parse(c.products) : c.products) : [],
    });
    setFileName(c.file_url ? c.file_url.split("/").pop() : "");
    setLoaded(true);
  }, [rows, id, editing, loaded]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Pesin oran <-> tutar baglantisi
  const setPesinOrani = (v) => {
    const oran = num(v);
    const amount = num(form.contract_value);
    setForm((f) => ({
      ...f,
      pesin_orani: v,
      pesin_tutari: oran != null && amount ? tl(amount * oran / 100) : f.pesin_tutari,
    }));
  };
  const setPesinTutari = (v) => {
    const tutar = num(v);
    const amount = num(form.contract_value);
    setForm((f) => ({
      ...f,
      pesin_tutari: v,
      pesin_orani: tutar != null && amount ? String(Math.round(tutar / amount * 10000) / 100) : f.pesin_orani,
    }));
  };
  const setContractValue = (v) => {
    const amount = num(v);
    const oran = num(form.pesin_orani);
    setForm((f) => ({
      ...f,
      contract_value: v,
      pesin_tutari: oran != null && amount ? tl(amount * oran / 100) : f.pesin_tutari,
    }));
  };

  // Hakediş aralığı seçilince, Başlangıç/Bitiş tarihleri doluysa taksit
  // sayısını otomatik hesapla (ay farkı / aralık); tarihler yoksa dokunma.
  const setHakedisPeriod = (v) => {
    const period = Number(v) || 1;
    const startStr = form.hakedis_start_date || form.start_date;
    const endStr = form.end_date;
    let installment_count = form.installment_count;
    if (startStr && endStr) {
      const s = new Date(startStr), e = new Date(endStr);
      if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e > s) {
        // Bitiş günü başlangıç gününü GEÇMİŞSE o ay kısmi bir dönem sayılır
        // (01.01–31.12 => 12). Eşitse span zaten tam sayıda aydır (01.01–01.01
        // => tam 1 yıl => 12), ekleme yok.
        const rawMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
        const months = rawMonths + (e.getDate() > s.getDate() ? 1 : 0);
        installment_count = String(Math.max(1, Math.round(months / period)));
      }
    }
    setForm((f) => ({ ...f, hakedis_period: v, installment_count }));
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setFileName(file.name);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      set("file_url", data.url);
    } finally {
      setUploading(false);
    }
  };

  const addProduct = () => set("products", [...(form.products || []), { name: "", value: "", price: "", modules: [] }]);
  const removeProduct = (i) => { const u = [...(form.products || [])]; u.splice(i, 1); set("products", u); };
  const updateProduct = (i, field, value) => { const u = [...(form.products || [])]; u[i] = { ...u[i], [field]: value }; set("products", u); };
  const toggleModule = (i, modValue, modLabel) => {
    const u = [...(form.products || [])];
    const mods = u[i].modules || [], labels = u[i].moduleLabels || [];
    const has = mods.includes(modValue);
    u[i] = {
      ...u[i],
      modules: has ? mods.filter((m) => m !== modValue) : [...mods, modValue],
      moduleLabels: has ? labels.filter((l) => l !== modLabel) : [...labels, modLabel],
    };
    set("products", u);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customer_id: form.customer_id,
        title: form.title.trim(),
        contract_type: form.contract_type || "",
        status: form.status || "taslak",
        start_date: form.start_date || "",
        end_date: form.end_date || "",
        contract_value: num(form.contract_value),
        pesin_orani: num(form.pesin_orani),
        pesin_tutari: num(form.pesin_tutari),
        hakedis_start_date: form.hakedis_start_date || "",
        installment_count: form.installment_count === "" ? null : Number(form.installment_count),
        hakedis_period: Number(form.hakedis_period) || 1,
        kdv_durumu: form.kdv_durumu || "",
        file_url: form.file_url || "",
        notes: form.notes || "",
        products: form.products || [],
      };
      const result = editing
        ? await flowApi.entities.CustomerContract.update(id, payload)
        : await flowApi.entities.CustomerContract.create(payload);
      // Ürün -> customer_modules senkronu
      try {
        const products = payload.products;
        if (payload.customer_id && products.length) {
          const existing = await flowApi.entities.CustomerModule.filter({ customer_id: payload.customer_id });
          const names = new Set((existing || []).map((m) => m.module_name));
          for (const p of products) {
            for (const label of p.moduleLabels || []) {
              if (!names.has(label)) {
                await flowApi.entities.CustomerModule.create({
                  customer_id: payload.customer_id, module_name: label, status: "aktif",
                  notes: `${payload.title || "Sözleşme"} · ${p.name}`,
                });
                names.add(label);
              }
            }
          }
        }
      } catch (e) { console.error("Modül senkron hatası:", e); }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sozlesmeler-all"] });
      queryClient.invalidateQueries({ queryKey: ["hakedisler"] });
      toast.success("Sözleşme kaydedildi");
      navigate("/sozlesmeler");
    },
    onError: (e) => toast.error(e?.message || "Kaydedilemedi"),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.customer_id) { toast.error("Müşteri seçin"); return; }
    if (!form.title.trim()) { toast.error("Başlık zorunlu"); return; }
    saveMutation.mutate();
  };

  const preview = useMemo(() => {
    const amount = num(form.contract_value);
    const n = Number(form.installment_count);
    if (!amount || !n || n < 1) return null;
    const pesin = num(form.pesin_tutari) || (num(form.pesin_orani) ? amount * num(form.pesin_orani) / 100 : 0);
    const base = Math.max(0, amount - (pesin || 0));
    const period = Number(form.hakedis_period) || 1;
    return `${n} taksit × ${tl(base / n)} ₺${pesin ? ` (peşin ${tl(pesin)} ₺ düşülür)` : ""}${period > 1 ? ` · ${period} ay arayla` : ""}${form.hakedis_start_date ? ` · ilk ${form.hakedis_start_date}` : ""}`;
  }, [form.contract_value, form.installment_count, form.pesin_tutari, form.pesin_orani, form.hakedis_period, form.hakedis_start_date]);

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => String(a.company_name || "").localeCompare(String(b.company_name || ""), "tr")),
    [customers]
  );

  return (
    <form onSubmit={submit} className="max-w-4xl mx-auto space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate("/sozlesmeler")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" /> {editing ? "Sözleşmeyi Düzenle" : "Yeni Sözleşme"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/sozlesmeler")}>İptal</Button>
          <Button type="submit" disabled={saveMutation.isPending || uploading}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaydet"}
          </Button>
        </div>
      </div>

      {/* Genel */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Genel</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Müşteri *</Label>
            <Select value={form.customer_id || ""} onValueChange={(v) => set("customer_id", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Müşteri seçin..." /></SelectTrigger>
              <SelectContent>
                {sortedCustomers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Başlık *</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </div>
          <div>
            <Label>Sözleşme Türü</Label>
            <Select value={form.contract_type} onValueChange={(v) => set("contract_type", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seçin..." /></SelectTrigger>
              <SelectContent>
                {contractTypes.map((t) => <SelectItem key={t.id || t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Durum</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Başlangıç Tarihi</Label>
            <Input className="mt-1" type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </div>
          <div>
            <Label>Bitiş Tarihi</Label>
            <Input className="mt-1" type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Finansal & Hakediş */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Finansal & Hakediş</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Sözleşme Tutarı (KDV hariç) ₺</Label>
            <MoneyInput value={form.contract_value} onChange={setContractValue} placeholder="Örn. 1.200.000" />
          </div>
          <div>
            <Label>Peşin Oranı (%)</Label>
            <Input className="mt-1" inputMode="decimal" value={form.pesin_orani}
              onChange={(e) => setPesinOrani(e.target.value.replace(/[^\d,.]/g, ""))} placeholder="Örn. 20" />
          </div>
          <div>
            <Label>Peşin Tutarı ₺</Label>
            <MoneyInput value={form.pesin_tutari} onChange={setPesinTutari} placeholder="Örn. 240.000" />
          </div>
          <div>
            <Label>Hakediş Başlangıç Tarihi</Label>
            <Input className="mt-1" type="date" value={form.hakedis_start_date} onChange={(e) => set("hakedis_start_date", e.target.value)} />
          </div>
          <div>
            <Label>Taksit Sayısı</Label>
            <Input className="mt-1" type="number" min="1" step="1" value={form.installment_count}
              onChange={(e) => set("installment_count", e.target.value)} placeholder="Örn. 12" />
          </div>
          <div>
            <Label>Hakediş Aralığı</Label>
            <Select value={form.hakedis_period} onValueChange={setHakedisPeriod}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>KDV Durumu</Label>
            <Select value={form.kdv_durumu} onValueChange={(v) => set("kdv_durumu", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seçin..." /></SelectTrigger>
              <SelectContent>
                {KDV_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {preview && (
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            Hakediş: {preview}
          </p>
        )}
      </div>

      {/* Ürünler */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Ürünler</p>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addProduct}>
            <Plus className="w-3 h-3" /> Ürün Ekle
          </Button>
        </div>
        {(form.products || []).length === 0 && <p className="text-xs text-muted-foreground">Henüz ürün eklenmedi.</p>}
        <div className="space-y-2">
          {(form.products || []).map((p, i) => {
            const selected = productDefinitions.find((d) => d.label === p.name);
            const prodModules = selected ? moduleDefinitions.filter((m) => m.parent_key === selected.value) : [];
            return (
              <div key={i} className="border border-border/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Select value={p.name} onValueChange={(v) => {
                    const prod = productDefinitions.find((d) => d.label === v);
                    const u = [...(form.products || [])];
                    u[i] = { ...u[i], name: v, value: prod?.value || "", modules: [] };
                    set("products", u);
                  }}>
                    <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Ürün seçin..." /></SelectTrigger>
                    <SelectContent>
                      {productDefinitions.map((d) => <SelectItem key={d.id} value={d.label}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="w-32 h-8 text-sm" placeholder="Fiyat" value={p.price}
                    onChange={(e) => updateProduct(i, "price", e.target.value)} />
                  <button type="button" onClick={() => removeProduct(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {p.name && (
                  <div className="pl-1">
                    <p className="text-xs text-muted-foreground mb-1">Modüller:</p>
                    {prodModules.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Bu ürüne bağlı modül yok.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {prodModules.map((m) => (
                          <label key={m.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input type="checkbox" className="rounded border-border"
                              checked={(p.modules || []).includes(m.value)}
                              onChange={() => toggleModule(i, m.value, m.label)} />
                            {m.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Belge & Not */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Belge & Not</p>
        <div>
          <Label>Sözleşme Dosyası</Label>
          <div className="mt-1 flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={() => fileRef.current.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? "Yükleniyor..." : "Dosya Seç"}
            </Button>
            {fileName && <span className="text-xs text-muted-foreground truncate max-w-[220px]">{fileName}</span>}
          </div>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFile} />
        </div>
        <div>
          <Label>Notlar</Label>
          <Textarea className="mt-1 resize-none" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate("/sozlesmeler")}>İptal</Button>
        <Button type="submit" disabled={saveMutation.isPending || uploading}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
