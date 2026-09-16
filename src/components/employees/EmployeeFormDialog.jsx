import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { flowApi } from "@/api/flowApiClient";
import isEqual from "lodash/isEqual";
import { Camera, Loader2, Paperclip, X, Upload } from "lucide-react";
import { useLeaveBalance } from "@/hooks/useLeaveBalance";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/lib/RolePermissionsContext";
import { formatTrPhone } from "@/lib/utils";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

const roleOptions = [
  { value: "kullanici", label: "Calisan" },
  { value: "yonetici", label: "Yonetici" },
  { value: "admin", label: "Admin" },
];

const emptyForm = {
  full_name: "", tc: "", card_uid: "", birth_date: "", hire_date: "", next_leave_entitlement_date: "", gender: "",
  uyruk: "Türkiye",
  department: "", position: "", app_role: "",
  phone: "", email: "", avatar_url: "", show_in_job_tracking: false,
  emergency_contacts: [],
  manager_id: "", manager_name: "",
  education_level: "", highest_education: "",
  university: "", education_department: "", graduation_date: "",
  education_history: [],
  education_documents: [],
  certificates: [],
  // Özlük & Ücret (Bordro) — employees tablosunda tutulur, ayrı ekran yok
  sube_id: "", bolum_id: "", meslek_kodu: "", kanun_no: "", emekli_mi: 0,
  personel_adresi: "",
  aylik_ucret: 0, ticket_aylik: 0,
  sahsi_hesap_aktif: 0, sahsi_hesap_tutar: 0, sahsi_hesap_banka: "", sahsi_hesap_iban: "", sahsi_hesap_aciklama: "",
};

