import { useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { MapPin } from "lucide-react";

function normalizeCity(str) {
  if (!str) return "";
  return str.replace(/İ/g,"i").replace(/I/g,"i").replace(/ı/g,"i")
    .replace(/Ş/g,"s").replace(/ş/g,"s").replace(/Ğ/g,"g").replace(/ğ/g,"g")
    .replace(/Ü/g,"u").replace(/ü/g,"u").replace(/Ö/g,"o").replace(/ö/g,"o")
    .replace(/Ç/g,"c").replace(/ç/g,"c").toLowerCase().trim();
}

const cityCoordinates = {
  "adana":[37.00,35.32],"adiyaman":[37.76,38.27],"afyonkarahisar":[38.75,30.55],
  "agri":[39.71,43.05],"aksaray":[38.36,34.03],"amasya":[40.65,35.83],
  "ankara":[39.93,32.85],"antalya":[36.89,30.71],"ardahan":[41.11,42.82],
  "artvin":[41.18,41.81],"aydin":[37.84,27.84],"balikesir":[39.64,27.88],
  "bartin":[41.67,32.33],"batman":[37.88,41.13],"bayburt":[40.25,40.06],
  "bilecik":[40.14,29.97],"bingol":[38.89,40.49],"bitlis":[38.39,42.12],
  "bolu":[40.73,31.60],"burdur":[37.78,30.28],"bursa":[40.18,29.06],
  "canakkale":[40.15,26.41],"cankiri":[40.60,33.60],"corum":[40.55,34.95],
  "denizli":[37.77,29.08],"diyarbakir":[37.91,40.23],"duzce":[40.84,31.15],
  "edirne":[41.67,26.55],"elazig":[38.67,39.22],"erzincan":[39.75,39.49],
  "erzurum":[39.90,41.27],"eskisehir":[39.76,30.52],"gaziantep":[37.06,37.38],
  "giresun":[40.91,38.38],"gumushane":[40.45,39.48],"hakkari":[37.58,43.73],
  "hatay":[36.20,36.16],"igdir":[39.89,44.08],"isparta":[37.76,30.55],
  "istanbul":[41.00,28.97],"izmir":[38.42,27.13],"kahramanmaras":[37.58,36.93],
  "karabuk":[41.20,32.62],"karaman":[37.18,33.21],"kars":[40.60,43.09],
  "kastamonu":[41.38,33.78],"kayseri":[38.72,35.49],"kilis":[36.71,37.11],
  "kirikkale":[39.84,33.50],"kirklareli":[41.73,27.22],"kirsehir":[39.14,34.16],
  "kocaeli":[40.76,29.94],"konya":[37.87,32.49],"kutahya":[39.41,29.98],
  "malatya":[38.35,38.31],"manisa":[38.61,27.42],"mardin":[37.31,40.73],
  "mersin":[36.80,34.63],"mugla":[37.21,28.36],"mus":[38.73,41.48],
  "nevsehir":[38.62,34.71],"nigde":[37.95,34.67],"ordu":[40.98,37.87],
  "osmaniye":[37.07,36.24],"rize":[41.02,40.52],"sakarya":[40.77,30.39],
  "samsun":[41.29,36.33],"siirt":[37.93,41.94],"sinop":[42.02,35.15],
  "sirnak":[37.51,42.46],"sivas":[39.74,37.01],"sanliurfa":[37.15,38.79],
  "tekirdag":[40.97,27.51],"tokat":[40.31,36.55],"trabzon":[41.00,39.72],
  "tunceli":[39.10,39.54],"usak":[38.67,29.40],"van":[38.49,43.37],
  "yalova":[40.65,29.27],"yozgat":[39.81,34.81],"zonguldak":[41.45,31.79],
};

const PIN_CONFIG = {
  musteri: { color:"#16a34a", border:"#15803d", label:"Müşteri" },
  aday:    { color:"#d97706", border:"#b45309", label:"Aday Müşteri" },
};

function getPinConfig(c) {
  return (c.is_potential == 1 || c.is_potential === true) ? PIN_CONFIG.aday : PIN_CONFIG.musteri;
}

function makeSvgIcon(color, border) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
    <defs>
      <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,0.35)"/></filter>
      <radialGradient id="g" cx="40%" cy="35%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.45)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.05)"/>
      </radialGradient>
    </defs>
    <path d="M15 1C7.82 1 2 6.82 2 14c0 9.5 13 25 13 25S28 23.5 28 14C28 6.82 22.18 1 15 1z" fill="${border}" filter="url(#s)"/>
    <path d="M15 2.5C8.65 2.5 3.5 7.65 3.5 14c0 8.5 11.5 22.5 11.5 22.5S26.5 22.5 26.5 14C26.5 7.65 21.35 2.5 15 2.5z" fill="${color}"/>
    <circle cx="15" cy="14" r="9" fill="url(#g)"/>
    <circle cx="15" cy="14" r="4" fill="rgba(255,255,255,0.75)"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function ensureLeaflet() {
  return new Promise(resolve => {
    if (window.L) { resolve(window.L); return; }
    const interval = setInterval(() => { if (window.L) { clearInterval(interval); resolve(window.L); } }, 50);
  });
}

