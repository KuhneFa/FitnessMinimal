# Fitmin

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

## Plan mit ChatGPT-Abo erstellen – ohne API-Abrechnung

Fitmin verwendet **keinen OpenAI-API-Key mehr**, auch wenn noch `OPENAI_API_KEY` in deiner `.env` steht. Es gibt keinen automatischen Wechsel zu einer kostenpflichtigen API. Die bisherige Audio-Upload-Route ist gesperrt, auch für alte geöffnete Tabs. Nach Aktualisierung den Entwicklungsserver neu starten und den Planeditor neu laden.

### Direkt mit deinem ChatGPT-Abo verbinden (lokal)

1. Fitmin auf deinem Mac unter `http://localhost:3000` öffnen und anmelden. `APP_ORIGIN` muss zur lokalen Adresse passen.
2. Im Planeditor **Continue with ChatGPT** wählen. Den anschließend angezeigten Anmeldelink auf **demselben Mac** öffnen, auf dem der Fitmin-Server läuft.
3. In ChatGPT anmelden und die Abo-Nutzung für **Fitmin** freigeben. Die Zugangsdaten werden ausschließlich bei OpenAI eingegeben. Berechtigung und Verfügbarkeit hängen von deinem Konto und der OpenAI-Vorschau ab.
4. Zu Fitmin zurückkehren, den einmaligen Hinweis bestätigen und ein Modell aus der Liste deines Kontos wählen. Die Auswahl wird in der Verbindung gespeichert.
5. Trainingswünsche diktieren oder eintippen, optionale Profilfelder ergänzen und **Vorschläge erstellen** wählen.

Unter **ChatGPT-Nutzung verwalten** die Freigabe, Abo-Limits und eventuelle Nutzung zusätzlich gekauften Guthabens prüfen. Fitmin kauft kein Guthaben und nutzt keine API-Abrechnung. Die Abo-Nutzung wird mit anderen verbundenen Apps geteilt. Einstellungen für bezahlte Mehrnutzung oder Nachladen werden in ChatGPT verwaltet und können von Fitmin nicht zugesichert oder verändert werden.

Eine Limitmeldung bei der ersten Anfrage beweist kein verbrauchtes Plus-Abo. Die App unterscheidet bekannte Fehlercodes für App-/Abo-Nutzungslimits, vorübergehend nicht prüfbare Verfügbarkeit, fehlende Berechtigung und Anfragelimits. Bei unbekanntem HTTP 429 bleibt die Ursache ausdrücklich offen. Es gibt weder automatische Wiederholungen noch einen API-Key-Fallback. Siehe [OpenAI: Errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery). Bestehende ChatGPT-Freigaben können weiterhin den früheren Namen „FitTrack“ anzeigen; neue Registrierungen verwenden „Fitmin“.

Die Anbindung verwendet den offiziellen [Sign-in-with-ChatGPT-Ablauf](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), nicht vorhandene Codex-Zugangsdaten oder private ChatGPT-Endpunkte. Anmeldung mit State, Nonce, PKCE, geprüftem ID-Token und getrennten Kontoregistrierungen. OAuth-Zugangsdaten liegen atomar gespeichert mit Dateirechten `0600` in `chatgpt-connection.json` neben der SQLite-Datenbank und sind von Git ausgeschlossen. Host-ID und Kontozuordnung bleiben nach Trennen erhalten; lokale Tokens werden entfernt. Bei nicht bestätigbarer serverseitiger Trennung zusätzlich Fitmin in den ChatGPT-Einstellungen entfernen. Nur eine Fitmin-Serverinstanz mit diesem Datenverzeichnis betreiben.

