# Manueller Testplan

Alle Ergebnisse bleiben bis zu deiner tatsächlichen Prüfung **noch nicht getestet**. Verwende zunächst eine separate Test-Installation und Demo-Daten.

## Unbedingt testen

Führe diese Tests zuerst auf einer separaten Testinstallation aus:

1. **Login und Zugriffsschutz:** Privates Safari-Fenster öffnen, falsches/richtiges Passwort testen, anschließend abmelden und geschützte Seiten direkt öffnen.
2. **Speichern und Fortsetzen:** Upper A starten, 80 kg × 10 bei RIR 2 speichern, Speicherbestätigung abwarten, App schließen und wieder öffnen.
3. **Verbindungsabbruch:** Flugmodus während einer Eingabe, dann Verbindung zurück; auf bestätigte Synchronisierung warten und neu laden.
4. **Progression:** Drei Bench-Press-Sätze 80 × 10 bei RIR 2 abschließen; nächstes Training muss bei 2,5-kg-Schritt 82,5 kg vorschlagen.
5. **Historie:** Workout abschließen; Gewichte, Wiederholungen, RIR, Bewertungen und Notiz vergleichen.
6. **Railway-Datenverlust:** Volume-Pfad prüfen, Sätze speichern, Service neu starten und sämtliche Werte vergleichen. Dieser Test ist KRITISCH.
7. **iPhone-PWA:** Zum Home-Bildschirm hinzufügen, dort anmelden, Training speichern, Bildschirm sperren und Training fortsetzen.

## Sollte getestet werden

1. Plan erstellen, Übung hinzufügen, Plan bearbeiten, neu laden und gespeicherte Werte vergleichen.
2. Timer starten, pausieren, +30 Sekunden hinzufügen, fortsetzen und überspringen.
3. Zwei Fenster mit demselben Satz bearbeiten; Konfliktmeldung und bewussten Server-Reload prüfen.
4. Einen Satz unter dem Wiederholungsziel oder mit zu niedrigem RIR absolvieren: keine Steigerung.
5. Alle iPhone-Hochformat-, Tastatur- und Safe-Area-Tests unten durchgehen.

## Optional testen

1. Mit VoiceOver Überschriften, Eingabefelder und Satzabschluss vorlesen lassen.
2. In iOS „Bewegung reduzieren“ aktivieren und die App erneut öffnen.
3. Lokalen Demo-Seed erneut ausführen und prüfen, dass vorhandene Daten nicht überschrieben werden.

## Phase 1 – Fundament

### Startseite und Healthcheck

- Testname: Startseite und Healthcheck
- Priorität: wichtig
- Voraussetzungen: App lokal gestartet oder auf Railway bereitgestellt.
- Schritte: Startseite öffnen; danach `/api/health` an die Adresse anhängen.
- Erwartetes Ergebnis: Mobile Startseite erscheint; Healthcheck zeigt `{"status":"ok"}`.
- Ergebnis: noch nicht getestet

### KRITISCH: SQLite auf dem Railway Volume

- Testname: KRITISCH: SQLite auf dem Railway Volume
- Priorität: kritisch
- Voraussetzungen: Railway-Projekt mit Volume.
- Schritte: Im Railway-Service das Volume öffnen und Mount Path `/data` prüfen. In Variables `DATABASE_PATH=/data/fittrack.db` prüfen. In den Start-Logs `Database migrated: /data/fittrack.db` suchen. In einer Railway-Service-Shell `printenv RAILWAY_VOLUME_MOUNT_PATH` ausführen (Erwartung `/data`), anschließend `ls -la /data` und `df -h /data` prüfen. Das Volume muss dort tatsächlich gemountet sein; ein Verzeichnisname allein reicht nicht.
- Erwartetes Ergebnis: Datenbank liegt im eingebundenen Volume. Ohne Volume startet der Railway-Service nicht erfolgreich. Später zusätzlich den Workout-Neustarttest ausführen.
- Ergebnis: noch nicht getestet

## Phase 2 – Sicherheit

### Login

- Testname: Login
- Priorität: kritisch
- Voraussetzungen: Passwort eingerichtet, App erreichbar.
- Schritte: In privatem Safari öffnen. Falsches Passwort eingeben. Danach richtiges Passwort eingeben. Safari schließen und erneut öffnen.
- Erwartetes Ergebnis: Falsches Passwort wird abgewiesen; richtiges Passwort öffnet Heute. Im normalen Safari/PWA bleibt die Anmeldung 30 Tage erhalten. Private Fenster können Cookies beim Schließen löschen.
- Ergebnis: noch nicht getestet

### Zugriff ohne Login und Logout

- Testname: Zugriff ohne Login und Logout
- Priorität: kritisch
- Voraussetzungen: Zunächst angemeldet.
- Schritte: Abmelden. Die Startseite und `/plans` direkt öffnen. Zurück-Taste benutzen und neu laden.
- Erwartetes Ergebnis: Persönliche Seiten verlangen erneut Login. Die alte Session erlaubt keinen Zugriff mehr.
- Ergebnis: noch nicht getestet

### Login-Limit

- Testname: Login-Limit
- Priorität: wichtig
- Voraussetzungen: Separate Testinstallation, nicht während eines echten Trainings.
- Schritte: Zehnmal falsches Passwort eingeben. Einen weiteren Versuch durchführen. 15 Minuten warten und erneut anmelden.
- Erwartetes Ergebnis: Weitere Versuche sind vorübergehend gesperrt. Nach Ablauf ist Login wieder möglich.
- Ergebnis: noch nicht getestet

