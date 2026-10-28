import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE, refreshAccessToken, tokenStore } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { Message, Notification } from '@/api/types';

type Handler = { onMessage?: (m: Message) => void; onNotification?: (n: Notification) => void };
const handlers = new Set<Handler>();

function wsUrl() {
  const base = API_BASE || window.location.origin;
  return base.replace(/^http/, 'ws') + '/ws';
}

/** Opens one STOMP connection per signed-in session and fans events out to subscribers. */
export function useRealtimeConnection() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const client = new Client({
      brokerURL: wsUrl(),
      reconnectDelay: 5000,
      beforeConnect: async () => {
        // Access tokens are short-lived; get a fresh one for every (re)connect.
        const token = (await refreshAccessToken()) ?? tokenStore.access ?? '';
        client.connectHeaders = { Authorization: `Bearer ${token}` };
      },
      onConnect: () => {
        client.subscribe('/user/queue/messages', (f) => {
          const m = JSON.parse(f.body) as Message;
          handlers.forEach((h) => h.onMessage?.(m));
          qc.invalidateQueries({ queryKey: ['conversations'] });
        });
        client.subscribe('/user/queue/notifications', (f) => {
          const n = JSON.parse(f.body) as Notification;
          handlers.forEach((h) => h.onNotification?.(n));
          qc.invalidateQueries({ queryKey: ['notifications'] });
          qc.invalidateQueries({ queryKey: ['unread'] });
          if ('Notification' in window && window.Notification.permission === 'granted' && document.hidden) {
            new window.Notification(n.title, { body: n.body });
          }
        });
      },
    });
    client.activate();
    return () => {
      client.deactivate();
    };
  }, [user, qc]);
}

export function useRealtime(handler: Handler) {
  useEffect(() => {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }, [handler]);
}
