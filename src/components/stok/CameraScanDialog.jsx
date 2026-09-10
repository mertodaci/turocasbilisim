import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera } from "lucide-react";

const READER_ID = "stok-camera-scan-reader";

/**
 * Telefon/tablet kamerasıyla QR/barkod okutma dialog'u.
 * Props: open, onOpenChange, onScan(kod) -- başarılı okumada çağrılır, dialog kendi kapanır.
 */
export default function CameraScanDialog({ open, onOpenChange, onScan }) {
  const scannerRef = useRef(null);
  const [hata, setHata] = useState("");

  useEffect(() => {
    if (!open) return;
    setHata("");
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;
    let durduruldu = false;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (durduruldu) return;
        durduruldu = true;
        scanner.stop().catch(() => {}).finally(() => {
          onScan(decodedText);
          onOpenChange(false);
        });
      },
      () => {} // tarama karesi başarısız -- normal, sessiz geç
    ).catch((err) => setHata("Kamera açılamadı: " + String(err?.message || err)));

    return () => {
      durduruldu = true;
      scanner.stop().catch(() => {});
    };
  }, [open]); // eslint-disable-line

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Camera className="w-5 h-5" /> Kamera ile Okut</DialogTitle></DialogHeader>
        <div id={READER_ID} className="w-full rounded-lg overflow-hidden bg-black/80 min-h-[280px]" />
        {hata && <p className="text-sm text-destructive">{hata}</p>}
        <p className="text-xs text-muted-foreground text-center">Barkod/QR'ı çerçeve içine getirin.</p>
      </DialogContent>
    </Dialog>
  );
}
