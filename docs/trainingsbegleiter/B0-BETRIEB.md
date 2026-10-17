# B0: Betriebsentscheidung und Schnittstellen

Stand: 17.10.2026. Grundlage: Nutzerentscheidung während des Implementierungsstarts.

## Aktueller Umfang

Zuerst die persönliche Instanz lokal vollständig entwickeln. Railway ist noch nicht eingerichtet. Der Nutzer hat bestätigt, dass zusätzliche bezahlte ChatGPT-Nutzung ausgeschaltet ist. Diese Bestätigung betrifft seine Kontoeinstellung; Fitmin kann sie nicht technisch abfragen oder dauerhaft garantieren. Keine echten Modellanfragen für die B0-Prüfung erforderlich.

Eine spätere Weitergabe an Freunde soll möglich sein: zunächst Quellcode/eigene Installation mit jeweils eigener Datenbank, eigenem Login und eigenem Modellkonto. Niemals die persönliche Datenbank oder `chatgpt-connection.json` weitergeben. Ein gemeinsamer Dienst mit mehreren Benutzern braucht die separat geplante Kontentrennung; er entsteht nicht allein durch das Railway-Deployment.

## Direkte KI und Hosting

Lokale direkte Anbindung bleibt auf Loopback beschränkt. Der heutige OAuth-Ablauf mit PKCE und lokalem Callback bleibt bestehen. Eine Safari-Web-App oder eine erreichbare LAN-Adresse ändert diese Grenze nicht automatisch.

Die offizielle Dokumentation beschreibt einen VM-Ablauf mit eigener stabiler Host-ID, lokaler Anmeldung und geschützter Übertragung der ausgewählten Credentials. Sie unterscheidet zugleich persönlich betriebene Open-Source-Clients von gehosteten Angeboten. Vor Railway-Deployment die konkrete Betriebsform erneut prüfen; weder Tokens kopieren noch die localhost-Sperre einfach entfernen. [VM-Verfahren](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms), [Geltungsbereich](https://developers.openai.com/siwc/token-sharing-open-source).

Kostenpolitik: ausschließlich freigegebener Konto-/Abo-Zugang, keine API-Key-Abrechnung, kein automatischer Anbieterwechsel, keine Inferenzwiederholungen. Kontoanmeldung, Berechtigung, ausgewähltes Modell und aktuell verfügbares Kontingent sind verschiedene Zustände. Ein Free-Konto wird nicht als garantierter Modellzugang beworben. Providerseitige Credits werden in ChatGPT verwaltet, nicht von Fitmin. [OpenAI Quickstart](https://developers.openai.com/siwc/quickstart), [Nutzungseinstellungen](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions).

## Implementierte Schnittstellen

- `src/lib/ai-provider.ts`: gemeinsamer Adapter für strukturierte Anfragen. Berechtigung und Modell vor Verbrauch des App-Budgets prüfen; eine Anfrage an genau das vorbereitete Konto/Modell. Normierte Fehler und öffentliche Originalantworten erhalten.
- Plan-, Mahlzeiten- und Beratungsrouten verwenden diesen Adapter. Manueller Import bleibt separat und ohne direkte Modellanfrage.
- `GET /api/ai/config` liefert zusätzlich implementierte Anbieterfähigkeiten und Kostenmerkmale. Bild/Audio werden nicht als verfügbar beworben, solange der Adapter nur Text implementiert.
- `src/lib/conversation-contract.ts`: versionierte, strikt geprüfte Verträge für Eingaben, Nachrichten, Kartenreferenzen, Auftragsstatus und explizite Trainingsaktionen. Noch keine Chat-Persistenz oder Ausführung dieser neuen Aktionen.

Bestehende Satz- und Abschlussrouten bleiben maßgeblich. Der zukünftige Chat verweist auf Fachobjekte und ihre Versionen; er dupliziert weder Satzwerte in Modell-Markdown noch erlaubt er Modell-HTML oder beliebige Aktionen. Der Trainingsabschluss benötigt weiterhin die tatsächlichen Satzversionen und die vorhandene Abschlussprüfung.

## Abnahme und spätere Geräteprüfung

Automatisierte B0-Prüfung nutzt synthetische Konten und simulierte Transporte: fehlende Freigabe/Modellauswahl ohne Budgetverbrauch, erfolgreich validierte Antwort, Budgetabbruch ohne Versand, HTTP-/Streamlimit ohne Wiederholung, Originalantwort bei ungültigem Schema, keine Weitergabe unbekannter Fehlerdetails. Vertragstests prüfen Rollenfälschung, unbekannte Karten, überlange Nachrichten und unzulässige Trainingsaktionen.

Nach Freigabe des späteren HTTPS-Betriebs manuell auf echtem iPhone prüfen: Anmeldung, Home-Bildschirm-Installation, Verbindung zum vorgesehenen eigenen Konto, eine bewusste synthetische Modellanfrage, gesicherte Antwort nach Browserende und Kontingentanzeige. Dieser Test ist geplant, nicht durchgeführt. Er blockiert gemäß Nutzerentscheidung die lokale Entwicklung nicht, bleibt aber Voraussetzung für die Freigabe des gehosteten direkten Chats.
