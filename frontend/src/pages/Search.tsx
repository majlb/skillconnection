import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Map, SlidersHorizontal } from 'lucide-react';
import { searchApi } from '@/api/endpoints';
import type { SearchParams } from '@/api/types';
import InstructorCard from '@/components/InstructorCard';
import SearchFilters from '@/components/SearchFilters';
import { Button, Empty, Select, Spinner } from '@/components/ui';

const NUMERIC = ['categoryId', 'subjectId', 'ageGroupId', 'minPrice', 'maxPrice', 'minRating', 'lat', 'lng', 'radiusKm', 'page', 'size'];

export function paramsFromUrl(sp: URLSearchParams): SearchParams {
  const out: Record<string, unknown> = {};
  sp.forEach((v, k) => { out[k] = NUMERIC.includes(k) ? Number(v) : v; });
  return out as SearchParams;
}

export function paramsToUrl(p: SearchParams) {
  const sp = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== '' && sp.set(k, String(v)));
  return sp;
}

export default function Search() {
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => paramsFromUrl(sp), [sp]);
  const [showFilters, setShowFilters] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['search', params], queryFn: () => searchApi.search(params) });

  const update = (p: SearchParams) => setSp(paramsToUrl(p));
  const page = params.page ?? 0;
  const pages = data ? Math.ceil(data.totalElements / data.size) : 0;

  return (
    <div className="container-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Find your instructor</h1>
          {data && <p className="text-sm text-slate-500">{data.totalElements} instructors found</p>}
        </div>
        <div className="flex gap-2">
          <Select value={params.sort ?? ''} onChange={(e) => update({ ...params, sort: e.target.value || undefined })} className="w-44">
            <option value="">Best match</option>
            <option value="rating">Highest rated</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </Select>
          <Button variant="secondary" className="lg:hidden" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="h-4 w-4" /></Button>
          <Link to={`/map?${sp}`}><Button variant="secondary"><Map className="h-4 w-4" /> Map</Button></Link>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <SearchFilters value={params} onChange={update} />
        </aside>
        <section>
          {isLoading ? <Spinner /> : !data?.content.length ? (
            <Empty title="No instructors match your filters">Try removing a filter or searching online lessons.</Empty>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-2">{data.content.map((i) => <InstructorCard key={i.id} i={i} />)}</div>
              {pages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button variant="secondary" disabled={page === 0} onClick={() => update({ ...params, page: page - 1 })}>Previous</Button>
                  <span className="text-sm text-slate-500">Page {page + 1} of {pages}</span>
                  <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => update({ ...params, page: page + 1 })}>Next</Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
