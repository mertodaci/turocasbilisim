import { Component } from "react";

// Guvenlik aciklamasi degil, guvenilirlik duzeltmesi: uygulamada hicbir yerde
// bir React Error Boundary yoktu -- herhangi bir sayfadaki beklenmedik bir
// render hatasi (ornegin bos gelen bir API yanitinda .map() cagirmak) tum
// uygulamayi beyaz ekrana dusuruyordu, kullanicinin elinde sayfayi yenilemekten
// baska bir secenek kalmiyordu. Bu bilesen render hatalarini yakalar ve
// kullaniciya "bir sorun oldu" ekrani + yenile butonu gosterir.

// Her sayfa React.lazy() ile ayri bir JS parcasi (chunk) olarak yukleniyor.
// Yeni bir surum deploy edildiginde eski chunk dosyalari sunucudan silinir;
// deploy'dan once acilmis bir sekme daha sonra baska bir sayfaya gecmeye
// calisirsa, o eski chunk'i cekmeye calisip 404 alir -- bu gercek bir
// uygulama hatasi degil, sadece sayfanin tazelenmesi gerektigini gosterir.
// Boyle bir hata "beklenmedik sorun" ekrani yerine tek seferlik otomatik
// bir yenilemeyle sessizce cozulur (RELOAD_KEY, ayni oturumda sonsuz
// yenileme donguesune girmeyi engeller).
const CHUNK_HATASI_REGEX = /dynamically imported module|Importing a module script failed|Loading chunk .* failed|error loading dynamically imported module/i;
const RELOAD_KEY = "stok-chunk-reload-denendi";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidMount() {
    try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* sessionStorage yoksa yok say */ }
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] yakalanmamis hata:", error, info);
    if (CHUNK_HATASI_REGEX.test(String(error?.message || ""))) {
      try {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
        }
      } catch { /* sessionStorage'a erisilemezse asagidaki normal hata ekrani gosterilir */ }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-semibold">Beklenmedik bir sorun oluştu</h1>
            <p className="text-sm text-muted-foreground">
              Sayfa yüklenirken bir hata meydana geldi. Sorun devam ederse sistem yöneticinizle iletişime geçin.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
