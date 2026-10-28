import { format, formatDistanceToNow } from 'date-fns';

export const money = (amount?: number | null, currency = 'USD') =>
  amount == null ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);

export const dateTime = (iso: string) => format(new Date(iso), 'EEE, MMM d · HH:mm');
export const dateOnly = (iso: string) => format(new Date(iso), 'MMM d, yyyy');
export const timeOnly = (iso: string) => format(new Date(iso), 'HH:mm');
export const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });
export const isoDate = (d: Date) => format(d, 'yyyy-MM-dd');

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const modeLabel: Record<string, string> = { ONLINE: 'Online', IN_PERSON: 'In person', BOTH: 'Online & in person' };
