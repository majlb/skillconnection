export type Role = 'CUSTOMER' | 'INSTRUCTOR' | 'ADMIN';
export type DeliveryMode = 'ONLINE' | 'IN_PERSON' | 'BOTH';
export type PricingType = 'HOURLY' | 'PACKAGE' | 'GROUP';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type PaymentMethod = 'CARD' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'PAYPAL';
export type SlotType = 'RECURRING' | 'ONE_OFF' | 'BLOCKED';

export interface User {
  id: number;
  email: string;
  fullName: string;
  age?: number;
  gender?: string;
  phone?: string;
  avatarUrl?: string;
  preferredLanguage: string;
  roles: Role[];
  instructorId?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface Category { id: number; name: string; slug: string; icon?: string; active: boolean }
export interface Subject { id: number; categoryId: number; name: string; slug: string }
export interface AgeGroup { id: number; code: string; label: string; minAge: number; maxAge?: number; sortOrder: number }

export interface Location {
  id: number;
  label?: string;
  address?: string;
  city: string;
  country?: string;
  latitude: number;
  longitude: number;
  primary: boolean;
}

export interface ServiceOffering {
  id: number;
  instructorId: number;
  categoryId: number;
  categoryName: string;
  subjectId?: number;
  subjectName?: string;
  ageGroupId?: number;
  ageGroupLabel?: string;
  name: string;
  description?: string;
  deliveryMode: DeliveryMode;
  pricingType: PricingType;
  price: number;
  packageSessions?: number;
  groupPricePerStudent?: number;
  durationOptions: number[];
  maxStudents: number;
  currency: string;
  active: boolean;
}

export interface InstructorSummary {
  id: number;
  userId: number;
  fullName: string;
  avatarUrl?: string;
  headline?: string;
  ratingAvg: number;
  ratingCount: number;
  minPrice?: number;
  categories: string[];
  deliveryModes: DeliveryMode[];
  locations: Location[];
  distanceKm?: number;
  verified: boolean;
}

export interface InstructorDetail {
  summary: InstructorSummary;
  bio?: string;
  experienceYears?: number;
  experience?: string;
  education?: string;
  languages: string[];
  teachingMethods?: string;
  serviceDescription?: string;
  serviceRadiusKm: number;
  timeZone: string;
  services: ServiceOffering[];
}

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number }

export interface SearchParams {
  q?: string;
  categoryId?: number;
  subjectId?: number;
  ageGroupId?: number;
  city?: string;
  mode?: DeliveryMode;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: string;
  page?: number;
  size?: number;
}

export interface TimeSlot { start: string; end: string }

export interface Quote {
  unitPrice: number;
  pricingType: PricingType;
  durationMinutes: number;
  participants: number;
  total: number;
  deposit: number;
  currency: string;
  breakdown: string;
}

export interface Booking {
  id: number;
  serviceId: number;
  serviceName: string;
  instructorId: number;
  instructorUserId: number;
  instructorName: string;
  customerId: number;
  customerName: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  participants: number;
  deliveryMode: DeliveryMode;
  status: BookingStatus;
  totalPrice: number;
  depositAmount: number;
  currency: string;
  meetingUrl?: string;
  location?: Location;
  attended?: boolean;
  notes?: string;
  cancellationReason?: string;
}

export interface Payment {
  id: number;
  bookingId?: number;
  amount: number;
  currency: string;
  method: PaymentMethod | 'BANK_TRANSFER';
  type: 'DEPOSIT' | 'FULL' | 'BALANCE' | 'REFUND' | 'PAYOUT';
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

export interface Review {
  id: number;
  bookingId: number;
  instructorId: number;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment?: string;
  instructorResponse?: string;
  responseAt?: string;
  status: 'PUBLISHED' | 'FLAGGED' | 'HIDDEN';
  createdAt: string;
}

export interface Message { id: number; senderId: number; recipientId: number; content: string; createdAt: string; readAt?: string }
export interface Conversation { partnerId: number; partnerName: string; partnerAvatar?: string; lastMessage: string; lastAt: string; unread: boolean }
export interface Notification { id: number; type: string; title: string; body?: string; link?: string; read: boolean; createdAt: string }

export interface AvailabilitySlot {
  id: number;
  slotType: SlotType;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  locationId?: number;
  note?: string;
}

export interface ReportRow { label: string; value: number; amount: number }

export interface Earnings {
  grossRevenue: number;
  netRevenue: number;
  completedSessions: number;
  upcomingSessions: number;
  monthly: ReportRow[];
  statusBreakdown: ReportRow[];
  payouts: Payment[];
}

export interface AdminStats { totalUsers: number; totalInstructors: number; pendingInstructors: number; totalBookings: number; totalRevenue: number }
export interface Dispute { id: number; bookingId: number; raisedBy: string; reason: string; status: string; resolution?: string; createdAt: string }
export interface DocumentInfo { id: number; docType: 'CERTIFICATION' | 'IDENTITY'; fileName: string; status: string; createdAt: string }
export interface AssistantResponse { reply: string; filters: Record<string, unknown>; results: InstructorSummary[] }
export interface PriceSuggestion { min?: number; median?: number; max?: number; suggested: number; sampleSize: number }
