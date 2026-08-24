// util.js — shared helpers + seeded RNG (map is rebuilt deterministically from seed)
"use strict";

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Non-seeded randomness for gameplay rolls
const rand = Math.random;
function randInt(a, b) { return a + Math.floor(rand() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
function chance(p) { return rand() < p; }
let _uid = 1;
function uid() { return _uid++; }
