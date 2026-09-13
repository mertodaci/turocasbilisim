import { useEffect } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";
import { allNavItems, getBreadcrumbTrail, DETAIL_ROUTE_PARENTS } from "./navItems";
import { BreadcrumbProvider, useBreadcrumbLabel } from "@/lib/BreadcrumbContext";
import { useLanguage } from "@/lib/LanguageContext";
import { recordVisit } from "@/lib/useRecentlyVisited";
import bgMesh from "@/assets/anaekran.png";
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
  const detailMatch = DETAIL_ROUTE_PARENTS.find((d) => location.pathname.startsWith(d.prefix));
  const trail = getBreadcrumbTrail(detailMatch ? detailMatch.leafPath : location.pathname);

  useEffect(() => {
    if (!isHome && trail.length > 0) {
      recordVisit(location.pathname, trail[trail.length - 1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (isHome || trail.length === 0) return null;

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
      <div className="relative isolate min-h-screen bg-background w-full overflow-x-hidden" style={{maxWidth: "100vw"}}>
        <img
          src={bgMesh}
          alt=""
          aria-hidden="true"
          className="fixed inset-0 w-full h-full object-cover object-bottom opacity-40 dark:opacity-50 pointer-events-none select-none -z-10"
        />
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