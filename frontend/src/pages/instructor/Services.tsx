import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { catalogApi, instructorApi, searchApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { useMoney } from '@/context/CurrencyContext';
import type { DeliveryMode, PricingType, ServiceOffering } from '@/api/types';
import { Badge, Button, Card, Empty, ErrorText, Field, Input, Select, Textarea } from '@/components/ui';
import { modeLabel } from '@/lib/format';

interface Form {
  name: string; description: string; categoryId: number | ''; subjectId: number | ''; ageGroupId: number | '';
  deliveryMode: DeliveryMode; pricingType: PricingType; price: string; packageSessions: string;
  groupPricePerStudent: string; durationOptions: string; maxStudents: string; active: boolean;
}

const EMPTY: Form = {
  name: '', description: '', categoryId: '', subjectId: '', ageGroupId: '', deliveryMode: 'ONLINE', pricingType: 'HOURLY',
  price: '', packageSessions: '', groupPricePerStudent: '', durationOptions: '60', maxStudents: '1', active: true,
};

const toForm = (s: ServiceOffering): Form => ({
  name: s.name, description: s.description ?? '', categoryId: s.categoryId, subjectId: s.subjectId ?? '', ageGroupId: s.ageGroupId ?? '',
  deliveryMode: s.deliveryMode, pricingType: s.pricingType, price: String(s.price), packageSessions: String(s.packageSessions ?? ''),
  groupPricePerStudent: String(s.groupPricePerStudent ?? ''), durationOptions: s.durationOptions.join(','), maxStudents: String(s.maxStudents), active: s.active,
});

export default function Services() {
  const money = useMoney();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [f, setF] = useState<Form>(EMPTY);
  const { data: services = [] } = useQuery({ queryKey: ['my-services'], queryFn: instructorApi.services });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const { data: ageGroups = [] } = useQuery({ queryKey: ['ageGroups'], queryFn: catalogApi.ageGroups, staleTime: Infinity });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects', f.categoryId], queryFn: () => catalogApi.subjects(Number(f.categoryId)), enabled: !!f.categoryId });
  const { data: suggestion } = useQuery({
    queryKey: ['price-suggestion', f.categoryId, f.ageGroupId],
    queryFn: () => searchApi.priceSuggestion(Number(f.categoryId), f.ageGroupId ? Number(f.ageGroupId) : undefined),
    enabled: !!f.categoryId && editing !== null,
  });

  const save = useMutation({
    mutationFn: () => instructorApi.saveService({
      name: f.name, description: f.description || null, categoryId: Number(f.categoryId),
      subjectId: f.subjectId ? Number(f.subjectId) : null, ageGroupId: f.ageGroupId ? Number(f.ageGroupId) : null,
      deliveryMode: f.deliveryMode, pricingType: f.pricingType, price: Number(f.price),
      packageSessions: f.packageSessions ? Number(f.packageSessions) : null,
      groupPricePerStudent: f.groupPricePerStudent ? Number(f.groupPricePerStudent) : null,
      durationOptions: f.durationOptions.split(',').map((d) => Number(d.trim())).filter(Boolean),
      maxStudents: Number(f.maxStudents) || 1, active: f.active,
    }, editing === 'new' ? undefined : editing ?? undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-services'] }); setEditing(null); },
  });
  const remove = useMutation({ mutationFn: instructorApi.deleteService, onSuccess: () => qc.invalidateQueries({ queryKey: ['my-services'] }) });

  const set = (patch: Partial<Form>) => setF({ ...f, ...patch });
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Services</h1>
        <Button onClick={() => { setF(EMPTY); setEditing('new'); }}><Plus className="h-4 w-4" /> New service</Button>
      </div>

      {editing !== null && (
        <Card>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Field label="Name"><Input required maxLength={150} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Mathematics" /></Field>
            <Field label="Category">
              <Select required value={f.categoryId} onChange={(e) => set({ categoryId: Number(e.target.value), subjectId: '' })}>
                <option value="" disabled>Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Subject (optional)">
              <Select value={f.subjectId} onChange={(e) => set({ subjectId: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">—</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Age group">
              <Select value={f.ageGroupId} onChange={(e) => set({ ageGroupId: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">All ages</option>
                {ageGroups.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </Select>
            </Field>
            <Field label="Delivery">
              <Select value={f.deliveryMode} onChange={(e) => set({ deliveryMode: e.target.value as DeliveryMode })}>
                {Object.entries(modeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Pricing">
              <Select value={f.pricingType} onChange={(e) => set({ pricingType: e.target.value as PricingType })}>
                <option value="HOURLY">Hourly</option>
                <option value="PACKAGE">Package</option>
                <option value="GROUP">Group session</option>
              </Select>
            </Field>
            <Field label={f.pricingType === 'PACKAGE' ? 'Package price' : 'Price per hour'}
              hint={suggestion ? `AI suggestion: ${money(suggestion.suggested)}/h${suggestion.sampleSize ? ` (median ${money(suggestion.median)} from ${suggestion.sampleSize} offers)` : ''}` : undefined}>
              <div className="flex gap-2">
                <Input required type="number" min={0} step="0.01" value={f.price} onChange={(e) => set({ price: e.target.value })} />
                {suggestion && <Button type="button" variant="secondary" title="Use suggestion" onClick={() => set({ price: String(suggestion.suggested) })}><Sparkles className="h-4 w-4" /></Button>}
              </div>
            </Field>
            {f.pricingType === 'PACKAGE' && (
              <Field label="Sessions in package"><Input required type="number" min={1} value={f.packageSessions} onChange={(e) => set({ packageSessions: e.target.value })} /></Field>
            )}
            {f.pricingType === 'GROUP' && (
              <Field label="Price per student / hour"><Input type="number" min={0} step="0.01" value={f.groupPricePerStudent} onChange={(e) => set({ groupPricePerStudent: e.target.value })} /></Field>
            )}
            <Field label="Duration options (minutes, comma separated)"><Input required pattern="^\s*\d+(\s*,\s*\d+)*\s*$" value={f.durationOptions} onChange={(e) => set({ durationOptions: e.target.value })} /></Field>
            <Field label="Max students"><Input type="number" min={1} max={100} value={f.maxStudents} onChange={(e) => set({ maxStudents: e.target.value })} /></Field>
            <div className="md:col-span-2">
              <Field label="Description"><Textarea maxLength={5000} value={f.description} onChange={(e) => set({ description: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} /> Active (visible to customers)</label>
            <div className="md:col-span-2"><ErrorText>{save.isError && errorMessage(save.error)}</ErrorText></div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" loading={save.isPending}>Save</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {services.length === 0 ? <Empty title="No services yet">Create your first offering, e.g. "Mathematics · 11-14 years · $20/h".</Empty> : (
        <div className="grid gap-3 xl:grid-cols-2">
          {services.map((s) => (
            <Card key={s.id} className={s.active ? '' : 'opacity-60'}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{s.categoryName}</Badge>
                    {s.ageGroupLabel && <Badge color="blue">{s.ageGroupLabel}</Badge>}
                    <Badge color="green">{modeLabel[s.deliveryMode]}</Badge>
                    {!s.active && <Badge color="red">inactive</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{s.durationOptions.join('/')} min · max {s.maxStudents} · {s.pricingType.toLowerCase()}</p>
                </div>
                <p className="text-lg font-bold">{money(s.price, s.currency)}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => { setF(toForm(s)); setEditing(s.id); }}><Pencil className="h-4 w-4" /> Edit</Button>
                {s.active && <Button variant="ghost" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4" /> Deactivate</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
