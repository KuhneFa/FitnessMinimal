# Produktkonzept: Fitmin als Trainingsbegleiter

Stand: 17.10.2026. Vorschlag für den Umbau, keine Beschreibung bereits implementierter Funktionen. Siehe [Übersicht](README.md).

## Ziel und Umfang

Fitmin lernt Ziele und Rahmenbedingungen kennen, vereinbart einen Trainingsblock und begleitet jede Einheit. Gespräche und tatsächliche Ergebnisse bleiben nachvollziehbar. Als erste Zielgruppe gilt eine erwachsene Person in ihrer eigenen Instanz; Mehrbenutzerbetrieb wird nicht stillschweigend vorausgesetzt.

Die Person kann frei schreiben oder diktieren. Tabellen und Schaltflächen im Chat bleiben gleichwertige Eingabemöglichkeiten, besonders zwischen Sätzen. Planverwaltung, Training und Ernährung bleiben auch bei nicht verfügbarer KI bedienbar.

## Kennenlernen und erster Plan

1. Frei erzählen lassen: bisheriges Training, Erfahrung, Pausen und Wünsche.
2. Bereits genannte Angaben übernehmen, nur fehlende Informationen nachfragen. Kurze Fragegruppen statt eines langen Pflichtformulars.
3. Ziel und Prioritäten, bevorzugte Trainingsweise, Muskelgruppen, Trainingsort und Geräte erfassen.
4. Gewünschte Wochentage, Einheiten pro Woche, Zeit pro Einheit und relevante Einschränkungen klären.
5. Spaß und Motivation erfragen: „Was hat dir bisher am Training Spaß gemacht?“, „Was ist dir besonders wichtig?“ und bei Bedarf „Was möchtest du vermeiden?“ Bekannte Vorlieben nicht erneut abfragen; keine Auswahl eines benannten Trainingsstils verlangen.
6. Körperdaten nur freiwillig und zweckbezogen erfassen. Fotos sind keine Voraussetzung.
7. Korrigierbare Profilkarte anzeigen und bestätigen lassen.
8. Aus diesen Angaben einen individuellen Trainingsblock vorschlagen, beispielsweise sechs Wochen mit Montag, Mittwoch und Freitag. Wochenstruktur, Zeitbedarf, Übungen, Steigerungsregeln und gegebenenfalls Entlastung sichtbar machen und auf die konkreten Wünsche beziehen. Eine passende Trainingsphilosophie optional als motivierende Einordnung ergänzen, ohne den Plan in eine feste Stilvorlage zu pressen.
9. Den gesamten geprüften Plan bestätigen lassen; einzelne Übungen bleiben änderbar. Das bisherige zwingende Annehmen jeder einzelnen Übung wird für diesen Ablauf bewusst durch die Planfreigabe ersetzt.

Jede Etappe ist unterbrechbar. Ein bestätigtes Profil bleibt von vorläufig erkannten Angaben getrennt. Ein vorhandener Plan kann als Ausgangspunkt dienen; bestehende Nutzer müssen ihn nicht neu erstellen.

Die Reihenfolge lautet: Angaben verstehen → Rahmenbedingungen und Vorlieben unterscheiden → Plan begründen → optional einen verwandten Ansatz nennen. Es gibt keinen geschlossenen Katalog aus Mentzer, Arnold oder anderen Namen. Eigene Mischformen und Pläne ohne Stilbezeichnung sind gleichwertig.

Beispiel: „Du möchtest zwei- bis dreimal pro Woche kurz trainieren und magst überschaubare Einheiten. Darauf bauen wir deinen Plan auf.“ Allein daraus wird weder eine Vorliebe für sehr hohe Anstrengung noch ein Mentzer-Programm abgeleitet. Eine Stilanalogie ist nur dann sinnvoll, wenn weitere Angaben dazu passen und sie der Person bei der Motivation hilft. Nennt die Person selbst einen Ansatz, fragt Fitmin bei Bedarf nach, was sie daran anspricht.

