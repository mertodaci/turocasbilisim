import { useState, useEffect, useRef } from "react";
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { flowApi } from "@/api/flowApiClient";
import { useQuery } from "@tanstack/react-query";
import { Upload, Loader2, Plus, Trash2 } from "lucide-react";

const contractStatuses = [
  { value: "taslak", label: "Taslak" },
  { value: "aktif", label: "Aktif" },
  { value: "suresi_dolmak_uzere", label: "Süresi Dolmak Üzere" },
  { value: "suresi_doldu", label: "Süresi Doldu" },
  { value: "iptal", label: "İptal" },
];

const empty = {
  title: "",
  contract_type: "",
  status: "taslak",
  start_date: "",
  end_date: "",
  file_url: "",
  notes: "",
  products: [],
};

export default function ContractFormDialog({ open, onClose, contract, onSubmit, isLoading }) {
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

  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef();

  useEffect(() => {
    if (open) {
      if (contract) {
        setForm({
          ...empty,
          ...contract,
          products: contract.products ? (typeof contract.products === "string" ? JSON.parse(contract.products) : contract.products) : [],
        });
        setFileName(contract.file_url ? contract.file_url.split("/").pop() : "");
      } else {
        setForm(empty);
        setFileName("");
      }
    }
  }, [contract, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const addProduct = () => {
    set("products", [...(form.products || []), { name: "", value: "", price: "", modules: [] }]);
  };
  const toggleModule = (i, modValue, modLabel) => {
    const updated = [...(form.products || [])];
    const mods = updated[i].modules || [];
    const labels = updated[i].moduleLabels || [];
    const has = mods.includes(modValue);
    updated[i] = {
      ...updated[i],
      modules: has ? mods.filter(m => m !== modValue) : [...mods, modValue],
      moduleLabels: has ? labels.filter(l => l !== modLabel) : [...labels, modLabel],
    };
    set("products", updated);
  };

  const updateProduct = (i, field, value) => {
    const updated = [...(form.products || [])];
    updated[i] = { ...updated[i], [field]: value };
    set("products", updated);
  };

  const removeProduct = (i) => {
    const updated = [...(form.products || [])];
    updated.splice(i, 1);
    set("products", updated);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? "Sözleşmeyi Düzenle" : "Sözleşme Ekle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label>Başlık *</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sözleşme Türü *</Label>
              <Select value={form.contract_type} onValueChange={(v) => set("contract_type", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map((t) => (
                    <SelectItem key={t.id || t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Durum</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractStatuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Başlangıç Tarihi</Label>
              <Input className="mt-1" type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div>
              <Label>Bitiş Tarihi</Label>
              <Input className="mt-1" type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
            </div>
          </div>

          {/* Ürünler */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Ürünler</Label>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addProduct}>
                <Plus className="w-3 h-3" /> Ürün Ekle
              </Button>
            </div>
            {(form.products || []).length === 0 && (
              <p className="text-xs text-muted-foreground">Henüz ürün eklenmedi.</p>
            )}
            <div className="space-y-2">
              {(form.products || []).map((p, i) => {
                const selectedProduct = productDefinitions.find(d => d.label === p.name);
                const productModules = selectedProduct
                  ? moduleDefinitions.filter(m => m.parent_key === selectedProduct.value)
                  : [];
                return (
                <div key={i} className="border border-border/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={p.name} onValueChange={(v) => {
                      const prod = productDefinitions.find(d => d.label === v);
                      const updated = [...(form.products || [])];
                      updated[i] = { ...updated[i], name: v, value: prod?.value || "", modules: [] };
                      set("products", updated);
                    }}>
                      <SelectTrigger className="flex-1 h-8 text-sm">
                        <SelectValue placeholder="Ürün seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {productDefinitions.map((d) => (
                          <SelectItem key={d.id} value={d.label}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-28 h-8 text-sm"
                      placeholder="Fiyat"
                      value={p.price}
                      onChange={(e) => updateProduct(i, "price", e.target.value)}
                    />
                    <button type="button" onClick={() => removeProduct(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {p.name && (
                    <div className="pl-1">
                      <p className="text-xs text-muted-foreground mb-1">Modüller:</p>
                      {productModules.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Bu ürüne bağlı modül yok.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-1">
                          {productModules.map((m) => (
                            <label key={m.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(p.modules || []).includes(m.value)}
                                onChange={() => toggleModule(i, m.value, m.label)}
                                className="rounded border-border"
                              />
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

          <div>
            <Label>Sözleşme Dosyası</Label>
            <div className="mt-1 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={() => fileRef.current.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "Yükleniyor..." : "Dosya Seç"}
              </Button>
              {fileName && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{fileName}</span>}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFile} />
          </div>
          <div>
            <Label>Notlar</Label>
            <Textarea className="mt-1 resize-none" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={isLoading || uploading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : contract ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
