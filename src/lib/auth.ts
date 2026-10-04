import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db";
import { COOKIE, validSession } from "./security";
export async function authenticated() {
  return validSession(
    getDatabase().sqlite,
    (await cookies()).get(COOKIE)?.value,
  );
}
export async function requireUser() {
  if (!(await authenticated())) redirect("/login");
}
