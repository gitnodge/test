// Bike Geo – Fit-Bike-Ansicht: virtuelles Fitting-Rad für Kunden ohne Rad.
import * as BG from './bikegeo.js';
import { store } from './fitting.js';

let root;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (v) => Math.round(v);
const has = (v) => v !== undefined && v !== null && v !== '';

const DEF = () => ({ crankLengthMm: 172.5, saddleHeightMm: 740, saddleSetbackMm: 75, barXMm: 500, barYMm: 640, barType: 'drop', barWidthMm: 420, crankDeg: 90, posture: 'balanced', discipline: 'road-race' });

function state() { const S = store.get(); if (!S.fitbike || !has(S.fitbike.saddleHeightMm)) S.fitbike = { ...DEF(), ...(S.fitbike || {}) }; return S; }
function bodyInput() {
  const b = state().body;
  const heightMm = has(b.heightCm) ? b.heightCm * 10 : 1780;
  const o = { heightMm };
  if (has(b.inseamCm)) o.inseamMm = b.inseamCm * 10;
  if (has(b.gtCm)) o.gtHeightMm = b.gtCm * 10;
  if (has(b.torsoMm)) o.torsoMm = b.torsoMm;
  if (has(b.armMm)) o.armMm = b.armMm;
  return o;
}
function rider() {
  const S = state(); const bi = bodyInput();
  return { measurements: { heightMm: bi.heightMm, inseamMm: bi.inseamMm ?? Math.round(bi.heightMm * 0.47) }, flexibility: 'medium', posture: S.fitbike.posture, discipline: S.fitbike.discipline };
}
function setup() { const f = state().fitbike; return { crankLengthMm: f.crankLengthMm, saddleHeightMm: f.saddleHeightMm, saddleSetbackMm: f.saddleSetbackMm, barXMm: f.barXMm, barYMm: f.barYMm, barType: f.barType, barWidthMm: f.barWidthMm }; }

