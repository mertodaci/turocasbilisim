import { useState } from "react";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Video, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

function generateRoomName(title) {
  const clean = title
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const random = Math.random().toString(36).substring(2, 8);
  return `${clean}-${random}`;
}

export default function MeetingDialog({ conversation, onClose, onCreated }) {
  const [title, setTitle] = useState("Ekip Toplantısı");
  const [loading, setLoading] = useState(false);
  const [meetLink, setMeetLink] = useState(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const roomName = generateRoomName(title);
      const link = `https://jitsi.riot.im/${roomName}`;

      // Konuşmaya meet linkini kaydet
      await flowApi.entities.Conversation.update(conversation.id, {
        meet_link: link,
      });

      await flowApi.entities.Message.create({
        conversation_id: conversation.id,
        content: `Toplantı başlatıldı 🎥 ${link}`,
        message_type: 'meet_invite',
        meet_link: link,
      });
      setMeetLink(link);
      toast.success("Jitsi Meet toplantısı oluşturuldu!");
      onCreated({ ...conversation, meet_link: link });
    } catch (err) {
      toast.error("Toplantı oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-green-600" /> Jitsi Meet Toplantısı
          </DialogTitle>
        </DialogHeader>
        {meetLink ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 text-sm font-medium mb-3">Toplantı başarıyla oluşturuldu!</p>
              <a
                href={meetLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Toplantıya Katıl
              </a>
            </div>
            <p className="text-xs text-muted-foreground text-center break-all">{meetLink}</p>
            <Button variant="outline" onClick={onClose} className="w-full rounded-xl">Kapat</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Toplantı Adı</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
                placeholder="Toplantı başlığı"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Katılımcılar: {(conversation.participants || []).join(", ")}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">İptal</Button>
              <Button
                onClick={handleCreate}
                disabled={loading || !title.trim()}
                className="flex-1 rounded-xl gap-2 bg-green-600 hover:bg-green-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {loading ? "Oluşturuluyor..." : "Toplantı Oluştur"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
