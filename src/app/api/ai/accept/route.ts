import { authorize, readJson, json, errorResponse } from "@/lib/http";
import { acceptedProposalSchema } from "@/lib/ai-contract";
import { importAcceptedProposal } from "@/lib/ai-import";
export async function POST(request: Request) {
  try {
    await authorize(request);
    return json(
      importAcceptedProposal(await readJson(request, acceptedProposalSchema)),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
