import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { flowApi } from "@/api/flowApiClient";

const statusLabels = {
  aktif: "Aktif",
  pasif: "Pasif",
  kurulum_asamasinda: "Kurulum Aşamasında",
  egitim_asamasinda: "Eğitim Aşamasında",
};

export default function ModuleFormDialog({ open, onClose, module: mod, onSubmit, isLoading, contracts = [] }) {
  const [form, setForm] = useState({ module_name: "", status: "aktif", notes: "", contract_id: "" });
  const [customName, setCustomName] = useState(false);

  const { data: moduleDefinitions = [] } = useQuery({
    queryKey: ["definitions", "modul"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "modul", is_active: true }),
  });

  const moduleOptions = moduleDefinitions.map((d) => d.label);

  useEffect(() => {
    if (mod) {
      setForm({ module_name: mod.module_name, status: mod.status || "aktif", notes: mod.notes || "", contract_id: mod.contract_id || "" });
      setCustomName(!moduleOptions.includes(mod.module_name));
    } else {
      setForm({ module_name: "", status: "aktif", notes: "", contract_id: "" });
      setCustomName(false);
    }
  }, [mod, open]);

  const handleModuleSelect = (val) => {
    if (val === "__diger__") {
      setCustomName(true);
      setForm((f) => ({ ...f, module_name: "" }));
    } else {
      setCustomName(false);
      setForm((f) => ({ ...f, module_name: val }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{mod ? "Modülü Düzenle" : "Modül Ekle"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {!customName ? (
            <div className="space-y-1.5">
              <Label>Modül Adı *</Label>
              <Select value={form.module_name} onValueChange={handleModuleSelect}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Modül seçiniz" /></SelectTrigger>
                <SelectContent>
                  {moduleOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  <SelectItem value="__diger__">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Modül Adı *</Label>
              <Input
                value={form.module_name}
                onChange={(e) => setForm((f) => ({ ...f, module_name: e.target.value }))}
                placeholder="Modül adı yazın"
                className="rounded-xl"
              />
              <button className="text-xs text-primary hover:underline" onClick={() => setCustomName(false)}>
                Listeden seç
              </button>
            </div>
          )}

          {contracts.length > 0 && (
            <div className="space-y-1.5">
              <Label>Sözleşme</Label>
              <Select value={form.contract_id || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, contract_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sözleşme seçin (opsiyonel)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sözleşmeye bağlama</SelectItem>
                  {contracts.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Opsiyonel not"
              className="rounded-xl text-sm"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>İptal</Button>
            <Button
              className="flex-1 rounded-xl"
              disabled={!form.module_name || isLoading}
              onClick={() => onSubmit({ ...form, ...(mod ? { id: mod.id } : {}) })}
            >
              {isLoading ? "Kaydediliyor..." : mod ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
