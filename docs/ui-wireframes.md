# Responsive UI Wireframes

Design language: Airbnb-style cards and generous whitespace, Upwork-style dashboards, Preply-style tutor profiles.
Tailwind breakpoints: mobile `<640`, tablet `md ≥768`, desktop `lg ≥1024`. Every page supports light and dark mode
(toggle in the header, persisted, respects OS preference on first visit).

## Landing (`/`)
```
Desktop                                                     Mobile
┌──────────────────────────────────────────────────────┐   ┌──────────────────┐
│ [S]SkillConnect  Explore  Map        ☾  Log in [Sign up]│ │ [S]SkillConnect ☾≡│
├──────────────────────────────────────────────────────┤   ├──────────────────┤
│  Learn anything. From anyone. Anywhere.               │   │ Learn anything.  │
│  ┌───────────────────────┬──────────────────┬──────┐  │   │ ┌──────────────┐ │
│  │ 🔍 What to learn?      │ 📍 City or online │Search│  │   │ │🔍 What?      │ │
│  └───────────────────────┴──────────────────┴──────┘  │   │ │📍 Where?     │ │
├──────────────────────────────────────────────────────┤   │ │ [ Search ]   │ │
│ Browse categories                                     │   │ └──────────────┘ │
│ [📘School][🌐Lang][🎵Music][🏋Sports][🎨Art][💻Code]   │   │ [📘][🌐]          │
│ [📋Exams][🎓Uni][🤝Special][🎯Coach][🏠Home][💼Consult] │   │ [🎵][🏋] (2 cols) │
├──────────────────────────────────────────────────────┤   ├──────────────────┤
│ Recommended for you / Top-rated (2-col cards)         │   │ cards (1 col)    │
│ How it works: Find · Book · Learn & review            │   │ steps stacked    │
│ [ Teach on SkillConnect → Become an instructor ]      │   │                  │
└──────────────────────────────────────────────────────┘   └──────────────────┘
                                         (floating 🤖 assistant button on all pages)
```

## Search results (`/search`)
```
┌──────────────┬────────────────────────────────────────────┐
│ FILTERS      │ Find your instructor   [Sort ▾] [⚙] [🗺 Map] │
│ Keyword      │ 128 instructors found                       │
│ Category ▾   │ ┌───────────────────┐ ┌───────────────────┐ │
│ Subject ▾    │ │(◯) Jane D. ✓  $20 │ │(◯) Omar K. ✓  $25 │ │
│ Age group ▾  │ │ Math tutor        │ │ IELTS coach       │ │
│ Online/In ▾  │ │ ★4.9(87) 📍Boston │ │ ★4.8(40) Online   │ │
│ City         │ │ [Math][Physics]   │ │ [Languages]       │ │
│ Price min/max│ └───────────────────┘ └───────────────────┘ │
│ Rating ▾     │            ‹ Prev  Page 1/7  Next ›          │
└──────────────┴────────────────────────────────────────────┘
Mobile: filters collapse behind ⚙ button; cards single column.
```

## Map search (`/map`)
```
┌────────────┬──────────────────────────────┬───────────────┐
│ Filters    │  [📍 Near me]                 │ 23 providers  │
│ Distance ▾ │        (  ◉ radius circle  ) │ within 10 km  │
│ (2–50 km)  │     📍     📍                 │ [compact card]│
│            │         📍   📍  ← click =    │ [compact card]│
│            │                 info window  │ [compact card]│
└────────────┴──────────────────────────────┴───────────────┘
Mobile: map on top (55vh), list below; filters via list page.
```

## Instructor profile (`/instructors/:id`)
```
┌──────────────────────────────────────────┬─────────────────┐
│ (◯◯) Jane Doe ✓      [♡] [💬 Message]     │ Lessons from    │
│ Certified math tutor · ★4.9 (87) · 📍Boston│ $20             │
├──────────────────────────────────────────┤ [Check avail.]  │
│ About …                                  ├─────────────────┤
│ [🎓 Education] [🌐 Languages]             │  mini map with   │
│ [👥 Methods]   [⏱ Experience]            │  locations +     │
│ Services                                 │  service radius  │
│ ┌ Mathematics · 11-14 · Online   $20 [Book]│ (sticky)        │
│ ┌ Physics · 15-18 · In person    $30 [Book]│                 │
│ Reviews ★★★★★ "Great…"  ↳ Instructor reply│                 │
└──────────────────────────────────────────┴─────────────────┘
```

