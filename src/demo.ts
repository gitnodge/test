import { readFileSync } from 'node:fs';
import { computeFitTargets, rankFrames } from './index.js';
import type { FrameGeometry, RiderProfile } from './types.js';

const frames = JSON.parse(readFileSync(new URL('./data/frames.example.json', import.meta.url), 'utf8')) as FrameGeometry[];

const rider: RiderProfile = {
  measurements: { heightMm: 1780, inseamMm: 840 },
  flexibility: 'medium',
  posture: 'balanced',
  discipline: 'road-race',
};

const t = computeFitTargets(rider);
console.log('Zielpositionen (relativ zum Tretlager, mm):');
console.log(`  Sattelhöhe ${t.saddleHeightMm.toFixed(0)}  Sattel (${t.saddle.x.toFixed(0)}, ${t.saddle.y.toFixed(0)})`);
console.log(`  Lenker (${t.bar.x.toFixed(0)}, ${t.bar.y.toFixed(0)})  Drop ${t.saddleToBarDropMm.toFixed(0)}  Reach Sattel→Lenker ${t.saddleToBarReachMm.toFixed(0)}`);
console.log('');

for (const m of rankFrames(rider, frames)) {
  const c = m.cockpit;
  console.log(`${String(m.score).padStart(3)}  ${m.frame.model} ${m.frame.size}  Vorbau ${c.stemLengthMm} mm/${c.stemAngleDeg}°, Spacer ${c.spacersMm} mm, Δ(${m.barDelta.x}, ${m.barDelta.y}), Versatz ${m.saddleSetbackMm} mm`);
  for (const n of m.notes) console.log(`       [${n.severity}] ${n.message}`);
}
