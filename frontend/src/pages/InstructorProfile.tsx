import { ReactNode, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Clock, GraduationCap, Heart, Languages, MapPin, MessageSquare, Users } from 'lucide-react';
import { instructorPublicApi, meApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { useMoney } from '@/context/CurrencyContext';
import MapView from '@/components/MapView';
import { Avatar, Badge, Button, Card, Spinner, Stars } from '@/components/ui';
import { dateOnly, modeLabel } from '@/lib/format';

export default function InstructorProfile() {
  const money = useMoney();
  const id = Number(useParams().id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reviewPage, setReviewPage] = useState(0);

  const { data, isLoading, isError } = useQuery({ queryKey: ['instructor', id], queryFn: () => instructorPublicApi.get(id) });
  const { data: reviews } = useQuery({ queryKey: ['reviews', id, reviewPage], queryFn: () => instructorPublicApi.reviews(id, reviewPage) });
  const { data: favorites = [] } = useQuery({ queryKey: ['favorites'], queryFn: meApi.favorites, enabled: !!user });
  const isFav = favorites.some((f) => f.id === id);
  const fav = useMutation({
    mutationFn: () => (isFav ? meApi.removeFavorite(id) : meApi.addFavorite(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  if (isLoading) return <Spinner />;
  if (isError || !data) return <div className="container-page">Instructor not found.</div>;
  const s = data.summary;
  const primary = s.locations.find((l) => l.primary) ?? s.locations[0];

  return (
    <div className="container-page grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar src={s.avatarUrl} name={s.fullName} size={112} />
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              {s.fullName} {s.verified && <BadgeCheck className="h-6 w-6 text-brand-600" />}
            </h1>
            {s.headline && <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">{s.headline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <Stars value={s.ratingAvg} count={s.ratingCount} />
              {primary && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{primary.city} · {data.serviceRadiusKm} km radius</span>}
              {data.experienceYears != null && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{data.experienceYears} yrs experience</span>}
            </div>
          </div>
          {user && user.id !== s.userId && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => fav.mutate()} aria-label="Favorite">
                <Heart className={`h-4 w-4 ${isFav ? 'fill-accent-500 text-accent-500' : ''}`} />
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/messages/${s.userId}`)}><MessageSquare className="h-4 w-4" /> Message</Button>
            </div>
          )}
        </div>

        {data.bio && (
          <section>
            <h2 className="mb-2 text-xl font-semibold">About</h2>
            <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">{data.bio}</p>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          {data.education && <Info icon={<GraduationCap className="h-5 w-5" />} title="Education" text={data.education} />}
          {data.languages.length > 0 && <Info icon={<Languages className="h-5 w-5" />} title="Languages" text={data.languages.join(', ')} />}
          {data.teachingMethods && <Info icon={<Users className="h-5 w-5" />} title="Teaching methods" text={data.teachingMethods} />}
          {data.experience && <Info icon={<Clock className="h-5 w-5" />} title="Experience" text={data.experience} />}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Services</h2>
          <div className="space-y-3">
            {data.services.map((svc) => (
              <Card key={svc.id} className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <h3 className="font-semibold">{svc.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{svc.categoryName}</Badge>
                    {svc.ageGroupLabel && <Badge color="blue">{svc.ageGroupLabel}</Badge>}
                    <Badge color="green">{modeLabel[svc.deliveryMode]}</Badge>
                    {svc.pricingType !== 'HOURLY' && <Badge color="amber">{svc.pricingType === 'PACKAGE' ? `${svc.packageSessions}-session package` : `Group up to ${svc.maxStudents}`}</Badge>}
                  </div>
                  {svc.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{svc.description}</p>}
                  <p className="mt-1 text-xs text-slate-500">Durations: {svc.durationOptions.join(' / ')} min</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{money(svc.price, svc.currency)}</p>
                  <p className="text-xs text-slate-500">{svc.pricingType === 'HOURLY' ? 'per hour' : svc.pricingType === 'PACKAGE' ? 'per package' : 'per hour'}</p>
                  <Button className="mt-2" onClick={() => navigate(`/book/${id}?serviceId=${svc.id}`)}>Book</Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Reviews</h2>
          {!reviews?.content.length ? <p className="text-slate-500">No reviews yet.</p> : (
            <div className="space-y-5">
              {reviews.content.map((r) => (
                <div key={r.id} className="border-b border-slate-200 pb-5 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Avatar src={r.customerAvatar} name={r.customerName} size={36} />
                    <div>
                      <p className="font-medium">{r.customerName}</p>
                      <p className="text-xs text-slate-500">{dateOnly(r.createdAt)}</p>
                    </div>
                    <div className="ml-auto"><Stars value={r.rating} /></div>
                  </div>
                  {r.comment && <p className="mt-2 text-slate-700 dark:text-slate-300">{r.comment}</p>}
                  {r.instructorResponse && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                      <p className="font-medium">Response from {s.fullName.split(' ')[0]}</p>
                      <p className="text-slate-600 dark:text-slate-300">{r.instructorResponse}</p>
                    </div>
                  )}
                </div>
              ))}
              {reviews.totalElements > (reviewPage + 1) * reviews.size && (
                <Button variant="secondary" onClick={() => setReviewPage(reviewPage + 1)}>More reviews</Button>
              )}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <p className="text-sm text-slate-500">Lessons from</p>
          <p className="text-3xl font-bold">{money(s.minPrice)}</p>
          <Button className="mt-4 w-full" onClick={() => navigate(`/book/${id}`)}>Check availability</Button>
          {!user && <p className="mt-2 text-center text-xs text-slate-500"><Link to="/login" className="text-brand-600">Log in</Link> to book or message.</p>}
        </Card>
        {s.locations.length > 0 && (
          <Card className="p-2">
            <MapView height="260px" center={{ lat: primary!.latitude, lng: primary!.longitude }} radiusKm={data.serviceRadiusKm} zoom={11}
              points={s.locations.map((l) => ({ id: l.id, lat: l.latitude, lng: l.longitude, title: l.label ?? l.city }))} />
          </Card>
        )}
      </aside>
    </div>
  );
}

function Info({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
      <div className="text-brand-600">{icon}</div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">{text}</p>
      </div>
    </div>
  );
}
