import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { X } from "lucide-react";

export default function AddParticipantsDialog({ conversation, onClose, onUpdated }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-aktif"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users-list-msg"],
    queryFn: () => flowApi.auth.users(),
  });

  const currentParticipants = conversation.participants || [];

  // Email -> isim eslemesi (NewConversationDialog'daki desenle ayni):
  // employees oncelikli, yoksa users; musteri/pasif kullanicilar iс mesajlasmada gosterilmez.
  const aktifCalisanEmails = new Set(employees.map((e) => e.email).filter(Boolean));
  const nameByEmail = (() => {
    const map = new Map();
    employees.forEach((e) => { if (e.email) map.set(e.email, e.full_name || e.email); });
    users.forEach((u) => {
      if (u.role === "musteri") return;
      if (u.status === "pasif") return;
      if (!aktifCalisanEmails.has(u.email)) return;
      if (u.email && !map.has(u.email)) map.set(u.email, u.full_name || u.email);
    });
    return map;
  })();

  // Zaten grupta olmayan çalışanları listele
  const availableEmployees = employees.filter(
    (e) => e.email && !currentParticipants.includes(e.email)
  );

  const toggleEmployee = (email) => {
    setSelected((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const newParticipants = [...new Set([...currentParticipants, ...selected])];
      return flowApi.entities.Conversation.update(conversation.id, {
        participants: newParticipants,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`${selected.length} katılımcı eklendi`);
      onUpdated(updated);
      setSelected([]);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (email) => {
      const next = currentParticipants.filter((e) => e !== email);
      return flowApi.entities.Conversation.update(conversation.id, { participants: next });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Katılımcı çıkarıldı");
      onUpdated(updated);
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Katılımcıları Yönet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-1">Mevcut Katılımcılar ({currentParticipants.length})</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {currentParticipants.map((email) => {
                const name = nameByEmail.get(email) || email;
                const isLast = currentParticipants.length <= 1;
                return (
                  <div key={email} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}{email === user?.email ? " (sen)" : ""}</p>
                      <p className="text-xs text-muted-foreground truncate">{email}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isLast || removeMutation.isPending}
                      title={isLast ? "Son katılımcı çıkarılamaz" : "Gruptan çıkar"}
                      onClick={() => removeMutation.mutate(email)}
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-1">Yeni Katılımcı Ekle</p>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {availableEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Eklenebilecek başka çalışan yok.
                </p>
              ) : (
                availableEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.email)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selected.includes(emp.email)}
                      onCheckedChange={() => {}}
                    />
                    <div>
                      <p className="text-sm font-medium">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Kapat</Button>
            <Button
              disabled={selected.length === 0 || addMutation.isPending}
              onClick={() => addMutation.mutate()}
              className="flex-1 rounded-xl"
            >
              Ekle ({selected.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
