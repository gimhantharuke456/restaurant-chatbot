"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AUTH_COOKIE, COOKIE_MAX_AGE } from "@/lib/cookie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tab = "login" | "register";

const CUISINE_OPTIONS = [
  "Sri Lankan", "Japanese", "Italian", "Indian", "Chinese", "Thai", "Seafood", "BBQ",
  "Burger", "Pizza", "Sushi", "Vegetarian", "Mediterranean", "French", "Mexican",
];
const LANGUAGE_OPTIONS = ["English", "Sinhala", "Tamil"];
const BUDGET_OPTIONS = [
  { value: "BUDGET", label: "Budget" },
  { value: "MODERATE", label: "Moderate" },
  { value: "EXPENSIVE", label: "Expensive" },
  { value: "FINE_DINING", label: "Fine Dining" },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [budgetPreference, setBudgetPreference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const toggleCuisine = (c: string) => {
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  function handleForgotPassword() {
    setResetEmail(email);
    setShowResetDialog(true);
  }

  async function handleSendReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
      setShowResetDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
      setShowResetDialog(false);
    } finally {
      setLoading(false);
    }
  }

  async function setTokenAndRedirect(token: string) {
    document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    const meRes = await fetch("/api/proxy/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = meRes.ok ? (await meRes.json()) as { role: string } : null;
    if (me?.role === "SYSTEM_ADMIN") router.push("/admin");
    else if (me?.role === "RESTAURANT_ADMIN") router.push("/restaurant");
    else router.push("/home");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      await setTokenAndRedirect(token);
    } catch (err) {
      setError(
        err instanceof Error && (err as { code?: string }).code === "auth/invalid-credential"
          ? "Invalid email or password"
          : err instanceof Error
          ? err.message
          : "Sign-in failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      await fetch("/api/proxy/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firebaseUid: cred.user.uid,
          email,
          name,
          phone: phone || undefined,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
          preferredLanguage: preferredLanguage || undefined,
          cuisines: cuisines.length ? cuisines : undefined,
          budgetPreference: budgetPreference || undefined,
        }),
      });
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const token = await cred.user.getIdToken();
      document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      await fetch("/api/proxy/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firebaseUid: cred.user.uid,
          email: cred.user.email,
          name: cred.user.displayName,
        }),
      });
      await setTokenAndRedirect(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowResetDialog(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg space-y-4" onClick={e => e.stopPropagation()}>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Reset your password</h2>
              <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
            </div>
            <form onSubmit={handleSendReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  autoFocus
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowResetDialog(false)} disabled={loading}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Restaurant Chatbot</h1>
          <p className="text-sm text-muted-foreground">Discover &amp; book restaurants in Colombo</p>
        </div>

        <div className="flex rounded-lg bg-muted p-1 text-sm font-medium">
          <button
            className={`flex-1 rounded-md py-1.5 transition-colors ${tab === "login" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setTab("login"); setError(null); }}
          >
            Sign in
          </button>
          <button
            className={`flex-1 rounded-md py-1.5 transition-colors ${tab === "register" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setTab("register"); setError(null); }}
          >
            Register
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {resetSent && <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">Password reset email sent — check your inbox.</p>}
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" type="text" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">Password</Label>
              <Input id="reg-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-phone">Phone number</Label>
              <Input id="reg-phone" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+94 77 000 0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reg-dob">Date of birth</Label>
                <Input id="reg-dob" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-lang">Preferred language</Label>
                <select
                  id="reg-lang"
                  value={preferredLanguage}
                  onChange={e => setPreferredLanguage(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select</option>
                  {LANGUAGE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred cuisines</Label>
              <div className="flex flex-wrap gap-1.5">
                {CUISINE_OPTIONS.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleCuisine(c)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                      cuisines.includes(c)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-budget">Budget preference</Label>
              <select
                id="reg-budget"
                value={budgetPreference}
                onChange={e => setBudgetPreference(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">No preference</option>
                {BUDGET_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-card px-2">or</span></div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
