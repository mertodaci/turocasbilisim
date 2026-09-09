import { useState } from "react";
import { Circle, ArrowUpCircle, Clock, CheckCircle2, User, Calendar, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import WorkTaskDetailDialog from "./WorkTaskDetailDialog";

const COLUMNS = [
  { key: "beklemede", label: "Beklemede", icon: Circle, color: "text-slate-500", headerColor: "bg-slate-100 border-slate-200" },
  { key: "devam_ediyor", label: "Devam Ediyor", icon: ArrowUpCircle, color: "text-blue-500", headerColor: "bg-blue-50 border-blue-200" },
  { key: "onay_bekliyor", label: "Onay Bekliyor", icon: Clock, color: "text-yellow-600", headerColor: "bg-yellow-50 border-yellow-200" },
  { key: "tamamlandi", label: "Tamamlandı", icon: CheckCircle2, color: "text-green-500", headerColor: "bg-green-50 border-green-200" },
  { key: "iptal", label: "İptal", icon: Circle, color: "text-red-500", headerColor: "bg-red-50 border-red-200" },
];

const PRIORITY_CONFIG = {
  dusuk: { label: "Düşük", color: "bg-slate-100 text-slate-600" },
  orta: { label: "Orta", color: "bg-blue-100 text-blue-700" },
  yuksek: { label: "Yüksek", color: "bg-orange-100 text-orange-700" },
  kritik: { label: "Kritik", color: "bg-red-100 text-red-700" },
};

function KanbanCard({ task, onUpdate }) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.orta;

  return (
    <>
      <div
        className="bg-card border border-border/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setIsDetailOpen(true)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className={cn("text-sm font-medium leading-snug flex-1", task.status === "tamamlandi" && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          <Badge className={cn("text-[10px] shrink-0", priorityCfg.color)}>{priorityCfg.label}</Badge>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {task.assigned_to_name && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{task.assigned_to_name}</span>
            </div>
          )}
          {task.due_date && (() => {
            const due = new Date(task.due_date);
            const today = new Date(); today.setHours(0,0,0,0);
            const isOverdue = due < today && task.status !== 'tamamlandi' && task.status !== 'iptal';
            const isToday = due.toDateString() === today.toDateString();
            return (
              <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-500' : 'text-muted-foreground'}`}>
                <Calendar className="w-3 h-3" />
                <span>{format(due, "d MMM")}</span>
                {isOverdue && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">Gecikti</span>}
                {isToday && <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded">Bugün</span>}
              </div>
            );
          })()}
          {task.attachments?.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>
      </div>
      <WorkTaskDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        task={task}
        onUpdate={onUpdate}
      />
    </>
  );
}

export default function WorkTaskKanban({ tasks, onUpdate }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const ColIcon = col.icon;
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className="flex-shrink-0 w-64">
            <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-xl border border-b-0 mb-0", col.headerColor)}>
              <ColIcon className={cn("w-4 h-4", col.color)} />
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="ml-auto text-xs font-bold text-muted-foreground bg-background/60 rounded-full px-1.5 py-0.5">
                {colTasks.length}
              </span>
            </div>
            <div className={cn("border border-t-0 rounded-b-xl p-2 space-y-2 min-h-32 bg-background/50", col.headerColor.replace("bg-", "border-"))}>
              {colTasks.map((task) => (
                <KanbanCard key={task.id} task={task} onUpdate={(data) => onUpdate(task.id, data)} />
              ))}
              {colTasks.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground/60">Görev yok</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}