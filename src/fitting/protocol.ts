/** Ablauf, Werkzeuge, Marker, Checklisten – Datengrundlage für die Oberfläche. */

export interface Tool { name: string; essential: boolean; note?: string }
export const TOOLS: Tool[] = [
  { name: 'Rollentrainer', essential: true, note: 'Einstellbarer Widerstand; Anzeige von Geschwindigkeit, Leistung oder Trittfrequenz mit Auflösung 1 W / 0,1 km/h / 1 U/min ist sehr hilfreich. Geschwindigkeitssensor ans Hinterrad.' },
  { name: 'Maßband', essential: true },
  { name: 'Wasserwaage', essential: true },
  { name: 'Lot (Schnur mit Gewicht)', essential: true },
  { name: 'Kleines Lineal (15 cm)', essential: true },
  { name: 'Inbusschlüssel / Schraubenschlüssel', essential: true },
  { name: 'Messschieber', essential: false, note: 'Leichter abzulesen als ein Lineal.' },
  { name: 'Goniometer (≥ 30 cm)', essential: false, note: 'Winkelmesser für Gelenkwinkel. Alternativ Foto ausdrucken und Winkelmesser anlegen.' },
  { name: 'Neigungsmesser- und Videoanalyse-App', essential: false, note: 'Kamera mindestens 2,5 m entfernt, etwa 0,7 m hoch, in Höhe der Kurbelachse; schnelle Beine verwischen.' },
  { name: 'Drehmomentschlüssel (bis 15 Nm)', essential: false },
  { name: 'Helfer / Beobachter', essential: true, note: 'Allein möglich, aber deutlich schwerer. Beobachter warm und versorgt halten; 2 … 3 Stunden einplanen.' },
  { name: '2-mm-Pad (Karton, Schaumstoff, gefaltetes Geschirrtuch)', essential: false, note: 'Für die Feinabstimmung der Sattelhöhe.' },
  { name: 'Kreppband', essential: true, note: 'Markierung an der Sattelstütze, um Höhenänderungen ablesen zu können.' },
];

export interface Marker { id: string; title: string; where: string }
export const MARKERS: Marker[] = [
  { id: 'hip', title: 'Hüfte', where: 'Oberkante des Trochanter major, sitzend auf dem Rad ertasten; gute Näherung für die Mitte des Hüftgelenks.' },
  { id: 'shoulder', title: 'Schulter', where: 'Senkrechte Fläche der Schulter, knapp unter dem Ende des Schulterblatts.' },
  { id: 'knee', title: 'Kniegelenk', where: 'Spalt zwischen Oberschenkelknochen und Schienbein; im Zweifel Gelenkmitte.' },
  { id: 'ankle', title: 'Sprunggelenk', where: 'Außenknöchel (Malleolus lateralis).' },
  { id: 'pedal', title: 'Pedalachse', where: 'Knapp über der Sohle, senkrecht über der Pedalachse, am Schuh.' },
];

export const CLEAT_RULES = [
  { axis: 'Längs', rule: 'Ende der Mittelfußköpfchen ertasten und deren Mittel mit der Cleat-Mittellinie ausrichten. Im Zweifel ganz nach hinten. Zu weit vorn: taube Zehen, Zehen-nach-unten-Haltung, instabile Füße, enge Knie- und Hüftwinkel. 10 mm zurück wirkt wie 5 … 6 mm Sattel höher.' },
  { axis: 'Seitlich', rule: 'Schmale Hüften: Cleats nach außen, Füße kommen nach innen unter Hüfte und Knie. Breite Hüften oder stark ausgestellte Füße: Cleats nach innen, Füße nach außen, damit Fersen nicht an Kurbel oder Kettenstrebe streifen.' },
  { axis: 'Rotation', rule: 'Natürliche Fußstellung zulassen (Beine von der Tischkante baumeln lassen oder beim Gehen beobachten; Asymmetrie ist normal). Test: beim Treten oder mit senkrechter Kurbel die Fersen nach innen und außen bewegen können, ohne auszuklicken. Am Anschlag: Cleat drehen, Ausklicken danach neu üben. Nach großer Höhenänderung erneut prüfen.' },
];

