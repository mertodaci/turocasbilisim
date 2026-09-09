import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function JTCustomerAssignmentList({ customerStats }) {
  const maxTickets = Math.max(...customerStats.map(c => c.total_tickets), 1);

  if (customerStats.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Henüz müşteri bazlı bilet yok
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {customerStats.map((customer, idx) => {
        const completionRate = customer.total_tickets > 0 
          ? Math.round((customer.completed_tickets / customer.total_tickets) * 100) 
          : 0;
        
        return (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{customer.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {customer.active_tickets} aktif / {customer.completed_tickets} tamamlandı
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{customer.total_tickets} toplam</Badge>
                <Badge className="bg-green-100 text-green-700">{completionRate}%</Badge>
              </div>
            </div>
            <Progress 
              value={(customer.total_tickets / maxTickets) * 100} 
              className="h-2"
            />
          </div>
        );
      })}
    </div>
  );
}