export default function EmployeeFormDialog({ open, onOpenChange, onClose, employee, onSubmit, isLoading, embedded = false }) {
  const [form, setForm] = useState(emptyForm);
  const [formBaseline, setFormBaseline] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("kisisel");

  const { user } = useAuth();
  const { can } = useRolePermissions();
  // Maas alani (Aylik Ucret) yetki bazli: admin/yonetici her zaman gorur/duzenler,
  // digerleri icin ozel bordro-personel yetkisi araniyor (bkz. #1039).
  const canViewSalary = user?.role === "admin" || user?.role === "yonetici" || can(user?.role, "ikb_personel", "view");
  const canEditSalary = user?.role === "admin" || user?.role === "yonetici" || can(user?.role, "ikb_personel", "edit");

  const { remaining: leaveBalance, used: leaveUsed, entitled: leaveEntitled, hasHireDate } = useLeaveBalance(employee);

  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees_for_manager"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  const { data: positionOptions = [] } = useQuery({
    queryKey: ["definitions", "pozisyon"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "pozisyon", is_active: true }),
  });

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ["definitions", "departman"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "departman", is_active: true }),
  });

  const { data: educationLevelOptions = [] } = useQuery({
    queryKey: ["definitions", "egitim_seviyesi"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "egitim_seviyesi", is_active: true }),
  });

  const { data: subeler = [] } = useQuery({ queryKey: ["ik_subeler_min"], queryFn: () => flowApi.entities.IkSube.list("ad", 2000) });
  const { data: bolumler = [] } = useQuery({ queryKey: ["ik_bolumler_min"], queryFn: () => flowApi.entities.IkBolum.list("ad", 3000) });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingCertIdx, setUploadingCertIdx] = useState(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const certInputRefs = useRef({});

  useEffect(() => {
    if (open || embedded) setActiveTab("kisisel");
  }, [open, embedded, employee]);

  useEffect(() => {
    if (employee) {
      const next = {
        full_name: employee.full_name || "",
        tc: employee.tc || "",
        card_uid: employee.card_uid || "",
        birth_date: employee.birth_date || "",
        hire_date: employee.hire_date || "",
        gender: employee.gender || "",
        uyruk: employee.uyruk || "Türkiye",
        department: employee.department || "",
        position: employee.position || "",
        app_role: employee.app_role || "",
        show_in_job_tracking: employee.show_in_job_tracking === 1 || employee.show_in_job_tracking === true,
        emergency_contacts: employee.emergency_contacts || [],
        phone: employee.phone || "",
        email: employee.email || "",
        avatar_url: employee.avatar_url || "",
        next_leave_entitlement_date: employee.next_leave_entitlement_date || "",
        manager_id: employee.manager_id || "",
        manager_name: employee.manager_name || "",
        education_level: employee.education_level || "",
        highest_education: employee.highest_education || "",
        university: employee.university || "",
        education_department: employee.education_department || "",
        graduation_date: employee.graduation_date || "",
        education_history: employee.education_history?.length
          ? employee.education_history
          : (employee.university ? [{ university: employee.university, department: employee.education_department || "", graduation_date: employee.graduation_date || "" }] : []),
        education_documents: employee.education_documents || [],
        certificates: employee.certificates || [],
        sube_id: employee.sube_id || "",
        bolum_id: employee.bolum_id || "",
        meslek_kodu: employee.meslek_kodu || "",
        kanun_no: employee.kanun_no || "",
        emekli_mi: employee.emekli_mi ?? 0,
        personel_adresi: employee.personel_adresi || "",
        aylik_ucret: employee.aylik_ucret ?? 0,
        ticket_aylik: employee.ticket_aylik ?? 0,
        sahsi_hesap_aktif: employee.sahsi_hesap_aktif ?? 0,
        sahsi_hesap_tutar: employee.sahsi_hesap_tutar ?? 0,
        sahsi_hesap_banka: employee.sahsi_hesap_banka || "",
        sahsi_hesap_iban: employee.sahsi_hesap_iban || "",
        sahsi_hesap_aciklama: employee.sahsi_hesap_aciklama || "",
      };
      setForm(next);
      setFormBaseline(next);
    } else {
      setForm(emptyForm);
      setFormBaseline(emptyForm);
    }
  }, [employee, open]);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error('Dosya yuklenemedi');
    const data = await res.json();
    return data.url;
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadFile(file);
      setForm((prev) => ({ ...prev, avatar_url: `${BASE_URL}${url}` }));
    } catch (err) {
      alert('Fotograf yuklenemedi: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDocUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingDoc(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const url = await uploadFile(file);
          return { name: file.name, url: `${BASE_URL}${url}` };
        })
      );
      setForm((prev) => ({ ...prev, education_documents: [...(prev.education_documents || []), ...uploaded] }));
    } catch (err) {
      alert('Belge yuklenemedi: ' + err.message);
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const removeDoc = (idx) => {
    setForm((prev) => ({ ...prev, education_documents: prev.education_documents.filter((_, i) => i !== idx) }));
  };

  const handleCertDocUpload = async (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCertIdx(idx);
    try {
      const url = await uploadFile(file);
      setForm((prev) => {
        const updated = [...prev.certificates];
        updated[idx] = { ...updated[idx], document_url: `${BASE_URL}${url}`, document_name: file.name };
        return { ...prev, certificates: updated };
      });
    } catch (err) {
      alert('Belge yuklenemedi: ' + err.message);
    } finally {
      setUploadingCertIdx(null);
      e.target.value = "";
    }
  };
  // Zorunlu alan kontrolu: hangi tab'da eksik oldugunu bulup oraya gecirir +
  // net bir mesaj gosterir -- oncesinde Kaydet butonu sessizce disabled
  // kaliyordu, kullanici hangi alanin eksik oldugunu tab'lar arasinda
  // gezerek bulmak zorunda kaliyordu (bkz. #1036).
  const getValidationError = () => {
    if (!form.full_name.trim()) return { tab: "kisisel", message: "Ad Soyad zorunlu" };
    const turkiyeMi = (form.uyruk || "").trim().toLocaleLowerCase("tr") === "türkiye";
    if (turkiyeMi && !/^[0-9]{11}$/.test(form.tc || "")) return { tab: "kisisel", message: "TC Kimlik No zorunlu ve 11 haneli olmalı" };
    if (!form.birth_date) return { tab: "kisisel", message: "Doğum Tarihi zorunlu" };
    if (!form.department) return { tab: "kisisel", message: "Departman zorunlu" };
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = getValidationError();
    if (err) { setActiveTab(err.tab); toast.error(err.message); return; }
    const payload = { ...form, show_in_job_tracking: form.show_in_job_tracking ? 1 : 0 };
    if (form.education_history && form.education_history.length > 0) {
      payload.university = form.education_history[0].university || "";
      payload.education_department = form.education_history[0].department || "";
      payload.graduation_date = form.education_history[0].graduation_date || "";
    }
    // Özlük & Ücret — sayısallaştır + saatlik/dakikalık türet (aylık/225, /60). Bordro & mesai bunları kullanır.
    payload.aylik_ucret = Number(form.aylik_ucret) || 0;
    payload.saatlik_ucret = payload.aylik_ucret > 0 ? +(payload.aylik_ucret / 225).toFixed(6) : 0;
    payload.dakikalik_ucret = payload.saatlik_ucret > 0 ? +(payload.saatlik_ucret / 60).toFixed(6) : 0;
    payload.ticket_aylik = Number(form.ticket_aylik) || 0;
    payload.sahsi_hesap_tutar = Number(form.sahsi_hesap_tutar) || 0;
    payload.emekli_mi = form.emekli_mi ? 1 : 0;
    payload.sahsi_hesap_aktif = form.sahsi_hesap_aktif ? 1 : 0;
    onSubmit(payload);
  };

  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };

  const isDirty = !isEqual(form, formBaseline);

  const formBody = (
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">

          {/* Profil Fotografi — sekmelerin üstünde sabit, kimlik kartı gibi */}
          <div className="flex items-center gap-5 p-4 bg-muted/30 rounded-xl border border-border/50 shrink-0">
            <div
              className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingPhoto ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : form.avatar_url ? (
                <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">{form.full_name || "Calisan Adi"}</p>
              <p className="text-xs text-muted-foreground mb-2">{form.position || form.department || "Pozisyon / Departman"}</p>
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => fileInputRef.current?.click()}>
                {form.avatar_url ? "Fotografı Degistir" : "Fotograf Yukle"}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 flex-1 mt-4">
            <TabsList className="w-full grid grid-cols-5 shrink-0">
              <TabsTrigger value="kisisel">Kişisel</TabsTrigger>
              <TabsTrigger value="iletisim">İletişim Bilgileri</TabsTrigger>
              <TabsTrigger value="is">İş</TabsTrigger>
              <TabsTrigger value="egitim">Eğitim</TabsTrigger>
              <TabsTrigger value="ozluk">Özlük & Bordro</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto mt-3 pr-1">
            <TabsContent value="kisisel" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5 block">Ad Soyad *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Ad Soyad" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1.5 block">Uyruk</Label>
                  <Input value={form.uyruk} onChange={(e) => setForm({ ...form, uyruk: e.target.value })} placeholder="Türkiye" />
                </div>
                <div>
                  <Label className="mb-1.5 block">TC Kimlik No{(form.uyruk || "").trim().toLocaleLowerCase("tr") === "türkiye" ? " *" : ""}</Label>
                  <Input value={form.tc} onChange={(e) => setForm({ ...form, tc: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="12345678901" maxLength={11} />
                </div>
                <div>
                  <Label className="mb-1.5 block">Doğum Tarihi *</Label>
                  <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1.5 block">Cinsiyet</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Seciniz" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="erkek">Erkek</SelectItem>
                      <SelectItem value="kadin">Kadin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Departman *</Label>
                  <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                    <SelectTrigger><SelectValue placeholder="Seciniz" /></SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((d) => (
                        <SelectItem key={d.id} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Kart ID</Label>
                  <Input value={form.card_uid} onChange={(e) => setForm({ ...form, card_uid: e.target.value.trim().toUpperCase() })} placeholder="Örn: E9632487" />
                </div>
              </div>
            </div>
            </TabsContent>

            <TabsContent value="iletisim" className="mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Telefon</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatTrPhone(e.target.value) })} placeholder="0(5xx) xxx xx xx" />
                </div>
                <div>
                  <Label className="mb-1.5 block">E-posta</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ornek@firma.com" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Adres</Label>
                <Input value={form.personel_adresi} onChange={(e) => setForm({ ...form, personel_adresi: e.target.value })} />
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2 mt-3">
                  <Label>Acil Durumda Ulaşılacak Kişiler</Label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, emergency_contacts: [...(form.emergency_contacts || []), { relation: "", full_name: "", phone: "", order: (form.emergency_contacts || []).length + 1 }] })}
                    className="text-xs text-primary hover:underline"
                  >
                    + Kişi Ekle
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.emergency_contacts || []).map((kisi, idx) => (
                    <div key={idx} className="border border-border/50 rounded-xl p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">{idx + 1}. Kişi</span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, emergency_contacts: form.emergency_contacts.filter((_, i) => i !== idx) })}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="mb-1 block text-xs text-muted-foreground">Yakınlık Derecesi</Label>
                          <Input
                            placeholder="ör. Eşi, Kardeşi"
                            value={kisi.relation}
                            onChange={(e) => {
                              const updated = [...form.emergency_contacts];
                              updated[idx] = { ...updated[idx], relation: e.target.value };
                              setForm({ ...form, emergency_contacts: updated });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs text-muted-foreground">Adı Soyadı</Label>
                          <Input
                            value={kisi.full_name}
                            onChange={(e) => {
                              const updated = [...form.emergency_contacts];
                              updated[idx] = { ...updated[idx], full_name: e.target.value };
                              setForm({ ...form, emergency_contacts: updated });
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="mb-1 block text-xs text-muted-foreground">Telefon Numarası</Label>
                          <Input
                            placeholder="0(5xx) xxx xx xx"
                            value={kisi.phone}
                            onChange={(e) => {
                              const updated = [...form.emergency_contacts];
                              updated[idx] = { ...updated[idx], phone: formatTrPhone(e.target.value) };
                              setForm({ ...form, emergency_contacts: updated });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs text-muted-foreground">Sıra Numarası (öncelik)</Label>
                          <Input
                            type="number" min="1"
                            value={kisi.order || ""}
                            onChange={(e) => {
                              const updated = [...form.emergency_contacts];
                              updated[idx] = { ...updated[idx], order: e.target.value };
                              setForm({ ...form, emergency_contacts: updated });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!form.emergency_contacts || form.emergency_contacts.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">Henüz acil durum kişisi eklenmedi.</p>
                  )}
                </div>
              </div>
            </div>
            </TabsContent>

            <TabsContent value="is" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label className="mb-1.5 block">Pozisyon / Unvan</Label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                  <SelectTrigger><SelectValue placeholder="Seciniz" /></SelectTrigger>
                  <SelectContent>
                    {positionOptions.map((p) => (
                      <SelectItem key={p.id} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Bagli Oldugu Yonetici</Label>
                <Select
                  value={form.manager_id || "none"}
                  onValueChange={(v) => {
                    if (v === "none") {
                      setForm({ ...form, manager_id: "", manager_name: "" });
                    } else {
                      const mgr = allEmployees.find((e) => e.id === v);
                      setForm({ ...form, manager_id: v, manager_name: mgr?.full_name || "" });
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Yonetici seciniz (opsiyonel)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Secilmedi</SelectItem>
                    {allEmployees
                      .filter((e) => !employee || e.id !== employee.id)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Ise Baslama Tarihi</Label>
                <Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <Checkbox
                  checked={form.show_in_job_tracking}
                  onCheckedChange={(v) => setForm({ ...form, show_in_job_tracking: v === true })}
                />
                <span className="text-sm">İş Takibi kullanıyor (bilet sorumlusu olarak seçilebilir)</span>
              </label>

              {employee && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="mb-1.5 block">Izin Bakiyesi</Label>
                    <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                      {hasHireDate ? (
                        <span className={`font-semibold ${leaveBalance < 0 ? "text-red-600" : leaveBalance <= 3 ? "text-orange-500" : "text-green-600"}`}>
                          {leaveBalance} gun
                          <span className="text-muted-foreground font-normal ml-1.5">({leaveUsed || 0} / {leaveEntitled} kullanildi)</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Tanim yok</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Sonraki Izin Hak Edis Tarihi</Label>
                    <Input type="date" value={form.next_leave_entitlement_date} onChange={(e) => setForm({ ...form, next_leave_entitlement_date: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
            </TabsContent>

            <TabsContent value="egitim" className="mt-0">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Egitim Durumu</Label>
                  <Select value={form.education_level} onValueChange={(v) => setForm({ ...form, education_level: v })}>
                    <SelectTrigger><SelectValue placeholder="Seciniz" /></SelectTrigger>
                    <SelectContent>
                      {educationLevelOptions.map((o) => (
                        <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">En Yuksek Egitim</Label>
                  <Select value={form.highest_education} onValueChange={(v) => setForm({ ...form, highest_education: v })}>
                    <SelectTrigger><SelectValue placeholder="Seciniz" /></SelectTrigger>
                    <SelectContent>
                      {educationLevelOptions.map((o) => (
                        <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Universite Bilgileri</Label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, education_history: [...(form.education_history || []), { university: "", department: "", graduation_date: "", gpa: "" }] })}
                    className="text-xs text-primary hover:underline"
                  >
                    + Universite Ekle
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.education_history || []).map((edu, idx) => (
                    <div key={idx} className="border border-border/50 rounded-xl p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">{idx + 1}. Universite</span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, education_history: form.education_history.filter((_, i) => i !== idx) })}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Üniversite</Label>
                        <Input
                          placeholder="Universite adi"
                          value={edu.university}
                          onChange={(e) => {
                            const updated = [...form.education_history];
                            updated[idx] = { ...updated[idx], university: e.target.value };
                            setForm({ ...form, education_history: updated });
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="mb-1 block text-xs text-muted-foreground">Bölüm</Label>
                          <Input
                            placeholder="Bolum adi"
                            value={edu.department}
                            onChange={(e) => {
                              const updated = [...form.education_history];
                              updated[idx] = { ...updated[idx], department: e.target.value };
                              setForm({ ...form, education_history: updated });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs text-muted-foreground">Mezuniyet Tarihi</Label>
                          <Input
                            type="date"
                            value={edu.graduation_date}
                            onChange={(e) => {
                              const updated = [...form.education_history];
                              updated[idx] = { ...updated[idx], graduation_date: e.target.value };
                              setForm({ ...form, education_history: updated });
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Mezuniyet Not Ortalaması</Label>
                        <Input
                          type="number" step="0.01" min="0" max="4" placeholder="örn. 3.24"
                          value={edu.gpa || ""}
                          onChange={(e) => {
                            const updated = [...form.education_history];
                            updated[idx] = { ...updated[idx], gpa: e.target.value };
                            setForm({ ...form, education_history: updated });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!form.education_history || form.education_history.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">Henuz universite eklenmedi.</p>
                  )}
                </div>
              </div>

              {/* Sertifikalar & Eğitimler */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Sertifikalar & Eğitimler</Label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, certificates: [...(form.certificates || []), { name: "", institution: "", date: "", document_url: "", document_name: "" }] })}
                    className="text-xs text-primary hover:underline"
                  >
                    + Sertifika/Eğitim Ekle
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.certificates || []).map((cert, idx) => (
                    <div key={idx} className="border border-border/50 rounded-xl p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">{idx + 1}. Sertifika/Eğitim</span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, certificates: form.certificates.filter((_, i) => i !== idx) })}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Input
                        placeholder="Sertifika / eğitim adı"
                        value={cert.name}
                        onChange={(e) => {
                          const updated = [...form.certificates];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setForm({ ...form, certificates: updated });
                        }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Kurum"
                          value={cert.institution}
                          onChange={(e) => {
                            const updated = [...form.certificates];
                            updated[idx] = { ...updated[idx], institution: e.target.value };
                            setForm({ ...form, certificates: updated });
                          }}
                        />
                        <Input
                          type="date"
                          value={cert.date}
                          onChange={(e) => {
                            const updated = [...form.certificates];
                            updated[idx] = { ...updated[idx], date: e.target.value };
                            setForm({ ...form, certificates: updated });
                          }}
                        />
                      </div>
                      {cert.document_url ? (
                        <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <a href={cert.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-1 truncate">{cert.document_name || "Belge"}</a>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...form.certificates];
                              updated[idx] = { ...updated[idx], document_url: "", document_name: "" };
                              setForm({ ...form, certificates: updated });
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => certInputRefs.current[idx]?.click()}
                          disabled={uploadingCertIdx === idx}
                          className="flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-50"
                        >
                          {uploadingCertIdx === idx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          {uploadingCertIdx === idx ? "Yukleniyor..." : "Belge Ekle"}
                        </button>
                      )}
                      <input
                        ref={(el) => { certInputRefs.current[idx] = el; }}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => handleCertDocUpload(idx, e)}
                      />
                    </div>
                  ))}
                  {(!form.certificates || form.certificates.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">Henuz sertifika/eğitim eklenmedi.</p>
                  )}
                </div>
              </div>

              {/* Belgeler */}
              <div>
                <Label className="mb-1.5 block">Belgeler</Label>
                {form.education_documents?.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {form.education_documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                        <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-1 truncate">{doc.name}</a>
                        <button type="button" onClick={() => removeDoc(idx)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => docInputRef.current?.click()} disabled={uploadingDoc} className="flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-50">
                  {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingDoc ? "Yukleniyor..." : "Belge Ekle"}
                </button>
                <input ref={docInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleDocUpload} />
              </div>
            </div>
            </TabsContent>

            <TabsContent value="ozluk" className="mt-0">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">Şube / Lokasyon</Label>
                  <Select value={form.sube_id || "none"} onValueChange={(v) => setForm({ ...form, sube_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Seciniz" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Secilmedi</SelectItem>
                      {subeler.map((s) => <SelectItem key={s.id} value={s.id}>{s.ad}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Bölüm</Label>
                  <Select value={form.bolum_id || "none"} onValueChange={(v) => setForm({ ...form, bolum_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Seciniz" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Secilmedi</SelectItem>
                      {bolumler.filter((b) => !form.sube_id || !b.sube_id || b.sube_id === form.sube_id).map((b) => <SelectItem key={b.id} value={b.id}>{b.ad}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Meslek Kodu (SGK)</Label>
                  <Input value={form.meslek_kodu} onChange={(e) => setForm({ ...form, meslek_kodu: e.target.value })} placeholder="örn: 4225.03" />
                </div>
                <div>
                  <Label className="mb-1.5 block">Kanun No (SGK teşvik)</Label>
                  <Input value={form.kanun_no} onChange={(e) => setForm({ ...form, kanun_no: e.target.value })} />
                </div>
              </div>
              {canViewSalary && (
                <div>
                  <Label className="mb-1.5 block">Aylık Ücret (₺)</Label>
                  <Input type="number" disabled={!canEditSalary} value={form.aylik_ucret} onChange={(e) => setForm({ ...form, aylik_ucret: e.target.value })} />
                </div>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.emekli_mi} onCheckedChange={(v) => setForm({ ...form, emekli_mi: v ? 1 : 0 })} /> Emekli</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.sahsi_hesap_aktif} onCheckedChange={(v) => setForm({ ...form, sahsi_hesap_aktif: v ? 1 : 0 })} /> Şahsi hesap kullan</label>
              </div>
              {!!form.sahsi_hesap_aktif && (
                <div className="grid grid-cols-2 gap-3 border border-border/50 rounded-xl p-3 bg-muted/20">
                  <div>
                    <Label className="mb-1.5 block">Aylık Şahsi Hesap (₺)</Label>
                    <Input type="number" value={form.sahsi_hesap_tutar} onChange={(e) => setForm({ ...form, sahsi_hesap_tutar: e.target.value })} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Banka</Label>
                    <Input value={form.sahsi_hesap_banka} onChange={(e) => setForm({ ...form, sahsi_hesap_banka: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="mb-1.5 block">IBAN</Label>
                    <Input value={form.sahsi_hesap_iban} onChange={(e) => setForm({ ...form, sahsi_hesap_iban: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="mb-1.5 block">Açıklama</Label>
                    <Input value={form.sahsi_hesap_aciklama} onChange={(e) => setForm({ ...form, sahsi_hesap_aciklama: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
            </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-3 pt-3 border-t shrink-0">
            {!embedded && <Button type="button" variant="outline" onClick={handleClose}>Iptal</Button>}
            <Button type="submit" disabled={isLoading || uploadingDoc || !isDirty}>
              {isLoading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
  );

  if (embedded) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">Çalışanı Düzenle</h2>
          <p className="text-sm text-muted-foreground mt-1">Bilgileri güncelleyin, sekmeler arasında geçiş yapabilirsiniz.</p>
        </div>
        {formBody}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">{employee ? "Calisan Duzenle" : "Yeni Calisan"}</DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
