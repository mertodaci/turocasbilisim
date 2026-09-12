import LeaveAllowanceManager from "@/components/leave/LeaveAllowanceManager";

export default function LeaveAllowances() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">İzin Hakları Yönetimi</h1>
        <p className="text-sm text-muted-foreground mt-1">Çalışanların yıllık izin haklarını yönetin</p>
      </div>
      <LeaveAllowanceManager />
    </div>
  );
}