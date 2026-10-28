import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing } from 'lucide-react';
import clsx from 'clsx';
import { notificationApi } from '@/api/endpoints';
import { Button, Empty, Spinner } from '@/components/ui';
import { ago } from '@/lib/format';

export default function Notifications() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationApi.list() });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread'] }); };
  const readAll = useMutation({ mutationFn: notificationApi.readAll, onSuccess: refresh });
  const canPush = 'Notification' in window && window.Notification.permission === 'default';

  async function open(id: number, link?: string) {
    await notificationApi.read(id);
    refresh();
    if (link?.startsWith('/')) navigate(link);
  }

  return (
    <div className="container-page max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Notifications</h1>
        <div className="flex gap-2">
          {canPush && <Button variant="secondary" onClick={() => window.Notification.requestPermission()}><BellRing className="h-4 w-4" /> Enable push</Button>}
          <Button variant="secondary" onClick={() => readAll.mutate()}>Mark all read</Button>
        </div>
      </div>
      {isLoading ? <Spinner /> : !data?.content.length ? <Empty title="You're all caught up" /> : (
        <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {data.content.map((n) => (
            <button key={n.id} onClick={() => open(n.id, n.link)} className={clsx('block w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900', !n.read && 'bg-brand-50/60 dark:bg-brand-900/20')}>
              <div className="flex justify-between gap-2">
                <span className={clsx(!n.read && 'font-semibold')}>{n.title}</span>
                <span className="shrink-0 text-xs text-slate-400">{ago(n.createdAt)}</span>
              </div>
              {n.body && <p className="mt-1 text-sm text-slate-500">{n.body}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
