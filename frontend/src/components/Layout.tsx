import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, CalendarDays, LogOut, Map, Menu, MessageSquare, Moon, Search, Settings, Sun, X } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { notificationApi } from '@/api/endpoints';
import { useRealtimeConnection } from '@/hooks/useRealtime';
import { Avatar, Button } from './ui';
import AssistantWidget from './AssistantWidget';

export default function Layout() {
  useRealtimeConnection();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AssistantWidget />
    </div>
  );
}

function Navbar() {
  const { user, hasRole, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unread = 0 } = useQuery({ queryKey: ['unread'], queryFn: notificationApi.unread, enabled: !!user, refetchInterval: 60_000 });

  const dashboard = hasRole('ADMIN') ? '/admin' : hasRole('INSTRUCTOR') ? '/instructor' : '/dashboard';
  const links = [
    { to: '/search', label: 'Explore', icon: Search },
    { to: '/map', label: 'Map', icon: Map },
    ...(user
      ? [
          { to: '/messages', label: 'Messages', icon: MessageSquare },
          { to: '/calendar', label: 'Calendar', icon: CalendarDays },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-brand-600">
          <span className="rounded-lg bg-brand-600 px-2 py-0.5 text-white">S</span>SkillConnect
        </Link>
        <div className="ml-6 hidden gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => clsx('rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-900')}>
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button aria-label="Toggle theme" onClick={toggle} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user ? (
            <>
              <Link to="/notifications" aria-label="Notifications" className="relative rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Bell className="h-5 w-5" />
                {unread > 0 && <span className="absolute right-1 top-1 rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-white">{unread}</span>}
              </Link>
              <Link to={dashboard} className="hidden items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 hover:shadow md:flex dark:border-slate-700">
                <Avatar src={user.avatarUrl} name={user.fullName} size={30} />
                <span className="text-sm font-medium">{user.fullName.split(' ')[0]}</span>
              </Link>
              <Link to="/settings" aria-label="Settings" className="hidden rounded-lg p-2 hover:bg-slate-100 md:block dark:hover:bg-slate-800"><Settings className="h-5 w-5" /></Link>
              <button aria-label="Log out" onClick={() => { logout(); navigate('/'); }} className="hidden rounded-lg p-2 hover:bg-slate-100 md:block dark:hover:bg-slate-800"><LogOut className="h-5 w-5" /></button>
            </>
          ) : (
            <div className="hidden gap-2 md:flex">
              <Button variant="ghost" onClick={() => navigate('/login')}>Log in</Button>
              <Button onClick={() => navigate('/register')}>Sign up</Button>
            </div>
          )}
          <button aria-label="Menu" className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="space-y-1 border-t border-slate-200 p-4 md:hidden dark:border-slate-800" onClick={() => setOpen(false)}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              <l.icon className="h-4 w-4" /> {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to={dashboard} className="block rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">Dashboard</Link>
              <Link to="/settings" className="block rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">Settings</Link>
              <button onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800">Log out</button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => navigate('/login')}>Log in</Button>
              <Button className="flex-1" onClick={() => navigate('/register')}>Sign up</Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 md:flex-row">
        <p>© {new Date().getFullYear()} SkillConnect</p>
        <div className="flex gap-4">
          <Link to="/search">Find instructors</Link>
          <Link to="/register?role=INSTRUCTOR">Become an instructor</Link>
        </div>
      </div>
    </footer>
  );
}
