import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@qr-dine/ui";
import { Plus, Edit2, Trash2, GripVertical, Eye } from "lucide-react";
import Link from "next/link";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const { restaurant } = await params;
  const session = await getSession();

  if (!session) {
    return null;
  }

  // Fetch categories with their menu items
  const categories = await prisma.category.findMany({
    where: { restaurantId: session.restaurantId },
    include: {
      menuItems: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Get first table for preview link
  const firstTable = await prisma.table.findFirst({
    where: { restaurantId: session.restaurantId },
    select: { id: true },
  });

  type CategoryWithItems = typeof categories[number];
  type MenuItem = CategoryWithItems["menuItems"][number];
  const totalItems = categories.reduce((acc: number, cat: CategoryWithItems) => acc + cat.menuItems.length, 0);
  const availableItems = categories.reduce(
    (acc: number, cat: CategoryWithItems) => acc + cat.menuItems.filter((item: MenuItem) => item.isAvailable).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">
            {categories.length} categories, {totalItems} items ({availableItems} available)
          </p>
        </div>
        <div className="flex gap-2">
          {firstTable && (
            <a
              href={`/m/${restaurant}/${firstTable.id}/menu?preview=staff`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Preview Guest Menu
              </Button>
            </a>
          )}
          <Link href={`/${restaurant}/menu/categories/new`}>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </Link>
          <Link href={`/${restaurant}/menu/items/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">No categories yet</p>
            <p className="text-muted-foreground mb-4">
              Start by creating a category to organize your menu items
            </p>
            <Link href={`/${restaurant}/menu/categories/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Category
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categories.map((category: CategoryWithItems) => (
            <Card key={category.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {category.name}
                      {!category.isActive && (
                        <Badge variant="secondary">Hidden</Badge>
                      )}
                    </CardTitle>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {category.menuItems.length} items
                  </span>
                  <Link href={`/${restaurant}/menu/categories/${category.id}`}>
                    <Button variant="ghost" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {category.menuItems.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No items in this category</p>
                    <Link href={`/${restaurant}/menu/items/new?category=${category.id}`}>
                      <Button variant="link" size="sm">
                        Add first item
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y">
                    {category.menuItems.map((item: MenuItem) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">No img</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {item.name}
                              {item.isVegetarian && (
                                <span className="text-green-600 text-xs">Veg</span>
                              )}
                              {!item.isAvailable && (
                                <Badge variant="destructive" className="text-xs">
                                  Unavailable
                                </Badge>
                              )}
                            </p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">
                            Rs. {item.basePrice.toFixed(2)}
                          </span>
                          <Link href={`/${restaurant}/menu/items/${item.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
