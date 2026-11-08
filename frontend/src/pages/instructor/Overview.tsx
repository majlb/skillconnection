import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { instructorApi } from '@/api/endpoints';
import { useMoney } from '@/context/CurrencyContext';
import BookingCard from '@/components/BookingCard';
import { Badge, Card, Empty, Spinner, Stat } from '@/components/ui';
import { dateOnly } from '@/lib/format';

export default function Overview() {
  const money = useMoney();
  const { data: e, isLoading } = useQuery({ queryKey: ['earnings'], queryFn: instructorApi.earnings });
  const { data: upcoming = [] } = useQuery({ queryKey: ['instructor-bookings', 'upcoming'], queryFn: () => instructorApi.bookings('upcoming') });
  if (isLoading || !e) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Gross revenue (12 mo)" value={money(e.grossRevenue)} icon={<DollarSign className="h-5 w-5" />} />
        <Stat label="Net after fees" value={money(e.netRevenue)} icon={<Wallet className="h-5 w-5" />} />
        <Stat label="Completed sessions" value={e.completedSessions} icon={<CalendarCheck className="h-5 w-5" />} />
        <Stat label="Upcoming / pending" value={e.upcomingSessions} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">Monthly revenue</h2>
        {e.monthly.length === 0 ? <p className="text-sm text-slate-500">No completed sessions yet.</p> : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={e.monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="amount" name="Revenue" fill="#337dff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Booking statistics</h2>
          <div className="space-y-2 text-sm">
            {e.statusBreakdown.map((r) => (
              <div key={r.label} className="flex justify-between"><span>{r.label.toLowerCase()}</span><span className="font-medium">{r.value}</span></div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Payout history</h2>
          {e.payouts.length === 0 ? <p className="text-sm text-slate-500">No payouts yet.</p> : (
            <div className="space-y-2 text-sm">
              {e.payouts.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span>{dateOnly(p.createdAt)}</span>
                  <Badge color={p.status === 'SUCCEEDED' ? 'green' : 'amber'}>{p.status.toLowerCase()}</Badge>
                  <span className="font-medium">{money(p.amount, p.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Upcoming classes</h2>
        <div className="space-y-3">
          {upcoming.length === 0 ? <Empty title="No upcoming classes" /> : upcoming.slice(0, 5).map((b) => <BookingCard key={b.id} b={b} as="instructor" />)}
        </div>
      </section>
    </div>
  );
}