## Phase 3 – Übungen und Pläne

### Plan erstellen und bearbeiten

- Testname: Plan erstellen und bearbeiten
- Priorität: wichtig
- Voraussetzungen: Angemeldet, bei Bedarf lokal `npm run db:seed` ausgeführt.
- Schritte: Pläne öffnen, neuen Plan erstellen. Eine Übung unter „Neue Übung anlegen“ speichern. Die Übung einem Trainingstag zuordnen. Drei Sätze, 8–10 Wiederholungen, Ziel-RIR 2 und 80 kg eintragen. Speichern. Plan erneut öffnen, Namen und Gewicht ändern und speichern.
- Erwartetes Ergebnis: Alle Werte bleiben nach Neuladen erhalten; Übungen erscheinen am richtigen Tag. Entfernen einer Zuordnung betrifft nur den Plan.
- Ergebnis: noch nicht getestet

### Demo-Daten schützen vorhandene Daten

- Testname: Demo-Daten schützen vorhandene Daten
- Priorität: wichtig
- Voraussetzungen: Lokale Testinstallation, kein echtes Training.
- Schritte: Auf leerer Datenbank `npm run db:seed` ausführen. „Upper / Lower“ mit Upper A und Lower A öffnen. Seed erneut ausführen.
- Erwartetes Ergebnis: Acht Übungen mit realistischen Startwerten erscheinen. Der zweite Seed wird abgebrochen; vorhandene Daten bleiben unverändert. Auf Railway und bei NODE_ENV=production wird Seed generell verweigert.
- Ergebnis: noch nicht getestet

## Phase 4 – Aktives Workout

### KRITISCH: Speichern und Fortsetzen

- Testname: KRITISCH: Speichern und Fortsetzen
- Priorität: kritisch
- Voraussetzungen: Upper A vorhanden, angemeldet.
- Schritte: Upper A starten. Bench Press: 80 kg, 10 Wiederholungen, RIR 2 eingeben und Satz abhaken. Auf „Alle Änderungen gespeichert“ warten. App wechseln, Safari schließen und App erneut öffnen. Auf Heute „Workout fortsetzen“ wählen.
- Erwartetes Ergebnis: Dasselbe Workout mit 80 × 10, RIR 2 und abgeschlossenem Satz erscheint. Kein zweites Workout entsteht.
- Ergebnis: noch nicht getestet

### KRITISCH: Verbindungsabbruch

- Testname: KRITISCH: Verbindungsabbruch
- Priorität: kritisch
- Voraussetzungen: Workout bereits geöffnet, kein echtes Training für diesen Test verwenden.
- Schritte: Flugmodus einschalten. Einen Satz ändern. Auf „Noch nicht synchronisiert“ achten. Verbindung wiederherstellen und die App geöffnet lassen. Nach „Alle Änderungen gespeichert“ neu laden.
- Erwartetes Ergebnis: Offene Werte werden nachgesendet und bleiben nach Neuladen erhalten. Die kleine lokale Recovery-Kopie wird nach Synchronisierung entfernt. Ohne Verbindung lässt sich keine neue Seite laden; die App ist bewusst nicht vollständig offlinefähig.
- Ergebnis: noch nicht getestet

### Änderung in zwei Fenstern

- Testname: Änderung in zwei Fenstern
- Priorität: wichtig
- Voraussetzungen: Dasselbe Workout in zwei angemeldeten Fenstern öffnen.
- Schritte: Einen Satz in Fenster A ändern und speichern lassen. Denselben Satz in Fenster B ändern.
- Erwartetes Ergebnis: Fenster B meldet einen Konflikt. Es überschreibt keine neueren Serverwerte. Eigene Eingaben bei Bedarf notieren, danach „Serverstand laden“ wählen und bestätigen.
- Ergebnis: noch nicht getestet

### KRITISCH: Railway Restart ohne Datenverlust

- Testname: KRITISCH: Railway Restart ohne Datenverlust
- Priorität: kritisch
- Voraussetzungen: Separate Railway-Testinstallation, korrekt gemountetes Volume (siehe Volume-Test), ein Plan und laufendes Workout.
- Schritte: Workout starten. Mindestens drei Sätze mit unterschiedlichen Gewichten, Wiederholungen und RIR speichern. Auf „Alle Änderungen gespeichert“ warten und Werte notieren. Im Railway-Dashboard den Service neu starten. Warten, bis der Healthcheck wieder erfolgreich ist. App neu öffnen, Workout fortsetzen und alle notierten Werte vergleichen. Später auch ein abgeschlossenes Workout vor und nach einem weiteren Neustart in der Historie vergleichen.
- Erwartetes Ergebnis: Laufendes Workout, alle gespeicherten Sätze, Pläne und Historie sind unverändert vorhanden. Start-Log zeigt weiterhin `/data/fittrack.db`. Ein erfolgreicher lokaler Test ersetzt diesen echten Railway-Test nicht.
- Ergebnis: noch nicht getestet

## Phase 5 – Progression

### KRITISCH: Double Progression

