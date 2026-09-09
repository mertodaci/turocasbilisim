import { useAuth } from "@/lib/AuthContext";
import AdminDashboard from "./AdminDashboard";
import UserDashboard from "./UserDashboard";
import CustomerDashboard from "./CustomerDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === "admin" || role === "yonetici") {
    return <AdminDashboard />;
  }

  if (role === "musteri") {
    return <CustomerDashboard />;
  }

  // kullanici, ik, stajer
  return <UserDashboard />;
}
