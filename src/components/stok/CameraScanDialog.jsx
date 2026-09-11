import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera } from "lucide-react";

const READER_ID = "stok-camera-scan-reader";

// html5-qrcode'un stop() metodu, tarayici zaten calismiyorsa (ornegin
// start() basarisiz olduysa) Promise reddetmek yerine SENKRON hata
// firlatiyor -- .catch() bu durumu yakalamiyor, try/catch sarmali gerekiyor.
function safeStop(scanner) {
  if (!scanner) return;
  try {
    scanner.stop().catch(() => {});
  } catch { /* zaten calismiyordu, yapilacak bir sey yok */ }
}

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
    let durduruldu = false;

    // Dialog acilir acilmaz reader div'i DOM'a henuz yerlesmemis olabilir
    // (Radix portal mount zamanlamasi) -- bir sonraki frame'e erteleyip
    // element gercekten var mi diye kontrol ediyoruz. Aksi halde
    // Html5Qrcode'un constructor'i senkron hata firlatip ErrorBoundary'ye
    // dusuyor ve tum sayfayi cokertiyordu.
    const frame = requestAnimationFrame(() => {
      if (durduruldu) return;
      if (!document.getElementById(READER_ID)) {
        setHata("Kamera penceresi hazırlanamadı, tekrar deneyin.");
        return;
      }
      let scanner;
      try {
        scanner = new Html5Qrcode(READER_ID);
      } catch (err) {
        setHata("Kamera başlatılamadı: " + String(err?.message || err));
        return;
      }
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (durduruldu) return;
          durduruldu = true;
          safeStop(scanner);
          onScan(decodedText);
          onOpenChange(false);
        },
        () => {} // tarama karesi başarısız -- normal, sessiz geç
      ).catch((err) => setHata("Kamera açılamadı: " + String(err?.message || err)));
    });

    return () => {
      durduruldu = true;
      cancelAnimationFrame(frame);
      safeStop(scannerRef.current);
      scannerRef.current = null;
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
