import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, Moon, Sun } from 'lucide-react';
import { meApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Avatar, Button, Card, ErrorText, Field, Input, Select } from '@/components/ui';

const LANGUAGES = [['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['ar', 'العربية'], ['pt', 'Português']];

export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, toggle } = useTheme();
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '', age: user?.age?.toString() ?? '', gender: user?.gender ?? '',
    phone: user?.phone ?? '', preferredLanguage: user?.preferredLanguage ?? 'en',
  });

  const save = useMutation({
    mutationFn: () => meApi.updateProfile({ ...form, age: form.age ? Number(form.age) : undefined }),
    onSuccess: setUser,
  });
  const avatar = useMutation({ mutationFn: meApi.uploadAvatar, onSuccess: setUser });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };
  if (!user) return null;

  return (
    <div className="container-page max-w-3xl space-y-6">
      <h1 className="page-title">Settings</h1>
      <Card>
        <div className="mb-6 flex items-center gap-4">
          <Avatar src={user.avatarUrl} name={user.fullName} size={72} />
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"><Camera className="h-4 w-4" /> Change photo</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && avatar.mutate(e.target.files[0])} />
          </label>
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input required maxLength={150} value={form.fullName} onChange={set('fullName')} /></Field>
          <Field label="Email"><Input value={user.email} disabled /></Field>
          <Field label="Age"><Input type="number" min={3} max={120} value={form.age} onChange={set('age')} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={set('gender')}>
              <option value="">Prefer not to say</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option>
            </Select>
          </Field>
          <Field label="Phone"><Input type="tel" maxLength={30} value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Preferred language">
            <Select value={form.preferredLanguage} onChange={set('preferredLanguage')}>
              {LANGUAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2"><ErrorText>{(save.isError && errorMessage(save.error)) || (avatar.isError && errorMessage(avatar.error))}</ErrorText></div>
          <div><Button type="submit" loading={save.isPending}>{save.isSuccess ? 'Saved' : 'Save changes'}</Button></div>
        </form>
      </Card>
      <Card className="flex items-center justify-between">
        <div><p className="font-medium">Appearance</p><p className="text-sm text-slate-500">Currently using {theme} mode</p></div>
        <Button variant="secondary" onClick={toggle}>{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} Switch to {theme === 'dark' ? 'light' : 'dark'}</Button>
      </Card>
    </div>
  );
}
