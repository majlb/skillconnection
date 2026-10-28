import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { bookingApi, instructorApi } from '@/api/endpoints';
import type { Booking } from '@/api/types';
import { useAuth } from '@/context/AuthContext';
import BookingCard from '@/components/BookingCard';
import { Button, Card } from '@/components/ui';
import { timeOnly } from '@/lib/format';

/** Month view of all the user's sessions (as customer and, if applicable, as instructor). */
export default function CalendarPage() {
  const { hasRole } = useAuth();
  const isInstructor = hasRole('INSTRUCTOR');
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selected, setSelected] = useState(new Date());

  const { data: asCustomer = [] } = useQuery({ queryKey: ['bookings', 'all'], queryFn: () => bookingApi.mine('all') });
  const { data: asInstructor = [] } = useQuery({ queryKey: ['instructor-bookings', 'all'], queryFn: () => instructorApi.bookings('all'), enabled: isInstructor });

  const events = useMemo(() => {
    const list: { b: Booking; as: 'customer' | 'instructor' }[] = [
      ...asCustomer.map((b) => ({ b, as: 'customer' as const })),
      ...asInstructor.map((b) => ({ b, as: 'instructor' as const })),
    ];
    return list.filter((e) => e.b.status !== 'CANCELLED' && e.b.status !== 'REJECTED');
  }, [asCustomer, asInstructor]);

  const days = eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  const dayEvents = (d: Date) => events.filter((e) => isSameDay(new Date(e.b.startAt), d));

  return (
    <div className="container-page space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="w-36 text-center font-semibold">{format(month, 'MMMM yyyy')}</span>
          <Button variant="ghost" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <Card className="p-2 sm:p-4">
        <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase text-slate-500">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const ev = dayEvents(d);
            return (
              <button key={d.toISOString()} onClick={() => setSelected(d)}
                className={clsx('min-h-[72px] rounded-lg p-1 text-left text-xs transition sm:min-h-[96px]',
                  !isSameMonth(d, month) && 'opacity-40', isSameDay(d, selected) ? 'ring-2 ring-brand-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800')}>
                <span className={clsx('inline-block rounded-full px-1.5', isSameDay(d, new Date()) && 'bg-brand-600 text-white')}>{format(d, 'd')}</span>
                <div className="mt-1 space-y-0.5">
                  {ev.slice(0, 3).map(({ b, as }) => (
                    <div key={`${as}-${b.id}`} className={clsx('truncate rounded px-1', as === 'instructor' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200')}>
                      <span className="hidden sm:inline">{timeOnly(b.startAt)} </span>{b.serviceName}
                    </div>
                  ))}
                  {ev.length > 3 && <div className="text-slate-500">+{ev.length - 3}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{format(selected, 'EEEE, MMMM d')}</h2>
        {dayEvents(selected).length === 0 ? <p className="text-sm text-slate-500">No sessions.</p> :
          dayEvents(selected).map(({ b, as }) => <BookingCard key={`${as}-${b.id}`} b={b} as={as} />)}
      </section>
    </div>
  );
}
