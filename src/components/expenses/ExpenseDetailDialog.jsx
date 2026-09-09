import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flowApi } from "@/api/flowApiClient";
import { Plus, FileSpreadsheet, X, Upload, Eye, Pencil, Check } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import * as XLSX from "xlsx";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
const emptyItem = { date: "", description: "", accommodation: "", transport: "", fuel: "", meal: "", other: "" };

export default function ExpenseDetailDialog({ report, onClose, onPreview }) {
  const queryClient = useQueryClient();
  const [newItem, setNewItem] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);
  const [editItem, setEditItem] = useState(emptyItem);
  const [editError, setEditError] = useState("");
  const [addingRow, setAddingRow] = useState(false);
  const [itemError, setItemError] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const fileRefs = useRef({});
  const [previewUrl, setPreviewUrl] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: ["expense-items", report.id],
    queryFn: () => flowApi.entities.ExpenseItem.filter({ report_id: report.id }, "date", 200),
  });

  const createItem = useMutation({
    mutationFn: (data) => flowApi.entities.ExpenseItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-items", report.id] });
      setNewItem(emptyItem);
      setAddingRow(false);
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id) => flowApi.entities.ExpenseItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expense-items", report.id] }),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.ExpenseItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expense-items", report.id] }),
  });

  const handleFileUpload = async (itemId, file) => {
    if (!file) return;
    setUploadingId(itemId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      const receipt_url = `${BASE_URL}${data.url}`;
      await updateItem.mutateAsync({ id: itemId, data: { receipt_url } });
    } finally {
      setUploadingId(null);
    }
  };

  const n = (v) => parseFloat(v) || 0;
  const totals = items.reduce(
    (acc, item) => ({
      accommodation: acc.accommodation + n(item.accommodation),
      transport: acc.transport + n(item.transport),
      fuel: acc.fuel + n(item.fuel),
      meal: acc.meal + n(item.meal),
      other: acc.other + n(item.other),
    }),
    { accommodation: 0, transport: 0, fuel: 0, meal: 0, other: 0 }
  );
  const totalExpense = totals.accommodation + totals.transport + totals.fuel + totals.meal + totals.other;
  const advance = n(report.advance_amount);
  const balance = advance - totalExpense;
  const fmt = (v) => (v || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 });

  const handleAddItem = () => {
    if (!newItem.date || !newItem.description) {
      setItemError("Tarih ve Aciklama zorunludur!");
      return;
    }
    const raporAy = (report.trip_start_date || "").slice(0, 7);
    if (raporAy && newItem.date.slice(0, 7) !== raporAy) {
      setItemError("Kalem tarihi raporun ayina (" + raporAy + ") ait olmalidir. Farkli ay icin ayri rapor olusturun.");
      return;
    }
    setItemError("");
    createItem.mutate({
      report_id: report.id,
      date: newItem.date,
      description: newItem.description,
      accommodation: parseFloat(newItem.accommodation) || 0,
      transport: parseFloat(newItem.transport) || 0,
      fuel: parseFloat(newItem.fuel) || 0,
      meal: parseFloat(newItem.meal) || 0,
      other: parseFloat(newItem.other) || 0,
    });
  };
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditError("");
    setEditItem({
      date: item.date || "",
      description: item.description || "",
      accommodation: item.accommodation ?? "",
      transport: item.transport ?? "",
      fuel: item.fuel ?? "",
      meal: item.meal ?? "",
      other: item.other ?? "",
    });
  };
  const cancelEdit = () => { setEditingId(null); setEditItem(emptyItem); setEditError(""); };
  const handleSaveEdit = () => {
    if (!editItem.date || !editItem.description) {
      setEditError("Tarih ve Aciklama zorunludur!");
      return;
    }
    const raporAyE = (report.trip_start_date || "").slice(0, 7);
    if (raporAyE && editItem.date.slice(0, 7) !== raporAyE) {
      setEditError("Kalem tarihi raporun ayina (" + raporAyE + ") ait olmalidir.");
      return;
    }
    setEditError("");
    updateItem.mutate({
      id: editingId,
      data: {
        date: editItem.date,
        description: editItem.description,
        accommodation: parseFloat(editItem.accommodation) || 0,
        transport: parseFloat(editItem.transport) || 0,
        fuel: parseFloat(editItem.fuel) || 0,
        meal: parseFloat(editItem.meal) || 0,
        other: parseFloat(editItem.other) || 0,
      },
    }, { onSuccess: () => cancelEdit() });
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [];
    rows.push(["Adı Soyadı", report.employee_name, "", "", "", "Gidiş Tarihi", report.trip_start_date ? format(new Date(report.trip_start_date), "dd.MM.yyyy") : ""]);
    rows.push(["Kişi Sayısı", "", "", "Yapılacak İş", report.project_name || "", "Dönüş Tarihi", report.trip_end_date ? format(new Date(report.trip_end_date), "dd.MM.yyyy") : "", "Avans Miktarı"]);
    rows.push([]);
    rows.push(["Tarih", "Açıklama", "Konaklama", "Ulaşım", "Yakıt Bedeli", "Yemek", "Diğer", "TOPLAM"]);
    items.forEach((item) => {
      const rowTotal = n(item.accommodation) + n(item.transport) + n(item.fuel) + n(item.meal) + n(item.other);
      rows.push([
        item.date ? format(new Date(item.date), "dd.MM.yyyy") : "",
        item.description,
        n(item.accommodation) || "",
        n(item.transport) || "",
        n(item.fuel) || "",
        n(item.meal) || "",
        n(item.other) || "",
        rowTotal || "",
      ]);
    });
    for (let i = items.length; i < 20; i++) rows.push(["", "", "", "", "", "", "", ""]);
    rows.push(["TOPLAM", "", totals.accommodation || "", totals.transport || "", totals.fuel || "", totals.meal || "", totals.other || "", totalExpense]);
    rows.push([]);
    rows.push(["", "", "", "", "", "TOPLAM HARCAMA", totalExpense]);
    rows.push(["", "", "", "", "", "ALINAN AVANS", advance]);
    rows.push(["", "", "", "", "", "AVANS İADESİ", balance > 0 ? -balance : 0]);
    rows.push(["", "", "", "", "", "İLAVE ÖDEME", balance < 0 ? Math.abs(balance) : 0]);
    rows.push([]);
    rows.push(["Harcamayı Yapan", "", "Bölüm Müdürü", "", "Muhasebe", "", "Yönetim"]);
    rows.push([report.employee_name, "", report.department_manager || "", "", "", "", ""]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 45 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "Masraf Raporu");
    XLSX.writeFile(wb, `masraf_raporu_${report.employee_name.replace(/ /g, "_")}.xlsx`);
  };

  return (<>
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle>Masraf Detayı — {report.employee_name}</DialogTitle>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4" /> Excel İndir
          </Button>
        </DialogHeader>

        {/* Report meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 rounded-xl p-4 text-sm">
          <div><p className="text-xs text-muted-foreground">Proje</p><p className="font-medium">{report.project_name || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Gidiş</p><p className="font-medium">{report.trip_start_date ? format(new Date(report.trip_start_date), "d MMM yyyy", { locale: tr }) : "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Dönüş</p><p className="font-medium">{report.trip_end_date ? format(new Date(report.trip_end_date), "d MMM yyyy", { locale: tr }) : "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Alınan Avans</p><p className="font-medium">{fmt(advance)} ₺</p></div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border px-2 py-2 text-left font-semibold">Tarih</th>
                <th className="border border-border px-2 py-2 text-left font-semibold">Açıklama</th>
                <th className="border border-border px-2 py-2 text-right font-semibold">Konaklama</th>
                <th className="border border-border px-2 py-2 text-right font-semibold">Ulaşım</th>
                <th className="border border-border px-2 py-2 text-right font-semibold">Yakıt</th>
                <th className="border border-border px-2 py-2 text-right font-semibold">Yemek</th>
                <th className="border border-border px-2 py-2 text-right font-semibold">Diğer</th>
                <th className="border border-border px-2 py-2 text-right font-semibold">Toplam</th>
                <th className="border border-border px-2 py-2 text-center font-semibold">Fiş</th>
                <th className="border border-border px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const rowTotal = n(item.accommodation) + n(item.transport) + n(item.fuel) + n(item.meal) + n(item.other);
                if (editingId === item.id) {
                  const editTotal = (parseFloat(editItem.accommodation) || 0) + (parseFloat(editItem.transport) || 0) + (parseFloat(editItem.fuel) || 0) + (parseFloat(editItem.meal) || 0) + (parseFloat(editItem.other) || 0);
                  return (
                    <tr key={item.id} className="bg-amber-50/50">
                      <td className="border border-border px-1 py-1"><Input type="date" className="h-7 text-xs" value={editItem.date} onChange={(e) => setEditItem({ ...editItem, date: e.target.value })} /></td>
                      <td className="border border-border px-1 py-1"><Input className="h-7 text-xs" placeholder="Aciklama" value={editItem.description} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} /></td>
                      <td className="border border-border px-1 py-1"><Input type="number" className="h-7 text-xs text-right" placeholder="0" value={editItem.accommodation} onChange={(e) => setEditItem({ ...editItem, accommodation: e.target.value })} /></td>
                      <td className="border border-border px-1 py-1"><Input type="number" className="h-7 text-xs text-right" placeholder="0" value={editItem.transport} onChange={(e) => setEditItem({ ...editItem, transport: e.target.value })} /></td>
                      <td className="border border-border px-1 py-1"><Input type="number" className="h-7 text-xs text-right" placeholder="0" value={editItem.fuel} onChange={(e) => setEditItem({ ...editItem, fuel: e.target.value })} /></td>
                      <td className="border border-border px-1 py-1"><Input type="number" className="h-7 text-xs text-right" placeholder="0" value={editItem.meal} onChange={(e) => setEditItem({ ...editItem, meal: e.target.value })} /></td>
                      <td className="border border-border px-1 py-1"><Input type="number" className="h-7 text-xs text-right" placeholder="0" value={editItem.other} onChange={(e) => setEditItem({ ...editItem, other: e.target.value })} /></td>
                      <td className="border border-border px-2 py-1 text-right text-xs font-semibold text-muted-foreground">{fmt(editTotal)}</td>
                      <td className="border border-border px-1 py-1"></td>
                      <td className="border border-border px-1 py-1" colSpan={2}>
                        <div className="flex gap-1 items-center justify-center">
                          <button onClick={handleSaveEdit} disabled={updateItem.isPending} className="text-green-600 hover:text-green-700" title="Kaydet"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEdit} className="text-muted-foreground hover:text-destructive" title="Iptal"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        {editError && <p className="text-[10px] text-red-500 mt-1">{editError}</p>}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="border border-border px-2 py-1.5">{item.date ? format(new Date(item.date), "dd.MM.yyyy") : ""}</td>
                    <td className="border border-border px-2 py-1.5">{item.description}</td>
                    <td className="border border-border px-2 py-1.5 text-right">{n(item.accommodation) ? fmt(item.accommodation) : ""}</td>
                    <td className="border border-border px-2 py-1.5 text-right">{n(item.transport) ? fmt(item.transport) : ""}</td>
                    <td className="border border-border px-2 py-1.5 text-right">{n(item.fuel) ? fmt(item.fuel) : ""}</td>
                    <td className="border border-border px-2 py-1.5 text-right">{n(item.meal) ? fmt(item.meal) : ""}</td>
                    <td className="border border-border px-2 py-1.5 text-right">{n(item.other) ? fmt(item.other) : ""}</td>
                    <td className="border border-border px-2 py-1.5 text-right font-semibold">{rowTotal ? fmt(rowTotal) : ""}</td>
                    <td className="border border-border px-1 py-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.receipt_url && (
                          <button onClick={() => onPreview && onPreview(item.receipt_url)} className="text-primary hover:opacity-70" title="Fişi Görüntüle">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!item.receipt_url && (
                          <button
                            onClick={() => fileRefs.current[item.id]?.click()}
                            disabled={uploadingId === item.id}
                            className="text-muted-foreground hover:text-primary"
                            title="Fiş Yükle"
                          >
                            {uploadingId === item.id ? <span className="text-[10px]">...</span> : <Upload className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          ref={el => fileRefs.current[item.id] = el}
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(item.id, e.target.files[0])}
                        />
                      </div>
                    </td>
                    <td className="border border-border px-1 py-1 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-primary" title="Duzenle">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteItem.mutate(item.id)} className="text-muted-foreground hover:text-destructive" title="Sil">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Add row */}
              {addingRow ? (
                <tr className="bg-blue-50/50">
                  <td className="border border-border px-1 py-1"><Input type="date" className="h-7 text-xs" value={newItem.date} onChange={(e) => setNewItem({ ...newItem, date: e.target.value })} /></td>
                  <td className="border border-border px-1 py-1"><Input className="h-7 text-xs" placeholder="Açıklama" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} /></td>
                  <td className="border border-border px-1 py-1"><Input type="number" className="h-7 text-xs text-right" placeholder="0" value={newItem.accommodation} onChange={(e) => setNewItem({ ...newItem, accommodation: e.target.value })} /></td>
                  <td className="border border-border px-1 py-1"><Input type="number" className="h-7 text-xs text-right" placeholder="0" value={newItem.transport} onChange={(e) => setNewItem({ ...newItem, transport: e.target.value })} /></td>
                  <td className="border border-border px-1 py-1"><Input type="number" className="h-7 text-xs text-right" placeholder="0" value={newItem.fuel} onChange={(e) => setNewItem({ ...newItem, fuel: e.target.value })} /></td>
                  <td className="border border-border px-1 py-1"><Input type="number" className="h-7 text-xs text-right" placeholder="0" value={newItem.meal} onChange={(e) => setNewItem({ ...newItem, meal: e.target.value })} /></td>
                  <td className="border border-border px-1 py-1"><Input type="number" className="h-7 text-xs text-right" placeholder="0" value={newItem.other} onChange={(e) => setNewItem({ ...newItem, other: e.target.value })} /></td>
                  <td className="border border-border px-2 py-1 text-right text-xs font-semibold text-muted-foreground">
                    {fmt((parseFloat(newItem.accommodation) || 0) + (parseFloat(newItem.transport) || 0) + (parseFloat(newItem.fuel) || 0) + (parseFloat(newItem.meal) || 0) + (parseFloat(newItem.other) || 0))}
                  </td>
                  <td className="border border-border px-1 py-1"></td>
                  <td className="border border-border px-1 py-1">
                    <div className="flex gap-1">
                      <button onClick={handleAddItem} disabled={createItem.isPending} className="text-green-600 hover:text-green-700 text-xs font-bold px-1">✓</button>
                      <button onClick={() => setAddingRow(false)} className="text-muted-foreground hover:text-destructive text-xs px-1">✕</button>
                    </div>
                    {itemError && <p className="text-xs text-red-500 mt-1">{itemError}</p>}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={10} className="border border-border px-2 py-1.5">
                    <button onClick={() => setAddingRow(true)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <Plus className="w-3.5 h-3.5" /> Satır Ekle
                    </button>
                  </td>
                </tr>
              )}

              {/* Totals */}
              <tr className="bg-muted/50 font-semibold">
                <td colSpan={2} className="border border-border px-2 py-2 text-right">TOPLAM</td>
                <td className="border border-border px-2 py-2 text-right">{totals.accommodation ? fmt(totals.accommodation) : ""}</td>
                <td className="border border-border px-2 py-2 text-right">{totals.transport ? fmt(totals.transport) : ""}</td>
                <td className="border border-border px-2 py-2 text-right">{totals.fuel ? fmt(totals.fuel) : ""}</td>
                <td className="border border-border px-2 py-2 text-right">{totals.meal ? fmt(totals.meal) : ""}</td>
                <td className="border border-border px-2 py-2 text-right">{totals.other ? fmt(totals.other) : ""}</td>
                <td className="border border-border px-2 py-2 text-right">{fmt(totalExpense)}</td>
                <td className="border border-border px-2 py-2"></td>
                <td className="border border-border px-2 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="bg-muted/40 rounded-xl p-4 space-y-2 min-w-[220px] text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Toplam Harcama</span><span className="font-semibold">{fmt(totalExpense)} ₺</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Alınan Avans</span><span className="font-semibold">{fmt(advance)} ₺</span></div>
            <div className="border-t border-border/50 pt-2 flex justify-between">
              <span className="text-muted-foreground">{balance >= 0 ? "Avans İadesi" : "İlave Ödeme"}</span>
              <span className={`font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fmt(Math.abs(balance))} ₺
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* Dosya Önizleme Modal */}
      {previewUrl && createPortal(
        <div className="fixed inset-0 bg-black/80 z-[9999] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border/50 shrink-0">
            <h3 className="font-semibold text-sm">Dosya Önizleme</h3>
            <div className="flex items-center gap-2">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90">Yeni Sekmede Aç / İndir</a>
              <button onClick={() => setPreviewUrl(null)} className="text-muted-foreground hover:text-foreground px-3 py-1.5 border border-border rounded-lg text-xs">Kapat</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img src={previewUrl} alt="Önizleme" className="max-w-full mx-auto rounded-lg" />
            ) : previewUrl.match(/\.pdf$/i) ? (
              <iframe src={previewUrl} className="w-full h-full min-h-[80vh] rounded-lg border-0" title="PDF Önizleme" />
            ) : (
              <div className="text-center py-12 text-white">
                <p className="text-sm mb-4">Bu dosya türü önizlenemiyor.</p>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm bg-card px-4 py-2 rounded-lg">Dosyayı Aç / İndir</a>
              </div>
            )}
          </div>
        </div>
      , document.body)}
  </>);
}