function spiralOffset(coords, index, total) {
  if (total === 1) return coords;
  const angle = (index / total) * 2 * Math.PI;
  const radius = 0.18;
  return [coords[0] + Math.cos(angle) * radius, coords[1] + Math.sin(angle) * radius];
}

export default function CustomerMapSummary() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers-map-summary"],
    queryFn: () => flowApi.entities.Customer.filter({}),
    select: (data) => data.filter(c => c.status === "aktif" || c.is_potential == 1 || c.is_potential === true),
  });

  const stats = useMemo(() => {
    const musteri = customers.filter(c=>!(c.is_potential==1||c.is_potential===true)).length;
    const aday = customers.filter(c=>c.is_potential==1||c.is_potential===true).length;
    return { total: musteri, musteri, aday };
  }, [customers]);

  const pins = useMemo(() => {
    const cityMap = {};
    customers.forEach(c => {
      const k = normalizeCity(c.city);
      const coords = cityCoordinates[k];
      if (!coords) return;
      if (!cityMap[k]) cityMap[k] = { coords, city: c.city, customers: [] };
      cityMap[k].customers.push(c);
    });
    const result = [];
    Object.values(cityMap).forEach(({ coords, city, customers: clist }) => {
      clist.forEach((c, i) => {
        result.push({
          coords: spiralOffset(coords, i, clist.length),
          customer: c,
          city,
        });
      });
    });
    return result;
  }, [customers]);

  useEffect(() => {
    if (isLoading || !mapRef.current) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }

    ensureLeaflet().then(L => {
      if (!mapRef.current) return;
      const map = L.map(mapRef.current, {
        scrollWheelZoom: false, dragging: true, zoomControl: true,
        doubleClickZoom: true, minZoom: 5, maxZoom: 13,
      }).setView([39.0, 35.0], 5);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 19,
      }).addTo(map);

      pins.forEach(({ coords, customer: c, city }) => {
        const cfg = getPinConfig(c);
        const icon = L.icon({
          iconUrl: makeSvgIcon(cfg.color, cfg.border),
          iconSize: [30, 40], iconAnchor: [15, 40], popupAnchor: [0, -42],
        });

        const location = c.district ? `${city} / ${c.district}` : city;
        const popupContent = `
          <div style="min-width:200px;font-family:system-ui,sans-serif;padding:2px">
            <a href="/musteri/${c.id}" style="display:block;font-weight:700;font-size:13px;color:#1e3a5f;text-decoration:none;margin-bottom:6px;line-height:1.3">${c.company_name}</a>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="width:8px;height:8px;border-radius:50%;background:${cfg.color};flex-shrink:0"></span>
              <span style="font-size:11px;color:#6b7280">${cfg.label}</span>
            </div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">📍 ${location}</div>
            ${c.customer_type ? `<div style="font-size:11px;color:#9ca3af">🏢 ${c.customer_type}</div>` : ""}
            ${c.population ? `<div style="font-size:11px;color:#9ca3af">👥 ${c.population}</div>` : ""}
          </div>
        `;

        L.marker(coords, { icon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 240, className: "custom-popup" });
      });
    });

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [isLoading, pins]);

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col" style={{height:"320px"}}>
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-500"/> Müşteri Haritası
        </h3>
        <div className="flex items-center gap-3">
          {Object.entries(PIN_CONFIG).map(([k,v])=>(
            <div key={k} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor:v.color}}/>
              <span className="text-[10px] text-muted-foreground">{v.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border/30 border-b border-border/30 shrink-0">
        {[
          { label:"Toplam", val:stats.total, color:"text-foreground" },
          { label:"Müşteri", val:stats.musteri, color:"text-emerald-500" },
          { label:"Aday Müşteri", val:stats.aday, color:"text-amber-500" },
        ].map(({label,val,color})=>(
          <div key={label} className="px-3 py-2 text-center">
            <div className={`text-lg font-black ${color}`}>{val}</div>
            <div className="text-[10px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div ref={mapRef} className="flex-1" style={{minHeight:0}}/>
    </div>
  );
}
