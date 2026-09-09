import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const empty = { full_name: "", title: "", phone: "", email: "", contact_type: "diger", notes: "" };

export default function ContactFormDialog({ open, onClose, onSubmit, isLoading, contact }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    setForm(contact ? { ...empty, ...contact } : empty);
  }, [contact, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? "Kişiyi Düzenle" : "Yeni Kişi Ekle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Ad Soyad *</Label>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required placeholder="Ad Soyad" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ünvan / Pozisyon</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Örn: IT Müdürü" />
            </div>
            <div className="space-y-1.5">
              <Label>Kişi Tipi</Label>
              <Select value={form.contact_type} onValueChange={(v) => set("contact_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anahtar_kullanici">Anahtar Kullanıcı</SelectItem>
                  <SelectItem value="kritik_kullanici">Kritik Kullanıcı</SelectItem>
                  <SelectItem value="karar_verici">Karar Verici</SelectItem>
                  <SelectItem value="teknik_yetkili">Teknik Yetkili</SelectItem>
                  <SelectItem value="diger">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="05xx xxx xx xx" />
            </div>
            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ornek@firma.com" type="email" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ek notlar..." rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Kaydediliyor..." : "Kaydet"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}