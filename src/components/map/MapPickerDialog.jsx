import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

// TurkeyMap.jsx ile aynı desen: Leaflet CDN'den (window.L) yükleniyor,
// react-leaflet kullanılmıyor.
function ensureLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    const interval = setInterval(() => {
      if (window.L) { clearInterval(interval); resolve(window.L); }
    }, 50);
  });
}

export default function MapPickerDialog({ open, onOpenChange, initialLat, initialLng, onPick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open || !mapRef.current) return;

    const startLat = Number(initialLat) || 39.1;
    const startLng = Number(initialLng) || 35.5;
    const hasInitial = !!(Number(initialLat) && Number(initialLng));
    setPos(hasInitial ? { lat: startLat, lng: startLng } : null);

    let cancelled = false;
    ensureLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;
      const map = L.map(mapRef.current).setView([startLat, startLng], hasInitial ? 15 : 6);
      mapInstanceRef.current = map;

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar',
        maxZoom: 19,
      }).addTo(map);

      const placeMarker = (lat, lng) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current.on('dragend', () => {
            const { lat: la, lng: ln } = markerRef.current.getLatLng();
            setPos({ lat: la, lng: ln });
          });
        }
        setPos({ lat, lng });
      };

      if (hasInitial) placeMarker(startLat, startLng);

      map.on('click', (e) => placeMarker(e.latlng.lat, e.latlng.lng));
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    };
  }, [open, initialLat, initialLng]);

  const handleUse = () => {
    if (!pos) return;
    onPick(pos.lat, pos.lng);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Haritadan Konum Seç</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Haritada bir noktaya tıklayın ya da işaretçiyi sürükleyin.</p>
          <div ref={mapRef} style={{ height: 380, width: "100%", borderRadius: 12, overflow: "hidden" }} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {pos ? `Enlem: ${pos.lat.toFixed(6)}, Boylam: ${pos.lng.toFixed(6)}` : "Henüz konum seçilmedi"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
              <Button onClick={handleUse} disabled={!pos}>Konumu Kullan</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
