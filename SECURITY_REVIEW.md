# Security Review

Lokale Code- und Testprüfung des MVP. Dies ist kein externer Penetrationstest und keine Bestätigung einer Railway- oder iPhone-Installation.

## Authentifizierung und Zugriff

- Single User mit gesalzenem scrypt-Passworthash, Vergleich mit `timingSafeEqual`; kein Defaultpasswort.
- Zufällige 256-Bit-Sessiontokens; in SQLite liegen nur SHA-256-Hashes. Ablauf nach 30 Tagen. Logout löscht die Server-Session.
- Cookie: HttpOnly, SameSite=Strict, produktiv Secure, Path=/.
- Jede persönliche Seite und jeder persönliche API-Handler prüft die Session serverseitig. Healthcheck gibt nur ok/unavailable aus.
- Globales persistentes Login-Limit: 10 Versuche pro 15 Minuten. Keine Abhängigkeit von manipulierbaren IP-Headern. Ein Angreifer kann die Anmeldung vorübergehend blockieren; vorhandene Sessions bleiben nutzbar.

## Schreibzugriffe und Eingaben

- Alle Mutationen einschließlich Login prüfen Origin gegen die konfigurierte `APP_ORIGIN`. Fehlender oder fremder Origin wird abgelehnt.
- JSON bei strukturierten Nutzdaten, maximal 32 KiB pro Body, Zod-Grenzen für IDs, Mengen, Gewicht, Wiederholungen, RIR und Notiz. Die frühere Transkriptionsroute weist Anfragen inzwischen mit HTTP 410 ab (siehe Phase 10).
- Parametrisierte SQL-Abfragen bzw. Drizzle. React rendert Eingaben als Text, ohne HTML-Injektion.
- Satzversionen verhindern stilles Überschreiben durch alte Fenster; Mutation-IDs verhindern doppelte Anwendung verlorener Antworten.
- Workout-Abschluss prüft alle Satzversionen transaktional. Abgeschlossene Workouts können über die API nicht verändert werden.
- Planänderungen sind transaktional; Workout-Snapshots bleiben unabhängig vom Plan.

## Header und Speicherung

- CSP: Self-only Ressourcen, frame-ancestors none, base-uri self, form-action self. Next.js-Inline-Skripte und Inline-Styles sind erlaubt; die CSP ist damit eine zusätzliche Schutzschicht und kein vollständiger Schutz bei hypothetischer HTML-Injektion.
- X-Frame-Options DENY, nosniff, Referrer-Policy same-origin, deaktivierte Kamera/Geolocation; Mikrofon nur für die eigene Origin und nach Browserfreigabe. HSTS produktiv.
- Persönliche Antworten no-store. Kein Service Worker, IndexedDB, Tracking oder dauerhafter Verlauf im Browser.
- Lokale Recovery enthält nur offene Satzwerte, IDs, Versions-/Retry-Metadaten und Timestamp. Bestätigte Einträge werden entfernt. Logout fragt vor dem Verwerfen noch offener Recovery-Daten nach.
- SQLite mit WAL, Foreign Keys, Busy Timeout und versionierten Migrationen. Railway startet ohne persistenten Volume-Pfad nicht. Historie ist serverseitig paginiert und relevante Abfragen sind indexiert.
- Seeds verweigern Produktion/Railway und bereits befüllte Trainingsdatenbanken.

## Dependency Review

`npm audit` meldete zunächst vier moderate Befunde aus einer alten esbuild-Unterabhängigkeit von drizzle-kit. Gezielter Override auf esbuild 0.25.x behebt diese. Migrationserzeugung, Tests und Build wurden damit erfolgreich erneut geprüft. Abschließendes vollständiges `npm audit` am 02.10.2026: **0 bekannte Sicherheitslücken**. Die konfigurierte Docker-Produktionsruntime enthält keine Entwicklungsabhängigkeiten.

## Nachprüfung am 04.10.2026

Bei der lokalen Einrichtung wurde eine inzwischen eingetragene `eslint-config-next`-Version 14.2.35 gefunden. Sie ist mit ESLint 9 und der verwendeten Flat Config inkompatibel; `npm ci` brach mit ERESOLVE ab. Auf die zu Next.js passende Version 16.3.8 korrigiert.

