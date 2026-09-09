import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusColors = {
  planlama: "bg-slate-100 text-slate-700",
  devam_ediyor: "bg-blue-100 text-blue-700",
  beklemede: "bg-yellow-100 text-yellow-700",
  tamamlandi: "bg-green-100 text-green-700",
  iptal: "bg-red-100 text-red-700",
};

const PRIORITY_LABELS = {
  dusuk: "Dusuk",
  orta: "Orta",
  yuksek: "Yuksek",
  kritik: "Kritik",
};

const STATUS_LABELS = {
  musteri_talep: "Müşteri Talebi",
  cevap_bekleniyor: "Cevap Bekleniyor",
  analiz_gelistiriliyor: "Analiz Geliştiriliyor",
  analiz_onaylandi: "Analiz Onaylandı",
  acil_isler: "Acil İşler",
  yazilim_onay_bekliyor: "Yazılım Onay Bekliyor",
  yapilacak: "Yapılacak",
  merge_bekleniyor: "Merge Bekleniyor",
  yazilim_gelistiriliyor: "Yazılım Geliştiriliyor",
  musteri_testten_donen: "Müşteri Testten Dönen",
  testten_donen: "Testten Dönen",
  guncelleme_bekleniyor: "Güncelleme Bekleniyor",
  musteri_onay: "Müşteri Onayı",
  sonuclanan: "Sonuçlandı",
  iptal: "İptal",
  arsivlendi: "Arşivlendi",
};

const priorityColors = {
  dusuk: "bg-slate-100 text-slate-700",
  orta: "bg-blue-100 text-blue-700",
  yuksek: "bg-orange-100 text-orange-700",
  kritik: "bg-red-100 text-red-700",
};

export default function TQTicketList({ tickets, type = "tickets" }) {
  return (
    <div className="border border-border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {type === "tickets" && <TableHead>Bilet No</TableHead>}
            <TableHead>Başlık</TableHead>
            <TableHead>Müşteri</TableHead>
            {type === "tickets" && <TableHead>Proje</TableHead>}
            <TableHead>Durum</TableHead>
            <TableHead>Öncelik</TableHead>
            {type === "tickets" && <TableHead>Atanan</TableHead>}
            <TableHead>Tarih</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((item) => (
            <TableRow key={item.id}>
              {type === "tickets" && <TableCell className="font-mono text-xs text-muted-foreground">{item.ticket_number || "-"}</TableCell>}
              <TableCell className="font-medium">{item.name || item.title}</TableCell>
              <TableCell>{item.customer_name || "-"}</TableCell>
              {type === "tickets" && <TableCell>{item.project_name || "-"}</TableCell>}
              <TableCell>
                <Badge className={statusColors[item.status] || statusColors.planlama}>
                  {STATUS_LABELS[item.status] || item.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={priorityColors[item.priority] || priorityColors.orta}>
                  {PRIORITY_LABELS[item.priority] || item.priority}
                </Badge>
              </TableCell>
              {type === "tickets" && <TableCell>{item.assigned_to_name || "-"}</TableCell>}
              <TableCell className="text-sm text-muted-foreground">
                {item.start_date ? format(new Date(item.start_date), "dd.MM.yyyy") : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}