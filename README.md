# Veritrack

Zeiterfassung für Bands. Mitglieder und Rollen verwalten, Zeit auf Projekte tracken, Aufgaben organisieren, und im Timetable und in den Statistiken sehen, wohin die Zeit geflossen ist.

Der Kern ist der Timer auf dem Dashboard: Projekt ist vorausgewählt, ein Klick startet. Er läuft über Tab-Wechsel und Reloads hinweg weiter und ist für die ganze Band live sichtbar.

## Voraussetzungen

- **Node.js 22** oder neuer
- **npm** (kein pnpm nötig)
- **Java 11+** auf dem PATH, für den Firestore-Emulator
- **firebase-tools**: `npm install -g firebase-tools`

## Loslegen

```bash
npm install
npm run dev:all
```

Das startet die Firebase-Emulatoren und den Next.js-Dev-Server zusammen:

| Dienst | Adresse |
|--------|---------|
| App | http://localhost:3000 |
| Emulator-UI | http://127.0.0.1:4000 |
| Auth-Emulator | 127.0.0.1:9099 |
| Firestore-Emulator | 127.0.0.1:8080 |

Es werden **keine echten Firebase-Zugangsdaten gebraucht.** Die mitgelieferte `.env.local` zeigt auf die lokalen Emulatoren. Registriere dich einfach mit einer beliebigen E-Mail und einem Passwort, die Daten bleiben auf deinem Rechner.

> Der Emulator startet leer. Lege nach der Registrierung eine Band und darin ein Projekt an, dann läuft der Timer.

## Skripte

| Befehl | Zweck |
|--------|-------|
| `npm run dev:all` | Emulatoren + Dev-Server (der übliche Weg) |
| `npm run dev` | Nur der Dev-Server |
| `npm run emu` | Nur die Emulatoren |
| `npm run build` | Produktions-Build |
| `npm run typecheck` | TypeScript prüfen |
| `npm run lint` | ESLint |
| `npm test` | Unit-Tests |
| `npm run test:rules` | Firestore-Security-Rules gegen den Emulator |
| `npm run format` | Prettier |

`npm run typecheck` braucht einen vorherigen `npm run build`: Next.js 16 erzeugt die globalen Routen-Typen erst dabei.

## Auf ein echtes Firebase-Projekt umstellen

1. Projekt in der [Firebase Console](https://console.firebase.google.com/) anlegen und eine Web-App hinzufügen.
2. Die sechs Werte aus der App-Konfiguration in `.env.local` eintragen (siehe `.env.example`).
3. `NEXT_PUBLIC_USE_EMULATOR=false` setzen.
4. Unter Authentication → Sign-in method **Google** und **E-Mail/Passwort** aktivieren.
5. Rules und Indizes deployen:

   ```bash
   firebase use <projekt-id>
   firebase deploy --only firestore
   ```

Schritt 5 ist nicht optional. Der Emulator erzwingt keine zusammengesetzten Indizes, deshalb funktionieren Abfragen lokal, die gegen ein echtes Projekt ohne den passenden Index fehlschlagen.

Hosting ist in `firebase.json` vorbereitet, aber bewusst nie deployed worden. Es nutzt die Framework-Integration von Firebase Hosting, die für Next.js noch experimentell ist: erst gegen ein Staging-Projekt testen.

## Rollen und Berechtigungen

Zwei getrennte Konzepte, die absichtlich nichts miteinander zu tun haben:

- **Rolle** (Gitarre, Gesang, Management): rein informativ, gibt Farbe im Timetable und im Profil.
- **Berechtigung**: steuert die Rechte.
  - **Admin** verwaltet Band, Mitglieder und Projekte und darf alle Zeiteinträge korrigieren.
  - **Mitglied** trackt eigene Zeit und bearbeitet Aufgaben.
  - **Betrachter** liest nur.

Durchgesetzt wird das in `firestore.rules`, nicht im Frontend. `src/lib/permissions.ts` spiegelt dieselbe Matrix nur, um Bedienelemente auszublenden, die der Server ohnehin ablehnen würde. Beide Seiten werden gegen dieselben Testfälle geprüft.

## Beitreten

Jede Band hat einen achtstelligen Einladungscode. Wer ihn hat, tritt als Mitglied bei und wählt beim Onboarding seine Rolle. Ein Admin kann den Code erneuern, wodurch alle vorher verschickten Links sofort ungültig werden.

## Tests

```bash
npm test          # Zeit-, Datums-, Statistik- und Berechtigungslogik
npm run test:rules  # Security Rules gegen den Firestore-Emulator
```

Die Rules-Tests starten den Emulator selbst. Läuft parallel schon `npm run dev:all`, ist Port 8080 belegt: vorher stoppen.
