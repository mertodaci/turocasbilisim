import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { flowApi } from "@/api/flowApiClient";
import { Calendar, User, Pencil, CheckCircle2, Circle, ArrowUpCircle, Clock, Trash2, MessageSquare, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WorkTaskEditDialog from "./WorkTaskEditDialog";
import WorkTaskDetailDialog from "./WorkTaskDetailDialog";

const STATUS_CONFIG = {
  beklemede: { label: "Beklemede", icon: Circle, color: "text-slate-500" },
  devam_ediyor: { label: "Devam Ediyor", icon: ArrowUpCircle, color: "text-blue-500" },
  onay_bekliyor: { label: "Onay Bekliyor", icon: Clock, color: "text-yellow-500" },
  tamamlandi: { label: "Tamamlandı", icon: CheckCircle2, color: "text-green-500" },
  iptal: { label: "İptal", icon: Circle, color: "text-red-500" },
};

const PRIORITY_CONFIG = {
  dusuk: { label: "Düşük", color: "bg-slate-100 text-slate-700" },
  orta: { label: "Orta", color: "bg-blue-100 text-blue-700" },
  yuksek: { label: "Yüksek", color: "bg-orange-100 text-orange-700" },
  kritik: { label: "Kritik", color: "bg-red-100 text-red-700" },
};

export default function WorkTaskCard({ task, onUpdate, onDelete }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const StatusIcon = STATUS_CONFIG[task.status]?.icon || Circle;
  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.beklemede;
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.orta;

  const canEdit = user?.role === "admin" || user?.role === "yonetici" ||
    task.assigned_by_id === user?.id || task.assigned_to_id === user?.id;
  const canDelete = user?.role === "admin" || user?.role === "yonetici" || task.created_by_id === user?.id;

  const logStatusChange = useMutation({
    mutationFn: ({ oldStatus, newStatus }) =>
      flowApi.entities.TaskComment.create({
        task_id: task.id,
        author_id: user.id,
        author_name: user.full_name || user.email,
        author_email: user.email,
        content: `Durum değiştirildi: ${STATUS_CONFIG[oldStatus]?.label} → ${STATUS_CONFIG[newStatus]?.label}`,
        type: "status_change",
        old_status: oldStatus,
        new_status: newStatus,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", task.id] });
    },
  });

  const handleStatusChange = (newStatus) => {
    if (newStatus === task.status) return;
    logStatusChange.mutate({ oldStatus: task.status, newStatus });
    onUpdate({ status: newStatus });
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setIsDetailOpen(true)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon className={`w-4 h-4 shrink-0 ${statusConfig.color}`} />
                <h3 className={`font-semibold truncate ${task.status === "tamamlandi" ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </h3>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 ml-6">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
              {canEdit && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditOpen(true)}>
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {canDelete && onDelete && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Circle className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleStatusChange("beklemede")}>
                    <Circle className="w-4 h-4 mr-2 text-slate-500" /> Beklemede
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange("devam_ediyor")}>
                    <ArrowUpCircle className="w-4 h-4 mr-2 text-blue-500" /> Devam Ediyor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange("onay_bekliyor")}>
                    <Clock className="w-4 h-4 mr-2 text-yellow-500" /> Onay Bekliyor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange("tamamlandi")}>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Tamamlandı
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange("iptal")}>
                    <Circle className="w-4 h-4 mr-2 text-red-500" /> İptal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{task.assigned_to_name || "Atanmadı"}</span>
            </div>
            {task.due_date && (() => {
              const due = new Date(task.due_date);
              const today = new Date(); today.setHours(0,0,0,0);
              const isOverdue = due < today && task.status !== 'tamamlandi' && task.status !== 'iptal';
              const isToday = due.toDateString() === today.toDateString();
              return (
                <div className={`flex items-center gap-1.5 font-medium ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-500' : 'text-muted-foreground'}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{format(due, "d MMM yyyy")}</span>
                  {isOverdue && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">Gecikti</span>}
                  {isToday && <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded">Bugün</span>}
                </div>
              );
            })()}
            {task.attachments?.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>{task.attachments.length} dosya</span>
              </div>
            )}
            <button
              className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => { e.stopPropagation(); setIsDetailOpen(true); }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Detay & Yorum
            </button>
          </div>
        </CardContent>
      </Card>

      <WorkTaskEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        task={task}
        onUpdate={onUpdate}
      />
      <WorkTaskDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        task={task}
        onUpdate={onUpdate}
      />
    </>
  );
}