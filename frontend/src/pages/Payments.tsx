import { useQuery } from '@tanstack/react-query';
import { meApi } from '@/api/endpoints';
import { useMoney } from '@/context/CurrencyContext';
import { Badge, Card, Empty, Spinner, Stat } from '@/components/ui';
import { dateOnly } from '@/lib/format';

export default function Payments() {
  const money = useMoney();
  const { data = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: meApi.payments });
  const spent = data.filter((p) => p.status === 'SUCCEEDED' && p.type !== 'PAYOUT').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="container-page space-y-6">
      <h1 className="page-title">Payments</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Total paid" value={money(spent)} />
        <Stat label="Transactions" value={data.length} />
      </div>
      {isLoading ? <Spinner /> : data.length === 0 ? <Empty title="No payments yet" /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left dark:bg-slate-800">
              <tr>{['Date', 'Booking', 'Type', 'Method', 'Status', 'Amount'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">{dateOnly(p.createdAt)}</td>
                  <td className="px-4 py-3">{p.bookingId ? `#${p.bookingId}` : '—'}</td>
                  <td className="px-4 py-3">{p.type.toLowerCase()}</td>
                  <td className="px-4 py-3">{p.method.replace('_', ' ').toLowerCase()}</td>
                  <td className="px-4 py-3"><Badge color={p.status === 'SUCCEEDED' ? 'green' : p.status === 'FAILED' ? 'red' : 'amber'}>{p.status.toLowerCase()}</Badge></td>
                  <td className="px-4 py-3 font-medium">{money(p.amount, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
