import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Lightbulb, Plus, X, Check, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import StickyNoteCard from "@/components/ideas/StickyNoteCard";
import IdeaFormDialog from "@/components/ideas/IdeaFormDialog";

const statusConfig = {
  beklemede: { label: "Beklemede", color: "text-amber-700 bg-amber-100", icon: Clock },
  inceleniyor: { label: "İnceleniyor", color: "text-blue-700 bg-blue-100", icon: Search },
  onaylandi: { label: "Onaylandı", color: "text-emerald-700 bg-emerald-100", icon: Check },
  reddedildi: { label: "Reddedildi", color: "text-red-700 bg-red-100", icon: X },
};

export default function Ideas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPrivileged = user?.role === "admin" || user?.role === "yonetici";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState(null);

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["ideas"],
    queryFn: () => flowApi.entities.Idea.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.Idea.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      setDialogOpen(false);
      toast.success("Fikriniz iletildi!");
    },
    onError: (err) => {
      toast.error("Fikir eklenemedi: " + (err?.message || "Bilinmeyen hata"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Idea.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      setEditingIdea(null);
      toast.success("Güncellendi");
    },
    onError: (err) => {
      toast.error("Güncelleme başarısız: " + (err?.message || "Bilinmeyen hata"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.Idea.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      toast.success("Fikir silindi");
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            Bir Fikrim Var
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Fikirlerinizi yapışkan notlarla paylaşın</p>
        </div>
        <Button onClick={() => { setEditingIdea(null); setDialogOpen(true); }} className="rounded-xl gap-1.5">
          <Plus className="w-4 h-4" /> Fikir Ekle
        </Button>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 text-amber-300" />
          <p className="font-medium text-lg">Henüz fikir paylaşılmadı</p>
          <p className="text-sm mt-1">İlk fikri sen paylaş!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ideas.map((idea) => (
            <StickyNoteCard
              key={idea.id}
              idea={idea}
              isPrivileged={isPrivileged}
              currentUser={user}
              statusConfig={statusConfig}
              onEdit={() => { setEditingIdea(idea); setDialogOpen(true); }}
              onDelete={() => deleteMutation.mutate(idea.id)}
              onStatusChange={(status) => updateMutation.mutate({ id: idea.id, data: { status } })}
              onNoteSubmit={(note) => updateMutation.mutate({ id: idea.id, data: { manager_note: note, status: "inceleniyor" } })}
            />
          ))}
        </div>
      )}

      <IdeaFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingIdea(null); }}
        idea={editingIdea}
        onSubmit={(data) => {
          if (editingIdea) {
            updateMutation.mutate({ id: editingIdea.id, data });
          } else {
            createMutation.mutate({ ...data, submitted_by_name: user?.full_name || user?.email });
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}