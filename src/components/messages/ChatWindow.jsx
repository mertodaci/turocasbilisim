import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Send, Video, Users, User, ExternalLink, UserPlus, ChevronLeft, Archive, ArchiveRestore, Trash2, Paperclip, FileText, Download, X, Reply, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { useMessages } from "@/lib/NotificationContext";
import MeetingDialog from "./MeetingDialog";
import AddParticipantsDialog from "./AddParticipantsDialog";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const getInitials = (name) => name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
const AVATAR_COLORS = ["bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-blue-500", "bg-teal-500", "bg-green-500", "bg-orange-500", "bg-red-500"];
// Ayni kisi her yerde (gonderen etiketinde, "gorenler" rozetlerinde) ayni
// renk alsin diye -- liste sirasina degil, email'in kendisine gore sabit
// bir renk secilir (basit bir hash).
function colorForEmail(email) {
  let h = 0;
  for (const ch of String(email || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Kucuk yuvarlak avatar: calisanin gercek fotografi varsa onu, yoksa
// baş harfleriyle renkli bir daire gosterir.
function MiniAvatar({ email, name, employees, size = "w-5 h-5", title }) {
  const emp = employees?.find((e) => e.email?.toLowerCase() === email?.toLowerCase());
  const displayName = name || emp?.full_name || email;
  return (
    <div
      title={title || displayName}
      className={cn("rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white font-semibold ring-1 ring-background", size, emp?.avatar_url ? "" : colorForEmail(email))}
      style={{ fontSize: "0.55rem" }}
    >
      {emp?.avatar_url ? (
        <img src={emp.avatar_url} alt={displayName} className="w-full h-full object-cover" />
      ) : (
        getInitials(displayName)
      )}
    </div>
  );
}

// Tek kullanicinin bir mesaja ayni anda sadece TEK bir tepkisi olabilir --
// ayni emoji'ye tekrar tiklarsa tepki kalkar, farkli bir emoji secerse
// oncekinin yerine gecer.
function toggleReaction(reactions, emoji, email) {
  const next = {};
  for (const [e, emails] of Object.entries(reactions || {})) {
    const filtered = (emails || []).filter((x) => x !== email);
    if (filtered.length) next[e] = filtered;
  }
  const alreadyHadThis = (reactions?.[emoji] || []).includes(email);
  if (!alreadyHadThis) next[emoji] = [...(next[emoji] || []), email];
  return next;
}

export default function ChatWindow({ conversation, onConversationUpdate, onBack }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { setActiveConversationId } = useMessages();
  const [text, setText] = useState("");
  const [showMeetDialog, setShowMeetDialog] = useState(false);
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversation.id],
    queryFn: () => flowApi.entities.Message.filter({ conversation_id: conversation.id }, "-created_date"),
    // SSE bildirimi kacirilirsa/aksarsa diye yedek: soldaki sohbet listesi
    // (Messages.jsx) zaten kendi basina 3sn'de bir tazeleniyor, mesaj
    // listesi SSE'ye tek basina bagimliydi -- artik o da ayni sekilde.
    refetchInterval: 3000,
  });

  // Gonderen etiketinde ve "gorenler" rozetlerinde gercek fotograf/isim
  // gostermek icin -- degisimi az oldugu icin uzun staleTime yeterli.
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-avatars"],
    queryFn: () => flowApi.entities.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const reactionMutation = useMutation({
    mutationFn: ({ id, reactions }) => flowApi.entities.Message.update(id, { reactions }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", conversation.id] }),
  });
  const handleToggleReaction = (msg, emoji) => {
    reactionMutation.mutate({ id: msg.id, reactions: toggleReaction(msg.reactions, emoji, user?.email) });
  };

  // Bu sohbetin "su an acik" oldugunu bildirim sistemine kaydet -- boylece
  // masaustu bildirimi, zaten baktigin sohbet icin tekrar gosterilmez
  // (WhatsApp'taki gibi). Messages.jsx bu component'i her sohbet
  // degisiminde key={conversation.id} ile yeniden mount ettigi icin sade
  // bir mount/unmount effect'i yeterli.
  useEffect(() => {
    setActiveConversationId(conversation.id);
    return () => setActiveConversationId((cur) => (cur === conversation.id ? null : cur));
  }, []);

  // Sohbeti ilk actiginda (veya baska bir sohbete gecince) en alta ANINDA
  // git -- animasyonlu kaydirma, cok mesajli sohbetlerde gereksiz bir
  // bekleme hissi yaratiyordu. Sohbet acikken yeni mesaj gelirse yumusak
  // kaydirma kalsin (guzel bir dokunus, o zaman gereksiz degil).
  const isFirstLoadRef = useRef(true);
  useEffect(() => {
    isFirstLoadRef.current = true;
  }, [conversation.id]);

  useEffect(() => {
    if (messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: isFirstLoadRef.current ? "auto" : "smooth" });
    isFirstLoadRef.current = false;
  }, [messages]);

  useEffect(() => {
    // Backend, mesaj tablosunda degisiklik oldugunu (hangi konusma oldugunu
    // belirtmeden) 3 saniyede bir SSE ile bildiriyor -- bu yuzden hangi
    // konusmada oldugumuza bakmaksizin acik konusmayi tazeliyoruz.
    const unsubscribe = flowApi.entities.Message.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversation.id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });
    return unsubscribe;
  }, [conversation.id, queryClient]);

  useEffect(() => {
    if (messages.length > 0 && user?.email) {
      // messages "-created_date" (en yeni once) sirali geliyor -- son
      // mesaj dizinin SONUNDA degil BASINDA (messages[0]).
      const lastMessage = messages[0];
      const alreadyRead = conversation.last_read_message_id_by_user?.[user.email] === lastMessage.id;
      if (!alreadyRead && !lastMessage.id?.startsWith('optimistic-')) {
        flowApi.entities.Conversation.update(conversation.id, {
          last_read_message_id_by_user: {
            ...conversation.last_read_message_id_by_user,
            [user.email]: lastMessage.id,
          },
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["notif-conversations"] });
        });
      }
    }
  }, [messages, user?.email, conversation.id]);

  const sendMutation = useMutation({
    onMutate: async ({ content, messageType = "text", fileData = null }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", conversation.id] });
      const previousMessages = queryClient.getQueryData(["messages", conversation.id]);
      const optimisticMsg = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversation.id,
        sender_email: user.email,
        sender_name: user.full_name,
        content: messageType === "file" ? `📎 ${fileData?.name}` : content,
        message_type: messageType,
        created_date: new Date().toISOString(),
        reply_to_id: replyingTo?.id || null,
      };
      // messages "-created_date" (en yeni once) sirali -- yeni mesaj
      // dizinin SONUNA degil BASINA eklenmeli, yoksa ters cevrilip
      // gosterilirken en yeni mesaj en USTE (gorunum disina) dusuyor.
      queryClient.setQueryData(["messages", conversation.id], (old) => [optimisticMsg, ...(old || [])]);
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["messages", conversation.id], context.previousMessages);
      toast.error("Mesaj gönderilemedi");
    },
    mutationFn: async ({ content, messageType = "text", fileData = null }) => {
      const msgData = {
        conversation_id: conversation.id,
        sender_email: user.email,
        sender_name: user.full_name,
        content,
        message_type: messageType,
      };
      if (replyingTo) msgData.reply_to_id = replyingTo.id;
      if (fileData) {
        msgData.file_url = fileData.url;
        msgData.file_name = fileData.name;
        msgData.file_size = fileData.size;
        msgData.file_type = fileData.type;
      }
      const msg = await flowApi.entities.Message.create(msgData);
      await flowApi.entities.Conversation.update(conversation.id, {
        last_message: messageType === 'file' ? `📎 ${fileData?.name}` : content,
        last_message_at: new Date().toISOString(),
        last_message_sender_email: user.email,
        last_message_id: msg.id,
      });
      return msg;
    },
    onSuccess: (msg) => {
      flowApi.entities.Conversation.update(conversation.id, {
        last_read_message_id_by_user: {
          ...conversation.last_read_message_id_by_user,
          [user.email]: msg.id,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["messages", conversation.id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setText("");
      setSelectedFile(null);
      setReplyingTo(null);
    },
  });

  const handleSend = () => {
    if (!text.trim() && !selectedFile) return;
    if (selectedFile) {
      handleFileSend();
    } else {
      const content = text.trim();
      setText("");
      sendMutation.mutate({ content });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Dosya 50MB'dan büyük olamaz");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileSend = async () => {
    if (!selectedFile) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Yükleme başarısız');
      const fileData = await res.json();
      await sendMutation.mutateAsync({
        content: selectedFile.name,
        messageType: 'file',
        fileData,
      });
      toast.success("Dosya gönderildi");
    } catch (err) {
      toast.error("Dosya gönderilemedi");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isArchivedByMe = (conversation.archived_by || []).includes(user?.email);
  const archiveMutation = useMutation({
    mutationFn: () => {
      const current = conversation.archived_by || [];
      const next = isArchivedByMe
        ? current.filter((e) => e !== user.email)
        : [...new Set([...current, user.email])];
      return flowApi.entities.Conversation.update(conversation.id, { archived_by: next });
    },
    onSuccess: () => {
      toast.success(isArchivedByMe ? "Sohbet arşivden çıkarıldı" : "Sohbet arşivlendi");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onBack?.();
    },
  });

  const isGroup = conversation.type === "group";
  const otherParticipants = (conversation.participants || []).filter((p) => p !== user?.email);
  const canDeleteGroup = isGroup && conversation.created_by === user?.email;

  // Silme: gruplarda herkesten (sadece olusturan yapabilir, backend de
  // ayrica kontrol ediyor), 1:1'de ise sadece kendi gorunumumden --
  // WhatsApp'taki gibi silme anindan sonra gelen yeni mesajlarla otomatik
  // geri belirir, ama eski gecmis benim tarafimda gizli kalir.
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (isGroup) {
        return flowApi.entities.Conversation.update(conversation.id, { status: 'deleted' });
      }
      return flowApi.entities.Conversation.update(conversation.id, {
        deleted_by: { ...(conversation.deleted_by || {}), [user.email]: new Date().toISOString() },
      });
    },
    onSuccess: () => {
      toast.success("Sohbet silindi");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onBack?.();
    },
    onError: (err) => toast.error(err?.message || "Silinemedi"),
  });

  const handleDelete = () => {
    const msg = isGroup
      ? `"${conversation.name || "Grup Sohbeti"}" grubunu herkes için silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
      : "Bu sohbeti kendi tarafınızdan silmek istediğinize emin misiniz?";
    if (confirm(msg)) deleteMutation.mutate();
  };

  // Kisisel silme sonrasi, sildigim andan ONCEKI mesajlari kendi
  // gorunumumden gizle -- yeni mesaj gelirse (watermark'tan sonraki)
  // sohbet tekrar listede belirir ve sadece o yeni mesajlar gorunur.
  const myDeleteWatermark = conversation.deleted_by?.[user?.email];
  const visibleMessages = myDeleteWatermark
    ? messages.filter((m) => m.created_date > myDeleteWatermark)
    : messages;

  const isImageFile = (type) => type && type.startsWith('image/');

  // Her katilimcinin (kendim haric) en son okudugu mesajin ID'sine gore,
  // o mesajin altinda kucuk avatariyla "goruldu" rozeti gostermek icin.
  // Ayni mantik hem birebir hem grup sohbette calisir -- birebirde tek
  // avatar, grupta okuyan herkesin avatari o mesajin altinda birikir.
  const seenByMessageId = {};
  for (const [email, msgId] of Object.entries(conversation.last_read_message_id_by_user || {})) {
    if (!msgId || email === user?.email) continue;
    if (!seenByMessageId[msgId]) seenByMessageId[msgId] = [];
    seenByMessageId[msgId].push(email);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/50 flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", isGroup ? "bg-violet-100" : "bg-blue-100")}>
          {isGroup ? <Users className="w-4 h-4 text-violet-600" /> : <User className="w-4 h-4 text-blue-600" />}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">
            {isGroup ? conversation.name || "Grup Sohbeti" : otherParticipants[0] || "Sohbet"}
          </p>
          {isGroup && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
              onClick={() => setShowAddParticipants(true)}
            >
              {(conversation.participants || []).length} katılımcı
            </button>
          )}
        </div>
        {isGroup && (
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs" onClick={() => setShowAddParticipants(true)}>
            <UserPlus className="w-3.5 h-3.5" />
            Katılımcılar
          </Button>
        )}
        <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" onClick={() => setShowMeetDialog(true)}>
          <Video className="w-4 h-4 text-green-600" />
          Meet Başlat
        </Button>
        {conversation.meet_link && (
          <a href={conversation.meet_link} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="w-4 h-4 text-primary" />
            </Button>
          </a>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending} title={isArchivedByMe ? "Arşivden çıkar" : "Sohbeti arşivle"}>
          {isArchivedByMe ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
        </Button>
        {(!isGroup || canDeleteGroup) && (
          <Button variant="outline" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDelete} disabled={deleteMutation.isPending} title={isGroup ? "Grubu herkes için sil" : "Sohbeti sil"}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {[...visibleMessages].reverse().map((msg) => {
          const isMe = msg.sender_email === user?.email;
          const isMeet = msg.message_type === "meet_invite";
          const isFile = msg.message_type === "file";

          const repliedMsg = msg.reply_to_id ? messages.find((m) => m.id === msg.reply_to_id) : null;

          return (
            <div key={msg.id}>
            <div id={`msg-${msg.id}`} className={cn("flex gap-1.5 group", isMe ? "justify-end" : "justify-start")}>
              {isMe && (
                <div className="flex items-center gap-1 self-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" title="Tepki ekle" className="text-muted-foreground hover:text-foreground">
                        <SmilePlus className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1 flex gap-0.5">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => handleToggleReaction(msg, emoji)} className="text-lg leading-none p-1.5 rounded-lg hover:bg-muted transition-colors">
                          {emoji}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                  <button type="button" onClick={() => setReplyingTo(msg)} title="Yanıtla" className="text-muted-foreground hover:text-foreground">
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2.5",
                isMeet ? "bg-green-50 border border-green-200 text-green-800" :
                isFile ? (isMe ? "bg-primary/10 border border-primary/20" : "bg-muted border border-border") :
                isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              )}>
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <MiniAvatar email={msg.sender_email} name={msg.sender_name} employees={employees} size="w-4 h-4" />
                    <p className="text-xs font-semibold opacity-70">{msg.sender_name}</p>
                  </div>
                )}

                {repliedMsg && (
                  <button
                    type="button"
                    onClick={() => document.getElementById(`msg-${repliedMsg.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className={cn(
                      "block w-full text-left text-xs rounded-lg px-2 py-1 mb-1.5 border-l-2 truncate transition-opacity",
                      isMe ? "bg-amber-50 text-slate-700 border-amber-400 hover:bg-amber-100" : "bg-background/60 border-primary/50 opacity-80 hover:opacity-100"
                    )}
                  >
                    <span className="font-semibold">{repliedMsg.sender_email === user?.email ? "Sen" : repliedMsg.sender_name}</span>
                    {": "}
                    {repliedMsg.message_type === "file" ? `📎 ${repliedMsg.file_name || repliedMsg.content}` : repliedMsg.content}
                  </button>
                )}

                {isFile ? (
                  <div className="space-y-2">
                    {isImageFile(msg.file_type) ? (
                      <img
                        src={`${BASE_URL}${msg.file_url}`}
                        alt={msg.file_name}
                        className="max-w-xs rounded-xl cursor-pointer"
                        onClick={() => window.open(`${BASE_URL}${msg.file_url}`, '_blank')}
                      />
                    ) : (
                      <div className="flex items-center gap-3 py-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{msg.file_name}</p>
                          {msg.file_size && <p className="text-xs opacity-60">{formatFileSize(msg.file_size)}</p>}
                        </div>
                        <a href={`${BASE_URL}${msg.file_url}`} download={msg.file_name} className="shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}

                {isMeet && msg.meet_link && (
                  <a href={msg.meet_link} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-700 underline">
                    <Video className="w-3.5 h-3.5" /> Toplantıya Katıl
                  </a>
                )}
                {msg.reactions && Object.values(msg.reactions).some((emails) => emails?.length) && (
                  <div className={cn("flex flex-wrap gap-1 mt-1.5", isMe ? "justify-end" : "justify-start")}>
                    {Object.entries(msg.reactions)
                      .filter(([, emails]) => emails?.length)
                      .map(([emoji, emails]) => {
                        const mine = emails.includes(user?.email);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg, emoji)}
                            title={emails.join(", ")}
                            className={cn(
                              "flex items-center gap-1 text-xs rounded-full px-1.5 py-0.5 border bg-background/90 text-foreground transition-colors hover:bg-background",
                              mine ? "border-primary" : "border-border"
                            )}
                          >
                            <span>{emoji}</span>
                            <span className="font-medium">{emails.length}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
                <p className={cn("text-xs mt-1 opacity-60", isMe ? "text-right" : "text-left")}>
                  {format(new Date(msg.created_date), "HH:mm")}
                </p>
              </div>
              {!isMe && (
                <div className="flex items-center gap-1 self-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => setReplyingTo(msg)} title="Yanıtla" className="text-muted-foreground hover:text-foreground">
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" title="Tepki ekle" className="text-muted-foreground hover:text-foreground">
                        <SmilePlus className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1 flex gap-0.5">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => handleToggleReaction(msg, emoji)} className="text-lg leading-none p-1.5 rounded-lg hover:bg-muted transition-colors">
                          {emoji}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            {seenByMessageId[msg.id]?.length > 0 && (
              <div className={cn("flex gap-0.5 mt-0.5", isMe ? "justify-end pr-1" : "justify-start pl-6")}>
                {seenByMessageId[msg.id].map((email) => (
                  <MiniAvatar key={email} email={email} employees={employees} size="w-3.5 h-3.5" title={`Görüldü: ${employees.find((e) => e.email?.toLowerCase() === email.toLowerCase())?.full_name || email}`} />
                ))}
              </div>
            )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Seçilen dosya önizleme */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30 flex items-center gap-3">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
          <span className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
          <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Yanıtlanan mesaj önizlemesi */}
      {replyingTo && (
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30 flex items-center gap-3">
          <Reply className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">{replyingTo.sender_email === user?.email ? "Sen" : replyingTo.sender_name}</p>
            <p className="text-sm truncate text-muted-foreground">
              {replyingTo.message_type === "file" ? `📎 ${replyingTo.file_name || replyingTo.content}` : replyingTo.content}
            </p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mesaj gönder */}
      <div className="px-4 py-3 border-t border-border/50 flex gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
        <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => fileInputRef.current?.click()} title="Dosya ekle">
          <Paperclip className="w-4 h-4" />
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !selectedFile && handleSend()}
          placeholder={selectedFile ? "Mesaj ekle (opsiyonel)..." : "Mesajınızı yazın..."}
          className="rounded-xl flex-1"
          disabled={uploadingFile}
        />
        <Button
          onClick={handleSend}
          disabled={(!text.trim() && !selectedFile) || sendMutation.isPending || uploadingFile}
          size="icon"
          className="rounded-xl shrink-0"
        >
          {uploadingFile ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {showAddParticipants && (
        <AddParticipantsDialog
          conversation={conversation}
          onClose={() => setShowAddParticipants(false)}
          onUpdated={(updatedConv) => {
            onConversationUpdate(updatedConv);
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }}
        />
      )}

      {showMeetDialog && (
        <MeetingDialog
          conversation={conversation}
          onClose={() => setShowMeetDialog(false)}
          onCreated={(updatedConv) => {
            onConversationUpdate(updatedConv);
            queryClient.invalidateQueries({ queryKey: ["messages", conversation.id] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }}
        />
      )}
    </div>
  );
}
