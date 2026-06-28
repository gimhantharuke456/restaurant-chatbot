import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Utensils, MapPin, CreditCard, Star } from "lucide-react";

interface Insights {
  totalDiningExperiences: number;
  totalSpent: number;
  avgRatingGiven: number | null;
  topCuisines: { cuisine: string; count: number }[];
  topRestaurants: { id: string; name: string; count: number }[];
  monthlyDining: { month: string; count: number }[];
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card/60 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function InsightsCard({ insights }: { insights: Insights | null }) {
  if (!insights) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No dining history yet. Make a reservation to see your insights.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Utensils} label="Dining experiences" value={String(insights.totalDiningExperiences)} />
        <StatCard icon={CreditCard} label="Total spent" value={`LKR ${insights.totalSpent.toLocaleString()}`} />
        {insights.avgRatingGiven != null && (
          <StatCard icon={Star} label="Avg rating given" value={insights.avgRatingGiven.toFixed(1)} />
        )}
        {insights.monthlyDining.length > 0 && (
          <StatCard
            icon={TrendingUp}
            label="Most active month"
            value={insights.monthlyDining.reduce((a, b) => a.count > b.count ? a : b).month}
          />
        )}
      </div>

      {/* Top cuisines */}
      {insights.topCuisines.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Utensils className="h-4 w-4 text-primary" />
              Favourite Cuisines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.topCuisines.map((c, i) => {
              const max = insights.topCuisines[0].count;
              return (
                <div key={c.cuisine} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{c.cuisine}</span>
                      <span className="text-xs text-muted-foreground">{c.count}x</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(c.count / max) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Top restaurants */}
      {insights.topRestaurants.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Most Visited
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {insights.topRestaurants.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between">
                <Link href={`/restaurants/${r.id}`} className="text-sm text-foreground hover:text-primary transition-colors truncate flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{i + 1}</span>
                  {r.name}
                </Link>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">{r.count} visit{r.count !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
