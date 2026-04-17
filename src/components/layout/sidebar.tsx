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
    <aside className="flex w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/engagements" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Kaptrix
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
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
      <div className="border-t px-4 py-4">
        <p className="text-xs text-gray-400">
          Kaptrix Delivery Platform
        </p>
        <p className="text-xs text-gray-400">Phase 1 — Internal</p>
      </div>
    </aside>
  );
}
