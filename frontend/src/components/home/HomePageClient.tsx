"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, type Variants } from "framer-motion";
import {
  MessageSquare, CalendarDays, CreditCard, Star, MapPin,
  ArrowRight, Sparkles, ChefHat, Utensils, LocateFixed, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RestaurantItem, MenuItem } from "@/app/(customer)/home/page";

// ── helpers ───────────────────────────────────────────────────────────────────

const PRICE_LABEL: Record<string, string> = {
  BUDGET: "Budget", MODERATE: "Moderate",
  EXPENSIVE: "Expensive", FINE_DINING: "Fine Dining",
};

const CUISINE_EMOJI: Record<string, string> = {
  Japanese: "🍱", Italian: "🍕", Indian: "🍛", Chinese: "🥡",
  Thai: "🍜", "Sri Lankan": "🍲", Seafood: "🦞", BBQ: "🥩",
  Burger: "🍔", Pizza: "🍕", Sushi: "🍣", Vegetarian: "🥗",
  Mediterranean: "🫒", French: "🥐", Mexican: "🌮",
};

const CARD_GRADIENTS = [
  "from-orange-900/60 via-red-950/40 to-transparent",
  "from-purple-900/60 via-indigo-950/40 to-transparent",
  "from-teal-900/60 via-cyan-950/40 to-transparent",
  "from-rose-900/60 via-pink-950/40 to-transparent",
  "from-amber-900/60 via-yellow-950/40 to-transparent",
  "from-green-900/60 via-emerald-950/40 to-transparent",
  "from-blue-900/60 via-sky-950/40 to-transparent",
  "from-violet-900/60 via-purple-950/40 to-transparent",
  "from-red-900/60 via-orange-950/40 to-transparent",
];

function getCuisineEmoji(cuisines: string[]): string {
  for (const c of cuisines) {
    if (CUISINE_EMOJI[c]) return CUISINE_EMOJI[c];
  }
  return "🍽️";
}

// ── animation variants ────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

// ── section wrapper with scroll trigger ──────────────────────────────────────

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── restaurant card ───────────────────────────────────────────────────────────

