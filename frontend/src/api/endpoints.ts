import { api } from './client';
import type * as T from './types';

const get = <R>(url: string, params?: object) => api.get<R>(url, { params }).then((r) => r.data);
const post = <R>(url: string, body?: unknown, params?: object) => api.post<R>(url, body, { params }).then((r) => r.data);
const put = <R>(url: string, body?: unknown) => api.put<R>(url, body).then((r) => r.data);
const del = (url: string) => api.delete(url).then(() => undefined);
const upload = <R>(url: string, form: FormData) => api.post<R>(url, form).then((r) => r.data);

export const authApi = {
  login: (email: string, password: string) => post<T.AuthResponse>('/auth/login', { email, password }),
  register: (body: { email: string; password: string; fullName: string; role: 'CUSTOMER' | 'INSTRUCTOR'; phone?: string }) =>
    post<T.AuthResponse>('/auth/register', body),
  me: () => get<T.User>('/auth/me'),
};

export const catalogApi = {
  categories: () => get<T.Category[]>('/catalog/categories'),
  subjects: (categoryId?: number) => get<T.Subject[]>('/catalog/subjects', { categoryId }),
  ageGroups: () => get<T.AgeGroup[]>('/catalog/age-groups'),
};

export const searchApi = {
  search: (params: T.SearchParams) => get<T.Page<T.InstructorSummary>>('/search', params),
  assistant: (message: string) => post<T.AssistantResponse>('/ai/assistant', { message }),
  recommendations: () => get<T.InstructorSummary[]>('/ai/recommendations'),
  priceSuggestion: (categoryId: number, ageGroupId?: number) =>
    get<T.PriceSuggestion>('/ai/price-suggestion', { categoryId, ageGroupId }),
};

export const instructorPublicApi = {
  get: (id: number) => get<T.InstructorDetail>(`/instructors/${id}`),
  services: (id: number) => get<T.ServiceOffering[]>(`/instructors/${id}/services`),
  locations: (id: number) => get<T.Location[]>(`/instructors/${id}/locations`),
  reviews: (id: number, page = 0) => get<T.Page<T.Review>>(`/instructors/${id}/reviews`, { page }),
  availability: (id: number, p: { serviceId?: number; from: string; to: string; duration?: number }) =>
    get<T.TimeSlot[]>(`/instructors/${id}/availability`, p),
};

export const bookingApi = {
  quote: (serviceId: number, durationMinutes: number, participants = 1) =>
    post<T.Quote>('/bookings/quote', { serviceId, durationMinutes, participants }),
  create: (body: {
    serviceId: number; startAt: string; durationMinutes: number; participants: number;
    deliveryMode: T.DeliveryMode; locationId?: number; notes?: string;
    paymentMethod: T.PaymentMethod; paymentToken?: string; payDepositOnly: boolean;
  }) => post<T.Booking>('/bookings', body),
  mine: (bucket: string) => get<T.Booking[]>('/bookings', { bucket }),
  get: (id: number) => get<T.Booking>(`/bookings/${id}`),
  cancel: (id: number, reason?: string) => post<T.Booking>(`/bookings/${id}/cancel`, { reason }),
  reschedule: (id: number, startAt: string) => post<T.Booking>(`/bookings/${id}/reschedule`, { startAt }),
  icsUrl: (id: number) => `/bookings/${id}/calendar.ics`,
};

export const meApi = {
  updateProfile: (body: Partial<T.User>) => put<T.User>('/me/profile', body),
  uploadAvatar: (file: File) => {
    const f = new FormData();
    f.append('file', file);
    return upload<T.User>('/me/avatar', f);
  },
  payments: () => get<T.Payment[]>('/me/payments'),
  favorites: () => get<T.InstructorSummary[]>('/me/favorites'),
  addFavorite: (instructorId: number) => put<void>(`/me/favorites/${instructorId}`),
  removeFavorite: (instructorId: number) => del(`/me/favorites/${instructorId}`),
  review: (bookingId: number, rating: number, comment: string) => post<T.Review>('/reviews', { bookingId, rating, comment }),
  dispute: (bookingId: number, reason: string) => post<T.Dispute>('/disputes', { bookingId, reason }),
};

export const chatApi = {
  conversations: () => get<T.Conversation[]>('/messages/conversations'),
  thread: (partnerId: number) => get<T.Message[]>(`/messages/${partnerId}`),
  send: (recipientId: number, content: string) => post<T.Message>('/messages', { recipientId, content }),
};

