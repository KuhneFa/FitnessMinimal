# B1: Gespräche, Gerätespeicher und Wiederaufnahme

Stand: 17.10.2026. **B1 lokal implementiert und geprüft.** Reale Safari-/iPhone-Abnahme und Hosting bleiben offen.

## Implementiert

- Migration `0009_greedy_impossible_man.sql` ergänzt Gespräche, Nachrichten und Aufträge. Bestehende Tabellen bleiben erhalten.
- Eine Nachricht, der Antwortplatzhalter, die neue Gesprächsversion und ihr Auftrag werden gemeinsam in einer SQLite-Transaktion gespeichert. Auch ein Fehler beim letzten Insert hinterlässt keine halbe Nachricht.
- Stabile Client-Nachrichten-IDs verhindern doppelte Aufträge. Eine wiederholte ID mit anderem Inhalt wird abgelehnt. Versionskonflikte und ein bereits laufender Auftrag verhindern parallele, widersprüchliche Gesprächsfortsetzungen.
- Geschützte APIs zum Erstellen, Lesen, Senden und Löschen unter `/api/conversations`. Lesen verwendet `no-store`; Schreiben benötigt wie bisher Login und passende Origin.
- Der geladene Gesprächsstand enthält Nachrichten, Antwortstatus und öffentliche Originalantworten bei Modellfehlern. Ein vollständiger Ereignisstream ist noch nicht implementiert; Wiederaufnahme erfolgt derzeit über GET.
- Maximal 60 Nachrichten pro Gespräch in dieser Zwischenstufe. Danach klare Aufforderung zu einem neuen Gespräch; kein stilles Weglassen alter Nachrichten. Die spätere Kontext-/Gedächtnisverwaltung ersetzt diese vorläufige Grenze bewusst.
- Worker beansprucht einen Auftrag atomar mit einer dreiminütigen Lease. Unklar beendete Anfragen werden als unterbrochen markiert, nicht automatisch erneut versandt. Veraltete oder bereits erledigte Ergebnisse können den Verlauf nicht überschreiben. Nach Löschung bleibt auch eine später eintreffende Antwort gelöscht.

## Workerbetrieb

Der Worker startet über Next.js `instrumentation.ts` nur bei `FITMIN_CHAT_WORKER=1`. Diese Variable wurde nicht in der persönlichen `.env` gesetzt. Tests verwenden simulierte Transporte; der Browser-Testserver erzwingt `FITMIN_CHAT_WORKER=0`.

Bewusste Konkretisierung der Architektur: zunächst ein Hintergrundloop im langlebigen Next.js-Node-Prozess, mit SQLite als dauerhafter Warteschlange. So teilen bestehende HTTP-Anfragen und neue Aufträge denselben OAuth-Refresh-Lock. Der Loop hängt nicht an einer Browseranfrage; ein Serverneustart lädt die Warteschlange erneut. Kein separater Workerprozess, bevor die Koordination der Token-Erneuerung über Prozessgrenzen implementiert ist.

Die Antworten sind vorerst ein allgemeiner Textvertrag. Fachaktionen, personalisierte Planung und Trainingsführung kommen in B2–B5. Die neue Gesprächs-API allein bedeutet noch keine fertige Chatoberfläche. Ein deaktivierter Worker wird im Sendeergebnis ausdrücklich angezeigt; Aufträge bleiben dann wartend.

## Prüfungen

Die bestehenden Vertragstests wurden um echte SQLite-Fälle ergänzt: Transaktionsrollback, identische Wiederholung, veränderte Wiederholung, Versionskonflikte, zwei Verbindungen beim Claim, Ablauf einer Lease, verspätete Antwort, Backup/Wiederherstellung, Löschung während eines Auftrags und Worker mit simuliertem Anbieter. Der Prozessabsturztest prüft jetzt zusätzlich Nachricht und wartenden Auftrag nach SIGKILL.

Der bestehende Browserfall prüft zusätzlich Login/Origin für die neuen Routen, Rollenfälschung, dauerhafte Speicherung, Deduplizierung und Löschen. Keine zusätzliche automatische Testanzahl: weiterhin 19 Unit-/Integrationstests und 11 Browserfälle. Abschluss dieses Teilstands: alle 30 bestanden, ebenso Typprüfung, ESLint, Produktionsbuild und `git diff --check`.

Migration bisher in isolierten Testdatenbanken geprüft. Keine bewusste Migration der persönlichen Datenbank in diesem Arbeitsschritt; der vorhandene App-Start wendet ausstehende Migrationen wie bisher an.

## Ergänzte Gerätefunktionen

