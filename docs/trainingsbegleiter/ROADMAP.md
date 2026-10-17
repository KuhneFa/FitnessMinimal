# Roadmap: Umbau zum Trainingsbegleiter

Stand: 17.10.2026. **B0 und B1 sind lokal abgeschlossen. B2 ist als Nächstes vorgesehen, noch nicht begonnen.** Die reale Safari-/iPhone-Abnahme und das Hosting bleiben offen. B0–B8 bezeichnen die neue Planungsreihe und ersetzen nicht die abgeschlossenen Phasen im [Phasenbericht](../../PHASE_REPORT.md).

## Arbeitsweise

Phasen strikt in der angegebenen Reihenfolge bearbeiten. Die nächste Phase beginnt erst nach den Abnahmekriterien der vorherigen. Offene Befunde und tatsächlich geprüfte Umgebung dokumentieren. Keine pauschale Neuentwicklung: vorhandene Daten und Abläufe übernehmen, Migrationen additiv gestalten und Wiederherstellung prüfen.

Der erste vollständige Trainingsbegleiter entsteht bis B5. Gemeinsames Gedächtnis und Ernährung folgen in B6/B7; B8 bleibt bewusst außerhalb des ersten Umfangs. Keine vorhandenen Ernährungs-/Beratungsfunktionen währenddessen entfernen.

## B0 – Betrieb, Konto und technische Verträge

Abhängigkeit: vorliegende Konzeptdokumente.

Ergebnis: [Betriebsentscheidung und implementierte Verträge](B0-BETRIEB.md). Nutzerentscheidung: zunächst lokal fertig entwickeln, Railway später; Freunde zunächst mit eigener Installation. Bezahlte Mehrnutzung laut Nutzer deaktiviert. Echte HTTPS-/iPhone-Prüfung ist für die spätere Hostingfreigabe vorgesehen. Typprüfung, Lint, 19 Unit-/Integrationstests, Build und 11 Chromium-Browsertests bestanden.

- [x] B0.1 Betriebsreihenfolge festlegen: gemäß Nutzerentscheidung zuerst persönliche lokale Entwicklung, danach Railway-Single-Instance mit HTTPS/Volume. Freunde zunächst mit eigener Installation; kein gemeinsam genutztes Modellkonto.
- [x] B0.2 Zulässigen Weg der direkten ChatGPT-Verbindung für diesen Betrieb anhand aktueller offizieller Dokumentation prüfen. Lokale Anmeldung, Host-ID, Token-Erneuerung und geschützte Serverablage konkret entwerfen.
- [x] B0.3 Berechtigungs-, Modell-, Kontingent- und Credit-Verhalten unterscheiden. Free-Konto nicht als garantierten Inferenzzugang darstellen. Ausschluss bezahlter Mehrnutzung klären; kein API-Key-Fallback.
- [x] B0.4 Anbieteradapter mit Fähigkeiten, normierten Fehlern und eindeutiger Kostenpolitik spezifizieren; einen Anbieter zuerst integrieren. Manuellen Import als manuellen Ersatzweg erhalten.
- [x] B0.5 Vertragsentwürfe für Chatkarten, Nachrichten, Aufträge und Fachaktionen festlegen. Entscheidung zwischen vorgeschlagenen/neuen Routen und Wiederverwendung bestehender Routen dokumentieren.
- [x] B0.6 Auf echtem iPhone einen begrenzten Verbindungstest über HTTPS und Home-Bildschirm vorsehen; Kontingentverbrauch ausdrücklich erfassen, keine privaten Daten für Proben verwenden.

**Abnahme:** Betriebsweg und Kostenbegrenzung sind nachvollziehbar dokumentiert. Eine fehlende direkte Berechtigung wird ehrlich angezeigt. Falls kein passender Weg verfügbar ist, direkte KI als offen markieren und eine bewusste Produktentscheidung herbeiführen; Kopier-/Importbetrieb nicht als nahtlosen Chat deklarieren. Die UI bleibt providerunabhängig.

