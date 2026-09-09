import LeaveTypeManager from "@/components/leave/LeaveTypeManager";

export default function LeaveTypes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">İzin Türleri ve Kurallar</h1>
        <p className="text-sm text-muted-foreground mt-1">İzin türlerini ve kurallarını yönetin</p>
      </div>
      <LeaveTypeManager />
    </div>
  );
}