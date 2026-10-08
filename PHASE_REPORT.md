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

## Phase 11 – Vollständiges Diktat, kompakter Prompt und Fitness Minimal – 06.10.2026

Behoben: Beim Stoppen wurde zuvor nur endgültig bestätigter Diktattext übernommen, obwohl vorläufige Wörter bereits sichtbar waren. Jetzt bleibt der sichtbare Text erhalten; späte Korrekturen ersetzen die zugehörigen Segmente. Ein fehlendes Ende-Ereignis blockiert den Editor höchstens zwei Sekunden. Lange Texte werden nicht still abgeschnitten, sondern mit Hinweis zur bestehenden 6.000-Zeichen-Grenze erhalten.

Der Masterprompt wurde auf kurze Regeln gekürzt. Direkte Anfragen senden das strukturierte Schema separat; der Kopierweg erhält eine kompakte Feldbeschreibung ohne ausführliches Beispiel. Beide Wege verwenden dieselbe Antwortprüfung mit begrenzter Formatnormalisierung und konkreten Fehlern je Tag/Übung/Feld. Keine erratenen Gewichte, keine abgeschnittenen Übungen, keine automatischen Modell-Retries.

Die bisherige pauschale Limitmeldung bei HTTP 429 wurde durch Auswertung bekannter OpenAI-Fehlercodes ersetzt. App-Nutzungslimit, vorübergehend nicht prüfbare Abo-Verfügbarkeit, fehlende Berechtigung und Anfragelimit werden unterschieden. Bei unbekanntem Code wird kein ausgeschöpftes Plus-Abo behauptet. Die tatsächliche Ursache der Nutzeranfrage ist ohne deren Anbieterantwort weiterhin unbestätigt.

Marke: „Fitness“ und „Minimal“ stehen im Login und Seitenkopf untereinander. Browser-/PWA-Titel, Verbindungstexte und neue OAuth-Registrierungen verwenden den neuen Namen; Farben und bestehende Datenpfade bleiben erhalten.

Prüfungen: Typecheck, ESLint, **53 Unit-/Integrationstests**, Production Build und **8 Chromium-End-to-End-Tests** bestanden. Regressionen prüfen vorläufige Wörter, verspätete Korrekturen, fehlendes Ende-Ereignis, vollständigen Text bis zur Modellanfrage, Zahlenformate, ungültige Werte sowie HTTP-/SSE-Anbieterfehler. axe ohne Befunde in den geprüften Regeln, mobile Breiten 320/375/390/430 ohne Überlauf; Screenshot visuell geprüft. Keine neuen Abhängigkeiten und keine echten Modellanfragen oder API-Ausgaben.

Offen: echter Mac-/Safari-/iPhone-Sprachdienst sowie tatsächliche ChatGPT-Kontofreigabe und Modellantwort. Browser-Erkennungsqualität/-geschwindigkeit wurde nicht durch einen anderen Sprachdienst ersetzt. Rohtext bleibt im geöffneten Editor, ohne neue dauerhafte Browserablage.

## Phase 12 – Fitmin, Originalantworten und verlässlicheres Planformat – 06.10.2026

Nutzerwunsch: kürzerer Markenname, tatsächliche ChatGPT-Antwort zur Kontrolle, Behebung wiederkehrender JSON-Fehler und bessere Trainingsvorgaben. Gewählter Name: **Fitmin**, Unterzeile **Fitness. Minimal.**; Farben bleiben erhalten.

Implementiert:

- Antworttext wird aus Stream-Deltas, fertigen Textteilen und fertigen Nachrichten gesammelt. Abschlussinhalt hat Vorrang, doppelte Übernahme wird verhindert. Auch bei leerem Abschluss-Output kann der vollständig empfangene Text gelesen werden; ohne expliziten Abschluss kein Planimport.
- Eine einzelne vollständige JSON-Struktur wird auch bei umgebender Einleitung/Codeblock erkannt. Unvollständige, mehrdeutige oder unzulässige Antworten werden nicht erfunden oder still korrigiert.
- „Originalantwort von ChatGPT“ zeigt und kopiert öffentlichen Antworttext bei Erfolg und Fehler. Fehler öffnen die Ansicht automatisch. Kein HTML-Ausführen, keine Reasoning-/Tool-/Credential-Ausgabe, keine dauerhafte Ablage persönlicher Antworten, begrenzte und ausdrücklich markierte Vorschau bei Überlänge.
- Gemeinsamer Masterprompt mit konkreten Standardvorgaben, eindeutigen Einheiten und einem einzelnen kompakten Strukturbeispiel. KI-Grenzen: 1–6 Arbeitssätze, 1–30 Wiederholungen pro Satz, RIR 0–5, 30–300 Sekunden Pause. Die früheren 900 bezeichneten das technische Maximum für Pausensekunden, nicht Wiederholungen. Keine rückwirkende Änderung gespeicherter manueller Pläne.

