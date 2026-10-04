import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getWorkout } from "@/lib/workouts";
import { WorkoutClient } from "@/components/workout-client";
export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  let workout;
  try {
    workout = getWorkout((await params).id);
  } catch {
    notFound();
  }
  if (workout.active !== 1) redirect(`/history/${workout.id}`);
  return <WorkoutClient initial={workout} />;
}
