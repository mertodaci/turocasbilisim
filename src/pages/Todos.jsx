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
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const statusConfig = {
  yapilacak: { label: "Yapılacak", icon: Circle, color: "text-slate-600", bg: "bg-white/70" },
  devam_ediyor: { label: "Devam Ediyor", icon: Clock, color: "text-blue-700", bg: "bg-white/70" },
  tamamlandi: { label: "Tamamlandı", icon: CheckCircle2, color: "text-green-700", bg: "bg-white/70" },
  ertelendi: { label: "Ertelendi", icon: AlertCircle, color: "text-amber-700", bg: "bg-white/70" },
};

const priorityConfig = {
  dusuk: { label: "Düşük", color: "text-slate-600 border-slate-400/50" },
  orta: { label: "Orta", color: "text-amber-700 border-amber-500/50" },
  yuksek: { label: "Yüksek", color: "text-red-700 border-red-500/50" },
};

// Post-it paleti — todos'un sırasına göre döngüsel atanır (backend'de
// renk alanı yok, yeni bir DB kolonu eklemeden çeşitlilik sağlar).
const NOTE_PALETTE = [
  { bg: "bg-yellow-200 dark:bg-yellow-900/50", pin: "bg-yellow-500" },
  { bg: "bg-pink-200 dark:bg-pink-900/50", pin: "bg-pink-500" },
  { bg: "bg-sky-200 dark:bg-sky-900/50", pin: "bg-sky-500" },
  { bg: "bg-green-200 dark:bg-green-900/50", pin: "bg-green-500" },
  { bg: "bg-orange-200 dark:bg-orange-900/50", pin: "bg-orange-500" },
  { bg: "bg-purple-200 dark:bg-purple-900/50", pin: "bg-purple-500" },
  { bg: "bg-teal-200 dark:bg-teal-900/50", pin: "bg-teal-500" },
];
const noteRotation = (i) => `${((i % 5) - 2) * 1.5}deg`;

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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Yapılacaklar</h1>
        <p className="text-sm text-muted-foreground mt-1">Kişisel görev panonuz</p>
      </div>

      {showForm && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
          <Input
            placeholder="Görev başlığı *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-xl"
            autoFocus
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

      {/* Pano */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-2">
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="min-h-[160px] rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm font-medium">Yeni Not Ekle</span>
            </button>
          )}

          {filtered.length === 0 && showForm === false && todos.length === 0 && (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Görev bulunmuyor</p>
            </div>
          )}

          {filtered.map((todo, i) => {
            const st = statusConfig[todo.status] || statusConfig.yapilacak;
            const Icon = st.icon;
            const pri = priorityConfig[todo.priority] || priorityConfig.orta;
            const note = NOTE_PALETTE[i % NOTE_PALETTE.length];
            return (
              <div
                key={todo.id}
                style={{ transform: `rotate(${noteRotation(i)})` }}
                className={cn(
                  "relative rounded-md p-4 pt-5 shadow-md hover:shadow-lg hover:rotate-0 hover:scale-105 transition-all min-h-[160px] flex flex-col",
                  note.bg
                )}
              >
                <span className={cn("absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ring-2 ring-white/70 dark:ring-black/30", note.pin)} />

                <button
                  onClick={() => deleteMutation.mutate(todo.id)}
                  className="absolute top-2 right-2 text-black/30 hover:text-destructive transition-colors"
                  title="Sil"
                >
                  <X className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    const next = { yapilacak: "devam_ediyor", devam_ediyor: "tamamlandi", tamamlandi: "yapilacak", ertelendi: "yapilacak" };
                    updateMutation.mutate({ id: todo.id, data: { status: next[todo.status] || "yapilacak" } });
                  }}
                  className="self-start mb-1.5"
                  title="Durumu ilerlet"
                >
                  <Icon className={cn("w-5 h-5", st.color)} />
                </button>

                <p className={cn("font-semibold text-sm text-slate-900 pr-4", todo.status === "tamamlandi" && "line-through opacity-60")}>
                  {todo.title}
                </p>
                {todo.description && (
                  <p className="text-xs text-slate-700/80 mt-1 line-clamp-3">{todo.description}</p>
                )}

                <div className="mt-auto pt-3 flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px] bg-white/50", pri.color)}>{pri.label}</Badge>
                  <Select value={todo.status} onValueChange={(v) => updateMutation.mutate({ id: todo.id, data: { status: v } })}>
                    <SelectTrigger className={cn("h-6 px-2 text-[10px] rounded-lg border-0", st.bg, st.color, "w-auto gap-1")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {todo.due_date && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-700/80">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(todo.due_date), "d MMM", { locale: tr })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
