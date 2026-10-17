import { OfflineWorkout } from "@/components/offline-workout";
import { Brand } from "@/components/brand";

// Public shell: no cookies, server data, RSC requests or private API responses
// are needed to render this page. Personal content is read locally after mount.
export default function OfflinePage() {
  return (
    <div className="shell" id="fitmin-offline-shell">
      <header className="topbar">
        <Brand />
      </header>
      <OfflineWorkout />
    </div>
  );
}
