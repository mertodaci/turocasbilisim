import { ShieldCheck } from "lucide-react";
import RolePermissionsPanel from "@/components/users/RolePermissionsPanel";

export default function RolePermissions() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Yetkilendirme
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Rol bazlı erişim yetkilerini yönetin</p>
      </div>
      <RolePermissionsPanel />
    </div>
  );
}
