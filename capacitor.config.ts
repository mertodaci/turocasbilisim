import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.indbilisim.flowmetric',
  appName: 'TaskQube',
  webDir: 'dist',
  server: {
    // Ince kabuk: APK dogrudan canli siteyi yukler; her web deploy'unda
    // uygulama otomatik guncellenir. dist (webDir) yalnizca fallback.
    url: 'https://taskqube.com',
    androidScheme: 'https'
  }
};

export default config;
