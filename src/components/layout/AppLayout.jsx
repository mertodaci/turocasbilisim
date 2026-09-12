import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import BottomNav from "./BottomNav";
import SideRail from "./SideRail";
import TopBar from "./TopBar";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const [railExpanded, setRailExpanded] = useState(false);
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden" style={{maxWidth: "100vw"}}>
      <div className="min-h-screen flex flex-col" id="main-content">
        <TopBar />
        <main className={cn(
          "flex-1 px-4 md:pr-8 pt-6 pb-40 w-full overflow-x-hidden transition-[padding] duration-200",
          railExpanded ? "md:pl-72" : "md:pl-20"
        )} style={{maxWidth: "100vw"}}>
          {!isHome && (
            <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Geri
            </button>
          )}
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <SideRail expanded={railExpanded} setExpanded={setRailExpanded} />
    </div>
  );
}