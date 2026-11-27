// Gobble Dash: tuning, stages and colours in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size. Distances are in metres: 50 scrolled pixels = 1 m,
// and the turkey escapes by running 1000 m from the farmyard to the woods.

export const FIELD = { width: 1280, height: 720, groundY: 640 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Pixels scrolled per metre of escape distance. */
export const PX_PER_METRE = 50;

/** Distance that wins the game: the woods at the end of the farm. */
export const ESCAPE_METRES = 1000;

export const TURKEY = {
  x: 300,
  width: 64,
  height: 56,
  jumpVelocity: -1150,
  gravity: 2500,
  slideHeight: 30,
  /** Extra scroll speed from holding right / left, in px/s. */
  nudge: 130,
};

export const LIVES = 3;

/** How far the farmer lunges forward each time the turkey stumbles. */
export const FARMER = {
  startX: -140,
  /** Caught when the farmer's reaching hand gets this close to the turkey. */
  catchGap: 46,
  lunge: 110,
  /** How fast the farmer falls back while the turkey runs clean, px/s. */
  recover: 26,
};

export const OBSTACLE = {
  hay: { width: 74, height: 66 },
  fence: { width: 48, height: 98 },
  oven: { width: 110, height: 122 },
  branch: { width: 96, height: 44, hangY: 108 },
  puddle: { width: 116, height: 14 },
  knife: { width: 26, height: 92 },
};

/** Stages of the escape: farmyard, barn, kitchen. Each stage adds hazards and speed. */
export const STAGES = [
  { name: 'Farmyard', from: 0, speed: 330, spawn: 1.05, knifeChance: 0.10 },
  { name: 'Barn', from: 300, speed: 390, spawn: 0.92, knifeChance: 0.22 },
  { name: 'Kitchen', from: 650, speed: 450, spawn: 0.80, knifeChance: 0.34 },
];

export const CORN = { size: 22, points: 10 };

/** How many falling things can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 96;

export const PALETTE = {
  skyTop: ['#7ec8f2', '#a8d8a8', '#f2c98a'],
  skyBottom: ['#e8f4fd', '#f2f7e8', '#fdeec9'],
  sun: '#ffd94d',
  hillFar: ['#8fbf7a', '#7fae6d', '#c98f4e'],
  hillNear: ['#6aa84f', '#5d9c46', '#a8763e'],
  ground: ['#7a5a34', '#6b4e2e', '#8a6a44'],
  grass: ['#5da244', '#4f9440', '#b98a3e'],
  turkeyBody: '#8a5a30',
  turkeyTail: ['#a0522d', '#d2691e', '#e8a33c', '#7a3b1e'],
  turkeyHead: '#e8e0d0',
  turkeyWattle: '#e5534b',
  turkeyBeak: '#f2a33c',
  farmerShirt: '#3b6ea5',
  farmerOveralls: '#2e4a6b',
  farmerSkin: '#e8b98a',
  farmerHat: '#c9a227',
  hay: '#e8c33c',
  hayBand: '#b98a1e',
  fence: '#8a6a44',
  oven: '#3a3f4a',
  ovenHot: '#ff7a2a',
  branch: '#5d7a3a',
  puddle: '#4a7a9e',
  knife: '#d7dce3',
  knifeHandle: '#7a4a26',
  corn: '#f2c94c',
  cornHusk: '#5da244',
  panel: 'rgba(20, 24, 32, 0.78)',
  text: '#f4f1e8',
  muted: '#c9c2b2',
  danger: '#ff5a4a',
  gold: '#ffd94d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best';