## B1 – Persistenz, Wiederaufnahme und Web-App-Grundlage

Abhängigkeit: B0 abgeschlossen.

Ergebnis: [Gesprächsspeicherung, Hintergrundaufträge und Wiederaufnahme](B1-ZWISCHENSTAND.md). Lokale Abnahme bestanden: 19 Unit-/Integrationstests, 11 Chromium-Browserfälle, Typprüfung, Lint und Build. Der Browserfall umfasst einen vollständigen Browserneustart ohne Netz, anschließende einmalige Synchronisierung, Migration bei Speicherfehler, parallele Fenster und Logout. Dies ersetzt keine echte iPhone-Abnahme.

- [x] B1.1 Additive Tabellen/Migrationen für Gespräche, Nachrichten, Aufträge und versionierte Fachreferenzen erstellen; bestehende Trainingsdaten erhalten.
- [x] B1.2 Nachricht und Auftrag atomar speichern; eindeutige Client-IDs und Mutations-IDs für wiederholbare Übertragungen implementieren.
- [x] B1.3 IndexedDB für Entwürfe und offene Änderungen einführen. Vorhandene localStorage-Warteschlange erst nach sicherer Übernahme ablösen.
- [x] B1.4 Speicherzustände, Wiederverbindung und Konfliktauflösung für mehrere Tabs implementieren. Speicherfehler und abgelaufene Anmeldung sichtbar behandeln.
- [x] B1.5 Persistenten Worker mit Lease, Zeitgrenzen, Abbruchzustand und Statusabfrage umsetzen. Unklar abgeschlossene externe Anfragen nicht blind wiederholen.
- [x] B1.6 Web-App-Manifest, Symbole, mobile Tastatur/Safe-Area und begrenzten Service Worker ergänzen. Private Caches bei Kontenwechsel/Logout kontrolliert behandeln.
- [x] B1.7 Serverneustart, Backup und Wiederherstellung mit bereits vorhandenen plus neuen Daten prüfen.

**Abnahme:** Satzentwurf und aktive Einheit überleben einen normalen Browserneustart auf demselben Gerät; serverbestätigte Daten überleben einen App-Neustart. Offline-Eingaben werden beim Wiederöffnen ohne Duplikate übertragen. Fehlende lokale Speicherung wird nicht als Erfolg angezeigt. Ein zuvor geladener Trainingsablauf öffnet offline; keine Garantie für iOS-Hintergrundausführung.

## B2 – Trainingsregeln und geprüfte KI-Verträge

Abhängigkeit: B1 abgeschlossen.

- [ ] B2.1 Quellenbasis für Volumen, Anstrengung, Pausen, Progression und Deload vervollständigen; Evidenz und Produktheuristik kennzeichnen.
- [ ] B2.2 Konkrete Standardparameter, Grenzen, Vergleichsfenster und Rundung anhand Erfahrung, Ziel und Übung festlegen. Bestehende Grenzwerte nur begründet ändern.
- [ ] B2.3 Individuelle Planung aus Zeitrahmen, Zielen, Erfahrung, Spaßfaktoren und bestätigten Vorlieben spezifizieren; Angaben und Planbegründung verknüpfen. Offene, optionale Stileinordnung zur Motivation ohne Personen-Presets oder automatische Zuordnung aus Häufigkeit definieren.
- [ ] B2.4 Double Progression um Vergleichbarkeit, fehlende Werte, Gerätewechsel und getrennte Satzarten ergänzen; deterministische Begründung ausgeben.
- [ ] B2.5 Geplanten, angefragten und vorgeschlagenen Deload samt Rückkehrregel definieren. Keine allgemeine Pflichtwoche oder automatische Diagnose.
- [ ] B2.6 Kurzen gemeinsamen Prompt und aufgabenspezifische Schemas implementieren. Rohantwortanzeige, Größenlimits und atomare Validierung erhalten.
- [ ] B2.7 Regel-/Antwortfälle aus den Trainingsregeln in bestehende Vertragstests aufnehmen. Prompt und Regelversion im Ergebnis referenzieren.