- Testname: KRITISCH: Double Progression
- Priorität: kritisch
- Voraussetzungen: Bench Press mit 3 Sätzen, 8–10 Wiederholungen, Ziel-RIR 2 und Gewichtsschritt 2,5 kg. Workout-Abschluss aus Phase 7 verfügbar.
- Schritte: Alle drei Bench-Press-Sätze mit 80 kg × 10 Wiederholungen und RIR 2 abschließen. Workout beenden. Upper A erneut starten.
- Erwartetes Ergebnis: 82,5 kg sind vorausgefüllt. Die Begründung nennt alle erreichten Sätze und den Gewichtsschritt. Werte bleiben manuell änderbar.
- Ergebnis: noch nicht getestet

### Keine voreilige Steigerung

- Testname: Keine voreilige Steigerung
- Priorität: wichtig
- Voraussetzungen: Gleiche Planparameter wie oben.
- Schritte: In einem neuen Testtraining 80 × 10, 80 × 10 und 80 × 9 bei RIR 2 erfassen. Workout abschließen und erneut starten. Zusätzlich in einem separaten Training alle Sätze mit 10 Wiederholungen, aber einen Satz mit RIR 1 abschließen.
- Erwartetes Ergebnis: Jeweils 80 kg, mit verständlicher Begründung für das Beibehalten. Fehlende Sätze, unterschiedliche Gewichte oder eine geänderte Satzanzahl lösen ebenfalls keine automatische Steigerung aus.
- Ergebnis: noch nicht getestet

## Phase 6 – Pausentimer

### Timer und Hintergrundbetrieb

- Testname: Timer und Hintergrundbetrieb
- Priorität: wichtig
- Voraussetzungen: Laufendes Workout mit 120 Sekunden Satzpause.
- Schritte: Einen Satz abschließen. Timer oben prüfen. „Pause“ drücken und kurz warten. „+30 Sek.“ und „Weiter“ drücken. Zu anderer App wechseln, nach etwa einer Minute zurückkehren. „Skip“ drücken.
- Erwartetes Ergebnis: Nach gespeichertem Satz startet 2:00. Pausiert bleibt die Zeit stehen. +30 verlängert; Weiter setzt fort. Nach App-Wechsel stimmt die verbleibende Zeit mit der tatsächlich vergangenen Zeit überein. Skip beendet die Pause. Keine garantierten Hintergrundtöne oder Push-Benachrichtigungen.
- Ergebnis: noch nicht getestet

## Phase 7 – Abschluss und Historie

### Workout abschließen und Werte vergleichen

- Testname: Workout abschließen und Werte vergleichen
- Priorität: kritisch
- Voraussetzungen: Laufendes Workout mit mindestens einem abgeschlossenen Satz.
- Schritte: Alle gewünschten Sätze speichern. Unten Fatigue 3 und Performance 4 wählen, Notiz „Testtraining“ eingeben. Bei offenen Sätzen den vorzeitigen Abschluss bestätigen. „Workout beenden“ wählen. Historie öffnen und Training auswählen. Beim Bench Press „Verlauf“ wählen.
- Erwartetes Ergebnis: Workout erscheint einmal in der Historie; Gewichte, Wiederholungen, RIR, offene/abgeschlossene Sätze, Bewertungen und Notiz stimmen. Übungsverlauf zeigt dieselben Werte. Das Workout kann nicht weiter verändert werden.
- Ergebnis: noch nicht getestet

### Historie bleibt unabhängig vom Plan

- Testname: Historie bleibt unabhängig vom Plan
- Priorität: wichtig
- Voraussetzungen: Ein abgeschlossenes Workout.
- Schritte: Danach im Plan Namen, Gewicht und Übungen ändern. Historisches Workout erneut öffnen.
- Erwartetes Ergebnis: Historische Namen und Satzwerte bleiben unverändert. Neue Planparameter gelten erst für neu gestartete Workouts.
- Ergebnis: noch nicht getestet

## iPhone PWA Tests

Voraussetzungen für alle folgenden Tests: ein echtes iPhone, Safari, eine über HTTPS erreichbare Testinstallation und ein eingerichtetes Passwort. Für Trainingsprüfungen einen Testplan verwenden. Desktop-Emulation ersetzt diese Prüfungen nicht.

### 01 · In Safari öffnen

- Testname: 01 · In Safari öffnen
- Priorität: wichtig
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Öffne die HTTPS-Adresse in Safari.
- Erwartetes Ergebnis: Die Login-Seite ist lesbar, vollständig und ohne seitliches Scrollen bedienbar.
- Ergebnis: noch nicht getestet

### 02 · Zum Home-Bildschirm hinzufügen

- Testname: 02 · Zum Home-Bildschirm hinzufügen
- Priorität: wichtig
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Tippe in Safari auf Teilen, danach auf „Zum Home-Bildschirm“. Bestätige FitTrack als Namen.
- Erwartetes Ergebnis: Ein kleines FitTrack-Icon erscheint auf dem Home-Bildschirm.
- Ergebnis: noch nicht getestet

### 03 · Vom Home-Bildschirm starten

- Testname: 03 · Vom Home-Bildschirm starten
- Priorität: wichtig
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Schließe Safari und tippe auf das neue FitTrack-Icon.
- Erwartetes Ergebnis: Die App startet unter derselben HTTPS-Adresse und zeigt Login oder Heute entsprechend der vorhandenen Anmeldung.
- Ergebnis: noch nicht getestet

### 04 · Standalone-Darstellung