Prüfungen:

- Typecheck, ESLint, **59 Unit-/Integrationstests** und Production Build bestanden.
- **9 Chromium-End-to-End-Tests bestanden**: neue Originalantwortansicht bei Fehler/Erfolg, Kopieren, Ausblenden, Antworttext ohne HTML-Ausführung, keine automatischen Wiederholungen; bestehende Diktat-/Import-/Workoutabläufe weiterhin grün. Bei der neuen UI-Prüfung wurden ein zu breiter Alert-Selektor und die eindeutige Zuordnung von Label/Antwortfeld korrigiert.
- axe ohne Befunde in den geprüften Regeln. Geprüfte mobile Breiten ohne horizontalen Überlauf; Originalantwort-Screenshot visuell geprüft.
- **Eine echte neutrale Anfrage** über die vorhandene gültige Abo-Verbindung mit dem ausgewählten Modell `gpt-5.6-luna` erfolgreich: Bankdrücken und Rudern am Kabel, jeweils 3 × 8–12, RIR 3, 120 Sekunden Pause, Gewicht null. Kein API-Key, keine automatischen Wiederholungen, kein Tokenrefresh, keine privaten Profilangaben. Unveränderte öffentliche Testantwort: `docs/chatgpt-testantwort.json`.
- `git diff --check` bestanden; keine neuen Abhängigkeiten.

Die ursprünglich fehlgeschlagene Nutzerantwort war nicht gespeichert und ist rückwirkend nicht rekonstruierbar. Die konkrete damalige Ursache ist daher nicht bewiesen. Der neue Ablauf ist mit einer echten Modellantwort und simulierten Format-/Streamfehlern geprüft, garantiert aber nicht, dass jede künftige Modellantwort inhaltlich oder strukturell gültig ist; ungültige Antworten bleiben überprüfbar und werden nicht als Trainingsplan übernommen. Echte Safari-/iPhone-Geräteprüfung bleibt offen.

## Phase 13 – Neue Übungsvorschläge mit Ausführungshilfe – 07.10.2026

Der Masterprompt behandelt die Bibliothek jetzt ausdrücklich als Referenz, nicht als Auswahllimit. Auch ohne vorhandene Übungen darf das Modell etablierte Übungen passend zu Ziel, Trainingstagen und Equipment vorschlagen. Jede neue Antwort soll eine kurze deutsche Ausführungsbeschreibung enthalten; ältere importierte Antworten ohne dieses Feld bleiben lesbar.

Vorschlagskarten unterscheiden vorhandene und neue Übungen. Beschreibung und eine klar bezeichnete YouTube-Videosuche sind direkt sichtbar. Die App erzeugt Suchlinks selbst aus dem Übungsnamen; es werden keine vom Modell erfundenen Video-Adressen übernommen. Suchergebnisse sind keine geprüften Einzelvideos oder eingebetteten Animationen. Dafür erfolgen keine zusätzlichen API-Aufrufe.

Nur bestätigte Vorschläge werden gespeichert. Beschreibungen bleiben im Planeditor, Training und Übungsverlauf verfügbar. Bestehende eigene Beschreibungen werden nicht überschrieben; leere Beschreibungen können durch bestätigte Vorschläge ergänzt werden. Auch beim manuellen Anlegen gibt es ein optionales Beschreibungsfeld. Migration `0006_bored_caretaker.sql` ergänzt die bestehende Bibliothek um dieses Feld und wurde nach den Prüfungen erfolgreich auf die lokale Datenbank angewendet.

Prüfungen:

- Typecheck, ESLint, **62 Unit-/Integrationstests** und Production Build bestanden.
- **9 Chromium-End-to-End-Tests bestanden**, einschließlich neuer Übungen ohne vorherigen Bibliothekseintrag, Beschreibung und Videosuche, Speicherung erst nach Bestätigung sowie erneutem Öffnen des gespeicherten Plans.
- Regressionen prüfen die additive Migration mit vorhandenen Daten, Erhalt eigener Beschreibungen, ältere JSON-Antworten, Beschreibungsgrenzen und sichere Suchlinks.
- axe ohne Befunde in den geprüften Regeln; mobile Breiten 320/375/390/430 ohne horizontalen Überlauf. Assistenten-Screenshot visuell geprüft.
- `git diff --check` bestanden; keine neuen npm-Abhängigkeiten.

Für diese Erweiterung wurde keine echte Modellanfrage ausgeführt; die neuen Modellantworten in den Tests sind simuliert. Die tatsächliche Qualität der Beschreibungen sowie reale Mobilgeräte und externe Videosuche bleiben manuell zu prüfen. Die frühere Live-Anfrage aus Phase 12 ist keine Live-Prüfung des erweiterten Prompts.

## Phase 14 – Ernährungstagebuch – 07.10.2026

