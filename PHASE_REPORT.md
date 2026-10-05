# Prüfprotokoll

Jede Phase wird erst nach Typecheck, Lint, automatisierten Tests und Production Build freigegeben. Manuelle iPhone- und Railway-Prüfungen werden ausdrücklich separat dokumentiert und nicht als automatisch bestanden ausgegeben.

## Phase 1 – Fundament

Implementiert: Next.js, TypeScript, Tailwind, SQLite/Drizzle, versionierte Migrationen, Railway Docker-Konfiguration und Volume-Prüfung, Healthcheck, Manifest und mobiles Layout.

Prüfstatus: Typecheck, Lint, 1 automatisierter Test und Production Build bestanden. Produktionsabhängigkeiten: npm audit ohne Befund.

## Phase 2 – Security

Implementiert: gesalzener scrypt-Passworthash, zufällige Sessions (nur Hash auf dem Server), HttpOnly/Secure/SameSite-Cookies, Ablauf nach 30 Tagen, serverseitiger Routenschutz, persistentes Login-Limit, exakte Origin-Prüfung, begrenzte JSON-Bodies und Zod-Validierung, Security Headers und Logout-Revocation.

Prüfstatus: Typecheck, Lint ohne Warnungen, 5 automatisierte Tests und Production Build bestanden.

## Phase 3 – Übungen und Trainingspläne

Implementiert: Übungsbibliothek, Trainingstage, Planeditor, Zuordnung mit Satz-/Wiederholungs-/Gewichtsparametern, transaktionale Planänderung und sicherer lokaler Demo-Seed.

Prüfstatus: Typecheck, Lint, 6 automatisierte Tests und Production Build bestanden.

## Phase 4 – Aktives Workout

Implementiert: Start/Resume, serverseitige Snapshots, Sätze mit kg/Wdh./RIR, Autosave, Versionskonflikte, idempotente Speicheranfragen, kleine lokale Recovery-Kopie und Anzeige des letzten abgeschlossenen Trainings.

Prüfstatus: Typecheck, Lint, 7 automatisierte Tests und Production Build bestanden. Chromium-E2E für Login/Origin/Schutz, Autosave, Wiederaufnahme, Offline-Nachsenden und Logout bestanden. Breiten 320/375/390/430 ohne horizontalen Überlauf; Screenshot geprüft. iPhone-Pass mit 48px-Bedienelementen, 16px-Eingaben, Dezimaltastatur, Safe-Area-Abständen und schmalem Satzraster. WebKit konnte auf diesem Host keine Seite erzeugen (Playwright-Protokollfehler `Unknown setting: PushAPIEnabled`); echter Safari/PWA-Test bleibt offen. Optional auf kompatiblem Host: `TEST_WEBKIT=1 npm run test:e2e`.

## Phase 5 – Progression

Implementiert: reine Business-Funktion für Double Progression, vorausgefüllte Gewichte und gespeicherte Begründung. Steigerung nur bei gleicher Last, vollständiger Satzanzahl, erreichter Wiederholungsobergrenze und mindestens Ziel-RIR in jedem Satz. Historie wird pro Übung berücksichtigt (auch über unterschiedliche Trainingstage hinweg).

Prüfstatus: Typecheck, Lint, 23 automatisierte Tests und Production Build bestanden; darunter 16 dedizierte Progressions-Tests.

## Phase 6 – Rest Timer

Implementiert: Satzabschluss startet Pause, Pause/Weiter/Skip/+30, serverseitige Deadline und pausierte Restzeit, Wiederherstellung nach Hintergrundbetrieb, Serverzeit-Abgleich und Versionskonflikte.

Prüfstatus: Typecheck, Lint, 26 automatisierte Tests und Production Build bestanden.

## Phase 7 – Abschluss und Historie

Implementiert: Abschluss mit Versionsprüfung und expliziter Bestätigung offener Sätze, Fatigue/Performance/Notiz, unveränderliche Workout-Historie, serverseitig paginierter Übungsverlauf.

Prüfstatus: Typecheck, Lint, 26 automatisierte Tests und Production Build bestanden. Chromium-E2E erweitert: Timer, Abschluss, Historie, Übungsverlauf und nächstes Training mit Progression bestanden.

## Phase 8 – Finaler Polish

Implementiert: Empty/Loading/Error/Not-found States, aktive Navigation, lesbare mobile Satzraster, Safe Areas, Keyboard-Abstände, reduzierte Animationen, PNG-PWA-/Apple-Icons, aufgeräumter formatierter Quellcode, Indexe für Historienabfragen und Produktionsruntime ohne Dev-Abhängigkeiten. Security Review und vollständiger priorisierter manueller Testplan mit allen 16 iPhone-PWA-Prüfungen erstellt.

Prüfstatus am 02.10.2026:

- Typecheck: bestanden.
- ESLint: bestanden, keine Warnungen.
- Automatisierte Unit-/Integrationstests: **31 bestanden**, einschließlich separatem Prozessabbruch mit SIGKILL und erneutem Datenbankzugriff.
- Next.js Production Build (Webpack): bestanden.
- Chromium auf iPhone-Viewport: **2 End-to-End-Tests bestanden**. Login/Cookies/Origin/Logout, Autosave, echter Offline-Fehler, Recovery nach Reload, verlorene Serverantwort mit idempotentem Retry, Timer, Abschluss, Historie, Übungsverlauf, Progression und Planeditor.
- axe: keine WCAG-2-A/AA-/2.1-AA-Befunde auf den geprüften Workout- und Planeditor-Screens. Ein gefundener Timer-Kontrastfehler wurde vor dem erneuten Test korrigiert.
- Breiten 320/375/390/430: kein horizontaler Überlauf im Workout. Screenshot visuell geprüft.
- `npm audit`: **0 bekannte Sicherheitslücken**, inklusive Entwicklungsabhängigkeiten. Gezielter esbuild-Override für drizzle-kit; Migrationserzeugung mit dieser Version erfolgreich.
- `git diff --check`: bestanden.

Offen, ausdrücklich nicht als bestanden gewertet: echte iPhone-Hardware/Safari/PWA, Railway-Deployment/physischer Volume-Mount/Restart, Docker-Container-Build (lokaler Docker-Daemon nicht verfügbar), WebKit-Automation (Host-Protokollfehler siehe Phase 4). Kein Deployment durchgeführt. Alle manuellen Testergebnisse stehen weiterhin auf „noch nicht getestet“.

Zum Abschluss von Phase 8 wie ursprünglich beauftragt nicht implementiert: OpenAI, Ernährung, Sprache, Fotos, HealthKit. OpenAI und Sprache wurden anschließend ausdrücklich für den Planeditor beauftragt (Phase 9). Keine große lokale Datenbank oder Offline-First-Synchronisierung.

## Nachprüfung der lokalen Einrichtung – 04.10.2026

Homebrew-nvm in zsh eingebunden und Node 22.23.3 / npm 10.9.9 eingerichtet. Die zwischenzeitlich inkompatible `eslint-config-next`-Version 14.2.35 auf 16.3.8 korrigiert. Saubere Installation mit `npm ci` sowie Typecheck, Lint, 31 Tests und Production Build bestanden. Die Produktionsabhängigkeiten haben weiterhin keine bekannten Auditbefunde. Das vollständige Audit meldet inzwischen fünf hohe Befunde in der braces-Entwicklungsabhängigkeitskette; Details und Begründung gegen den inkompatiblen Force-Downgrade stehen im Security Review.

## Phase 9 – Sprache und KI-Planassistent – 04.10.2026

Neue ausdrückliche Beauftragung: Trainingswünsche einsprechen, freiwillig Körperdaten und Trainingsfokus angeben, daraus Modellvorschläge erhalten und Übungen einzeln annehmen oder ablehnen.

### 9a – API und Datenverarbeitung

Implementiert: serverseitige OpenAI-Anbindung für Transkription und strukturierte Planvorschläge, optionale Profilangaben, Audio-/JSON-Grenzen, Session-/Origin-Schutz, persistente Anfragebudgets, Zeitlimits, Fehlerbehandlung und transaktionaler Import ausschließlich bestätigter Übungen. Bestehende Namen werden wiederverwendet; Planpersistenz bleibt eine eigene Aktion.

Phasenprüfung vor der UI-Implementierung: Typecheck, Lint, **41 Unit-/Integrationstests** und Production Build bestanden. Anbieterantworten wurden simuliert; keine echten API-Kosten ausgelöst.

### 9b – Editor und Aufnahme

Implementiert: Mikrofonaufnahme mit WebM/MP4-Auswahl, sichtbarem Status, Stoppen/Verwerfen, 90-Sekunden-Grenze und Freigabe des Mikrofons beim Hintergrundwechsel/Verlassen. Upload erfolgt erst nach „Aufnahme transkribieren“. Erkannter Text bleibt editierbar. Optionale Profilfelder, Vorschlagskarten mit Annehmen/Ablehnen, Schutz bestehender Editorentwürfe und Sperre veralteter Vorschläge. Ohne KI-Schlüssel bleibt der manuelle Editor nutzbar.

Abschließende Prüfungen:

- Typecheck und ESLint: bestanden.
- Unit-/Integrationstests: **41 bestanden**; darunter 10 KI-Tests zu Vertrag, Modellfehlern, Audio, Limits und bestätigtem Import.
- Production Build: bestanden.
- Chromium mit mobilem Viewport: **6 End-to-End-Tests bestanden**. Davon vier für KI-Zugriffsschutz, Profilübertragung, individuelle Entscheidungen, bestätigten Import/Planspeicherung, echten MediaRecorder mit simulierter Audioquelle, expliziten Upload, Textkorrektur, Entwurfschutz sowie Mikrofon-/Anbieterfehler. Die Testumgebung benötigt sowohl simulierte Audioquelle als auch simulierte Mikrofonfreigabe; diese Konfiguration wurde im Browser isoliert geprüft.
- axe auf dem KI-Vorschlag und bestehenden Screens: keine Befunde in den geprüften WCAG-2-A/AA-/2.1-AA-Regeln.
- Breiten 320/375/390/430: kein horizontaler Überlauf; Screenshot des Assistenten visuell geprüft.
- `git diff --check`: bestanden. Keine zusätzlichen npm-Abhängigkeiten.

