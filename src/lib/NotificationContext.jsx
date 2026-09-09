import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { flowApi } from '@/api/flowApiClient';
import { useAuth } from './AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isConversationUnreadForUser } from './conversationUtils';
import { toast } from 'sonner';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPrivileged = user?.role === 'admin' || user?.role === 'yonetici' || user?.role === 'ik';
  const sseRef = useRef(null);

  // SSE bağlantısı -- baglanti koptugunda (ornegin ERR_INCOMPLETE_CHUNKED_ENCODING
  // gibi bir ag hatasinda) es.close() cagriliyordu ama gercekten yeniden
  // baglanmiyordu, yorum "5 saniye sonra yeniden baglan" dese de sadece
  // invalidateQueries() cagiriyordu -- yeni bir EventSource hic acilmiyordu.
  // Artik gercekten reconnect ediyor.
  useEffect(() => {
    if (!user) return;
    const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
    let stopped = false;
    let reconnectTimer = null;

    const connect = () => {
      if (stopped) return;
      const es = new EventSource(`${BASE_URL}/api/events`, { withCredentials: true });
      sseRef.current = es;

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'refresh') {
            queryClient.invalidateQueries({ queryKey: ['notif-todos'] });
            queryClient.invalidateQueries({ queryKey: ['notif-messages'] });
            queryClient.invalidateQueries({ queryKey: ['notif-leave'] });
            queryClient.invalidateQueries({ queryKey: ['notif-expense'] });
            queryClient.invalidateQueries({ queryKey: ['notif-worktask'] });
            queryClient.invalidateQueries({ queryKey: ['notif-tq'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['notif-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        queryClient.invalidateQueries();
        if (stopped) return;
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      sseRef.current?.close();
    };
  }, [user?.id]);

  // ── Employee record ──────────────────────────────────────────────
  const { data: employeeRecord } = useQuery({
    queryKey: ['notif-employee', user?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (d) => d[0],
  });

  // ── Todos ────────────────────────────────────────────────────────
  const { data: todos = [] } = useQuery({
    queryKey: ['notif-todos', user?.email],
    queryFn: () => flowApi.entities.Todo.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
    refetchInterval: 3000,
  });
  const unreadTodoCount = useMemo(() => todos.filter(t => t.status !== 'tamamlandi').length, [todos]);

  // ── Messages ─────────────────────────────────────────────────────
  const { data: conversations = [] } = useQuery({
    queryKey: ['notif-conversations', user?.email],
    queryFn: () => flowApi.entities.Conversation.list('-last_message_at'),
    enabled: !!user?.email,
    refetchInterval: 3000,
  });
  const unreadMessageCount = useMemo(() => {
    if (!user?.email || conversations.length === 0) return 0;
    return conversations.filter(conv => isConversationUnreadForUser(conv, user.email)).length;
  }, [conversations, user?.email]);

  // ── Masaustu (WhatsApp tarzi) bildirim ─────────────────────────────
  // Su an hangi sohbetin acik oldugunu ChatWindow burada kaydediyor --
  // o sohbete zaten bakiyorsak (sekme aktifken) tekrar bildirim gostermeye
  // gerek yok, tam WhatsApp'taki gibi.
  const [activeConversationId, setActiveConversationId] = useState(null);

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['notif-employees-all'],
    queryFn: () => flowApi.entities.Employee.filter({ status: 'aktif' }),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });
  const nameByEmail = useMemo(() => {
    const map = new Map();
    allEmployees.forEach((e) => { if (e.email) map.set(e.email, e.full_name || e.email); });
    return map;
  }, [allEmployees]);

  // Her sohbetin en son gordugumuz last_message_id'sini tutar -- ilk
  // yuklemede (eski/mevcut mesajlar icin) degil, SONRAKI degisikliklerde
  // bildirim gosterilir.
  const seenLastMessageIds = useRef(new Map());
  const notifInitialized = useRef(false);

  useEffect(() => {
    if (!user?.email || conversations.length === 0) return;
    const isFirstRun = !notifInitialized.current;

    conversations.forEach((conv) => {
      if (!conv.participants?.includes(user.email)) return;
      const prevId = seenLastMessageIds.current.get(conv.id);
      const currentId = conv.last_message_id;
      seenLastMessageIds.current.set(conv.id, currentId);
      if (isFirstRun) return;
      if (!currentId || currentId === prevId) return;
      if (conv.last_message_sender_email === user.email) { console.debug('[bildirim] atlandi: kendi mesajim', conv.id); return; }
      if (!isConversationUnreadForUser(conv, user.email)) { console.debug('[bildirim] atlandi: zaten okunmus/arsiv/silinmis sayiliyor', conv.id); return; }

      const isViewingThisConv = document.visibilityState === 'visible' && activeConversationId === conv.id;
      if (isViewingThisConv) { console.debug('[bildirim] atlandi: zaten bu sohbete bakiyorum', conv.id); return; }

      const senderName = nameByEmail.get(conv.last_message_sender_email) || conv.last_message_sender_email || 'Biri';
      const isGroup = conv.type === 'group';
      const title = isGroup ? (conv.name || 'Grup Sohbeti') : senderName;
      const body = isGroup ? `${senderName}: ${conv.last_message || ''}` : (conv.last_message || '');

      // Uygulama icindeyken (sekme aktifken) fark edilmesi icin kisa
      // sureli toast -- masaustu bildiriminden bagimsiz, izin gerektirmez.
      toast(title, { description: body, duration: 5500 });

      if (typeof Notification === 'undefined') { console.debug('[bildirim] atlandi: tarayici Notification API desteklemiyor'); return; }
      if (Notification.permission !== 'granted') { console.debug('[bildirim] atlandi: izin granted degil, su an:', Notification.permission); return; }
      console.debug('[bildirim] gosteriliyor:', conv.id, currentId);
      try {
        const n = new Notification(title, { body, tag: conv.id });
        n.onclick = () => {
          window.focus();
          window.location.href = '/mesajlar';
          n.close();
        };
      } catch (err) {
        console.error('[bildirim] Notification olusturulamadi:', err);
      }
    });

    notifInitialized.current = true;
  }, [conversations, user?.email, activeConversationId, nameByEmail]);

  // ── Leave requests ───────────────────────────────────────────────
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const fetchLeaveCount = async () => {
    if (!user) return;
    try {
      if (isPrivileged) {
        const all = await flowApi.entities.LeaveRequest.list();
        setPendingLeaveCount(all.filter(l =>
          l.status === 'ik_onayi_bekliyor' || l.status === 'yonetici_onayi_bekliyor' || l.status === 'beklemede'
        ).length);
      } else if (user?.email) {
        const my = await flowApi.entities.LeaveRequest.filter({ employee_email: user.email });
        setPendingLeaveCount(my.filter(l =>
          l.status === 'ik_onayi_bekliyor' || l.status === 'yonetici_onayi_bekliyor' || l.status === 'beklemede'
        ).length);
      }
    } catch { setPendingLeaveCount(0); }
  };
  useEffect(() => {
    fetchLeaveCount();
    const interval = setInterval(fetchLeaveCount, 3000);
    return () => clearInterval(interval);
  }, [user?.email, isPrivileged]);

  // ── Expenses ─────────────────────────────────────────────────────
  const [pendingExpenseCount, setPendingExpenseCount] = useState(0);
  const [pendingExpenseIKCount, setPendingExpenseIKCount] = useState(0);
  const fetchExpenseCount = async () => {
    if (!user) return;
    if (user?.role === 'musteri') return;
    try {
      if (user?.email) {
        const my = await flowApi.entities.ExpenseReport.filter({ employee_email: user.email });
        setPendingExpenseCount(my.filter(r =>
          r.status === 'ik_onayi_bekliyor' || r.status === 'yonetici_onayi_bekliyor'
        ).length);
      }
      if (isPrivileged) {
        const all = await flowApi.entities.ExpenseReport.list();
        setPendingExpenseIKCount(all.filter(r =>
          r.status === 'ik_onayi_bekliyor' || r.status === 'yonetici_onayi_bekliyor'
        ).length);
      }
    } catch { setPendingExpenseCount(0); setPendingExpenseIKCount(0); }
  };
  useEffect(() => {
    fetchExpenseCount();
    const interval = setInterval(fetchExpenseCount, 3000);
    return () => clearInterval(interval);
  }, [user?.email, isPrivileged]);

  // ── Work tasks ───────────────────────────────────────────────────
  const { data: workTasks = [] } = useQuery({
    queryKey: ['notif-worktask'],
    queryFn: () => flowApi.entities.WorkTask.list(),
    enabled: !!user && user?.role !== 'musteri',
    refetchInterval: 3000,
  });
  const pendingWorkTaskCount = useMemo(() =>
    workTasks.filter(t => t.status === 'beklemede' || t.status === 'onay_bekliyor').length,
    [workTasks]
  );

  // ── TQ assigned tickets ──────────────────────────────────────────
  const { data: assignedTickets = [] } = useQuery({
    queryKey: ['notif-tq-tickets', employeeRecord?.id],
    // /me/tickets hem tekil (assigned_to_id) hem coklu (assigned_to_ids) atamalari doner
    queryFn: () => fetch('/api/auth/me/tickets', { credentials: 'include' }).then(r => r.json()),
    enabled: !!employeeRecord?.id,
  });
  const assignedTicketCount = useMemo(() =>
    assignedTickets.filter(t => t.status !== 'sonuclanan' && t.status !== 'iptal' && t.status !== 'arsivlendi').length,
    [assignedTickets]
  );

  // ── Subscribe to realtime events ─────────────────────────────────
  useEffect(() => {
    if (!user?.email) return;
    const unsubs = [
      flowApi.entities.Todo.subscribe(() => queryClient.invalidateQueries({ queryKey: ['notif-todos'] })),
      flowApi.entities.Message.subscribe(() => queryClient.invalidateQueries({ queryKey: ['notif-conversations'] })),
      flowApi.entities.Conversation.subscribe(() => queryClient.invalidateQueries({ queryKey: ['notif-conversations'] })),
      flowApi.entities.WorkTask.subscribe(() => fetchWorkTaskCount()),
    ];
    return () => unsubs.forEach(u => u?.());
  }, [user?.email]);

  return (
    <NotificationContext.Provider value={{
      unreadTodoCount,
      unreadMessageCount,
      pendingLeaveCount,
      pendingExpenseCount,
      pendingExpenseIKCount,
      pendingWorkTaskCount,
      assignedTicketCount,
      assignedTickets,
      fetchLeaveCount,
      fetchExpenseCount,
      activeConversationId,
      setActiveConversationId,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};

// Backward-compat hooks — eski context'leri kullanan bileşenler bunlarla çalışmaya devam eder
export const useLeave = () => {
  const { pendingLeaveCount, fetchLeaveCount } = useNotifications();
  return { pendingLeaveCount, fetchPendingCount: fetchLeaveCount };
};
export const useExpense = () => {
  const { pendingExpenseCount, pendingExpenseIKCount, fetchExpenseCount } = useNotifications();
  return { pendingExpenseCount, pendingExpenseIKCount, fetchPendingCount: fetchExpenseCount };
};
export const useWorkTasks = () => {
  const { pendingWorkTaskCount } = useNotifications();
  return { pendingWorkTaskCount };
};
export const useTodos = () => {
  const { unreadTodoCount } = useNotifications();
  return { unreadTodoCount };
};
export const useMessages = () => {
  const { unreadMessageCount, activeConversationId, setActiveConversationId } = useNotifications();
  return { unreadMessageCount, activeConversationId, setActiveConversationId };
};
export const useTQNotifications = () => {
  const { assignedTicketCount, assignedTickets } = useNotifications();
  return { assignedTicketCount, assignedTickets };
};
