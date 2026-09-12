import type { BarHeightVerdict, BarReachVerdict, ForeAftVerdict, Indicator, ObservationVerdict, SaddleHeightVerdict, Tally } from './types.js';

const angle = (min: number, max: number): Indicator['input'] => ({ kind: 'angle', unit: '°', min, max });
const num = (v: number | string): number => (typeof v === 'number' ? v : Number(v));
const band = <V extends string>(v: number, lowBelow: number, highAbove: number, low: V, high: V, mid: V): V =>
  v < lowBelow ? low : v > highAbove ? high : mid;

/** Zwölf Indikatoren für die Sattelhöhe; die letzten beiden sind die Beinmaße (siehe Rechner). */
export const SADDLE_HEIGHT_INDICATORS: Array<Indicator<SaddleHeightVerdict>> = [
  {
    id: 'knee-max', group: 'saddle-height', title: 'Maximaler Kniewinkel',
    how: 'Kurbel in Verlängerung des Sitzrohrs, kurz vor dem unteren Totpunkt. Statisch mit Goniometer nur mit der gleichen Fußhaltung wie beim Treten.',
    input: angle(100, 180),
    evaluate: (v) => band(num(v), 135, 146, 'low', 'high', 'inconclusive'),
    caveat: 'Gefühl der Überstreckung mit Ziehen in der Kniekehle spricht für hoch; ständiges Zurückrutschen für mehr Druck spricht für tief.',
  },
  {
    id: 'knee-min', group: 'saddle-height', title: 'Minimaler Kniewinkel',
    how: 'Kurbel in Verlängerung des Sitzrohrs, kurz vor dem oberen Totpunkt.',
    input: angle(40, 110),
    evaluate: (v) => band(num(v), 68, 74, 'low', 'high', 'inconclusive'),
    caveat: 'Cleats zu weit vorn oder zu lange Kurbeln geben ebenfalls enge Kniewinkel.',
  },
  {
    id: 'ankle-top', group: 'saddle-height', title: 'Sprunggelenkwinkel oben',
    how: 'Fußhaltung, wenn der Fuß vorn über den oberen Totpunkt läuft. Unter 100° stark angezogen, über 120° Zehen deutlich nach unten.',
    input: angle(70, 150),
    evaluate: (v) => band(num(v), 100, 120, 'low', 'high', 'inconclusive'),
    caveat: 'Vordere Cleatposition, wenig Kniebeweglichkeit oder sehr verkürzte Oberschenkelvorderseite geben ebenfalls Zehen nach unten.',
  },
  {
    id: 'ankle-bottom', group: 'saddle-height', title: 'Sprunggelenkwinkel unten',
    how: 'Fußhaltung am Punkt der maximalen Kniestreckung. Ferse unter dem Vorfuß oder unter 110°: tief. Über 137°: hoch.',
    input: angle(80, 170),
    evaluate: (v) => band(num(v), 110, 137, 'low', 'high', 'inconclusive'),
    caveat: 'Cleats zu weit vorn geben ebenfalls Zehen nach unten.',
  },
  {
    id: 'knee-decel', group: 'saddle-height', title: 'Abbremsen der Kniemarke unten',
    how: 'Von der Seite: Läuft die Kniemarke weich wie ein Pendel durch, oder stoppt sie abrupt beim Strecken, oft mit Schulterzucken und „wau-wau“-Geräusch der Rolle?',
    input: { kind: 'choice', options: [{ value: 'smooth', label: 'Weich, pendelnd' }, { value: 'unsure', label: 'Unklar' }, { value: 'abrupt', label: 'Abrupt' }] },
    evaluate: (v) => (v === 'abrupt' ? 'high' : 'inconclusive'),
  },
  {
    id: 'knee-symmetry', group: 'saddle-height', title: 'Symmetrie der Knie',
    how: 'Von vorn: Haben beide Knie den gleichen Abstand zum Rahmen? Streift ein Knie gelegentlich das Oberrohr?',
    input: { kind: 'choice', options: [{ value: 'symmetric', label: 'Symmetrisch' }, { value: 'slight', label: 'Leicht asymmetrisch' }, { value: 'strong', label: 'Deutlich asymmetrisch' }] },
    evaluate: (v) => (v === 'strong' ? 'high' : 'inconclusive'),
    caveat: 'Deutliche Asymmetrie kann auch Beinlängendifferenz, ungleiche Hüft- oder Hamstring-Beweglichkeit oder einen tiefen Sattel bedeuten.',
  },
  {
    id: 'power-hoods-drops', group: 'saddle-height', title: 'Leistung Hoods vs. Unterlenker',
    how: 'Bei Bewertungstempo von den Hoods in den Unterlenker wechseln. Wird es dauerhaft leichter oder schwerer, das Tempo zu halten? Kurzen Anfangsschub ignorieren.',
    input: { kind: 'choice', options: [{ value: 'more', label: 'Unten mehr Leistung' }, { value: 'same', label: 'Gleich' }, { value: 'less', label: 'Unten weniger' }] },
    evaluate: (v) => (v === 'less' ? 'inconclusive' : 'inconclusive'),
    caveat: 'Kein Leistungsgewinn unten kann für hoch (Hamstrings überdehnt) oder tief (Knie zu hoch, Becken kann nicht kippen) sprechen. Nur als Baseline verwenden.',
  },
  {
    id: 'hip-stability', group: 'saddle-height', title: 'Stabilität der Hüfte',
    how: 'Von hinten. 1 = stabil, 2 = leichtes Kippen, 3 = Kippen, 4 = starkes Kippen, 5 = übermäßiges Kippen. Hebt die Hüfte oben (tief oder Kurbel zu lang) oder sackt sie beim Strecken (hoch)?',
    input: { kind: 'scale5' },
    evaluate: (v) => (num(v) >= 4 ? 'high' : 'inconclusive'),
    caveat: 'Kippende Hüften auch bei tiefem Sattel, langen Kurbeln oder schwacher Rumpfmuskulatur.',
  },
  {
    id: 'upper-body', group: 'saddle-height', title: 'Oberkörperbewegung',
    how: 'Von der Seite auf die Schultermarke. 1 = ruhig, 5 = hochgradig unruhig (vor/zurück oder Wippen).',
    input: { kind: 'scale5' },
    evaluate: (v) => (num(v) >= 4 ? 'high' : 'inconclusive'),
  },
  {
    id: 'pelvis', group: 'saddle-height', title: 'Beckenstellung',
    how: 'Von der Seite: Kippt das Becken willig nach vorn mit weichem Übergang in die Lendenwirbelsäule, oder gibt es einen sichtbaren Knick im unteren Rücken?',
    input: { kind: 'choice', options: [{ value: 'smooth', label: 'Weicher Übergang' }, { value: 'unsure', label: 'Unklar' }, { value: 'hinge', label: 'Knick im unteren Rücken' }] },
    evaluate: () => 'inconclusive',
    caveat: 'Ein Knick entsteht bei zu hohem oder zu tiefem Sattel und bei schwacher Rumpfmuskulatur. Nur Beobachtung.',
  },
];

