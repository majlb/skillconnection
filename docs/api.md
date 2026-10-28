# REST API

Base path `/api`. JSON in/out; errors use RFC 7807 `application/problem+json` (`{status, title, detail}`).
Interactive docs: `http://localhost:8080/swagger-ui.html`.

Legend — **Auth**: `–` public · `U` any signed-in user · `I` instructor · `A` admin.

## Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | – | `{email, password, fullName, role: CUSTOMER\|INSTRUCTOR, phone?}` → tokens + user |
| POST | `/auth/login` | – | `{email, password}` → `{accessToken, refreshToken, expiresIn, user}` |
| POST | `/auth/refresh` | – | `{refreshToken}` → new token pair |
| GET | `/auth/me` | U | Current user |
| GET | `/oauth2/authorization/{google\|facebook}` | – | Starts social login (browser redirect, outside `/api`) |

## Catalog & search
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/catalog/categories` | – | Active categories |
| GET | `/catalog/subjects?categoryId=` | – | Subjects |
| GET | `/catalog/age-groups` | – | Age groups |
| GET | `/search` | – | Query: `q, categoryId, subjectId, ageGroupId, city, mode, minPrice, maxPrice, minRating, lat, lng, radiusKm, sort (rating\|price_asc\|price_desc\|distance), page, size` |
| GET | `/instructors/{id}` | – | Public profile incl. services |
| GET | `/instructors/{id}/services` | – | Active offerings |
| GET | `/instructors/{id}/locations` | – | Teaching locations |
| GET | `/instructors/{id}/reviews?page=` | – | Published reviews |
| GET | `/instructors/{id}/availability?serviceId&from&to&duration` | – | Bookable slots (UTC) |
| GET | `/files/avatars/{name}` | – | Avatar image |

## Bookings (customer side)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/bookings/quote` | U | `{serviceId, durationMinutes, participants}` → price breakdown, deposit |
| POST | `/bookings` | U | `{serviceId, startAt, durationMinutes, participants, deliveryMode, locationId?, notes?, paymentMethod, paymentToken?, payDepositOnly}` |
| GET | `/bookings?bucket=upcoming\|completed\|cancelled\|all` | U | My bookings as customer |
| GET | `/bookings/{id}` | U | Booking (participant or admin) |
| POST | `/bookings/{id}/cancel` | U | `{reason?}` — refund policy applied |
| POST | `/bookings/{id}/reschedule` | U | `{startAt}` |
| GET | `/bookings/{id}/calendar.ics` | U | iCalendar file (Google / Outlook import) |

## Account
| Method | Path | Auth | Description |
|---|---|---|---|
| PUT | `/me/profile` | U | Name, age, gender, phone, preferred language |
| POST | `/me/avatar` | U | multipart `file` |
| GET | `/me/payments` | U | Payment history |
| GET | `/me/favorites` | U | Favorite instructors |
| PUT / DELETE | `/me/favorites/{instructorId}` | U | Add / remove favorite |
| POST | `/disputes` | U | `{bookingId, reason}` |
| POST | `/reviews` | U | `{bookingId, rating 1-5, comment}` (completed bookings only) |
| POST | `/reviews/{id}/flag` | U | Report a review |

## Messaging & notifications
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/messages/conversations` | U | Latest message per partner |
| GET | `/messages/{partnerId}` | U | Thread (marks as read) |
| POST | `/messages` | U | `{recipientId, content}` — also pushed via WebSocket |
| GET | `/notifications?page=` | U | Inbox |
| GET | `/notifications/unread-count` | U | Badge count |
| POST | `/notifications/{id}/read`, `/notifications/read-all` | U | Mark read |
| WS | `/ws` (STOMP) | U | Subscribe `/user/queue/messages`, `/user/queue/notifications`; send `Authorization: Bearer` in CONNECT |

## Instructor
| Method | Path | Auth | Description |
|---|---|---|---|
| GET / PUT | `/instructor/profile` | I | Bio, experience, education, languages, methods, radius, time zone |
| GET / POST | `/instructor/services` | I | List / create offering |
| PUT / DELETE | `/instructor/services/{id}` | I | Update / deactivate |
| GET / POST | `/instructor/locations` | I | List / add location |
| DELETE | `/instructor/locations/{id}` | I | Remove |
| GET / POST | `/instructor/availability` | I | Rules (RECURRING / ONE_OFF / BLOCKED) |
| DELETE | `/instructor/availability/{id}` | I | Remove rule |
| GET | `/instructor/availability/insights` | I | AI availability optimisation |
| GET / POST | `/instructor/documents` | I | List / upload (`type`, `file`) |
| GET | `/instructor/bookings?bucket=pending\|upcoming\|completed\|cancelled\|all` | I | Bookings |
| POST | `/instructor/bookings/{id}/accept` | I | Confirm (+ meeting link for online) |
| POST | `/instructor/bookings/{id}/reject` | I | `{reason?}` — full refund |
| POST | `/instructor/bookings/{id}/attendance` | I | `{attended}` → COMPLETED, balance charge, payout |
| POST | `/instructor/reviews/{id}/reply` | I | `{response}` |
| GET | `/instructor/earnings` | I | Revenue, sessions, status breakdown, payouts |

## AI
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/ai/recommendations` | U | Personalised instructors |
| GET | `/ai/price-suggestion?categoryId&ageGroupId` | – | Market-based hourly price |
| POST | `/ai/assistant` | – | `{message}` → reply, extracted filters, results |

## Admin
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/stats` | A | Users, instructors, bookings, revenue |
| GET | `/admin/reports` | A | Most booked, revenue by category, customer growth, booking trends |
| GET | `/admin/instructors?status=` | A | Approval queue |
| GET | `/admin/instructors/{id}/documents` | A | Documents |
| GET | `/admin/documents/{id}/file` | A | Download document |
| POST | `/admin/instructors/{id}/verification?status=` | A | APPROVED / REJECTED / SUSPENDED |
| POST | `/admin/users/{id}/enabled?enabled=` | A | Enable / disable account |
| GET / POST / PUT | `/admin/categories[/{id}]` | A | Manage categories |
| POST / PUT / DELETE | `/admin/age-groups[/{id}]` | A | Manage age groups |
| GET | `/admin/reviews?status=` | A | Moderation queue |
| POST | `/admin/reviews/{id}/status?status=` | A | Publish / hide |
| GET | `/admin/disputes?status=` | A | Disputes |
| POST | `/admin/disputes/{id}/resolve` | A | `{status, resolution}` |
| GET | `/admin/payments?status=` | A | Payments |
| POST | `/admin/payments/{id}/settle` | A | Mark payout as paid |
