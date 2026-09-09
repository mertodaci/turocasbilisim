import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { flowApi } from '@/api/flowApiClient';

const cityCoordinates = {
  "adana": [37.0000, 35.3213], "adiyaman": [37.7648, 38.2789],
  "afyonkarahisar": [38.7507, 30.5567], "agri": [39.7191, 43.0535],
  "aksaray": [38.3689, 34.0371], "amasya": [40.6558, 35.8361],
  "ankara": [39.9334, 32.8597], "antalya": [36.8969, 30.7133],
  "ardahan": [41.1122, 42.8251], "artvin": [41.1822, 41.8176],
  "aydin": [37.8462, 27.8450], "balikesir": [39.6480, 27.8864],
  "bartin": [41.6705, 32.3396], "batman": [37.8814, 41.1353],
  "bayburt": [40.2588, 40.0632], "bilecik": [40.1424, 29.9760],
  "bingol": [38.8920, 40.4990], "bitlis": [38.3934, 42.1264],
  "bolu": [40.7335, 31.6096], "burdur": [37.7845, 30.2882],
  "bursa": [40.1885, 29.0609], "canakkale": [40.1500, 26.4167],
  "cankiri": [40.6022, 33.6062], "corum": [40.5500, 34.9500],
  "denizli": [37.7766, 29.0883], "diyarbakir": [37.9100, 40.2300],
  "duzce": [40.8438, 31.1565], "edirne": [41.6749, 26.5557],
  "elazig": [38.6748, 39.2223], "erzincan": [39.7507, 39.4913],
  "erzurum": [39.9042, 41.2782], "eskisehir": [39.7667, 30.5256],
  "gaziantep": [37.0667, 37.3833], "giresun": [40.9134, 38.3846],
  "gumushane": [40.4507, 39.4820], "hakkari": [37.5833, 43.7333],
  "hatay": [36.2000, 36.1667], "igdir": [39.8949, 44.0847],
  "isparta": [37.7643, 30.5540], "mersin": [36.8000, 34.6333],
  "istanbul": [41.0082, 28.9784], "izmir": [38.4237, 27.1384],
  "kars": [40.6000, 43.1000], "kastamonu": [41.3803, 33.7848],
  "kayseri": [38.7202, 35.4921], "kirikkale": [39.8450, 33.5074],
  "kirklareli": [41.7667, 27.2333], "kirsehir": [39.1456, 34.1627],
  "kilis": [36.7000, 37.1167], "kocaeli": [40.7650, 29.9400],
  "konya": [37.8746, 32.4932], "kutahya": [39.4190, 29.9880],
  "malatya": [38.3562, 38.3184], "manisa": [38.6186, 27.4206],
  "kahramanmaras": [37.5833, 36.9333], "mardin": [37.3230, 40.7336],
  "mugla": [37.2167, 28.3667], "mus": [38.7302, 41.4851],
  "nevsehir": [38.6250, 34.7111], "nigde": [37.9556, 34.6739],
  "ordu": [41.0067, 37.8778], "osmaniye": [37.2100, 36.2200],
  "rize": [41.0200, 40.5200], "sakarya": [40.7719, 30.3957],
  "samsun": [41.2928, 36.3315], "siirt": [37.9333, 41.9500],
  "sinop": [42.0264, 35.1504], "sivas": [39.7478, 37.0177],
  "sanliurfa": [37.1500, 38.8000], "sirnak": [37.5000, 42.4500],
  "tekirdag": [40.9833, 27.5167], "tokat": [40.3167, 36.5500],
  "trabzon": [41.0083, 39.7300], "tunceli": [39.1064, 39.5100],
  "usak": [38.6736, 29.4072], "van": [38.4946, 43.3762],
  "yalova": [40.6558, 29.2711], "yozgat": [39.8167, 34.8167],
  "zonguldak": [41.4587, 31.7987],
};

// Türkçe karakterleri normalize eder (ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c)
function normalizeCity(str) {
  if (!str) return '';
  return str
    .replace(/İ/g, 'i').replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase()
    .trim();
}

function ensureLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    const interval = setInterval(() => {
      if (window.L) { clearInterval(interval); resolve(window.L); }
    }, 50);
  });
}

export default function TurkeyMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers-map'],
    queryFn: () => flowApi.entities.Customer.list(),
  });

  useEffect(() => {
    if (isLoading || !mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    ensureLeaflet().then((L) => {
      if (!mapRef.current) return;

      const turkeyBounds = L.latLngBounds([35.8, 25.6], [42.1, 44.8]);
      const map = L.map(mapRef.current, {
        maxBounds: turkeyBounds,
        maxBoundsViscosity: 1.0,
        minZoom: 5,
        maxZoom: 12,
      }).setView([39.1, 35.5], 6);
      mapInstanceRef.current = map;

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      customers.forEach((customer) => {
        const cityKey = normalizeCity(customer.city);
        const coords = cityCoordinates[cityKey];
        if (!coords) return;
        L.marker(coords, { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-weight:600;font-size:13px">${customer.company_name}</div>
            <div style="font-size:12px;color:#666;margin-top:2px">${customer.city}</div>
            ${customer.status ? `<div style="font-size:11px;margin-top:4px;color:#888">${{aktif:'Aktif',pasif:'Pasif',potansiyel:'Potansiyel'}[customer.status] || customer.status}</div>` : ''}
          `);
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLoading, customers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}