// ---------- Zeichnung ----------
function drawing(su, body, pose, an) {
  const { saddle, saddleTip, bar, grip } = BG.contactPoints(su);
  const J = pose.joints;
  const baseY = -280;
  const pts = [saddle, bar, grip, J.head, J.hip, J.shoulder, J.knee, J.kneeRear, J.pedal, J.pedalRear];
  const minX = Math.min(-520, ...pts.map((p) => p.x)) - 60, maxX = Math.max(760, ...pts.map((p) => p.x)) + 60;
  const minY = baseY - 40, maxY = Math.max(...pts.map((p) => p.y)) + 150;
  const W = maxX - minX, H = maxY - minY;
  const P = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  const seg = (a, b, c, w, dash) => `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  const poly = (ps, c, w) => `<polyline points="${ps.map(P).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const dot = (p, c, r) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${c}"/>`;
  const ring = (p, c, r, w) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
  const X = (x) => (x - minX).toFixed(1), Y = (y) => (maxY - y).toFixed(1);
  const label = (p, txt, dx, dy, anchor = 'start', color = 'var(--muted)') => `<text x="${(+X(p.x) + dx).toFixed(1)}" y="${(+Y(p.y) + dy).toFixed(1)}" font-size="32" font-family="JetBrains Mono,monospace" fill="${color}" paint-order="stroke" stroke="var(--panel)" stroke-width="10" stroke-linejoin="round" text-anchor="${anchor}">${esc(txt)}</text>`;
  // Fit-Bike: Grundschiene, Tretlagerturm, Sattelsäule, Lenkersäule (alles verstellbar, kein Rahmen).
  const rail = seg({ x: -500, y: baseY }, { x: 740, y: baseY }, 'var(--ink)', 16);
  const feet = seg({ x: -500, y: baseY - 30 }, { x: -500, y: baseY }, 'var(--ink)', 16) + seg({ x: 740, y: baseY - 30 }, { x: 740, y: baseY }, 'var(--ink)', 16);
  const bbTower = seg({ x: 0, y: baseY }, { x: 0, y: -60 }, 'var(--ink)', 22) + seg({ x: -120, y: baseY }, { x: 0, y: -60 }, 'var(--ink)', 10) + seg({ x: 120, y: baseY }, { x: 0, y: -60 }, 'var(--ink)', 10);
  const seatBase = { x: -240, y: baseY };
  const seatCol = seg(seatBase, { x: saddle.x, y: saddle.y - 20 }, 'var(--ink)', 18) + seg(seatBase, { x: seatBase.x, y: baseY + 120 }, 'var(--ink)', 26);
  const saddleShape = seg({ x: saddle.x - 130, y: saddle.y }, { x: saddleTip.x, y: saddle.y }, 'var(--ink)', 14);
  const barBase = { x: 420, y: baseY };
  const barCol = seg(barBase, { x: bar.x, y: bar.y - 10 }, 'var(--ink)', 18) + seg(barBase, { x: barBase.x, y: baseY + 120 }, 'var(--ink)', 26);
  const barShape = su.barType === 'drop'
    ? `<path d="M ${P(bar)} c 70,0 95,-15 95,-70 c 0,-70 -35,-95 -75,-95" fill="none" stroke="var(--ink)" stroke-width="12" stroke-linecap="round"/>` + seg({ x: bar.x + 60, y: bar.y + 2 }, { x: bar.x + 98, y: bar.y + 20 }, 'var(--ink)', 22)
    : seg({ x: bar.x - 20, y: bar.y }, { x: bar.x + 25, y: bar.y + 10 }, 'var(--ink)', 12);
  const cr = su.crankLengthMm;
  const crank = seg(J.pedalRear, J.pedal, 'var(--ink)', 9) + ring({ x: 0, y: 0 }, 'var(--line)', cr, 2) + ring({ x: 0, y: 0 }, 'var(--ink)', 80, 5) + seg({ x: J.pedal.x - 35, y: J.pedal.y }, { x: J.pedal.x + 35, y: J.pedal.y }, 'var(--ink)', 8) + seg({ x: J.pedalRear.x - 35, y: J.pedalRear.y }, { x: J.pedalRear.x + 35, y: J.pedalRear.y }, 'var(--ink)', 8);
  const foot = (ank, ped, c) => poly([{ x: ank.x - 40, y: ank.y - 70 }, { x: ped.x + 5, y: ped.y + 12 }, { x: ped.x + 80, y: ped.y + 8 }], c, 20) + seg(ank, { x: ped.x + 5, y: ped.y + 12 }, c, 16);
  const legRear = poly([J.hip, J.kneeRear, J.ankleRear], 'var(--accent-soft)', 22) + foot(J.ankleRear, J.pedalRear, 'var(--accent-soft)');
  const legFront = poly([J.hip, J.knee, J.ankle], pose.legStretched ? 'var(--fail)' : 'var(--accent)', 22) + foot(J.ankle, J.pedal, 'var(--accent)');
  const torso = poly([J.hip, J.shoulder, J.elbow, J.grip], pose.armStretched ? 'var(--fail)' : 'var(--accent)', 22) + dot(J.grip, 'var(--accent)', 20);
  const neckA = Math.atan2(J.shoulder.y - J.hip.y, J.shoulder.x - J.hip.x) + 22 * Math.PI / 180;
  const neck = seg(J.shoulder, { x: J.shoulder.x + 70 * Math.cos(neckA), y: J.shoulder.y + 70 * Math.sin(neckA) }, 'var(--accent)', 20) + dot(J.head, 'var(--accent)', 100);
  const joints = [J.hip, J.shoulder, J.elbow, J.knee, J.ankle].map((p) => dot(p, 'var(--panel)', 11)).join('');
  // Bemaßung: Sattelhöhe, Setback, HX/HY
  const dims = seg({ x: 0, y: 0 }, saddle, 'var(--accent)', 2, '10 8') + seg({ x: saddleTip.x, y: saddle.y + 40 }, { x: 0, y: saddle.y + 40 }, 'var(--accent)', 2) + seg({ x: 0, y: 0 }, { x: 0, y: bar.y }, 'var(--accent)', 2, '10 8') + seg({ x: 0, y: bar.y }, bar, 'var(--accent)', 2, '10 8');
  return `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Virtuelles Fit-Bike mit Fahrer">
  <g transform="translate(${(-minX).toFixed(1)},${maxY.toFixed(1)}) scale(1,-1)">
    ${rail}${feet}${bbTower}${seatCol}${saddleShape}${barCol}${barShape}${dims}${crank}
    ${legRear}${legFront}${torso}${neck}${joints}
  </g>
  ${label({ x: saddle.x / 2, y: saddle.y / 2 }, 'Sattel ' + n(su.saddleHeightMm), -20, -10, 'end')}
  ${label({ x: saddleTip.x / 2, y: saddle.y + 40 }, 'Setback ' + n(su.saddleSetbackMm), 0, -12, 'middle')}
  ${label({ x: 0, y: bar.y / 2 }, 'HY ' + n(bar.y), 14, 0)}
  ${label({ x: bar.x / 2, y: bar.y }, 'HX ' + n(bar.x), 0, -12, 'middle')}
  ${label(J.knee, 'Knie ' + n(pose.angles.kneeDeg) + '°', 24, 8, 'start', 'var(--ink)')}
  ${label(J.hip, 'Hüfte ' + n(pose.angles.hipDeg) + '°', -24, -10, 'end', 'var(--ink)')}
  ${label(J.shoulder, 'Torso ' + n(pose.angles.torsoDeg) + '° · Arm ' + n(pose.angles.torsoArmDeg) + '°', -24, -30, 'end', 'var(--ink)')}
  ${label(J.ankle, 'Sprung ' + n(pose.angles.ankleDeg) + '°', 30, 30)}
  </svg>`;
}

// ---------- Readout ----------
const TH = { 'knee-max': '135 – 146°', 'knee-min': '68 – 74°', 'hip-min': '≥ ~50°', 'torso-angle': '40 – 50°', 'torso-arm': '80 – 90°', kops: '±15 mm' };
const VL = { high: 'zu hoch', low: 'zu tief', inconclusive: 'im Bereich', forward: 'zu weit vorn', back: 'zu weit hinten', 'far-or-low': 'zu weit / tief', 'close-or-high': 'zu nah / hoch' };
function readout(an) {
  const row = (k, v, th, verdict) => `<span class="k">${esc(k)}</span><span class="v">${esc(v)}</span><span><span class="verdict ${verdict === 'inconclusive' ? 'v-ok' : 'v-' + verdict}">${esc(VL[verdict] ?? verdict)}</span> <span class="th">${esc(th)}</span></span>`;
  return `<div class="readout">
    ${row('Knie max (bei ' + an.kneeMaxAtDeg + '°)', an.kneeMaxDeg + '°', TH['knee-max'], an.verdicts['knee-max'])}
    ${row('Knie min (bei ' + an.kneeMinAtDeg + '°)', an.kneeMinDeg + '°', TH['knee-min'], an.verdicts['knee-min'])}
    ${row('Hüfte min', an.hipMinDeg + '°', TH['hip-min'], an.verdicts['hip-min'])}
    ${row('Torso zur Horizontalen', an.torsoDeg + '°', TH['torso-angle'], an.verdicts['torso-angle'])}
    ${row('Oberarm zu Rumpf', an.torsoArmDeg + '°', TH['torso-arm'], an.verdicts['torso-arm'])}
    ${row('Ellbogen', an.elbowDeg + '°', 'weich ≈ 160°', an.elbowDeg >= 178 ? 'far-or-low' : 'inconclusive')}
    ${row('KOPS (Knie zur Pedalachse)', (an.kopsMm > 0 ? '+' : '') + an.kopsMm + ' mm', TH.kops, an.verdicts.kops)}
    <span class="k">Sprunggelenk oben / unten</span><span class="v">${an.ankleTopDeg}° / ${an.ankleBottomDeg}°</span><span class="th">Modellannahme, kein Indikator</span>
  </div>
  ${an.legStretched ? '<div class="callout fail"><b>Bein gestreckt.</b> Der Sattel ist für dieses Beinmodell zu hoch: Die Ferse müsste ausweichen, die Hüfte kippen.</div>' : ''}
  ${an.armStretched ? '<div class="callout fail"><b>Arme durchgestreckt.</b> Der Lenker ist für Rumpf und Arme unerreichbar ohne den Torso weiter zu senken.</div>' : ''}`;
}

function ranking(su) {
  const bi = bodyInput();
  const m = BG.completeMeasurements({ heightMm: bi.heightMm, inseamMm: bi.inseamMm ?? Math.round(bi.heightMm * 0.47) });
  const t = BG.setupToTargets(su, { heightMm: m.heightMm, inseamMm: m.inseamMm, torsoMm: m.torsoMm, armMm: m.armMm });
  const disc = state().fitbike.discipline;
  const frames = (window.BIKEGEO_FRAMES || []).filter((f) => f.discipline === disc);
  const r = rider();
  const ranked = frames.map((f) => BG.matchFrame(r, f, t)).sort((a, b) => b.score - a.score);
  if (!ranked.length) return '<p class="save">Keine Beispielrahmen für diese Disziplin.</p>';
  return `<ul class="rank">${ranked.map((x) => `<li><b class="mono">${x.score}</b><span>${esc(x.frame.model)} ${esc(x.frame.size)} · Vorbau ${x.cockpit.stemLengthMm} mm / ${x.cockpit.stemAngleDeg}°, Spacer ${x.cockpit.spacersMm} mm, Δ ${n(x.barDelta.x)} / ${n(x.barDelta.y)} mm, Versatz ${x.saddleSetbackMm} mm${x.notes.filter((q) => q.severity !== 'ok').map((q) => `<br><span class="save">${esc(q.message)}</span>`).join('')}</span></li>`).join('')}</ul>`;
}

// ---------- Rendern ----------
function slider(k, label, min, max, step, unit) {
  const v = state().fitbike[k];
  const id = 'fb-' + k;
  return `<div class="f"><label for="${id}">${esc(label)}</label><output for="${id}" id="${id}-out">${esc(v)}${unit ? ' ' + unit : ''}</output><input type="range" id="${id}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><small>${esc(min)} … ${esc(max)}${unit ? ' ' + unit : ''}</small></div>`;
}
function renderControls() {
  const S = state(); const f = S.fitbike; const b = S.body;
  root.querySelector('.fb-controls').innerHTML = `
    <h3 style="margin:0 0 8px;font-size:16px">Person</h3>
    <div class="kv" style="font-size:13px"><dt>Körpergröße</dt><dd class="mono">${has(b.heightCm) ? b.heightCm + ' cm' : '178 cm (Annahme)'}</dd><dt>Schrittlänge</dt><dd class="mono">${has(b.inseamCm) ? b.inseamCm + ' cm' : '–'}</dd><dt>Trochanterhöhe</dt><dd class="mono">${has(b.gtCm) ? b.gtCm + ' cm' : '–'}</dd></div>
    <p class="save">Maße kommen aus Fitting → „Beinmaße & Rechner“. Fehlende Segmente werden aus der Körpergröße geschätzt.</p>
    <div class="grid2" style="margin-top:8px">
      <div class="f"><label for="fb-discipline">Disziplin</label><select id="fb-discipline" data-k="discipline">${['road-race', 'road-endurance', 'gravel', 'mtb-xc', 'mtb-trail', 'mtb-enduro'].map((d) => `<option value="${d}" ${f.discipline === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
      <div class="f"><label for="fb-posture">Haltung (Torso-Ziel)</label><select id="fb-posture" data-k="posture"><option value="aggressive" ${f.posture === 'aggressive' ? 'selected' : ''}>Sportlich 42°</option><option value="balanced" ${f.posture === 'balanced' ? 'selected' : ''}>Ausgewogen 45°</option><option value="comfort" ${f.posture === 'comfort' ? 'selected' : ''}>Komfort 48°</option></select></div>
    </div>
    <div class="btns" style="margin:10px 0"><button class="btn" data-act="suggest">Startaufbau vorschlagen</button><button class="btn ghost" data-act="saddle">Sattel auf Kniewinkel 141°</button><button class="btn ghost" data-act="optimize">Lenker in Winkelbereich</button></div>
    <p class="save">Startaufbau: Sattelhöhe aus der Vorhersage, Setback über 73,5°, Lenker aus der Faustregel, dann Winkel geprüft. „Sattel auf Kniewinkel“ folgt dem Modell statt der Formel, wie ein Fitter den Indikatoren folgt. „Lenker in Winkelbereich“ bewegt den Lenker minimal, bis Torso (Ziel ±1°) und Oberarm (81 … 89°) passen.</p>
    <h3 style="margin:8px 0;font-size:16px">Fit-Bike-Einstellung</h3>
    <div class="ctrl">
      ${slider('saddleHeightMm', 'Sattelhöhe (A)', 550, 900, 1, 'mm')}
      ${slider('saddleSetbackMm', 'Setback Sattelspitze (G)', 0, 140, 1, 'mm')}
      ${slider('barXMm', 'Lenker HX', 300, 800, 1, 'mm')}
      ${slider('barYMm', 'Lenker HY', 400, 900, 1, 'mm')}
      ${slider('crankLengthMm', 'Kurbellänge (E)', 160, 180, 2.5, 'mm')}
      ${slider('barWidthMm', 'Lenkerbreite (H)', 360, 460, 20, 'mm')}
      <div class="f"><label for="fb-barType">Lenkertyp</label><select id="fb-barType" data-k="barType"><option value="drop" ${f.barType === 'drop' ? 'selected' : ''}>Rennlenker, Griff auf den Hoods</option><option value="flat" ${f.barType === 'flat' ? 'selected' : ''}>Flatbar</option></select></div>
      ${slider('crankDeg', 'Kurbelwinkel (Anzeige)', 0, 355, 5, '°')}
    </div>
    <div class="btns" style="margin-top:12px"><button class="btn" data-act="apply">Ins Fitting übernehmen</button></div>
    <p class="save">Übernimmt Sattelhöhe, Aufzeichnung A/C/E/F/G/H und die Modellwinkel als Indikatoren (Knie max/min, Hüfte min, Torso, Oberarm, Ellbogen, KOPS).</p>`;
}
function renderOutput() {
  const S = state(); const su = setup(); const body = BG.bodySegments(bodyInput());
  const pose = BG.solvePose(su, body, S.fitbike.crankDeg);
  const an = BG.analyzeCycle(su, body);
  const rec = BG.setupToRecord(su);
  root.querySelector('.fb-output').innerHTML = `
    <div class="draw"><h3>Fit-Bike bei Kurbel ${S.fitbike.crankDeg}°</h3>
      <p>Maßstäblich in mm. Sattel und Lenker sind frei im Raum, ohne Rahmen. Rot: Segment überstreckt.${body.estimated.length ? ' Geschätzt: ' + body.estimated.join(', ') + '.' : ''}</p>
      ${drawing(su, body, pose, an)}
    </div>
    <div class="draw"><h3>Gelenkwinkel über den Kurbelumlauf</h3>${readout(an)}</div>
    <div class="draw"><h3>Koordinaten (Aufzeichnung)</h3>
      <div class="readout"><span class="k">A Sattelhöhe</span><span class="v">${rec.saddleHeightMm} mm</span><span></span><span class="k">G Setback</span><span class="v">${rec.saddleSetbackMm} mm</span><span></span><span class="k">F Überhöhung</span><span class="v">${rec.saddleToBarDropMm} mm</span><span></span><span class="k">C Sattelspitze → Hoods</span><span class="v">${rec.saddleTipToHoodsMm} mm</span><span></span><span class="k">E Kurbel</span><span class="v">${rec.crankLengthMm} mm</span><span></span><span class="k">H Lenkerbreite</span><span class="v">${rec.barWidthMm ?? '–'} mm</span><span></span><span class="k">HX / HY Lenkerklemmung</span><span class="v">${su.barXMm} / ${su.barYMm} mm</span><span></span></div>
    </div>
    <div class="draw"><h3>Rahmen, die diese Position erreichen</h3>${ranking(su)}</div>`;
}
function renderAll() { renderControls(); renderOutput(); }

function onInput(e) {
  const el = e.target; if (!el.dataset || !el.dataset.k) return;
  const S = state();
  const k = el.dataset.k;
  S.fitbike[k] = el.type === 'range' ? Number(el.value) : el.value;
  const out = root.querySelector('#fb-' + k + '-out'); if (out) out.textContent = el.value + (el.dataset.unit || (k === 'crankDeg' ? ' °' : ' mm'));
  store.save();
  renderOutput();
}
function onClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  const S = state(); const body = BG.bodySegments(bodyInput());
  if (b.dataset.act === 'suggest') {
    const o = {}; if (has(S.body.gtCm)) o.gtHeightCm = S.body.gtCm; if (has(S.body.crankMm)) o.crankLengthMm = S.body.crankMm; o.barType = S.fitbike.barType;
    const cr = BG.recommendCrankLength({ inseamCm: S.body.inseamCm, gtHeightCm: S.body.gtCm, heightCm: S.body.heightCm, sex: S.body.sex });
    const s = BG.suggestSetup(rider(), o);
    if (cr) s.crankLengthMm = cr.crankLengthMm;
    const opt = BG.optimizeBars(s, body, { torsoDeg: BG.TORSO_TARGET_DEG[S.fitbike.posture] });
    Object.assign(S.fitbike, opt.setup, { barWidthMm: has(S.body.shoulderMm) ? BG.recommendBarWidth(S.body.shoulderMm) : S.fitbike.barWidthMm });
    store.save(); renderAll();
  } else if (b.dataset.act === 'saddle') {
    const o = BG.optimizeSaddleHeight(setup(), body);
    S.fitbike.saddleHeightMm = o.setup.saddleHeightMm;
    store.save(); renderAll();
  } else if (b.dataset.act === 'optimize') {
    const opt = BG.optimizeBars(setup(), body, { torsoDeg: BG.TORSO_TARGET_DEG[S.fitbike.posture] });
    Object.assign(S.fitbike, { barXMm: opt.setup.barXMm, barYMm: opt.setup.barYMm });
    store.save(); renderAll();
  } else if (b.dataset.act === 'apply') {
    const su = setup(); const an = BG.analyzeCycle(su, body); const rec = BG.setupToRecord(su);
    S.mode = 'virtual';
    S.body.saddleActualMm = rec.saddleHeightMm;
    if (!has(S.body.crankMm)) S.body.crankMm = rec.crankLengthMm;
    S.rec = { ...S.rec, ...rec };
    S.indSource = S.indSource || {};
    for (const [id, v] of Object.entries(an.indicatorValues)) { S.ind[id] = v; S.indSource[id] = 'model'; }
    store.save(); store.rerender();
    b.textContent = 'Übernommen'; setTimeout(() => { b.textContent = 'Ins Fitting übernehmen'; }, 1500);
  }
}

export function mountFitBike(el) {
  root = el;
  root.innerHTML = '<section class="panel fb-controls"></section><section class="results fb-output"></section>';
  root.addEventListener('input', onInput);
  root.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') onInput(e); });
  root.addEventListener('click', onClick);
  renderAll();
  window.addEventListener('fitbike:show', renderAll);
  store.onLoaded.push(renderAll);
}
