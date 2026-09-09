import { useState } from "react";
import { Plus, Users, Search, X, MessageCircle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";
import { useAuth } from "@/lib/AuthContext";
import { isConversationArchivedForUser, isConversationDeletedForUser, isConversationUnreadForUser } from "@/lib/conversationUtils";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Dün";
  return format(d, "d MMM", { locale: tr });
};

const AVATAR_COLORS = ["bg-indigo-500","bg-purple-500","bg-pink-500","bg-blue-500","bg-teal-500","bg-green-500","bg-orange-500"];

export default function ConversationList({ selected, onSelect, onNew, conversations = [] }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Bildirim izni yalnizca kullanici gercekten TIKLAYINCA istenir --
  // sayfa acilir acilmaz istenirse Chrome bunu supheli bulup zamanla
  // istegi tamamen sessizlestiriyor (kullaniciya hic gostermiyor).
  const notifSupported = typeof Notification !== "undefined";
  const [notifPermission, setNotifPermission] = useState(notifSupported ? Notification.permission : "unsupported");
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(false);
  const requestNotifPermission = () => {
    if (!notifSupported) return;
    Notification.requestPermission().then(setNotifPermission);
  };

  const isArchivedForMe = (c) => isConversationArchivedForUser(c, user?.email);
  const isDeletedForMe = (c) => isConversationDeletedForUser(c, user?.email);
  const myConvs = conversations.filter(c => c.participants?.includes(user?.email) && !isArchivedForMe(c) && !isDeletedForMe(c));
  const archivedConvs = conversations.filter(c => c.participants?.includes(user?.email) && isArchivedForMe(c) && !isDeletedForMe(c));

  const filtered = (filterType === "archived" ? archivedConvs : myConvs).filter(conv => {
    const isGroup = conv.type === "group";
    const other = (conv.participants||[]).filter(p=>p!==user?.email);
    const name = isGroup ? conv.name||"Grup Sohbeti" : other[0]||"Sohbet";
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || conv.last_message?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterType==="all" || filterType==="archived" ||
      (filterType==="unread" && conv.last_message_sender_email!==user?.email && conv.last_read_message_id_by_user?.[user?.email]!==conv.last_message_id) ||
      (filterType==="group" && isGroup) ||
      (filterType==="direct" && !isGroup);
    return matchSearch && matchFilter;
  });

  const unreadCount = myConvs.filter(c => {
    return isConversationUnreadForUser(c, user?.email);
  }).length;

  return (
    <div className="flex flex-col h-full">
      {/* BAŞLIK */}
      <div className="px-4 py-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-base">Mesajlar</h2>
            {unreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          <button onClick={onNew} className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors">
            <Plus className="w-4 h-4"/>
          </button>
        </div>
        {notifPermission === "default" && !notifBannerDismissed && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-900 px-3 py-2">
            <Bell className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="flex-1 text-[11px] text-indigo-700 dark:text-indigo-300">Sekme kapalıyken de mesaj bildirimi al</span>
            <button onClick={requestNotifPermission} className="text-[11px] font-semibold text-indigo-600 hover:underline shrink-0">Aç</button>
            <button onClick={() => setNotifBannerDismissed(true)} className="text-indigo-400 hover:text-indigo-600 shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ara..."
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-muted/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
          {search && <button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground"/></button>}
        </div>
        <div className="flex gap-1">
          {[{id:"all",l:"Tümü"},{id:"unread",l:"Okunmamış"},{id:"direct",l:"Bire Bir"},{id:"group",l:"Grup"},{id:"archived",l:"Arşiv"}].map(f=>(
            <button key={f.id} onClick={()=>setFilterType(f.id)}
              className={cn("text-[10px] px-2 py-1 rounded-lg transition-colors font-medium",
                filterType===f.id?"bg-indigo-600 text-white":"bg-muted text-muted-foreground hover:text-foreground")}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* SOHBET LİSTESİ */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20"/>
            <p className="text-xs">{filterType==="archived" ? "Arşivde sohbet yok" : (search||filterType!=="all") ? "Sohbet bulunamadı" : "Henüz sohbet yok"}</p>
          </div>
        ) : filtered.map((conv, idx) => {
          const isGroup = conv.type === "group";
          const isSelected = selected?.id === conv.id;
          const other = (conv.participants||[]).filter(p=>p!==user?.email);
          const name = isGroup ? conv.name||"Grup Sohbeti" : other[0]||"Sohbet";
          const hasUnread = isConversationUnreadForUser(conv, user?.email);
          const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
          const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

          return (
            <button key={conv.id} onClick={()=>onSelect(conv)}
              className={cn("w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/20 flex items-center gap-3 relative",
                isSelected&&"bg-indigo-50 dark:bg-indigo-950/20 border-l-2 border-l-indigo-500")}>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold", isGroup?"bg-gradient-to-br from-violet-500 to-purple-600":avatarColor)}>
                {isGroup ? <Users className="w-4 h-4"/> : initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={cn("text-sm truncate", hasUnread?"font-bold":"font-medium")}>{name}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(conv.last_message_at)}</span>
                </div>
                {conv.last_message && (
                  <p className={cn("text-xs truncate mt-0.5", hasUnread?"font-semibold text-foreground":"text-muted-foreground")}>
                    {conv.last_message_sender_email === user?.email ? "Sen: " : ""}{conv.last_message}
                  </p>
                )}
              </div>
              {hasUnread && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full shrink-0"/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
