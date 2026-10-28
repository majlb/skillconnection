import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/endpoints';
import type { SearchParams } from '@/api/types';
import { Field, Input, Select } from './ui';

/** Shared filter panel for list and map search. Values are kept in the URL by the parent. */
export default function SearchFilters({ value, onChange }: { value: SearchParams; onChange: (p: SearchParams) => void }) {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const { data: ageGroups = [] } = useQuery({ queryKey: ['ageGroups'], queryFn: catalogApi.ageGroups, staleTime: Infinity });
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', value.categoryId],
    queryFn: () => catalogApi.subjects(value.categoryId),
    enabled: !!value.categoryId,
  });

  const set = (patch: Partial<SearchParams>) => onChange({ ...value, ...patch, page: 0 });
  const num = (v: string) => (v === '' ? undefined : Number(v));

  return (
    <div className="space-y-4">
      <Field label="Keyword, subject or instructor">
        <Input defaultValue={value.q} placeholder="e.g. Mathematics" onBlur={(e) => set({ q: e.target.value || undefined })}
          onKeyDown={(e) => e.key === 'Enter' && set({ q: (e.target as HTMLInputElement).value || undefined })} />
      </Field>
      <Field label="Category">
        <Select value={value.categoryId ?? ''} onChange={(e) => set({ categoryId: num(e.target.value), subjectId: undefined })}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      {value.categoryId && subjects.length > 0 && (
        <Field label="Subject">
          <Select value={value.subjectId ?? ''} onChange={(e) => set({ subjectId: num(e.target.value) })}>
            <option value="">All subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Age group">
        <Select value={value.ageGroupId ?? ''} onChange={(e) => set({ ageGroupId: num(e.target.value) })}>
          <option value="">Any age</option>
          {ageGroups.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </Select>
      </Field>
      <Field label="Lesson type">
        <Select value={value.mode ?? ''} onChange={(e) => set({ mode: (e.target.value || undefined) as SearchParams['mode'] })}>
          <option value="">Online or in person</option>
          <option value="ONLINE">Online</option>
          <option value="IN_PERSON">In person</option>
        </Select>
      </Field>
      <Field label="City">
        <Input defaultValue={value.city} placeholder="Any city" onBlur={(e) => set({ city: e.target.value || undefined })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Min price">
          <Input type="number" min={0} defaultValue={value.minPrice} onBlur={(e) => set({ minPrice: num(e.target.value) })} />
        </Field>
        <Field label="Max price">
          <Input type="number" min={0} defaultValue={value.maxPrice} onBlur={(e) => set({ maxPrice: num(e.target.value) })} />
        </Field>
      </div>
      <Field label="Minimum rating">
        <Select value={value.minRating ?? ''} onChange={(e) => set({ minRating: num(e.target.value) })}>
          <option value="">Any</option>
          {[4.5, 4, 3.5, 3].map((r) => <option key={r} value={r}>{r}+ ★</option>)}
        </Select>
      </Field>
    </div>
  );
}
