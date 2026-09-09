import { useState, useRef } from "react";
const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Paperclip, X, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "beklemede", label: "Beklemede" },
  { value: "devam_ediyor", label: "Devam Ediyor" },
  { value: "onay_bekliyor", label: "Onay Bekliyor" },
  { value: "tamamlandi", label: "Tamamlandı" },
  { value: "iptal", label: "İptal" },
];

const PRIORITY_OPTIONS = [
  { value: "dusuk", label: "Düşük" },
  { value: "orta", label: "Orta" },
  { value: "yuksek", label: "Yüksek" },
  { value: "kritik", label: "Kritik" },
];

export default function WorkTaskFormDialog({ open, onOpenChange, employees, onSubmit }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "beklemede",
    priority: "orta",
    assigned_to_id: "",
    assigned_to_name: "",
    due_date: "",
    start_date: "",
    attachments: [],
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingFile(true);
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
        const data = await res.json();
        return { name: file.name, url: `${BASE_URL}${data.url}` };
      })
    );
    setFormData((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploaded] }));
    setUploadingFile(false);
    e.target.value = "";
  };

  const removeAttachment = (idx) => {
    setFormData((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      attachments: formData.attachments.map((a) => a.url),
      assigned_by_id: user.id,
      assigned_by_name: user.full_name || user.email,
    });
    setFormData({
      title: "",
      description: "",
      status: "beklemede",
      priority: "orta",
      assigned_to_id: "",
      assigned_to_name: "",
      due_date: "",
      start_date: "",
      attachments: [],
    });
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    setFormData({
      ...formData,
      assigned_to_id: employeeId,
      assigned_to_name: employee?.full_name || "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Görev Oluştur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Görev Başlığı *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Görev başlığı girin"
            />
          </div>
          <div>
            <Label>Açıklama</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Görev detaylarını girin"
              className="min-h-24"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Durum</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Öncelik</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Atanacak Kişi *</Label>
            <Select value={formData.assigned_to_id} onValueChange={handleEmployeeSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Çalışan seçin" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Başlangıç Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.start_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(new Date(formData.start_date), "d MMM yyyy") : "Seçin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => setFormData({ ...formData, start_date: date ? format(date, "yyyy-MM-dd") : "" })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Teslim Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.due_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(new Date(formData.due_date), "d MMM yyyy") : "Seçin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date ? new Date(formData.due_date) : undefined}
                    onSelect={(date) => setFormData({ ...formData, due_date: date ? format(date, "yyyy-MM-dd") : "" })}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* Dosya Ekleri */}
          <div>
            <Label>Dosya Ekle</Label>
            {formData.attachments.length > 0 && (
              <div className="space-y-1.5 mt-1.5 mb-2">
                {formData.attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-1 truncate">{att.name}</a>
                    <button type="button" onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-50 mt-1"
            >
              {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploadingFile ? "Yükleniyor..." : "Dosya Seç"}
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={!formData.title || !formData.assigned_to_id}>
              Görev Oluştur
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}