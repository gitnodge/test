// Bike Geo – Fitting-Ansicht. Reines DOM ohne Framework; Zustand wird lokal und, wenn verfügbar, in der Artifact-Datenbank gespeichert.
import * as BG from './bikegeo.js';

const KEY = 'bikegeo.fitting.v1';
const DEFAULT = () => ({ step: 'prep', updatedAt: 0, tools: {}, prep: {}, base: { pains: {} }, setup: { checks: {} }, cleats: { checks: {} }, body: {}, ind: {}, wrist: {}, iter: { log: [] }, bars: { style: 'balanced', checks: {} }, err: {}, rec: {}, road: { checks: {} } });
let S = DEFAULT();
let root, db = null, saveTimer;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), S);
function set(path, v) { const ks = path.split('.'); let o = S; for (const k of ks.slice(0, -1)) { if (typeof o[k] !== 'object' || o[k] === null) o[k] = {}; o = o[k]; } if (v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v; }
const has = (v) => v !== undefined && v !== null && v !== '';
const n = (v) => (has(v) ? Math.round(v) : '–');

// ---------- Eingabe-Helfer ----------
function inp(path, o = {}) {
  const v = get(path);
  const id = 'f-' + path.replace(/\./g, '-');
  return `<div class="f"><label for="${id}">${esc(o.label ?? '')}</label><input class="mono" id="${id}" data-k="${path}" data-t="${o.type ?? 'number'}" type="${o.type ?? 'number'}" ${o.min !== undefined ? `min="${o.min}"` : ''} ${o.max !== undefined ? `max="${o.max}"` : ''} step="${o.step ?? 1}" value="${has(v) ? esc(v) : ''}" placeholder="${esc(o.placeholder ?? '')}"><small>${esc(o.unit ?? '')}</small></div>`;
}
function sel(path, options, o = {}) {
  const v = get(path);
  const id = 'f-' + path.replace(/\./g, '-');
  return `<div class="f"><label for="${id}">${esc(o.label ?? '')}</label><select id="${id}" data-k="${path}" data-t="string"><option value="">–</option>${options.map((x) => `<option value="${esc(x.value)}" ${v === x.value ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select>${o.unit ? `<small>${esc(o.unit)}</small>` : ''}</div>`;
}
function text(path, o = {}) {
  const id = 'f-' + path.replace(/\./g, '-');
  return `<div class="f"><label for="${id}">${esc(o.label ?? '')}</label><textarea id="${id}" data-k="${path}" data-t="string" placeholder="${esc(o.placeholder ?? '')}">${esc(get(path) ?? '')}</textarea></div>`;
}
function checks(prefix, items) {
  return `<ul class="chk">${items.map((it, i) => { const t = typeof it === 'string' ? it : it.title; const s = typeof it === 'string' ? '' : it.note; const id = `c-${prefix}-${i}`.replace(/\./g, '-'); return `<li><input type="checkbox" id="${id}" data-k="${prefix}.${i}" data-t="bool" ${get(`${prefix}.${i}`) ? 'checked' : ''}><label for="${id}">${esc(t)}${s ? `<small>${esc(s)}</small>` : ''}</label></li>`; }).join('')}</ul>`;
}
const callout = (kind, html) => `<div class="callout ${kind}">${html}</div>`;
const doneRatio = (prefix, total) => { let c = 0; for (let i = 0; i < total; i++) if (get(`${prefix}.${i}`)) c++; return c / total; };

function indicatorControl(ind) {
  const path = 'ind.' + ind.id;
  const v = get(path);
  const id = 'f-' + path.replace(/\./g, '-');
  let ctl;
  if (ind.input.kind === 'angle') ctl = `<input class="mono" id="${id}" data-k="${path}" data-t="number" type="number" min="${ind.input.min}" max="${ind.input.max}" step="1" value="${has(v) ? v : ''}" placeholder="°">`;
  else if (ind.input.kind === 'scale5') ctl = `<select id="${id}" data-k="${path}" data-t="number"><option value="">–</option>${[1, 2, 3, 4, 5].map((k) => `<option value="${k}" ${v === k ? 'selected' : ''}>${k}</option>`).join('')}</select>`;
  else ctl = `<select id="${id}" data-k="${path}" data-t="string"><option value="">–</option>${ind.input.options.map((x) => `<option value="${esc(x.value)}" ${v === x.value ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select>`;
  return `<div class="ind"><div><h4><label for="${id}">${esc(ind.title)}</label>${ind.heightOnly ? ' <span class="verdict">nur Höhe</span>' : ''}</h4><div class="how">${esc(ind.how)}</div>${ind.caveat ? `<div class="cav">${esc(ind.caveat)}</div>` : ''}</div><div class="ctl">${ctl}<span data-derived="v:${ind.id}">${verdictPill(ind)}</span></div></div>`;
}
const VLABEL = { high: 'Sattel zu hoch', low: 'Sattel zu tief', inconclusive: 'unentschieden', forward: 'zu weit vorn / Nase unten', back: 'zu weit hinten / Nase oben', 'far-or-low': 'zu weit weg / zu tief', 'close-or-high': 'zu nah / zu hoch' };
function verdictPill(ind) {
  const v = get('ind.' + ind.id);
  if (!has(v)) return '<span class="verdict">offen</span>';
  const r = ind.evaluate(v);
  return `<span class="verdict v-${r}">${esc(VLABEL[r] ?? r)}</span>`;
}
function tallyBox(t, labels) {
  const keys = Object.keys(t.counts);
  return `<div class="tally">${keys.map((k) => `<div><b class="${k === 'inconclusive' ? '' : 'mono'}">${t.counts[k]}</b><span>${esc(labels[k] ?? k)}</span></div>`).join('')}</div><p class="save">${t.answered} von ${t.total} beantwortet. Mehrheit ab zwei Stimmen Vorsprung: <b>${esc(labels[t.verdict] ?? VLABEL[t.verdict] ?? t.verdict)}</b>.</p>`;
}

// ---------- Rechner-Grundlage ----------
function legs() { const b = S.body; return { inseamCm: b.inseamCm, gtHeightCm: b.gtCm, heightCm: b.heightCm, spanCm: b.spanCm, shoulderWidthMm: b.shoulderMm, sex: b.sex }; }
function prediction() { return BG.predictSaddleHeight(legs()); }

// ---------- Schritte ----------
const STEPS = [
  { id: 'prep', title: 'Werkzeug & Marker', status: () => doneRatio('tools', BG.TOOLS.length), html: () => `
    <h2>Werkzeug, Marker, Belastung</h2>
    <p class="lead">Vorbereitung für ein Fitting auf der Rolle. Ohne Beobachter geht es, aber deutlich schwerer. Zwei bis drei Stunden einplanen.</p>
    <h3>Werkzeug</h3>
    ${checks('tools', BG.TOOLS.map((t) => ({ title: t.name + (t.essential ? '' : ' (optional)'), note: t.note })))}
    <h3>Anatomische Marker</h3>
    <p>Erst nach dem Aufwärmen anbringen, Punkte sitzend auf dem Rad ertasten.</p>
    <ul>${BG.MARKERS.map((m) => `<li><b>${esc(m.title)}:</b> ${esc(m.where)}</li>`).join('')}</ul>
    <h3>Belastung auf der Rolle</h3>
    <div class="grid3">${inp('prep.maxHr', { label: 'HF max', unit: 'bpm, optional', min: 120, max: 230 })}${inp('prep.ftp', { label: 'FTP', unit: 'Watt, optional', min: 50, max: 600 })}</div>
    <div data-derived="effort">${D.effort()}</div>` },

  { id: 'baseline', title: 'Baseline Straße', status: () => (has(S.base.hands) && has(S.base.dropsTime) ? 1 : has(S.base.hands) || has(S.base.dropsTime) ? 0.5 : 0), html: () => `
    <h2>Baseline auf der Straße</h2>
    <p class="lead">Vor jeder Änderung: Wie schnell, wie bequem, wo liegen die Hände. Nicht, wo sie liegen sollten, sondern wo sie von allein landen.</p>
    <div class="grid2">
      ${sel('base.hands', [{ value: 'hoods', label: 'Hoods' }, { value: 'bends', label: 'Bögen hinter den Hoods' }, { value: 'tops', label: 'Oberlenker' }, { value: 'drops', label: 'Unterlenker' }, { value: 'moving', label: 'Wechselt viel' }, { value: 'unsure', label: 'Weiß ich nicht' }], { label: 'Natürliche Handposition' })}
      ${sel('base.dropsTime', [{ value: '<5', label: 'Unter 5 %' }, { value: '5-30', label: '5 – 30 %' }, { value: '30-50', label: '30 – 50 %' }, { value: '50-75', label: '50 – 75 %' }, { value: '>75', label: 'Fast immer' }], { label: 'Zeit im Unterlenker' })}
      ${sel('base.dropsWish', [{ value: 'more', label: 'Mehr' }, { value: 'same', label: 'Gleich' }, { value: 'less', label: 'Weniger' }], { label: 'Soll das anders sein?' })}
    </div>
    <h3>Beschwerden</h3>
    ${checks('base.pains', ['Hüfte', 'Knie', 'Nacken', 'Schultern', 'Arme', 'Hände (Taubheit, Kribbeln, Druckstellen)', 'Füße (Hot Foot, taube Zehen)', 'Rücken'])}
    ${text('base.notes', { label: 'Leistung und Komfort in Stichworten', placeholder: 'Übliche Schnitte, Strava-Daten, Sportive-Erfahrung, wann treten Beschwerden auf …' })}
    <p class="save">Die Angabe zur Zeit im Unterlenker fließt als Lenker-Indikator ein. „Weiß ich nicht“ ist ein Befund: auf den nächsten Fahrten bewusst hinschauen, Abrieb am Lenkerband hilft.</p>` },

  { id: 'setup', title: 'Aufbau & Aufwärmen', status: () => doneRatio('setup.checks', 6), html: () => `
    <h2>Aufbau und Aufwärmen</h2>
    <p class="lead">${esc(BG.PROTOCOL.find((s) => s.id === 'setup').summary)}</p>
    ${checks('setup.checks', BG.PROTOCOL.find((s) => s.id === 'setup').items)}
    <div data-derived="effort">${D.effort()}</div>
    ${callout('', '<b>Neutrale Sitzposition.</b> Ein zu hoher Sattel kippt nach vorn aus der neutralen Position, ein zu langer Reach zieht nach vorn. Beim Bewerten dort sitzen, wo der Sattel einen hinsetzt.')}` },

  { id: 'cleats', title: 'Cleats', status: () => doneRatio('cleats.checks', 3), html: () => `
    <h2>Cleats</h2>
    <p class="lead">Zuerst, weil die Cleatposition direkt an der Sattelhöhe hängt. Fußanatomie, Einlagen, Keile und Shims sind ein eigenes Thema und hier nicht abgedeckt.</p>
    ${checks('cleats.checks', BG.CLEAT_RULES.map((r) => ({ title: r.axis, note: r.rule })))}
    <h3>Cleats nach hinten: Wirkung auf die Sattelhöhe</h3>
    <div class="grid3">${inp('cleats.shiftBack', { label: 'Cleats nach hinten', unit: 'mm', min: 0, max: 20 })}</div>
    <div data-derived="cleatShift">${D.cleatShift()}</div>
    ${callout('warn', '<b>Cleats danach als fix betrachten.</b> Vor der Grobabstimmung des Sattels stehen Cleats und Sattelneigung fest; der Sattel steht waagerecht. Nach großer Höhenänderung Rotation erneut prüfen.')}` },

  { id: 'body', title: 'Beinmaße & Rechner', status: () => (has(S.body.inseamCm) && has(S.body.gtCm) ? 1 : has(S.body.inseamCm) ? 0.5 : 0), html: () => `
    <h2>Beinmaße und Rechner</h2>
    <p class="lead">Schrittlänge barfuß mit Radhose, Buchrücken oder 25-mm-Rohr fest in den Schritt gedrückt. Trochanterhöhe stehend bis zur Oberkante des Trochanter major, neu ertasten (die Marke wurde sitzend gesetzt).</p>
    <div class="grid3">
      ${inp('body.inseamCm', { label: 'Schrittlänge', unit: 'cm', min: 60, max: 110, step: 0.5 })}
      ${inp('body.gtCm', { label: 'Trochanterhöhe', unit: 'cm', min: 65, max: 125, step: 0.5 })}
      ${inp('body.heightCm', { label: 'Körpergröße', unit: 'cm', min: 130, max: 220, step: 0.5 })}
      ${inp('body.spanCm', { label: 'Spannweite', unit: 'cm, Fingerspitze zu Fingerspitze', min: 130, max: 230, step: 0.5 })}
      ${inp('body.shoulderMm', { label: 'Schulterbreite', unit: 'mm, Gelenkmitte zu Gelenkmitte', min: 300, max: 550 })}
      ${sel('body.sex', [{ value: 'male', label: 'männlich' }, { value: 'female', label: 'weiblich' }], { label: 'Geschlecht (nur Kurbeltabelle)' })}
      ${inp('body.crankMm', { label: 'Aktuelle Kurbel', unit: 'mm', min: 150, max: 185, step: 2.5 })}
      ${inp('body.saddleActualMm', { label: 'Aktuelle Sattelhöhe (A)', unit: 'mm, Tretlager → Satteloberkante', min: 550, max: 900 })}
      ${inp('body.barWidthMm', { label: 'Aktuelle Lenkerbreite', unit: 'mm, Mitte–Mitte', min: 340, max: 480, step: 20 })}
    </div>
    <div data-derived="calc">${D.calc()}</div>` },

  { id: 'ind-h', title: 'Indikatoren Sattelhöhe', status: () => BG.tallySaddleHeight(S.ind).answered / 10, html: () => `
    <h2>Indikatoren Sattelhöhe</h2>
    <p class="lead">Zehn Beobachtungen plus die Vorhersage aus den Beinmaßen. Keine ist für sich entscheidend, manche widersprechen sich. Zusammen ergeben sie eine Richtung.</p>
    <div>${BG.SADDLE_HEIGHT_INDICATORS.map(indicatorControl).join('')}</div>
    <h3>Bilanz</h3>
    <div data-derived="tallyH">${D.tallyH()}</div>` },

  { id: 'ind-fa', title: 'Indikatoren vor/zurück', status: () => BG.tallyForeAft(S.ind).answered / 4, html: () => `
    <h2>Indikatoren Sattel vor/zurück</h2>
    <p class="lead">Erst bewerten, wenn die Höhe ungefähr stimmt. Im Zweifel zählt die Hüftmarke.</p>
    <div>${BG.FORE_AFT_INDICATORS.map(indicatorControl).join('')}</div>
    <h3>Bilanz</h3>
    <div data-derived="tallyFA">${D.tallyFA()}</div>` },

  { id: 'ind-bar', title: 'Indikatoren Lenker', status: () => (BG.tallyBarReach(S.ind).answered + BG.tallyBarHeight(S.ind).answered) / 7, html: () => {
    if (!has(S.ind['drops-time']) && has(S.base.dropsTime)) S.ind['drops-time'] = S.base.dropsTime;
    return `
    <h2>Indikatoren Lenker</h2>
    <p class="lead">Die ersten vier sagen etwas über Höhe und Reach (Nähe der Hände zu den Hoods), die letzten drei nur über die Höhe (Unterlenker). Die Hoods-Position ist ein kleines Ziel mit unter 10 mm Toleranz.</p>
    <div>${BG.HANDLEBAR_INDICATORS.map(indicatorControl).join('')}</div>
    <h3>Handgelenke und Hebel</h3>
    ${checks('wrist', BG.WRIST_CHECKS.map((w) => w.title))}
    <h3>Bilanz</h3>
    <div data-derived="tallyBar">${D.tallyBar()}</div>`; } },

  { id: 'iter', title: 'Sattel einstellen', status: () => (S.iter.log.length ? (S.iter.done ? 1 : 0.5) : 0), html: () => `
    <h2>Sattel einstellen: grob, vor/zurück, fein</h2>
    <p class="lead">Änderungen schnell durchführen, damit der Vergleich frisch ist. Einzige Frage nach jeder Änderung: leichter oder schwerer, das Bewertungstempo zu halten? Nicht „wollen“, dass es besser ist.</p>
    <div data-derived="iterStart">${D.iterStart()}</div>
    <h3>Grobabstimmung: Protokoll</h3>
    <div class="grid3">
      ${sel('iter.newPhase', [{ value: 'coarse', label: 'Grob (Höhe)' }, { value: 'fore-aft', label: 'Vor/zurück' }, { value: 'fine', label: 'Fein (Höhe)' }, { value: 'bars', label: 'Lenker' }], { label: 'Phase' })}
      ${inp('iter.newChange', { label: 'Änderung', unit: 'mm; Höhe + = höher, Versatz + = zurück', min: -60, max: 60 })}
      ${sel('iter.newOutcome', [{ value: 'better', label: 'Besser' }, { value: 'worse', label: 'Schlechter' }, { value: 'ambiguous', label: 'Unklar' }], { label: 'Ergebnis' })}
    </div>
    ${inp('iter.newNote', { type: 'text', label: 'Notiz', unit: 'optional, z. B. Tempo, Geräusch der Rolle, Oberkörper' })}
    <div><button class="btn" data-act="addLog">Eintrag speichern</button> <button class="btn ghost" data-act="undoLog">Letzten Eintrag löschen</button></div>
    <div data-derived="iterLog">${D.iterLog()}</div>
    <h3>Vor/zurück-Kompensation</h3>
    <div class="grid3">${inp('iter.saddleBackMm', { label: 'Sattel nach hinten verschoben', unit: 'mm (negativ = nach vorn)', min: -40, max: 40 })}</div>
    <div data-derived="foreAftComp">${D.foreAftComp()}</div>
    <h3>Feinabstimmung mit 2-mm-Pad</h3>
    <div class="grid3">
      ${sel('iter.padResult', [{ value: 'better', label: 'Mit Pad besser' }, { value: 'worse', label: 'Mit Pad schlechter' }, { value: 'ambiguous', label: 'Kein Unterschied' }], { label: 'Pad-Test' })}
      ${sel('iter.lowerResult', [{ value: 'better', label: 'Besser' }, { value: 'worse', label: 'Schlechter' }, { value: 'ambiguous', label: 'Kein Unterschied' }], { label: '2 … 3 mm tiefer' })}
    </div>
    <div data-derived="fine">${D.fine()}</div>
    ${callout('', '<b>Unterlenker.</b> ' + esc(BG.DROPS_COMPROMISE_NOTE))}` },

  { id: 'bars', title: 'Lenker einstellen', status: () => doneRatio('bars.checks', 6), html: () => `
    <h2>Lenker einstellen</h2>
    <p class="lead">Der Sattel ist fertig und bleibt unangetastet. Erst Schalthebel, dann Hoods-Position über Vorbaulänge und Höhe, dann Unterlenker.</p>
    ${sel('bars.style', [{ value: 'race', label: 'Sportlich (Torso ~40 … 44°)' }, { value: 'balanced', label: 'Ausgewogen (~45°)' }, { value: 'comfort', label: 'Komfort (45 … 50°)' }], { label: 'Fahrstil' })}
    <div data-derived="barsTarget">${D.barsTarget()}</div>
    ${checks('bars.checks', BG.PROTOCOL.find((s) => s.id === 'bars').items)}
    ${callout('', '<b>Warum die Sattelhöhe die Hände bewegt.</b> Ein tiefer Sattel (oft mit langen Kurbeln) hebt die Knie zur Brust, kippt das Becken nach hinten und stellt den Oberkörper auf; die Hände bleiben hinter den Hoods. Ein hoher Sattel überdehnt die Hamstrings, die das Becken ebenfalls nach hinten ziehen. In beiden Fällen ist der Sattel die Ursache, nicht der Vorbau.')}` },

  { id: 'err', title: 'Fehlerbilder', status: () => (Object.keys(S.err).length ? 1 : 0), html: () => `
    <h2>Fehlerbilder</h2>
    <p class="lead">Wenn es nicht zusammenpasst: Symptome ankreuzen, Ursachen und Maßnahmen ablesen.</p>
    <div class="grid2">
      ${sel('err.railsAtEnd', [{ value: 'none', label: 'Nein, Klemme im Bereich' }, { value: 'front', label: 'Ja, vorderer Anschlag' }, { value: 'back', label: 'Ja, hinterer Anschlag' }], { label: 'Sattelstreben am Anschlag?' })}
      ${sel('err.noSweetSpot', [{ value: 'no', label: 'Nein' }, { value: 'yes', label: 'Ja' }], { label: 'Kein Sweet Spot zu finden?' })}
      ${sel('err.lld', [{ value: 'no', label: 'Nein' }, { value: 'yes', label: 'Ja' }], { label: 'Beinlängendifferenz vermutet?' })}
      ${sel('err.cannotReach', [{ value: 'no', label: 'Nein' }, { value: 'yes', label: 'Ja' }], { label: 'Hoods nicht erreichbar trotz Kompaktlenker, hochgerollt, kurzem Vorbau?' })}
      ${sel('err.frameSizeOk', [{ value: 'yes', label: 'Ja' }, { value: 'no', label: 'Nein' }], { label: 'Rahmengröße laut Tabelle passend?' })}
    </div>
    <div data-derived="diag">${D.diag()}</div>
    <h3>Beinlängen-Selbsttest</h3>
    <p>Rückenlage, Beine gestreckt, Innenknöchel angleichen; dann Knie beugen und die Höhe der Kniescheiben vergleichen. Fehleranfällig: Eine funktionelle Differenz durch ein verdrehtes Becken sieht gleich aus, und Shims machen sie schlimmer. Bestätigung nur durch Fachpersonal.</p>` },

  { id: 'record', title: 'Aufzeichnung', status: () => (8 - BG.RECORD_FIELDS.filter((f) => !has(S.rec[f.key])).length) / 8, html: () => `
    <h2>Aufzeichnung und Übertragung</h2>
    <p class="lead">Die Position festhalten. Sternmaße sind auf andere Räder übertragbar, gelten aber für diesen Sattel; ein anderer Sattel ist ein Startpunkt mit Feinabstimmung.</p>
    <div class="grid3">${BG.RECORD_FIELDS.map((f) => inp('rec.' + f.key, { label: `${f.code}${f.transferable ? '*' : ''} ${f.title}`, unit: 'mm · ' + f.how, min: 0, max: 1200 })).join('')}</div>
    <div data-derived="record">${D.record()}</div>
    <h3>Auf andere Rahmen übertragen</h3>
    <p>Aus A, C, F und G werden Sattel- und Lenkerposition relativ zum Tretlager berechnet und gegen die Beispielrahmen geprüft: mit welchem Vorbau und wie vielen Spacern erreicht der Rahmen diese Position.</p>
    <div data-derived="transfer">${D.transfer()}</div>` },

  { id: 'road', title: 'Straßentest', status: () => doneRatio('road.checks', BG.ROAD_CHECKLIST.length), html: () => `
    <h2>Straßentest und Anpassung</h2>
    <p class="lead">Große Änderungen wirken sofort, ein Kurbeltausch braucht länger. Vorher alle Schrauben mit Drehmoment prüfen.</p>
    ${checks('road.checks', BG.ROAD_CHECKLIST)}
    ${text('road.notes', { label: 'Vergleich zu vorher', placeholder: 'Tempo, Trittfrequenz, Puls, neue oder verschwundene Beschwerden …' })}
    ${callout('warn', '<b>Bleibt ein neuer Schmerz</b> nach einigen Fahrten bestehen: nicht weiterfahren, alte Einstellung wiederherstellen, professionelles Fitting oder medizinische Abklärung.')}
    <h3>Kernaussagen</h3>
    <ul>${BG.KEY_CONCLUSIONS.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    <h3>Daten sichern</h3>
    <p>Alle Eingaben als JSON, zum Kopieren oder Wiederherstellen.</p>
    <textarea id="export" readonly>${esc(JSON.stringify(S))}</textarea>
    <div><button class="btn ghost" data-act="import">Aus Textfeld wiederherstellen</button> <button class="btn ghost" data-act="reset">Alles zurücksetzen</button></div>` },
];

// ---------- Abgeleitete Blöcke ----------
const D = {
  effort() {
    const t = BG.effortTargets({ maxHrBpm: S.prep.maxHr, ftpW: S.prep.ftp });
    return `<table class="t"><tr><th>Phase</th><th>Tempo</th><th>Belastung</th></tr>
      <tr><td>Aufwärmen 10 … 15 min</td><td class="mono">${t.warmupKph[0]} … ${t.warmupKph[1]} km/h</td><td>leicht, nicht pushen</td></tr>
      <tr><td>Bewertungsfahrt</td><td class="mono">${t.assessmentKph[0]} … ${t.assessmentKph[1]} km/h</td><td>RPE ${t.rpe[0]} … ${t.rpe[1]}${t.heartRateBpm ? `, <span class="mono">${t.heartRateBpm[0]} … ${t.heartRateBpm[1]} bpm</span>` : ', 65 … 85 % HFmax'}${t.powerW ? `, <span class="mono">${t.powerW[0]} … ${t.powerW[1]} W</span>` : ', 60 … 75 % FTP'}</td></tr></table>`;
  },
  cleatShift() {
    const v = S.cleats.shiftBack;
    if (!has(v)) return '<p class="save">Betrag eintragen, um die Wirkung auf die Sattelhöhe zu sehen.</p>';
    const [a, b] = BG.cleatShiftAsSaddleHeight(v);
    return callout('', `Cleats <b>${v} mm</b> nach hinten wirken wie Sattel <b>${a} … ${b} mm höher</b>. Fühlt es sich danach schwerer an, das Tempo zu halten, bestätigt das eher einen zu hohen Sattel; die Leistung kommt zurück, wenn der Sattel sinkt.`);
  },
  calc() {
    const L = legs();
    const p = prediction();
    const out = [];
    if (p) {
      out.push(`<h3>Vorhersage Sattelhöhe</h3>${callout(p.sanity && !p.sanity.plausible ? 'warn' : '', `<b>${p.predictedMm} mm</b> (Basis: ${p.basis === 'inseam+gt' ? 'Schrittlänge + Trochanterhöhe, R² 0,95' : p.basis === 'inseam' ? 'nur Schrittlänge, R² 0,91' : 'nur Trochanterhöhe, R² 0,92'}). Reale Positionen streuen gut 10 … 15 mm um diesen Wert; deshalb zählen die Indikatoren.${p.sanity ? ` Trochanter − Schrittlänge = ${p.sanity.gtMinusInseamCm} cm${p.sanity.plausible ? ', plausibel (6 … 12 cm).' : ' – außerhalb 6 … 12 cm, Maße prüfen.'}` : ''}`)}`);
      if (has(S.body.saddleActualMm)) { const c = BG.compareSaddleHeight(S.body.saddleActualMm, p.predictedMm); out.push(callout(c.level === 'alarm' ? 'fail' : c.level === 'notable' ? 'warn' : 'ok', `<b>Ist ${S.body.saddleActualMm} mm.</b> ${esc(c.message)}`)); }
    } else out.push('<p class="save">Schrittlänge und Trochanterhöhe eintragen; die Kombination ist die beste Vorhersage.</p>');
    const cr = BG.recommendCrankLength(L);
    if (cr) {
      out.push(`<h3>Kurbellänge</h3>${callout('', `Empfehlung <b>${cr.crankLengthMm} mm</b> (${cr.basis === 'inseam+gt' ? 'Schrittlänge + Trochanter' : cr.basis === 'height' ? 'nur Körpergröße' : cr.basis === 'inseam' ? 'Schrittlänge' : 'Trochanterhöhe'}).${cr.note ? ' ' + esc(cr.note) : ''}`)}`);
      if (has(S.body.crankMm)) { const a = BG.assessCrank(S.body.crankMm, cr); out.push(callout(a.verdict === 'long' ? 'warn' : 'ok', esc(a.message))); }
    }
    if (has(S.body.shoulderMm)) { const w = BG.recommendBarWidth(S.body.shoulderMm); out.push(`<h3>Lenkerbreite</h3>${callout(has(S.body.barWidthMm) && S.body.barWidthMm !== w ? 'warn' : '', `Schulterbreite ${S.body.shoulderMm} mm → Lenker <b>${w} mm</b> Mitte–Mitte.${has(S.body.barWidthMm) ? (S.body.barWidthMm === w ? ' Aktueller Lenker passt.' : ` Aktuell ${S.body.barWidthMm} mm: ohne Beschwerden an Nacken, Schultern, Armen, Handgelenken kein Muss. Schmalere Lenker verkürzen den Reach leicht.`) : ''}`)}`); }
    const pr = BG.bodyProportions(L);
    if (pr) out.push(`<h3>Proportionen</h3>${callout(pr.legs !== 'average' || pr.arms === 'short' ? 'warn' : '', `Schrittlänge/Größe <b>${pr.inseamToHeight}</b>: ${pr.legs === 'long' ? 'lange Beine (über 0,475) – hoher Sattel, Reach zu den Hoods wird schnell zu lang; Endurance-Geometrie mit hohem Stack und kurzem Reach passt besser.' : pr.legs === 'short' ? 'kurze Beine (unter 0,45) – tieferer Sattel, Reach eher zu kurz; sportliche Geometrie mit längerem Reach passt besser.' : 'durchschnittlich.'}${pr.arms ? ` Spannweite ${pr.spanMinusHeightCm > 0 ? '+' : ''}${pr.spanMinusHeightCm} cm zur Größe: ${pr.arms === 'short' ? 'kurze Arme (mehr als 3 cm kürzer).' : pr.arms === 'long' ? 'lange Arme.' : 'durchschnittlich (±1 … 2 cm üblich).'}` : ''}`)}`);
    if (has(L.heightCm) || has(L.inseamCm)) {
      const hits = BG.frameSizesFor(L);
      out.push(`<h3>Rahmengröße Rennrad</h3><div class="tw"><table class="t"><tr><th>Größe</th><th>Größe cm</th><th>Schritt cm</th><th>Sitzrohr</th><th>Oberrohr</th><th>Sitzwinkel</th><th>Steuerrohr</th><th>Reach</th><th>Stack</th><th>Kurbel</th><th>Lenker</th></tr>${BG.SIZING_TABLE.map((r) => { const h = hits.find((x) => x.row.size === r.size); const rg = (a) => `${a[0]}${a[1] !== a[0] ? ' – ' + a[1] : ''}`; return `<tr class="${h ? 'hit' : ''}"><td class="mono"><b>${r.size}</b>${h ? ` <span class="save">(${h.matches.map((m) => (m === 'height' ? 'Größe' : 'Schritt')).join(' + ')})</span>` : ''}</td><td class="mono">${rg(r.heightCm)}</td><td class="mono">${rg(r.inseamCm)}</td><td class="mono">${rg(r.seatTubeMm)}</td><td class="mono">${rg(r.topTubeMm)}</td><td class="mono">${rg(r.seatAngleDeg)}°</td><td class="mono">${rg(r.headTubeMm)}</td><td class="mono">${rg(r.reachMm)}</td><td class="mono">${rg(r.stackMm)}</td><td class="mono">${rg(r.crankMm)}</td><td class="mono">${rg(r.barWidthMm)}</td></tr>`; }).join('')}</table></div><p class="save">Bereiche überlappen. Eine Größe zu groß oder zu klein lässt sich mit Komponenten ausgleichen, mehr nicht. Ab 54/M sind 172,5-mm-Kurbeln häufig zu lang.</p>`);
    }
    return out.join('');
  },
  tallyH() {
    const t = BG.tallySaddleHeight(S.ind);
    const p = prediction();
    let extra = '';
    if (p && has(S.body.saddleActualMm)) { const c = BG.compareSaddleHeight(S.body.saddleActualMm, p.predictedMm); extra = `<p>Vorhersage ${p.predictedMm} mm, Ist ${S.body.saddleActualMm} mm: ${esc(c.message)}</p>`; }
    else extra = '<p class="save">Beinmaße und aktuelle Sattelhöhe unter „Beinmaße & Rechner“ eintragen, dann erscheint hier der Vergleich mit der Vorhersage.</p>';
    return tallyBox(t, { high: 'zu hoch', inconclusive: 'unentschieden', low: 'zu tief' }) + extra;
  },
  tallyFA() { return tallyBox(BG.tallyForeAft(S.ind), { forward: 'vorn / Nase unten', inconclusive: 'unentschieden', back: 'hinten / Nase oben' }); },
  tallyBar() {
    const r = BG.tallyBarReach(S.ind), h = BG.tallyBarHeight(S.ind);
    return `<h4>Höhe und Reach (Hoods)</h4>${tallyBox(r, { 'far-or-low': 'zu weit / zu tief', inconclusive: 'unentschieden', 'close-or-high': 'zu nah / zu hoch' })}<h4>Nur Höhe (Unterlenker)</h4>${tallyBox(h, { low: 'zu tief', inconclusive: 'unentschieden', high: 'zu hoch' })}`;
  },
  iterStart() {
    const p = prediction();
    const a = S.body.saddleActualMm;
    const t = BG.tallySaddleHeight(S.ind);
    if (!has(a)) return callout('warn', 'Aktuelle Sattelhöhe unter „Beinmaße & Rechner“ eintragen.');
    const s = BG.initialCoarseChange(a, p?.predictedMm, t.verdict);
    const tape = BG.tapeMarkAboveClampMm(a, p?.predictedMm);
    return callout('', `<b>Erster Schritt: ${s.changeMm > 0 ? '+' : ''}${s.changeMm} mm.</b> ${esc(s.reason)}<br>Kreppband ${tape} mm über der Klemme anbringen, damit Änderungen ablesbar bleiben. Vor der Änderung 5 min warmfahren und in die Leistung „hineinhören“: überstreckt unten, gestaucht oben, Hoods vs. Unterlenker.`);
  },
  iterLog() {
    const log = S.iter.log;
    const next = BG.nextCoarseStep(log);
    const coarse = log.filter((l) => l.phase === 'coarse');
    const lines = log.length ? `<ul class="log">${log.map((l) => `<li><span class="verdict">${esc({ coarse: 'grob', 'fore-aft': 'vor/zurück', fine: 'fein', bars: 'Lenker' }[l.phase])}</span><span class="mono">${l.changeMm > 0 ? '+' : ''}${l.changeMm} mm → ${esc({ better: 'besser', worse: 'schlechter', ambiguous: 'unklar' }[l.outcome])}</span><span>${esc(l.note ?? '')}</span></li>`).join('')}</ul>` : '<p class="save">Noch keine Einträge.</p>';
    const sum = coarse.reduce((s, l) => s + l.changeMm, 0);
    const cur = has(S.body.saddleActualMm) ? `<p>Grobänderungen summiert: <b class="mono">${sum > 0 ? '+' : ''}${sum} mm</b> → Sattelhöhe jetzt etwa <b class="mono">${S.body.saddleActualMm + sum} mm</b>.</p>` : '';
    return lines + cur + (coarse.length ? callout(next.changeMm === 0 ? 'ok' : '', `<b>Nächster Schritt: ${next.changeMm > 0 ? '+' : ''}${next.changeMm} mm.</b> ${esc(next.reason)}`) : '');
  },
  foreAftComp() {
    const v = S.iter.saddleBackMm;
    if (!has(v) || v === 0) return '<p class="save">Nach dem Verschieben eintragen: Zurück wirkt höher, vor wirkt tiefer.</p>';
    const [a, b] = BG.foreAftAsSaddleHeight(Math.abs(v));
    return callout('', v > 0 ? `Sattel <b>${v} mm zurück</b> wirkt wie <b>${a} … ${b} mm höher</b>. Zum Ausgleich Sattel etwa ${a} … ${b} mm absenken und prüfen, ob das besser ist; wenn nicht, 2 … 3 mm in die andere Richtung.` : `Sattel <b>${-v} mm nach vorn</b> wirkt wie <b>${a} … ${b} mm tiefer</b>. Zum Ausgleich Sattel etwa ${a} … ${b} mm anheben und prüfen.`);
  },
  fine() {
    if (!has(S.iter.padResult)) return '<p class="save">Pad einlegen, Tempo halten, Pad herausziehen. Der Unterschied zwischen 3 mm und 1 mm daneben ist deutlich spürbar, der zwischen 12 und 10 mm nicht.</p>';
    const s = BG.nextFineStep(S.iter.padResult, S.iter.lowerResult);
    S.iter.done = !!s.done;
    return callout(s.done ? 'ok' : '', `<b>${s.done ? 'Sweet Spot gefunden.' : `Nächster Schritt: ${s.changeMm > 0 ? '+' : ''}${s.changeMm} mm.`}</b> ${esc(s.reason)}`);
  },
  barsTarget() {
    const t = BG.torsoAngleTarget(S.bars.style || 'balanced');
    const r = BG.tallyBarReach(S.ind), h = BG.tallyBarHeight(S.ind);
    return callout('', `Torsowinkel Ziel <b>${t.rangeDeg[0]} … ${t.rangeDeg[1]}°</b>, Start bei ${t.startDeg}°. Oberarm zu Oberkörper 80 … 90°, ideal 85°: Die Hände dürfen überall auf dem Kreisbogen um das Schultergelenk liegen, also langer Vorbau hoch oder kurzer Vorbau tief. Vorbau 100 … 110 mm ist die gute Mitte, unter 90 mm wird die Lenkung nervös.<br>Aus den Indikatoren: Hoods ${esc(VLABEL[r.verdict])}, Unterlenker ${esc(VLABEL[h.verdict])}.`);
  },
  diag() {
    const e = S.err;
    const sym = { railsAtEnd: e.railsAtEnd, noSweetSpot: e.noSweetSpot === 'yes', legLengthSuspected: e.lld === 'yes', crankTooLong: false, cannotReachHoods: e.cannotReach === 'yes', frameSizeOk: e.frameSizeOk === undefined ? undefined : e.frameSizeOk === 'yes', measurements: legs() };
    const cr = BG.recommendCrankLength(legs());
    if (cr && has(S.body.crankMm) && S.body.crankMm > cr.crankLengthMm) sym.crankTooLong = true;
    const d = BG.diagnose(sym);
    if (!d.length) return '<p class="save">Keine Fehlerbilder aus den aktuellen Angaben.</p>';
    return d.map((x) => `${callout('warn', `<b>${esc(x.title)}</b><br>${esc(x.cause)}`)}<ol>${x.actions.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>`).join('');
  },
  record() {
    const miss = BG.missingTransferable(S.rec);
    return miss.length ? `<p class="save">Übertragbar fehlen noch: ${miss.map((f) => f.code).join(', ')}.</p>` : callout('ok', 'Alle übertragbaren Maße erfasst.');
  },
  transfer() {
    const b = S.body;
    if (!has(b.inseamCm) || !has(b.heightCm)) return '<p class="save">Schrittlänge und Körpergröße unter „Beinmaße & Rechner“ eintragen.</p>';
    const m = BG.completeMeasurements({ heightMm: b.heightCm * 10, inseamMm: b.inseamCm * 10 });
    const t = BG.targetsFromRecord(S.rec, { inseamMm: m.inseamMm, heightMm: m.heightMm, torsoMm: m.torsoMm, armMm: m.armMm });
    if (!t) return '<p class="save">Dafür werden A, C, F und G gebraucht.</p>';
    const frames = (window.BIKEGEO_FRAMES || []).filter((f) => !f.discipline.startsWith('mtb'));
    const rider = { measurements: { heightMm: m.heightMm, inseamMm: m.inseamMm }, flexibility: 'medium', posture: 'balanced', discipline: 'road-race' };
    const ranked = frames.map((f) => BG.matchFrame({ ...rider, discipline: f.discipline }, f, t)).sort((x, y) => y.score - x.score);
    return `<p>Zielposition aus der Aufzeichnung: Sattel (${n(t.saddle.x)} / ${n(t.saddle.y)}), Lenkerklemmung (${n(t.bar.x)} / ${n(t.bar.y)}), effektiver Sitzwinkel ${t.seatAngleDeg}°.</p><ul class="rank">${ranked.map((r) => `<li><b class="mono">${r.score}</b><span>${esc(r.frame.model)} ${esc(r.frame.size)} · Vorbau ${r.cockpit.stemLengthMm} mm / ${r.cockpit.stemAngleDeg}°, Spacer ${r.cockpit.spacersMm} mm, Δ ${n(r.barDelta.x)} / ${n(r.barDelta.y)} mm, Versatz ${r.saddleSetbackMm} mm${r.notes.filter((x) => x.severity !== 'ok').map((x) => `<br><span class="save">${esc(x.message)}</span>`).join('')}</span></li>`).join('')}</ul><p class="save">Annahmen: Sattelspitze bis Sitzposition 130 mm, Hoods 85 mm vor und 12 mm über der Klemmung.</p>`;
  },
};

// ---------- Rendern ----------
function buildNav() {
  const nav = root.querySelector('.steps');
  nav.innerHTML = STEPS.map((s, i) => `<button data-step="${s.id}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${esc(s.title)}</span><span class="st"></span></button>`).join('') + `<div class="save" id="savestate" style="padding:8px 8px 2px"></div>`;
}
// Nur Klassen ändern, nie das DOM ersetzen: sonst geht ein Mausklick verloren, wenn das Verlassen eines Feldes ein change-Ereignis auslöst.
function renderNav() {
  root.querySelectorAll('.steps button').forEach((b) => {
    const s = STEPS.find((x) => x.id === b.dataset.step);
    const st = s.status();
    b.classList.toggle('on', S.step === s.id);
    const dot = b.querySelector('.st');
    dot.className = 'st ' + (st >= 0.999 ? 'done' : st > 0 ? 'part' : '');
  });
}
function renderStep() {
  const s = STEPS.find((x) => x.id === S.step) || STEPS[0];
  root.querySelector('.step').innerHTML = s.html();
}
function renderDerived() {
  root.querySelectorAll('[data-derived]').forEach((el) => {
    const k = el.dataset.derived;
    if (k.startsWith('v:')) { const id = k.slice(2); const ind = [...BG.SADDLE_HEIGHT_INDICATORS, ...BG.FORE_AFT_INDICATORS, ...BG.HANDLEBAR_INDICATORS].find((i) => i.id === id); if (ind) el.innerHTML = verdictPill(ind); }
    else if (D[k]) el.innerHTML = D[k]();
  });
  renderNav();
}
function status(t) { const el = root.querySelector('#savestate'); if (el) el.textContent = t; }

// ---------- Speichern ----------
function loadLocal() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ohne Speicher weiterarbeiten */ } }
function save() {
  S.updatedAt = Date.now();
  saveLocal();
  status('Gespeichert im Browser');
  if (db) { clearTimeout(saveTimer); saveTimer = setTimeout(() => db.doc('fittings/current').set(S).then(() => status('Gespeichert (Datenbank)')).catch(() => status('Im Browser gespeichert, Datenbank nicht erreichbar')), 600); }
}
async function initDb() {
  try { db = (await window.claude?.use?.('db')) ?? null; } catch { db = null; }
  if (!db) return;
  try {
    const snap = await db.doc('fittings/current').get();
    if (snap.exists) { const d = snap.data(); if (d && (d.updatedAt || 0) > (S.updatedAt || 0)) { S = merge(DEFAULT(), d); renderStep(); renderNav(); } }
    status('Datenbank verbunden');
  } catch { /* lokal weiter */ }
}
function merge(base, d) { for (const k of Object.keys(d)) base[k] = d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && base[k] && typeof base[k] === 'object' ? merge(base[k], d[k]) : d[k]; return base; }

// ---------- Ereignisse ----------
function onInput(e) {
  const el = e.target;
  if (!el.dataset || !el.dataset.k) return;
  // Text- und Zahlfelder nur über 'input' verarbeiten; 'change' beim Verlassen wäre ein Doppel.
  if (e.type === 'change' && (el.tagName === 'INPUT' && el.type !== 'checkbox' || el.tagName === 'TEXTAREA')) return;
  const t = el.dataset.t;
  let v;
  if (t === 'bool') v = el.checked;
  else if (t === 'number') v = el.value === '' ? undefined : Number(el.value);
  else v = el.value === '' ? undefined : el.value;
  set(el.dataset.k, v);
  if (el.dataset.k === 'base.dropsTime' && has(v)) set('ind.drops-time', v);
  save();
  renderDerived();
}
function onClick(e) {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.step) { S.step = b.dataset.step; save(); renderStep(); renderNav(); root.querySelector('.step').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  const act = b.dataset.act;
  if (act === 'addLog') {
    const ph = S.iter.newPhase || 'coarse', ch = S.iter.newChange, oc = S.iter.newOutcome;
    if (!has(ch) || !has(oc)) { status('Änderung und Ergebnis angeben'); return; }
    S.iter.log.push({ phase: ph, changeMm: Number(ch), outcome: oc, note: S.iter.newNote || '' });
    delete S.iter.newChange; delete S.iter.newOutcome; delete S.iter.newNote;
    save(); renderStep(); renderNav();
  } else if (act === 'undoLog') { S.iter.log.pop(); save(); renderStep(); renderNav(); }
  else if (act === 'import') { try { const d = JSON.parse(root.querySelector('#export').value); S = merge(DEFAULT(), d); save(); renderStep(); renderNav(); } catch { status('Ungültiges JSON'); } }
  else if (act === 'reset') { if (confirm('Alle Fitting-Eingaben löschen?')) { S = DEFAULT(); save(); renderStep(); renderNav(); } }
}

export function mountFitting(el) {
  root = el;
  const local = loadLocal();
  if (local) S = merge(DEFAULT(), local);
  root.innerHTML = '<nav class="steps" aria-label="Fitting-Schritte"></nav><section class="step"></section>';
  buildNav();
  renderNav();
  renderStep();
  root.addEventListener('input', onInput);
  root.addEventListener('change', onInput);
  root.addEventListener('click', onClick);
  initDb();
}
