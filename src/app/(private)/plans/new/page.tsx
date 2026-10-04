import { requireUser } from "@/lib/auth";
import { library } from "@/lib/plans";
import { PlanEditor } from "@/components/plan-editor";
export default async function NewPlan() {
  await requireUser();
  return (
    <main>
      <p className="eyebrow">Dein Rhythmus</p>
      <h1>Neuer Plan.</h1>
      <PlanEditor exercises={library()} />
    </main>
  );
}
