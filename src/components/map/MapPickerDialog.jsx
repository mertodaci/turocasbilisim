import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

// Leaflet npm paketinden bundle'a gömülüyor (harici CDN'e bağımlılık yok —
// ağ/CDN erişimi engelli/yavaş olsa bile harita her zaman açılır). Varsayılan
// marker ikonları Vite ile doğru çözümlensin diye elle ayarlanıyor (bilinen
// Leaflet + bundler sorunu).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function MapPickerDialog({ open, onOpenChange, initialLat, initialLng, onPick }) {
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [pos, setPos] = useState(null);
  // Radix Dialog, açılış animasyonu sırasında içeriği bir kere "ölçme" amaçlı
  // yeniden mount edebiliyor -- sabit bir useRef + useEffect([open]) deseni bu
  // durumda haritayı ATILACAK ilk DOM düğümüne kuruyor, gerçek görünür düğüm
  // boş kalıyordu (harita "açılmıyor" şikayetinin asıl kök nedeni buydu, CDN
  // yükleme gecikmesi değil). Callback ref kullanmak, düğüm gerçekten DOM'a
  // takıldığı her an (yeniden mount olsa bile) haritayı doğru düğümde kurar.
  const [mapEl, setMapEl] = useState(null);
  const mapRefCallback = useCallback((node) => setMapEl(node), []);

  useEffect(() => {
    if (!open || !mapEl) return;

    const startLat = Number(initialLat) || 39.1;
    const startLng = Number(initialLng) || 35.5;
    const hasInitial = !!(Number(initialLat) && Number(initialLng));
    setPos(hasInitial ? { lat: startLat, lng: startLng } : null);

    const map = L.map(mapEl).setView([startLat, startLng], hasInitial ? 15 : 6);
    mapInstanceRef.current = map;
    // Dialog animasyonu bitmeden konteyner boyutu Leaflet'e yanlış rapor
    // edilebiliyor -- animasyon bittikten sonra bir kere yeniden ölçtür.
    setTimeout(() => map.invalidateSize(), 250);

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

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [open, mapEl, initialLat, initialLng]);

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
          <div ref={mapRefCallback} style={{ height: 380, width: "100%", borderRadius: 12, overflow: "hidden" }} />
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
