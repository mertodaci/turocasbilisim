import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { flowApi } from "@/api/flowApiClient";
import { Paperclip, Upload, X, Eye, UserMinus } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

export default function TerminateEmployeeDialog({ employee, open, onOpenChange, onDone }) {
  const queryClient = useQueryClient();
  const fileRef = useRef();
  const today = new Date().toISOString().split("T")[0];

  const [exitDate, setExitDate] = useState(today);
  const [exitReason, setExitReason] = useState("");
  const [exitNotes, setExitNotes] = useState("");
  const [exitDocument, setExitDocument] = useState("");
  const [docName, setDocName] = useState("");
  const [uploading, setUploading] = useState(false);

  // Ayrilis nedeni tanimlari
  const { data: reasons = [] } = useQuery({
    queryKey: ["definitions", "ayrilis_nedeni"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "ayrilis_nedeni", is_active: true }, "sort_order"),
  });

  const terminateMutation = useMutation({
    mutationFn: () =>
      flowApi.entities.Employee.update(employee.id, {
        status: "pasif",
        exit_date: exitDate,
        exit_reason: exitReason,
        exit_notes: exitNotes,
        exit_document: exitDocument,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employee.id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      onOpenChange(false);
      onDone?.();
    },
  });

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (data?.url) {
        setExitDocument(`${BASE_URL}${data.url}`);
        setDocName(data.name || file.name);
      }
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = exitDate && exitReason && !terminateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-destructive" />
            Çalışanı İşten Çıkart
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Isten ayrilma tarihi */}
          <div className="space-y-1.5">
            <Label>İşten Ayrılma Tarihi</Label>
            <Input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className="rounded-xl" />
          </div>

          {/* Ayrilis nedeni */}
          <div className="space-y-1.5">
            <Label>Ayrılış Nedeni</Label>
            <Select value={exitReason} onValueChange={setExitReason}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.id} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detaylar */}
          <div className="space-y-1.5">
            <Label>Detaylar ve Yorumlar</Label>
            <textarea
              value={exitNotes}
              onChange={(e) => setExitNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Varsa ek açıklama..."
            />
          </div>

          {/* Dosya */}
          <div className="space-y-1.5">
            <Label>İşten Çıkarma Dosyası (İstifa Dilekçesi vb.)</Label>
            {exitDocument ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{docName || "Dosya"}</span>
                <a href={exitDocument} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                  <Eye className="w-4 h-4" />
                </a>
                <button onClick={() => { setExitDocument(""); setDocName(""); }} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl gap-1.5 w-full"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-4 h-4" /> {uploading ? "Yükleniyor..." : "Dosya Ekle"}
              </Button>
            )}
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
          </div>

          {/* Uyari */}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p>• Çalışan işten çıkarıldığında durumu <b>Pasif</b> olarak işaretlenir.</p>
            <p>• Çalışanın ayrılış tarihinden sonra geçerli olan ekstra izinleri geçersiz sayılır.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button
            className="rounded-xl bg-destructive hover:bg-destructive/90 text-white gap-1.5"
            disabled={!canSubmit}
            onClick={() => terminateMutation.mutate()}
          >
            <UserMinus className="w-4 h-4" /> {terminateMutation.isPending ? "İşleniyor..." : "İşten Çıkart"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
