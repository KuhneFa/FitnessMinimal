# 30 Tests mit erhaltener Prüftiefe

Stand: 08.10.2026. Die Standardsuite umfasst **19 Unit-/Integrationstests + 11 Chromium-End-to-End-Tests = 30 Tests**. Optionale WebKit-Ausführung wiederholt dieselben Browserfälle in einem zweiten Browser.

Die bisher 70 Unit-/Integrationstests sind in 19 fachliche Vertragstests zusammengefasst. Alle 70 bisherigen Szenarien und ihre Assertions bleiben enthalten; bei der Umgruppierung wurden die Funktionskörper per TypeScript-AST verglichen. Zwei zusätzliche Szenarien prüfen echte gespeicherte Ernährungsantworten und ihren weiteren Weg durch Validierung, Speicherung, Tagesaggregation und Gesprächskontext. Die 11 Browserabläufe bleiben erhalten; der Tagebuchablauf prüft zusätzlich die Ablehnung von Kalorienwerten bei offener Rückfrage.

Die Zuordnung steht in [test-contracts.json](test-contracts.json). `tests/helpers/scenarios.ts` führt die benannten Szenarien eines Tests sequenziell aus und sammelt Fehler: Ein fehlgeschlagener Fall überspringt die späteren Fälle nicht. Assertion-Fehler behalten Szenarionamen und Ursache. Es werden keine verschachtelten Tests versteckt oder separat gezählt. Bestehende isolierte Datenbanken, Mocks, Persistenz-/Restartprüfungen und Sicherheitstests bleiben erhalten.

| Bereich | Unit-/Integrationstests |
| --- | ---: |
| Authentifizierung, Timer, Eingabevalidierung, Diktat | 4 |
| Migrationen, Persistenz, Pläne, Workouts, Progression | 5 |
| ChatGPT-OAuth und Tokenablage | 2 |
| KI-Transport, Planvalidierung, Prompts, Budget/Import | 4 |
| Ernährungstagebuch und Antwortprüfung | 2 |
| Beratungsgrundlage und Gespräch | 2 |
| **Summe** | **19** |

## Gemessene Abdeckung

Gemessen mit Node 22 / V8 und `--test-coverage-include=src/**`, vor/nach der Umgruppierung bei unverändertem Anwendungscode. Der vollständige Bericht ist identisch, nicht nur der Gesamtwert.

| Messung | Zeilen | Zweige | Funktionen |
| --- | ---: | ---: | ---: |
| Vorher: 70 Tests | 90,69 % | 91,78 % | 89,65 % |
| Umgruppiert: 19 Tests | 90,69 % | 91,78 % | 89,65 % |
| Mit verbesserter Ernährungsvalidierung und zusätzlichen Szenarien: 19 Tests | 90,81 % | 91,95 % | 89,88 % |

Berichte: [vorher](coverage-before.txt), [umgruppiert](coverage-consolidated.txt), [abschließend](coverage-final.txt).

Diese V8-Werte beziehen sich auf die durch Unit-/Integrationstests geladenen `src`-Module, nicht auf eine vollständige kombinierte Abdeckung aller UI- und Route-Dateien. Die zusätzlichen Browserabläufe prüfen tatsächliche Routen, Bedienung, Persistenz, mobile Breiten und axe-Regeln separat. Die Umgruppierung spart keine zugrunde liegenden Prüfschritte; die gleiche fachliche Prüfung bleibt beabsichtigt erhalten.

Ausführen: `npm run check`, danach `npm run test:e2e`. Abdeckung: `npm run test:coverage`. Live-Modellproben sind ausdrücklich separat und nicht Teil dieser automatisch ausgeführten 30 Tests.
