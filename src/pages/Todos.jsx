import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { useTodos } from "@/lib/NotificationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const statusConfig = {
  yapilacak: { label: "Yapılacak", icon: Circle, color: "text-slate-500", bg: "bg-slate-100" },
  devam_ediyor: { label: "Devam Ediyor", icon: Clock, color: "text-blue-500", bg: "bg-blue-100" },
  tamamlandi: { label: "Tamamlandı", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100" },
  ertelendi: { label: "Ertelendi", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-100" },
};

const priorityConfig = {
  dusuk: { label: "Düşük", color: "text-slate-500 border-slate-300" },
  orta: { label: "Orta", color: "text-amber-600 border-amber-300" },
  yuksek: { label: "Yüksek", color: "text-red-500 border-red-300" },
};

export default function Todos() {
  const { user } = useAuth();
  const { setUnreadTodoCount } = useTodos();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("hepsi");
  const [form, setForm] = useState({ title: "", description: "", priority: "orta", due_date: "", status: "yapilacak" });

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos", user?.email],
    queryFn: () => flowApi.entities.Todo.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
  });



  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.Todo.create({ ...data, owner_email: user?.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", user?.email] });
      setForm({ title: "", description: "", priority: "orta", due_date: "", status: "yapilacak" });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Todo.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos", user?.email] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.Todo.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos", user?.email] }),
  });

  const filtered = filter === "hepsi" ? todos : todos.filter(t => t.status === filter);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Yapılacaklar</h1>
          <p className="text-sm text-muted-foreground mt-1">Kişisel görev listeniz</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Görev Ekle
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
          <Input
            placeholder="Görev başlığı *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-xl"
          />
          <Textarea
            placeholder="Açıklama (opsiyonel)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-xl h-20"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Öncelik" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dusuk">Düşük</SelectItem>
                <SelectItem value="orta">Orta</SelectItem>
                <SelectItem value="yuksek">Yüksek</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>İptal</Button>
            <Button
              className="rounded-xl"
              disabled={!form.title || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              Kaydet
            </Button>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "hepsi", label: "Hepsi" },
          ...Object.entries(statusConfig).map(([key, v]) => ({ key, label: v.label }))
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
              filter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Görev bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((todo) => {
            const st = statusConfig[todo.status] || statusConfig.yapilacak;
            const Icon = st.icon;
            const pri = priorityConfig[todo.priority] || priorityConfig.orta;
            return (
              <div
                key={todo.id}
                className={cn(
                  "bg-card border border-border/50 rounded-xl p-4 flex items-start gap-3 shadow-sm transition-all",
                  todo.status === "tamamlandi" && "opacity-60"
                )}
              >
                <button
                  onClick={() => {
                    const next = { yapilacak: "devam_ediyor", devam_ediyor: "tamamlandi", tamamlandi: "yapilacak", ertelendi: "yapilacak" };
                    updateMutation.mutate({ id: todo.id, data: { status: next[todo.status] || "yapilacak" } });
                  }}
                  className="mt-0.5 shrink-0"
                >
                  <Icon className={cn("w-5 h-5", st.color)} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium text-sm", todo.status === "tamamlandi" && "line-through text-muted-foreground")}>
                    {todo.title}
                  </p>
                  {todo.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{todo.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={cn("text-xs", pri.color)}>{pri.label}</Badge>
                    <Select value={todo.status} onValueChange={(v) => updateMutation.mutate({ id: todo.id, data: { status: v } })}>
                      <SelectTrigger className={cn("h-6 px-2 text-xs rounded-lg border-0", st.bg, st.color, "w-auto gap-1")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {todo.due_date && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(todo.due_date), "d MMM", { locale: tr })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(todo.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}