- Testname: 04 · Standalone-Darstellung
- Priorität: wichtig
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Prüfe die vom Home-Bildschirm geöffnete App.
- Erwartetes Ergebnis: Keine normale Safari-Adressleiste; Statusleiste, Inhalt und untere Navigation sind sauber angeordnet.
- Ergebnis: noch nicht getestet

### 05 · In der PWA anmelden

- Testname: 05 · In der PWA anmelden
- Priorität: kritisch
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Melde dich mit dem richtigen Passwort in der PWA an. Schließe sie und öffne sie erneut.
- Erwartetes Ergebnis: Heute erscheint; die Anmeldung bleibt innerhalb der 30-Tage-Session erhalten. Eine erstmalige zusätzliche Anmeldung in der PWA ist möglich, falls Safari und PWA getrennte Cookies verwenden.
- Ergebnis: noch nicht getestet

### 06 · Workout starten

- Testname: 06 · Workout starten
- Priorität: kritisch
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Tippe bei Upper A auf „Training starten“.
- Erwartetes Ergebnis: Genau ein aktives Workout mit den geplanten Übungen und Sätzen wird geöffnet. Erneutes Starten führt zum bestehenden Workout.
- Ergebnis: noch nicht getestet

### 07 · Zahlentastatur

- Testname: 07 · Zahlentastatur
- Priorität: wichtig
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Tippe auf kg, Wiederholungen und RIR. Gib 82,5 kg, 10 Wiederholungen und RIR 2 ein.
- Erwartetes Ergebnis: Gewicht öffnet eine Dezimaltastatur, Wiederholungen und RIR eine Zahlentastatur. Komma wird akzeptiert; nach Synchronisierung bleibt der Zahlenwert 82,5 erhalten. Kein unerwarteter Safari-Zoom.
- Ergebnis: noch nicht getestet

### 08 · Zwischen Apps wechseln

- Testname: 08 · Zwischen Apps wechseln
- Priorität: kritisch
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Speichere einen Satz und warte auf „Alle Änderungen gespeichert“. Wechsle für eine Minute zu einer anderen App, dann zurück.
- Erwartetes Ergebnis: Workout und bestätigte Satzwerte sind unverändert vorhanden.
- Ergebnis: noch nicht getestet

### 09 · Bildschirm sperren und entsperren

- Testname: 09 · Bildschirm sperren und entsperren
- Priorität: kritisch
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Starte eine Satzpause. Sperre das iPhone für etwa 30 Sekunden und entsperre es wieder.
- Erwartetes Ergebnis: Gespeicherte Werte bleiben erhalten. Timer berücksichtigt die vergangene Zeit statt im Hintergrund stehen zu bleiben.
- Ergebnis: noch nicht getestet

### 10 · PWA erneut öffnen

- Testname: 10 · PWA erneut öffnen
- Priorität: kritisch
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Beende die PWA über den App-Umschalter nach bestätigtem Speichern. Starte sie erneut vom Home-Bildschirm.
- Erwartetes Ergebnis: Die Session bleibt gültig. Auf Heute lässt sich das aktive Workout fortsetzen.
- Ergebnis: noch nicht getestet

### 11 · Laufendes Workout prüfen

- Testname: 11 · Laufendes Workout prüfen
- Priorität: kritisch
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Öffne „Workout fortsetzen“ und vergleiche Gewichte, Wiederholungen, RIR und Häkchen mit deinen zuletzt bestätigten Eingaben.
- Erwartetes Ergebnis: Alle serverseitig bestätigten Werte stimmen; es wurde kein zweites Workout erzeugt.
- Ergebnis: noch nicht getestet

### 12 · Workout abschließen

- Testname: 12 · Workout abschließen
- Priorität: kritisch
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Wähle Bewertungen und eine Notiz. Bestätige gegebenenfalls offene Sätze und beende das Workout.
- Erwartetes Ergebnis: Die Historien-Detailseite erscheint. Der Abschluss erfolgt erst bei synchronisierten Eingaben; offene Sätze sind sichtbar als nicht absolviert markiert.
- Ergebnis: noch nicht getestet

### 13 · Historie prüfen

- Testname: 13 · Historie prüfen
- Priorität: kritisch
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Öffne Historie, wähle das gerade abgeschlossene Workout und anschließend einen Übungsverlauf.
- Erwartetes Ergebnis: Alle aufgezeichneten Werte und Bewertungen stimmen. Historische Daten werden bei Bedarf vom Server geladen.
- Ergebnis: noch nicht getestet

### 14 · Hochformat auf allen Screens

- Testname: 14 · Hochformat auf allen Screens
- Priorität: wichtig
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Prüfe Login, Heute, Pläne, Planeditor, Workout, Historie und Übungsverlauf im Hochformat. Wenn möglich auf einem kleinen und einem großen iPhone testen.
- Erwartetes Ergebnis: Kein seitliches Scrollen, keine abgeschnittenen Satzfelder oder Texte. Lange Übungsnamen umbrechen lesbar.
- Ergebnis: noch nicht getestet

### 15 · Safe Area und Home Indicator

- Testname: 15 · Safe Area und Home Indicator
- Priorität: wichtig
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Scrolle jeden Screen bis ganz nach unten. Tippe besonders die unteren Navigations- und Abschlussbuttons an.
- Erwartetes Ergebnis: Home Indicator und Geräte-Safe-Area verdecken keine Buttons. Alle Aktionen bleiben erreichbar.
- Ergebnis: noch nicht getestet

