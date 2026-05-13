# Phase 02 — Config Layer

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement task-by-task.

**Goal:** Initialize all third-party SDK clients (Firebase Admin, Nodemailer, Stripe) as singleton exports so every module can import them without re-initializing.

**Architecture:** Each config file exports a ready-to-use client/helper. Firebase exports both `adminAuth` and `adminFirestore`. Nodemailer exports the transporter and a `sendEmail` convenience function. Stripe exports the configured client.

**Tech Stack:** firebase-admin, nodemailer, stripe, dotenv

**Prerequisites:** Phase 01 (foundation). `.env` must have all required values (see `.env.example`).

---

## Files

| Action | Path |
|--------|------|
| Create | `src/config/firebase.ts` |
| Create | `src/config/nodemailer.ts` |
| Create | `src/config/stripe.ts` |

---

## Task 1: Firebase Admin config

**File:** `src/config/firebase.ts`

- [ ] Create the file

```typescript
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
export default admin;
```

- [ ] Commit

```bash
git add src/config/firebase.ts
git commit -m "feat: add Firebase Admin config"
```

---

## Task 2: Nodemailer config

**File:** `src/config/nodemailer.ts`

- [ ] Create the file

```typescript
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
): Promise<void> => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};
```

- [ ] Commit

```bash
git add src/config/nodemailer.ts
git commit -m "feat: add Nodemailer config with sendEmail helper"
```

---

## Task 3: Stripe config

**File:** `src/config/stripe.ts`

- [ ] Create the file

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});
```

- [ ] Verify the installed Stripe package's expected API version

```bash
node -e "const Stripe = require('stripe'); console.log(Stripe.LATEST_API_VERSION)"
# update apiVersion above if output differs
```

- [ ] Commit

```bash
git add src/config/stripe.ts
git commit -m "feat: add Stripe config"
```
