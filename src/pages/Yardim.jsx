import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, Mail, Phone, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { allNavItems } from "@/components/layout/navItems";
import { MODULE_GUIDES } from "@/lib/moduleGuides";

// Bir düğümün altındaki tüm tıklanabilir yaprakları (label+path+icon) düz
// bir diziye toplar — BottomNav.jsx'teki collectLeafKeys ile aynı özyineleme,
// burada path/icon da taşıyan bir varyantı.
function collectLeaves(node) {
  if (!node.children || node.children.length === 0) {
    return node.path ? [node] : [];
  }
  return node.children.flatMap(collectLeaves);
}

export default function Yardim() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const userPerms = user?.permissions || [];
  const userRole = user?.role || "kullanici";
  const canViewModule = (moduleKey) => {
    if (userRole === "admin") return true;
    const perm = userPerms.find((p) => p.module === moduleKey);
    return perm ? perm.can_view == 1 : false;
  };

  const modules = useMemo(
    () => allNavItems.filter((item) => MODULE_GUIDES[item.labelKey] && canViewModule(item.labelKey)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userRole, userPerms.length]
  );

  const [activeKey, setActiveKey] = useState(modules[0]?.labelKey);
  const activeModule = modules.find((m) => m.labelKey === activeKey) || modules[0];
  const guide = activeModule ? MODULE_GUIDES[activeModule.labelKey] : null;
  const relatedScreens = activeModule?.children
    ? collectLeaves(activeModule).filter((leaf) => canViewModule(leaf.labelKey))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" />
          Yardım &amp; Kullanım Kılavuzu
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Soldan bir modül seçin — o modülün ne işe yaradığını, temel iş akışını ve ilgili ekranlarını görün.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sol panel — modül listesi */}
        <div className="lg:col-span-1 space-y-1">
          {modules.map((m) => {
            const Icon = m.icon;
            const active = m.labelKey === activeModule?.labelKey;
            return (
              <button
                key={m.labelKey}
                onClick={() => setActiveKey(m.labelKey)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-colors text-left",
                  active
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{t(m.labelKey)}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Sağ panel — seçili modülün kılavuzu */}
        <div className="lg:col-span-3">
          {activeModule && guide ? (
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 rounded-t-2xl bg-muted/30">
                <activeModule.icon className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold">{t(activeModule.labelKey)}</h2>
              </div>
              <div className="p-6 space-y-5">
                <p className="text-sm text-muted-foreground leading-relaxed">{guide.summary}</p>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Temel İş Akışı</h3>
                  <ol className="space-y-2">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {relatedScreens.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">İlgili Ekranlar</h3>
                    <div className="flex flex-wrap gap-2">
                      {relatedScreens.map((leaf) => (
                        <Link
                          key={leaf.labelKey}
                          to={leaf.path}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground transition-colors"
                        >
                          <leaf.icon className="w-3.5 h-3.5 text-muted-foreground" />
                          {t(leaf.labelKey)}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-8 text-center text-sm text-muted-foreground">
              Görüntüleyebileceğiniz bir modül kılavuzu bulunamadı.
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-3">Yardıma mı ihtiyacınız var?</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold">E-posta</p>
              <a href="mailto:destek@turkonix.com" className="text-sm text-primary hover:underline">destek@turkonix.com</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold">Telefon</p>
              <p className="text-sm text-muted-foreground">— (destek hattı eklenecek)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
