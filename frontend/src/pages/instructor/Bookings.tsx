import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { instructorApi } from '@/api/endpoints';
import BookingCard from '@/components/BookingCard';
import { Empty, Spinner, Tabs } from '@/components/ui';

type Bucket = 'pending' | 'upcoming' | 'completed' | 'cancelled';

export default function Bookings() {
  const [bucket, setBucket] = useState<Bucket>('pending');
  const { data = [], isLoading } = useQuery({ queryKey: ['instructor-bookings', bucket], queryFn: () => instructorApi.bookings(bucket) });

  return (
    <div className="space-y-4">
      <h1 className="page-title">Bookings</h1>
      <Tabs<Bucket> value={bucket} onChange={setBucket} tabs={[
        { id: 'pending', label: 'Requests' },
        { id: 'upcoming', label: 'Upcoming' },
        { id: 'completed', label: 'Completed' },
        { id: 'cancelled', label: 'Cancelled' },
      ]} />
      {isLoading ? <Spinner /> : data.length === 0 ? <Empty title="Nothing here yet" /> : data.map((b) => <BookingCard key={b.id} b={b} as="instructor" />)}
    </div>
  );
}