### 16 · Tastatur verdeckt keine Felder

- Testname: 16 · Tastatur verdeckt keine Felder
- Priorität: wichtig
- Voraussetzungen: iPhone-Testinstallation wie oben; bei Workout-Schritten angemeldet und Testplan vorhanden.
- Schritte: Öffne im Workout ein Feld nahe dem unteren Bildschirmrand. Scrolle bei sichtbarer Tastatur, ändere den Wert und schließe die Tastatur. Wiederhole das im Planeditor und Notizfeld.
- Erwartetes Ergebnis: Aktives Feld und eingegebener Wert sind sichtbar oder durch normales Scrollen erreichbar. Nach Schließen der Tastatur lässt sich die nächste Aktion erreichen.
- Ergebnis: noch nicht getestet

## Phase 8 – Accessibility, Fehler und Speicher

### Bedienung mit VoiceOver und Bewegung reduzieren

- Testname: Bedienung mit VoiceOver und Bewegung reduzieren
- Priorität: optional
- Voraussetzungen: iPhone-Testinstallation.
- Schritte: In iOS VoiceOver aktivieren. Zum Workout navigieren und ein Gewichtsfeld sowie den Satzabschluss fokussieren. Danach Bewegung reduzieren aktivieren und zwischen Screens wechseln.
- Erwartetes Ergebnis: Feldnamen enthalten Übung, Satznummer und Werttyp; Satzabschluss ist benannt und sein Zustand erkennbar. Reduzierte Bewegung wird respektiert.
- Ergebnis: noch nicht getestet

### Kleiner lokaler Speicher und Fehlerbehandlung

- Testname: Kleiner lokaler Speicher und Fehlerbehandlung
- Priorität: wichtig
- Voraussetzungen: Einige abgeschlossene Testworkouts.
- Schritte: Historie mehrfach öffnen. Verbindung kurz trennen und eine noch nicht besuchte Seite öffnen. Verbindung zurückbringen und erneut laden. Optional in den Browser-Entwicklerwerkzeugen Local Storage nach erfolgreicher Synchronisierung prüfen.
- Erwartetes Ergebnis: Fehler oder fehlende Verbindung werden erkennbar; gespeicherte Daten bleiben erhalten. Es gibt keine lokale Historien-Datenbank, keinen Service-Worker-Cache und nach vollständiger Synchronisierung keinen Eintrag `fittrack-recovery`. Browser kann kleine statische App-Ressourcen normal cachen.
- Ergebnis: noch nicht getestet

## Phase 9 – Sprache und KI-Planassistent (historisch; API-Pfad durch Phase 10 ersetzt)

### Ohne KI-Schlüssel weiterarbeiten

- Testname: Ohne KI-Schlüssel weiterarbeiten
- Priorität: kritisch
- Voraussetzungen: Testinstallation ohne `OPENAI_API_KEY`, angemeldet.
- Schritte: Neuen Plan öffnen, Hinweis lesen und einen Plan manuell anlegen.
- Erwartetes Ergebnis: Der Hinweis erklärt die fehlende Einrichtung. Der manuelle Editor und das Speichern funktionieren weiter.
- Ergebnis: noch nicht getestet

### Echte Aufnahme auf iPhone und Mac

- Testname: Echte Aufnahme auf iPhone und Mac
- Priorität: kritisch
- Voraussetzungen: HTTPS-Testinstallation mit gültigem API-Schlüssel und API-Guthaben; echtes iPhone mit Safari/PWA bzw. Mac-Browser.
- Schritte: „Einsprechen“ wählen, Mikrofon erlauben, Wunschübungen und Trainingsfokus nennen. Aufnahme stoppen, ausdrücklich transkribieren lassen und erkannten Text korrigieren. Zweiten Versuch mit verweigerter Mikrofonfreigabe durchführen.
- Erwartetes Ergebnis: Eine verständliche Aufnahme wird erkannt und kann korrigiert werden. Vor „Aufnahme transkribieren“ erfolgt kein Upload. Bei verweigertem Zugriff bleibt die Texteingabe verwendbar.
- Ergebnis: noch nicht getestet

### Live-Vorschlag mit freiwilligen Angaben

- Testname: Live-Vorschlag mit freiwilligen Angaben
- Priorität: kritisch
- Voraussetzungen: Testinstallation mit OpenAI-Zugang; ausschließlich freiwillige Testangaben verwenden.
- Schritte: Wunschübungen, Alter, Größe, Körpergewicht, Fokus und Trainingstage angeben; teils gesprochen, teils über optionale Felder. Vorschläge erstellen. Ohne explizites Übungsgewicht erneut testen.
- Erwartetes Ergebnis: Strukturierte, verständliche Vorschläge berücksichtigen die Angaben. Ohne genanntes Übungsgewicht bleibt das Startgewicht offen; Körpergewicht wird nicht als Trainingsgewicht verwendet. Ohne optionale Angaben ist die Erstellung ebenfalls möglich.
- Ergebnis: noch nicht getestet

### Nur bestätigte Übungen übernehmen

