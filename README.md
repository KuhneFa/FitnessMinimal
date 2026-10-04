# FitTrack

Mobile Trainings-App für eine Person. Next.js, TypeScript, Tailwind, SQLite und Drizzle. Persönliche Daten werden auf dem Server gespeichert. Kein Service Worker, kein API-Cache, keine lokale Historien-Datenbank.

## Lokal starten

1. Node.js 22 verwenden, passend zu `.nvmrc` und Dockerfile. Bei eingerichtetem nvm im Projektordner `nvm install` und `nvm use` ausführen.
2. `npm ci` ausführen. Das installiert die Versionen aus dem Lockfile lokal ins Projekt.
3. `.env.example` nach `.env` kopieren. `npm run password:hash` ausführen und den erzeugten `PASSWORD_HASH` in `.env` eintragen (mindestens 12 Zeichen verwenden). Auf Railway denselben Hash als Variable setzen, kein Klartextpasswort.
4. `npm run db:migrate`
5. `npm run dev` und http://localhost:3000 öffnen.

**macOS / `nvm: command not found`:** Der Node Version Manager wird als Shell-Funktion geladen. Ein Python-venv ist für dieses Projekt nicht erforderlich; `pip install nvm` installiert ein anderes, gleichnamiges Python-Paket. Bei einer Homebrew-Installation muss nvm zusätzlich entsprechend den [Homebrew-Hinweisen](https://formulae.brew.sh/formula/nvm) in `~/.zshrc` eingebunden werden. Danach ein neues Terminal öffnen oder `source ~/.zshrc` ausführen. `nvm --version` prüft die Einrichtung. Bei einem neuen Terminal im Projektordner `nvm use` ausführen, bevor du npm verwendest.

**Versionskonflikt bei npm:** `eslint-config-next` muss zum eingesetzten Next.js 16 passen. Der Auditvorschlag `npm audit fix --force` würde beim aktuellen braces-Befund eine inkompatible Version 14 installieren. Daher nicht ungeprüft ausführen; der aktuelle Befund und seine Reichweite stehen im [Security Review](SECURITY_REVIEW.md).

Optional **vor dem ersten Plan** `npm run db:seed` ausführen. Der lokale Seed erzeugt Upper / Lower mit acht Übungen, überschreibt nichts und ist auf Railway/in Produktion gesperrt. Für echte Daten eine separate Datenbank verwenden; der Seed legt keine erfundene Trainingshistorie an.

Double Progression verwendet das letzte abgeschlossene Training derselben Übung, auch über verschiedene Trainingstage hinweg. Alle geplanten Sätze müssen bei identischem Gewicht mindestens die obere Wiederholungsgrenze und das Ziel-RIR erreichen. Dann wird der konfigurierte Gewichtsschritt addiert. Sonst bleibt das Gewicht des ersten abgeschlossenen Satzes erhalten; ohne Historie gilt das Startgewicht im Plan. Änderungen an Planwerten verändern keine laufenden oder historischen Workout-Snapshots.

## Plan per Sprache und KI erstellen

Unter **Pläne → Neuer Plan** (auch beim Bearbeiten) gibt es jetzt einen Planassistenten:

1. Wünsche eintippen oder **Einsprechen → Aufnahme stoppen → Aufnahme transkribieren** wählen. Mikrofonfreigabe erteilen; auf dem iPhone die HTTPS-Adresse verwenden. Lokal ist `localhost` möglich. Aufnahme endet nach 90 Sekunden oder beim Wechsel in den Hintergrund.
2. Erkannten Text prüfen und bei Bedarf korrigieren. Alter, Größe, Körpergewicht, Trainingsfokus, Erfahrung und Trainingstage sind freiwillig. Diese Angaben können auch direkt im gesprochenen Text stehen.
3. **Vorschläge erstellen** sendet die Angaben und bis zu 200 vorhandene Übungsnamen/Muskelgruppen an OpenAI. Trainingshistorie wird nicht übertragen.
4. Jede vorgeschlagene Übung **annehmen oder ablehnen**. Ohne Entscheidung für alle Übungen ist die Übernahme gesperrt. Abgelehnte Übungen werden nicht angelegt. Bereits vorhandene Übungen mit gleichem normalisiertem Namen werden wiederverwendet.
5. **Auswahl in den Plan übernehmen** erstellt bei Bedarf die bestätigten Übungen in der Bibliothek und füllt den Editor. Ein vorhandener Entwurf wird nur nach Bestätigung ersetzt. **Plan speichern** speichert anschließend den Trainingsplan. Bestehende Workouts bleiben unverändert.

Es werden keine Trainingsgewichte aus Körpermaßen geschätzt. Ohne ausdrücklich genanntes Übungsgewicht bleibt es im Vorschlag offen und wird im Editor als **0 kg Platzhalter** übernommen. Vor dem ersten Training passend einstellen.

### OpenAI einrichten

Serverseitig in `.env` bzw. den Railway-Service-Variablen ergänzen und den Server neu starten:

```dotenv
OPENAI_API_KEY=DEIN_OPENAI_API_SCHLUESSEL
OPENAI_PLAN_MODEL=gpt-4.1-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
```

Der Schlüssel wird niemals an den Browser ausgeliefert. Ohne Schlüssel bleibt der manuelle Editor nutzbar; KI und Aufnahme sind deaktiviert. Der API-Zugang benötigt ein verfügbares Kontingent. Beide Modelle sind konfigurierbar; das Planmodell muss Responses API und Structured Outputs unterstützen.

FitTrack verarbeitet Audio nur im Arbeitsspeicher (max. 5 MiB / 90 Sekunden Aufnahme), ohne Dateien, IndexedDB oder Local Storage. Nach erfolgreicher Transkription, Verwerfen oder Verlassen der Seite wird die Browserkopie freigegeben. Bei einem Übertragungsfehler bleibt sie nur bis zum erneuten Senden oder Verwerfen im aktuellen Tab. Profildaten, Rohtext und abgelehnte Entwürfe werden nicht in SQLite gespeichert. Nur ausdrücklich übernommene Übungen und gespeicherte Pläne bleiben dauerhaft erhalten.

Modellantworten werden mit `store:false` angefordert. Das ist keine Zusicherung vollständiger Datenlöschung beim Anbieter; für dessen Verarbeitung und mögliche Aufbewahrung gelten die [OpenAI Data Controls](https://developers.openai.com/api/docs/guides/your-data). Implementierung anhand der offiziellen Dokumentation für [Transkription](https://developers.openai.com/api/docs/guides/speech-to-text) und [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

Kostenbegrenzung pro Single-User-Installation: maximal 5 Plananfragen / 15 Minuten und 30 / 24 Stunden; maximal 20 Transkriptionen / 15 Minuten und 60 / 24 Stunden. Kein automatischer Retry kostenpflichtiger Anfragen. Für einen harten Ausgabenrahmen zusätzlich ein Limit beim Anbieter einrichten.

## Prüfungen

`npm run check` führt Typecheck, ESLint, automatisierte Tests und Production Build in dieser Reihenfolge aus. Migrationen liegen versioniert unter `drizzle/`; neue Änderungen mit `npm run db:generate` erzeugen. Niemals eine angewandte Migration ändern.

Browserprüfung nach dem Build: `npx playwright install chromium`, dann `npm run test:e2e`. Die Tests verwenden eine automatisch erzeugte temporäre Datenbank mit Demo-Plan; echte lokale Daten werden nicht verwendet. Enthalten sind Login/Logout, Zugriffsschutz, Offline-Recovery, verlorene Speicherantwort, Timer, Abschluss, Progression, Planeditor und axe-Accessibility-Prüfung. WebKit optional auf kompatiblem Host: `npx playwright install webkit` und `TEST_WEBKIT=1 npm run test:e2e`.

[Manuelle Checkliste](MANUAL_TEST_PLAN.md) · [Phasen-Prüfprotokoll](PHASE_REPORT.md) · [Security Review](SECURITY_REVIEW.md)

## Speicher und Nutzung

Die PWA benötigt Internet zum Öffnen von Seiten. Ein bereits geöffnetes Workout hält ausschließlich offene Eingaben als kleine Recovery-Kopie in `localStorage`, keine Pläne oder Historie. Sobald der Server bestätigt, werden synchronisierte Einträge entfernt. Die Oberfläche unterscheidet ausstehende und bestätigte Speicherung. Bitte vor dem Schließen auf **„Alle Änderungen gespeichert“** achten: Mobile Betriebssysteme garantieren keine Hintergrundausführung. Bei widersprüchlichen Änderungen aus zwei Fenstern wird ein Konflikt angezeigt statt still überschrieben.

Es gibt keinen Service Worker, kein IndexedDB, keine Bilder-/Audiosammlung, keine externen Fonts und keine Analytics. PWA-Icons zusammen unter 20 KB; persönliche Antworten sind `no-store`. Historie und Übungsverlauf werden in Seiten mit je 20 Trainings vom Server geladen. Der Timer zeigt nach Wiederaufnahme die tatsächliche Restzeit, verspricht aber keine Hintergrundalarme.

## Railway

Dockerfile verwenden, genau **eine Instanz** betreiben und ein Volume unter `/data` anhängen. `DATABASE_PATH=/data/fittrack.db` und `APP_ORIGIN=https://DEINE-DOMAIN` setzen. Railway stellt `RAILWAY_VOLUME_MOUNT_PATH` bereit. Der Start führt Migrationen aus. Ohne Volume oder bei einem Datenbankpfad außerhalb des Volumes wird der Start auf Railway abgebrochen.

Für die erste Bereitstellung:

1. Dieses Repository als Railway-Service mit Dockerfile verbinden.
2. Im Service ein persistentes Volume hinzufügen, Mount Path `/data`.
3. Öffentliche HTTPS-Domain erzeugen. `APP_ORIGIN` auf exakt diesen Ursprung setzen, ohne abschließenden Schrägstrich und ohne Unterpfad.
4. `DATABASE_PATH=/data/fittrack.db` und den lokal erzeugten `PASSWORD_HASH` als Service-Variablen setzen.
5. Deploy starten. Im Log `Database migrated: /data/fittrack.db` prüfen; Healthcheck muss erfolgreich sein.
6. Domain öffnen, anmelden, Testplan anlegen und den **kritischen Railway-Restart-Test** aus der manuellen Checkliste durchführen.

Das Docker-Runtime-Image enthält nur Produktionsabhängigkeiten. Der Server verwendet Railways `PORT`. Keine Replikate, kein schreibender Parallelbetrieb mehrerer Instanzen mit derselben SQLite-Datei. Die Railway-Bereitstellung und der physische Volume-Mount müssen in deiner Umgebung geprüft werden; sie werden durch die lokale Testausführung nicht bestätigt.

Healthcheck: `/api/health`. Der Endpoint prüft den Datenbankzugriff, gibt aber keine internen Pfade oder persönlichen Daten aus. Der Start-Log nennt den tatsächlich verwendeten Datenbankpfad. Kein Datenbankzugriff beim Build erforderlich.

Produktiv ausschließlich HTTPS verwenden. Sessions gelten 30 Tage, Logout widerruft sie sofort. Login ist global auf 10 Versuche pro 15 Minuten begrenzt (Single User); manipulierte IP-Header umgehen das Limit nicht. Bei einer Passwortänderung bestehende Sessions mit `DELETE FROM sessions` über einen vertrauenswürdigen SQLite-Zugang löschen. Die CSP erlaubt Next.js-Inline-Skripte; Benutzereingaben werden ausschließlich als escapeter Text dargestellt. Keine HTML-Eingaben oder externen Skripte.

SQLite-WAL benötigt die Datenbank und ihre `-wal`/`-shm` Dateien im selben persistenten Verzeichnis. Für konsistente Backups SQLite-Backup verwenden oder den Dienst vor einer Dateikopie stoppen. Railway-Volume-Backups einrichten und Wiederherstellung separat prüfen. Ein persistentes Volume ersetzt kein Backup.

Grundlagen: [Next.js Installation](https://nextjs.org/docs/app/getting-started/installation), [Drizzle SQLite](https://orm.drizzle.team/docs/sqlite/get-started-sqlite), [Railway Volumes](https://docs.railway.com/volumes).
