import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { calculateRemainingDays, calculateActualUsedDays } from "@/lib/leaveCalc";

// Tum ekranlarda tek dogru izin bakiyesi kaynagi: kidem-bazli hak (calculateEntitledDays)
// eksi sadece "yillik izin" turundeki onayli taleplerin toplami eksi leave_used_before.
export function useLeaveBalance(employee) {
  const { data: approvedLeaves = [] } = useQuery({
    queryKey: ["approved-leaves-for-balance", employee?.id, employee?.email],
    queryFn: () => flowApi.entities.LeaveRequest.filter({ employee_email: employee.email, status: "onaylandi" }),
    enabled: !!employee?.email,
  });
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => flowApi.entities.LeaveType.filter({ is_active: true }),
  });

  const usedDays = calculateActualUsedDays(approvedLeaves, leaveTypes, employee?.leave_used_before);
  const { entitled, used, remaining, hasHireDate, breakdown } = calculateRemainingDays(
    employee?.hire_date,
    employee?.leave_carryover || 0,
    usedDays
  );

  return { entitled, used, remaining, hasHireDate, breakdown, leaveTypes };
}
