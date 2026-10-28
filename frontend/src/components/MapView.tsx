import { ReactNode, useState } from 'react';
import { Circle, GoogleMap, InfoWindow, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Spinner } from './ui';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? 'AIzaSyBySZlmxNSn9uyQT5_xOO-FyCvlGw9pcpE';

export interface MapPoint { id: string | number; lat: number; lng: number; title: string; content?: ReactNode }

interface Props {
  center: google.maps.LatLngLiteral;
  points?: MapPoint[];
  radiusKm?: number;
  zoom?: number;
  height?: string;
  onClick?: (p: google.maps.LatLngLiteral) => void;
  onCenterChanged?: (p: google.maps.LatLngLiteral) => void;
}

/** Google Map with markers, optional search radius and click-to-pick support. */
export default function MapView({ center, points = [], radiusKm, zoom = 12, height = '100%', onClick, onCenterChanged }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: KEY, id: 'sc-google-maps' });
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [active, setActive] = useState<MapPoint | null>(null);

  if (!KEY || loadError) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-100 p-6 text-center text-sm text-slate-500 dark:bg-slate-800" style={{ height }}>
        Map unavailable. Set VITE_GOOGLE_MAPS_API_KEY to enable Google Maps.
      </div>
    );
  }
  if (!isLoaded) return <Spinner />;

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height, borderRadius: '1rem' }}
      center={center}
      zoom={zoom}
      onLoad={setMap}
      onIdle={() => {
        const c = map?.getCenter();
        if (c && onCenterChanged) onCenterChanged({ lat: c.lat(), lng: c.lng() });
      }}
      onClick={(e) => e.latLng && onClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
    >
      {radiusKm && <Circle center={center} radius={radiusKm * 1000} options={{ fillColor: '#337dff', fillOpacity: 0.08, strokeColor: '#337dff', strokeWeight: 1 }} />}
      {points.map((p) => (
        <Marker key={p.id} position={{ lat: p.lat, lng: p.lng }} title={p.title} onClick={() => setActive(p)} />
      ))}
      {active && (
        <InfoWindow position={{ lat: active.lat, lng: active.lng }} onCloseClick={() => setActive(null)}>
          <div className="text-slate-900">{active.content ?? active.title}</div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