- Testname: Nur bestätigte Übungen übernehmen
- Priorität: kritisch
- Voraussetzungen: KI-Vorschlag mit mehreren Übungen, darunter eine noch nicht vorhandene Übung.
- Schritte: Einige Übungen annehmen, andere ablehnen. Vor vollständiger Entscheidung Übernahme prüfen. Anschließend übernehmen, Bibliothek und Editor kontrollieren und Plan speichern.
- Erwartetes Ergebnis: Jede Übung braucht eine Entscheidung. Nur angenommene Übungen werden übernommen und gegebenenfalls angelegt; bestehende Namen werden wiederverwendet. Der Plan wird erst nach „Plan speichern“ gespeichert. Offene Gewichte sind als zu prüfende 0-kg-Platzhalter erkennbar.
- Ergebnis: noch nicht getestet

### Entwurf und geänderte Wünsche schützen

- Testname: Entwurf und geänderte Wünsche schützen
- Priorität: kritisch
- Voraussetzungen: Vorhandener Editorentwurf und fertiger KI-Vorschlag.
- Schritte: Übungen bewerten und ohne Ersetzungsbestätigung übernehmen versuchen. Bestätigung setzen, dann Trainingswünsche oder Profil ändern.
- Erwartetes Ergebnis: Ersetzung benötigt eine ausdrückliche Bestätigung. Geänderte Angaben sperren die Übernahme bis zu einem neuen Vorschlag. Bestehende gespeicherte Pläne und Workouts werden dadurch nicht verändert.
- Ergebnis: noch nicht getestet

### Aufnahme abbrechen und Hintergrundwechsel

- Testname: Aufnahme abbrechen und Hintergrundwechsel
- Priorität: wichtig
- Voraussetzungen: Echtes iPhone mit Mikrofonfreigabe.
- Schritte: Aufnahme beginnen, nach 90 Sekunden prüfen. Neue Aufnahme beginnen und App in Hintergrund schicken. Aufnahme verwerfen; während Transkription abbrechen und Seite verlassen.
- Erwartetes Ergebnis: Aufnahme endet spätestens nach 90 Sekunden bzw. beim Hintergrundwechsel, Mikrofon wird freigegeben. Verwerfen/Verlassen entfernt die lokale Aufnahme. Bereits abgesendete Anbieteranfragen können trotz Abbruch dort verarbeitet werden. Es entsteht keine Audiodateisammlung oder Profilspeicherung in Local Storage.
- Ergebnis: noch nicht getestet

### Anbieterfehler, Zeitüberschreitung und Kostenlimit

- Testname: Anbieterfehler, Zeitüberschreitung und Kostenlimit
- Priorität: wichtig
- Voraussetzungen: Separate Testinstallation; Schlüssel testweise ungültig oder Anbieterzugriff unterbrochen.
- Schritte: Transkription und Vorschläge anfordern. Fehler und erneuten Versuch prüfen. Nach fünf Plananfragen innerhalb von 15 Minuten erneut anfordern.
- Erwartetes Ergebnis: Verständliche Fehlermeldungen ohne Schlüssel/Anbieterinternas; Eingaben bleiben erhalten. Zeitüberschreitungen beenden den Wartezustand. Limits verhindern weitere Anbieteranfragen; kein automatischer kostenpflichtiger Retry.
- Ergebnis: noch nicht getestet


## Phase 10 – ChatGPT-Abo und Sprache ohne kostenpflichtige API

### Direkte ChatGPT-Anmeldung, Modellauswahl und Abo-Limit

- Testname: Direkte ChatGPT-Anmeldung, Modellauswahl und Abo-Limit
- Priorität: kritisch
- Voraussetzungen: FitTrack lokal auf dem Mac, berechtigtes ChatGPT-Konto; keine API-Aufladung. In ChatGPT zusätzliche Guthaben-/Mehrnutzungseinstellungen prüfen.
- Schritte: Continue with ChatGPT wählen, Anmeldelink auf demselben Mac öffnen, FitTrack freigeben und zurückkehren. Einmaligen Hinweis bestätigen, Modell auswählen und einen Vorschlag erstellen. Später dieselbe Registrierung erneut verbinden und ein anderes Konto separat hinzufügen. Bei Abo-Limit Fehlermeldung und unveränderte Eingaben prüfen.
- Erwartetes Ergebnis: Nach bestätigter Anmeldung richtige Kontozuordnung und verfügbare Modelle. Keine kostenpflichtige API als Ersatz bei fehlender Freigabe oder Limit. Wiederholte Anmeldung verwendet die vorhandene Registrierung. Vorschläge erfordern weiterhin Einzelentscheidungen.
- Ergebnis: noch nicht getestet

### Anmeldung abbrechen und Verbindung trennen

- Testname: Anmeldung abbrechen und Verbindung trennen
- Priorität: kritisch
- Voraussetzungen: Lokaler Planeditor, optional bereits verbundener ChatGPT-Account.
- Schritte: Anmeldung starten, abbrechen und nach fünf Minuten prüfen. Eine Verbindung trennen; danach erneut verbinden. Trennung zusätzlich einmal ohne Netzwerk ausführen.
- Erwartetes Ergebnis: Abgebrochene/abgelaufene Anmeldeversuche werden nicht aktiv. Trennen entfernt lokale Tokens. Bei nicht bestätigbarer Remote-Trennung sichtbarer Hinweis auf ChatGPT-Einstellungen. Andere Konten bleiben erhalten.
- Ergebnis: noch nicht getestet

### ChatGPT-Import auf iPhone oder gehosteter Installation

