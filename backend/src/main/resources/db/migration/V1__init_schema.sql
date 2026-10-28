-- SkillConnect core schema
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ===================== Identity =====================
CREATE TABLE roles (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE           -- CUSTOMER | INSTRUCTOR | ADMIN
);

CREATE TABLE users (
    id                 BIGSERIAL PRIMARY KEY,
    email              VARCHAR(255) NOT NULL UNIQUE,
    password_hash      VARCHAR(255),           -- null for social-only accounts
    full_name          VARCHAR(150) NOT NULL,
    age                INT CHECK (age IS NULL OR age BETWEEN 3 AND 120),
    gender             VARCHAR(20),
    phone              VARCHAR(30),
    avatar_url         VARCHAR(500),
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    auth_provider      VARCHAR(20) NOT NULL DEFAULT 'LOCAL',   -- LOCAL | GOOGLE | FACEBOOK
    provider_id        VARCHAR(255),
    enabled            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- ===================== Instructors =====================
CREATE TABLE instructors (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    headline            VARCHAR(200),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED | SUSPENDED
    rating_avg          NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count        INT NOT NULL DEFAULT 0,
    service_radius_km   INT NOT NULL DEFAULT 10,
    time_zone           VARCHAR(50) NOT NULL DEFAULT 'UTC',   -- availability times are interpreted in this zone
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE instructor_profiles (
    id                  BIGSERIAL PRIMARY KEY,
    instructor_id       BIGINT NOT NULL UNIQUE REFERENCES instructors(id) ON DELETE CASCADE,
    bio                 TEXT,
    experience_years    INT,
    experience          TEXT,
    education           TEXT,
    languages           VARCHAR(500),          -- comma separated ISO codes
    teaching_methods    TEXT,
    service_description TEXT
);

CREATE TABLE documents (
    id            BIGSERIAL PRIMARY KEY,
    instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    doc_type      VARCHAR(30) NOT NULL,        -- CERTIFICATION | IDENTITY
    file_name     VARCHAR(255) NOT NULL,
    file_url      VARCHAR(500) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== Catalog =====================
CREATE TABLE categories (
    id     BIGSERIAL PRIMARY KEY,
    name   VARCHAR(100) NOT NULL,
    slug   VARCHAR(100) NOT NULL UNIQUE,
    icon   VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE subjects (
    id          BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id),
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE age_groups (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(20) NOT NULL UNIQUE,
    label      VARCHAR(50) NOT NULL,
    min_age    INT NOT NULL,
    max_age    INT,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE services (
    id                     BIGSERIAL PRIMARY KEY,
    instructor_id          BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    category_id            BIGINT NOT NULL REFERENCES categories(id),
    subject_id             BIGINT REFERENCES subjects(id),
    age_group_id           BIGINT REFERENCES age_groups(id),
    name                   VARCHAR(150) NOT NULL,
    description            TEXT,
    delivery_mode          VARCHAR(20) NOT NULL,           -- ONLINE | IN_PERSON | BOTH
    pricing_type           VARCHAR(20) NOT NULL,           -- HOURLY | PACKAGE | GROUP
    price                  NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    package_sessions       INT,
    group_price_per_student NUMERIC(10,2),
    duration_options       VARCHAR(100) NOT NULL DEFAULT '60',  -- minutes, comma separated
    max_students           INT NOT NULL DEFAULT 1,
    currency               VARCHAR(3) NOT NULL DEFAULT 'USD',
    active                 BOOLEAN NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_services_search ON services (category_id, age_group_id, delivery_mode, price) WHERE active;

-- ===================== Locations =====================
CREATE TABLE locations (
    id        BIGSERIAL PRIMARY KEY,
    label     VARCHAR(100),
    address   VARCHAR(300),
    city      VARCHAR(100) NOT NULL,
    country   VARCHAR(100),
    latitude  DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL
);
CREATE INDEX idx_locations_city ON locations (lower(city));
CREATE INDEX idx_locations_geo ON locations (latitude, longitude);

CREATE TABLE instructor_locations (
    id            BIGSERIAL PRIMARY KEY,
    instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    location_id   BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (instructor_id, location_id)
);

-- ===================== Scheduling =====================
CREATE TABLE availability_slots (
    id            BIGSERIAL PRIMARY KEY,
    instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    slot_type     VARCHAR(20) NOT NULL,        -- RECURRING | ONE_OFF | BLOCKED
    day_of_week   INT CHECK (day_of_week BETWEEN 1 AND 7),  -- ISO: 1 = Monday
    start_time    TIME,
    end_time      TIME,
    start_date    DATE,                        -- ONE_OFF date or BLOCKED range start
    end_date      DATE,                        -- BLOCKED range end (vacation)
    location_id   BIGINT REFERENCES locations(id),
    note          VARCHAR(200)
);
CREATE INDEX idx_availability_instructor ON availability_slots (instructor_id, slot_type);

CREATE TABLE bookings (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT NOT NULL REFERENCES users(id),
    instructor_id       BIGINT NOT NULL REFERENCES instructors(id),
    service_id          BIGINT NOT NULL REFERENCES services(id),
    location_id         BIGINT REFERENCES locations(id),
    start_at            TIMESTAMPTZ NOT NULL,
    end_at              TIMESTAMPTZ NOT NULL,
    duration_minutes    INT NOT NULL,
    participants        INT NOT NULL DEFAULT 1,
    delivery_mode       VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | CONFIRMED | REJECTED | CANCELLED | COMPLETED
    total_price         NUMERIC(10,2) NOT NULL,
    deposit_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
    meeting_url         VARCHAR(500),
    attended            BOOLEAN,
    notes               TEXT,
    cancellation_reason VARCHAR(500),
    reminder_sent       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_at > start_at),
    -- Hard guarantee against double-booking an instructor, even under concurrent requests.
    EXCLUDE USING gist (instructor_id WITH =, tstzrange(start_at, end_at) WITH &&)
        WHERE (status IN ('PENDING', 'CONFIRMED'))
);
CREATE INDEX idx_bookings_customer ON bookings (customer_id, start_at);
CREATE INDEX idx_bookings_instructor ON bookings (instructor_id, start_at);

-- ===================== Money =====================
CREATE TABLE payments (
    id           BIGSERIAL PRIMARY KEY,
    booking_id   BIGINT REFERENCES bookings(id),
    user_id      BIGINT NOT NULL REFERENCES users(id),
    amount       NUMERIC(10,2) NOT NULL,
    currency     VARCHAR(3) NOT NULL DEFAULT 'USD',
    method       VARCHAR(20) NOT NULL,          -- CARD | APPLE_PAY | GOOGLE_PAY | PAYPAL | BANK_TRANSFER
    type         VARCHAR(20) NOT NULL,          -- DEPOSIT | FULL | BALANCE | REFUND | PAYOUT
    status       VARCHAR(20) NOT NULL,          -- PENDING | SUCCEEDED | FAILED | REFUNDED
    provider_ref VARCHAR(255),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_user ON payments (user_id, created_at DESC);

CREATE TABLE disputes (
    id          BIGSERIAL PRIMARY KEY,
    booking_id  BIGINT NOT NULL REFERENCES bookings(id),
    raised_by   BIGINT NOT NULL REFERENCES users(id),
    reason      TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN | RESOLVED | REJECTED
    resolution  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== Social =====================
CREATE TABLE reviews (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT NOT NULL UNIQUE REFERENCES bookings(id),
    customer_id         BIGINT NOT NULL REFERENCES users(id),
    instructor_id       BIGINT NOT NULL REFERENCES instructors(id),
    rating              INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment             TEXT,
    instructor_response TEXT,
    response_at         TIMESTAMPTZ,
    status              VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED', -- PUBLISHED | FLAGGED | HIDDEN
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_instructor ON reviews (instructor_id, created_at DESC);

CREATE TABLE messages (
    id           BIGSERIAL PRIMARY KEY,
    sender_id    BIGINT NOT NULL REFERENCES users(id),
    recipient_id BIGINT NOT NULL REFERENCES users(id),
    content      TEXT NOT NULL,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_pair ON messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at);

CREATE TABLE notifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(40) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       TEXT,
    link       VARCHAR(300),
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

CREATE TABLE favorites (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instructor_id BIGINT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, instructor_id)
);
