import { exerciseVideoSearch } from "@/lib/exercise-guide";

export function ExerciseGuide({
  name,
  instructions,
  expanded = false,
}: {
  name: string;
  instructions?: string;
  expanded?: boolean;
}) {
  return (
    <details className="exercise-guide" open={expanded ? true : undefined}>
      <summary>Ausführung &amp; Video</summary>
      <p>
        {instructions ||
          "Für diese Übung ist noch keine Kurzbeschreibung hinterlegt. Über die Videosuche findest du Beispiele zur Ausführung."}
      </p>
      <a
        href={exerciseVideoSearch(name)}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        aria-label={`Videosuche zur Ausführung: ${name}`}
      >
        Videos zur Ausführung suchen ↗
      </a>
      <small className="muted">Öffnet die YouTube-Suche zum Übungsnamen.</small>
    </details>
  );
}
