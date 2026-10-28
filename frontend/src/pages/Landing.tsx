import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Briefcase, CalendarCheck, ClipboardCheck, Code, Dumbbell, GraduationCap, HeartHandshake, Home,
  Languages, LucideIcon, MapPin, Music, Palette, Search as SearchIcon, ShieldCheck, Star, Target,
} from 'lucide-react';
import { catalogApi, searchApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import InstructorCard from '@/components/InstructorCard';
import { Button } from '@/components/ui';

const ICONS: Record<string, LucideIcon> = {
  'book-open': BookOpen, languages: Languages, music: Music, dumbbell: Dumbbell, palette: Palette, code: Code,
  'clipboard-check': ClipboardCheck, 'graduation-cap': GraduationCap, 'heart-handshake': HeartHandshake,
  target: Target, home: Home, briefcase: Briefcase,
};

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const { data: recommended = [] } = useQuery({ queryKey: ['recommendations'], queryFn: searchApi.recommendations, enabled: !!user });
  const { data: topRated } = useQuery({ queryKey: ['top-rated'], queryFn: () => searchApi.search({ sort: 'rating', size: 6 }) });

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (city) p.set('city', city);
    navigate(`/search?${p}`);
  }

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-rose-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Learn anything. <span className="text-brand-600">From anyone.</span> Anywhere.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Book trusted tutors, coaches and service providers — online or near you — in a few clicks.
          </p>
          <form onSubmit={submit} className="mt-10 flex max-w-3xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl md:flex-row md:rounded-full dark:bg-slate-900">
            <label className="flex flex-1 items-center gap-2 px-4">
              <SearchIcon className="h-5 w-5 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What do you want to learn?" className="w-full bg-transparent py-3 outline-none" />
            </label>
            <label className="flex flex-1 items-center gap-2 border-slate-200 px-4 md:border-l dark:border-slate-700">
              <MapPin className="h-5 w-5 text-slate-400" />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City or online" className="w-full bg-transparent py-3 outline-none" />
            </label>
            <Button type="submit" className="rounded-full px-8">Search</Button>
          </form>
        </div>
      </section>

      <section className="container-page">
        <h2 className="mb-6 text-2xl font-bold">Browse categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => {
            const Icon = ICONS[c.icon ?? ''] ?? BookOpen;
            return (
              <Link key={c.id} to={`/search?categoryId=${c.id}`}
                className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 p-5 text-center transition hover:-translate-y-0.5 hover:shadow-card dark:border-slate-800">
                <Icon className="h-7 w-7 text-brand-600" />
                <span className="text-sm font-medium">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {recommended.length > 0 && (
        <section className="container-page">
          <h2 className="mb-6 text-2xl font-bold">Recommended for you</h2>
          <div className="grid gap-4 md:grid-cols-2">{recommended.map((i) => <InstructorCard key={i.id} i={i} />)}</div>
        </section>
      )}

      {topRated && topRated.content.length > 0 && (
        <section className="container-page">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold">Top-rated instructors</h2>
            <Link to="/search?sort=rating" className="text-sm font-medium text-brand-600">See all</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">{topRated.content.map((i) => <InstructorCard key={i.id} i={i} />)}</div>
        </section>
      )}

      <section className="container-page">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: SearchIcon, title: 'Find', text: 'Filter by subject, age group, price, rating and distance.' },
            { icon: CalendarCheck, title: 'Book', text: 'Pick a slot, see the full price upfront and pay securely.' },
            { icon: Star, title: 'Learn & review', text: 'Join online or in person, then share your experience.' },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-900">
              <s.icon className="h-8 w-8 text-brand-600" />
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-slate-600 dark:text-slate-400">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-slate-900 p-10 text-white md:flex-row md:items-center dark:bg-brand-900">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="h-7 w-7" /> Teach on SkillConnect</h2>
            <p className="mt-2 max-w-xl text-slate-300">Set your own prices and schedule, reach students nearby and online, and get paid reliably.</p>
          </div>
          <Button onClick={() => navigate('/register?role=INSTRUCTOR')} className="bg-white text-slate-900 hover:bg-slate-100">Become an instructor</Button>
        </div>
      </section>
    </>
  );
}
