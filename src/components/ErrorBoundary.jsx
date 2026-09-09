import { Component } from "react";

// Guvenlik aciklamasi degil, guvenilirlik duzeltmesi: uygulamada hicbir yerde
// bir React Error Boundary yoktu -- herhangi bir sayfadaki beklenmedik bir
// render hatasi (ornegin bos gelen bir API yanitinda .map() cagirmak) tum
// uygulamayi beyaz ekrana dusuruyordu, kullanicinin elinde sayfayi yenilemekten
// baska bir secenek kalmiyordu. Bu bilesen render hatalarini yakalar ve
// kullaniciya "bir sorun oldu" ekrani + yenile butonu gosterir.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] yakalanmamis hata:", error, info);
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
