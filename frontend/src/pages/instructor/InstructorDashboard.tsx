import { NavLink, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { AlertTriangle, BarChart3, BookOpen, CalendarClock, ClipboardList, MapPin, Star, UserCog } from 'lucide-react';
import { instructorApi } from '@/api/endpoints';
import Overview from './Overview';
import Bookings from './Bookings';
import Services from './Services';
import Availability from './Availability';
import Locations from './Locations';
import ProfileSettings from './ProfileSettings';
import Reviews from './Reviews';

const NAV = [
  { to: '', label: 'Overview & earnings', icon: BarChart3 },
  { to: 'bookings', label: 'Bookings', icon: ClipboardList },
  { to: 'services', label: 'Services', icon: BookOpen },
  { to: 'availability', label: 'Availability', icon: CalendarClock },
  { to: 'locations', label: 'Locations', icon: MapPin },
  { to: 'reviews', label: 'Reviews', icon: Star },
  { to: 'profile', label: 'Profile & verification', icon: UserCog },
];

export default function InstructorDashboard() {
  const { data: profile } = useQuery({ queryKey: ['my-instructor-profile'], queryFn: instructorApi.profile });

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end
            className={({ isActive }) => clsx('flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium',
              isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}>
            <n.icon className="h-4 w-4" /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0 space-y-6">
        {profile && !profile.summary.verified && (
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Your profile is awaiting verification. Upload your ID and certificates under <b>Profile & verification</b>; you'll appear in search once approved.</p>
          </div>
        )}
        <Routes>
          <Route index element={<Overview />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="services" element={<Services />} />
          <Route path="availability" element={<Availability />} />
          <Route path="locations" element={<Locations />} />
          <Route path="reviews" element={<Reviews instructorId={profile?.summary.id} />} />
          <Route path="profile" element={<ProfileSettings />} />
        </Routes>
      </div>
    </div>
  );
}