Spätere Rückmeldungen zu Spaß, Alltagstauglichkeit und unerwünschten Übungen fließen in bestätigte Anpassungen ein. Dafür die Blockrückschau und freiwillige Rückmeldungen nutzen; nicht nach jeder Übung ungefragt den Plan neu verhandeln.

## Seiten und Elemente

| Bereich | Elemente | Aufgabe |
| --- | --- | --- |
| Heute | Datum, Block/Woche, Trainingschat, kompakte Übersicht, Start/Fortsetzen | Heute trainieren oder eine unterbrochene Einheit fortsetzen |
| Aktive Übung im Heute-Chat | Anleitung, geprüftes Bild/Video, Satztabelle, letzte vergleichbare Werte, Timer, Abschlussaktion | Ergebnisse erfassen und zur nächsten Übung wechseln |
| Pläne | Aktiver Block, Wochenkalender, Ziele, persönliche Planbegründung, optionale Stileinordnung, Planversionen, Änderungsdialog | Den vereinbarten Plan ansehen und gezielt anpassen |
| Tagebuch | Tagesliste/Kalender, Training und Mahlzeiten, Zusammenfassung, aufklappbarer Verlauf | Tatsächliches Geschehen nachlesen, korrigieren und später grafisch auswerten |
| Beratung | Gesprächsliste, Zeitraumauswahl, sichtbare Datengrundlage, Rückfragen | Training und Ernährung anhand gespeicherter Angaben besprechen |
| Einstellungen | Profil, Vorlieben, KI-Verbindung, Datennutzung, Export/Löschen | Kontrolle über Angaben, Anbieter und Speicherung |

Die Reiter teilen sich Daten, aber nicht einen endlos wachsenden Chat. Je Training ein Gespräch, je Plan ein Planungsgespräch, je Beratung ein eigener Thread. Tagebucheinträge verlinken ihre Ursprungsgespräche. Eine Mahlzeit aus dem Heute-Chat wird als Mahlzeit gespeichert und nicht als Trainingsergebnis behandelt.

## Beispiel einer Einheit

- Person: „Heute ist Montag, lass uns loslegen.“
- Fitmin ermittelt anhand Datum, Zeitzone, Plan und offenen Einheiten den passenden Trainingstag. Bei Widersprüchen kurz klären; eine bereits aktive Einheit zuerst zum Fortsetzen anbieten.
- Fitmin: „Heute steht Training A an.“ Übersicht und „Training starten“.
- Änderungen nur auf ausdrücklichen Wunsch oder bei einem konkreten Klärungsbedarf; keine wiederholten allgemeinen Optimierungsfragen.
- Aufwärmung und Arbeitsübungen getrennt darstellen. Arbeitsgewichte nicht aus Körperdaten oder Fotos erfinden.
- Pro Übung eine bedienbare Karte. Satzwerte werden während der Eingabe gesichert.
- „Übung abschließen“ fasst die Ergebnisse als Chatbeitrag zusammen. Eine verzögerte KI-Antwort blockiert die nächste bereits festgelegte Übung nicht.
- Diktierte Werte werden als erkannte Werte sichtbar. Eindeutige Angaben können übernommen werden; Mehrdeutigkeiten verlangen Rückfragen. Korrekturen ersetzen gezielt Werte und erzeugen keine zusätzlichen Sätze.
- Zum Abschluss tatsächliche Leistung, ausgelassene Übungen und offene Angaben zusammenfassen. Training beenden und zum Tagebuch verlinken.

Ausgelassene Trainingstage werden nicht als erledigt markiert und nicht automatisch auf den nächsten Tag gestapelt. Verschieben, Überspringen und Fortsetzen sind ausdrücklich unterschiedliche Aktionen. Das Ende eines Sechswochenblocks löst eine Rückschau und einen neuen Vorschlag aus, keinen stillen Folgevertrag.

## Speichern und Wiederaufnahme

