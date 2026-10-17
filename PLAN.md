# Fitmin – aktueller Arbeitsstand

Stand: 17.10.2026. **B0 und B1 lokal abgeschlossen. Nächste Phase: B2.** Die reale Safari-/iPhone-Abnahme bleibt offen.

## Wo steht was?

- [Konzept / Produktspezifikation](docs/trainingsbegleiter/KONZEPT.md): gewünschte Interaktion und Umfang; entspricht einer SPEC.md.
- [Architektur](docs/trainingsbegleiter/ARCHITEKTUR.md): Komponenten, Speicherung und Schnittstellen.
- [Roadmap](docs/trainingsbegleiter/ROADMAP.md): vollständige Aufgabenliste B0–B8 mit offenen/erledigten Punkten und Abnahmekriterien.
- [Phasenbericht](PHASE_REPORT.md): tatsächlich umgesetzte Änderungen, Prüfergebnisse und Grenzen.
- [B1-Detailstand](docs/trainingsbegleiter/B1-ZWISCHENSTAND.md): derzeitige Persistenzphase.
- [AGENTS.md](AGENTS.md): verbindliche Arbeitsregeln für die Fortsetzung.

## Bereits geprüft

B0 und B1: Anbieteradapter ohne bezahlten Fallback, versionierte Gesprächsverträge, SQLite-Migration, atomare Nachrichten/Aufträge, Wiederholbarkeit, Worker-Leases und geschützte APIs. Hinzu kommen IndexedDB, sichere Übernahme alter Entwürfe, Offline-Start des aktiven Trainings, Konflikterkennung und lokale Löschung bei Logout. Letzter abgeschlossener Prüfstand: Typprüfung, Lint, Build, 19 Unit-/Integrationstests und 11 Chromium-Browserfälle. Darin geprüft: vollständiger Browserneustart ohne Netz mit demselben gespeicherten Profil und anschließender einmaliger Synchronisierung. Details im Phasenbericht, Phasen 18/19.

## Nächster konkreter Schritt

B2.1/B2.2: Quellenbasis und konkrete Trainingsregeln für Volumen, Anstrengung, Progression und Deload vervollständigen; Evidenz und Produktheuristiken trennen. Danach Regel-/Promptverträge implementieren und bestehende Szenarien erweitern. Noch keine Umsetzung von B2 begonnen.

Präferenzen aus tatsächlichen Angaben zu Zielen, Zeit, Erfahrung, Spaß und Motivation ableiten. Keine festen Personen-Presets und keine automatische Mentzer-Zuordnung allein aus zwei bis drei kurzen Trainingstagen. Die vollständigen Aufgaben und Abnahmekriterien stehen ausschließlich in der Roadmap.

## Noch nicht umgesetzt

B2–B8: erweiterte Trainings-/Deloadregeln, Kennenlerngespräch, individuelle Trainingsblöcke, vollständiger Trainingschat, gemeinsames Gedächtnis/Markdown-Exporte und Ernährung im Chat. Bestehende Plan-, Trainings-, Ernährungs- und Beratungsfunktionen bleiben nutzbar. Kein Railway-Deployment; reale Safari-/Home-Bildschirm-Prüfung steht aus.

## Offene Entscheidungen / Input

Derzeit kein blockierender Nutzerentscheid. Bestätigt: zuerst lokal entwickeln, später Railway; bezahlte ChatGPT-Mehrnutzung ist laut Nutzer ausgeschaltet. Eine echte iPhone-Abnahme erfolgt gesondert, sobald der dafür nötige HTTPS-Zugang vorhanden ist; Prüfschritte stehen im B1-Detailstand. Offline-Timerbedienung und Offline-Trainingsabschluss sind nicht implementiert. Browser können lokale Daten entfernen; serverbestätigte Daten bleiben die dauerhafte Grundlage.
