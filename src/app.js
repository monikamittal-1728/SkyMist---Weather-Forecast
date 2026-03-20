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
  sunny:  ["#FF9612", "#FFB343", "#FFD77C", "#FFF3C3"],
  clear:  ["#5ab3e8", "#3a8fc8", "#1e6aaa", "#0d3e7a"],
  cloudy: ["#6a86aa", "#4a6688", "#2c4a6e", "#162a44"],
  rainy:  ["#2e4e72", "#1e3454", "#122038", "#080e1c"],
  snowy:  ["#5B7C99", "#799EB9", "#A0C4D9", "#B9D6E6"],
  stormy: ["#040811", "#0C1623", "#0C1623", "#040810"],
  foggy:  ["#607080", "#485a6a", "#323e4c", "#1e2830"],
  night:  ["#0a1426", "#061020", "#040c18", "#020810"],
};

const WAVE_COLORS = {
  sunny:  [225, 180, 100],
  clear:  [80,  170, 255],
  cloudy: [76,  104, 140],
  rainy:  [76,  104, 140],
  snowy:  [80,  130, 190],
  stormy: [80,   72, 122],
  foggy:  [76,  104, 140],
  night:  [55,   85, 178],
};

// Night variants that get unique theme classes and particle overrides
const NIGHT_VARIANTS = ["rainy", "stormy", "snowy", "cloudy"];

function setBackground(owmId, isDay) {
  // ── FIX 1: removed hardcoded `isDay = true` that was here ──

  const bg        = document.getElementById("bgGradient");
  const sun       = document.getElementById("sunOrb");
  const clouds    = document.querySelectorAll(".cloud");
  const rainWrap  = document.getElementById("rainWrap");
  const snowWrap  = document.getElementById("snowWrap");
  const starsWrap = document.getElementById("starsWrap");
  const lightning = document.getElementById("lightningWrap");

  // Reset all effects
  sun.style.opacity         = "0";
  rainWrap.style.opacity    = "0";
  snowWrap.style.opacity    = "0";
  starsWrap.style.opacity   = "0";
  lightning.style.animation = "none";
  lightning.style.opacity   = "0";
  clouds.forEach((c) => {
    c.style.opacity = "0";
    c.style.filter  = "blur(24px)";
  });

  const grp = owmGroup(owmId);
  let colors;

  if (!isDay) {
    // ── Base night sky ──
    colors = BG_THEMES.night;
    starsWrap.style.opacity = "0.7";
    targetWaveColor = WAVE_COLORS.night;

    // ── FIX 2: handle all night variants, not just rainy/stormy ──
    if (grp === "rainy" || grp === "stormy") {
      colors = ["#0e1826", "#080e18", "#040a10", "#020608"];
      clouds.forEach((c) => (c.style.opacity = "0.5"));
      rainWrap.style.opacity  = "1";
      starsWrap.style.opacity = "0.2"; // clouds dim the stars
      targetWaveColor = WAVE_COLORS.rainy;
      if (grp === "stormy") {
        lightning.style.animation = "lightning 8s ease-in-out infinite";
        targetWaveColor = WAVE_COLORS.stormy;
      }
    } else if (grp === "snowy") {
      clouds[0].style.opacity = "0.4";
      snowWrap.style.opacity  = "1";
      starsWrap.style.opacity = "0.3"; // snow dims stars
      targetWaveColor = WAVE_COLORS.snowy;
    } else if (grp === "cloudy") {
      clouds.forEach((c) => (c.style.opacity = "0.4"));
      starsWrap.style.opacity = "0.2"; // clouds block stars
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
          c.style.filter  = "blur(44px)";
        });
        break;
      case "rainy":
        colors = BG_THEMES.rainy;
        clouds[0].style.opacity = clouds[1].style.opacity = "0.7";
        rainWrap.style.opacity  = "1";
        break;
      case "snowy":
        colors = BG_THEMES.snowy;
        clouds[0].style.opacity = "0.5";
        snowWrap.style.opacity  = "1";
        break;
      case "stormy":
        colors = BG_THEMES.stormy;
        clouds.forEach((c) => (c.style.opacity = "0.6"));
        rainWrap.style.opacity    = "1";
        lightning.style.animation = "lightning 8s ease-in-out infinite";
        break;
      default:
        colors = BG_THEMES.clear;
        sun.style.opacity = "0.4";
    }
  }

  // Apply background gradient
  bg.style.background = `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 30%, ${colors[2]} 65%, ${colors[3]} 100%)`;

  // ── FIX 3: correct theme class for all night variants ──
  document.body.className = document.body.className.replace(/theme-\S+/g, "").trim();
  if (isDay) {
    document.body.classList.add(`theme-${grp}`);
  } else {
    const suffix = NIGHT_VARIANTS.includes(grp) ? `-${grp}` : "";
    document.body.classList.add(`theme-night${suffix}`);
  }

  // Apply wave color (day uses grp color, night uses night unless overridden above)
  if (isDay) {
    targetWaveColor = WAVE_COLORS[grp] ?? WAVE_COLORS.clear;
  }
  // (night targetWaveColor is already set inside the !isDay block above)
}

