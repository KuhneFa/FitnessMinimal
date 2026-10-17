import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Navigation } from "@/components/navigation";
import { LogoutButton } from "@/components/auth-form";
import { Brand } from "@/components/brand";
import { DeviceSession } from "@/components/device-session";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { COOKIE } from "@/lib/security";
export const dynamic = "force-dynamic";
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const sessionTag = createHash("sha256")
    .update(`fitmin-device:${(await cookies()).get(COOKIE)!.value}`)
    .digest("hex");
  return (
    <>
      <div className="shell">
        <header className="topbar">
          <Link href="/" aria-label="Fitmin – Startseite">
            <Brand />
          </Link>
          <LogoutButton />
        </header>
        <DeviceSession sessionTag={sessionTag}>{children}</DeviceSession>
      </div>
      <Navigation />
    </>
  );
}
