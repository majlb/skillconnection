import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Search, Trash2 } from 'lucide-react';
import { instructorApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import MapView from '@/components/MapView';
import { Badge, Button, Card, ErrorText, Field, Input } from '@/components/ui';

export default function Locations() {
  const qc = useQueryClient();
  const { data: locations = [] } = useQuery({ queryKey: ['my-locations'], queryFn: instructorApi.locations });
  const { data: profile } = useQuery({ queryKey: ['my-instructor-profile'], queryFn: instructorApi.profile });
  const [pin, setPin] = useState<google.maps.LatLngLiteral | null>(null);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [primary, setPrimary] = useState(false);
  const [geoError, setGeoError] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['my-locations'] });
    qc.invalidateQueries({ queryKey: ['my-instructor-profile'] });
  };
  const add = useMutation({
    mutationFn: () => instructorApi.addLocation({ label, address, city, country, latitude: pin!.lat, longitude: pin!.lng, primary }),
    onSuccess: () => { refresh(); setPin(null); setLabel(''); setAddress(''); },
  });
  const remove = useMutation({ mutationFn: instructorApi.removeLocation, onSuccess: refresh });

  function geocode() {
    setGeoError('');
    if (!window.google?.maps) return setGeoError('Maps not loaded');
    new google.maps.Geocoder().geocode({ address: `${address}, ${city}, ${country}` }, (res, status) => {
      if (status !== 'OK' || !res?.[0]) return setGeoError('Address not found — click on the map instead.');
      const loc = res[0].geometry.location;
      setPin({ lat: loc.lat(), lng: loc.lng() });
    });
  }

  const center = pin ?? (locations[0] ? { lat: locations[0].latitude, lng: locations[0].longitude } : { lat: 40.7128, lng: -74.006 });
  const submit = (e: FormEvent) => { e.preventDefault(); add.mutate(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Teaching locations</h1>
        <p className="text-sm text-slate-500">Service radius: <b>{profile?.serviceRadiusKm ?? 10} km</b> (edit under Profile). Click the map to drop a pin.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="h-[420px]">
          <MapView center={center} radiusKm={profile?.serviceRadiusKm} onClick={setPin}
            points={[
              ...locations.map((l) => ({ id: l.id, lat: l.latitude, lng: l.longitude, title: l.label ?? l.city })),
              ...(pin ? [{ id: 'new', lat: pin.lat, lng: pin.lng, title: 'New location' }] : []),
            ]} />
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Label"><Input maxLength={100} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Downtown studio" /></Field>
            <Field label="Address"><Input maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="City"><Input required value={city} onChange={(e) => setCity(e.target.value)} /></Field>
              <Field label="Country"><Input value={country} onChange={(e) => setCountry(e.target.value)} /></Field>
            </div>
            <Button type="button" variant="secondary" onClick={geocode}><Search className="h-4 w-4" /> Find on map</Button>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Primary location</label>
            {pin && <p className="text-xs text-slate-500">Pin: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</p>}
            <ErrorText>{geoError || (add.isError && errorMessage(add.error))}</ErrorText>
            <Button type="submit" disabled={!pin || !city} loading={add.isPending}><MapPin className="h-4 w-4" /> Save location</Button>
          </form>
        </Card>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {locations.map((l) => (
          <Card key={l.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{l.label ?? l.city} {l.primary && <Badge color="blue">primary</Badge>}</p>
              <p className="text-sm text-slate-500">{[l.address, l.city, l.country].filter(Boolean).join(', ')}</p>
            </div>
            <button aria-label="Remove" onClick={() => remove.mutate(l.id)}><Trash2 className="h-4 w-4 text-slate-500" /></button>
          </Card>
        ))}
      </div>
    </div>
  );
}
