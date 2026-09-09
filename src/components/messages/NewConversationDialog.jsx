import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, User, Search, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = ["bg-indigo-500","bg-purple-500","bg-pink-500","bg-blue-500","bg-teal-500","bg-green-500","bg-orange-500"];

export default function NewConversationDialog({ onClose, onCreated }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [type, setType] = useState("one_on_one");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");

  // Hem employees hem users tablosundan çek
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-aktif"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users-list-msg"],
    queryFn: () => flowApi.auth.users(),
  });

  // Email-isim eşleştir: employees öncelikli, yoksa users
  // Aktif çalışanların email seti (işten ayrılanları elemek için)
  const aktifCalisanEmails = new Set(employees.map(e => e.email).filter(Boolean));
  const people = (() => {
    const result = [];
    const seen = new Set();
    employees.forEach(e => {
      if (e.email && e.email !== user?.email) {
        seen.add(e.email);
        result.push({ email: e.email, name: e.full_name || e.email });
      }
    });
    users.forEach(u => {
      if (u.role === "musteri") return; // müşteri kullanıcıları iç mesajlaşmada gösterilmez
      if (u.status === "pasif") return; // pasif kullanıcılar gösterilmez
      if (!aktifCalisanEmails.has(u.email)) return; // sadece aktif çalışanlar (işten ayrılanlar gizli)
      if (u.email && u.email !== user?.email && !seen.has(u.email)) {
        result.push({ email: u.email, name: u.full_name || u.email });
      }
    });
    result.sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
    return result;
  })();

  const filtered = people.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()));

  const createMutation = useMutation({
    mutationFn: async () => {
      const participants = [...new Set([user.email, ...selected])];
      if (type === "one_on_one") {
        const existing = await flowApi.entities.Conversation.list();
        const found = existing.find(c =>
          c.type === "one_on_one" && c.status !== "archived" &&
          c.participants?.length === 2 &&
          c.participants.includes(user.email) &&
          c.participants.includes(selected[0])
        );
        if (found) return found;
      }
      return flowApi.entities.Conversation.create({
        type, name: type === "group" ? groupName : "",
        participants, created_by_name: user.full_name,
        last_message_at: new Date().toISOString(),
      });
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onCreated(conv);
    },
  });

  const toggle = (email) => {
    if (type === "one_on_one") {
      setSelected(selected.includes(email) ? [] : [email]);
    } else {
      setSelected(p => p.includes(email) ? p.filter(e=>e!==email) : [...p, email]);
    }
  };

  const canCreate = selected.length > 0 && (type === "one_on_one" ? selected.length === 1 : groupName.trim());

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Yeni Sohbet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[{key:"one_on_one",label:"Birebir",icon:User},{key:"group",label:"Grup",icon:Users}].map(({key,label,icon:Icon})=>(
              <button key={key} onClick={()=>{setType(key);setSelected([]);}}
                className={cn("flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                  type===key?"border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30":"border-border/50 text-muted-foreground hover:border-border")}>
                <Icon className="w-4 h-4"/>{label}
              </button>
            ))}
          </div>

          {type === "group" && (
            <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="Grup adı *"
              className="w-full px-3 py-2 text-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-background"/>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Kişi ara..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-background"/>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Kişi bulunamadı</p>
            ) : filtered.map((p, idx) => {
              const isSelected = selected.includes(p.email);
              const initials = p.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
              return (
                <button key={p.email} onClick={()=>toggle(p.email)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                    isSelected?"bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800":"hover:bg-muted/50 border border-transparent",
                    type==="one_on_one"&&selected.length>0&&!isSelected&&"opacity-40")}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", AVATAR_COLORS[idx%AVATAR_COLORS.length])}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                  {isSelected && <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shrink-0"><X className="w-3 h-3 text-white"/></div>}
                </button>
              );
            })}
          </div>

          {selected.length > 0 && type === "group" && (
            <div className="flex flex-wrap gap-1">
              {selected.map(email => {
                const p = people.find(x=>x.email===email);
                return <span key={email} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full flex items-center gap-1">
                  {p?.name||email}
                  <button onClick={()=>toggle(email)}><X className="w-3 h-3"/></button>
                </span>;
              })}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 text-sm border border-border/50 rounded-xl hover:bg-muted transition-colors">İptal</button>
            <button disabled={!canCreate||createMutation.isPending} onClick={()=>createMutation.mutate()}
              className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 font-medium">
              {createMutation.isPending?"Oluşturuluyor...":"Sohbet Başlat"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