- Testname: ChatGPT-Import auf iPhone oder gehosteter Installation
- Priorität: kritisch
- Voraussetzungen: FitTrack und ChatGPT erreichbar; kein API-Key nötig.
- Schritte: Wünsche eingeben, Anfrage vorbereiten und kopieren, in ChatGPT einfügen, JSON-Antwort zurückkopieren. Ungültige Antwort testen, dann gültige Antwort prüfen. Übungen annehmen/ablehnen und speichern. Angaben nach Vorbereitung einmal verändern.
- Erwartetes Ergebnis: Funktioniert ohne OAuth-Anmeldung der App und ohne Modellanfrage durch FitTrack. Ungültige/überholte Antworten werden nicht übernommen. Nur bestätigte Übungen gelangen in den Plan.
- Ergebnis: noch nicht getestet

### Browserdiktat, Verwerfen und Tastatur-Fallback

- Testname: Browserdiktat, Verwerfen und Tastatur-Fallback
- Priorität: kritisch
- Voraussetzungen: Mac und echtes iPhone/Safari/PWA; Mikrofon und Spracheinstellungen verfügbar.
- Schritte: Einsprechen starten, stoppen, erkannten Text korrigieren und übernehmen. Diktat verwerfen, Zugriff verweigern, App während Diktat verlassen und Hintergrundwechsel testen. Ohne unterstützte Web-Spracherkennung Mikrofon der Tastatur verwenden.
- Erwartetes Ergebnis: Kein Audio-Upload zu FitTrack/OpenAI. Erkannter Text erst nach Bestätigung übernommen. Mikrofon/Erkennung beendet bei Verlassen und spätestens 90 Sekunden. Kein endloser Wartezustand. Browseranbieter-Verarbeitung wird transparent beschrieben.
- Ergebnis: noch nicht getestet

### API-Kostenbarriere und lokale Zugangsdaten

- Testname: API-Kostenbarriere und lokale Zugangsdaten
- Priorität: kritisch
- Voraussetzungen: Testinstallation; optional Dummy-OPENAI_API_KEY in Umgebung, Browser-Netzwerkansicht.
- Schritte: Alte Transkriptionsroute aufrufen, Plan ohne Abo-Verbindung anfordern, danach Import nutzen. Git-Status, Dateirechte der ChatGPT-Verbindung und Browser-Speicher prüfen.
- Erwartetes Ergebnis: Alte Route gesperrt; kein API-Key-Fallback. Import bleibt nutzbar. Tokens nur serverseitig in ignorierter Datei mit 0600, nicht in Browser-Antworten oder Local Storage. Profildaten nicht dauerhaft in FitTrack gespeichert.
- Ergebnis: noch nicht getestet

## Ergänzungen – Diktat, Modellantworten und Fitness Minimal (06.10.2026)

- Auf echtem Mac/Safari und iPhone mitten in einem Satz stoppen: den vorher sichtbaren Text mit dem fertigen Diktat und den übernommenen Trainingswünschen vergleichen. Auch nur vorläufig erkannten Text, späte Korrekturen, Hintergrundwechsel und Verwerfen prüfen. Maximal zwei Sekunden Abschlusswartezeit; keine doppelten oder verlorenen Satzteile. Ergebnis: noch nicht auf echten Geräten getestet.
- Mehrere Diktate an vorhandene Wünsche anhängen; bei insgesamt mehr als 6.000 Zeichen muss alles sichtbar bleiben und ein Kürzungshinweis erscheinen. Es darf kein gekürzter Prompt unbemerkt gesendet werden. Ergebnis: noch nicht manuell getestet.
- Eine echte ChatGPT-Anfrage auslösen. Bei Ablehnung den konkreten Fehlercode prüfen: App-Nutzungslimit, Verfügbarkeit, fehlende Berechtigung oder unbekannter HTTP 429 müssen unterscheidbar sein. Kein automatischer Retry oder API-Key-Fallback. Kontingent/Accountfreigabe werden durch simulierte Tests nicht bestätigt. Ergebnis: noch nicht live getestet.
- Kompakten Prompt in ChatGPT verwenden und Antwort importieren. Fehlerhafte Satzanzahl, Dezimalkomma als Zahlenstring, fehlendes Gewicht und doppelte Übungen prüfen. Nur harmlose Formatabweichungen werden normalisiert; ungültige Werte mit konkretem Feld zurückweisen. Ergebnis: noch nicht mit echtem Modell getestet.
- Login und Planeditor auf schmalem und breitem Bildschirm öffnen: „Fitness“ und „Minimal“ stehen untereinander; bisherige Farben bleiben bestehen. Browser-Titel und neue PWA-Installation verwenden „Fitness Minimal“. Bestehende PWA-/OAuth-Namen können zwischengespeichert sein. Ergebnis: Geräteprüfung noch offen.

## Phase 12 – Fitmin und Originalantworten (06.10.2026)

