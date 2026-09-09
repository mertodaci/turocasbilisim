import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import ConversationList from "@/components/messages/ConversationList";
import ChatWindow from "@/components/messages/ChatWindow";
import NewConversationDialog from "@/components/messages/NewConversationDialog";
import { MessageCircle } from "lucide-react";

export default function Messages() {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => flowApi.entities.Conversation.list("-last_message_at"),
    refetchInterval: 3000,
  });

  // Seçili konuşmayı güncel tut
  useEffect(() => {
    if (selectedConversation) {
      const updated = conversations.find(c => c.id === selectedConversation.id);
      if (updated) setSelectedConversation(updated);
    }
  }, [conversations]);

  return (
    <div className="h-[calc(100vh-5rem)] flex gap-0 bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
      {/* SOL PANEL */}
      <div className={`${selectedConversation ? "hidden md:flex" : "flex"} md:w-80 shrink-0 flex-col border-r border-border/50`}>
        <ConversationList
          conversations={conversations}
          selected={selectedConversation}
          onSelect={setSelectedConversation}
          onNew={() => setShowNewDialog(true)}
        />
      </div>

      {/* SAĞ PANEL */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          <ChatWindow
            key={selectedConversation.id}
            conversation={selectedConversation}
            onConversationUpdate={(conv) => setSelectedConversation(conv)}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center">
              <MessageCircle className="w-10 h-10 opacity-30"/>
            </div>
            <p className="text-sm font-medium">Bir sohbet seçin</p>
            <p className="text-xs text-muted-foreground/60">veya yeni bir sohbet başlatın</p>
            <button onClick={()=>setShowNewDialog(true)}
              className="mt-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors">
              + Yeni Sohbet
            </button>
          </div>
        )}
      </div>

      {showNewDialog && (
        <NewConversationDialog
          onClose={() => setShowNewDialog(false)}
          onCreated={(conv) => { setSelectedConversation(conv); setShowNewDialog(false); }}
        />
      )}
    </div>
  );
}