/** Vier Indikatoren für die Sattelposition vor/zurück. */
export const FORE_AFT_INDICATORS: Array<Indicator<ForeAftVerdict>> = [
  {
    id: 'kops', group: 'saddle-fore-aft', title: 'Knie über Pedalachse (KOPS)',
    how: 'Kurbeln waagerecht, Lot vom Schienbeinhöcker unter der Kniescheibe. Fällt das Lot vor, durch oder hinter die Pedalachse?',
    input: { kind: 'choice', options: [{ value: 'front', label: 'Vor der Achse' }, { value: 'through', label: 'Durch die Achse' }, { value: 'behind', label: 'Hinter der Achse' }] },
    evaluate: (v) => (v === 'front' ? 'forward' : v === 'behind' ? 'back' : 'inconclusive'),
    caveat: 'Nur aussagekräftig, wenn die Sattelhöhe schon ungefähr stimmt: ein hoher Sattel streckt das Bein und zieht das Knie zurück.',
  },
  {
    id: 'hip-seat-tube', group: 'saddle-fore-aft', title: 'Hüftmarke zur Sitzrohrachse',
    how: 'Von der Seite die Sitzrohrachse gedanklich durch den Körper verlängern, Kurbeln waagerecht, beobachterseitiger Fuß vorn. Liegt die Hüftmarke vor, auf oder hinter der Linie?',
    input: { kind: 'choice', options: [{ value: 'front', label: 'Vor der Linie' }, { value: 'on', label: 'Auf der Linie' }, { value: 'behind', label: 'Hinter der Linie' }] },
    evaluate: (v) => (v === 'front' ? 'forward' : v === 'behind' ? 'back' : 'inconclusive'),
    caveat: 'Weitgehend unabhängig von der Sattelhöhe und daher der verlässlichste der vier. Ein sehr hoher Sattel schiebt aber nach vorn.',
  },
  {
    id: 'balance', group: 'saddle-fore-aft', title: 'Balance (Hände schweben lassen)',
    how: 'Kurbeln waagerecht stehend: Hände knapp über dem Lenker schweben lassen. Geht das schwer oder fällt man nach vorn: Sattel zu weit vorn oder Nase nach unten. Geht es leicht: zu weit hinten oder Nase nach oben.',
    input: { kind: 'choice', options: [{ value: 'hard', label: 'Schwer / kippt vor' }, { value: 'ok', label: 'Machbar' }, { value: 'easy', label: 'Leicht' }] },
    evaluate: (v) => (v === 'hard' ? 'forward' : v === 'easy' ? 'back' : 'inconclusive'),
    caveat: 'Wird durch falsche Sattelhöhe verfälscht und ist häufig mehrdeutig.',
  },
  {
    id: 'hand-weight', group: 'saddle-fore-aft', title: 'Gewicht auf den Händen',
    how: 'Beim Treten: Druck auf den Händen gleichmäßig über die Handflächen oder punktuell? Viel Gewicht, gestreckte Ellbogen und verspannter Oberkörper sprechen für zu weit vorn oder Nase nach unten.',
    input: { kind: 'choice', options: [{ value: 'much', label: 'Viel Gewicht' }, { value: 'moderate', label: 'Mäßig' }, { value: 'little', label: 'Wenig' }] },
    evaluate: (v) => (v === 'much' ? 'forward' : 'inconclusive'),
    caveat: 'Zu hohe Lenker verleiten zum Aufstützen; tiefer stellen kann die Hände entlasten. Auf der Rolle fehlt der Fahrtwind, der auf der Straße die Hände entlastet.',
  },
];

