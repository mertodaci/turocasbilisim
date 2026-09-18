import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

/**
 * Masaüstü/mobil ayrımı olmadan gerçek kamera görüntüsü açan foto-yakalama
 * dialog'u. HTML <input capture> niteliği masaüstü tarayıcılarda etkisiz
 * kaldığı için (yalnız mobilde native kamerayı tetikler), burada
 * getUserMedia + canvas ile tek kare yakalama kullanılıyor.
 * Props: open, onOpenChange, onCapture(file) -- başarılı çekimde çağrılır.
 */
export default function CameraCaptureDialog({ open, onOpenChange, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [hata, setHata] = useState("");

  useEffect(() => {
    if (!open) return;
    setHata("");
    let durduruldu = false;

    navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (durduruldu) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => setHata("Kamera açılamadı: " + String(err?.message || err) + " — 'Dosya Seç'i kullanabilirsiniz."));

    return () => {
      durduruldu = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open]);

  const cek = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `kamera-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      onOpenChange(false);
    }, "image/jpeg", 0.9);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Camera className="w-5 h-5" /> Kamera ile Çek</DialogTitle></DialogHeader>
        <div className="w-full rounded-lg overflow-hidden bg-black/80 min-h-[280px] flex items-center justify-center">
          {hata ? (
            <p className="text-sm text-destructive p-4 text-center">{hata}</p>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
          )}
        </div>
        {!hata && (
          <Button type="button" onClick={cek} className="w-full">
            <Camera className="w-4 h-4 mr-1.5" /> Fotoğraf Çek
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
