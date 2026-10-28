import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCheck2, Upload } from 'lucide-react';
import { instructorApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { Badge, Button, Card, ErrorText, Field, Input, Select, Textarea } from '@/components/ui';
import { dateOnly } from '@/lib/format';

export default function ProfileSettings() {
  const qc = useQueryClient();
  const { data: p } = useQuery({ queryKey: ['my-instructor-profile'], queryFn: instructorApi.profile });
  const { data: docs = [] } = useQuery({ queryKey: ['my-documents'], queryFn: instructorApi.documents });
  const [form, setForm] = useState({
    headline: '', bio: '', experienceYears: '', experience: '', education: '', languages: '',
    teachingMethods: '', serviceDescription: '', serviceRadiusKm: '10', timeZone: 'UTC',
  });
  const [docType, setDocType] = useState<'CERTIFICATION' | 'IDENTITY'>('IDENTITY');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!p) return;
    setForm({
      headline: p.summary.headline ?? '', bio: p.bio ?? '', experienceYears: p.experienceYears?.toString() ?? '',
      experience: p.experience ?? '', education: p.education ?? '', languages: p.languages.join(', '),
      teachingMethods: p.teachingMethods ?? '', serviceDescription: p.serviceDescription ?? '',
      serviceRadiusKm: String(p.serviceRadiusKm), timeZone: p.timeZone,
    });
  }, [p]);

  const save = useMutation({
    mutationFn: () => instructorApi.updateProfile({
      ...form,
      experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
      serviceRadiusKm: Number(form.serviceRadiusKm),
      languages: form.languages.split(',').map((l) => l.trim()).filter(Boolean),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-instructor-profile'] }),
  });
  const upload = useMutation({
    mutationFn: () => instructorApi.uploadDocument(docType, file!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-documents'] }); setFile(null); },
  });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };
  const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  const all = supported ? supported('timeZone') : [];
  const zones = all.includes(form.timeZone) ? all : [form.timeZone, ...all];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Professional profile</h1>
      <Card>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Field label="Headline"><Input maxLength={200} value={form.headline} onChange={set('headline')} placeholder="Certified math tutor with 8 years of experience" /></Field></div>
          <div className="md:col-span-2"><Field label="Biography"><Textarea maxLength={5000} value={form.bio} onChange={set('bio')} /></Field></div>
          <Field label="Years of experience"><Input type="number" min={0} max={80} value={form.experienceYears} onChange={set('experienceYears')} /></Field>
          <Field label="Languages spoken" hint="Comma separated"><Input value={form.languages} onChange={set('languages')} placeholder="English, Spanish" /></Field>
          <Field label="Experience"><Textarea maxLength={5000} value={form.experience} onChange={set('experience')} /></Field>
          <Field label="Education"><Textarea maxLength={5000} value={form.education} onChange={set('education')} /></Field>
          <Field label="Teaching methods"><Textarea maxLength={5000} value={form.teachingMethods} onChange={set('teachingMethods')} /></Field>
          <Field label="Service description"><Textarea maxLength={5000} value={form.serviceDescription} onChange={set('serviceDescription')} /></Field>
          <Field label="Service radius (km)"><Input type="number" min={1} max={200} value={form.serviceRadiusKm} onChange={set('serviceRadiusKm')} /></Field>
          <Field label="Time zone">
            <Select value={form.timeZone} onChange={set('timeZone')}>
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </Select>
          </Field>
          <div className="md:col-span-2"><ErrorText>{save.isError && errorMessage(save.error)}</ErrorText></div>
          <div><Button type="submit" loading={save.isPending}>{save.isSuccess ? 'Saved' : 'Save profile'}</Button></div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Verification documents</h2>
        <p className="mb-4 text-sm text-slate-500">Upload a government ID and any teaching certificates (PDF, JPG or PNG, max 10 MB). Documents are only visible to administrators.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Type">
            <Select value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)}>
              <option value="IDENTITY">Identity document</option>
              <option value="CERTIFICATION">Certification</option>
            </Select>
          </Field>
          <Field label="File"><Input type="file" accept=".pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          <Button disabled={!file} loading={upload.isPending} onClick={() => upload.mutate()}><Upload className="h-4 w-4" /> Upload</Button>
        </div>
        <ErrorText>{upload.isError && errorMessage(upload.error)}</ErrorText>
        <div className="mt-4 space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
              <span className="flex items-center gap-2"><FileCheck2 className="h-4 w-4" />{d.fileName} · {d.docType.toLowerCase()}</span>
              <span className="flex items-center gap-2 text-slate-500">{dateOnly(d.createdAt)} <Badge color={d.status === 'APPROVED' ? 'green' : d.status === 'REJECTED' ? 'red' : 'amber'}>{d.status.toLowerCase()}</Badge></span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
