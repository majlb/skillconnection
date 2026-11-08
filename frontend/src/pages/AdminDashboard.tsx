import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, DollarSign, GraduationCap, Users } from 'lucide-react';
import { api } from '@/api/client';
import { adminApi } from '@/api/endpoints';
import { useMoney } from '@/context/CurrencyContext';
import type { ReportRow } from '@/api/types';
import InstructorCard from '@/components/InstructorCard';
import { Badge, Button, Card, Empty, Input, Stat, Stars, Tabs } from '@/components/ui';
import { dateOnly } from '@/lib/format';

type Tab = 'overview' | 'instructors' | 'catalog' | 'reviews' | 'disputes' | 'payments';

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <div className="container-page space-y-6">
      <h1 className="page-title">Admin</h1>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview & reports' },
        { id: 'instructors', label: 'Instructor approvals' },
        { id: 'catalog', label: 'Categories & age groups' },
        { id: 'reviews', label: 'Review moderation' },
        { id: 'disputes', label: 'Disputes' },
        { id: 'payments', label: 'Payments' },
      ]} />
      {tab === 'overview' && <Overview />}
      {tab === 'instructors' && <Approvals />}
      {tab === 'catalog' && <Catalog />}
      {tab === 'reviews' && <Moderation />}
      {tab === 'disputes' && <Disputes />}
      {tab === 'payments' && <PaymentsAdmin />}
    </div>
  );
}

