import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LocateFixed } from 'lucide-react';
import { searchApi } from '@/api/endpoints';
import { useMoney } from '@/context/CurrencyContext';
import InstructorCard from '@/components/InstructorCard';
import MapView, { MapPoint } from '@/components/MapView';
import SearchFilters from '@/components/SearchFilters';
import { Button, Field, Select } from '@/components/ui';
import { paramsFromUrl, paramsToUrl } from './Search';

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };

export default function MapSearch() {
  const money = useMoney();
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => paramsFromUrl(sp), [sp]);
  const [center, setCenter] = useState(
    params.lat && params.lng ? { lat: params.lat, lng: params.lng } : DEFAULT_CENTER,
  );
  const radiusKm = params.radiusKm ?? 10;

  const query = { ...params, lat: center.lat, lng: center.lng, radiusKm, mode: 'IN_PERSON' as const, size: 100, sort: 'distance' };
  const { data } = useQuery({ queryKey: ['map-search', query], queryFn: () => searchApi.search(query) });

  useEffect(() => {
    if (params.lat || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setCenter({ lat: p.coords.latitude, lng: p.coords.longitude }));
  }, [params.lat]);

  const points: MapPoint[] = (data?.content ?? []).flatMap((i) =>
    i.locations.map((l) => ({
      id: `${i.id}-${l.id}`,
      lat: l.latitude,
      lng: l.longitude,
      title: i.fullName,
      content: (
        <Link to={`/instructors/${i.id}`} className="block min-w-[160px]">
          <strong>{i.fullName}</strong>
          <div>★ {Number(i.ratingAvg).toFixed(1)} · from {money(i.minPrice)}</div>
          <div className="text-xs">{l.label ?? l.city}</div>
        </Link>
      ),
    })),
  );

  return (
    <div className="grid h-[calc(100vh-4rem)] lg:grid-cols-[320px_1fr_380px]">
      <aside className="hidden overflow-y-auto border-r border-slate-200 p-4 lg:block dark:border-slate-800">
        <SearchFilters value={params} onChange={(p) => setSp(paramsToUrl({ ...p, lat: center.lat, lng: center.lng, radiusKm }))} />
        <div className="mt-4">
          <Field label="Distance">
            <Select value={radiusKm} onChange={(e) => setSp(paramsToUrl({ ...params, radiusKm: Number(e.target.value) }))}>
              {[2, 5, 10, 25, 50].map((r) => <option key={r} value={r}>Within {r} km</option>)}
            </Select>
          </Field>
        </div>
      </aside>
      <div className="relative h-[55vh] lg:h-full">
        <MapView center={center} points={points} radiusKm={radiusKm} onCenterChanged={(c) => {
          if (Math.abs(c.lat - center.lat) > 0.01 || Math.abs(c.lng - center.lng) > 0.01) setCenter(c);
        }} />
        <Button variant="secondary" className="absolute left-3 top-3 shadow"
          onClick={() => navigator.geolocation?.getCurrentPosition((p) => setCenter({ lat: p.coords.latitude, lng: p.coords.longitude }))}>
          <LocateFixed className="h-4 w-4" /> Near me
        </Button>
      </div>
      <section className="space-y-3 overflow-y-auto p-4">
        <p className="text-sm text-slate-500">{data?.totalElements ?? 0} providers within {radiusKm} km</p>
        {data?.content.map((i) => <InstructorCard key={i.id} i={i} compact />)}
      </section>
    </div>
  );
}