export interface Step { id: string; title: string; summary: string; items: string[] }
export const PROTOCOL: Step[] = [
  { id: 'baseline-road', title: 'Baseline auf der Straße', summary: 'Vor jeder Änderung den Ist-Zustand erfassen.', items: ['Übliche Geschwindigkeiten / Leistungsdaten notieren.', 'Beschwerden notieren: Hüfte, Knie, Nacken, Schultern, Arme, Hände, Füße, Rücken.', 'Auf mehreren Fahrten beobachten, wo die Hände von allein liegen (Hoods, Bögen, Oberlenker, Unterlenker).', 'Anteil der Zeit im Unterlenker schätzen und ob er anders sein soll.'] },
  { id: 'setup', title: 'Aufbau und Aufwärmen', summary: 'Rad auf die Rolle, Vorderrad auf Hinterradhöhe.', items: ['Beobachter braucht freie Sicht von beiden Seiten, vorn und hinten; eine gute Seitenansicht aus 2 … 3 m ist wichtiger als zwei enge.', '10 … 15 min leicht rollen (etwa 24 km/h), nicht pushen.', 'Neutrale Sitzposition finden: dort sitzen, wo der Sattel einen hinsetzt, nicht wo man meint sitzen zu sollen. Ständiges Rutschen ist selbst schon ein Befund.', 'Bewertungstempo: 30 … 34 km/h in üblicher Trittfrequenz, Widerstand auf Dauerfahrt-Belastung (RPE 4 … 5, 65 … 85 % HFmax, 60 … 75 % FTP).', 'Hände dort, wo sie auf der Straße liegen.', 'Marker erst nach dem Aufwärmen anbringen.'] },
  { id: 'cleats', title: 'Cleats', summary: 'Zuerst, weil Cleatposition und Sattelhöhe zusammenhängen.', items: ['Längs, seitlich, Rotation nach den drei Regeln einstellen.', 'Danach Cleats und Sattelneigung als fix betrachten; Sattel waagerecht.'] },
  { id: 'cranks', title: 'Kurbellänge', summary: 'Zweitwichtigste Größe nach der Sattelhöhe.', items: ['Empfehlung aus den Beinmaßen prüfen.', 'Zu lange Kurbeln idealerweise vor dem Fitting tauschen; sonst Cleats nach hinten und Fehlerbilder beachten.'] },
  { id: 'assess', title: 'Datenaufnahme', summary: 'Alle Indikatoren erfassen, bevor etwas geändert wird.', items: ['12 Indikatoren Sattelhöhe.', '4 Indikatoren Sattel vor/zurück.', '7 Indikatoren Lenker.', 'Beinmaße für Vorhersage und Kurbel.'] },
  { id: 'coarse', title: 'Sattelhöhe grob', summary: 'Auf Vorhersage setzen, Unterschied spüren.', items: ['Kreppband an der Sattelstütze als Referenz.', 'Änderung schnell durchführen: Person steht in die Pedale und lehnt sich vor, Beobachter stellt um.', 'Einzige Frage: leichter oder schwerer, das Tempo zu halten? Beobachter prüft Tempo, Geräusch der Rolle, Oberkörper.', 'Schlechter: Differenz halbieren. Besser: 5 mm weiter. Unklar: ±5 mm testen.'] },
  { id: 'fore-aft', title: 'Sattel vor/zurück', summary: 'Erst wenn die Höhe ungefähr stimmt.', items: ['KOPS, Hüftmarke, Balance und Handgewicht neu bewerten; im Zweifel der Hüftmarke folgen.', 'Auf den Streben verschieben; Klemme möglichst mittig.', '10 mm zurück wirkt wie 3 … 5 mm höher; Höhe danach nachziehen und prüfen.'] },
  { id: 'fine', title: 'Sattelhöhe fein', summary: '2-mm-Pad zwischen Sattel und Person.', items: ['Pad rein/raus im schnellen Wechsel; nur Hände in Standardposition.', 'Pad besser: 2 mm höher. Pad schlechter: 2 mm tiefer.', 'Sweet Spot: Pad und Absenken beide schlechter.', 'Unterlenker kann 1 … 2 mm tiefer verlangen; eher unten im Fenster bleiben.', 'Sanity-Check: Ist-Höhe über 20 mm von der Vorhersage entfernt → Maße prüfen.'] },
  { id: 'bars', title: 'Lenker', summary: 'Sattel bleibt unangetastet; die Lenker dürfen den Sattel nie beeinflussen.', items: ['Zuerst Schalthebel: flache, waagerechte Plattform vom Oberlenker auf die Hoods, kein tiefes „V“.', 'Hoods: Torsowinkel passend zum Fahrstil, Oberkörper locker, Ellbogen weich, Oberarm-Torso etwa 85°, Hände fallen auf die Hoods. Erst Vorbaulänge, dann Höhe.', 'Vorbau 100 … 110 mm ist die gute Mitte; unter 90 mm wird die Lenkung nervös.', 'Kompaktlenker (Reach ~80, Drop ~125) statt Standard (~100/~150) verkürzt wie eine kleinere Rahmengröße.', 'Unterlenker: Leistung mindestens gleich wie auf den Hoods. Leistungsorientiert: senken bis Leistung fällt, dann etwas hoch. Komfort: 45 … 50° Torsowinkel, aber nicht so hoch, dass man sich aufstützt.', 'Bremshebel aus dem Unterlenker erreichbar; kleine Hände: Hebelweite anpassen oder Lenker leicht nach unten rollen, ohne die Hoods-Handgelenke zu verbiegen.'] },
  { id: 'record', title: 'Aufzeichnung', summary: 'Position festhalten und auf andere Räder übertragen.', items: ['A, C, E, F, G, H sind übertragbar; B und D gelten nur für dieses Rad.', 'Maße beziehen sich auf diesen Sattel; anderer Sattel = Startpunkt mit Feinabstimmung.'] },
  { id: 'road', title: 'Straßentest und Anpassung', summary: 'Große Änderungen wirken sofort, Kurbeltausch braucht länger.', items: ['Alle Schrauben mit Drehmoment prüfen.', 'Von unten nach oben durchgehen: Fersen frei beweglich ohne Anschlag? Knie und Sprunggelenk weder gestaucht noch überstreckt? Sitzt man ruhig ohne Rutschen? Lässt sich das Becken leichter nach vorn kippen? Hände auf den Hoods, Ellbogen weich? Weniger Last auf den Armen durch Fahrtwind ab 25 km/h? Unterlenker bequem und kraftvoll?', 'Tempo, Trittfrequenz, Puls mit vorher vergleichen.', 'Neue kleine Beschwerden können sich nach einigen Fahrten legen; bleibt ein neuer Schmerz, zurück zur alten Einstellung und professionelles Fitting.'] },
];

export const ROAD_CHECKLIST = [
  'Fersen lassen sich nach innen und außen bewegen, ohne an Anschläge zu stoßen.',
  'Knie und Sprunggelenke arbeiten im mittleren Bereich, nicht gestaucht, nicht überstreckt.',
  'Kein Drang, auf dem Sattel nach vorn oder hinten zu rutschen.',
  'Becken kippt leichter nach vorn, unterer Rücken gerader.',
  'Hände fallen von allein auf die Hoods, Ellbogen weich.',
  'Weniger Last auf den Armen als auf der Rolle.',
  'Unterlenker bequem, dort gleich viel oder mehr Leistung.',
  'Tempo, Trittfrequenz, Puls gleich oder besser als vorher.',
];

export const KEY_CONCLUSIONS = [
  'Sattelhöhe ist der Schlüssel: Leistung, Sitzweise, Reach und Nutzung des Unterlenkers hängen daran.',
  'Kurbellänge ist wichtig.',
  'Vor/zurück ist eine Frage der Balance mit lockerem Oberkörper.',
  'Die richtige Rahmengröße ist die Voraussetzung.',
];
