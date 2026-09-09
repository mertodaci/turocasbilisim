import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden" style={{maxWidth: "100vw"}}>
      <Sidebar />
      <div className={(window.innerWidth < 768 ? "" : "ml-64") + " min-h-screen flex flex-col transition-all duration-300"} id="main-content">
        <TopBar />
        <main className="flex-1 p-4 md:p-8 pt-6 w-full overflow-x-hidden" style={{maxWidth: "100vw"}}>
          {!isHome && (
            <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Geri
            </button>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}