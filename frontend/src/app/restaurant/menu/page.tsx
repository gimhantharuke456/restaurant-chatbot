import { serverFetch } from "@/lib/server/api";
import { Badge } from "@/components/ui/badge";
import { ToggleAvailabilityButton, DeleteMenuItemButton } from "@/components/restaurant-portal/MenuItemActions";
import { AddMenuItemForm } from "@/components/restaurant-portal/AddMenuItemForm";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  dietaryInfo: string;
  isAvailable: boolean;
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
          <h1 className="text-2xl font-semibold text-slate-900">Menu</h1>
          <p className="text-sm text-slate-500 mt-1">{items.length} items</p>
        </div>
      </div>

      <AddMenuItemForm />

      {items.length === 0 && (
        <div className="rounded-lg border bg-white py-16 text-center text-slate-400">
          No menu items yet — add one above
        </div>
      )}

      {Object.entries(byCategory).map(([category, categoryItems]) => (
        <div key={category}>
          <h2 className="text-base font-semibold text-slate-700 mb-3">{category}</h2>
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Price (LKR)</th>
                  <th className="px-4 py-3 text-left font-medium">Dietary</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categoryItems.map((item) => {
                  const dietary = (() => {
                    try { return JSON.parse(item.dietaryInfo) as string[]; } catch { return []; }
                  })();
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{item.price.toLocaleString()}</td>
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
