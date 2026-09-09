import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { toast } from "sonner";
import { Paperclip, X, FileText, Loader2, Maximize2, Minimize2, ExternalLink, Pencil } from "lucide-react";
import { invalidateTicketQueries } from "@/lib/jobTrackingQueryUtils";
import { cn } from "@/lib/utils";

export default function JTTicketFormDialog({ ticket, projects, customers, employees, boards = [], open, onOpenChange, defaultBoardId = null, defaultBoardName = null, defaultStatus = null, isMusteri = false, currentUser = null }) {
  const queryClient = useQueryClient();
  const [customerModules, setCustomerModules] = useState([]);
  const [customerContacts, setCustomerContacts] = useState([]);
  const [attachments, setAttachments] = useState(ticket?.attachments || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  // Ek onizleme (detay ekranindakiyle ayni desen) + dosya adi degistirme
  const [previewFile, setPreviewFile] = useState(null);
  const [previewText, setPreviewText] = useState(null);
  const [previewZoomed, setPreviewZoomed] = useState(false);
  const [editingNameIdx, setEditingNameIdx] = useState(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  const { data: ticketTypes = [] } = useQuery({
    queryKey: ["definitions-ticket-types"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "bilet_tipi", is_active: true }, "sort_order", 100),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["tq-statuses"],
    queryFn: () => flowApi.entities.JTTicketStatus.filter({ is_active: true }, "sort_order", 500),
  });

  // Urun/Modul secimine gore panoyu otomatik cozmek icin (musteri formu).
  // Pano modul seviyesinde tanimli -- ayni urune bagli farkli moduller
  // farkli destek panolarina gidebiliyor.
  const { data: moduleDefinitions = [] } = useQuery({
    queryKey: ["definitions", "modul"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "modul", is_active: true }),
  });

  const visibleCustomers = isMusteri ? customers.filter(c => c.id === currentUser?.customer_id) : customers;
  const visibleProjects = projects;
  const TUM_KURUMLAR_ID = "04163b34-9be0-4a62-ad18-db20420e0c5a";
  const initialAssignedIds = ticket?.assigned_to_ids || (ticket?.assigned_to_id ? [ticket.assigned_to_id] : []);
  const initialAssignedNames = ticket?.assigned_to_names || (ticket?.assigned_to_name ? [ticket.assigned_to_name] : []);

  const [formData, setFormData] = useState({
    title: ticket?.title || "",
    description: ticket?.description || "",
    project_id: ticket?.project_id || (isMusteri && visibleProjects.length === 1 ? visibleProjects[0].id : "") || "",
    project_name: ticket?.project_name || (isMusteri && visibleProjects.length === 1 ? visibleProjects[0].name : "") || "",
    customer_id: ticket?.customer_id || (isMusteri ? currentUser?.customer_id : "") || "",
    customer_name: ticket?.customer_name || (isMusteri ? customers.find(c => c.id === currentUser?.customer_id)?.company_name : "") || "",
    board_id: ticket?.board_id || defaultBoardId || "",
    board_name: ticket?.board_name || defaultBoardName || "",
    type: ticket?.type || "",
    status: ticket?.status || defaultStatus || "",
    priority: ticket?.priority || "orta",
    assigned_to_ids: initialAssignedIds,
    assigned_to_names: initialAssignedNames,
    assigned_to_id: initialAssignedIds[0] || "",
    assigned_to_name: initialAssignedNames[0] || "",
    due_date: ticket?.due_date || "",
    product_name: ticket?.product_name || "",
    pilot_customer_id: ticket?.pilot_customer_id || "",
    pilot_customer_name: ticket?.pilot_customer_name || "",
    customer_contact_id: ticket?.customer_contact_id || (isMusteri ? currentUser?.id : "") || "",
    customer_contact_name: ticket?.customer_contact_name || (isMusteri ? (currentUser?.full_name || currentUser?.email) : "") || "",
  });

  useEffect(() => {
    if (!formData.customer_id) { setCustomerModules([]); setCustomerContacts([]); return; }
    flowApi.entities.CustomerModule.filter({ customer_id: formData.customer_id })
      .then(setCustomerModules)
      .catch(() => setCustomerModules([]));
    flowApi.auth.users()
      .then(all => setCustomerContacts((all || []).filter(u => u.customer_id === formData.customer_id && u.role === "musteri")))
      .catch(() => setCustomerContacts([]));
  }, [formData.customer_id]);

  const handleAddAssignee = (empId) => {
    if (!empId || empId === "none" || formData.assigned_to_ids.includes(empId)) return;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const newIds = [...formData.assigned_to_ids, empId];
    const newNames = [...formData.assigned_to_names, emp.full_name];
    setFormData({ ...formData, assigned_to_ids: newIds, assigned_to_names: newNames, assigned_to_id: newIds[0], assigned_to_name: newNames[0] });
  };

  const handleRemoveAssignee = (empId) => {
    const idx = formData.assigned_to_ids.indexOf(empId);
    if (idx === -1) return;
    const newIds = formData.assigned_to_ids.filter(id => id !== empId);
    const newNames = formData.assigned_to_names.filter((_, i) => i !== idx);
    setFormData({ ...formData, assigned_to_ids: newIds, assigned_to_names: newNames, assigned_to_id: newIds[0] || "", assigned_to_name: newNames[0] || "" });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
        const data = await res.json();
        const file_url = `${BASE_URL}${data.url}`;
      setAttachments(prev => [...prev, { name: file.name, url: file_url, type: file.type }]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(i => i.type.startsWith("image/"));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
    const data = await res.json();
    const file_url = `${BASE_URL}${data.url}`;
    const name = `ekran-goruntusu-${Date.now()}.png`;
    setAttachments(prev => [...prev, { name, url: file_url, type: file.type }]);
    setUploading(false);
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // Var olan bir bilette (yeni bilet olusturuluyorsa henuz ID yok, kaydetmeye
  // gerek/imkan yok) dosya adi degisikligi, ana "Kaydet" butonunu beklemeden
  // hemen sunucuya yazilsin diye ayri, sessiz bir mutation -- updateMutation'i
  // (asagida) burada kullanamayiz, o dialog'u kapatip "Bilet güncellendi"
  // toast'i gosteriyor, sadece isim degisikliginde bu istenmez.
  const renameAttachmentMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.JTTicket.update(id, data),
    onSuccess: () => invalidateBoardTickets(),
    onError: () => toast.error("Dosya adı kaydedilemedi"),
  });

  const renameAttachment = (idx, newName) => {
    const trimmed = (newName || "").trim();
    if (!trimmed) { setEditingNameIdx(null); return; }
    const next = attachments.map((a, i) => i === idx ? { ...a, name: trimmed } : a);
    setAttachments(next);
    setEditingNameIdx(null);
    if (ticket) {
      renameAttachmentMutation.mutate({ id: ticket.id, data: { attachments: next } });
    }
  };

  const openPreview = async (att) => {
    const isImage = att.type?.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)$/i.test(att.name);
    const isPdf = att.type === "application/pdf" || /\.pdf$/i.test(att.name);
    const isTxt = att.type === "text/plain" || /\.txt$/i.test(att.name);
    setPreviewZoomed(false);
    if (isImage || isPdf) {
      setPreviewFile(att);
      setPreviewText(null);
    } else if (isTxt) {
      try {
        const res = await fetch(att.url);
        const text = await res.text();
        setPreviewText(text);
        setPreviewFile(att);
      } catch { setPreviewFile(att); setPreviewText("Dosya okunamadı."); }
    } else {
      window.open(att.url, "_blank");
    }
  };
  const closePreview = () => { setPreviewFile(null); setPreviewText(null); setPreviewZoomed(false); };

  // "tq-tickets" ile baslayan HER query key'i (tq-tickets-board, -count,
  // -active, vb.) tek seferde tazeler -- bkz. jobTrackingQueryUtils.js.
  const invalidateBoardTickets = () => invalidateTicketQueries(queryClient);

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.JTTicket.create(data),
    onSuccess: () => {
      invalidateBoardTickets(formData.board_id);
      toast.success("Bilet oluşturuldu");
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.JTTicket.update(id, data),
    onSuccess: () => {
      invalidateBoardTickets(formData.board_id);
      toast.success("Bilet güncellendi");
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { ...formData, attachments };
    // Yeni bilette durum secilmediyse (ozellikle musteri formu -- pano urun/
    // modulden otomatik atanip durum hic sorulmuyor), "statuses[0]" panodan
    // bagimsiz GLOBAL bir listenin ilk elemaniydi -- sort_order'i dusuk olan
    // baska bir panonun durumu (or. "ar_ge") yanlislikla secilebiliyordu,
    // bilet kendi panosuna ait olmayan bir durumda kalip "bos" gorunuyordu.
    // Yeni bir biletin her zaman dogru baslangic noktasi Musteri Talebi'dir.
    if (!ticket && !dataToSave.status) {
      dataToSave.status = "musteri_talep";
    }
    if (isMusteri && !dataToSave.customer_name && dataToSave.customer_id) {
      dataToSave.customer_name = customers.find(c => c.id === dataToSave.customer_id)?.company_name || dataToSave.customer_name;
    }
    // Zorunlu alan validasyonu
    const missing = [];
    if (!dataToSave.title?.trim()) missing.push("Başlık");
    if (!dataToSave.description?.trim()) missing.push("Açıklama");
    if (!dataToSave.project_id) missing.push("Proje");
    if (!dataToSave.customer_id) missing.push("Müşteri");
    if (!dataToSave.type) missing.push("Bilet Tipi");
    if (!dataToSave.product_name) missing.push("Ürün/Modül");
    if (isMusteri && dataToSave.product_name && !dataToSave.board_id) {
      missing.push("Pano (seçilen ürün/modül için tanımlı bir pano yok, İK/Admin ile iletişime geçin)");
    }
    if (missing.length > 0) {
      toast.error("Lütfen zorunlu alanları doldurunuz: " + missing.join(", "));
      return;
    }
    if (ticket) {
      updateMutation.mutate({ id: ticket.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  // ---- Alan blokları (yeniden kullanılabilir) ----

  const BiletTipiField = (
    <div className="space-y-2">
      <Label>Bilet Tipi <span className="text-red-500">*</span></Label>
      <Select value={formData.type || "none"} onValueChange={(value) => setFormData({ ...formData, type: value === "none" ? "" : value })}>
        <SelectTrigger><SelectValue placeholder="Tip seçin..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— Seçiniz —</SelectItem>
          {ticketTypes.length > 0 ? (
            ticketTypes.map((t) => (
              <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>
            ))
          ) : (
            <>
              <SelectItem value="Yazılım">Yazılım</SelectItem>
              <SelectItem value="Donanım">Donanım</SelectItem>
              <SelectItem value="Danışmanlık">Danışmanlık</SelectItem>
              <SelectItem value="Bakım">Bakım</SelectItem>
              <SelectItem value="Destek">Destek</SelectItem>
              <SelectItem value="Eğitim">Eğitim</SelectItem>
              <SelectItem value="Toplantı">Toplantı</SelectItem>
              <SelectItem value="Diğer">Diğer</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );

  // Müşteri için Proje (customer_id müşteride hep dolu)
  const ProjeFieldMusteri = (
    <div className="space-y-2">
      <Label>Proje <span className="text-red-500">*</span></Label>
      <SearchableSelect
        value={formData.project_id}
        onChange={(value) => {
          const proj = visibleProjects.find((p) => p.id === value);
          setFormData({ ...formData, project_id: value, project_name: proj?.name || "" });
        }}
        options={visibleProjects.filter(p => p.customer_id === formData.customer_id).map((proj) => ({ value: proj.id, label: proj.name }))}
        placeholder="Proje seç..."
        searchPlaceholder="Proje ara..."
      />
    </div>
  );

  const UrunModulField = (
    <div className="space-y-2">
      <Label>Ürün / Modül <span className="text-red-500">*</span></Label>
      {customerModules.length > 0 ? (
        <SearchableSelect
          value={formData.product_name}
          onChange={(val) => {
            const mod = moduleDefinitions.find(m => m.label === val);
            // Pano otomatik atamasi SADECE musteri formunda gecerli -- musteri
            // panoyu elle secemedigi icin modulden turetiliyor. Dahili kullanicida
            // (analist/admin) pano zaten Pano alanindan/panonun icinden geldigi
            // icin urun/modul secimi onu ezmemeli (bilet yanlis panoya dusuyordu).
            setFormData({
              ...formData,
              product_name: val,
              ...(isMusteri ? { board_id: mod?.board_id || "", board_name: mod?.board_name || "" } : {}),
            });
          }}
          options={customerModules.map((m) => ({ value: m.module_name, label: m.module_name }))}
          placeholder="Ürün seç..."
          searchPlaceholder="Ürün / modül ara..."
          fixDialogWheelScroll
        />
      ) : (
        <Input
          value={formData.product_name}
          onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
          placeholder={formData.customer_id ? "Modül yok, elle girin..." : "Önce müşteri seçin"}
        />
      )}
    </div>
  );

  const BaslikField = (
    <div className="space-y-2">
      <Label className="flex items-center justify-between">
        <span>Başlık <span className="text-red-500">*</span></span>
        <span className={`text-xs font-normal ${(formData.title?.length || 0) > 500 ? "text-red-500" : "text-muted-foreground"}`}>
          {formData.title?.length || 0}/500
        </span>
      </Label>
      <Textarea
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value.slice(0, 500) })}
        maxLength={500}
        placeholder="örn: Login sayfası hata veriyor"
        className="min-h-[40px] resize-y"
        rows={1}
        required
      />
    </div>
  );

  const AciklamaField = (
    <div className="space-y-2">
      <Label>Açıklama <span className="text-red-500">*</span></Label>
      <Textarea
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className="min-h-[100px]"
        placeholder="Bilet detayları... (ekran görüntüsü için Ctrl+V ile yapıştırabilirsiniz)"
      />
    </div>
  );

  const OncelikTarihRow = (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Öncelik</Label>
        <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dusuk">Düşük</SelectItem>
            <SelectItem value="orta">Orta</SelectItem>
            <SelectItem value="yuksek">Yüksek</SelectItem>
            <SelectItem value="kritik">Kritik</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Beklenen Bitiş Tarihi</Label>
        <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
      </div>
    </div>
  );

  const EklerField = (
    <div className="space-y-2">
      <Label>Ekler</Label>
      <div className="border-2 border-dashed border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Paperclip className="w-3.5 h-3.5 mr-1" />}
            Dosya Ekle
          </Button>
          <span className="text-xs text-muted-foreground">veya ekran görüntüsünü Ctrl+V ile yapıştırın</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          className="hidden"
          onChange={handleFileChange}
        />
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((att, idx) => {
              const isImage = att.type?.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)$/i.test(att.name);
              const isEditingName = editingNameIdx === idx;
              const nameInput = (
                <input
                  autoFocus
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  onBlur={() => renameAttachment(idx, editingNameValue)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); renameAttachment(idx, editingNameValue); }
                    if (e.key === "Escape") setEditingNameIdx(null);
                  }}
                  className="text-[11px] px-1 py-0.5 rounded border border-input bg-background w-full"
                />
              );
              const startRename = (e) => { e.stopPropagation(); setEditingNameIdx(idx); setEditingNameValue(att.name); };
              return (
                <div key={idx} className="relative group w-20">
                  {isImage ? (
                    <div className="relative">
                      <img
                        src={att.url}
                        alt={att.name}
                        onClick={() => openPreview(att)}
                        className="w-20 h-20 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-20 h-20 flex flex-col items-center justify-center gap-1 bg-muted/50 rounded-lg border border-border cursor-pointer" onClick={() => openPreview(att)}>
                      <FileText className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  {isEditingName ? nameInput : (
                    <div className="mt-1 flex items-center gap-0.5">
                      <span className="text-[10px] text-muted-foreground truncate flex-1" title={att.name}>{att.name}</span>
                      <button type="button" onClick={startRename} title="Dosya adını değiştir" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground shrink-0 transition-opacity">
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { if (previewFile) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (previewFile) { e.preventDefault(); closePreview(); } }}>
        <DialogHeader>
          <DialogTitle>
            {ticket ? "Bilet Düzenle" : "Yeni Bilet Oluştur"}
            {ticket?.ticket_number && (
              <span className="ml-2 text-xs font-mono text-muted-foreground">#{ticket.ticket_number}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-4">

          {/* === MÜŞTERİ GÖRÜNÜMÜ === */}
          {isMusteri ? (
            <>
              {/* 1) Bilet Tipi + Proje yan yana */}
              <div className="grid grid-cols-2 gap-4">
                {BiletTipiField}
                {ProjeFieldMusteri}
              </div>
              {/* 2) Ürün / Modül */}
              {UrunModulField}
              {/* 3) Başlık */}
              {BaslikField}
              {/* 4) Açıklama */}
              {AciklamaField}
              {/* 5) Öncelik + Beklenen Bitiş Tarihi */}
              {OncelikTarihRow}
              {/* 6) Ekler */}
              {EklerField}
            </>
          ) : (
            /* === İÇ KULLANICI GÖRÜNÜMÜ === */
            <>
              {/* 1) Bilet Tipi + Proje/Müşteri seçimi */}
              <div className="grid grid-cols-2 gap-4">
                {BiletTipiField}
                <div className="space-y-2">
                  <Label>Müşteri <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    value={formData.customer_id}
                    onChange={(value) => {
                      const customer = visibleCustomers.find((c) => c.id === value);
                      setFormData({ ...formData, customer_id: value, customer_name: customer?.company_name || "", project_id: "", project_name: "" });
                    }}
                    options={visibleCustomers.map((customer) => ({ value: customer.id, label: customer.company_name }))}
                    placeholder="Müşteri seç"
                    searchPlaceholder="Müşteri ara..."
                  />
                </div>
              </div>

              {/* Müşteri seçilince o müşteriye ait projeler */}
              {formData.customer_id && (
                <div className="space-y-2">
                  <Label>Müşteriye Ait Projeler <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    value={formData.project_id}
                    onChange={(value) => {
                      const proj = visibleProjects.find((p) => p.id === value);
                      setFormData({ ...formData, project_id: value, project_name: proj?.name || "" });
                    }}
                    options={visibleProjects.filter(p => p.customer_id === formData.customer_id).map((proj) => ({ value: proj.id, label: proj.name }))}
                    placeholder="Proje seç..."
                    searchPlaceholder="Proje ara..."
                  />
                </div>
              )}

              {/* Tüm Kurumlar seçilince Pilot Kurum */}
              {formData.customer_id === TUM_KURUMLAR_ID && (
                <div className="space-y-2">
                  <Label>Pilot Kurum <span className="text-xs text-muted-foreground">(ilk uygulanan/test edilen kurum)</span></Label>
                  <SearchableSelect
                    value={formData.pilot_customer_id}
                    onChange={(value) => {
                      const c = customers.find((x) => x.id === value);
                      setFormData({ ...formData, pilot_customer_id: value, pilot_customer_name: c?.company_name || "" });
                    }}
                    options={customers.filter(c => c.id !== TUM_KURUMLAR_ID).map((c) => ({ value: c.id, label: c.company_name }))}
                    placeholder="Pilot kurum seç..."
                    searchPlaceholder="Kurum ara..."
                  />
                </div>
              )}

              {/* Pano */}
              {boards.length > 0 && (
                <div className="space-y-2">
                  <Label>Pano</Label>
                  <Select
                    value={formData.board_id || "none"}
                    onValueChange={(value) => {
                      const board = boards.find((b) => b.id === value);
                      setFormData({ ...formData, board_id: value === "none" ? "" : value, board_name: board?.name || "" });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Pano seç (isteğe bağlı)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Pano seçme —</SelectItem>
                      {boards.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.icon ? `${b.icon} ${b.name}` : b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 2) Ürün/Modül + Sorumlu Kişiler */}
              <div className="grid grid-cols-2 gap-4">
                {UrunModulField}
                <div className="space-y-2">
                  <Label>Sorumlu Kişiler</Label>
                  {formData.assigned_to_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {formData.assigned_to_ids.map((id, idx) => (
                        <span key={id} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {formData.assigned_to_names[idx] || id}
                          <button type="button" onClick={() => handleRemoveAssignee(id)} className="hover:text-red-500 ml-0.5">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <SearchableSelect
                    value=""
                    onChange={handleAddAssignee}
                    options={employees
                      .filter(e => !formData.assigned_to_ids.includes(e.id))
                      .filter(e => e.show_in_job_tracking == 1 || e.show_in_job_tracking === true)
                      .map((emp) => ({ value: emp.id, label: emp.full_name }))}
                    placeholder="Kişi ekle..."
                    searchPlaceholder="Kişi ara..."
                    emptyText="Kişi bulunamadı"
                    fixDialogWheelScroll
                  />
                </div>
              </div>

              {/* Müşteri Muhatabı */}
              {formData.customer_id && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Müşteri Muhatabı</Label>
                    <Select
                      value={formData.customer_contact_id || "none"}
                      onValueChange={(val) => {
                        if (val === "none") {
                          setFormData({ ...formData, customer_contact_id: "", customer_contact_name: "" });
                        } else {
                          const c = customerContacts.find(x => x.id === val);
                          setFormData({ ...formData, customer_contact_id: val, customer_contact_name: c?.full_name || "" });
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Muhatap seç..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Seçiniz —</SelectItem>
                        {customerContacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.full_name}{c.title ? ` (${c.title})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {customerContacts.length === 0 && (
                      <p className="text-xs text-muted-foreground">Bu müşteride kayıtlı kişi yok</p>
                    )}
                  </div>
                  <div />
                </div>
              )}

              {/* 3) Başlık */}
              {BaslikField}
              {/* 4) Açıklama */}
              {AciklamaField}
              {/* 5) Öncelik + Beklenen Bitiş Tarihi */}
              {OncelikTarihRow}
              {/* 6) Ekler */}
              {EklerField}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || uploading}>
              {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {previewFile && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" onClick={(e) => { e.stopPropagation(); closePreview(); }} style={{pointerEvents: "all"}}>
        <div className={cn("relative bg-card text-card-foreground rounded-xl shadow-2xl w-full mx-4 flex flex-col transition-all", previewZoomed ? "max-w-[96vw] max-h-[96vh]" : "max-w-3xl max-h-[90vh]")} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-medium truncate max-w-[400px]">{previewFile.name}</span>
            <div className="flex items-center gap-2">
              {(/\.(png|jpg|jpeg|gif|webp)$/i.test(previewFile.name) || previewFile.type?.startsWith("image/")) && (
                <button onClick={(e) => { e.stopPropagation(); setPreviewZoomed((z) => !z); }} className="text-xs text-blue-600 hover:underline flex items-center gap-1" title={previewZoomed ? "Küçült" : "Büyüt"}>
                  {previewZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />} {previewZoomed ? "Küçült" : "Büyüt"}
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); window.open(previewFile.url, "_blank"); }} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> İndir
              </button>
              <button onClick={(e) => { e.stopPropagation(); closePreview(); }} className="text-muted-foreground hover:text-foreground ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="overflow-auto flex-1 p-2 flex items-center justify-center">
            {previewText !== null ? (
              <pre className="text-xs whitespace-pre-wrap w-full p-4 bg-muted rounded-lg max-h-[70vh] overflow-auto">{previewText}</pre>
            ) : /\.(png|jpg|jpeg|gif|webp)$/i.test(previewFile.name) || previewFile.type?.startsWith("image/") ? (
              <img src={previewFile.url} alt={previewFile.name} className={cn("max-w-full object-contain rounded-lg", previewZoomed ? "max-h-[88vh]" : "max-h-[70vh]")} />
            ) : (
              <iframe src={previewFile.url} className="w-full h-[70vh] rounded-lg border-0" title={previewFile.name} />
            )}
          </div>
        </div>
      </div>
    , document.body)}
    </>
  );
}
