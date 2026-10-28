import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeft, Send } from 'lucide-react';
import { chatApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { Message } from '@/api/types';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { Avatar, Empty, ErrorText } from '@/components/ui';
import { ago, timeOnly } from '@/lib/format';

export default function Messages() {
  const { partnerId: pid } = useParams();
  const partnerId = pid ? Number(pid) : undefined;
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery({ queryKey: ['conversations'], queryFn: chatApi.conversations });
  const { data: thread = [] } = useQuery({ queryKey: ['thread', partnerId], queryFn: () => chatApi.thread(partnerId!), enabled: !!partnerId });
  const partner = conversations.find((c) => c.partnerId === partnerId);

  const onMessage = useCallback((m: Message) => {
    if (m.senderId === partnerId || m.recipientId === partnerId) {
      qc.setQueryData<Message[]>(['thread', partnerId], (old = []) => (old.some((x) => x.id === m.id) ? old : [...old, m]));
    }
  }, [partnerId, qc]);
  // Stable handler object whose callback is kept current, so the subscription is registered once.
  const handlerRef = useRef({ onMessage });
  handlerRef.current.onMessage = onMessage;
  useRealtime(handlerRef.current);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [thread.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !partnerId) return;
    setError('');
    try {
      const m = await chatApi.send(partnerId, text.trim());
      setText('');
      onMessage(m);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto grid h-[calc(100vh-4rem)] max-w-7xl md:grid-cols-[320px_1fr]">
      <aside className={clsx('overflow-y-auto border-r border-slate-200 dark:border-slate-800', partnerId && 'hidden md:block')}>
        <h1 className="p-4 text-xl font-bold">Messages</h1>
        {conversations.length === 0 && <p className="px-4 text-sm text-slate-500">No conversations yet. Message an instructor from their profile.</p>}
        {conversations.map((c) => (
          <Link key={c.partnerId} to={`/messages/${c.partnerId}`}
            className={clsx('flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900', c.partnerId === partnerId && 'bg-slate-100 dark:bg-slate-800')}>
            <Avatar src={c.partnerAvatar} name={c.partnerName} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between"><span className={clsx('truncate', c.unread && 'font-bold')}>{c.partnerName}</span><span className="text-xs text-slate-400">{ago(c.lastAt)}</span></div>
              <p className="truncate text-sm text-slate-500">{c.lastMessage}</p>
            </div>
          </Link>
        ))}
      </aside>
      <section className={clsx('flex flex-col', !partnerId && 'hidden md:flex')}>
        {!partnerId ? <div className="m-auto"><Empty title="Select a conversation" /></div> : (
          <>
            <header className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <Link to="/messages" className="md:hidden"><ArrowLeft className="h-5 w-5" /></Link>
              {partner && <Avatar src={partner.partnerAvatar} name={partner.partnerName} size={36} />}
              <span className="font-semibold">{partner?.partnerName ?? 'New conversation'}</span>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {thread.map((m) => {
                const mine = m.senderId === user?.id;
                return (
                  <div key={m.id} className={clsx('flex', mine && 'justify-end')}>
                    <div className={clsx('max-w-[75%] rounded-2xl px-4 py-2', mine ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800')}>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={clsx('mt-1 text-right text-[10px]', mine ? 'text-brand-100' : 'text-slate-400')}>{timeOnly(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottom} />
            </div>
            <form onSubmit={send} className="border-t border-slate-200 p-3 dark:border-slate-800">
              <ErrorText>{error}</ErrorText>
              <div className="mt-1 flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Write a message…"
                  className="flex-1 rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 outline-none focus:border-brand-500 dark:border-slate-700" />
                <button aria-label="Send" className="rounded-xl bg-brand-600 px-4 text-white"><Send className="h-4 w-4" /></button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