Offen: echte OpenAI-Anfragen (lokal kein Schlüssel eingerichtet), echte iPhone-/Safari-/PWA-Aufnahme und Deployment. Diese Prüfungen sind im manuellen Testplan ergänzt und ausdrücklich nicht als bestanden markiert. Die vorigen Betriebseinschränkungen aus Phase 8 bleiben bestehen. Profil und Audio werden nicht dauerhaft in FitTrack gespeichert; Verarbeitung/Aufbewahrung beim Anbieter ist separat in README und Security Review erläutert.

## Phase 10 – ChatGPT-Abo ohne zusätzliche API-Abrechnung – 05.10.2026

Neue Vorgabe: vorhandenes Plus-Abo nutzen; keine zusätzlichen API-Ausgaben. Die bezahlte API-Anbindung aus Phase 9 wurde ersetzt. Ein vorhandener `OPENAI_API_KEY` wird nicht verwendet, und die frühere Transkriptionsroute liefert nach Zugriffsschutz HTTP 410.

### 10a – Abrechnungstrennung und ChatGPT-Verbindung

Implementiert: offizieller lokaler OAuth-Ablauf mit PKCE, State, Nonce, Loopback-Listener, JWKS-/ID-Token-Prüfung, beständiger Host-ID, getrennten Kontoregistrierungen, atomarer Zugangsdatenablage mit 0600, serialisiertem Refresh und Trennung einschließlich Revocation-Versuch. Kontobezogene Modellliste; Responses mit Abo-Token, `store:false`, `stream:true`, begrenztem Datenstrom und erforderlichem Abschlussereignis. Keine API-Key- oder Transkriptions-Fallbacks. Lokaler Prompt-Export für den manuellen ChatGPT-Import.

Phasenprüfung vor UI: Typecheck, Lint (noch eine Warnung im inzwischen ersetzten Aufnahme-Component), **47 Unit-/Integrationstests** und Production Build bestanden.

### 10b – Diktat, Anmeldung und Import

Implementiert: Kontoverbindung und Modellauswahl im Planeditor, einmaliger Abo-Hinweis mit Link zur Nutzungsverwaltung, Abbruch einer laufenden Anmeldung (auch beim FitTrack-Logout), Browserdiktat mit prüfbarem Text und Tastatur-Fallback. Kopier-/Importablauf für ChatGPT ohne direkten Modellaufruf durch FitTrack, einschließlich JSON-Validierung und Schutz vor überholten Angaben. Einzelentscheidungen und Planspeicherung bleiben erhalten. Öffentliche/Railway-Installationen verwenden den Kopier-/Importweg; der lokale OAuth-Callback wird auf dem Mac abgeschlossen, auf dem der Server läuft.

Abschlussprüfung:

- Typecheck, ESLint ohne Warnungen und Production Build: bestanden.
- **47 Unit-/Integrationstests bestanden**, einschließlich ID-Token-Signatur/Audience/Nonce/Ablauf, Callback-Manipulation, fehlender Abo-Freigabe trotz API-Key, Tokenrotation, Dateirechten, SSE-Chunkgrenzen, unvollständigen Antworten, späten Abo-Limits und bestätigtem Import.
- **8 Chromium-End-to-End-Tests bestanden**, darunter Diktat mit simulierter Web-Spracherkennung ohne Audio-Upload, Mikrofonverweigerung, fehlende Web-Spracherkennung, ChatGPT-Import mit ungültiger/gültiger Antwort, Begrüßungsdialog, Modell-/Profilansicht, echter lokaler OAuth-Listener mit ungültigem Callback und Abbruch sowie die bestehenden Workout-/Planeditorabläufe.
- axe: keine Befunde in den geprüften Regeln auf den geprüften Screens. Breiten 320/375/390/430 ohne horizontalen Überlauf, mobile Assistentenansicht visuell geprüft.
- `git diff --check`: bestanden. Keine zusätzlichen npm-Abhängigkeiten.

Nicht als live bestätigt: persönliche ChatGPT-Anmeldung/Einwilligung, Konto-/Modellfreigabe und tatsächliche Modellantwort, echte Safari-/iPhone-Web-Spracherkennung, Railway/Docker-Deployment. Alle Modellantworten und die Browser-Spracherkennung der automatisierten Tests sind simuliert. Keine kostenpflichtige API-Anfrage und keine Guthaben-Aufladung ausgeführt. Der Nutzer schließt die Anmeldung selbst über „Continue with ChatGPT“ ab. Zusätzliche Guthaben-/Mehrnutzungseinstellungen des ChatGPT-Kontos liegen außerhalb der App und werden in der Oberfläche verlinkt.
