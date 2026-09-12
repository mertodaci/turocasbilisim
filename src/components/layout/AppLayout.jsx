import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";
import { allNavItems, getBreadcrumbTrail, DETAIL_ROUTE_PARENTS } from "./navItems";
import { BreadcrumbProvider, useBreadcrumbLabel } from "@/lib/BreadcrumbContext";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function AppBreadcrumb() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const dynamicLabel = useBreadcrumbLabel();
  const isHome = location.pathname === "/";
  if (isHome) return null;

  const detailMatch = DETAIL_ROUTE_PARENTS.find((d) => location.pathname.startsWith(d.prefix));
  const trail = getBreadcrumbTrail(detailMatch ? detailMatch.leafPath : location.pathname);
  if (trail.length === 0) return null;

  const findPath = (labelKey) => {
    function walk(list) {
      for (const item of list) {
        if (item.labelKey === labelKey) return item.path;
        if (item.children) {
          const found = walk(item.children);
          if (found) return found;
        }
      }
      return null;
    }
    return walk(allNavItems);
  };

  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded-lg px-2 py-1 -ml-2 transition-colors shrink-0"
      >
        <ArrowLeft className="w-4 h-4" /> Geri
      </button>
      <Breadcrumb>
        <BreadcrumbList className="text-base text-foreground/70">
          {trail.map((labelKey, idx) => {
            const isLast = idx === trail.length - 1;
            const label = isLast && dynamicLabel ? dynamicLabel : t(labelKey);
            const path = findPath(labelKey);
            return (
              <span key={labelKey} className="flex items-center gap-1.5 sm:gap-2.5">
                <BreadcrumbItem>
                  {isLast || !path ? (
                    <BreadcrumbPage className="font-semibold">{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={path}>{label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

export default function AppLayout() {
  return (
    <BreadcrumbProvider>
      <div className="min-h-screen bg-background w-full overflow-x-hidden" style={{maxWidth: "100vw"}}>
        <div className="min-h-screen flex flex-col" id="main-content">
          <TopBar />
          <main className="flex-1 px-4 pt-6 pb-40 w-full overflow-x-hidden max-w-7xl mx-auto">
            <AppBreadcrumb />
            <Outlet />
          </main>
        </div>
        <BottomNav />
      </div>
    </BreadcrumbProvider>
  );
}