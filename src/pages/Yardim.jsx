import { Link } from "react-router-dom";
import { HelpCircle, Mail, Phone, ArrowLeft } from "lucide-react";

// Basit "Yardım & Destek" sayfası. İçerik placeholder — gerçek destek
// bilgileriyle (e-posta / telefon / dokümantasyon linki) güncellenmeli.
export default function Yardim() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" />
          Yardım &amp; Destek
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uygulamayla ilgili sorularınız veya bir sorun bildirmek için bize ulaşın.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">E-posta</p>
            <a href="mailto:destek@turkonix.com" className="text-sm text-primary hover:underline">destek@turkonix.com</a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Telefon</p>
            <p className="text-sm text-muted-foreground">— (destek hattı eklenecek)</p>
          </div>
        </div>
      </div>

      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Yönetim Merkezi'ne dön
      </Link>
    </div>
  );
}
