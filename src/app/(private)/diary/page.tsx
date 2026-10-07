import { requireUser } from "@/lib/auth";
import { diary } from "@/lib/nutrition";
import { dateSchema, todayDate } from "@/lib/nutrition-contract";
import { NutritionDiary } from "@/components/nutrition-diary";
export default async function Diary({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireUser();
  const value = dateSchema.safeParse((await searchParams).date);
  const date = value.success ? value.data : todayDate();
  return (
    <main>
      <p className="eyebrow">Essen. Training. Du.</p>
      <h1>Dein Tagebuch.</h1>
      <NutritionDiary key={date} date={date} entries={diary(date)} />
    </main>
  );
}