**Lokale Einschränkung:** Die direkte Verbindung ist absichtlich auf eine lokale HTTP-Origin beschränkt; auf Railway bzw. einer öffentlichen Domain ist sie deaktiviert. Die [offizielle Dokumentation](https://developers.openai.com/siwc/token-sharing-open-source) unterscheidet lokale/Open-Source-Projekte und gehostete Angebote. Für die gehostete Version funktioniert der folgende Import ohne eigene Modell-API. Ein iPhone kann die Loopback-Anmeldung des Macs nicht selbst abschließen.

### ChatGPT über Kopieren und Import nutzen (auch auf dem iPhone)

1. Im Planeditor Wünsche und freiwillige Angaben erfassen.
2. **Über ChatGPT kopieren & importieren → ChatGPT-Anfrage vorbereiten** wählen. Dabei wird noch nichts an einen Modellanbieter gesendet.
3. **Anfrage kopieren**, ChatGPT öffnen und dort mit deinem vorhandenen Abo einfügen. Die Anfrage enthält die erforderliche Antwortstruktur und bis zu 200 vorhandene Übungsnamen/Muskelgruppen.
4. Die vollständige JSON-Antwort zurück in **Antwort aus ChatGPT** kopieren und **Vorschlag prüfen** wählen. JSON mit einem Markdown-Codeblock wird ebenfalls akzeptiert; ungültige oder unvollständige Inhalte werden abgelehnt.
5. Jede Übung einzeln **annehmen oder ablehnen**, anschließend die Auswahl übernehmen und den Plan speichern. Beim Kopieren in ChatGPT gelten dessen Chatverlauf- und Dateneinstellungen.

### Spracheingabe

**Einsprechen → Diktieren stoppen → Text übernehmen** nutzt die eingebaute Spracherkennung des Browsers. Der Text kann vor dem Übernehmen korrigiert werden. Fitmin lädt keine Audiodatei hoch und nutzt keine Transkriptions-API. Je nach Browser kann dessen Spracherkennung Audio an den Browseranbieter senden; sie ist nicht als rein offline zugesichert. Diktieren endet nach spätestens 90 Sekunden oder bei Hintergrundwechsel.

Beim Stoppen bleiben auch sichtbare vorläufige Wörter erhalten. Abschließende Korrekturen werden bis zum Ende-Ereignis, höchstens zwei Sekunden lang, übernommen; danach ist der Text editierbar. Lange Diktate werden nicht abgeschnitten: Über 6.000 Zeichen bleibt der gesamte Text stehen und muss vor der Modellanfrage gekürzt werden. Text bleibt im geöffneten Editor bis zum Verwerfen/Übernehmen, nicht über Neuladen oder Schließen hinweg. Erkennungsqualität und Reaktionszeit hängen weiterhin vom Browser/Sprachdienst ab. Audio direkt über die Abo-Verbindung zu senden wird von diesem [OpenAI-Ablauf nicht unterstützt](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).

Der gemeinsame Masterprompt unterscheidet Standardvorgaben, Einheiten und zulässige Grenzen. Ein einzelnes kurzes JSON-Formbeispiel zeigt die Verschachtelung; die direkte Verbindung überträgt zusätzlich das strikte Schema. Wiederholungen gelten pro Satz, `rest` bezeichnet ausschließlich Sekunden Pause. KI-Vorschläge erlauben 1–6 Arbeitssätze, 1–30 Wiederholungen, RIR 0–5 und 30–300 Sekunden Pause. Diese Grenzen sind keine Empfehlungen; vorhandene manuelle Pläne behalten ihre Werte. Standardvorgaben und Kontextregeln stehen in [plan-prompt.ts](src/lib/plan-prompt.ts).

Beide Wege prüfen Antworten identisch. Ein einzelnes vollständiges JSON-Objekt kann auch aus einer Antwort mit Einleitung/Codeblock gelesen werden. Mehrdeutige, abgeschnittene oder unplausible Antworten werden nicht geraten oder als Teilplan übernommen. Reine Zahlenzeichenketten (auch Dezimalkomma) werden normalisiert; ungültige Angaben konkret mit Feld/Tag/Übung gemeldet.

Unter **Originalantwort von ChatGPT** lässt sich der empfangene Antworttext unverändert ansehen und kopieren, auch bei Fehlern. Bei Fehlern öffnet sich die Ansicht automatisch. Nur öffentlicher Antworttext wird angezeigt, keine internen Denk-, Tool-, Anbieterfehler- oder Zugangsdaten. Die Anzeige bleibt nur im geöffneten Editor und wird beim nächsten Generieren, Übernehmen oder Ausblenden entfernt. Überlange Antworten werden als gekürzter Ausschnitt gekennzeichnet und nicht importiert.

Die Streamauswertung sammelt Text-Deltas, fertige Textteile und fertige Nachrichten ohne doppelte Übernahme. Ein explizites Abschlussereignis bleibt Voraussetzung für einen Plan; unvollständige/fehlgeschlagene Antworten bleiben nur zur Kontrolle sichtbar. Eine neutrale Live-Testanfrage über das bereits verbundene Modell `gpt-5.6-luna` wurde am 06.10.2026 erfolgreich validiert: [unveränderte Testantwort](docs/chatgpt-testantwort.json). Diese Datei enthält ausschließlich den neu erzeugten Testplan, nicht die zuvor fehlgeschlagene Nutzerantwort.

Falls die Web-Spracherkennung fehlt oder der Mikrofonzugriff verweigert wird, in das Textfeld tippen und das Mikrofon der iPhone-/Mac-Tastatur verwenden oder den Text eingeben. Das funktioniert unabhängig von der ChatGPT-Verbindung. Die direkte ChatGPT-Abo-Anbindung unterstützt laut [Preview-Einschränkungen](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) keine Transkriptions-API.

### Neue Übungen und Ausführungshilfe

Beschreibe Ziel, Häufigkeit und verfügbares Equipment; du musst keine Übungen auswendig kennen oder vorher anlegen. Die Bibliothek dient als Referenz für bereits vorhandene Namen. ChatGPT darf passende etablierte Übungen außerhalb der Bibliothek vorschlagen, auch wenn sie noch leer ist. Vorschlagskarten kennzeichnen vorhandene und neue Übungen. Erst nach deinen Einzelentscheidungen und **Auswahl in den Plan übernehmen** werden angenommene neue Übungen angelegt.

Jeder neue KI-Vorschlag enthält eine kurze Ausführungsbeschreibung getrennt von der Begründung. Unter **Ausführung & Video** gibt es außerdem einen Link zur YouTube-Suche nach Übungsname und Technik. Der Link wird von der App gebildet, nicht vom Modell erfunden. Es handelt sich um Suchtreffer, nicht um ein geprüftes Einzelvideo oder eine eingebettete Animation. Erst beim Öffnen des Links wird YouTube aufgerufen; keine Video-API oder zusätzlichen Modellaufrufe.

Bestätigte Beschreibungen werden bei der Übung gespeichert und im Planeditor, beim Training und im Übungsverlauf angezeigt. Vorhandene eigene Beschreibungen werden nicht überschrieben; bislang leere Beschreibungen können mit bestätigten Vorschlägen ergänzt werden. Bei manuell angelegten Übungen ist eine eigene Kurzbeschreibung optional. Ältere importierte Antworten ohne Beschreibung bleiben nutzbar und bieten weiterhin die Videosuche.

Die additive Migration `0006_bored_caretaker.sql` ergänzt vorhandene Übungen um eine anfangs leere Beschreibung. Wie alle Migrationen wird sie beim Öffnen der Datenbank angewendet; bei einem bereits laufenden Entwicklungsserver einmal `npm run db:migrate` ausführen und den Server neu starten.

### Vorschläge prüfen und speichern

Jede vorgeschlagene Übung braucht eine Entscheidung. Nur angenommene Übungen werden beim Übernehmen in der Bibliothek angelegt oder anhand ihres normalisierten Namens wiederverwendet. Der Plan wird anschließend mit **Plan speichern** gespeichert. Vorhandene Editorentwürfe brauchen eine Ersetzungsbestätigung. Geänderte Wünsche, Profildaten oder ChatGPT-Konten/Modelle sperren einen veralteten Vorschlag.

Ohne genanntes Übungsgewicht bleibt das Startgewicht offen und wird im Editor als **0 kg Platzhalter** übernommen. Vor dem ersten Training passend einstellen. Es werden keine Trainingsgewichte aus Körpermaßen geschätzt.

Rohtext, Profil und abgelehnte Vorschläge werden in Fitmin nicht dauerhaft gespeichert. Direkte Modellanfragen verwenden `store:false` und werden erst nach bestätigtem Abschluss des Datenstroms akzeptiert; Anbieter-Datenregeln gelten zusätzlich. Pro Instanz maximal fünf direkte Vorschlagsanfragen in 15 Minuten und 30 in 24 Stunden; keine automatischen Modell-Retries. Bei Abo-Limit, fehlender Freigabe oder Fehler bleibt die Eingabe erhalten. Der lokale Kopier-/Importweg benötigt keine Modellanfrage durch Fitmin.

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

### Ernährungstagebuch

Unter **Tagebuch → Essen** lassen sich Mahlzeiten nach Datum und Mahlzeitentyp erfassen: tippen, Browserdiktat übernehmen oder die Tastatur-Diktierfunktion nutzen. Beschreibungen werden erst mit „Mahlzeit speichern“ dauerhaft in SQLite abgelegt. Kalorien sind optional und können selbst eingetragen oder über die bestehende ChatGPT-Verbindung geschätzt werden. Alternativ steht derselbe Kopier-/Importweg wie beim Trainingsplan bereit. Es wird kein API-Key verwendet und kein kostenpflichtiger Transkriptionsdienst ergänzt.

Eine KI-Schätzung enthält kcal für die gesamte Mahlzeit, eine Spanne und Portionsannahmen. Bei fehlenden Angaben kann die KI eine Rückfrage statt eines Zahlenwerts liefern. Vor dem Speichern lassen sich Annahmen prüfen und Angaben korrigieren. Änderungen an der Beschreibung setzen die vorherigen Kalorien zurück. Tageswerte sind Summen der erfassten Einträge; fehlende Kalorien zählen nicht als null und ein leeres Tagebuch ist keine Aussage über die tatsächliche Nahrungsaufnahme. Einträge können bearbeitet und gelöscht werden; konkurrierende Änderungen werden erkannt.

Migration `0007_red_black_knight.sql` legt die separate Mahlzeitentabelle an. Vorhandene Trainingsdaten bleiben erhalten. Bei einem bereits laufenden Entwicklungsserver `npm run db:migrate` ausführen und den Server neu starten; der Produktionsstart führt Migrationen automatisch aus.
