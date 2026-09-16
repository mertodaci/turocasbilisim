import { useQuery } from "@tanstack/react-query";
import { Sun, CloudSun, CloudRain, CloudSnow, Cloud, CloudLightning, CloudFog } from "lucide-react";
import { cn } from "@/lib/utils";

// İstanbul sabit konum — Open-Meteo, API anahtarı gerektirmez.
const ISTANBUL_LAT = 41.0082;
const ISTANBUL_LON = 28.9784;

// WMO hava kodu -> ikon/kısa Türkçe açıklama (https://open-meteo.com/en/docs)
function weatherFromCode(code) {
  if (code === 0) return { icon: Sun, label: "Açık" };
  if ([1, 2].includes(code)) return { icon: CloudSun, label: "Parçalı bulutlu" };
  if (code === 3) return { icon: Cloud, label: "Bulutlu" };
  if ([45, 48].includes(code)) return { icon: CloudFog, label: "Sisli" };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: CloudRain, label: "Yağmurlu" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: CloudSnow, label: "Karlı" };
  if ([95, 96, 99].includes(code)) return { icon: CloudLightning, label: "Fırtınalı" };
  return { icon: Cloud, label: "" };
}

export default function WeatherWidgetCard({ iconSquareTone }) {
  const { data } = useQuery({
    queryKey: ["weather-istanbul"],
    queryFn: async () => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${ISTANBUL_LAT}&longitude=${ISTANBUL_LON}&current_weather=true`
      );
      if (!res.ok) throw new Error("weather fetch failed");
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 dakika
    retry: 1,
  });

  const current = data?.current_weather;
  const { icon: Icon, label } = current ? weatherFromCode(current.weathercode) : { icon: Cloud, label: "" };

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconSquareTone)}><Icon className="w-4 h-4" /></span>
        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Hava Durumu</h3>
      </div>
      <div className="p-4 pt-3">
        {!current ? (
          <p className="text-xs text-muted-foreground">Yükleniyor…</p>
        ) : (
          <div className="flex items-center gap-3">
            <Icon className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{Math.round(current.temperature)}°C</p>
              <p className="text-xs text-muted-foreground mt-1">İstanbul{label ? ` · ${label}` : ""}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
