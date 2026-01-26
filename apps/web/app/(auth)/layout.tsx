import { Utensils } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-2 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
            <Utensils className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">QR DINE</span>
        </div>

        <div className="text-white">
          <h1 className="text-4xl font-bold">Restaurant Management Made Simple</h1>
          <p className="mt-4 text-lg text-blue-100">
            QR ordering, table management, kitchen display, staff dashboards, and more. Everything
            you need to run your restaurant efficiently.
          </p>
        </div>

        <p className="text-sm text-blue-200">&copy; {new Date().getFullYear()} LUMORA</p>
      </div>

      {/* Right side - Auth form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
