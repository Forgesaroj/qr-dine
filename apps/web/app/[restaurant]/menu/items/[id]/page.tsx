"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Switch,
  Select,
  Alert,
} from "@qr-dine/ui";
import { ArrowLeft, Loader2, Save, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import BOMEditor from "@/components/menu/BOMEditor";

interface Category {
  id: string;
  name: string;
}

export default function EditMenuItemPage() {
  const router = useRouter();
  const params = useParams();
  const restaurant = params.restaurant as string;
  const itemId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    description: "",
    basePrice: "",
    isVegetarian: false,
    isVegan: false,
    spiceLevel: "",
    isAvailable: true,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchCategories();
    fetchItem();
  }, [itemId]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/menu/categories");
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchItem = async () => {
    try {
      const response = await fetch(`/api/menu/items/${itemId}`);
      const data = await response.json();

      if (response.ok) {
        setFormData({
          categoryId: data.item.categoryId,
          name: data.item.name,
          description: data.item.description || "",
          basePrice: data.item.basePrice.toString(),
          isVegetarian: data.item.isVegetarian,
          isVegan: data.item.isVegan,
          spiceLevel: data.item.spiceLevel?.toString() || "",
          isAvailable: data.item.isAvailable,
          sortOrder: data.item.sortOrder,
        });
      } else {
        setError(data.error || "Failed to fetch item");
      }
    } catch (err) {
      setError("Failed to fetch item");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!formData.categoryId) {
      setError("Please select a category");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/menu/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update item");
        setIsLoading(false);
        return;
      }

      router.push(`/${restaurant}/menu`);
      router.refresh();
    } catch (err) {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this menu item?")) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/menu/items/${itemId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete item");
        setIsDeleting(false);
        return;
      }

      router.push(`/${restaurant}/menu`);
      router.refresh();
    } catch (err) {
      setError("Network error. Please try again.");
      setIsDeleting(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${restaurant}/menu`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Menu Item</h1>
          <p className="text-muted-foreground">Update item details</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <span className="ml-2">{error}</span>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Category *"
              value={formData.categoryId}
              onChange={(value) =>
                setFormData({ ...formData, categoryId: value })
              }
              placeholder="Select a category"
              options={categories.map((cat) => ({
                value: cat.id,
                label: cat.name,
              }))}
            />

            <Input
              label="Item Name *"
              placeholder="e.g., Chicken Momo, Butter Naan"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <Textarea
              label="Description (Optional)"
              placeholder="Brief description of the item"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />

            <Input
              label="Price (Rs.) *"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.basePrice}
              onChange={(e) =>
                setFormData({ ...formData, basePrice: e.target.value })
              }
              required
            />

            <Input
              label="Sort Order"
              type="number"
              placeholder="0"
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })
              }
              helperText="Lower numbers appear first within category"
            />

            <Select
              label="Spice Level (Optional)"
              value={formData.spiceLevel}
              onChange={(value) =>
                setFormData({ ...formData, spiceLevel: value })
              }
              placeholder="Not specified"
              options={[
                { value: "0", label: "Not Spicy" },
                { value: "1", label: "Mild" },
                { value: "2", label: "Medium" },
                { value: "3", label: "Hot" },
                { value: "4", label: "Extra Hot" },
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <Switch
                  label="Vegetarian"
                  description="Mark as veg item"
                  checked={formData.isVegetarian}
                  onChange={(checked) =>
                    setFormData({ ...formData, isVegetarian: checked })
                  }
                />
              </div>

              <div className="rounded-lg border p-4">
                <Switch
                  label="Vegan"
                  description="No animal products"
                  checked={formData.isVegan}
                  onChange={(checked) =>
                    setFormData({ ...formData, isVegan: checked })
                  }
                />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <Switch
                label="Available"
                description="Show this item on the menu"
                checked={formData.isAvailable}
                onChange={(checked) =>
                  setFormData({ ...formData, isAvailable: checked })
                }
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Link href={`/${restaurant}/menu`} className="flex-1">
                <Button variant="outline" className="w-full" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bill of Materials / Recipe */}
      <BOMEditor menuItemId={itemId} restaurant={restaurant} />
    </div>
  );
}