**Abnahme:** Dieselben gültigen Ist-Daten erzeugen unter derselben Regelversion dieselbe Progression. 900 Wiederholungen und widersprüchliche Antworten werden nicht übernommen. Planvorschläge berücksichtigen unterschiedliche Vorlieben auch bei gleichem Zeitbudget; zwei bis drei kurze Einheiten erzeugen keine automatische Mentzer- oder Intensitätszuordnung. Ein Plan ohne Stilnamen und eine abgelehnte Stilanalogie funktionieren gleichwertig. Deload-Ergebnisse lösen keine falsche reguläre Steigerung aus. Fehlende Informationen erzeugen keine erfundenen Leistungen oder Präferenzen.

## B3 – Kennenlernen und persönliches Profil

Abhängigkeit: B2 abgeschlossen.

- [ ] B3.1 Fortsetzbares Kennenlerngespräch mit Erkennung bereits beantworteter Fragen implementieren.
- [ ] B3.2 Erfahrung, Ziele, Prioritäten, Zeit, Wochentage, Equipment, Spaßfaktoren, Motivation, Vorlieben/Abneigungen und freiwillige Einschränkungen erfragen und strukturiert speichern; feste Grenzen und Wünsche unterscheiden. Bereits genannte Angaben nicht erneut abfragen, keine Stilwahl voraussetzen.
- [ ] B3.3 Vorläufige Angaben von bestätigtem Profil unterscheiden; eine korrigierbare Zusammenfassung vor Übernahme anzeigen.
- [ ] B3.4 Bestehende Nutzer mit ihren bisherigen Plänen übernehmen, kein verpflichtender Neustart.
- [ ] B3.5 Profilansicht mit gezielten Korrekturen und Quellenbezug für Vorlieben ergänzen. Freiwillige Rückmeldungen und Blockrückschau für Spaß/Alltagstauglichkeit nutzen; Interpretationen von bestätigten Angaben trennen.

**Abnahme:** Unterbrechen und Wiederöffnen setzt das Gespräch sinnvoll fort. Eine bereits beantwortete Frage wird nicht erneut standardmäßig gestellt. Fehlende Angaben zu Spaß und Prioritäten werden gezielt erfragt, statt sie aus einem Stilnamen zu erfinden. Nicht genannte Körperdaten bleiben leer. Eine einmalige Bemerkung oder Modellanalogie wird nicht unbemerkt zur dauerhaften Präferenz.

## B4 – Trainingsblock und Seite Pläne

Abhängigkeit: B3 abgeschlossen.

- [ ] B4.1 Block, Planversionen, Wochen-/Tageszuordnung und Zeitzone speichern; sechs Wochen als veränderbaren Vorschlag anbieten.
- [ ] B4.2 Aus bestätigtem Profil einen strukturierten Planentwurf erzeugen; Zeitbedarf, Regelkonformität und Bezug zu Zielen/Vorlieben prüfen. Optional eine passende, motivierende Einordnung erläutern, ohne den Plan durch eine Stilvorlage zu ersetzen.
- [ ] B4.3 Gesamtfreigabe mit gezieltem Ändern einzelner Übungen ermöglichen; neue Übungen weiterhin kontrolliert in die Bibliothek übernehmen.
- [ ] B4.4 Pläne-Seite mit Kalender, Wochenfortschritt, persönlicher Planbegründung, optionaler Stileinordnung, Entlastung und Änderungsdialog bauen.
- [ ] B4.5 Verschieben, Überspringen, Pausieren und Blockende ausdrücklich modellieren. Keine automatische Verdopplung versäumter Tage.
- [ ] B4.6 Änderungen nur auf künftige Einheiten anwenden; bereits gestartete/historische Snapshots erhalten.

