/* ─── Room geometry ─────────────────────────────────────────────────────── */
const RW = 24;    // room width  (x)
const RH = 5.2;   // room height (y)
const RD = 20;    // room depth  (z)
const FLOOR_STEP = 6.0;   // vertical spacing between floors
const WT = 0.28;  // wall thickness
const DOOR_W = 3.2;   // staircase opening width
const DOOR_H = 4.0;   // staircase opening height

/* ─── Painting ──────────────────────────────────────────────────────────── */
const PH = 2.1;   // fixed painting height; width is computed from aspect ratio
const PY = 2.55;  // painting centre height
const FT = 0.13;  // frame border thickness

/* ─── Navigation ────────────────────────────────────────────────────────── */
const STAIR_RADIUS = 4;     // proximity radius for stair E-key trigger

/* ─── Shared mutable refs (written by main.js, read by ui.js) ───────────── */
let _camera = null;
let _paintIdx = 0;
