import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { addDays, format, startOfDay } from 'date-fns';
import { Check, ChevronLeft, ChevronRight, CreditCard, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { bookingApi, instructorPublicApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { DeliveryMode, PaymentMethod, TimeSlot } from '@/api/types';
import MapView from '@/components/MapView';
import { Button, Card, ErrorText, Field, Select, Spinner, Textarea } from '@/components/ui';
import { dateTime, isoDate, modeLabel, money, timeOnly } from '@/lib/format';

const STEPS = ['Service', 'Date & time', 'Location', 'Review & pay'];
const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'CARD', label: 'Credit / debit card' },
  { id: 'APPLE_PAY', label: 'Apple Pay' },
  { id: 'GOOGLE_PAY', label: 'Google Pay' },
  { id: 'PAYPAL', label: 'PayPal' },
];

export default function BookingWizard() {
  const instructorId = Number(useParams().instructorId);
  const [sp] = useSearchParams();
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<number | undefined>(sp.get('serviceId') ? Number(sp.get('serviceId')) : undefined);
  const [duration, setDuration] = useState<number>();
  const [participants, setParticipants] = useState(1);
  const [mode, setMode] = useState<DeliveryMode>('ONLINE');
  const [weekStart, setWeekStart] = useState(startOfDay(new Date()));
  const [slot, setSlot] = useState<TimeSlot>();
  const [locationId, setLocationId] = useState<number>();
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('CARD');
  const [depositOnly, setDepositOnly] = useState(false);

  const { data: instructor, isLoading } = useQuery({ queryKey: ['instructor', instructorId], queryFn: () => instructorPublicApi.get(instructorId) });
  const service = instructor?.services.find((s) => s.id === serviceId);
  const locations = instructor?.summary.locations ?? [];

  useEffect(() => {
    if (!service) return;
    setDuration((d) => (d && service.durationOptions.includes(d) ? d : service.durationOptions[0]));
    setMode(service.deliveryMode === 'BOTH' ? 'ONLINE' : service.deliveryMode);
  }, [service]);

  const range = { from: isoDate(weekStart), to: isoDate(addDays(weekStart, 6)) };
  const { data: slots, isFetching: loadingSlots } = useQuery({
    queryKey: ['slots', instructorId, serviceId, duration, range.from],
    queryFn: () => instructorPublicApi.availability(instructorId, { serviceId, duration, ...range }),
    enabled: step === 1 && !!serviceId && !!duration,
  });
  const byDay = useMemo(() => {
    const m = new Map<string, TimeSlot[]>();
    for (let i = 0; i < 7; i++) m.set(isoDate(addDays(weekStart, i)), []);
    slots?.forEach((s) => m.get(isoDate(new Date(s.start)))?.push(s));
    return m;
  }, [slots, weekStart]);

  const { data: quote } = useQuery({
    queryKey: ['quote', serviceId, duration, participants],
    queryFn: () => bookingApi.quote(serviceId!, duration!, participants),
    enabled: !!serviceId && !!duration,
  });

  const book = useMutation({
    mutationFn: () => bookingApi.create({
      serviceId: serviceId!, startAt: slot!.start, durationMinutes: duration!, participants, deliveryMode: mode,
      locationId: mode === 'IN_PERSON' ? locationId : undefined, notes: notes || undefined,
      paymentMethod: payment, payDepositOnly: depositOnly,
      // In production the provider SDK (Stripe Elements / PayPal Buttons) produces this token client-side.
      paymentToken: undefined,
    }),
  });

  if (isLoading || !instructor) return <Spinner />;

  if (book.isSuccess) {
    return (
      <div className="container-page max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-8 w-8" /></div>
        <h1 className="page-title">Booking requested!</h1>
        <p className="mt-2 text-slate-500">{instructor.summary.fullName} will confirm shortly. You'll get a notification.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/dashboard"><Button>Go to dashboard</Button></Link>
          <Link to={`/messages/${instructor.summary.userId}`}><Button variant="secondary">Message instructor</Button></Link>
        </div>
      </div>
    );
  }

  const canNext = [
    !!service && !!duration,
    !!slot,
    mode === 'ONLINE' || !!locationId,
    true,
  ][step];

  return (
    <div className="container-page max-w-4xl">
      <h1 className="page-title">Book with {instructor.summary.fullName}</h1>
      <ol className="my-6 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={clsx('rounded-full py-1.5 text-center text-xs font-medium sm:text-sm', i <= step ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
            {i + 1}. <span className="hidden sm:inline">{s}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <Card>
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Service">
                <Select value={serviceId ?? ''} onChange={(e) => { setServiceId(Number(e.target.value)); setSlot(undefined); }}>
                  <option value="" disabled>Select a service</option>
                  {instructor.services.map((s) => <option key={s.id} value={s.id}>{s.name} — {money(s.price, s.currency)}</option>)}
                </Select>
              </Field>
              {service && (
                <>
                  <Field label="Duration">
                    <div className="flex flex-wrap gap-2">
                      {service.durationOptions.map((d) => (
                        <button key={d} onClick={() => { setDuration(d); setSlot(undefined); }}
                          className={clsx('rounded-xl border px-4 py-2 text-sm', d === duration ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'border-slate-300 dark:border-slate-700')}>
                          {d} min
                        </button>
                      ))}
                    </div>
                  </Field>
                  {service.maxStudents > 1 && (
                    <Field label={`Participants (max ${service.maxStudents})`}>
                      <Select value={participants} onChange={(e) => setParticipants(Number(e.target.value))}>
                        {Array.from({ length: service.maxStudents }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                      </Select>
                    </Field>
                  )}
                  {service.deliveryMode === 'BOTH' && (
                    <Field label="Lesson type">
                      <Select value={mode} onChange={(e) => setMode(e.target.value as DeliveryMode)}>
                        <option value="ONLINE">Online</option>
                        <option value="IN_PERSON">In person</option>
                      </Select>
                    </Field>
                  )}
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <Button variant="ghost" disabled={weekStart <= startOfDay(new Date())} onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-medium">{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}</span>
                <Button variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              {loadingSlots ? <Spinner /> : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {[...byDay.entries()].map(([day, list]) => (
                    <div key={day}>
                      <p className="mb-2 text-center text-xs font-semibold uppercase text-slate-500">{format(new Date(day + 'T00:00'), 'EEE d')}</p>
                      <div className="space-y-1.5">
                        {list.length === 0 && <p className="text-center text-xs text-slate-400">—</p>}
                        {list.map((s) => (
                          <button key={s.start} onClick={() => setSlot(s)}
                            className={clsx('w-full rounded-lg border py-1.5 text-sm', slot?.start === s.start ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 hover:border-brand-400 dark:border-slate-700')}>
                            {timeOnly(s.start)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {mode === 'ONLINE' ? (
                <p className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
                  This is an online lesson. A video meeting link will be added once the instructor confirms.
                </p>
              ) : (
                <>
                  <Field label="Location">
                    <Select value={locationId ?? ''} onChange={(e) => setLocationId(Number(e.target.value))}>
                      <option value="" disabled>Choose a location</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.label ?? l.address} — {l.city}</option>)}
                    </Select>
                  </Field>
                  {locations.length > 0 && (
                    <MapView height="240px" center={{ lat: locations[0].latitude, lng: locations[0].longitude }}
                      points={locations.map((l) => ({ id: l.id, lat: l.latitude, lng: l.longitude, title: l.label ?? l.city }))} />
                  )}
                </>
              )}
              <Field label="Notes for the instructor (optional)">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Goals, level, anything they should know…" />
              </Field>
            </div>
          )}

          {step === 3 && quote && (
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 font-semibold">Payment method</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m.id} onClick={() => setPayment(m.id)}
                      className={clsx('flex items-center gap-2 rounded-xl border p-3 text-left text-sm', payment === m.id ? 'border-brand-600 ring-2 ring-brand-200 dark:ring-brand-900' : 'border-slate-300 dark:border-slate-700')}>
                      {m.id === 'CARD' ? <CreditCard className="h-4 w-4" /> : <Wallet className="h-4 w-4" />} {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {quote.deposit > 0 && (
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <input type="checkbox" checked={depositOnly} onChange={(e) => setDepositOnly(e.target.checked)} />
                  Pay only a {money(quote.deposit, quote.currency)} deposit now; the balance is charged after the session.
                </label>
              )}
              <ErrorText>{book.isError && errorMessage(book.error)}</ErrorText>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 3 ? (
              <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</Button>
            ) : (
              <Button loading={book.isPending} onClick={() => book.mutate()}>
                Confirm & pay {quote && money(depositOnly ? quote.deposit : quote.total, quote.currency)}
              </Button>
            )}
          </div>
        </Card>

        <Card className="h-fit space-y-3 text-sm">
          <h3 className="font-semibold">Summary</h3>
          <Row k="Service" v={service?.name ?? '—'} />
          <Row k="Type" v={modeLabel[mode]} />
          <Row k="Duration" v={duration ? `${duration} min` : '—'} />
          {participants > 1 && <Row k="Participants" v={String(participants)} />}
          <Row k="When" v={slot ? dateTime(slot.start) : '—'} />
          {quote && (
            <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="text-xs text-slate-500">{quote.breakdown}</p>
              <div className="mt-2 flex justify-between text-base font-bold"><span>Total</span><span>{money(quote.total, quote.currency)}</span></div>
              {depositOnly && <Row k="Due now" v={money(quote.deposit, quote.currency)} />}
            </div>
          )}
          <p className="text-xs text-slate-500">Free cancellation up to 24 hours before the session.</p>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><span className="text-slate-500">{k}</span><span className="text-right font-medium">{v}</span></div>;
}
