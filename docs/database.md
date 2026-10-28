# Database

PostgreSQL 16. The authoritative DDL is in
[V1__init_schema.sql](../backend/src/main/resources/db/migration/V1__init_schema.sql) and reference data in
[V2__seed_reference_data.sql](../backend/src/main/resources/db/migration/V2__seed_reference_data.sql).

## ERD

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : grants
    USERS ||--o| INSTRUCTORS : "is (optional)"
    INSTRUCTORS ||--|| INSTRUCTOR_PROFILES : describes
    INSTRUCTORS ||--o{ DOCUMENTS : uploads
    INSTRUCTORS ||--o{ SERVICES : offers
    CATEGORIES ||--o{ SUBJECTS : contains
    CATEGORIES ||--o{ SERVICES : classifies
    SUBJECTS ||--o{ SERVICES : "optional subject"
    AGE_GROUPS ||--o{ SERVICES : targets
    INSTRUCTORS ||--o{ INSTRUCTOR_LOCATIONS : "teaches at"
    LOCATIONS ||--o{ INSTRUCTOR_LOCATIONS : ""
    INSTRUCTORS ||--o{ AVAILABILITY_SLOTS : defines
    LOCATIONS ||--o{ AVAILABILITY_SLOTS : "working location"
    USERS ||--o{ BOOKINGS : "books (customer)"
    INSTRUCTORS ||--o{ BOOKINGS : receives
    SERVICES ||--o{ BOOKINGS : "booked as"
    LOCATIONS ||--o{ BOOKINGS : "held at"
    BOOKINGS ||--o{ PAYMENTS : "paid by"
    USERS ||--o{ PAYMENTS : "payer / payee"
    BOOKINGS ||--o| REVIEWS : "reviewed in"
    BOOKINGS ||--o{ DISPUTES : "disputed in"
    USERS ||--o{ MESSAGES : sends
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ FAVORITES : saves
    INSTRUCTORS ||--o{ FAVORITES : "saved as"

    USERS {
        bigint id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        int age
        varchar gender
        varchar phone
        varchar avatar_url
        varchar preferred_language
        varchar auth_provider
        boolean enabled
    }
    INSTRUCTORS {
        bigint id PK
        bigint user_id FK
        varchar headline
        varchar verification_status
        numeric rating_avg
        int rating_count
        int service_radius_km
        varchar time_zone
    }
    INSTRUCTOR_PROFILES {
        bigint id PK
        bigint instructor_id FK
        text bio
        int experience_years
        text education
        varchar languages
        text teaching_methods
    }
    SERVICES {
        bigint id PK
        bigint instructor_id FK
        bigint category_id FK
        bigint subject_id FK
        bigint age_group_id FK
        varchar name
        varchar delivery_mode
        varchar pricing_type
        numeric price
        int package_sessions
        numeric group_price_per_student
        varchar duration_options
        int max_students
    }
    AVAILABILITY_SLOTS {
        bigint id PK
        bigint instructor_id FK
        varchar slot_type
        int day_of_week
        time start_time
        time end_time
        date start_date
        date end_date
    }
    BOOKINGS {
        bigint id PK
        bigint customer_id FK
        bigint instructor_id FK
        bigint service_id FK
        bigint location_id FK
        timestamptz start_at
        timestamptz end_at
        varchar status
        numeric total_price
        numeric deposit_amount
        varchar meeting_url
        boolean attended
    }
    PAYMENTS {
        bigint id PK
        bigint booking_id FK
        bigint user_id FK
        numeric amount
        varchar method
        varchar type
        varchar status
        varchar provider_ref
    }
    REVIEWS {
        bigint id PK
        bigint booking_id FK
        int rating
        text comment
        text instructor_response
        varchar status
    }
    LOCATIONS {
        bigint id PK
        varchar city
        float latitude
        float longitude
    }
```

## Entity notes

| Entity (table) | Purpose |
|---|---|
| Users / Roles (`users`, `roles`, `user_roles`) | Accounts; many-to-many roles. An instructor also has the CUSTOMER role so they can book others. |
| Instructors / InstructorProfiles | Verification status, rating aggregates, radius & time zone / rich profile text. |
| Documents | Certifications and identity documents (private storage). |
| Categories, Subjects, AgeGroups | Admin-managed catalog. 12 categories and 5 age groups seeded. |
| Services (`services`) | Instructor offerings: category, age group, mode, pricing model, durations, capacity. |
| Locations / InstructorLocations | Geocoded addresses; instructors can have several, one primary. |
| AvailabilitySlots | `RECURRING` weekly windows, `ONE_OFF` extra windows, `BLOCKED` vacations/periods. |
| Bookings | Lifecycle `PENDING → CONFIRMED → COMPLETED` (or `REJECTED`/`CANCELLED`); exclusion constraint prevents overlaps. |
| Payments | Ledger rows: `DEPOSIT`, `FULL`, `BALANCE`, `REFUND`, `PAYOUT`. |
| Reviews | One per completed booking, moderation status, instructor response. |
| Messages / Notifications / Favorites | Chat, in-app notification inbox, saved instructors. |
| Disputes | Customer/instructor complaints handled by admins. |

## Indexing & integrity highlights

* `bookings` — `EXCLUDE USING gist (instructor_id WITH =, tstzrange(start_at,end_at) WITH &&) WHERE status IN ('PENDING','CONFIRMED')`.
* `idx_services_search` partial index on active services for the most common filter combination.
* `idx_locations_geo` for bounding-box search; `lower(city)` functional index.
* `idx_messages_pair` on `(LEAST(sender,recipient), GREATEST(sender,recipient), created_at)` for thread reads.
* `CHECK` constraints on ratings (1–5), prices (≥ 0), ages, `end_at > start_at`.