- In der direkten Verbindung einen Vorschlag erstellen. „Originalantwort von ChatGPT“ öffnen und mit der angezeigten Übungsauswahl vergleichen; Antwort kopieren, ausblenden und erneut generieren. Bei einem Antwortfehler muss sich die Ansicht automatisch öffnen. Persönlicher Antworttext darf nicht in Local Storage oder Serverlogs erscheinen. Ergebnis: echte UI-/Geräteprüfung noch offen; eine neutrale direkte Modellanfrage wurde erfolgreich geprüft.
- Beim Kopierweg Antwort mit Einleitung und JSON-Codeblock einfügen: genau ein vollständiger gültiger Plan wird erkannt. Zwei alternative JSON-Pläne oder abgeschnittenes JSON dürfen nicht still ausgewählt/repariert werden. Ergebnis: automatisiert geprüft, manuelle Prüfung offen.
- 900 bei Wiederholungen oder Satzpause in einer Testantwort eingeben: konkreter Fehler, Originalantwort weiterhin sichtbar, keine Übungsübernahme. Normale Vorgaben wie 3 Sätze, 8–12 Wiederholungen und 120 Sekunden Pause werden akzeptiert. Ergebnis: automatisiert geprüft.
- Auf echtem iPhone Login, Kopfzeile und PWA-Namen prüfen: Fitmin mit „Fitness. Minimal.“ als Unterzeile; bisherige Farben. Ergebnis: Geräteprüfung offen.

## Phase 13 – Neue KI-Übungen und Ausführungshilfe (07.10.2026)

- Nur Ziel, Häufigkeit und Equipment nennen, keine Übung vorauswählen. Mit kleiner/leerer Bibliothek Vorschläge erstellen: passende neue Übungen und verständliche Beschreibungen werden erwartet. Die Bibliothek ist keine Whitelist. Ergebnis: Modellantworten automatisiert simuliert; echte Modellprüfung dieser Erweiterung noch offen.
- Eine neue Übung annehmen, eine andere ablehnen. Erst Auswahl übernehmen: nur angenommene neue Übungen samt Beschreibung werden angelegt. Plan speichern und erneut öffnen; Anleitung und Videosuche bleiben vorhanden. Ergebnis: automatisierte Prüfung, Geräteprüfung offen.
- Eine vorhandene Übung mit eigener Beschreibung vorschlagen lassen und übernehmen: eigener Text bleibt erhalten. Ohne alte Beschreibung darf der bestätigte Vorschlag die Lücke füllen. Ergebnis: automatisiert geprüft.
- Während des Trainings „Ausführung & Video“ öffnen; Beschreibung lesen, Videosuche öffnen und zur App zurückkehren. Link muss YouTube mit passendem Übungsnamen öffnen. Kein eingebettetes Video oder automatischer Medienaufruf. Ergebnis: echte mobile Navigation/YouTube-Suche noch manuell prüfen.
- Ältere JSON-Antwort ohne instructions importieren: gültiger Plan bleibt nutzbar, fehlende Beschreibung wird kenntlich gemacht, Videosuche funktioniert. Ergebnis: automatisiert geprüft.

## Phase 14/15 – Ernährungstagebuch und Beratung (07.10.2026)

Automatisiert geprüft werden Mahlzeitenerfassung, Speicherung/Neuladen, Kaloriensummen mit unbekannten Werten, Änderungen/Löschen mit Versionskonflikten, Modellimport und Originalantwort bei Fehlern, gekürzte Beratungsgrundlage, Rückfragen, Gesprächspersistenz und Löschung. Browserdiktat und Modellantworten sind in den Browserprüfungen simuliert.

- Auf echtem Mac/iPhone eine Mahlzeit mit Portionen diktieren, stoppen und den vollständigen Text übernehmen. Mengen korrigieren, Schätzung ausdrücklich anfordern und Annahmen/Spanne vor dem Speichern prüfen. Browser ohne Diktat: Tippen/Tastaturdiktat prüfen. **Echte Geräte und echter Sprachdienst noch nicht geprüft.**
- Mit echten ChatGPT-Antworten konkrete Portion, vage Angabe und verpacktes Lebensmittel mit eigenen kcal vergleichen. Bei unzureichenden Mengen soll die KI nachfragen; Werte anhand Packung/Rezept selbst prüfen. Schätzqualität und Kontofreigabe wurden für diese Erweiterung **nicht live verifiziert**.
- Mehrere Mahlzeiten und einen Eintrag ohne kcal speichern; Tag wechseln und zurückkehren. Der leere Tag muss „unbekannt“, nicht 0 kcal bedeuten. Nach Beschreibungsänderung dürfen alte kcal nicht übernommen werden. Testweise in zwei Tabs ändern: zweite veraltete Speicherung muss abgelehnt werden.
- Beratung vorbereiten, Zeitraum/Fokus/optionalen Trainingsbezug prüfen. Es darf vorher kein Modellaufruf stattfinden. Vorschau mit den tatsächlich erfassten Einträgen vergleichen; gekürzte und ausgelassene Beschreibungen sowie unbekannte Mahlzeiten sind kenntlich. Dann Feedback anfordern oder Kopier-/Importweg verwenden.
- Rückfrage stellen, neu laden und Gespräch erneut öffnen. Neue Mahlzeiten dürfen die bestehende Gesprächsgrundlage nicht verändern. Für aktuelle Einträge eine neue Beratung vorbereiten. Nach sechs Antworten muss ein neues Gespräch erforderlich sein. Gespräch löschen: Zusammenfassung/Antworten verschwinden, Tagebuch bleibt bestehen.
- Allgemeines Feedback bei unvollständigem Tagebuch, medizinischem Anliegen oder Gewichtsreduktionswunsch kritisch prüfen: keine erfundenen Makros, Mangelzustände, Sportkalorien, Energiebilanz oder restriktiven Pläne. **Tatsächliche Modellqualität noch nicht manuell geprüft.**
