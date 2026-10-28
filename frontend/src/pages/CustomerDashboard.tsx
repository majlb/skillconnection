import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, CreditCard, MessageSquare } from 'lucide-react';
import { bookingApi, meApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import BookingCard from '@/components/BookingCard';
import InstructorCard from '@/components/InstructorCard';
import { Button, Empty, Spinner, Tabs } from '@/components/ui';

type Tab = 'upcoming' | 'completed' | 'cancelled' | 'favorites';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('upcoming');
  const bookings = useQuery({ queryKey: ['bookings', tab], queryFn: () => bookingApi.mine(tab), enabled: tab !== 'favorites' });
  const favorites = useQuery({ queryKey: ['favorites'], queryFn: meApi.favorites, enabled: tab === 'favorites' });

  return (
    <div className="container-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Hi, {user?.fullName.split(' ')[0]}</h1>
          <p className="text-slate-500">Manage your lessons and services.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/messages"><Button variant="secondary"><MessageSquare className="h-4 w-4" /> Messages</Button></Link>
          <Link to="/notifications"><Button variant="secondary"><Bell className="h-4 w-4" /> Notifications</Button></Link>
          <Link to="/payments"><Button variant="secondary"><CreditCard className="h-4 w-4" /> Payments</Button></Link>
        </div>
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'upcoming', label: 'Upcoming' },
        { id: 'completed', label: 'Completed' },
        { id: 'cancelled', label: 'Cancelled' },
        { id: 'favorites', label: 'Favorite instructors' },
      ]} />

      <div className="mt-6 space-y-4">
        {tab === 'favorites' ? (
          favorites.isLoading ? <Spinner /> : !favorites.data?.length ? <Empty title="No favorites yet">Tap the heart on an instructor profile.</Empty> : (
            <div className="grid gap-4 md:grid-cols-2">{favorites.data.map((i) => <InstructorCard key={i.id} i={i} />)}</div>
          )
        ) : bookings.isLoading ? <Spinner /> : !bookings.data?.length ? (
          <Empty title={`No ${tab} bookings`}>
            <Link to="/search" className="text-brand-600">Find an instructor</Link>
          </Empty>
        ) : bookings.data.map((b) => <BookingCard key={b.id} b={b} as="customer" />)}
      </div>
    </div>
  );
}
