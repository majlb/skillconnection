import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Monitor } from 'lucide-react';
import { useMoney } from '@/context/CurrencyContext';
import type { InstructorSummary } from '@/api/types';
import { Avatar, Badge, Stars } from './ui';

export default function InstructorCard({ i, compact }: { i: InstructorSummary; compact?: boolean }) {
  const money = useMoney();
  const city = i.locations.find((l) => l.primary)?.city ?? i.locations[0]?.city;
  return (
    <Link to={`/instructors/${i.id}`}
      className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card dark:border-slate-800 dark:bg-slate-900">
      <Avatar src={i.avatarUrl} name={i.fullName} size={compact ? 48 : 72} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1 truncate font-semibold group-hover:text-brand-600">
              {i.fullName} {i.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label="Verified" />}
            </h3>
            {i.headline && <p className="truncate text-sm text-slate-500">{i.headline}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-slate-500">from</p>
            <p className="font-bold">{money(i.minPrice)}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Stars value={i.ratingAvg} count={i.ratingCount} />
          {city && <span className="flex items-center gap-1 text-slate-500"><MapPin className="h-3.5 w-3.5" />{city}{i.distanceKm != null && ` · ${i.distanceKm} km`}</span>}
          {i.deliveryModes.some((m) => m !== 'IN_PERSON') && <span className="flex items-center gap-1 text-slate-500"><Monitor className="h-3.5 w-3.5" />Online</span>}
        </div>
        {!compact && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {i.categories.slice(0, 4).map((c) => <Badge key={c}>{c}</Badge>)}
          </div>
        )}
      </div>
    </Link>
  );
}
