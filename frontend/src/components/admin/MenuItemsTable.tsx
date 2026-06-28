import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MenuItem } from "@/types/admin";

interface MenuItemsTableProps {
  items: MenuItem[];
}

export function MenuItemsTable({ items }: MenuItemsTableProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">No menu items</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Dietary</TableHead>
            <TableHead>Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-medium text-foreground">{item.name}</div>
                {item.description && (
                  <div className="max-w-xs truncate text-xs text-muted-foreground">
                    {item.description}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{item.category}</Badge>
              </TableCell>
              <TableCell className="font-medium">
                LKR {item.price.toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {item.dietaryInfo.map((d) => (
                    <Badge key={d} variant="outline" className="text-xs">
                      {d}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={item.isAvailable ? "default" : "secondary"}>
                  {item.isAvailable ? "Yes" : "No"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