**Abnahme:** Montag/Mittwoch/Freitag ergeben die richtigen Einheiten in der gewählten Zeitzone. Planänderungen erhalten historische Ergebnisse. Vorhandene Pläne bleiben nutzbar. Kein Startgewicht wird aus fehlenden Daten erfunden; Blockende ermöglicht Rückschau und bewusst bestätigten Folgeplan.

## B5 – Heute als vollständiger Trainingschat

Abhängigkeit: B4 abgeschlossen.

- [ ] B5.1 Heute durch Gespräch, Trainingsübersicht und Start/Fortsetzen ersetzen; aktive Einheit zuerst berücksichtigen.
- [ ] B5.2 Feste Karten für Aufwärmung, Übungen, Satztabellen, Timer und Abschluss bereitstellen. Bestehende Fachfunktionen verwenden.
- [ ] B5.3 Text/Diktat auf aktuelle Übung beziehen, vollständigen erkannten Text erhalten und mehrdeutige Zahlen klären. Korrektur ohne Duplikate ermöglichen.
- [ ] B5.4 Satzänderungen sofort sichern; Übungsabschluss erst nach Synchronisierung als einmaligen Chatbeitrag senden. Geplanten Fortgang unabhängig von KI-Latenz erlauben.
- [ ] B5.5 Geprüfte/licenzierte Übungshilfen mit Quelle einbinden. Fehlt ein geprüftes Medium, ehrliche Textanleitung oder gekennzeichnete Suche statt erfundener Video-URL.
- [ ] B5.6 Geplante Deloads und bestätigte Anpassungen sichtbar durch den Ablauf führen.
- [ ] B5.7 Abschlusszusammenfassung aus tatsächlichen Ergebnissen erstellen; unterbrochene/ausgelassene Sätze korrekt kennzeichnen.
- [ ] B5.8 Reale Safari-/Home-Bildschirm-Prüfung: Tastatur, Mikrofon, Sperrbildschirm, Browserende, Offline-Neustart, Wiederverbindung und Providerlimit.

**Abnahme:** Eine vollständige Einheit von „Lass uns loslegen“ bis Tagebucheintrag ist möglich. Nach Schließen bleibt der bestätigte Stand erhalten, offene Änderungen sind erkennbar. KI-Ausfall blockiert kein gespeichertes Workout. Planänderungen werden nicht ungefragt vorgeschlagen; konkrete Rückfragen bleiben möglich. Dies ist der erste vollständige Trainingsbegleiter.

## B6 – Tagebuch, Markdown und gemeinsames Gedächtnis

Abhängigkeit: B5 abgeschlossen.

- [ ] B6.1 Tagesansicht mit Training und bestehenden Mahlzeiten sowie verlinktem Gespräch vereinheitlichen.
- [ ] B6.2 Private Markdown-Exporte mit Quellen-IDs/-Versionen und atomarem Schreiben einführen; keine zweite manuell editierte Datenwahrheit.
- [ ] B6.3 Faktenzusammenfassung ohne KI bereitstellen, optionale Modellzusammenfassung getrennt kennzeichnen und begrenzen.
- [ ] B6.4 Relevante frühere Einheiten/Präferenzen gezielt für Beratung und Training auswählen; Nutzeransicht zum Korrigieren/Löschen ergänzen.
- [ ] B6.5 Korrektur/Löschung invalidiert abhängige Zusammenfassungen und erzeugt Export-/Löschaufträge. Nach Restore Abgleich durchführen.
- [ ] B6.6 Beratung mit nachvollziehbarem Zeitraum, Datenbasis und gespeicherten Rückfragen anbinden; bisherige Threads lesbar erhalten.

**Abnahme:** Zahlen in Chat, Tagebuch und Export stimmen mit der Datenbank überein. Ein korrigierter Satz bleibt nicht über eine alte Zusammenfassung als aktueller Fakt im KI-Kontext. Exportfehler beschädigen keine Trainingsdaten. Lokale Löschung wird nicht als Löschung beim Modellanbieter ausgegeben.

## B7 – Ernährung im gemeinsamen Gespräch

Abhängigkeit: B6 abgeschlossen.

