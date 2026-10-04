"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function Navigation() {
  const path = usePathname();
  return (
    <nav aria-label="Hauptnavigation">
      {[
        {
          href: "/",
          label: "Heute",
          active: path === "/" || path.startsWith("/workout/"),
        },
        { href: "/plans", label: "Pläne", active: path.startsWith("/plans") },
        {
          href: "/history",
          label: "Historie",
          active: path.startsWith("/history") || path.startsWith("/exercises/"),
        },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
