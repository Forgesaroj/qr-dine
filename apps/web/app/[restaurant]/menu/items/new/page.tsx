"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
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
import { ArrowLeft, Loader2, Save, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
}

export default function NewMenuItemPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const restaurant = params.restaurant as string;
  const preSelectedCategory = searchParams.get("category");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [formData, setFormData] = useState({
    categoryId: preSelectedCategory || "",
    name: "",
    nameLocal: "",
    description: "",
    basePrice: "",
    isVegetarian: false,
    isVegan: false,
    spiceLevel: "",
    isAvailable: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/menu/categories");
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories);
        if (!formData.categoryId && data.categories.length > 0) {
          setFormData((prev) => ({
            ...prev,
            categoryId: preSelectedCategory || data.categories[0].id,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoadingCategories(false);
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
      const response = await fetch("/api/menu/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create menu item");
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${restaurant}/menu`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Menu Item</h1>
          <p className="text-muted-foreground">Add a new item to your menu</p>
        </div>
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
              disabled={loadingCategories}
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

            <Input
              label="Local Name (Optional)"
              placeholder="Name in local language"
              value={formData.nameLocal}
              onChange={(e) =>
                setFormData({ ...formData, nameLocal: e.target.value })
              }
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Item
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
