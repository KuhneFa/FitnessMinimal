# Arbeitsregeln für Fitmin

- Einstieg bei jeder Fortsetzung: [PLAN.md](PLAN.md), dann die aktuelle Phase in [ROADMAP.md](docs/trainingsbegleiter/ROADMAP.md). Anforderungen stehen in [KONZEPT.md](docs/trainingsbegleiter/KONZEPT.md), technische Entscheidungen in [ARCHITEKTUR.md](docs/trainingsbegleiter/ARCHITEKTUR.md).
- Strikt phasenweise arbeiten. Unfertige Implementierung, geprüfte Umsetzung und offene Geräteabnahme ausdrücklich unterscheiden. Keine Phase allein wegen angelegter Dateien als abgeschlossen markieren.
- Aktuellen Arbeitsstand und nächsten konkreten Schritt in PLAN.md nachführen; abgeschlossene Prüfungen und Einschränkungen in PHASE_REPORT.md dokumentieren. ROADMAP.md bleibt die maßgebliche Aufgabenliste, keine zweite widersprüchliche Checkbox-Liste anlegen.
- Nutzer regelmäßig knapp über Fortschritt und Befunde informieren. Routineentscheidungen selbst treffen; fehlenden fachlichen Input früh erfragen und unabhängige Arbeit fortsetzen.
- Zunächst lokale persönliche Instanz. Railway/HTTPS später; Freunde zunächst mit eigener Installation und eigenem Modellkonto. Keine zusätzlichen kostenpflichtigen API-Aufrufe oder stillen Anbieter-Fallbacks. Echte Modellanfragen nicht als Teil normaler Tests ausführen.
- Bestehende Daten und Funktionen erhalten. SQLite speichert bestätigte Fakten; lokale Entwürfe und spätere Markdown-Exporte sind keine konkurrierende Datenwahrheit. Migrationen additiv, Wiederholung und Datenverlust prüfen.
- Keine echten Passwörter, Tokens, .env-Inhalte oder persönliche Daten in Ausgaben/Tests/Dokumentation. Tests mit temporären Datenbanken und synthetischen Daten ausführen.
- Insgesamt 30 automatisierte Tests beibehalten: 19 Unit-/Integrationstests und 11 Browserfälle. Neue relevante Szenarien in passende Vertragstests aufnehmen; keine vorhandenen Assertions zur Einhaltung der Anzahl entfernen. Chromium ist kein Nachweis für echtes Safari/iPhone.
- Next.js-Konventionen vor Änderungen in den mitgelieferten Dokumenten unter node_modules/next prüfen; zuerst node_modules/next/AGENTS.md lesen. Node-Version aus .nvmrc verwenden.
- Keine bestehenden Nutzeränderungen zurücksetzen. Keine Commits oder Deployments ohne Auftrag. Keine zusätzlichen Agenten ohne ausdrücklichen Auftrag.
