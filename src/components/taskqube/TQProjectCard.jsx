import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Building2, User, Calendar, Ticket, FileText } from "lucide-react";
import { format } from "date-fns";

const contractTypeLabels = {
  hizmet_sozlesmesi: "Hizmet Sözleşmesi",
  bakim_sozlesmesi: "Bakım Sözleşmesi",
  bakim_destek: "Bakım & Destek",
  lisans: "Lisans",
  gizlilik: "Gizlilik",
  is_ortakligi: "İş Ortaklığı",
  diger: "Diğer",
};

const STATUS_CONFIG = {
  planlama: { label: "Planlama", color: "bg-slate-100 text-slate-700" },
  devam_ediyor: { label: "Devam Ediyor", color: "bg-blue-100 text-blue-700" },
  beklemede: { label: "Beklemede", color: "bg-yellow-100 text-yellow-700" },
  tamamlandi: { label: "Tamamlandi", color: "bg-green-100 text-green-700" },
  iptal: { label: "Iptal", color: "bg-red-100 text-red-700" },
};

const PRIORITY_CONFIG = {
  dusuk: { label: "Dusuk", color: "bg-slate-100 text-slate-600" },
  orta: { label: "Orta", color: "bg-blue-100 text-blue-700" },
  yuksek: { label: "Yuksek", color: "bg-orange-100 text-orange-700" },
  kritik: { label: "Kritik", color: "bg-red-100 text-red-700" },
};

export default function TQProjectCard({ project, onEdit, onDelete, ticketCount = null, contractType = null }) {
  const sCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planlama;
  const pCfg = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.orta;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-border/60 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug flex-1 line-clamp-2">
            {project.name}
          </CardTitle>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          <Badge className={`${sCfg.color} text-xs`}>{sCfg.label}</Badge>
          <Badge className={`${pCfg.color} text-xs`}>{pCfg.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        {project.customer_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{project.customer_name}</span>
          </div>
        )}
        {contractType && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{contractTypeLabels[contractType] || contractType}</span>
          </div>
        )}
        {project.manager_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{project.manager_name}</span>
          </div>
        )}
        {project.end_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Bitis: {format(new Date(project.end_date), "dd.MM.yyyy")}</span>
          </div>
        )}
        {ticketCount !== null && (
          <div className="flex items-center gap-2 text-sm pt-1 border-t border-border/40">
            <Ticket className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-medium text-foreground">{ticketCount}</span>
            <span className="text-muted-foreground">aktif bilet</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
