import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, Plus, Trash2 } from 'lucide-react';
import { instructorApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { SlotType } from '@/api/types';
import { Badge, Button, Card, ErrorText, Field, Input, Select } from '@/components/ui';
import { DAYS } from '@/lib/format';

export default function Availability() {
  const qc = useQueryClient();
  const { data: slots = [] } = useQuery({ queryKey: ['my-availability'], queryFn: instructorApi.availability });
  const { data: locations = [] } = useQuery({ queryKey: ['my-locations'], queryFn: instructorApi.locations });
  const { data: insights = [] } = useQuery({ queryKey: ['availability-insights'], queryFn: instructorApi.insights });
  const { data: profile } = useQuery({ queryKey: ['my-instructor-profile'], queryFn: instructorApi.profile });

  const [type, setType] = useState<SlotType>('RECURRING');
  const [days, setDays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fullDay, setFullDay] = useState(true);
  const [locationId, setLocationId] = useState<number | ''>('');
  const [note, setNote] = useState('');

  const refresh = () => qc.invalidateQueries({ queryKey: ['my-availability'] });
  const add = useMutation({
    mutationFn: async () => {
      const base = { slotType: type, locationId: locationId || undefined, note: note || undefined };
      if (type === 'RECURRING') {
        // One weekly window per selected day.
        for (const d of days) await instructorApi.addAvailability({ ...base, dayOfWeek: d, startTime, endTime });
      } else if (type === 'ONE_OFF') {
        await instructorApi.addAvailability({ ...base, startDate, startTime, endTime });
      } else {
        await instructorApi.addAvailability({
          ...base, startDate, endDate: endDate || undefined,
          startTime: fullDay ? undefined : startTime, endTime: fullDay ? undefined : endTime,
        });
      }
    },
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: instructorApi.removeAvailability, onSuccess: refresh });

  const submit = (e: FormEvent) => { e.preventDefault(); add.mutate(); };
  const recurring = slots.filter((s) => s.slotType === 'RECURRING');
  const others = slots.filter((s) => s.slotType !== 'RECURRING');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Availability</h1>
        <p className="text-sm text-slate-500">Times are in your time zone: <b>{profile?.timeZone ?? 'UTC'}</b> (change it under Profile).</p>
      </div>

      {insights.length > 0 && (
        <Card className="border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-900/20">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><Lightbulb className="h-5 w-5 text-brand-600" /> Availability optimisation</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">{insights.map((i) => <li key={i}>{i}</li>)}</ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold">Weekly schedule</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {DAYS.map((d, idx) => (
            <div key={d} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
              <p className="mb-2 text-center text-xs font-semibold uppercase text-slate-500">{d}</p>
              {recurring.filter((s) => s.dayOfWeek === idx + 1).map((s) => (
                <div key={s.id} className="mb-1 flex items-center justify-between rounded-lg bg-brand-600 px-2 py-1 text-xs text-white">
                  {s.startTime?.slice(0, 5)}–{s.endTime?.slice(0, 5)}
                  <button aria-label="Remove" onClick={() => remove.mutate(s.id)}><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Add availability or block time</h2>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as SlotType)}>
              <option value="RECURRING">Recurring weekly</option>
              <option value="ONE_OFF">Extra one-off slot</option>
              <option value="BLOCKED">Block (vacation / unavailable)</option>
            </Select>
          </Field>
          {type === 'RECURRING' ? (
            <div className="md:col-span-2">
              <Field label="Days">
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d, i) => (
                    <button type="button" key={d} onClick={() => setDays(days.includes(i + 1) ? days.filter((x) => x !== i + 1) : [...days, i + 1])}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${days.includes(i + 1) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>{d}</button>
                  ))}
                </div>
              </Field>
            </div>
          ) : (
            <>
              <Field label={type === 'BLOCKED' ? 'From date' : 'Date'}><Input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
              {type === 'BLOCKED' && <Field label="To date (optional)"><Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} /></Field>}
            </>
          )}
          {type === 'BLOCKED' && (
            <label className="flex items-center gap-2 text-sm md:col-span-3"><input type="checkbox" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} /> Whole day(s)</label>
          )}
          {(type !== 'BLOCKED' || !fullDay) && (
            <>
              <Field label="Start time"><Input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field>
              <Field label="End time"><Input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
            </>
          )}
          {type !== 'BLOCKED' && locations.length > 0 && (
            <Field label="Working location">
              <Select value={locationId} onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Any / online</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.label ?? l.city}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Note"><Input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="md:col-span-3"><ErrorText>{add.isError && errorMessage(add.error)}</ErrorText></div>
          <div><Button type="submit" loading={add.isPending}><Plus className="h-4 w-4" /> Add</Button></div>
        </form>
      </Card>

      {others.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">One-off slots & blocked periods</h2>
          <div className="space-y-2">
            {others.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                <span className="flex items-center gap-2">
                  <Badge color={s.slotType === 'BLOCKED' ? 'red' : 'green'}>{s.slotType === 'BLOCKED' ? 'blocked' : 'extra'}</Badge>
                  {s.startDate}{s.endDate && s.endDate !== s.startDate ? ` → ${s.endDate}` : ''}
                  {s.startTime ? ` · ${s.startTime.slice(0, 5)}–${s.endTime?.slice(0, 5)}` : ' · all day'}
                  {s.note && <span className="text-slate-500">· {s.note}</span>}
                </span>
                <button aria-label="Remove" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4 text-slate-500" /></button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
