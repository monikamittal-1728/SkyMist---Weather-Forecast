
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const clearSearchBtn = document.getElementById('clearSearch');
const recentDropdown = document.getElementById('recentDropdown');
const recentList  = document.getElementById('recentList');
const clearRecentBtn = document.getElementById('clearRecent');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const welcomeState = document.getElementById('welcomeState');
const weatherContent = document.getElementById('weatherContent');
const alertBanner = document.getElementById('alertBanner');
const alertText = document.getElementById('alertText');
const btnC = document.getElementById('btnC');
const btnF = document.getElementById('btnF');

//---------------------- Init -------------------
function init() {
  generateParticles();
}

// ----------------------- Background System ---------------------
const BG_THEMES = {
  sunny: ['#87ceeb','#5ab3e8','#2e88cc','#0d5294'],
  clear: ['#5ab3e8','#3a8fc8','#1e6aaa','#0d3e7a'],
  cloudy: ['#6a86aa','#4a6688','#2c4a6e','#162a44'],
  rainy: ['#2e4e72','#1e3454','#122038','#080e1c'],
  snowy: ['#8abedd','#6298ba','#3e7298','#1e4a6e'],
  stormy: ['#1c2838','#111c28','#0a1018','#040810'],
  foggy: ['#607080','#485a6a','#323e4c','#1e2830'],
  night: ['#0a1426','#061020','#040c18','#020810'],
};

function setBackground(owmId, isDay) {
  const bg = document.getElementById('bgGradient');
  const sun = document.getElementById('sunOrb');
  const clouds = document.querySelectorAll('.cloud');
  const rainWrap = document.getElementById('rainWrap');
  const snowWrap = document.getElementById('snowWrap');
  const starsWrap = document.getElementById('starsWrap');
  const lightning = document.getElementById('lightningWrap');

  sun.style.opacity       = '0';
  rainWrap.style.opacity  = '0';
  snowWrap.style.opacity  = '0';
  starsWrap.style.opacity = '0';
  clouds.forEach(c => { c.style.opacity = '0'; c.style.filter = 'blur(24px)'; });

  lightning.style.animation = 'none';
  lightning.style.opacity   = '0';

  const grp = owmGroup(owmId);
  let colors;

  if (!isDay) {
    colors = BG_THEMES.night;
    starsWrap.style.opacity = '0.7';
    if (grp === 'rainy' || grp === 'stormy') {
      colors = ['#0e1826','#080e18','#040a10','#020608'];
      clouds.forEach(c => c.style.opacity = '0.5');
      rainWrap.style.opacity = '1';
    }
  } else {
    switch (grp) {
      case 'sunny':
        colors = BG_THEMES.sunny;
        sun.style.opacity = '1';
        break;
      case 'clear':
        colors = BG_THEMES.clear;
        sun.style.opacity = '0.45';
        break;
      case 'cloudy':
        colors = BG_THEMES.cloudy;
        clouds.forEach(c => c.style.opacity = '1');
        break;
      case 'foggy':
        colors = BG_THEMES.foggy;
        clouds.forEach(c => { c.style.opacity = '0.9'; c.style.filter = 'blur(44px)'; });
        break;
      case 'rainy':
        colors = BG_THEMES.rainy;
        clouds[0].style.opacity = clouds[1].style.opacity = '0.7';
        rainWrap.style.opacity = '1';
        break;
      case 'snowy':
        colors = BG_THEMES.snowy;
        clouds[0].style.opacity = '0.5';
        snowWrap.style.opacity = '1';
        break;
      case 'stormy':
        colors = BG_THEMES.stormy;
        clouds.forEach(c => c.style.opacity = '0.6');
        rainWrap.style.opacity = '1';
        // Only enable lightning for actual thunderstorms
        lightning.style.animation = 'lightning 8s ease-in-out infinite';
        break;
      default:
        colors = BG_THEMES.clear;
        sun.style.opacity = '0.4';
    }
  }

  bg.style.background = `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 30%, ${colors[2]} 65%, ${colors[3]} 100%)`;
}

function owmGroup(id) {
  if (id === 800) return 'sunny';          // clear sky
  if (id >= 801 && id <= 804) return 'cloudy';   // clouds
  if (id >= 700 && id <= 799) return 'foggy';    // atmosphere (fog, haze, mist)
  if (id >= 600 && id <= 699) return 'snowy';    // snow
  if (id >= 500 && id <= 599) return 'rainy';    // rain
  if (id >= 300 && id <= 399) return 'rainy';    // drizzle
  if (id >= 200 && id <= 299) return 'stormy';   // thunderstorm
  return 'clear';
}

// Own Emoji map
function owmEmoji(id, isDay) {
  if (id >= 200 && id <= 299) return '⛈️';
  if (id >= 300 && id <= 399) return '🌦️';
  if (id >= 500 && id <= 504) return isDay ? '🌧️' : '🌧️';
  if (id === 511) return '🌨️';
  if (id >= 520 && id <= 531) return '🌧️';
  if (id >= 600 && id <= 622) return '❄️';
  if (id >= 700 && id <= 799) return '🌫️';
  if (id === 800) return isDay ? '☀️' : '🌙';
  if (id === 801) return isDay ? '🌤️' : '🌤️';
  if (id === 802) return '⛅';
  if (id >= 803 && id <= 804) return '☁️';
  return isDay ? '🌤️' : '🌙';
}

//----------------- Particals (rain, snow, starts ) ----------------
function generateParticles() {
      if (!rainWrap.children.length) {
    for (let i = 0; i < 160; i++) {
      const drop = document.createElement('div');
      drop.className = 'raindrop';
      const height = 18 + Math.random() * 38;        // 18–56 px tall
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
      const flake = document.createElement('div');
      flake.className = 'snowflake';
      flake.textContent = ['❅','❆','*'][Math.floor(Math.random()*3)];;
      const size = 8 + Math.random() * 14;            // 8–22 px
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
      const star = document.createElement('div');
      star.className = 'star';
      const size = 1 + Math.random() * 2.5;           // 1–3.5 px
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
document.addEventListener('DOMContentLoaded', init);

  // ── TEST — remove this line when you wire up the real API ───────
  // Change first arg to any OWM condition ID, second to true/false
  setBackground(800, true);   // 800 day = sunny blue sky + sun
//   setBackground(500, false);  // 500 night = dark rainy
//   setBackground(200, true);   // 200 day = thunderstorm
//   setBackground(600, true);  // 600 night = snow
//   setBackground(804, false);  // 804 night = cloudy night