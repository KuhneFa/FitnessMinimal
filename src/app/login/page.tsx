import { LoginForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
export default function Login() {
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
        <LoginForm />
      </section>
    </main>
  );
}