## Booking wizard (`/book/:instructorId`)
```
[1 Service]─[2 Date & time]─[3 Location]─[4 Review & pay]
┌──────────────────────────────────────┬───────────────────┐
│ Step 2: ‹  Oct 24 – Oct 30  ›          │ SUMMARY           │
│ MON  TUE  WED  THU  FRI  SAT  SUN      │ Service  Math     │
│ 9:00 9:00  —   14:00 9:00 10:00  —    │ Type     Online   │
│ 9:30 [10:00]   14:30 …                │ Duration 60 min   │
│ …                                      │ When  Tue 10:00   │
│                                        │ $20/h × 1 h       │
│                       [Back] [Continue]│ Total     $20.00  │
└──────────────────────────────────────┴───────────────────┘
Step 4: payment tiles [Card][Apple Pay][Google Pay][PayPal] · ☐ pay deposit only · [Confirm & pay $20]
```

## Customer dashboard (`/dashboard`)
```
Hi, Alex                         [💬 Messages] [🔔 Notifications] [💳 Payments]
[Upcoming] [Completed] [Cancelled] [Favorite instructors]
┌ Mathematics  (confirmed)                                     $20 ┐
│ with Jane D. · Tue 10:00 · 60 min · Online                       │
│ [▶ Join] [💬 Message] [📅 Calendar] Reschedule  Cancel           │
└──────────────────────────────────────────────────────────────────┘
```

## Instructor dashboard (`/instructor/*`)
```
┌──────────────────┬───────────────────────────────────────────────┐
│ Overview & earn. │ ⚠ Awaiting verification banner (until approved) │
│ Bookings         │ [$ Gross][$ Net][✓ Completed][↗ Upcoming]       │
│ Services         │ ▁▃▅▇ Monthly revenue bar chart                   │
│ Availability     │ Booking stats       │ Payout history            │
│ Locations        │ Upcoming classes (Accept / Decline / Attended)  │
│ Reviews          │                                                 │
│ Profile & verif. │                                                 │
└──────────────────┴───────────────────────────────────────────────┘
Availability: 7-column weekly grid of time chips + form (recurring / one-off / block vacation) + 💡 AI insights.
Locations: Google map (click to drop pin, radius circle) + address form with geocoding.
Mobile: side nav becomes a horizontally scrollable tab bar.
```

## Admin (`/admin`)
```
[Overview & reports][Instructor approvals][Categories & age groups][Review moderation][Disputes][Payments]
Overview: 4 KPI tiles · booking trends line · customer growth line · revenue by category bars · top instructors list
Approvals: status pills → instructor card + [Documents] [Approve] [Reject] / [Suspend]
```

## Messages (`/messages/:partnerId`)
```
┌─────────────────┬──────────────────────────────────────┐
│ Messages        │ (◯) Jane Doe                         │
│ (◯) Jane   2m   │            ┌───────────────┐          │
│  See you Tue!   │            │ Hi! Is Tue ok?│ 10:02    │
│ (◯) Omar   1d   │ ┌────────────────┐                    │
│                 │ │ Yes, see you!   │ 10:03             │
│                 │ [ Write a message…           ] [➤]   │
└─────────────────┴──────────────────────────────────────┘
Mobile: list and thread are separate screens with a back arrow.
```

## Other pages
* **Notifications** — inbox list (unread highlighted), "Mark all read", "Enable push" (browser Notification API).
* **Calendar** — month grid (customer sessions blue, teaching sessions green), day agenda with booking cards; `.ics` export per booking.
* **Payments** — totals + transaction table (date, booking, type, method, status, amount).
* **Settings** — avatar upload, name/age/gender/phone/language, appearance toggle.