function RestaurantCard({ r, index }: { r: RestaurantItem; index: number }) {
  const cuisines   = r.cuisineTypes;
  const cardImage  = r.coverImageUrl ?? r.imageUrls[0] ?? null;
  const emoji      = getCuisineEmoji(cuisines);
  const gradient   = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <Link href={`/restaurants/${r.id}`} className="block">
    <motion.div
      variants={cardVariant}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative rounded-2xl overflow-hidden border border-white/10 bg-card cursor-pointer"
    >
      {/* Image / gradient header */}
      <div className="relative h-44 overflow-hidden">
        {cardImage ? (
          <Image src={cardImage} alt={r.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} bg-card`}>
            <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30 select-none">
              {emoji}
            </div>
          </div>
        )}
        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

        {/* price badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-sm text-[10px]">
            {PRICE_LABEL[r.priceRange] ?? r.priceRange}
          </Badge>
        </div>

        {/* profile image or cuisine emoji */}
        {r.profileImageUrl ? (
          <div className="absolute top-3 left-3">
            <div className="relative h-9 w-9 rounded-full overflow-hidden border-2 border-white/60 bg-muted shadow">
              <Image src={r.profileImageUrl} alt={r.name} fill className="object-cover" unoptimized />
            </div>
          </div>
        ) : (
          <div className="absolute top-3 left-3 text-2xl">{emoji}</div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {r.name}
        </h3>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{r.area}</span>
          {r.distanceKm != null && (
            <>
              <span className="mx-1">·</span>
              <span className="text-primary font-medium">{r.distanceKm} km away</span>
            </>
          )}
          {r.avgRating != null && (
            <>
              <span className="mx-1">·</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
              <span className="text-amber-400 font-medium">{r.avgRating.toFixed(1)}</span>
            </>
          )}
        </div>

        {cuisines.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cuisines.slice(0, 3).map((c) => (
              <span key={c} className="rounded-full bg-primary/10 text-primary text-[10px] px-2 py-0.5 font-medium">
                {c}
              </span>
            ))}
          </div>
        )}

        {r.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.description}</p>
        )}
      </div>

      {/* Glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ring-1 ring-primary/40 shadow-[0_0_24px_rgba(255,107,53,0.15)]" />
    </motion.div>
    </Link>
  );
}

// ── how it works step ─────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: MessageSquare,
    color: "from-orange-500 to-red-500",
    title: "Chat with AI",
    desc: "Tell our AI what you're craving — cuisine, budget, occasion. It knows every restaurant in the city.",
  },
  {
    icon: CalendarDays,
    color: "from-violet-500 to-purple-500",
    title: "Reserve a Table",
    desc: "Pick a date and time. The AI checks live availability and locks in your booking instantly.",
  },
  {
    icon: CreditCard,
    color: "from-teal-500 to-cyan-500",
    title: "Pre-order & Pay",
    desc: "Browse the menu, choose your dishes, confirm the bill and pay — all before you arrive.",
  },
];

// ── floating orb ──────────────────────────────────────────────────────────────

function FloatingOrb({ className }: { className: string }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", repeatType: "loop" }}
    />
  );
}

// ── main export ───────────────────────────────────────────────────────────────

function DishCard({ dish }: { dish: MenuItem }) {
  const dietary: string[] = (() => { try { return JSON.parse(dish.dietaryInfo); } catch { return []; } })();
  return (
    <motion.div
      variants={cardVariant}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group flex-none w-48 rounded-2xl overflow-hidden border border-white/10 bg-card"
    >
      <div className="relative h-32 overflow-hidden bg-muted/40">
        {dish.imageUrl ? (
          <Image src={dish.imageUrl} alt={dish.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-40">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
        <div className="absolute bottom-2 left-2 text-xs font-bold text-white">
          LKR {dish.price.toLocaleString()}
        </div>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold text-foreground line-clamp-1">{dish.name}</p>
        {dish.restaurantName && (
          <p className="text-[10px] text-primary truncate">{dish.restaurantName}</p>
        )}
        {dietary.length > 0 && (
          <p className="text-[10px] text-muted-foreground truncate">{dietary.join(" · ")}</p>
        )}
      </div>
    </motion.div>
  );
}

export function HomePageClient({ restaurants: initialRestaurants, featuredDishes = [] }: { restaurants: RestaurantItem[]; featuredDishes?: MenuItem[] }) {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [locating, setLocating] = useState(false);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [locationError, setLocationError] = useState("");

  const findNearMe = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported by this browser.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `/api/proxy/restaurants?lat=${latitude}&lng=${longitude}&limit=50`
          );
          if (!res.ok) throw new Error();
          const data = (await res.json()) as { data: RestaurantItem[] };
          setRestaurants(data.data);
          setNearMeActive(true);
        } catch {
          setLocationError("Couldn't load nearby restaurants. Please try again.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocationError("Location permission denied — enable it to see restaurants near you.");
        setLocating(false);
      }
    );
  };

  const resetNearMe = () => {
    setRestaurants(initialRestaurants);
    setNearMeActive(false);
    setLocationError("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-20 pb-24 text-center overflow-hidden">
        {/* Background orbs */}
        <FloatingOrb className="w-[600px] h-[600px] bg-primary/10 -top-40 -left-40" />
        <FloatingOrb className="w-[500px] h-[400px] bg-violet-500/10 top-0 -right-32" />
        <FloatingOrb className="w-[300px] h-[300px] bg-amber-500/8 bottom-0 left-1/2" />

        {/* Floating food emojis */}
        {["🍣", "🍕", "🍛", "🥘", "🍜", "🦞", "🥗", "🍱"].map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl select-none pointer-events-none"
            style={{
              left: `${8 + (i * 12)}%`,
              top:  `${15 + (i % 3) * 22}%`,
            }}
            animate={{
              y: [0, -14, 0],
              rotate: [0, i % 2 === 0 ? 8 : -8, 0],
              opacity: [0.25, 0.5, 0.25],
            }}
            transition={{
              duration: 3 + i * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          >
            {emoji}
          </motion.div>
        ))}

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary font-medium"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered dining discovery
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-6xl font-bold leading-tight tracking-tight"
          >
            Find your perfect{" "}
            <span className="relative">
              <span className="text-primary">dining</span>
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary/50 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              />
            </span>{" "}
            experience
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            Chat with our AI to discover restaurants, reserve tables, browse menus, and pay — all in one seamless conversation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button asChild size="lg" className="gap-2 text-base px-8 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
              <Link href="/chat">
                <MessageSquare className="h-5 w-5" />
                Start Chatting
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 text-base px-8 border-border/60 hover:border-primary/50">
              <Link href="/reservations">
                <CalendarDays className="h-5 w-5" />
                My Reservations
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <Section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: restaurants.length > 0 ? `${restaurants.length}+` : "10+", label: "Restaurants", icon: Utensils },
            { value: "50+",  label: "Menu Items",  icon: ChefHat },
            { value: "100%", label: "AI-Powered",  icon: Sparkles },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-5 text-center"
            >
              <stat.icon className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Restaurants ───────────────────────────────────────────────────── */}
      {restaurants.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-20">
          <Section className="mb-8">
            <motion.div variants={fadeUp} className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">Our Restaurants</h2>
                <p className="text-muted-foreground mt-1">
                  {nearMeActive ? "Sorted by distance from you" : "Handpicked dining experiences for every occasion"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {nearMeActive ? (
                  <button
                    onClick={resetNearMe}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium"
                  >
                    Clear
                  </button>
                ) : (
                  <button
                    onClick={findNearMe}
                    disabled={locating}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium disabled:opacity-50"
                  >
                    {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                    Near me
                  </button>
                )}
                <Link href="/chat" className="hidden sm:flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                  Find via AI <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
            {locationError && (
              <p className="mt-2 text-sm text-destructive">{locationError}</p>
            )}
          </Section>

          <Section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {restaurants.map((r, i) => (
              <RestaurantCard key={r.id} r={r} index={i} />
            ))}
          </Section>
        </section>
      )}

      {/* ── Featured Dishes ───────────────────────────────────────────────── */}
      {featuredDishes.length > 0 && (
        <section className="pb-20 px-4">
          <div className="max-w-7xl mx-auto">
            <Section className="mb-6">
              <motion.div variants={fadeUp} className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold">Featured Dishes</h2>
                  <p className="text-muted-foreground mt-1">A taste of what's on the menu</p>
                </div>
              </motion.div>
            </Section>
            <Section className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
              {featuredDishes.map((dish) => (
                <DishCard key={dish.id} dish={dish} />
              ))}
            </Section>
          </div>
        </section>
      )}

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <Section className="text-center mb-12">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-3">
                <Sparkles className="h-4 w-4" /> Simple by design
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold">From craving to table in 3 steps</h2>
            </motion.div>
          </Section>

          <Section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={cardVariant}
                className="relative rounded-2xl border border-border/50 bg-card/60 p-6 space-y-4"
              >
                {/* connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 -right-3 w-6 h-px bg-gradient-to-r from-border to-transparent z-10" />
                )}
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} shadow-lg`}>
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Step {i + 1}</div>
                  <h3 className="font-semibold text-foreground text-lg">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </Section>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Section>
            <motion.div
              variants={fadeUp}
              className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-violet-900/20 p-10 text-center space-y-5"
            >
              {/* bg orbs */}
              <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl" />

              <div className="relative z-10 space-y-5">
                <div className="text-4xl">🍽️</div>
                <h2 className="text-2xl sm:text-3xl font-bold">Ready to discover your next favourite restaurant?</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Our AI remembers your preferences, handles reservations and even lets you pre-order before you arrive.
                </p>
                <Button asChild size="lg" className="gap-2 px-10 shadow-lg shadow-primary/40">
                  <Link href="/chat">
                    <MessageSquare className="h-5 w-5" />
                    Chat Now — it's free
                  </Link>
                </Button>
              </div>
            </motion.div>
          </Section>
        </div>
      </section>

    </div>
  );
}
