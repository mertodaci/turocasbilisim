import React from 'react';
import { MapPin } from 'lucide-react';
import TurkeyMap from '@/components/map/TurkeyMap';

export default function CustomerMap() {
  return (
    <div className="flex flex-col gap-6 h-full">

      <div>
        <div className="flex items-center gap-3 mb-1">
          <MapPin className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Çalışma Alanlarımız</h1>
        </div>
        <p className="text-sm text-muted-foreground">Türkiye genelinde çalıştığımız müşterilerin harita üzerindeki dağılımı.</p>
      </div>

      <div style={{ height: '600px' }} className="rounded-2xl overflow-hidden border border-border/50 shadow-sm">
        <TurkeyMap />
      </div>
    </div>
  );
}