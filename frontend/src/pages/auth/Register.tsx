import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { GraduationCap, User } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, ErrorText, Field, Input } from '@/components/ui';
import { SocialButtons } from './shared';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [role, setRole] = useState<'CUSTOMER' | 'INSTRUCTOR'>(sp.get('role') === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'CUSTOMER');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register({ ...form, phone: form.phone || undefined, role });
      navigate(role === 'INSTRUCTOR' ? '/instructor/profile' : '/search', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="container-page flex justify-center">
      <Card className="w-full max-w-md space-y-5 p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <div className="grid grid-cols-2 gap-2">
          {([['CUSTOMER', 'I want to learn', User], ['INSTRUCTOR', 'I want to teach', GraduationCap]] as const).map(([r, label, Icon]) => (
            <button key={r} type="button" onClick={() => setRole(r)}
              className={clsx('flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium', role === r ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-slate-300 dark:border-slate-700')}>
              <Icon className="h-6 w-6" />{label}
            </button>
          ))}
        </div>
        {role === 'CUSTOMER' && (
          <>
            <SocialButtons />
            <div className="flex items-center gap-3 text-xs text-slate-400"><hr className="flex-1 dark:border-slate-700" />or<hr className="flex-1 dark:border-slate-700" /></div>
          </>
        )}
        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name"><Input required maxLength={150} autoComplete="name" value={form.fullName} onChange={set('fullName')} /></Field>
          <Field label="Email"><Input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></Field>
          <Field label="Phone (optional)"><Input type="tel" maxLength={30} autoComplete="tel" value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Password" hint="At least 8 characters with letters and numbers">
            <Input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" loading={busy} className="w-full">{role === 'INSTRUCTOR' ? 'Create instructor account' : 'Sign up'}</Button>
        </form>
        <p className="text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-medium text-brand-600">Log in</Link></p>
      </Card>
    </div>
  );
}