Implementiert und vor Beginn der Beratung geprüft: Mahlzeiten per Text oder bestehendem Browserdiktat, Datum und Mahlzeitentyp, optionale eigene Kalorien sowie KI-Schätzung mit Spanne, Portionsannahmen und Rückfragen bei fehlenden Mengen. Speicherung erst nach Bestätigung; Bearbeiten/Löschen mit Versionsprüfung. Tageswerte entstehen aus gespeicherten Einträgen, unbekannte Kalorien und nicht protokollierte Tage bleiben ausdrücklich unbekannt. Navigation „Tagebuch“ mit Essen und Verweis auf bisherige Trainingseinträge. Migration 0007 ergänzt eine separate Mahlzeitentabelle.

Der bestehende Abo-Transport wurde für strukturierte Antworten wiederverwendbar gemacht; Planantworten und ihre Fehlerschutzmechanismen bleiben regressionsgeprüft. Auch Ernährung unterstützt Kopier-/Importweg und sichtbare Originalantworten. Keine kostenpflichtige API und keine zusätzliche Abhängigkeit.

Typecheck, ESLint, **66 Unit-/Integrationstests**, Production Build und **10 Chromium-End-to-End-Tests** bestanden. Die Erweiterung der Testsuite erforderte ein isoliertes Login-Budget pro Test in der temporären Datenbank; das produktive Login-Limit wurde nicht geändert. axe ohne Befunde und mobile Breiten 320/375/390/430 ohne Überlauf in der Tagebuchprüfung. Neue Modellantworten sind simuliert; keine echte Ernährungsanfrage oder echte Geräte-Spracherkennung getestet.

## Phase 15 – Beratung mit Zusammenfassung und Rückfragen – abgeschlossen 08.10.2026

Nach bestandener Phase 14 implementiert: eigene Beratungsseite mit freiwilligem Fokus, wählbarem Siebentageszeitraum und optionaler Trainingsanzahl/-dauer. Eine zunächst nur lokal vorbereitete, gespeicherte Zusammenfassung wird vor dem KI-Aufruf vollständig angezeigt. Sie enthält Tagesaggregate, unbekannte Kalorien, begrenzte Mahlzeitenausschnitte und Annahmen; keine Trainingsnotizen oder einzelnen Sätze. Fehlende Mahlzeiten/Tage bleiben unbekannt. Erst „Feedback anfordern“ oder das eigene Kopieren nach ChatGPT überträgt die Daten.

Gültiges Feedback und Fragen werden dauerhaft als Gespräch gespeichert. Rückfragen verwenden dieselbe eingefrorene Grundlage und die bisherigen Frage-/Antwortpaare. Sechs Antworten pro Gespräch begrenzen den Kontext ohne stilles Abschneiden. Neue Einträge erfordern eine neue Beratung. Versionsprüfungen und Transaktionen verhindern das Überschreiben konkurrierender Antworten. Gespräche lassen sich mit ihren Antworten und der Zusammenfassung löschen; Tagebucheinträge bleiben davon unberührt. Die Oberfläche erklärt, dass ältere Zusammenfassungen Kopien enthalten und lokale Löschung keine Anbieter-Löschung ist.

Abschlussprüfung:

- Typecheck, ESLint, **70 Unit-/Integrationstests** und Production Build bestanden.
- **11 Chromium-End-to-End-Tests bestanden**: Vorbereitung ohne Modellaufruf, vollständige Vorschau, persistentes Feedback, Rückfragen mit vorherigem Kontext, Neuladen, Versionskonflikt, Gesprächslöschung, Text statt HTML-Ausführung sowie bestehende Plan-/Workoutabläufe.
- Tagebuch-Diktat zusätzlich im Browser mit simuliertem Sprachdienst geprüft: vorläufige Wörter bleiben beim Stoppen erhalten und werden vollständig in die Essensbeschreibung übernommen; kein Audio-Upload.
- axe ohne Befunde auf den geprüften Screens, mobile Breiten 320/375/390/430 ohne horizontalen Überlauf. Tagebuch- und Beratungsscreenshots visuell geprüft. Das vorbefüllte Beratungsfragenfeld erhielt nach einem Browserbefund eine explizite Label-Zuordnung.
- `git diff --check` bestanden. Keine neuen npm-Abhängigkeiten. Migrationen 0007/0008 am 08.10.2026 erfolgreich auf der lokalen Datenbank angewendet; bestehende Tabellen werden nicht gelöscht oder ersetzt.

Keine echte Modellanfrage für Ernährung/Beratung ausgeführt, kein API-Key verwendet. Modellantworten und Diktat sind in den Tests simuliert. Reale Schätz-/Beratungsqualität und echte Mobilgeräte-Spracherkennung bleiben manuell zu prüfen; Details stehen im manuellen Testplan. Die Umsetzung nutzt die bestehende Abo-Verbindung bzw. den Kopier-/Importweg ohne kostenpflichtigen API-Fallback.
