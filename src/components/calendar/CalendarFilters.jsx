import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { activityTypes, departmentLabels } from "@/lib/activityHelpers";
import { X, SlidersHorizontal } from "lucide-react";

export default function CalendarFilters({ employees, filters, onChange }) {
  const [open, setOpen] = useState(false);

  const hasActive =
    filters.employeeIds.length > 0 ||
    filters.departments.length > 0 ||
    filters.activityTypes.length > 0;

  const toggle = (key, value) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  const clear = () =>
    onChange({ employeeIds: [], departments: [], activityTypes: [] });

  const departments = Object.entries(departmentLabels);
  const types = Object.entries(activityTypes);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={open ? "default" : "outline"}
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtrele
          {hasActive && (
            <span className="ml-1 bg-white/20 text-xs rounded-full px-1.5 py-0.5 leading-none">
              {filters.employeeIds.length + filters.departments.length + filters.activityTypes.length}
            </span>
          )}
        </Button>

        {/* Active filter chips */}
        {filters.employeeIds.map((id) => {
          const emp = employees.find((e) => e.id === id);
          return emp ? (
            <span key={id} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {emp.full_name}
              <button onClick={() => toggle("employeeIds", id)}><X className="w-3 h-3" /></button>
            </span>
          ) : null;
        })}
        {filters.departments.map((dep) => (
          <span key={dep} className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            {departmentLabels[dep]}
            <button onClick={() => toggle("departments", dep)}><X className="w-3 h-3" /></button>
          </span>
        ))}
        {filters.activityTypes.map((at) => (
          <span key={at} className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
            {activityTypes[at]?.label}
            <button onClick={() => toggle("activityTypes", at)}><X className="w-3 h-3" /></button>
          </span>
        ))}
        {hasActive && (
          <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground underline">
            Temizle
          </button>
        )}
      </div>

      {open && (
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-4">
          {/* Employees */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Çalışan</p>
            <div className="flex flex-wrap gap-1.5">
              {employees.map((e) => (
                <button
                  key={e.id}
                  onClick={() => toggle("employeeIds", e.id)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-all",
                    filters.employeeIds.includes(e.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                >
                  {e.full_name}
                </button>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Departman</p>
            <div className="flex flex-wrap gap-1.5">
              {departments.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggle("departments", key)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-all",
                    filters.departments.includes(key)
                      ? "bg-purple-600 text-white border-purple-600"
                      : "border-border text-muted-foreground hover:border-purple-400 hover:text-purple-600"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Types */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aktivite Tipi</p>
            <div className="flex flex-wrap gap-1.5">
              {types.map(([key, val]) => {
                const Icon = val.icon;
                return (
                  <button
                    key={key}
                    onClick={() => toggle("activityTypes", key)}
                    className={cn(
                      "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all",
                      filters.activityTypes.includes(key)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {val.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}