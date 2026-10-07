import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAdviceThread } from "@/lib/advice";
import { HttpError } from "@/lib/http";
import { AdviceConversation } from "@/components/advice-conversation";
export default async function AdviceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  let thread;
  try {
    thread = getAdviceThread(id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  return (
    <main>
      <p className="eyebrow">Raum für deine Fragen</p>
      <h1>Dein Gespräch.</h1>
      <AdviceConversation key={id} initial={thread} />
    </main>
  );
}
