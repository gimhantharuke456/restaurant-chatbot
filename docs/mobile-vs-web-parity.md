# Mobile vs Web Feature Parity

Snapshot comparing the Flutter mobile app against the Next.js web frontend's customer-facing experience.

## Done on mobile

- **Auth**: email/password + Google Sign-In, session persists across restarts via Firebase token refresh — same Firebase project as web (`spare-parts-6c6af`).
- **Restaurant discovery**: search + price-range filter list (`home_screen.dart`), matches web's `(customer)/restaurants` list.
- **Restaurant detail**: cover image, promotions, menu preview, reviews preview — matches web's `restaurants/[id]/page.tsx`, minus the favorite button (see below).
- **AI chat**: native clone of web's `ChatWidget` — markdown replies, restaurant result cards, Stripe payment-link buttons, suggested prompts, session persists across tab switches (web resets on page reload; mobile persists until app restart, an intentional confirmed difference).
- **Booking + payment**: date/time/party → menu/cart → review & pay, same as web's `BookTableDialog`. **Payment mechanism differs**: mobile uses a native Stripe Payment Sheet (`flutter_stripe`, in-app), web redirects to a hosted Stripe Checkout Session page — different mechanism, same Stripe backend, same outcome.
- **Motion/UX polish**: shared animation system (staggered lists, page transitions, skeleton loading, empty states) — web has no direct equivalent to compare against; this is mobile-specific polish.

## Missing on mobile

- **My Reservations list/management** — view/cancel/reschedule upcoming bookings. Web: `(customer)/reservations/page.tsx`, `ReservationList.tsx`, `ReservationCard.tsx`, `ReservationDetailDrawer.tsx`. Mobile's `/reservations` tab is still `ComingSoonScreen`.
- **Reviews — writing** — mobile only shows reviews read-only on restaurant detail; no way to submit/edit one. Web: `ReviewModal.tsx` (opened from `ReservationCard.tsx` post-visit).
- **Favorites** — save/unsave restaurants, dedicated favorites list. Web: `(customer)/favorites/page.tsx`, `FavoriteButton.tsx` (shown on web's restaurant detail page; absent on mobile's).
- **Loyalty / rewards** — points balance, tier, transaction history. Web: `(customer)/loyalty/page.tsx`.
- **Complaints** — file/track complaints with status. Web: `(customer)/complaints/page.tsx`.
- **Waitlist** — join a waitlist when fully booked, see position/status. Web: `(customer)/waitlist/page.tsx`, `WaitlistJoinForm.tsx`.
- **Notifications inbox** — in-app notification list/read state. Web: `(customer)/notifications/page.tsx`, `NotificationsList.tsx`. (Mobile has no push-token registration either — see Notes.)
- **Profile & preferences editing** — edit name/phone/avatar, dietary/cuisine preferences, spending insights card. Web: `(customer)/profile/page.tsx`, `ProfileForm.tsx`, `PreferencesForm.tsx`, `InsightsCard.tsx`. Mobile has no profile/settings screen at all.
- **Payment history** — past payments/receipts list. Web: reachable via profile; backend `GET /payments/history` exists but no mobile screen calls it.
- **Promotions browsing** — mobile only shows a restaurant's own promotions inline on its detail page (already have this); web has the same, so this one's actually at parity — no gap.
- **Guest chat mode** — unauthenticated users get 3 free chat messages before a signup prompt. Web: `GuestChatPopup.tsx` + backend `POST /chat/guest`. Mobile forces login before any tab is reachable, so this was an intentional earlier scope decision, not an oversight — noted here for completeness.
- **"More" tab** — still `ComingSoonScreen`; web has no single equivalent, but this is presumably meant to house profile/settings/loyalty/complaints/waitlist/favorites/notifications once built.

## Admin/restaurant-portal (not in mobile scope)

Mobile has **zero** restaurant-admin or system-admin surface — it's a customer-only app. Web's admin side (out of scope, listed for completeness only):
- **System admin** (`/admin/*`): analytics, restaurant/user/review/complaint/verification management, payment oversight, audit logs, broadcast messaging.
- **Restaurant portal** (`/restaurant/*`): own-restaurant analytics, menu management, availability/holiday calendars, promotions, reservation calendar, reviews replies, an AI business-assistant chat, payment status.

## Notes

- Backend already has working endpoints for several "missing" features mobile doesn't call yet (`GET /payments/history`, reservation CRUD, favorites, notifications, loyalty, complaints, waitlist) — these are wiring gaps on mobile, not missing backend work.
- Web's push notification path (`lib/firebase.ts` messaging setup) has no mobile counterpart; mobile would need FCM device-token registration to support a notifications inbox with push delivery.
- The booking/payment split (native Payment Sheet on mobile vs. Checkout Session redirect on web) is the one place where mobile and web deliberately diverge in *mechanism* while landing on the same Stripe backend and `Payment` records — worth keeping in mind if a future "payment history" screen needs to render both kinds of records consistently.
