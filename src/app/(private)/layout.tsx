import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Navigation } from "@/components/navigation";
import { LogoutButton } from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <>
      <div className="shell">
        <header className="topbar">
          <Link href="/" className="brand">
            fittrack.
          </Link>
          <LogoutButton />
        </header>
        {children}
      </div>
      <Navigation />
    </>
  );
}
