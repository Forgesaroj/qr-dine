"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Package,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface StockCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parent?: {
    id: string;
    name: string;
    code: string;
  } | null;
  children?: StockCategory[];
  _count: {
    stockItems: number;
    children: number;
  };
}

export default function StockCategoriesPage() {
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StockCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    parentId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/stock/categories?hierarchical=true");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const openCreateForm = (parentId?: string) => {
    setEditing(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      parentId: parentId || "",
    });
    setShowForm(true);
    setError("");
  };

  const openEditForm = (category: StockCategory) => {
    setEditing(category);
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description || "",
      parentId: category.parentId || "",
    });
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Category name is required");
      return;
    }

    setSubmitting(true);

    try {
      const url = editing
        ? `/api/stock/categories/${editing.id}`
        : "/api/stock/categories";
      const method = editing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          description: formData.description.trim() || undefined,
          parentId: formData.parentId || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowForm(false);
        fetchCategories();
      } else {
        setError(data.error || "Failed to save category");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: StockCategory) => {
    if (category._count.stockItems > 0 || category._count.children > 0) {
      alert(
        `Cannot delete category with ${category._count.stockItems} items and ${category._count.children} subcategories`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/stock/categories/${category.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCategories();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete category");
      }
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  // Flatten categories for parent selection
  const flattenCategories = (
    cats: StockCategory[],
    level = 0
  ): Array<{ id: string; name: string; level: number }> => {
    const result: Array<{ id: string; name: string; level: number }> = [];
    for (const cat of cats) {
      result.push({ id: cat.id, name: cat.name, level });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  };

  const flatCategories = flattenCategories(categories);

  const renderCategory = (category: StockCategory, level = 0) => {
    const isExpanded = expandedIds.has(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-2 p-3 hover:bg-gray-50 border-b ${
            level > 0 ? "bg-gray-50/50" : ""
          }`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-6"></span>
          )}

          <FolderTree className="w-4 h-4 text-yellow-600" />

          <div className="flex-1">
            <span className="font-medium">{category.name}</span>
            <span className="text-gray-400 text-sm ml-2">({category.code})</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {category._count.stockItems} items
            </span>
            <span>{category._count.children} subcategories</span>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openCreateForm(category.id)}
              title="Add subcategory"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditForm(category)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(category)}
              className="text-red-500 hover:text-red-700"
              disabled={
                category._count.stockItems > 0 || category._count.children > 0
              }
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {hasChildren &&
          isExpanded &&
          category.children!.map((child) => renderCategory(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Stock Categories</h1>
          <p className="text-gray-500">Organize stock items into categories</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${restaurant}/inventory`}>
            <Button variant="outline">Back to Inventory</Button>
          </Link>
          <Button onClick={() => openCreateForm()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Categories Hierarchy</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 animate-pulse space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded"></div>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No categories created yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => openCreateForm()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Category
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {categories.map((category) => renderCategory(category))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Panel */}
        <Card className={showForm ? "" : "opacity-60"}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editing ? "Edit Category" : "New Category"}</span>
              {showForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showForm ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">Select a category to edit or create new</p>
                <Button onClick={() => openCreateForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Vegetables, Dairy Products"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Code (Optional)
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="Auto-generated if empty"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Will be auto-generated from name if left empty
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Parent Category
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        parentId: e.target.value,
                      }))
                    }
                    className="w-full h-10 px-3 border rounded-md"
                    disabled={
                      editing !== null &&
                      flatCategories.some(
                        (c) =>
                          c.id === formData.parentId && c.id === editing?.id
                      )
                    }
                  >
                    <option value="">No Parent (Root Category)</option>
                    {flatCategories
                      .filter((c) => c.id !== editing?.id)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {"—".repeat(cat.level)} {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : editing ? (
                      "Update Category"
                    ) : (
                      "Create Category"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