function owmGroup(id) {
  if (id === 800)                    return "sunny";   // clear sky
  if (id >= 801 && id <= 804)        return "cloudy";  // clouds
  if (id >= 700 && id <= 799)        return "foggy";   // atmosphere (fog, haze, mist)
  if (id >= 600 && id <= 699)        return "snowy";   // snow
  if (id >= 500 && id <= 599)        return "rainy";   // rain
  if (id >= 300 && id <= 399)        return "rainy";   // drizzle
  if (id >= 200 && id <= 299)        return "stormy";  // thunderstorm
  return "clear";
}

// Own Emoji map
function owmEmoji(id, isDay) {
  if (id >= 200 && id <= 299) return "⛈️";
  if (id >= 300 && id <= 399) return "🌦️";
  if (id >= 500 && id <= 504) return "🌧️";
  if (id === 511)             return "🌨️";
  if (id >= 520 && id <= 531) return "🌧️";
  if (id >= 600 && id <= 622) return "❄️";
  if (id >= 700 && id <= 799) return "🌫️";
  if (id === 800)             return isDay ? "☀️" : "🌙";
  if (id === 801)             return isDay ? "🌤️" : "🌤️";
  if (id === 802)             return "⛅";
  if (id >= 803 && id <= 804) return "☁️";
  return isDay ? "🌤️" : "🌙";
}

//----------------- Particles (rain, snow, stars) ----------------
function generateParticles() {
  const rainWrap  = document.getElementById("rainWrap");
  const snowWrap  = document.getElementById("snowWrap");
  const starsWrap = document.getElementById("starsWrap");

  if (!rainWrap.children.length) {
    for (let i = 0; i < 160; i++) {
      const drop = document.createElement("div");
      drop.className = "raindrop";
      const height = 18 + Math.random() * 38;
      drop.style.cssText = `
        height: ${height}px;
        left: ${Math.random() * 100}%;
        animation-duration: ${0.5 + Math.random() * 0.7}s;
        animation-delay: ${-(Math.random() * 1.2)}s;
      `;
      rainWrap.appendChild(drop);
    }
  }

  if (!snowWrap.children.length) {
    for (let i = 0; i < 70; i++) {
      const flake = document.createElement("div");
      flake.className = "snowflake";
      flake.textContent = ["❅", "❆", "*"][Math.floor(Math.random() * 3)];
      const size = 8 + Math.random() * 14;
      flake.style.cssText = `
        font-size: ${size}px;
        left: ${Math.random() * 100}%;
        animation-duration: ${4 + Math.random() * 6}s;
        animation-delay: ${-(Math.random() * 8)}s;
      `;
      snowWrap.appendChild(flake);
    }
  }

  if (!starsWrap.children.length) {
    for (let i = 0; i < 140; i++) {
      const star = document.createElement("div");
      star.className = "star";
      const size = 1 + Math.random() * 2.5;
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

// Start
document.addEventListener("DOMContentLoaded", init);

/* ── Wave canvas ─────────────────────────────────────────────── */
const canvas = document.getElementById("waveCanvas");
const ctx = canvas.getContext("2d");

let W, H;
function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

const waves = [
  { baseY: 0.72, amp: 34, freq: 0.0068, speed: 0.0009, phase: 0.0, alpha: 0.14 },
  { baseY: 0.78, amp: 25, freq: 0.0092, speed: 0.0015, phase: 1.9, alpha: 0.11 },
  { baseY: 0.83, amp: 18, freq: 0.0115, speed: 0.0021, phase: 3.4, alpha: 0.09 },
  { baseY: 0.88, amp: 11, freq: 0.0148, speed: 0.003,  phase: 5.1, alpha: 0.07 },
];

const WAVE_COLOR = [80, 170, 255];

function rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}

function drawWaves() {
  WAVE_COLOR[0] += (targetWaveColor[0] - WAVE_COLOR[0]) * 0.03;
  WAVE_COLOR[1] += (targetWaveColor[1] - WAVE_COLOR[1]) * 0.03;
  WAVE_COLOR[2] += (targetWaveColor[2] - WAVE_COLOR[2]) * 0.03;
  ctx.clearRect(0, 0, W, H);

  waves.forEach((w) => {
    w.phase += w.speed;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 3) {
      const y =
        w.baseY * H +
        Math.sin(x * w.freq + w.phase) * w.amp +
        Math.sin(x * w.freq * 1.65 + w.phase * 0.78) * w.amp * 0.38;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = rgba(...WAVE_COLOR, w.alpha);
    ctx.fill();
  });

  requestAnimationFrame(drawWaves);
}

drawWaves();

// ── Single test call — swap this one line to test any condition ──
// DAY (7)
setBackground(800, true);  // sunny
// setBackground(804, true);  // cloudy
// setBackground(741, true);  // foggy
// setBackground(601, true);  // snowy
// setBackground(501, true);  // rainy
// setBackground(200, true);  // stormy
// setBackground(801, true);  // clear (fallback)

// NIGHT (7)
// setBackground(800, false); // night clear
// setBackground(804, false); // night cloudy
// setBackground(601, false); // night snowy
// setBackground(501, false); // night rainy
// setBackground(200, false); // night stormy
// setBackground(741, false); // night foggy
// setBackground(801, false); // night clear