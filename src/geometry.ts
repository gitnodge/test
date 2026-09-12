import type { Point } from './types.js';

export const DEG = Math.PI / 180;

export function polar(lengthMm: number, angleDeg: number): Point {
  return { x: lengthMm * Math.cos(angleDeg * DEG), y: lengthMm * Math.sin(angleDeg * DEG) };
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function length(p: Point): number {
  return Math.hypot(p.x, p.y);
}

export function round(p: Point, digits = 1): Point {
  const f = 10 ** digits;
  return { x: Math.round(p.x * f) / f, y: Math.round(p.y * f) / f };
}

/**
 * Position der Sattelmitte bei gegebener Sattelhöhe und Sitzwinkel.
 * Sitzwinkel wird von der Horizontalen nach hinten gemessen (73° = Sattel liegt hinter dem Tretlager).
 */
export function saddlePosition(saddleHeightMm: number, seatAngleDeg: number): Point {
  return { x: -saddleHeightMm * Math.cos(seatAngleDeg * DEG), y: saddleHeightMm * Math.sin(seatAngleDeg * DEG) };
}
