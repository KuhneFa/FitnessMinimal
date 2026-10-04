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
- JSON bei strukturierten Nutzdaten, maximal 32 KiB pro Body, Zod-Grenzen für IDs, Mengen, Gewicht, Wiederholungen, RIR und Notiz. Die Transkriptionsroute akzeptiert separat begrenzte Audiodaten (siehe KI-Assistent).
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

## KI-Assistent – 04.10.2026

- Alle KI-Routen erfordern eine gültige Session; POST-Anfragen zusätzlich die passende Origin. Der API-Schlüssel bleibt auf dem Server. Die Konfigurationsroute liefert nur die Verfügbarkeit.
- Aufnahme und Modellanfrage sind getrennte, ausdrückliche Aktionen. Transkription sendet Audio; Planerstellung sendet korrigierten Text, ausgefüllte optionale Angaben und maximal 200 Übungsnamen/Muskelgruppen. Keine Trainingshistorie wird angehängt.
- Audio bleibt temporär im Arbeitsspeicher, ohne Dateiablage oder Browserpersistenz. Die Aufnahme endet nach 90 Sekunden oder beim Hintergrundwechsel. Der Server begrenzt den tatsächlichen Stream auf 5 MiB, auch ohne Content-Length, und erlaubt nur unterstützte Audio-MIME-Typen. Aufnahme und Profil haben keinen Local-Storage-Eintrag.
- Persistente Anfragebudgets: Planerstellung 5/15 Minuten und 30/24 Stunden; Transkription 20/15 Minuten und 60/24 Stunden. Externe Anfragen haben einen Timeout und werden nicht automatisch wiederholt. Diese Grenzen ersetzen kein Kostenlimit beim Anbieter.
- Fester OpenAI-Endpunkt, keine Weiterleitungen, strukturierte und erneut validierte Modellantworten. Anbieter-Fehlertexte werden weder an den Browser durchgereicht noch mit Profil-/Audiodaten protokolliert. Responses verwendet `store:false`; dies garantiert keine vollständige Löschung beim Anbieter (siehe README/Data Controls).
- Alle vorgeschlagenen Übungen müssen ausdrücklich angenommen oder abgelehnt werden. Nur angenommene Übungen werden an die Import-Route gesendet und transaktional in der Bibliothek angelegt oder zugeordnet. Der Plan wird erst über „Plan speichern“ persistiert. Vorhandene Editorentwürfe erfordern eine Ersetzungsbestätigung; geänderte KI-Eingaben machen den Vorschlag ungültig.
- Der Prompt untersagt die Ableitung von Trainingsgewichten aus Körpermaßen. Fehlende Gewichte werden sichtbar offengelassen und im Editor als zu prüfender 0-kg-Platzhalter übernommen. Modellvorschläge bleiben vom Nutzer zu prüfen.
- Providerantworten sind in automatisierten Tests simuliert. Live-OpenAI- und echte iPhone-Mikrofonprüfungen stehen aus; dafür wurde kein echter Schlüssel verwendet. Keine zusätzlichen npm-Abhängigkeiten eingeführt.

## Betrieb und verbleibende manuelle Prüfungen

- HTTPS, korrekte APP_ORIGIN, starker Passwort-Hash, genau eine Instanz und physisch gemountetes Railway-Volume einrichten.
- Echten Railway-Restart und Backup-Wiederherstellung prüfen. Lokaler Prozessabbruchtest bestätigt SQLite-Persistenz, nicht den Railway-Mount.
- Bei Passwortwechsel bestehende Sessions explizit widerrufen (siehe README).
- Echtes iPhone/Safari/PWA prüfen. WebKit-Automation war auf dem verfügbaren Host durch `Unknown setting: PushAPIEnabled` blockiert.
- Docker-Daemon auf diesem Host nicht verfügbar; Dockerfile wurde vorbereitet, der Container-Build hier nicht ausgeführt.
