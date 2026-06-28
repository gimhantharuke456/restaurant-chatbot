import { Suspense } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { serverFetch } from "@/lib/server/api";
import { PaginationBar } from "@/components/admin/PaginationBar";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  imageUrls: string;
  createdAt: string;
  user: { name: string | null; email: string };
  reservation: { date: string; time: string } | null;
}

interface ReviewsResponse {
  data: Review[];
  total: number;
  page: number;
  limit: number;
  avgRating: number | null;
  totalReviews: number;
}

interface SearchParams { page?: string; rating?: string }

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${cls} ${n <= rating ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default async function PortalReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam, rating } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 25;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(rating ? { rating } : {}),
  });

  const result = await serverFetch<ReviewsResponse>(
    `restaurant-portal/reviews?${params.toString()}`
  );

  const parseImageUrls = (raw: string): string[] => {
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header with aggregate stats */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">{result.totalReviews} total reviews</p>
        </div>
        {result.avgRating != null && (
          <div className="rounded-lg border border-border bg-card px-5 py-3 text-center">
            <p className="text-3xl font-bold text-foreground">{result.avgRating.toFixed(1)}</p>
            <StarDisplay rating={Math.round(result.avgRating)} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">{result.totalReviews} reviews</p>
          </div>
        )}
      </div>

      {/* Rating filter */}
      <Suspense>
        <div className="flex flex-wrap gap-2">
          <a
            href="?page=1"
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              !rating
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            All
          </a>
          {[5, 4, 3, 2, 1].map((r) => (
            <a
              key={r}
              href={`?page=1&rating=${r}`}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                rating === String(r)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {r}
            </a>
          ))}
        </div>
      </Suspense>

      {/* Reviews list */}
      {result.data.length === 0 ? (
        <div className="rounded-lg border bg-card py-20 text-center space-y-3">
          <Star className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground font-medium">No reviews yet</p>
          <p className="text-sm text-muted-foreground">Reviews from completed reservations will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {result.data.map((review) => {
            const images = parseImageUrls(review.imageUrls);
            return (
              <div
                key={review.id}
                className="rounded-lg border border-border bg-card px-5 py-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StarDisplay rating={review.rating} />
                      <span className="text-xs text-muted-foreground font-medium">{review.rating}/5</span>
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {review.user.name ?? review.user.email}
                    </div>
                    <div className="text-xs text-muted-foreground">{review.user.email}</div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                    {review.reservation && (
                      <p className="text-xs text-muted-foreground">
                        Visit: {new Date(review.reservation.date).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short",
                        })} at {review.reservation.time}
                      </p>
                    )}
                  </div>
                </div>

                {review.comment && (
                  <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>
                )}

                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {images.map((url, i) => (
                      <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border">
                        <Image src={url} alt={`Review photo ${i + 1}`} fill className="object-cover" unoptimized />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Suspense>
        <PaginationBar page={page} total={result.total} limit={limit} />
      </Suspense>
    </div>
  );
}
