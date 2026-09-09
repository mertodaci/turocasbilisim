import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Send, User, Calendar, Clock, ArrowUpCircle, CheckCircle2,
  Circle, Paperclip, MessageSquare, History
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  beklemede: { label: "Beklemede", icon: Circle, color: "text-slate-500", bg: "bg-slate-100" },
  devam_ediyor: { label: "Devam Ediyor", icon: ArrowUpCircle, color: "text-blue-500", bg: "bg-blue-100" },
  onay_bekliyor: { label: "Onay Bekliyor", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
  tamamlandi: { label: "Tamamlandı", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100" },
  iptal: { label: "İptal", icon: Circle, color: "text-red-500", bg: "bg-red-100" },
};

const PRIORITY_CONFIG = {
  dusuk: { label: "Düşük", color: "bg-slate-100 text-slate-700" },
  orta: { label: "Orta", color: "bg-blue-100 text-blue-700" },
  yuksek: { label: "Yüksek", color: "bg-orange-100 text-orange-700" },
  kritik: { label: "Kritik", color: "bg-red-100 text-red-700" },
};

export default function WorkTaskDetailDialog({ open, onOpenChange, task, onUpdate }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState("comments");
  const bottomRef = useRef(null);

  const { data: comments = [] } = useQuery({
    queryKey: ["task-comments", task?.id],
    queryFn: () => flowApi.entities.TaskComment.filter({ task_id: task.id }, "created_date"),
    enabled: !!task?.id && open,
  });

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  const addCommentMutation = useMutation({
    mutationFn: (data) => flowApi.entities.TaskComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", task?.id] });
      setNewComment("");
    },
  });

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({
      task_id: task.id,
      author_id: user.id,
      author_name: user.full_name || user.email,
      author_email: user.email,
      content: newComment.trim(),
      type: "comment",
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  if (!task) return null;

  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.beklemede;
  const StatusIcon = statusCfg.icon;
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.orta;

  const taskComments = comments.filter(c => c.type === "comment");
  const statusLogs = comments.filter(c => c.type === "status_change");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-0">
          <div className="flex items-start gap-3">
            <StatusIcon className={cn("w-5 h-5 mt-0.5 shrink-0", statusCfg.color)} />
            <div className="flex-1 min-w-0">
              <DialogTitle className={cn("text-lg leading-tight", task.status === "tamamlandi" && "line-through text-muted-foreground")}>
                {task.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className={cn("text-xs", statusCfg.bg, statusCfg.color, "border-0")}>
                  {statusCfg.label}
                </Badge>
                <Badge className={cn("text-xs", priorityCfg.color)}>
                  {priorityCfg.label}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Task Meta */}
        <div className="grid grid-cols-2 gap-3 py-3 border-y border-border/50 text-sm">
          {task.assigned_to_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground">{task.assigned_to_name}</span>
            </div>
          )}
          {task.assigned_by_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">Atayan:</span>
              <span className="font-medium text-foreground text-xs">{task.assigned_by_name}</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Teslim: {format(new Date(task.due_date), "d MMMM yyyy")}</span>
            </div>
          )}
          {task.start_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Başlangıç: {format(new Date(task.start_date), "d MMMM yyyy")}</span>
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            {task.description}
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/50">
          <button
            onClick={() => setActiveTab("comments")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "comments"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Diyalog ({taskComments.length})
          </button>
          {task.attachments?.length > 0 && (
            <button
              onClick={() => setActiveTab("files")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "files"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Paperclip className="w-3.5 h-3.5" />
              Dosyalar ({task.attachments.length})
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === "comments" && (
            <div className="space-y-3 py-2">
              {taskComments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Henüz yorum yok. İlk yorumu siz yapın!
                </div>
              )}
              {taskComments.map((comment) => {
                const isMe = comment.author_id === user.id;
                return (
                  <div key={comment.id} className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}>
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-primary">
                          {(comment.author_name || comment.sender_name)?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                    <div className={cn("max-w-[75%]", isMe ? "items-end" : "items-start", "flex flex-col")}>
                      {!isMe && (
                        <span className="text-xs text-muted-foreground mb-1 ml-1">{comment.author_name || comment.sender_name}</span>
                      )}
                      <div className={cn(
                        "rounded-2xl px-3 py-2 text-sm",
                        isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {comment.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                        {comment.created_date ? format(new Date(comment.created_date), "d MMM, HH:mm") : ""}
                      </span>
                    </div>
                    {isMe && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-semibold text-primary-foreground">
                          {user.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {activeTab === "history" && (
            <div className="py-2 space-y-2">
              {statusLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Henüz durum değişikliği yok.
                </div>
              )}
              {statusLogs.map((log) => {
                const oldCfg = STATUS_CONFIG[log.old_status];
                const newCfg = STATUS_CONFIG[log.new_status];
                return (
                  <div key={log.id} className="flex items-start gap-3 text-sm py-2 border-b border-border/30">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <History className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-foreground">
                        <span className="font-medium">{log.author_name || log.sender_name}</span> durumu değiştirdi:{" "}
                        <span className={cn("font-medium", oldCfg?.color)}>{oldCfg?.label}</span>
                        {" → "}
                        <span className={cn("font-medium", newCfg?.color)}>{newCfg?.label}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.created_date ? format(new Date(log.created_date), "d MMMM yyyy, HH:mm") : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "files" && (
            <div className="py-2 space-y-2">
              {(task.attachments || []).map((url, idx) => {
                const fileName = url.split("/").pop()?.split("?")[0] || `Dosya ${idx + 1}`;
                return (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-primary hover:underline truncate">{fileName}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Comment Input */}
        {activeTab === "comments" && (
          <div className="flex gap-2 pt-3 border-t border-border/50">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Yorum yazın... (Enter ile gönderin)"
              className="min-h-0 h-10 resize-none py-2.5 text-sm"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSendComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}