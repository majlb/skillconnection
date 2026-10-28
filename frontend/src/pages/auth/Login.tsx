import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, ErrorText, Field, Input } from '@/components/ui';
import { SocialButtons, safeNext } from './shared';

const OAUTH_ERRORS: Record<string, string> = {
  email_required: 'Your social account did not share an email address.',
  account_disabled: 'This account has been disabled.',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(OAUTH_ERRORS[sp.get('error') ?? ''] ?? '');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(email, password);
      const home = u.roles.includes('ADMIN') ? '/admin' : u.roles.includes('INSTRUCTOR') ? '/instructor' : '/dashboard';
      navigate(safeNext(sp.get('next'), home), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-page flex justify-center">
      <Card className="w-full max-w-md space-y-5 p-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <SocialButtons />
        <div className="flex items-center gap-3 text-xs text-slate-400"><hr className="flex-1 dark:border-slate-700" />or<hr className="flex-1 dark:border-slate-700" /></div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email"><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password"><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" loading={busy} className="w-full">Log in</Button>
        </form>
        <p className="text-center text-sm text-slate-500">New here? <Link to="/register" className="font-medium text-brand-600">Create an account</Link></p>
      </Card>
    </div>
  );
}
