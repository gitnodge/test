import { bodyProportions } from './calculators.js';
import type { LegMeasurements } from './types.js';

export interface ErrorState {
  id: string;
  title: string;
  /** Warum das auftritt. */
  cause: string;
  /** Was zu tun ist, in Reihenfolge. */
  actions: string[];
}

export interface Symptoms {
  /** Hüftmarke lässt sich mit den Sattelstreben nicht auf die Sitzrohrachse bringen. */
  railsAtEnd?: 'front' | 'back' | 'none';
  /** Nach langer Suche kein Sweet Spot der Sattelhöhe. */
  noSweetSpot?: boolean;
  /** Vermutete Beinlängendifferenz (Rückenlage-Test: Knöchel angleichen, Knie beugen, Kniehöhe vergleichen). */
  legLengthSuspected?: boolean;
  /** Kurbel länger als Empfehlung. */
  crankTooLong?: boolean;
  /** Hoods trotz Kompaktlenker, hochgerolltem Lenker und kurzem Vorbau nicht bequem erreichbar. */
  cannotReachHoods?: boolean;
  /** Rahmengröße passt laut Größentabelle. */
  frameSizeOk?: boolean;
  measurements?: LegMeasurements;
}

/** Fehlerbilder aus Symptomen ableiten. */
export function diagnose(s: Symptoms): ErrorState[] {
  const out: ErrorState[] = [];
  if (s.railsAtEnd && s.railsAtEnd !== 'none') {
    const front = s.railsAtEnd === 'front';
    out.push({
      id: 'fore-aft-range',
      title: 'Sattel lässt sich nicht weit genug ' + (front ? 'nach vorn' : 'nach hinten') + ' stellen',
      cause: 'Sattelbreite passt nicht (auf schmalen Sätteln sitzt man weit hinten, breite schieben nach vorn) oder das Setback der Stütze ist falsch. Typisch sind 15 … 20 mm, erhältlich 0 … 35 mm.',
      actions: front
        ? ['Stütze ohne Versatz („inline“, 0 mm) verwenden.', 'Sattelbreite gegen Sitzknochenabstand prüfen.', 'Klemme sollte mittig auf den Streben sitzen – das federt besser.']
        : ['Stütze mit mehr Setback (25 … 35 mm) verwenden.', 'Sattelbreite gegen Sitzknochenabstand prüfen.', 'Klemme sollte mittig auf den Streben sitzen.'],
    });
  }
  if (s.noSweetSpot) {
    out.push({
      id: 'no-sweet-spot',
      title: 'Kein Sattelhöhen-Sweet-Spot zu finden',
      cause: 'Sattel wirkt gleichzeitig zu hoch und zu tief. Übliche Verdächtige: Beinlängendifferenz, zu lange Kurbeln, geringe Beweglichkeit. Das Fenster ist bei den meisten nur 2 … 3 mm breit, bei großen, symmetrischen, beweglichen Personen mit kurzen Kurbeln 10 … 15 mm; bei manchen existiert es nicht.',
      actions: [
        'Cleats ganz nach hinten: hebt effektiv die Sattelhöhe, oben stärker als unten.',
        'Kurbellänge gegen die Empfehlung prüfen; zu lang ist der häufigste Fall.',
        'Beinlängendifferenz prüfen lassen (Physiotherapie, Osteopathie); funktionelle Differenzen durch verdrehtes Becken nicht mit Cleat-Shims „korrigieren“.',
        'Beweglichkeit: verkürzte Hüft- oder Kniebeuger verlangen nach hoch, verkürzte Hamstrings nach tief.',
      ],
    });
  }
  if (s.legLengthSuspected) {
    out.push({
      id: 'leg-length',
      title: 'Verdacht auf Beinlängendifferenz',
      cause: 'Kürzeres Bein überstreckt, längeres wird gestaucht. Das kürzere Bein zieht die Hüfte auf dieser Seite nach vorn, verdreht das Becken und schiebt das Knie zum Rahmen.',
      actions: ['Von Fachpersonal bestätigen lassen; funktionelle und echte Differenz unterscheiden.', 'Korrektur (Shims, Cleatversatz) nur mit erfahrenem Fitter.', 'Bis dahin: Sattelhöhe am kürzeren Bein orientieren, eher tief.'],
    });
  }
  if (s.crankTooLong) {
    out.push({
      id: 'crank-long',
      title: 'Kurbel zu lang',
      cause: 'Zweitwichtigste Größe nach der Sattelhöhe. Zu lange Kurbeln vergrößern die Bewegungsumfänge an Hüfte, Knie und Sprunggelenk, erschweren dem Quadrizeps das Strecken aus starker Beugung und geben einen „stampfenden“ Tritt. Auf 54/M und kleiner ist 172,5 mm meist zu lang, auf 50/52 oft auch 170 mm.',
      actions: ['Kürzere Kurbel nach Empfehlung montieren, idealerweise vor dem Fitting.', 'Bis dahin Cleats ganz nach hinten.', 'Kürzere Kurbel erlaubt oft einen höheren Sattel: doppelter Raumgewinn oben.'],
    });
  }
  if (s.cannotReachHoods) {
    if (s.frameSizeOk === false) {
      out.push({ id: 'bike-too-big', title: 'Rad zu groß', cause: 'Sattelposition stimmt, Kompaktlenker, hochgerollt, kurzer Vorbau – und die Hoods sind trotzdem nicht erreichbar: Oberrohr zu lang.', actions: ['Größentabelle prüfen.', 'Kleinerer Rahmen oder Rahmen mit kürzerem Reach.'] });
    } else {
      const p = s.measurements ? bodyProportions(s.measurements) : undefined;
      const prop = p ? ` Verhältnis Schrittlänge/Größe ${p.inseamToHeight} (${p.legs === 'long' ? 'lange Beine' : p.legs === 'short' ? 'kurze Beine' : 'durchschnittlich'})${p.arms ? `, Spannweite ${p.spanMinusHeightCm} cm zur Größe (${p.arms === 'short' ? 'kurze Arme' : p.arms === 'long' ? 'lange Arme' : 'durchschnittlich'})` : ''}.` : '';
      out.push({
        id: 'proportions',
        title: 'Körperproportionen: lange Beine / kurzer Rumpf',
        cause: 'Lange Beine verlangen einen hohen Sattel, der nach oben und weg vom Lenker hebt; ein kurzer Rumpf macht den Reach zu den Hoods dann zu lang.' + prop,
        actions: ['Kurzer Vorbau, ggf. positiv montiert.', 'Kleinerer Rahmen ist meist kontraproduktiv, weil auch tiefer.', 'Endurance-/Sportive-Geometrie: kürzeres Oberrohr, längeres Steuerrohr (hoher Stack, kurzer Reach).', 'Letzter Ausweg: Sattel nach vorn kompromittieren, danach Höhe erhöhen und auf Nacken, Schultern, Arme, Hände achten; nur auf der Straße über mehrere Fahrten beurteilbar.'],
      });
    }
  }
  return out;
}
