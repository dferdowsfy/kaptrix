"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Engagements", href: "/engagements", icon: "📋" },
  { name: "Benchmarks", href: "/benchmarks", icon: "📊" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col border-b bg-white md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-14 items-center border-b px-4 md:h-16 md:px-6">
        <Link href="/engagements" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-gray-900 md:text-xl">
            Kaptrix
          </span>
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-1 md:flex-col md:space-y-1 md:overflow-visible md:py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition md:gap-3 ${
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t px-4 py-4 md:block">
        <p className="text-xs text-gray-400">Kaptrix Delivery Platform</p>
        <p className="text-xs text-gray-400">Phase 1 — Internal</p>
      </div>
    </aside>
  );
}
