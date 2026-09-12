# Bike Geo

Bike Geo findet heraus, welcher Fahrradrahmen mit welcher Geometrie zu welcher Person am besten passt.

Eingabe sind Körpermaße, Beweglichkeit, gewünschte Sitzhaltung und Disziplin. Ausgabe ist eine Rangliste
von Rahmen mit Score, dem dafür nötigen Cockpit (Vorbaulänge, Vorbauwinkel, Spacer), dem nötigen
Sattelversatz und einer Begründung in Klartext.

## Status

Frühes Fundament, keine App. Vorhanden ist die Kernlogik als TypeScript-Bibliothek ohne Oberfläche und
ohne Rahmendatenbank. Die enthaltenen Rahmendaten sind erfundene, aber plausible Beispielwerte, keine
Herstellerdaten.

## Schnellstart

```sh
npm install
npm test        # 27 Unit-Tests
npm run demo    # Rangliste für eine Beispielperson (1,78 m, 84 cm Schrittlänge, Rennrad)
```

## Wie das Matching funktioniert

Alle Positionen beziehen sich auf die Tretlagermitte (x nach vorn, y nach oben, mm).

1. **Zielpositionen der Person** (`src/fit.ts`), unabhängig vom Rahmen:
   - Sattelhöhe = Schrittlänge × 0,883 (LeMond-Regel).
   - Sattelmitte aus Sattelhöhe und einem disziplintypischen effektiven Sitzwinkel.
   - Überhöhung Sattel → Lenker aus Disziplin, Haltung und Beweglichkeit, skaliert mit der Körpergröße.
   - Sattel-Lenker-Reach = (Rumpf + Arm) × Faktor je Disziplin und Haltung. Fehlende Rumpf- und Armmaße
     werden aus der Körpergröße geschätzt und als Schätzung gekennzeichnet.
2. **Rahmen gegen Ziel prüfen** (`src/match.ts`):
   - Überstandshöhe gegen Schrittlänge: hartes Ausschlusskriterium.
   - Sitzwinkel des Rahmens: welcher Sattelversatz nötig wäre, und ob Stütze plus Sattelstreben das hergeben.
   - Sitzrohrlänge: ob der Stützenauszug plausibel bleibt (zu kurz = Rahmen zu groß, zu lang = zu klein).
   - Lenkerposition: Suche über Vorbaulängen, Vorbauwinkel und Spacer (`src/cockpit.ts`), welche Kombination
     die Ziel-Lenkermitte am besten trifft. Ein Rahmen, der nur mit Extremvorbau passt, wird abgewertet.
3. **Score** 0 bis 100 aus gewichteten Strafpunkten; harte Ausschlüsse geben 0.

Alle Koeffizienten stehen in `src/constants.ts`, mit Erklärung.

## Was noch nicht stimmt

Das ist die ehrliche Liste, nicht die Marketingversion.

- **Die Faustregeln sind nicht validiert.** Die Reach-Faktoren, Überhöhungen und Beweglichkeitszuschläge
  wurden so gewählt, dass eine 1,78 m große Person auf einem typischen 56er Rennrad mit 110er Vorbau
  landet. Das ist Kalibrierung an einem Punkt, kein Modell. Ohne echte Fitting-Daten (Personen mit bekannten
  Maßen und bekannter, als passend bestätigter Sitzposition) bleibt es eine Faustregel, die bei
  ungewöhnlichen Proportionen (langer Rumpf, kurze Beine oder umgekehrt) systematisch danebenliegen kann.
- **Bikefitting hängt von Dingen ab, die hier fehlen.** Kurbellänge, Schuh- und Cleatposition, Sattelmodell,
  Lenkerreach und -form, Beschwerden, Vorerfahrung. Ein Rechner kann ein Fitting nicht ersetzen, er kann nur
  Kandidaten eingrenzen.
- **MTB-Geometrie wird zu einfach behandelt.** Reach und Stack beschreiben die Sitzposition; für Trail und
  Enduro sind stehende Position, Radstand, Lenkwinkel und Sitzrohrlänge für Variostützen wichtiger. Das
  Modell kennt die Sitzposition, nicht die Fahrposition.
- **Effektiver vs. tatsächlicher Sitzwinkel.** Hersteller geben bei geknickten Sitzrohren oft nur den
  effektiven Winkel bei einer Normgröße an. Für sehr große oder kleine Personen weicht der reale Sattelversatz
  ab. Das Modell ignoriert das.
- **Es gibt keine Rahmendaten.** Herstellergeometrien sind nicht frei als Datensatz verfügbar. Sie müssen
  manuell erfasst oder gescrapt werden, und Scraping ist rechtlich und wartungstechnisch heikel. Das ist für
  eine nutzbare App der größere Aufwand als die Logik.
- **Keine Oberfläche, keine Persistenz.** Nur Bibliothek und Demo-Skript.

## Nächste sinnvolle Schritte

1. Rahmendaten: Format ist definiert (`FrameGeometry` in `src/types.ts`); Quelle klären.
2. Kalibrierung: mindestens 20 bis 30 reale Person-plus-passendes-Rad-Datensätze sammeln und die
   Koeffizienten in `src/constants.ts` daran prüfen.
3. Oberfläche: Formular für Maße, Ausgabe der Rangliste mit Begründungen.

## Projektstruktur

```
src/
  types.ts         Domänenmodell (Person, Rahmen, Cockpit, Match-Ergebnis)
  constants.ts     Alle heuristischen Koeffizienten, kommentiert
  anthropometry.ts Schätzung fehlender Körpermaße
  geometry.ts      Vektorrechnung, Sattelposition
  cockpit.ts       Lenkerposition aus Rahmen + Vorbau + Spacer, Cockpit-Suche
  fit.ts           Person → Zielpositionen
  match.ts         Rahmen bewerten und ranken
  data/            Beispielrahmen (erfundene Werte)
  demo.ts          Konsolen-Demo
test/              Vitest-Tests
```