export const notificationApi = {
  list: (page = 0) => get<T.Page<T.Notification>>('/notifications', { page }),
  unread: () => get<number>('/notifications/unread-count'),
  read: (id: number) => post<void>(`/notifications/${id}/read`),
  readAll: () => post<void>('/notifications/read-all'),
};

export const instructorApi = {
  profile: () => get<T.InstructorDetail>('/instructor/profile'),
  updateProfile: (body: Record<string, unknown>) => put<T.InstructorDetail>('/instructor/profile', body),
  services: () => get<T.ServiceOffering[]>('/instructor/services'),
  saveService: (body: Record<string, unknown>, id?: number) =>
    id ? put<T.ServiceOffering>(`/instructor/services/${id}`, body) : post<T.ServiceOffering>('/instructor/services', body),
  deleteService: (id: number) => del(`/instructor/services/${id}`),
  locations: () => get<T.Location[]>('/instructor/locations'),
  addLocation: (body: Omit<T.Location, 'id'>) => post<T.Location>('/instructor/locations', body),
  removeLocation: (id: number) => del(`/instructor/locations/${id}`),
  availability: () => get<T.AvailabilitySlot[]>('/instructor/availability'),
  addAvailability: (body: Omit<T.AvailabilitySlot, 'id'>) => post<T.AvailabilitySlot>('/instructor/availability', body),
  removeAvailability: (id: number) => del(`/instructor/availability/${id}`),
  insights: () => get<string[]>('/instructor/availability/insights'),
  documents: () => get<T.DocumentInfo[]>('/instructor/documents'),
  uploadDocument: (type: 'CERTIFICATION' | 'IDENTITY', file: File) => {
    const f = new FormData();
    f.append('type', type);
    f.append('file', file);
    return upload<T.DocumentInfo>('/instructor/documents', f);
  },
  bookings: (bucket: string) => get<T.Booking[]>('/instructor/bookings', { bucket }),
  accept: (id: number) => post<T.Booking>(`/instructor/bookings/${id}/accept`),
  reject: (id: number, reason?: string) => post<T.Booking>(`/instructor/bookings/${id}/reject`, { reason }),
  attendance: (id: number, attended: boolean) => post<T.Booking>(`/instructor/bookings/${id}/attendance`, { attended }),
  reply: (reviewId: number, response: string) => post<T.Review>(`/instructor/reviews/${reviewId}/reply`, { response }),
  earnings: () => get<T.Earnings>('/instructor/earnings'),
};

export const adminApi = {
  stats: () => get<T.AdminStats>('/admin/stats'),
  reports: () => get<Record<string, T.ReportRow[]>>('/admin/reports'),
  instructors: (status: string) => get<T.Page<T.InstructorSummary>>('/admin/instructors', { status }),
  documents: (instructorId: number) => get<T.DocumentInfo[]>(`/admin/instructors/${instructorId}/documents`),
  verify: (id: number, status: string) => post<void>(`/admin/instructors/${id}/verification`, undefined, { status }),
  categories: () => get<T.Category[]>('/admin/categories'),
  saveCategory: (body: Omit<T.Category, 'id'>, id?: number) =>
    id ? put<T.Category>(`/admin/categories/${id}`, body) : post<T.Category>('/admin/categories', body),
  saveAgeGroup: (body: Omit<T.AgeGroup, 'id'>, id?: number) =>
    id ? put<T.AgeGroup>(`/admin/age-groups/${id}`, body) : post<T.AgeGroup>('/admin/age-groups', body),
  deleteAgeGroup: (id: number) => del(`/admin/age-groups/${id}`),
  reviews: (status: string) => get<T.Review[]>('/admin/reviews', { status }),
  moderate: (id: number, status: string) => post<T.Review>(`/admin/reviews/${id}/status`, undefined, { status }),
  disputes: (status: string) => get<T.Dispute[]>('/admin/disputes', { status }),
  resolve: (id: number, status: string, resolution: string) => post<T.Dispute>(`/admin/disputes/${id}/resolve`, { status, resolution }),
  payments: (status: string) => get<T.Payment[]>('/admin/payments', { status }),
  settle: (id: number) => post<T.Payment>(`/admin/payments/${id}/settle`),
};
