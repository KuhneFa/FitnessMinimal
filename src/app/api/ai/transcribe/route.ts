import { authorize, errorResponse, HttpError } from "@/lib/http";
// Keep the old URL as an explicit cost barrier, including for already-open older tabs.
export async function POST(request: Request) {
  try {
    await authorize(request);
    throw new HttpError(
      410,
      "Kostenpflichtige Transkription ist deaktiviert. Nutze die Diktierfunktion im Browser oder auf deiner Tastatur.",
    );
  } catch (e) {
    return errorResponse(e);
  }
}
