import Image from "next/image";
import { serverFetch } from "@/lib/server/api";
import { Badge } from "@/components/ui/badge";
import { ToggleAvailabilityButton, DeleteMenuItemButton, EditMenuItemButton } from "@/components/restaurant-portal/MenuItemActions";
import { AddMenuItemForm } from "@/components/restaurant-portal/AddMenuItemForm";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  dietaryInfo: string;
  isAvailable: boolean;
  imageUrl: string | null;
}

export default async function PortalMenuPage() {
  const items = await serverFetch<MenuItem[]>("restaurant-portal/menu");

  const byCategory = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Menu</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} items</p>
        </div>
      </div>

      <AddMenuItemForm />

      {items.length === 0 && (
        <div className="rounded-lg border bg-card py-16 text-center text-muted-foreground">
          No menu items yet — add one above
        </div>
      )}

      {Object.entries(byCategory).map(([category, categoryItems]) => (
        <div key={category}>
          <h2 className="text-base font-semibold text-foreground mb-3">{category}</h2>
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Price (LKR)</th>
                  <th className="px-4 py-3 text-left font-medium">Dietary</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categoryItems.map((item) => {
                  const dietary = (() => {
                    try { return JSON.parse(item.dietaryInfo) as string[]; } catch { return []; }
                  })();
                  return (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 shrink-0 rounded-lg border border-border bg-muted/40 flex items-center justify-center text-lg">
                              🍽️
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-foreground">{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{item.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{item.price.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {dietary.map((d) => (
                            <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.isAvailable ? "default" : "destructive"}>
                          {item.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <EditMenuItemButton item={item} />
                          <ToggleAvailabilityButton itemId={item.id} isAvailable={item.isAvailable} />
                          <DeleteMenuItemButton itemId={item.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