- [ ] B7.1 Bestehende Mahlzeitenerfassung per Text/Diktat in Karten integrieren; aktuelle Validierung und Unsicherheitsangaben erhalten.
- [ ] B7.2 Eintrag, Korrektur, Frage und geplante Mahlzeit unterscheiden; unvollständige Tage nicht als vollständige Energiebilanz darstellen.
- [ ] B7.3 Optional Essensfoto mit Vorschau, begrenztem Upload und bewusster Übermittlung an einen bildfähigen Adapter ergänzen.
- [ ] B7.4 Portionsfragen, Schätzspanne, Annahmen und Bearbeitung vor dem Speichern anbieten.
- [ ] B7.5 Ernährungsfragen mit Training verbinden, ohne unbelegte Kausalitäten oder erfundene Tageswerte. Bestehende synthetische Ernährungsfälle weiterverwenden.

**Abnahme:** Text, Diktat und freigegebene Bilder führen zu korrigierbaren Einträgen. Keine Fotoanalyse ohne geeignete Modellfähigkeit. Unklare Portionen bleiben unklar; Korrekturen zählen nicht doppelt. Frühere Ernährungsszenarien und Rückfragen bleiben abgedeckt.

## B8 – Spätere, separat auszuwählende Erweiterungen

Abhängigkeit: B7 abgeschlossen und bewusste Auswahl der jeweiligen Erweiterung. Keine Pflicht für den ersten Ausbau.

- [ ] B8.1 Diagramme aus tatsächlichen Trainingsdaten mit Filterung von Aufwärmung, Deload und Übungsvarianten.
- [ ] B8.2 Weiteren Anbieteradapter mit eigener Berechtigungs-/Kostenprüfung und denselben Verträgen integrieren; kein stiller Anbieterwechsel.
- [ ] B8.3 Körperfotos: eigenen Datenschutz-/Löschablauf und vorsichtige optische Rückmeldung aus dem Konzept konkretisieren. Keine Diagnose, Kraftmessung, Attraktivitätsnote oder automatische Planänderung aus Fotos.
- [ ] B8.4 Mehrbenutzerbetrieb bei Bedarf als eigenes Architekturvorhaben mit Kontentrennung, individuellem Anbieterzugang und Betriebsbewertung planen.

**Abnahme:** Je Erweiterung eigene Kriterien vor Umsetzung festlegen. Keine dieser Funktionen wird durch Abschluss der Kernphasen als bereits zugesagt oder vorhanden dargestellt.

## Prüfstrategie und Abschlussnachweise

- Bestehende Vorgabe **30 automatisierte Tests insgesamt** respektieren: aktuell 19 Unit-/Integrationstests und 11 Browserfälle. Neue relevante Szenarien in fachlich passende Vertragstests integrieren; Assertions und bisherige Abdeckung nicht zur Einhaltung der Zahl entfernen.
- Datenhaltung, Duplikate, Konflikte, Migrationen, Wiederaufnahme und Regelberechnung gezielt prüfen. Keine neuen Tests allein für statische Texte oder reine Dokumentationsänderungen.
- Typprüfung, Lint und Build nach relevanten Codephasen; passende Unit-/Integrationstests und Browserabläufe nach betroffenen Verträgen. Keine unnötigen Wiederholungen ohne neue Änderung oder offenen Befund.
- Chromium-Automation ersetzt keine echte Safari-/iPhone-Prüfung. Manuelle Gerätefälle separat protokollieren und nicht als bestandene automatische Tests zählen.
- Normale Tests ohne echte Modellnutzung. Bewusste Live-Evaluationen mit synthetischen Daten, gespeichertem Prompt/Regelstand und öffentlichen Antworten durchführen; Kontingentgrenzen beachten, keine kostenpflichtige Ausweichroute.
- Je Phase geänderte Datenmodelle, geprüfte Umgebung, Grenzen und offene Punkte im Phasenbericht festhalten. Deployment und produktive Migration nicht als durch lokale Tests bewiesen darstellen.