Das vollständige npm-Audit meldet aktuell **fünf hohe Befunde in einer einzigen Entwicklungs-Abhängigkeitskette**: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`. Ursache ist [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): mögliche Stack-Erschöpfung durch stark verschachtelte Muster. Die Registry bietet derzeit braces 3.0.3 als neueste Version; diese ist betroffen. Der vorgeschlagene Force-Fix stuft die ESLint-Konfiguration inkompatibel auf 14 zurück und wurde nicht angewandt. Der Linter verarbeitet im normalen Projektbetrieb lokale Projektmuster. Die frühere Auditangabe vom 02.10.2026 ist eine historische Momentaufnahme.

Die Produktionsabhängigkeiten wurden separat mit `npm audit --omit=dev` geprüft: **0 bekannte Sicherheitslücken**. `npm ci`, Typecheck, Lint, alle 31 Unit-/Integrationstests und Production Build bestehen unter Node 22.23.3 / npm 10.9.9.

## KI-Assistent – 04.10.2026 (historischer Stand, ersetzt durch Phase 10)

- Alle KI-Routen erfordern eine gültige Session; POST-Anfragen zusätzlich die passende Origin. Der API-Schlüssel bleibt auf dem Server. Die Konfigurationsroute liefert nur die Verfügbarkeit.
- Aufnahme und Modellanfrage sind getrennte, ausdrückliche Aktionen. Transkription sendet Audio; Planerstellung sendet korrigierten Text, ausgefüllte optionale Angaben und maximal 200 Übungsnamen/Muskelgruppen. Keine Trainingshistorie wird angehängt.
- Audio bleibt temporär im Arbeitsspeicher, ohne Dateiablage oder Browserpersistenz. Die Aufnahme endet nach 90 Sekunden oder beim Hintergrundwechsel. Der Server begrenzt den tatsächlichen Stream auf 5 MiB, auch ohne Content-Length, und erlaubt nur unterstützte Audio-MIME-Typen. Aufnahme und Profil haben keinen Local-Storage-Eintrag.
- Persistente Anfragebudgets: Planerstellung 5/15 Minuten und 30/24 Stunden; Transkription 20/15 Minuten und 60/24 Stunden. Externe Anfragen haben einen Timeout und werden nicht automatisch wiederholt. Diese Grenzen ersetzen kein Kostenlimit beim Anbieter.
- Fester OpenAI-Endpunkt, keine Weiterleitungen, strukturierte und erneut validierte Modellantworten. Anbieter-Fehlertexte werden weder an den Browser durchgereicht noch mit Profil-/Audiodaten protokolliert. Responses verwendet `store:false`; dies garantiert keine vollständige Löschung beim Anbieter (siehe README/Data Controls).
- Alle vorgeschlagenen Übungen müssen ausdrücklich angenommen oder abgelehnt werden. Nur angenommene Übungen werden an die Import-Route gesendet und transaktional in der Bibliothek angelegt oder zugeordnet. Der Plan wird erst über „Plan speichern“ persistiert. Vorhandene Editorentwürfe erfordern eine Ersetzungsbestätigung; geänderte KI-Eingaben machen den Vorschlag ungültig.
- Der Prompt untersagt die Ableitung von Trainingsgewichten aus Körpermaßen. Fehlende Gewichte werden sichtbar offengelassen und im Editor als zu prüfender 0-kg-Platzhalter übernommen. Modellvorschläge bleiben vom Nutzer zu prüfen.
- Providerantworten sind in automatisierten Tests simuliert. Live-OpenAI- und echte iPhone-Mikrofonprüfungen stehen aus; dafür wurde kein echter Schlüssel verwendet. Keine zusätzlichen npm-Abhängigkeiten eingeführt.

## Phase 10 – ChatGPT-Abo ohne API-Abrechnung – 05.10.2026

- Produktionscode liest `OPENAI_API_KEY` nicht mehr. Kein API-Key-Fallback und kein Audio-Upload. Die frühere Transkriptionsroute antwortet nach Auth-/Origin-Prüfung mit 410. Tests setzen absichtlich einen Dummy-API-Key, um diese Trennung zu prüfen.
- ChatGPT-Plananfragen brauchen OAuth-Berechtigung `chatgpt.tokens.use.direct` und ein ausgewähltes Kontomodell. Fehlende oder abgelaufene Freigaben und Limits werden als Fehler behandelt. Eine gültige Anmeldung allein reicht nicht.
- Lokale Anmeldung ausschließlich bei Loopback-APP_ORIGIN; auf Railway deaktiviert. Callback-Listener nur an `127.0.0.1`, zufälliger Port, fester Pfad, Host-Prüfung, einmalige State-Bindung, fünf Minuten Lebensdauer und Abbruchmöglichkeit. Frische Nonce und PKCE S256 pro Versuch. Vor Speicherung: Signatur mit OpenAI-JWKS, RS256, Issuer, Audience, Nonce und Ablauf geprüft. Bei erneuter Anmeldung muss der Subject-Wert zur ausgewählten Registrierung passen.
- OAuth-Tokens bleiben in der serverseitigen Datei neben SQLite, atomar geschrieben mit `0600`. Keine Tokens in Browser-Speicher, API-Konfigurationsantworten oder Logs. Git ignoriert den Dateinamen auch bei anderem Datenbankverzeichnis. Die Datei enthält Geheimnisse und gehört nicht in geteilte Backups. Refreshes werden im vorgesehenen einzelnen Node-Prozess serialisiert; Konten/Client-IDs bleiben getrennt. Beim Trennen wird die Remote-Revocation versucht; auch bei Fehler werden lokale Tokens entfernt und ein klarer Hinweis angezeigt.
- Feste öffentliche OpenAI-Endpunkte; keine API-Weiterleitungen. OIDC-Discovery-Endpunkte werden auf die Auth-Origin begrenzt. Modellantworten: begrenzter SSE-Stream, Timeout, `store:false`, `stream:true`, keine automatischen Wiederholungen, Abschlussereignis erforderlich, erneute Schema-Validierung. Späte Abo-Limits und abgebrochene Streams werden nicht als Erfolg gewertet.
- Browserdiktat speichert keine Audiodateien in FitTrack. Browseranbieter kann Audio für seine Spracherkennung verarbeiten; kein Versprechen lokaler Offline-Verarbeitung. Textübernahme erfolgt ausdrücklich. Beim Kopierweg entscheidet der Nutzer selbst, wann er Angaben in ChatGPT einfügt; dort gelten die ChatGPT-Dateneinstellungen.
- Import parst ausschließlich begrenztes JSON; kein HTML und kein Ausführen von Antworten. Die vorhandene Prüfung jedes Übungsvorschlags und der transaktionale Import bleiben erhalten.
- Keine automatische Guthaben-Aufladung durch FitTrack. Eventuelle kostenpflichtige ChatGPT-Guthaben-/Mehrnutzungseinstellungen werden vom Nutzer in ChatGPT verwaltet. Eine absolute Aussage über fremde Kontoeinstellungen wäre nicht möglich.
- OAuth, Modellantworten und Web-Spracherkennung sind überwiegend mit simulierten Antworten geprüft. Echter Konto-Consent, echte Konto-Modellverfügbarkeit und Safari/iPhone-Diktat sind separat manuell zu prüfen. Das lokale Starten/Abbrechen des OAuth-Listeners und die Abweisung gefälschter Callbacks werden im E2E tatsächlich ausgeführt.

## Betrieb und verbleibende manuelle Prüfungen

- HTTPS, korrekte APP_ORIGIN, starker Passwort-Hash, genau eine Instanz und physisch gemountetes Railway-Volume einrichten.
- Echten Railway-Restart und Backup-Wiederherstellung prüfen. Lokaler Prozessabbruchtest bestätigt SQLite-Persistenz, nicht den Railway-Mount.
- Bei Passwortwechsel bestehende Sessions explizit widerrufen (siehe README).
- Echtes iPhone/Safari/PWA prüfen. WebKit-Automation war auf dem verfügbaren Host durch `Unknown setting: PushAPIEnabled` blockiert.
- Docker-Daemon auf diesem Host nicht verfügbar; Dockerfile wurde vorbereitet, der Container-Build hier nicht ausgeführt.

## Phase 11 – Diktat und Fehlerdiagnose – 06.10.2026

- Diktat bleibt einschließlich vorläufiger Wörter im Arbeitsspeicher. Stoppen, Verwerfen, Hintergrundwechsel und Unmount lösen die Erkennung; ein Abschluss-Watchdog verhindert dauerhaft blockierte Eingaben. Keine neue Audio- oder Profildatenpersistenz.
- Direkte und manuelle Modellantworten werden auf 64 KiB begrenzt und gleich validiert. Nur vollständige JSON-Codeblöcke und reine numerische Zeichenketten werden normalisiert. Keine Standardgewichte, Grenzwertkorrekturen oder still entfernten Übungen.
- Fehlerdiagnose zeigt bekannte Fehlercodes und lokale Feldbeschreibungen, keine freien Anbieter-Fehlertexte, Credentials oder Profilwerte. Unbekanntes HTTP 429 bleibt diagnostisch offen. Keine automatischen Wiederholungen, Freigaben oder API-Key-Fallbacks.
- Die bestehende Kostenbarriere ist unverändert. Die neuen Tests verwenden ausschließlich simulierte Erkennung/Modellantworten und eine isolierte Testdatenbank.

## Phase 12 – Prüfansicht für Modellantworten – 06.10.2026

- Auf ausdrücklichen Nutzerwunsch liefert die geschützte Planroute jetzt neben validierten Vorschlägen den öffentlichen Modellantworttext zurück, bei Formatfehlern mit Fehlerstatus. Erfolgs- und Antwortfehler-Payloads sind `no-store`; dieselbe Session-/Origin-Prüfung bleibt aktiv.
- Nur Text-/Refusal-Inhalte öffentlicher Nachrichten werden gesammelt. Reasoning, Toolargumente, Credentials und freie Anbieterfehler werden nicht in die Prüfansicht übernommen. React stellt die Antwort als Textarea-Wert dar, ohne HTML-Ausführung.
- Die Originalantwort wird nicht in Datenbank, Local Storage oder Logs gespeichert. Die Vorschau ist auf 64 KiB begrenzt; Überlänge wird ausdrücklich markiert und blockiert den Import. Vollständiger Stream höchstens 1 MiB, explizites Abschlussereignis erforderlich. Auch formal gültiges JSON aus einem abgebrochenen Stream wird nicht als Plan akzeptiert.
- Ein einzelnes vollständiges JSON-Objekt in umgebendem Text darf extrahiert werden. Keine Auswahl zwischen mehreren Kandidaten, keine Vervollständigung kaputter JSON-Strukturen, keine Korrektur unplausibler Wiederholungen/Gewichte. Engere Grenzen gelten für KI-Vorschläge, nicht rückwirkend für vorhandene manuelle Pläne.
- Eine einzelne neutrale Live-Testanfrage erfolgte über den vorhandenen gültigen ChatGPT-Abo-Zugang, ohne API-Key, Tokenrefresh, Trainingshistorie oder persönliche Profilangaben. Die öffentliche Testantwort ist auf ausdrücklichen Prüfwunsch in `docs/chatgpt-testantwort.json` abgelegt; keine Tokens oder privaten Nutzerantworten. Automatisierte Tests bleiben vollständig simuliert und verwenden eine isolierte Datenbank.

## Phase 13 – Beschreibungen und Videosuche – 07.10.2026

- Ausführungsbeschreibungen sind auf 600 Zeichen begrenzt und werden als Text dargestellt. Speicherung erst für bestätigte Übungsauswahlen; vorhandene nichtleere Beschreibungen werden nicht automatisch überschrieben. Rohdiktat, Profil und abgelehnte Beschreibungen bleiben unpersistiert.
- Neue additive Migration ergänzt `exercises.instructions` mit leerem Default. Keine Änderungen an vorhandenen Übungsnamen, Zuordnungen oder Workout-Snapshots; Trainingsansicht liest die aktuelle Anleitung aus der Bibliothek.
- Videoziele kommen ausschließlich aus einer festen YouTube-Suchadresse mit URL-kodiertem Übungsnamen. Keine Modell-URLs, eingebetteten Medien, automatischen Abrufe oder Video-API-Kosten. Externe Links mit `noopener noreferrer` und `no-referrer`; sie werden erst durch den Nutzer geöffnet.
- Die geschützte Accept-Route erlaubt jetzt höchstens 64 KiB JSON für bestätigte Pläne inklusive Beschreibungen; alle anderen JSON-Routen behalten ihren bisherigen Default von 32 KiB. Authentifizierung, Origin-Prüfung, Schema-Grenzen und transaktionaler Import bleiben aktiv.
