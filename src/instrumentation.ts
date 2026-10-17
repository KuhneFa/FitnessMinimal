export async function register() {
  // Explicitly enabled only in the running app, never in builds or test scripts.
  // Keep the worker in the server process so OAuth refresh shares the same lock.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.FITMIN_CHAT_WORKER === "1" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { startConversationWorker } =
      await import("./lib/conversation-worker");
    startConversationWorker();
  }
}