Eingabe sichern, Übung abschließen und Training beenden sind verschiedene Vorgänge. Entwürfe lokal zwischenspeichern, gültige Werte zeitnah auf dem Server bestätigen lassen. Sichtbare Zustände: „Wird gespeichert“, „Gespeichert“, „Nur auf diesem Gerät“, „Konflikt klären“.

Nach Browserende werden Gespräch, aktive Übung, Sätze, Entwurf und offene Übertragungen wiederhergestellt. Eine KI-Antwort wird unabhängig davon gespeichert. Kein Versprechen, dass eine geschlossene iPhone-Web-App im Hintergrund weiterarbeitet. Die Details stehen in der [Architektur](ARCHITEKTUR.md).

## Web-App auf dem Handy

Responsive Oberfläche mit Web-App-Manifest, Symbolen und eigenständiger Darstellung. Installation über Safari → Teilen → „Zu Home-Bildschirm hinzufügen“. Apple beschreibt diesen Weg ausdrücklich; eine App-Store-App ist für dieses Ziel nicht erforderlich. [Apple-Anleitung](https://support.apple.com/de-de/guide/iphone/iphea86e5236/ios)

HTTPS und ein erreichbarer Server bleiben erforderlich. Einen zuvor geladenen aktiven Trainingsablauf gezielt offline verfügbar machen. Mikrofonberechtigung und Diktatunterstützung auf einem echten iPhone prüfen; Tastaturdiktat und Tippen bleiben verfügbar. Browserdiktat nicht pauschal als vollständig lokale Verarbeitung bezeichnen.

## Ernährung und Beratung

Vorhandene Mahlzeitenfunktionen weiterverwenden. Text und Diktat liefern einen korrigierbaren Entwurf; nur tatsächlich gegessene Mengen verbuchen. Kalorienschätzungen mit Unsicherheit und Annahmen speichern, fehlende Werte nicht als null rechnen. Essensfotos kommen nach dem stabilen Trainingsablauf hinzu. Bildvorschau vor Übermittlung, Rückfragen zu Portionen und nachträgliche Korrektur sind Teil des Ablaufs.

Beratung darf Trainings- und Ernährungsdaten gezielt gemeinsam verwenden. Der verwendete Zeitraum und fehlende Angaben bleiben sichtbar. Bei neuen oder korrigierten Daten wird die Grundlage bewusst aktualisiert; alte Antworten behalten den Bezug zu ihrer damaligen Grundlage.

## Später: Körperfotos und optische Ziele

Gesonderte optionale Funktion, außerhalb der ersten Ausbaustufe. Erst nach Definition eines geeigneten Datenschutz- und Bewertungsablaufs umsetzen:

- Fotos nur auf ausdrücklichen Wunsch aufnehmen/auswählen; vor jedem Versand Bilder und Zielanbieter zeigen.
- Lokales Betrachten und Übermittlung zur Analyse unterscheiden. Gesichtszuschnitt und Entfernen von Standortmetadaten vor dem Upload ermöglichen.
- Sichtbare Proportionen und selbst gewählte ästhetische Ziele besprechen. Aus einem Foto keine Muskelkraft, funktionelle Schwäche, Erkrankung oder präzisen Körperfettanteil ableiten.
- Licht, Pose, Perspektive und Unsicherheit benennen. Keine Attraktivitätsnote oder abwertende Körperbewertung.
- Vorschläge als besprechbare Optionen behandeln; keine automatische Planänderung aus einem Foto.
- Aufbewahrung, lokale/serverseitige Löschung, Backups und Grenzen der Löschung beim Anbieter erklären. Keine Fotos in normalen Logs oder standardmäßigen Markdown-Exporten.

Spätere weitere Ideen: Diagramme aus tatsächlichen Satzdaten, zusätzliche Modellanbieter, mehrere Nutzer. Diese Ideen sind nicht Voraussetzung für den ersten Trainingsbegleiter.