function Overview() {
  const money = useMoney();
  const { data: s } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats });
  const { data: r } = useQuery({ queryKey: ['admin-reports'], queryFn: adminApi.reports });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total users" value={s?.totalUsers ?? '—'} icon={<Users className="h-5 w-5" />} />
        <Stat label="Instructors" value={s ? `${s.totalInstructors} (${s.pendingInstructors} pending)` : '—'} icon={<GraduationCap className="h-5 w-5" />} />
        <Stat label="Bookings" value={s?.totalBookings ?? '—'} icon={<CalendarCheck className="h-5 w-5" />} />
        <Stat label="Revenue" value={money(s?.totalRevenue)} icon={<DollarSign className="h-5 w-5" />} />
      </div>
      {r && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Chart title="Booking trends (weekly)" data={r.bookingTrends} kind="line" />
          <Chart title="Customer growth (monthly sign-ups)" data={r.customerGrowth} kind="line" />
          <Chart title="Revenue by category" data={r.revenueByCategory} kind="bar" valueKey="amount" />
          <Card>
            <h3 className="mb-3 font-semibold">Most booked instructors</h3>
            {r.mostBookedInstructors.map((row, i) => (
              <div key={row.label} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
                <span>{i + 1}. {row.label}</span><span>{row.value} bookings · {money(row.amount)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

function Chart({ title, data, kind, valueKey = 'value' }: { title: string; data: ReportRow[]; kind: 'bar' | 'line'; valueKey?: 'value' | 'amount' }) {
  const money = useMoney();
  const tooltipFormatter = (value: number | string) => valueKey === 'amount' ? money(Number(value)) : value;
  return (
    <Card>
      <h3 className="mb-3 font-semibold">{title}</h3>
      {data.length === 0 ? <p className="text-sm text-slate-500">No data yet.</p> : (
        <div className="h-56">
          <ResponsiveContainer>
            {kind === 'bar' ? (
              <BarChart data={data}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={tooltipFormatter} /><Bar dataKey={valueKey} fill="#337dff" radius={[6, 6, 0, 0]} /></BarChart>
            ) : (
              <LineChart data={data}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={tooltipFormatter} /><Line dataKey={valueKey} stroke="#ff5a5f" strokeWidth={2} /></LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function Approvals() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [open, setOpen] = useState<number | null>(null);
  const { data } = useQuery({ queryKey: ['admin-instructors', status], queryFn: () => adminApi.instructors(status) });
  const { data: docs = [] } = useQuery({ queryKey: ['admin-docs', open], queryFn: () => adminApi.documents(open!), enabled: !!open });
  const verify = useMutation({
    mutationFn: ({ id, s }: { id: number; s: string }) => adminApi.verify(id, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-instructors'] }),
  });

  async function openDoc(id: number) {
    const res = await api.get(`/admin/documents/${id}/file`, { responseType: 'blob' });
    window.open(URL.createObjectURL(res.data as Blob), '_blank', 'noopener');
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((s) => (
          <Button key={s} variant={s === status ? 'primary' : 'secondary'} onClick={() => setStatus(s)}>{s.toLowerCase()}</Button>
        ))}
      </div>
      {!data?.content.length ? <Empty title="No instructors in this state" /> : data.content.map((i) => (
        <Card key={i.id} className="space-y-3">
          <InstructorCard i={i} compact />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setOpen(open === i.id ? null : i.id)}>Documents</Button>
            {status !== 'APPROVED' && <Button onClick={() => verify.mutate({ id: i.id, s: 'APPROVED' })}>Approve</Button>}
            {status === 'PENDING' && <Button variant="danger" onClick={() => verify.mutate({ id: i.id, s: 'REJECTED' })}>Reject</Button>}
            {status === 'APPROVED' && <Button variant="danger" onClick={() => verify.mutate({ id: i.id, s: 'SUSPENDED' })}>Suspend</Button>}
          </div>
          {open === i.id && (
            <div className="space-y-1 text-sm">
              {docs.length === 0 ? <p className="text-slate-500">No documents uploaded.</p> : docs.map((d) => (
                <button key={d.id} onClick={() => openDoc(d.id)} className="block text-brand-600 hover:underline">
                  {d.docType.toLowerCase()}: {d.fileName} ({dateOnly(d.createdAt)})
                </button>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function Catalog() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: adminApi.categories });
  const { data: ageGroups = [] } = useQuery({ queryKey: ['ageGroups'], queryFn: () => api.get('/catalog/age-groups').then((r) => r.data as { id: number; code: string; label: string; minAge: number; maxAge?: number; sortOrder: number }[]) });
  const [name, setName] = useState('');
  const [ag, setAg] = useState({ code: '', label: '', minAge: '', maxAge: '' });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); qc.invalidateQueries({ queryKey: ['categories'] }); qc.invalidateQueries({ queryKey: ['ageGroups'] }); };

  const addCat = useMutation({
    mutationFn: () => adminApi.saveCategory({ name, slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), icon: 'book-open', active: true }),
    onSuccess: () => { setName(''); refresh(); },
  });
  const toggleCat = useMutation({
    mutationFn: (c: (typeof categories)[number]) => adminApi.saveCategory({ name: c.name, slug: c.slug, icon: c.icon, active: !c.active }, c.id),
    onSuccess: refresh,
  });
  const addAge = useMutation({
    mutationFn: () => adminApi.saveAgeGroup({ code: ag.code, label: ag.label, minAge: Number(ag.minAge), maxAge: ag.maxAge ? Number(ag.maxAge) : undefined, sortOrder: ageGroups.length + 1 }),
    onSuccess: () => { setAg({ code: '', label: '', minAge: '', maxAge: '' }); refresh(); },
  });
  const delAge = useMutation({ mutationFn: adminApi.deleteAgeGroup, onSuccess: refresh });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <h3 className="mb-3 font-semibold">Categories</h3>
        <div className="mb-4 flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" /><Button disabled={!name} onClick={() => addCat.mutate()}>Add</Button></div>
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
            <span>{c.name} {!c.active && <Badge color="red">hidden</Badge>}</span>
            <Button variant="ghost" onClick={() => toggleCat.mutate(c)}>{c.active ? 'Hide' : 'Show'}</Button>
          </div>
        ))}
      </Card>
      <Card>
        <h3 className="mb-3 font-semibold">Age groups</h3>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Input placeholder="CODE" value={ag.code} onChange={(e) => setAg({ ...ag, code: e.target.value.toUpperCase() })} />
          <Input placeholder="Label" value={ag.label} onChange={(e) => setAg({ ...ag, label: e.target.value })} />
          <Input placeholder="Min" type="number" value={ag.minAge} onChange={(e) => setAg({ ...ag, minAge: e.target.value })} />
          <Input placeholder="Max" type="number" value={ag.maxAge} onChange={(e) => setAg({ ...ag, maxAge: e.target.value })} />
          <Button disabled={!ag.code || !ag.label || !ag.minAge} onClick={() => addAge.mutate()}>Add</Button>
        </div>
        {ageGroups.map((a) => (
          <div key={a.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
            <span>{a.label} <span className="text-slate-500">({a.code})</span></span>
            <Button variant="ghost" onClick={() => delAge.mutate(a.id)}>Delete</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Moderation() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('FLAGGED');
  const { data = [] } = useQuery({ queryKey: ['admin-reviews', status], queryFn: () => adminApi.reviews(status) });
  const moderate = useMutation({
    mutationFn: ({ id, s }: { id: number; s: string }) => adminApi.moderate(id, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{['FLAGGED', 'PUBLISHED', 'HIDDEN'].map((s) => <Button key={s} variant={s === status ? 'primary' : 'secondary'} onClick={() => setStatus(s)}>{s.toLowerCase()}</Button>)}</div>
      {data.length === 0 ? <Empty title="Nothing to moderate" /> : data.map((r) => (
        <Card key={r.id}>
          <div className="flex justify-between"><span className="font-medium">{r.customerName}</span><Stars value={r.rating} /></div>
          <p className="mt-2 text-sm">{r.comment}</p>
          <div className="mt-3 flex gap-2">
            {status !== 'PUBLISHED' && <Button onClick={() => moderate.mutate({ id: r.id, s: 'PUBLISHED' })}>Publish</Button>}
            {status !== 'HIDDEN' && <Button variant="danger" onClick={() => moderate.mutate({ id: r.id, s: 'HIDDEN' })}>Hide</Button>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function Disputes() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const { data = [] } = useQuery({ queryKey: ['admin-disputes'], queryFn: () => adminApi.disputes('OPEN') });
  const resolve = useMutation({
    mutationFn: ({ id, s }: { id: number; s: string }) => adminApi.resolve(id, s, notes[id] ?? ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-disputes'] }),
  });
  return data.length === 0 ? <Empty title="No open disputes" /> : (
    <div className="space-y-3">
      {data.map((d) => (
        <Card key={d.id} className="space-y-2">
          <p className="text-sm text-slate-500">Booking #{d.bookingId} · raised by {d.raisedBy} · {dateOnly(d.createdAt)}</p>
          <p>{d.reason}</p>
          <Input placeholder="Resolution notes" value={notes[d.id] ?? ''} onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })} />
          <div className="flex gap-2">
            <Button onClick={() => resolve.mutate({ id: d.id, s: 'RESOLVED' })}>Resolve</Button>
            <Button variant="secondary" onClick={() => resolve.mutate({ id: d.id, s: 'REJECTED' })}>Reject</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PaymentsAdmin() {
  const money = useMoney();
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const { data = [] } = useQuery({ queryKey: ['admin-payments', status], queryFn: () => adminApi.payments(status) });
  const settle = useMutation({ mutationFn: adminApi.settle, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-payments'] }) });
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'].map((s) => <Button key={s} variant={s === status ? 'primary' : 'secondary'} onClick={() => setStatus(s)}>{s.toLowerCase()}</Button>)}</div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-800"><tr>{['Date', 'Booking', 'Type', 'Method', 'Amount', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">{dateOnly(p.createdAt)}</td>
                <td className="px-4 py-3">#{p.bookingId}</td>
                <td className="px-4 py-3">{p.type.toLowerCase()}</td>
                <td className="px-4 py-3">{p.method.toLowerCase()}</td>
                <td className="px-4 py-3 font-medium">{money(p.amount, p.currency)}</td>
                <td className="px-4 py-3">{p.type === 'PAYOUT' && p.status === 'PENDING' && <Button variant="secondary" onClick={() => settle.mutate(p.id)}>Mark paid</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
