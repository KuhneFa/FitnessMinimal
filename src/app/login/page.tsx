import { LoginForm } from "@/components/auth-form";
import { redirect } from "next/navigation";
import { loginErrorMessage } from "@/lib/login";
import { Brand } from "@/components/brand";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (Object.hasOwn(params, "password")) redirect("/login?error=unsafe-url");
  const error = loginErrorMessage(params.error);
  return (
    <main className="shell" style={{ maxWidth: 480, paddingTop: "12vh" }}>
      <Brand />
      <p className="eyebrow" style={{ marginTop: 48 }}>
        Dein Raum fürs Training
      </p>
      <h1>
        Schön, dass du
        <br />
        dranbleibst.
      </h1>
      <p className="muted">Einloggen. Fokussieren. Stärker werden.</p>
      <section className="card">
        <LoginForm initialError={error} />
      </section>
    </main>
  );
}
