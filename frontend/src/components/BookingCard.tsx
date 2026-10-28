import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, MapPin, MessageSquare, Video } from 'lucide-react';
import { api, errorMessage } from '@/api/client';
import { bookingApi, instructorApi, meApi } from '@/api/endpoints';
import type { Booking } from '@/api/types';
import { dateTime, modeLabel, money } from '@/lib/format';
import { Button, Card, ErrorText, Input, StatusBadge, Stars, Textarea } from './ui';

async function downloadIcs(id: number) {
  const res = await api.get(bookingApi.icsUrl(id), { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `booking-${id}.ics` });
  a.click();
  URL.revokeObjectURL(url);
}

/** Booking row with role-aware actions (customer vs instructor). */
export default function BookingCard({ b, as }: { b: Booking; as: 'customer' | 'instructor' }) {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<'none' | 'cancel' | 'reschedule' | 'review'>('none');
  const [text, setText] = useState('');
  const [when, setWhen] = useState('');
  const [rating, setRating] = useState(5);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['instructor-bookings'] });
    setPanel('none');
  };

  const action = useMutation({
    mutationFn: async (kind: string) => {
      switch (kind) {
        case 'cancel': return bookingApi.cancel(b.id, text);
        case 'reschedule': return bookingApi.reschedule(b.id, new Date(when).toISOString());
        case 'review': return meApi.review(b.id, rating, text);
        case 'accept': return instructorApi.accept(b.id);
        case 'reject': return instructorApi.reject(b.id, text);
        case 'attended': return instructorApi.attendance(b.id, true);
        case 'noshow': return instructorApi.attendance(b.id, false);
      }
    },
    onSuccess: refresh,
  });

  const active = b.status === 'PENDING' || b.status === 'CONFIRMED';
  const started = new Date(b.startAt) <= new Date();
  const other = as === 'customer' ? { name: b.instructorName, id: b.instructorUserId } : { name: b.customerName, id: b.customerId };

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{b.serviceName}</h3>
            <StatusBadge status={b.status} />
          </div>
          <p className="text-sm text-slate-500">with {other.name} · {dateTime(b.startAt)} · {b.durationMinutes} min · {modeLabel[b.deliveryMode]}</p>
          {b.location && <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" />{b.location.address ?? b.location.label}, {b.location.city}</p>}
          {b.notes && as === 'instructor' && <p className="mt-1 text-sm italic text-slate-500">"{b.notes}"</p>}
        </div>
        <p className="text-lg font-bold">{money(b.totalPrice, b.currency)}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {b.meetingUrl && b.status === 'CONFIRMED' && (
          <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer"><Button><Video className="h-4 w-4" /> Join</Button></a>
        )}
        <Link to={`/messages/${other.id}`}><Button variant="secondary"><MessageSquare className="h-4 w-4" /> Message</Button></Link>
        {active && <Button variant="secondary" onClick={() => downloadIcs(b.id)}><CalendarPlus className="h-4 w-4" /> Calendar</Button>}
        {as === 'instructor' && b.status === 'PENDING' && (
          <>
            <Button onClick={() => action.mutate('accept')}>Accept</Button>
            <Button variant="danger" onClick={() => action.mutate('reject')}>Decline</Button>
          </>
        )}
        {as === 'instructor' && b.status === 'CONFIRMED' && started && (
          <>
            <Button onClick={() => action.mutate('attended')}>Mark attended</Button>
            <Button variant="secondary" onClick={() => action.mutate('noshow')}>No-show</Button>
          </>
        )}
        {active && !started && (
          <>
            <Button variant="ghost" onClick={() => setPanel('reschedule')}>Reschedule</Button>
            <Button variant="ghost" onClick={() => setPanel('cancel')}>Cancel</Button>
          </>
        )}
        {as === 'customer' && b.status === 'COMPLETED' && <Button variant="secondary" onClick={() => setPanel('review')}>Leave a review</Button>}
      </div>

      {panel !== 'none' && (
        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          {panel === 'reschedule' && <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}
          {panel === 'review' && <Stars value={rating} size="lg" onChange={setRating} />}
          {panel !== 'reschedule' && (
            <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={panel === 'review' ? 3000 : 500}
              placeholder={panel === 'review' ? 'How was your session?' : 'Reason (optional)'} />
          )}
          <ErrorText>{action.isError && errorMessage(action.error)}</ErrorText>
          <div className="flex gap-2">
            <Button loading={action.isPending} disabled={panel === 'reschedule' && !when} onClick={() => action.mutate(panel)}>
              {panel === 'cancel' ? 'Confirm cancellation' : panel === 'reschedule' ? 'Request new time' : 'Submit review'}
            </Button>
            <Button variant="ghost" onClick={() => setPanel('none')}>Close</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
