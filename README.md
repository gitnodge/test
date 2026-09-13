# Bike Geo

Bike Geo findet heraus, welcher Fahrradrahmen mit welcher Geometrie zu welcher Person am besten passt.

Eingabe sind Körpermaße, Beweglichkeit, gewünschte Sitzhaltung und Disziplin. Ausgabe ist eine Rangliste
von Rahmen mit Score, dem dafür nötigen Cockpit (Vorbaulänge, Vorbauwinkel, Spacer), dem nötigen
Sattelversatz und einer Begründung in Klartext.

Zweiter Teil ist ein Bikefitting-Protokoll: das dynamische Fitting auf der Rolle, Schritt für Schritt
(Werkzeug, Baseline, Cleats, Kurbellänge, Beinmaße und Rechner, Indikatoren für Sattelhöhe, Sattel
vor/zurück und Lenker, Iteration, Fehlerbilder, Aufzeichnung, Straßentest), mit Bewertung der Eingaben
gegen die Schwellwerte der Methodik.

Dritter Teil ist ein virtuelles Fit-Bike für Kunden ohne eigenes Rad, nach dem Prinzip verstellbarer
Fitting-Räder (Retül Müve, Shimano): Sattel und Lenker frei im Raum, ein 2D-Körpermodell rechnet die
Gelenkwinkel über den Kurbelumlauf und prüft sie gegen das Protokoll. Ergebnis sind Koordinaten
(Sattelhöhe, Setback, Lenker HX/HY, Kurbel), aus denen der Rahmen gesucht wird.

## Status

Kernlogik als TypeScript-Bibliothek plus Web-Oberfläche ohne Backend. Keine Rahmendatenbank: Die
enthaltenen Rahmendaten sind erfundene, aber plausible Beispielwerte, keine Herstellerdaten.

## Schnellstart

```sh
npm install
npm test          # Unit-Tests
npm run demo      # Rangliste für eine Beispielperson (1,78 m, 84 cm Schrittlänge, Rennrad)
npm run build:web # Web-Oberfläche nach web/dist (statisch, im Browser öffnen oder als Artifact veröffentlichen)
```

Die Oberfläche hat drei Ansichten: **Rahmen** (Matching mit maßstäblicher Zeichnung von Rahmen und
Fahrer), **Fitting** (das Protokoll, mit Modus „eigenes Rad“ oder „kein Rad“) und **Fit-Bike** (das
virtuelle Fitting-Rad). Fitting-Eingaben werden im Browser gespeichert und, wenn die
Seite als Artifact mit Datenbank läuft, zusätzlich dort.

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

## Fitting-Protokoll

Methodik: dynamisches Bikefitting nach BikeDynamics (Michael Veal, „DIY Dynamic Bike Fitting“). Der
Guide ist urheberrechtlich geschützt; hier stehen keine Textpassagen daraus, sondern die Methodik in
eigener Formulierung, die Schwellwerte, Formeln und Tabellen als Fakten. Module unter `src/fitting/`:

| Modul | Inhalt |
|---|---|
| `calculators.ts` | Sattelhöhen-Vorhersage aus Schrittlänge + Trochanterhöhe (4,4808·x − 43,3, R² 0,95) mit Rückfall auf Einzelmaße, Vergleich Ist/Soll (20-mm-Alarm), Körperproportionen (Schrittlänge/Größe, Spannweite), Cleat- und Vor/zurück-Äquivalenz, Belastungsziele, Torsowinkel-Ziel |
| `sizing.ts` | Rahmengrößentabelle 48 … 62, Kurbellängentabelle 162,5 … 177,5, Lenkerbreite aus Schulterbreite |
| `indicators.ts` | 10 beobachtbare Sattelhöhen-Indikatoren (Kniewinkel max/min, Sprunggelenk oben/unten, Kniemarke, Symmetrie, Leistung Hoods/Unterlenker, Hüftstabilität, Oberkörper, Becken), 4 Vor/zurück-Indikatoren (KOPS, Hüftmarke, Balance, Handgewicht), 7 Lenker-Indikatoren (4 für Höhe und Reach, 3 nur Höhe), Handgelenk-Checks, Bilanzen |
| `iteration.ts` | Erster Grobschritt, Grobabstimmung (besser/schlechter/unklar), Feinabstimmung mit 2-mm-Pad, Sweet-Spot-Kriterium, Klebeband-Markierung |
| `errorStates.ts` | Fehlerbilder: Streben am Anschlag, kein Sweet Spot, Beinlängendifferenz, Kurbel zu lang, Hoods nicht erreichbar (Rad zu groß oder Proportionen) |
| `record.ts` | Aufzeichnung A … H mit Übertragbarkeit; Umrechnung in Zielpositionen fürs Rahmen-Matching |
| `protocol.ts` | Werkzeugliste, Marker, Cleat-Regeln, Ablaufschritte, Straßen-Checkliste, Kernaussagen |

