import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, X } from 'lucide-react';
import { searchApi } from '@/api/endpoints';
import type { InstructorSummary } from '@/api/types';
import { money } from '@/lib/format';

interface Turn { from: 'user' | 'bot'; text: string; results?: InstructorSummary[] }

/** Floating search-assistant chatbot. */
export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([
    { from: 'bot', text: 'Hi! Tell me what you are looking for, e.g. "online piano lessons for kids under $30".' },
  ]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setTurns((t) => [...t, { from: 'user', text }]);
    setBusy(true);
    try {
      const res = await searchApi.assistant(text);
      setTurns((t) => [...t, { from: 'bot', text: res.reply, results: res.results }]);
    } catch {
      setTurns((t) => [...t, { from: 'bot', text: 'Sorry, I could not search right now.' }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button aria-label="Open search assistant" onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-brand-600 p-4 text-white shadow-lg transition hover:scale-105">
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[520px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between bg-brand-600 px-4 py-3 text-white">
        <span className="flex items-center gap-2 font-semibold"><Bot className="h-5 w-5" /> Search assistant</span>
        <button aria-label="Close" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {turns.map((t, i) => (
          <div key={i} className={t.from === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${t.from === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {t.text}
            </div>
            {t.results?.map((r) => (
              <Link key={r.id} to={`/instructors/${r.id}`} onClick={() => setOpen(false)}
                className="mt-2 block rounded-xl border border-slate-200 p-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <span className="font-medium">{r.fullName}</span> · ★ {Number(r.ratingAvg).toFixed(1)} · from {money(r.minPrice)}
              </Link>
            ))}
          </div>
        ))}
        {busy && <p className="text-sm text-slate-400">Searching…</p>}
      </div>
      <form className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-700" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" maxLength={1000}
          className="flex-1 rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none dark:border-slate-700" />
        <button aria-label="Send" className="rounded-xl bg-brand-600 px-3 text-white"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
