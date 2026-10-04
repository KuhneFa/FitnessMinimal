import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listPlans, library } from "@/lib/plans";
import { PlanEditor } from "@/components/plan-editor";
export default async function EditPlan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const plan = listPlans().find((p) => p.id === id);
  if (!plan) notFound();
  return (
    <main>
      <p className="eyebrow">Fein abstimmen</p>
      <h1>Plan bearbeiten.</h1>
      <PlanEditor initial={plan} id={id} exercises={library()} />
    </main>
  );
}
