let targetWaveColor = [80, 170, 255];

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const clearSearchBtn = document.getElementById("clearSearch");
const recentDropdown = document.getElementById("recentDropdown");
const recentList = document.getElementById("recentList");
const clearRecentBtn = document.getElementById("clearRecent");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const welcomeState = document.getElementById("welcomeState");
const weatherContent = document.getElementById("weatherContent");
const alertBanner = document.getElementById("alertBanner");
const alertText = document.getElementById("alertText");
const btnC = document.getElementById("btnC");
const btnF = document.getElementById("btnF");

//---------------------- Init -------------------
function init() {
  generateParticles();
}

// ----------------------- Background System ---------------------
const BG_THEMES = {
  sunny: ["#FF9612", "#FFB343", "#FFD77C", "#FFF3C3"],
  clear: ["#5ab3e8", "#3a8fc8", "#1e6aaa", "#0d3e7a"],
  cloudy: ["#6a86aa", "#4a6688", "#2c4a6e", "#162a44"],
  rainy: ["#2e4e72", "#1e3454", "#122038", "#080e1c"],
  snowy: ["#5B7C99", "#799EB9", "#A0C4D9", "#B9D6E6"],
  stormy: ["#040811", "#0C1623", "#0C1623", "#040810"],
  foggy: ["#607080", "#485a6a", "#323e4c", "#1e2830"],
  night: ["#0a1426", "#061020", "#040c18", "#020810"],
};

const WAVE_COLORS = {
  sunny: [225, 180, 100],
  clear: [80, 170, 255],
  cloudy: [76, 104, 140],
  rainy: [76, 104, 140],
  snowy: [80, 130, 190],
  stormy: [80, 72, 122],
  foggy: [76, 104, 140],
  night: [55, 85, 178],
};
function setBackground(owmId, isDay) {
  const bg = document.getElementById("bgGradient");
  const sun = document.getElementById("sunOrb");
  const clouds = document.querySelectorAll(".cloud");
  const rainWrap = document.getElementById("rainWrap");
  const snowWrap = document.getElementById("snowWrap");
  const starsWrap = document.getElementById("starsWrap");
  const lightning = document.getElementById("lightningWrap");

  sun.style.opacity = "0";
  rainWrap.style.opacity = "0";
  snowWrap.style.opacity = "0";
  starsWrap.style.opacity = "0";
  clouds.forEach((c) => {
    c.style.opacity = "0";
    c.style.filter = "blur(24px)";
  });

  lightning.style.animation = "none";
  lightning.style.opacity = "0";

  const grp = owmGroup(owmId);
  let colors;

  if (!isDay) {
    colors = BG_THEMES.night;
    starsWrap.style.opacity = "0.7";
    targetWaveColor = WAVE_COLORS.night;
    if (grp === "rainy" || grp === "stormy") {
      colors = ["#0e1826", "#080e18", "#040a10", "#020608"];
      clouds.forEach((c) => (c.style.opacity = "0.5"));
      rainWrap.style.opacity = "1";
      targetWaveColor = WAVE_COLORS.rainy;
    }
  } else {
    switch (grp) {
      case "sunny":
        colors = BG_THEMES.sunny;
        sun.style.opacity = "1";
        break;
      case "clear":
        colors = BG_THEMES.clear;
        sun.style.opacity = "0.45";
        break;
      case "cloudy":
        colors = BG_THEMES.cloudy;
        clouds.forEach((c) => (c.style.opacity = "1"));
        break;
      case "foggy":
        colors = BG_THEMES.foggy;
        clouds.forEach((c) => {
          c.style.opacity = "0.9";
          c.style.filter = "blur(44px)";
        });
        break;
      case "rainy":
        colors = BG_THEMES.rainy;
        clouds[0].style.opacity = clouds[1].style.opacity = "0.7";
        rainWrap.style.opacity = "1";
        break;
      case "snowy":
        colors = BG_THEMES.snowy;
        clouds[0].style.opacity = "0.5";
        snowWrap.style.opacity = "1";
        break;
      case "stormy":
        colors = BG_THEMES.stormy;
        clouds.forEach((c) => (c.style.opacity = "0.6"));
        rainWrap.style.opacity = "1";
        // Only enable lightning for actual thunderstorms
        lightning.style.animation = "lightning 8s ease-in-out infinite";
        break;
      default:
        colors = BG_THEMES.clear;
        sun.style.opacity = "0.4";
    }
  }

  bg.style.background = `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 30%, ${colors[2]} 65%, ${colors[3]} 100%)`;
  // ← add this block right here
  targetWaveColor = WAVE_COLORS[grp] ?? WAVE_COLORS.clear;
}

function owmGroup(id) {
  if (id === 800) return "sunny"; // clear sky
  if (id >= 801 && id <= 804) return "cloudy"; // clouds
  if (id >= 700 && id <= 799) return "foggy"; // atmosphere (fog, haze, mist)
  if (id >= 600 && id <= 699) return "snowy"; // snow
  if (id >= 500 && id <= 599) return "rainy"; // rain
  if (id >= 300 && id <= 399) return "rainy"; // drizzle
  if (id >= 200 && id <= 299) return "stormy"; // thunderstorm
  return "clear";
}

