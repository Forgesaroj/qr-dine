import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@qr-dine/ui";
import { ChefHat, QrCode, Users, Utensils } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <Utensils className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-gray-900">QR DINE</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Restaurant Management
          <span className="block text-primary">Made Simple</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Complete QR-based ordering system with staff dashboards, kitchen display, customer
          loyalty, and powerful analytics. Built for restaurants in Nepal and beyond.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/login">
            <Button size="xl">Start Free Trial</Button>
          </Link>
          <Button variant="outline" size="xl">
            View Demo
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-gray-900">Everything You Need</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
          From QR ordering to kitchen management, we&apos;ve got you covered.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <QrCode className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="mt-4">QR Ordering</CardTitle>
              <CardDescription>
                Guests scan, browse menu, and order directly from their phones. No app download
                required.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="mt-4">Staff Dashboards</CardTitle>
              <CardDescription>
                Dedicated views for waiters, kitchen, cashier, and managers. Everyone sees what they
                need.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                <ChefHat className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle className="mt-4">Kitchen Display</CardTitle>
              <CardDescription>
                Real-time order tickets with status tracking. Never miss an order again.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <Utensils className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="mt-4">Table Management</CardTitle>
              <CardDescription>
                Visual floor plan, table status tracking, and session management all in one place.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to Transform Your Restaurant?</h2>
          <p className="mx-auto mt-4 max-w-xl text-blue-100">
            Join hundreds of restaurants already using QR DINE to streamline their operations.
          </p>
          <div className="mt-8">
            <Link href="/login">
              <Button size="xl" variant="secondary">
                Get Started Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Utensils className="h-4 w-4" />
              </div>
              <span className="font-bold text-gray-900">QR DINE</span>
            </div>
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} LUMORA. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