/** Sieben Indikatoren für die Lenkerposition. Die ersten vier betreffen Höhe und Reach, die letzten drei nur die Höhe. */
export const HANDLEBAR_INDICATORS: Array<Indicator<BarReachVerdict | BarHeightVerdict>> = [
  {
    id: 'hand-position', group: 'handlebar', title: 'Natürliche Handposition',
    how: 'Wo landen die Hände von allein? Muss man sich zu den Hoods strecken (Vorbau zu lang oder Lenker zu tief), oder liegen sie eher hinter den Hoods auf dem Oberlenker?',
    input: { kind: 'choice', options: [{ value: 'stretch', label: 'Muss strecken' }, { value: 'hoods', label: 'Fallen auf die Hoods' }, { value: 'tops', label: 'Bleiben hinten / Oberlenker' }] },
    evaluate: (v) => (v === 'stretch' ? 'far-or-low' : v === 'tops' ? 'close-or-high' : 'inconclusive'),
  },
  {
    id: 'elbows', group: 'handlebar', title: 'Ellbogen gestreckt oder weich',
    how: 'Auf den Hoods: Sind die Ellbogen durchgedrückt oder leicht gebeugt?',
    input: { kind: 'choice', options: [{ value: 'locked', label: 'Durchgedrückt' }, { value: 'soft', label: 'Weich gebeugt' }] },
    evaluate: (v) => (v === 'locked' ? 'far-or-low' : 'inconclusive'),
    caveat: 'Gestreckte Ellbogen auch bei zu viel Gewicht auf den Händen oder schwachem Rumpf.',
  },
  {
    id: 'torso-angle', group: 'handlebar', title: 'Torsowinkel zur Horizontalen',
    how: 'Linie Hüftmarke–Schultermarke gegen die Horizontale, Hände in Standardposition, Kurbeln waagerecht. 40° sportlich, 50° entspannt, 45° guter Start.',
    input: angle(20, 80),
    evaluate: (v) => band(num(v), 40, 50, 'far-or-low', 'close-or-high', 'inconclusive'),
  },
  {
    id: 'torso-arm', group: 'handlebar', title: 'Winkel Oberkörper zu Oberarm',
    how: 'Zwischen Oberarm und oberer Brustwirbelsäule messen, nicht zur Hüft-Schulter-Linie. Über 90° zu gestreckt, unter 80° zu sehr „über“ dem Rad, ideal um 85°.',
    input: angle(50, 120),
    evaluate: (v) => band(num(v), 80, 90, 'close-or-high', 'far-or-low', 'inconclusive'),
  },
  {
    id: 'power-drops', group: 'handlebar', title: 'Leistung Hoods vs. Unterlenker', heightOnly: true,
    how: 'Unten sollte es mindestens gleich, besser leicht kraftvoller sein. Weniger Leistung unten: Lenker zu tief.',
    input: { kind: 'choice', options: [{ value: 'more', label: 'Unten mehr' }, { value: 'same', label: 'Gleich' }, { value: 'less', label: 'Unten weniger' }] },
    evaluate: (v) => (v === 'less' ? 'low' : 'inconclusive'),
    caveat: 'Vor dem Absenken der Lenker die Sattelhöhe prüfen: 1 … 2 mm tiefer holt unten oft Leistung zurück.',
  },
  {
    id: 'drops-time', group: 'handlebar', title: 'Zeit im Unterlenker auf der Straße', heightOnly: true,
    how: 'Anteil der Fahrzeit im Unterlenker. Unter 5 %: Unterlenker zu tief. Über 50 %: Lenker insgesamt zu hoch.',
    input: { kind: 'choice', options: [{ value: '<5', label: 'Unter 5 %' }, { value: '5-30', label: '5 – 30 %' }, { value: '30-50', label: '30 – 50 %' }, { value: '50-75', label: '50 – 75 %' }, { value: '>75', label: 'Fast immer' }] },
    evaluate: (v) => (v === '<5' ? 'low' : v === '50-75' || v === '>75' ? 'high' : 'inconclusive'),
  },
  {
    id: 'hip-min', group: 'handlebar', title: 'Minimaler Hüftwinkel', heightOnly: true,
    how: 'Kurz nach dem minimalen Kniewinkel, Knie am höchsten Punkt. Die meisten kommen mit etwa 50° zurecht, sehr bewegliche Männer 40 … 45°, sehr bewegliche Frauen unter 40°.',
    input: angle(20, 90),
    evaluate: (v) => (num(v) < 45 ? 'low' : 'inconclusive'),
    caveat: 'Relevant vor allem für Zeitfahren und Triathlon. Unter dem individuellen Limit: Lenker zu tief.',
  },
];

