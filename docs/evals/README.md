# Ernährungsfragen – echte Modellproben

08.10.2026, vorhandene lokale ChatGPT-Abo-Verbindung, ausgewähltes Modell `gpt-5.6-luna`. Fünf einzelne Anfragen; kein API-Key, kein Modellwechsel, kein kostenpflichtiger Fallback, keine automatischen Wiederholungen. Ein nötiger OAuth-Refresh erfolgte über die bestehende Verbindung. Alle Eingaben sind erfunden; persönliche Tagebuchdaten oder Profilangaben wurden nicht gelesen oder versendet. Die Aufrufe zählen zum bestehenden gemeinsamen App-/Abo-Budget.

| Probe | Ergebnis | Unveränderte Antwort mit Eingabe/Prompt |
| --- | --- | --- |
| „100 g Reis“ ohne roh/gegart | Alle kcal-Werte null; konkrete Rückfrage nach roh oder gekocht | [Vorher: Reis](nutrition-before-rice.json) |
| Nur eine Mahlzeit mit 500 kcal protokolliert; vegan und Erdnussallergie | Kein erfundener Tagesmangel; drei praktische Vorschläge, Allergiehinweis; 158 Wörter | [Vorher: Beratung](nutrition-before-advice.json) |
| 150 g Joghurt à 63 kcal/100 g + 40 g Flocken à 370 kcal/100 g | Rechenweg 94,5 + 148 = 242,5; korrekt auf 243 kcal gerundet, keine weiteren Zutaten | [Packungswerte](nutrition-after-label.json) |
| Dieselbe Frage zum unvollständigen Tagebuch nach Promptpräzisierung | Weiterhin keine Aussage über ein Defizit; kompakter mit 141 Wörtern und einer gezielten Rückfrage | [Nachher: Beratung](nutrition-after-advice.json) |
| Rückfrage: Umsetzung morgen ohne Büroküche | Baut auf den vorigen Vorschlägen auf; vegane Optionen, Zutaten-/Spurenhinweis, Kühlmöglichkeit berücksichtigt | [Nachher: Rückfrage](nutrition-after-followup.json) |

Die JSON-Dateien enthalten Prompt-Hash, tatsächlich verwendete Anweisungen, synthetische Eingaben, Modellname, Zeitpunkt und öffentlichen Originalantworttext. Reasoning, Anbieter-Rohdaten und Zugangsdaten werden nicht gespeichert.

## Daraus abgeleitete Änderungen

Die erste Version beantwortete beide Ausgangsproben bereits sinnvoll. Es wurde kein damaliger Rechen- oder Sicherheitsfehler erfunden. Präzisiert wurden die Regeln, damit bewährtes Verhalten ausdrücklich und wiederholbar vorgegeben ist: Roh-/Gargewicht und fehlende Portionsgrößen gezielt klären; Packungs-/Rezeptwerte vor Durchschnittswerten verwenden; nur den verzehrten Anteil berechnen; eindeutige Korrekturen ersetzen frühere Angaben; geplantes oder verneintes Essen nicht als gegessen zählen.

Die Beratung beantwortet zuerst die Frage, strebt 80–150 Wörter für Erstfeedback und 40–100 für konkrete Rückfragen an und stellt höchstens eine gebündelte Rückfrage. Allergien, Ernährungsweise und praktische Grenzen gelten ausdrücklich auch in Folgefragen. Der Vergleich zeigte eine kürzere Erstantwort bei weiter vorhandenem Kontext; eine einzelne Antwort beweist keine allgemeine Qualitätssteigerung.

Die App erzwingt zusätzlich die im Reisbeispiel gezeigte Trennung: Eine offene Rückfrage darf nicht gleichzeitig fertige kcal enthalten. Diese letzte Vertragspräzisierung wurde nach der Packungswertprobe ergänzt; deren tatsächlicher damaliger Prompt ist unverändert in der Datei erhalten. Die aufgezeichnete Antwort erfüllt auch den endgültigen Vertrag. Widersprüchliche Antworten werden durch Unit- und Browsertests als Fehler geprüft.

## Grenzen und Wiederholung

Dies sind fünf Stichproben, keine statistische Evaluation und keine ernährungsmedizinische Prüfung. Die automatischen Regressionen spielen diese realen Antworten ohne neue Modellanfragen durch Import, Validierung und Persistenz. Sie garantieren nicht, dass spätere Modellantworten sachlich richtig sind. Weitere vorbereitete Eingaben zu Rezeptanteilen, Korrekturen, geplanten Mahlzeiten und fehlenden Portionsgrößen stehen im Datensatz; diese wurden noch nicht live angefragt.

Aufbau mit festen Eingaben, benannten Erwartungen und dokumentierten Antworten entsprechend den [OpenAI Docs zu Evaluationen](https://developers.openai.com/api/docs/guides/evaluation-getting-started); der kostenpflichtige Evals-Dienst wird nicht benutzt.

Explizite Einzelprobe: `npm run eval:nutrition -- portion-share docs/evals/neue-portionsprobe.json`. Für `advice-followup` zusätzlich den Pfad zu einer gespeicherten synthetischen `advice-incomplete`-Antwort angeben. Existierende Ausgabedateien werden vor dem Modellaufruf abgelehnt. Keine automatische Ausführung durch `npm test` oder `npm run check`.
