import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";

export default function JTDeadlineList({ deadlines }) {
  const getUrgencyColor = (days) => {
    if (days < 0) return "bg-red-100 text-red-700";
    if (days <= 1) return "bg-orange-100 text-orange-700";
    if (days <= 3) return "bg-yellow-100 text-yellow-700";
    return "bg-blue-100 text-blue-700";
  };

  const getUrgencyLabel = (days) => {
    if (days < 0) return `Gecikmiş (${Math.abs(days)} gün)`;
    if (days === 0) return "Bugün";
    if (days === 1) return "Yarın";
    return `${days} gün`;
  };

  if (deadlines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Yaklaşan teslim tarihi yok
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {deadlines.map((ticket) => {
        const daysUntilDue = differenceInDays(new Date(ticket.due_date), new Date());
        return (
          <div
            key={ticket.id}
            onClick={() => window.location.href = `/is-takibi/tickets?search=${ticket.ticket_number}`} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{ticket.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{ticket.customer_name}</p>
                {ticket.assigned_to_name && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">{ticket.assigned_to_name}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {format(new Date(ticket.due_date), "dd MMMM", { locale: tr })}
              </Badge>
              <Badge className={getUrgencyColor(daysUntilDue)}>
                {getUrgencyLabel(daysUntilDue)}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}