## Virtuelles Fit-Bike

`src/fitbike.ts`. Aufbau: Kurbellänge, Sattelhöhe (A), Setback (G), Lenkerklemmung HX/HY, Lenkertyp,
Lenkerbreite. Körpermodell aus Körpergröße, Schrittlänge, Trochanterhöhe, Rumpf, Arm (fehlende Segmente
werden geschätzt und gekennzeichnet). Berechnet werden Knie max/min, Hüfte min, Torsowinkel, Oberarm–Rumpf,
Ellbogen, KOPS und die Sprunggelenkwinkel; alle außer Sprunggelenk werden als Protokoll-Indikatoren
übernommen. Funktionen: Startaufbau (Vorhersage + Faustregel), Sattel auf Kniewinkel 141°, Lenker mit
minimaler Bewegung in den Winkelbereich, Übergabe in Aufzeichnung und Rahmen-Matching.

Kalibrierung: Hüftgelenk 30 mm vor und 40 mm über der Sitzposition; Fußhebel 0,085 × Körpergröße,
Fußneigung 30° oben bis 46° unten; Rumpf 0,26 × Körpergröße bis zur Schultermarke; Ellbogen 160°. Diese
Werte sind so gewählt, dass die Vorhersage-Sattelhöhe und die Faustregel-Lenkerposition, die zu realen
Rädern passt, in der Mitte der Protokollbereiche landen. Sie sind eine Kalibrierung an einer Person, keine
Messung.

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
- **Ein Protokoll ersetzt keinen Beobachter.** Die App bewertet, was jemand beobachtet und eingibt.
  Kniewinkel, Fußhaltung, Hüftkippen und Kniemarken-Verhalten muss eine zweite Person sehen oder ein
  Video liefern; die App misst nichts. Die Schwellwerte gelten für Rennräder; die Methodik ist auf andere
  Räder übertragbar, die Zahlen nicht eins zu eins.
- **Die Bilanzen sind grobe Mehrheitsentscheide.** Zwei Stimmen Vorsprung entscheiden. Die Methodik
  selbst sagt, dass die Indikatoren mehrdeutig und teils widersprüchlich sind; die App macht daraus keine
  Präzision, die nicht da ist.
- **Das Fit-Bike-Modell ist ein Modell.** 2D, starre Segmente, angenommene Fußhaltung, angenommene
  Ellbogenbeugung, keine Beckenkippung, keine Weichteilverformung. Ein echtes Fit-Bike mit Bewegungserfassung
  misst die Person; das Modell rechnet eine Durchschnittsperson mit den eingegebenen Längen. Die Winkel
  reagieren empfindlich auf die Annahmen: 5° Fußneigung verschieben den Kniewinkel um etwa 3°, 5° Torsowinkel
  die Lenkerhöhe um rund 70 mm. Das Ergebnis ist eine belastbare Startposition für die Rahmenwahl, kein
  fertiges Fitting; Pad-Test und Leistungsvergleich passieren auf dem echten Rad.
- **Web-Oberfläche ohne Backend.** Speicherung im Browser des Geräts, optional in der Artifact-Datenbank.
  Kein Export außer Kopieren des JSON.

## Nächste sinnvolle Schritte

1. Rahmendaten: Format ist definiert (`FrameGeometry` in `src/types.ts`); Quelle klären.
2. Kalibrierung: mindestens 20 bis 30 reale Person-plus-passendes-Rad-Datensätze sammeln und die
   Koeffizienten in `src/constants.ts` daran prüfen.
3. Videoanalyse: Gelenkwinkel aus Video statt Handeingabe, dann wären die Indikatoren messbar statt geschätzt.

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
  fitting/         Bikefitting-Protokoll (Rechner, Indikatoren, Iteration, Fehlerbilder, Aufzeichnung)
  fitbike.ts       Virtuelles Fit-Bike: Körpermodell, Gelenkwinkel, Optimierer, Übergabe
  data/            Beispielrahmen (erfundene Werte)
  demo.ts          Konsolen-Demo
web/
  index.html       Oberfläche: Rahmen-Matching mit Zeichnung, Ansichtswechsel
  fitting.js       Oberfläche: Fitting-Protokoll
  fitbike.js       Oberfläche: virtuelles Fit-Bike
scripts/build-web.mjs  Bündelt die Bibliothek und baut web/dist
test/              Vitest-Tests
```
