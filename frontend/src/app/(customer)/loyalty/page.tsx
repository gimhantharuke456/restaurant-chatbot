import { serverFetch } from "@/lib/server/api";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Gift, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface LoyaltyAccount {
  id: string;
  points: number;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  totalEarned: number;
  createdAt: string;
  updatedAt: string;
}

interface LoyaltyTransaction {
  id: string;
  points: number;
  type: "EARN_RESERVATION" | "EARN_REVIEW" | "EARN_PAYMENT" | "REDEEM" | "ADJUSTMENT";
  description: string;
  createdAt: string;
}

const TIER_CONFIG = {
  BRONZE:   { color: "bg-amber-700",   label: "Bronze",   next: 500,  nextLabel: "Silver" },
  SILVER:   { color: "bg-slate-400",   label: "Silver",   next: 2000, nextLabel: "Gold" },
  GOLD:     { color: "bg-yellow-400",  label: "Gold",     next: 5000, nextLabel: "Platinum" },
  PLATINUM: { color: "bg-violet-400",  label: "Platinum", next: null, nextLabel: null },
};

const TIER_MIN = { BRONZE: 0, SILVER: 500, GOLD: 2000, PLATINUM: 5000 };

function TierProgress({ account }: { account: LoyaltyAccount }) {
  const cfg = TIER_CONFIG[account.tier];
  if (!cfg.next) {
    return (
      <p className="text-xs text-muted-foreground">You&apos;ve reached the highest tier — Platinum!</p>
    );
  }
  const min = TIER_MIN[account.tier];
  const progress = Math.min(((account.points - min) / (cfg.next - min)) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{account.points.toLocaleString()} pts</span>
        <span>{cfg.next.toLocaleString()} pts to {cfg.nextLabel}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

const TX_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  EARN_RESERVATION: ArrowUpRight,
  EARN_REVIEW:      ArrowUpRight,
  EARN_PAYMENT:     ArrowUpRight,
  REDEEM:           ArrowDownLeft,
  ADJUSTMENT:       TrendingUp,
};

export default async function LoyaltyPage() {
  let account: LoyaltyAccount | null = null;
  let transactions: LoyaltyTransaction[] = [];

  try {
    account = await serverFetch<LoyaltyAccount>("users/me/loyalty");
  } catch {
    /* no account yet */
  }

  if (account) {
    try {
      transactions = await serverFetch<LoyaltyTransaction[]>("users/me/loyalty/history");
    } catch { /* empty */ }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <h1 className="text-xl font-semibold">Loyalty Rewards</h1>

        {!account ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center space-y-2">
            <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium text-foreground">No loyalty account yet</p>
            <p className="text-sm text-muted-foreground">Make a reservation to start earning points.</p>
          </div>
        ) : (
          <>
            {/* Tier card */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${TIER_CONFIG[account.tier].color} text-white`}>
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Your Tier</p>
                    <p className="text-xl font-bold text-foreground">{TIER_CONFIG[account.tier].label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{account.points.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
              <TierProgress account={account} />
              <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <Gift className="h-3.5 w-3.5" />
                <span>Total earned: <span className="text-foreground font-medium">{account.totalEarned.toLocaleString()} pts</span></span>
              </div>
            </div>

            {/* Tier benefits */}
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold">Earn Points</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between"><span>Make a reservation</span><span className="text-primary font-medium">+100 pts</span></div>
                <div className="flex justify-between"><span>Leave a review</span><span className="text-primary font-medium">+50 pts</span></div>
                <div className="flex justify-between"><span>Per LKR 100 spent</span><span className="text-primary font-medium">+1 pt</span></div>
              </div>
            </div>

            {/* History */}
            {transactions.length > 0 && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b">
                  <h2 className="text-sm font-semibold">Transaction History</h2>
                </div>
                <div className="divide-y">
                  {transactions.map((tx) => {
                    const Icon = TX_ICON[tx.type] ?? TrendingUp;
                    const isEarn = tx.points > 0;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isEarn ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("en-GB")}</p>
                        </div>
                        <span className={`text-sm font-semibold ${isEarn ? "text-green-500" : "text-red-500"}`}>
                          {isEarn ? "+" : ""}{tx.points} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
