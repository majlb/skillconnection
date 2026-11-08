import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, BadgeCheck, BookOpen, Briefcase, CalendarCheck, Check, ClipboardCheck, Code, Dumbbell,
  GraduationCap, HeartHandshake, Home, Languages, LucideIcon, MapPin, Monitor, Music, Palette,
  Search as SearchIcon, ShieldCheck, Sparkles, Star, Target, Users,
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
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-brand-950">
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-600/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 left-1/4 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-500/10" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3 py-1.5 text-sm font-medium text-brand-700 shadow-sm dark:border-brand-800 dark:bg-slate-900/80 dark:text-brand-200">
              <Sparkles className="h-4 w-4" />
              Make room for what’s next
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl md:text-6xl dark:text-white">
              Find your next
              <span className="block text-brand-600 dark:text-brand-400"> great teacher.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Discover skilled tutors, coaches and local experts. Compare your options and book a session that fits your life.
            </p>

            <form onSubmit={submit} className="mt-9 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xl shadow-brand-900/10 dark:border-slate-700 dark:bg-slate-900">
              <div className="grid gap-1 md:grid-cols-[1fr_0.82fr_auto] md:items-center">
                <label className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500">
                  <SearchIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">I’m looking for</span>
                    <input aria-label="What do you want to learn?" value={q} onChange={(e) => setQ(e.target.value)} placeholder="A subject, skill or service" className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-white" />
                  </span>
                </label>
                <label className="flex min-w-0 items-center gap-3 rounded-xl border-t border-slate-100 px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500 md:border-l md:border-t-0 md:border-slate-200 dark:border-slate-800">
                  <MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Where</span>
                    <input aria-label="City or online" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City or online" className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-white" />
                  </span>
                </label>
                <Button type="submit" className="min-h-12 rounded-xl px-6">
                  Find a teacher <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />Online or in person</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />Compare at your pace</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
            <div aria-hidden="true" className="absolute inset-8 rounded-[2.5rem] bg-gradient-to-br from-brand-200 to-indigo-200 opacity-70 blur-2xl dark:from-brand-800 dark:to-indigo-900" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-2xl shadow-brand-950/15 backdrop-blur sm:p-7 dark:border-slate-700 dark:bg-slate-900/90">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Your next step starts here</p>
                  <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Find the right fit</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
                  <BadgeCheck className="h-6 w-6" />
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link to="/search" className="group rounded-2xl bg-brand-50 p-4 transition hover:-translate-y-0.5 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/70">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-600 shadow-sm dark:bg-slate-800 dark:text-brand-300"><BookOpen className="h-5 w-5" /></span>
                  <span className="mt-5 block font-semibold text-slate-900 dark:text-white">Learn a skill</span>
                  <span className="mt-1 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">Explore subjects <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
                </Link>
                <Link to="/map" className="group rounded-2xl bg-indigo-50 p-4 transition hover:-translate-y-0.5 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300"><MapPin className="h-5 w-5" /></span>
                  <span className="mt-5 block font-semibold text-slate-900 dark:text-white">Find nearby</span>
                  <span className="mt-1 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">Explore the map <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              </div>

              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/80">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"><Monitor className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white">Learn your way</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Choose online lessons or meet in person.</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-sm dark:border-slate-800">
                <span className="inline-flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300"><Users className="h-4 w-4 text-brand-600" /> A marketplace built around you</span>
                <Link to="/register?role=INSTRUCTOR" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">Teach <ArrowRight className="inline h-3.5 w-3.5" /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14 md:py-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Explore your interests</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">What would you like to learn?</h2>
          </div>
          <Link to="/search" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">Explore all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => {
            const Icon = ICONS[c.icon ?? ''] ?? BookOpen;
            return (
              <Link key={c.id} to={`/search?categoryId=${c.id}`}
                className="group flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-card dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-950 dark:text-brand-300">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {recommended.length > 0 && (
        <section className="container-page border-t border-slate-100 py-14 dark:border-slate-800">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Picked for you</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Recommended for you</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">{recommended.map((i) => <InstructorCard key={i.id} i={i} />)}</div>
        </section>
      )}

      {topRated && topRated.content.length > 0 && (
        <section className="container-page border-t border-slate-100 py-14 dark:border-slate-800">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">A great place to start</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Top-rated instructors</h2>
            </div>
            <Link to="/search?sort=rating" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">See all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">{topRated.content.map((i) => <InstructorCard key={i.id} i={i} />)}</div>
        </section>
      )}

      <section className="border-y border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="container-page py-14 md:py-16">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">Simple by design</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">From curious to confident</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">A clear, straightforward way to find the support you need.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: SearchIcon, step: '01', title: 'Find your match', text: 'Explore by subject, location, price and the details that matter to you.' },
            { icon: CalendarCheck, step: '02', title: 'Choose your time', text: 'Review availability and pricing, then book a session that works.' },
            { icon: Star, step: '03', title: 'Keep growing', text: 'Meet online or in person and share feedback after your session.' },
          ].map((s) => (
            <div key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-bold tracking-[0.16em] text-brand-600 dark:text-brand-400">{s.step}</span>
              <span className="mt-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"><s.icon className="h-5 w-5" /></span>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 leading-6 text-slate-600 dark:text-slate-400">{s.text}</p>
            </div>
          ))}
          </div>
        </div>
      </section>

      <section className="container-page py-14 md:py-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white sm:px-10 md:flex md:items-center md:justify-between md:gap-8 md:px-12 md:py-12">
          <div aria-hidden="true" className="absolute -right-16 -top-32 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-brand-200"><ShieldCheck className="h-4 w-4" /> For instructors</span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Share what you know. Help someone grow.</h2>
            <p className="mt-3 max-w-xl leading-7 text-slate-300">Create your profile, set your availability and connect with learners looking for your expertise.</p>
          </div>
          <Button onClick={() => navigate('/register?role=INSTRUCTOR')} className="relative mt-7 shrink-0 bg-white text-slate-900 hover:bg-slate-100 md:mt-0">Become an instructor <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </section>
    </>
  );
}
