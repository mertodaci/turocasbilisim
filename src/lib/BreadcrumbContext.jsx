import { createContext, useContext, useEffect, useState } from "react";

const BreadcrumbContext = createContext({ label: null, setLabel: () => {} });

export function BreadcrumbProvider({ children }) {
  const [label, setLabel] = useState(null);
  return (
    <BreadcrumbContext.Provider value={{ label, setLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

// Bir sayfa, breadcrumb'ın son segmentinde statik labelKey yerine kendi
// dinamik etiketini (ör. çalışan adı) göstermek için bunu çağırır.
export function useSetBreadcrumbLabel(label) {
  const { setLabel } = useContext(BreadcrumbContext);
  useEffect(() => {
    setLabel(label || null);
    return () => setLabel(null);
  }, [label, setLabel]);
}

export function useBreadcrumbLabel() {
  return useContext(BreadcrumbContext).label;
}