- IndexedDB `fitmin-device` hält einen bestätigten Snapshot des aktiven Trainings und offene Satzeingaben mit stabiler Mutations-ID. Lokale Schreibvorgänge werden serialisiert; eine Bestätigung wird erst nach dem Transaktionsabschluss gemeldet. Der Server bleibt die maßgebliche Quelle bestätigter Daten.
- Die alte `fittrack-recovery`-Warteschlange wird validiert und atomar übernommen. Erst danach wird exakt die gelesene Altversion entfernt. Fehlerhafte, fremde oder zwischenzeitlich geänderte Altbestände bleiben erhalten.
- Gleichzeitige Entwürfe desselben Satzes bleiben getrennt gespeichert und sichtbar. Server-Versionsprüfungen schützen weiterhin die bestätigten Werte. Ausdrückliches Verwerfen invalidiert andere Editoren, sodass diese verworfene Werte nicht wieder einfügen können.
- Ein öffentlicher, datenfreier `/offline`-Einstieg lädt das aktive Training aus IndexedDB. Der Service Worker speichert diese Oberfläche und ihre statischen Abhängigkeiten pro Build; private HTML-Seiten, RSC-Daten, APIs und Zugangsdaten werden nicht gecacht. Vorbereiteter Offline-Start gilt für `/`, `/offline` und Trainings-URLs.
- Abmeldung rotiert die lokale Editor-Kennung und entfernt Snapshot/Entwürfe; alte Fenster können nicht weiter in denselben Speicher schreiben. Die lokale Anmeldung verwendet eine nicht zur Authentifizierung verwendbare, einwegabgeleitete Sitzungskennung, um eine erneute erfolgreiche Anmeldung vom alten Fenster zu unterscheiden. Es werden keine Session-Cookies oder Modell-Tokens in IndexedDB gespeichert.
- Online-Verwendung bleibt bei nicht verfügbarem Gerätespeicher möglich, mit sichtbarem Warnhinweis. Ohne Netz bleiben Timerbedienung und Abschluss deaktiviert; Offline-Löschen entfernt nur lokale Daten und behauptet keine Server-Abmeldung.

## Lokale Abnahme und Grenzen

Typprüfung, ESLint, 19 Unit-/Integrationstests, Production-Build, 11 Chromium-Browserfälle und `git diff --check` bestanden. Erweiterte Szenarien im vorhandenen Trainingsfall: Seite schließen und offline neu öffnen; vollständigen Chromium-Prozess mit gespeichertem Profil beenden und offline neu starten; genau einmal synchronisieren; verlorene Serverantwort; Migration erst nach Commit; simulierten Quota-Fehler und beschädigte Altwerte erhalten; verweigerten IndexedDB-Zugriff sichtbar behandeln; zwei widersprüchliche Editoren; ausdrückliches Verwerfen; Abschlussbereinigung; Logout und altes Fenster; Cache-Inhalte auf öffentliche Dateien begrenzen. Mobile Breiten und axe bleiben geprüft; Trainingsansicht visuell kontrolliert. Alle Daten sind synthetisch, keine echten Modellaufrufe.

Reales Safari/iPhone, Home-Bildschirm, Sperrbildschirm und Speicherbereinigung durch iOS sind durch Chromium nicht nachgewiesen. Kein Railway-Deployment in diesem Schritt. Die sichtbare Gesprächsoberfläche und lokale Texteingaben des zukünftigen Chats folgen mit B3/B5; B1 liefert deren Servergrundlage und den bestehenden Satzeditor als ersten vollständigen Wiederaufnahmeablauf. Timerbedienung und Trainingsabschluss benötigen weiterhin Netz. Abgelaufene Server-Anmeldung erhält Entwürfe; bewusstes Abmelden löscht sie nach Warnung. Die persönliche Instanz ist weiterhin kein Mehrbenutzersystem.

## Spätere manuelle Geräteprüfung

Voraussetzung: eigener HTTPS-Zugang zum Production-Build, Testdaten und eine vorbereitete Offline-Oberfläche. Die tatsächliche iOS-/Safari-Version im Ergebnis notieren.

1. In Safari anmelden, aktives Training öffnen, Vorbereitung des Offline-Starts abwarten und zum Home-Bildschirm hinzufügen.
2. Ohne Verbindung einen Satz ändern. Lokale Speicheranzeige abwarten, Home-Bildschirm-App schließen und erneut öffnen. Werte müssen vollständig erhalten bleiben.
3. Gerät sperren, später entsperren und Verbindung herstellen. Serverstand erneut laden und prüfen, dass die Änderung genau einmal übernommen wurde. Keine Hintergrundübertragung voraussetzen.
4. Unterschiedliche Werte in Safari und Home-Bildschirm-App eintragen. Falls iOS getrennte Speicherbereiche verwendet, muss spätestens die Server-Versionsprüfung einen Konflikt melden; keine gemeinsame IndexedDB voraussetzen.
5. Abmelden, offline öffnen und Zurück-Navigation prüfen. Lokale Trainingswerte dürfen nicht erneut editierbar werden. Bei getrennten iOS-Speicherbereichen deren Abmeldeverhalten gesondert dokumentieren.
6. Speicherzugriff verweigern bzw. Website-Daten entfernen. Ein fehlender Offline-Stand muss verständlich angezeigt werden; bestätigte Serverwerte müssen nach Anmeldung weiter verfügbar sein.

Diese Liste ist ein Prüfauftrag, kein bereits bestandener Nachweis.
