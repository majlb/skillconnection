# Booking Workflow

## End-to-end flow

```mermaid
flowchart TD
    A[Customer searches<br/>list or map] --> B[Select instructor]
    B --> C[View profile, services, reviews]
    C --> D{Signed in?}
    D -- no --> L[Login / register / social] --> E
    D -- yes --> E[Booking wizard]
    E --> E1[1. Service · duration · participants · online/in-person]
    E1 --> E2[2. Pick date & time<br/>GET /instructors/:id/availability]
    E2 --> E3[3. Location (in-person) + notes]
    E3 --> E4[4. Live quote POST /bookings/quote<br/>choose payment & deposit]
    E4 --> F[POST /bookings]
    F --> G{Slot still free?<br/>availability rules + exclusion constraint}
    G -- no --> E2
    G -- yes --> H[Charge deposit or full amount]
    H -- failed --> E4
    H -- ok --> I[Booking PENDING<br/>notify instructor]
    I --> J{Instructor decision}
    J -- accept --> K[CONFIRMED<br/>meeting link if online<br/>notify customer · email · SMS]
    J -- reject --> R[REJECTED<br/>full refund]
    K --> M[Reminder 24h before]
    K --> X{Changes?}
    X -- customer reschedules --> I
    X -- instructor reschedules --> K
    X -- cancel ≥24h or by instructor --> C1[CANCELLED · full refund]
    X -- customer cancels <24h --> C2[CANCELLED · deposit retained]
    M --> N[Session happens]
    N --> O[Instructor marks attendance]
    O --> P[COMPLETED<br/>charge balance · record payout]
    P --> Q[Customer reviews · instructor responds]
```

## Booking state machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: customer books + pays
    PENDING --> CONFIRMED: instructor accepts
    PENDING --> REJECTED: instructor declines (refund)
    PENDING --> CANCELLED: either party cancels (refund)
    CONFIRMED --> PENDING: customer reschedules
    CONFIRMED --> CONFIRMED: instructor reschedules
    CONFIRMED --> CANCELLED: cancel (policy-based refund)
    CONFIRMED --> COMPLETED: attendance recorded
    COMPLETED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
```

## Server-side sequence for `POST /api/bookings`

```mermaid
sequenceDiagram
    participant C as Customer SPA
    participant B as BookingService
    participant A as AvailabilityService
    participant P as PricingService
    participant DB as PostgreSQL
    participant G as PaymentGateway
    participant N as NotificationService

    C->>B: CreateBookingRequest
    B->>B: validate service active, instructor approved, mode, location
    B->>P: quote(service, duration, participants)
    B->>A: isBookable(instructor, start, end)
    A->>DB: rules + overlapping bookings
    B->>DB: INSERT booking (PENDING) + flush
    Note over DB: GiST exclusion rejects races → 409
    B->>G: charge(deposit | full)
    G-->>B: providerRef
    B->>DB: INSERT payment
    B->>N: notify instructor (WS push + email)
    B-->>C: 201 BookingDto
```

## Pricing rules

| Type | Formula |
|---|---|
| Hourly | `price × minutes / 60` |
| Package | `price` (flat, covers `packageSessions` sessions) |
| Group | `(groupPricePerStudent ?? price) × minutes / 60 × participants` (≤ `maxStudents`) |
| Deposit | `total × app.payments.default-deposit-percent` (default 20 %) |
| Platform fee | `total × app.payments.platform-fee-percent` (default 15 %) deducted from instructor payout |