/** Handgelenk: neutral wie beim Händeschütteln; Bremshebel aus dem Unterlenker erreichbar. Kein Urteil, nur Prüfung. */
export const WRIST_CHECKS = [
  { id: 'wrist-hoods', title: 'Handgelenk auf den Hoods neutral (weder nach oben noch unten geknickt, nicht seitlich abgewinkelt)?' },
  { id: 'wrist-drops', title: 'Handgelenk im Unterlenker neutral?' },
  { id: 'lever-reach', title: 'Bremshebel aus dem Unterlenker bequem erreichbar?' },
  { id: 'platform', title: 'Oberlenker und Hoods bilden eine flache, waagerechte Auflage ohne tiefes „V“ unter der Handfläche?' },
];

export function tally<V extends string>(indicators: Array<Indicator<V>>, values: Record<string, number | string | undefined>, verdicts: V[]): Tally<V> {
  const counts = Object.fromEntries(verdicts.map((v) => [v, 0])) as Record<V, number>;
  let answered = 0;
  for (const ind of indicators) {
    const v = values[ind.id];
    if (v === undefined || v === '') continue;
    answered++;
    counts[ind.evaluate(v)]++;
  }
  const [a, , b] = verdicts as [V, V, V];
  let verdict: V | 'inconclusive' = 'inconclusive';
  if (counts[a] > counts[b] && counts[a] >= 2) verdict = a;
  else if (counts[b] > counts[a] && counts[b] >= 2) verdict = b;
  return { counts, answered, total: indicators.length, verdict };
}

export const tallySaddleHeight = (values: Record<string, number | string | undefined>): Tally<SaddleHeightVerdict> =>
  tally(SADDLE_HEIGHT_INDICATORS, values, ['high', 'inconclusive', 'low']);
export const tallyForeAft = (values: Record<string, number | string | undefined>): Tally<ForeAftVerdict> =>
  tally(FORE_AFT_INDICATORS, values, ['forward', 'inconclusive', 'back']);
export const tallyBarReach = (values: Record<string, number | string | undefined>): Tally<BarReachVerdict> =>
  tally(HANDLEBAR_INDICATORS.filter((i) => !i.heightOnly) as Array<Indicator<BarReachVerdict>>, values, ['far-or-low', 'inconclusive', 'close-or-high']);
export const tallyBarHeight = (values: Record<string, number | string | undefined>): Tally<BarHeightVerdict> =>
  tally(HANDLEBAR_INDICATORS.filter((i) => i.heightOnly) as Array<Indicator<BarHeightVerdict>>, values, ['low', 'inconclusive', 'high']);

export type { ObservationVerdict };
