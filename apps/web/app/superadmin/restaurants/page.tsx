"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@qr-dine/ui";
import { Button } from "@qr-dine/ui";
import { Input } from "@qr-dine/ui";
import {
  Building2,
  Search,
  Plus,
  MoreHorizontal,
  Users,
  MapPin,
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Edit,
  Trash2,
  Key,
  Eye,
} from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  status: string;
  licenseType: string | null;
  licenseExpiry: string | null;
  userCount: number;
  createdAt: string;
}

export default function RestaurantsPage() {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch("/api/superadmin/restaurants");
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data.restaurants || []);
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/superadmin/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchRestaurants();
      }
    } catch (error) {
      console.error("Error updating restaurant status:", error);
    }
    setActionMenu(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this restaurant? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/superadmin/restaurants/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchRestaurants();
      }
    } catch (error) {
      console.error("Error deleting restaurant:", error);
    }
    setActionMenu(null);
  };

  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.slug.toLowerCase().includes(search.toLowerCase()) ||
      (r.city && r.city.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: restaurants.length,
    active: restaurants.filter((r) => r.status === "ACTIVE").length,
    suspended: restaurants.filter((r) => r.status === "SUSPENDED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Restaurants</h1>
          <p className="text-muted-foreground">
            Manage all registered restaurants
          </p>
        </div>
        <Link href="/superadmin/restaurants/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Restaurant
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search restaurants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {/* Restaurants Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-medium">Restaurant</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-left p-4 font-medium">License</th>
                  <th className="text-left p-4 font-medium">Users</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Created</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No restaurants found
                    </td>
                  </tr>
                ) : (
                  filteredRestaurants.map((restaurant) => (
                    <tr key={restaurant.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{restaurant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            /{restaurant.slug}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {restaurant.city || "Not set"}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <Key className="h-3 w-3" />
                            {restaurant.licenseType || "Trial"}
                          </span>
                          {restaurant.licenseExpiry && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires: {new Date(restaurant.licenseExpiry).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {restaurant.userCount}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            restaurant.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : restaurant.status === "SUSPENDED"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {restaurant.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(restaurant.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="relative flex justify-end">
                          <button
                            onClick={() =>
                              setActionMenu(actionMenu === restaurant.id ? null : restaurant.id)
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {actionMenu === restaurant.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActionMenu(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-white shadow-lg z-50">
                                <div className="p-1">
                                  <Link
                                    href={`/superadmin/restaurants/${restaurant.id}`}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-100"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </Link>
                                  <Link
                                    href={`/superadmin/restaurants/${restaurant.id}/edit`}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-100"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                  </Link>
                                  <a
                                    href={`/${restaurant.slug}/dashboard`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-100"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Open Dashboard
                                  </a>
                                  <button
                                    onClick={() =>
                                      handleStatusToggle(restaurant.id, restaurant.status)
                                    }
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-100 ${
                                      restaurant.status === "ACTIVE"
                                        ? "text-yellow-600"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {restaurant.status === "ACTIVE" ? (
                                      <>
                                        <XCircle className="h-4 w-4" />
                                        Suspend
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4" />
                                        Activate
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleDelete(restaurant.id)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
