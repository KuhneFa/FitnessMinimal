# Fitmin als Trainingsbegleiter

Stand: 17.10.2026. Status: **B0 und B1 lokal abgeschlossen. B2 ist der nächste Schritt.** Reale iPhone-Abnahme und Hosting stehen aus.

Diese Dokumente halten die mit dem Nutzer besprochene Neuausrichtung fest. Sie ergänzen die bestehende App; der jeweilige Umsetzungsstand ist in der Roadmap markiert. Der bisherige Implementierungsstand steht weiterhin im [Phasenbericht](../../PHASE_REPORT.md).

Für die Fortsetzung zuerst [PLAN.md](../../PLAN.md) und die Arbeitsregeln in [AGENTS.md](../../AGENTS.md) lesen.

## Dokumente

| Dokument | Inhalt |
| --- | --- |
| [Konzept](KONZEPT.md) | Kennenlernen, vier Reiter, Trainingschat, PWA und spätere Erweiterungen |
| [Architektur](ARCHITEKTUR.md) | Datenmodell, Wiederaufnahme, APIs, Markdown, KI-Anbieter und Betrieb |
| [Trainingsregeln](TRAININGSREGELN.md) | Wissenschaftliche Grundlage, Trainingsstile, Progression, Deload und Promptentwurf |
| [Roadmap](ROADMAP.md) | Strikt aufeinanderfolgende Phasen mit Aufgaben, Abhängigkeiten und Abnahmekriterien |

## Festgelegte Richtung

- Name Fitmin, vorhandene Farben, Reiter Heute / Pläne / Tagebuch / Beratung.
- Gespräch als Hauptbedienung, ergänzt durch echte Tabellen und Aktionskarten im Chat.
- Fortsetzbares Kennenlernen vor der Planung; Trainingsblock beispielsweise sechs Wochen.
- Jede Eingabe unabhängig von einer Modellantwort sichern. Pro Übung zusammengefasst kommunizieren.
- Web-App für Safari und den Home-Bildschirm, keine native iOS-App erforderlich.
- Vorhandenen Next.js-/TypeScript-/SQLite-Stack weiterverwenden.
- ChatGPT-Konto beziehungsweise geeignetes Abo verwenden; keine API-basierte Abrechnung und kein automatischer kostenpflichtiger Ersatzanbieter.
- KI-Anbindung austauschbar gestalten. Andere Anbieter zunächst als Erweiterungsschnittstelle, nicht als weitere sofortige Integration.
- Individuelle Planung aus Nutzerangaben zu Zeit, Zielen, Erfahrung, Spaß und Prioritäten. Bekannte Trainingsphilosophien dienen optional der motivierenden Einordnung; keine verpflichtenden Stil-Presets oder Beschränkung auf bestimmte Namen. Überprüfbare Regeln für Progression und Entlastung bleiben die Grundlage.
- Körperfotos und optische Rückmeldungen erst später, freiwillig und mit eigener Übertragungsentscheidung.

## Offene Punkte vor der jeweiligen Umsetzung

| Entscheidung | Vorgeschlagene Richtung | Zu klären in |
| --- | --- | --- |
| Direkte KI auf dem Handy | Persönlich betriebener HTTPS-Server mit zulässiger kontogebundener Anbindung | Phase B0 |
| Konto-Berechtigung und Kostenbegrenzung | Tatsächliche Freigaben prüfen; Free-Account nicht als garantierten Zugang verkaufen | Phase B0 |
| Trainingsparameter | Versionierte Regeln und begründete Startwerte; Zahlenwerte noch fachlich prüfen | Phase B2 |
| Übungen mit Medien | Kuratierte, lizenzierte Hilfen mit nachvollziehbarer Quelle | Phase B5 |
| Mehrere Personen | Vorerst persönliche Instanz; öffentlicher Mehrbenutzerbetrieb ist ein eigenes Vorhaben | Spätere Entscheidung |

Das Home-Bildschirm-Symbol löst die Darstellung auf dem Handy. Erreichbarkeit des Servers, HTTPS, Modellberechtigung und Speicherung bleiben eigenständige Aufgaben.

Die Umsetzung ist vom Nutzer beauftragt. Aufgaben werden erst nach Umsetzung und passender Prüfung abgehakt. [B0-Ergebnis und Betriebsentscheidung](B0-BETRIEB.md).