// Own Emoji map
function owmEmoji(id, isDay) {
  if (id >= 200 && id <= 299) return "⛈️";
  if (id >= 300 && id <= 399) return "🌦️";
  if (id >= 500 && id <= 504) return isDay ? "🌧️" : "🌧️";
  if (id === 511) return "🌨️";
  if (id >= 520 && id <= 531) return "🌧️";
  if (id >= 600 && id <= 622) return "❄️";
  if (id >= 700 && id <= 799) return "🌫️";
  if (id === 800) return isDay ? "☀️" : "🌙";
  if (id === 801) return isDay ? "🌤️" : "🌤️";
  if (id === 802) return "⛅";
  if (id >= 803 && id <= 804) return "☁️";
  return isDay ? "🌤️" : "🌙";
}

//----------------- Particals (rain, snow, starts ) ----------------
function generateParticles() {
  if (!rainWrap.children.length) {
    for (let i = 0; i < 160; i++) {
      const drop = document.createElement("div");
      drop.className = "raindrop";
      const height = 18 + Math.random() * 38; // 18–56 px tall
      drop.style.cssText = `
        height: ${height}px;
        left: ${Math.random() * 100}%;
        animation-duration: ${0.5 + Math.random() * 0.7}s;
        animation-delay: ${-(Math.random() * 1.2)}s;
      `;
      rainWrap.appendChild(drop);
    }
  }

  // ── Populate snowflakes once ────────────────────────────────────
  if (!snowWrap.children.length) {
    for (let i = 0; i < 70; i++) {
      const flake = document.createElement("div");
      flake.className = "snowflake";
      flake.textContent = ["❅", "❆", "*"][Math.floor(Math.random() * 3)];
      const size = 8 + Math.random() * 14; // 8–22 px
      flake.style.cssText = `
        font-size: ${size}px;
        left: ${Math.random() * 100}%;
        animation-duration: ${4 + Math.random() * 6}s;
        animation-delay: ${-(Math.random() * 8)}s;
      `;
      snowWrap.appendChild(flake);
    }
  }

  // ── Populate stars once ─────────────────────────────────────────
  if (!starsWrap.children.length) {
    for (let i = 0; i < 140; i++) {
      const star = document.createElement("div");
      star.className = "star";
      const size = 1 + Math.random() * 2.5; // 1–3.5 px
      star.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        top: ${Math.random() * 80}%;
        left: ${Math.random() * 100}%;
        animation-duration: ${2 + Math.random() * 4}s;
        animation-delay: ${-(Math.random() * 4)}s;
      `;
      starsWrap.appendChild(star);
    }
  }
}

// Start --------------
document.addEventListener("DOMContentLoaded", init);

/* Wave canvas */
const canvas = document.getElementById("waveCanvas");
const ctx = canvas.getContext("2d");

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

/* ── Wave definitions ────────────────────────────────────────────
   baseY  : vertical position as fraction of screen height (0–1)
   amp    : peak height in pixels
   freq   : spatial frequency (lower = wider waves)
   speed  : how fast phase increments each frame
   alpha  : opacity (lower waves are more transparent)
────────────────────────────────────────────────────────────────── */
const waves = [
  {
    baseY: 0.72,
    amp: 34,
    freq: 0.0068,
    speed: 0.0009,
    phase: 0.0,
    alpha: 0.14,
  },
  {
    baseY: 0.78,
    amp: 25,
    freq: 0.0092,
    speed: 0.0015,
    phase: 1.9,
    alpha: 0.11,
  },
  {
    baseY: 0.83,
    amp: 18,
    freq: 0.0115,
    speed: 0.0021,
    phase: 3.4,
    alpha: 0.09,
  },
  { baseY: 0.88, amp: 11, freq: 0.0148, speed: 0.003, phase: 5.1, alpha: 0.07 },
];

/* ── Change this colour to match your background theme ─────────── */
const WAVE_COLOR = [80, 170, 255]; // [r, g, b]

function rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}

function drawWaves() {
  WAVE_COLOR[0] += (targetWaveColor[0] - WAVE_COLOR[0]) * 0.03;
  WAVE_COLOR[1] += (targetWaveColor[1] - WAVE_COLOR[1]) * 0.03;
  WAVE_COLOR[2] += (targetWaveColor[2] - WAVE_COLOR[2]) * 0.03;
  ctx.clearRect(0, 0, W, H);

  waves.forEach((w) => {
    /* 1. advance the phase → makes the wave scroll horizontally */
    w.phase += w.speed;

    /* 2. start the shape path from bottom-left */
    ctx.beginPath();
    ctx.moveTo(0, H);

    /* 3. plot the wave surface pixel by pixel (step 3px for perf) */
    for (let x = 0; x <= W; x += 3) {
      const y =
        w.baseY * H +
        Math.sin(x * w.freq + w.phase) * w.amp + // primary sine
        Math.sin(x * w.freq * 1.65 + w.phase * 0.78) * // harmonic sine
          w.amp *
          0.38; // at 38% strength
      ctx.lineTo(x, y);
    }

    /* 4. close the shape down to bottom-right, then bottom-left */
    ctx.lineTo(W, H);
    ctx.closePath();

    /* 5. fill with a semi-transparent colour */
    ctx.fillStyle = rgba(...WAVE_COLOR, w.alpha);
    ctx.fill();
  });

  requestAnimationFrame(drawWaves);
}

drawWaves();

// ── TEST — remove this line when you wire up the real API ───────
// Change first arg to any OWM condition ID, second to true/false
setBackground(800, true); // 800 day = sunny blue sky + sun
// setBackground(500, false); // 500 night = dark rainy
// setBackground(200, true); // 200 day = thunderstorm
// setBackground(600, true); // 600 night = snow
// setBackground(804, false); // 804 night = cloudy night
