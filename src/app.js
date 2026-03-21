// ─────────────────────────────────────────────────────────────
//  SHARED CONFIG
// ─────────────────────────────────────────────────────────────
const KEY = "bdd2f8833eb726760a9d52d4c02475f3";
const BASE = "https://api.openweathermap.org/data/2.5";

// ─────────────────────────────────────────────────────────────
//  STATES
// ─────────────────────────────────────────────────────────────
let currentTemp = null;
let highTemp = null;
let lowTemp = null;
let feelsTemp = null;
let currentUnit = "C";
let cityClockInterval = null;
const RECENT_KEY = "skyMist_recent_city";

// ─────────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  generateParticles();
  setBackground(800, true); // sunny default until real data loads
});

// ─────────────────────────────────────────────────────────────
//  GEOLOCATION
// ─────────────────────────────────────────────────────────────
function myLocation() {
  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by your browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => createLatLngUrl(pos.coords.latitude, pos.coords.longitude),
    () =>
      showToast(
        "Location access denied. Please allow location permissions and try again.",
      ),
  );
}

function createLatLngUrl(lat, lng) {
  fetchWeatherDetails(
    `${BASE}/weather?lat=${lat}&lon=${lng}&appid=${KEY}&units=metric`,
    `${BASE}/forecast?lat=${lat}&lon=${lng}&appid=${KEY}&units=metric`,
  );
}

// ─────────────────────────────────────────────────────────────
//  FETCH
// ─────────────────────────────────────────────────────────────
function fetchWeatherDetails(weatherUrl, forecastUrl) {
  showLoader();
  Promise.all([fetch(weatherUrl), fetch(forecastUrl)])
    .then((responses) => Promise.all(responses.map((r) => r.json())))
    .then(([wd, fd]) => {
      if (wd.cod != 200) throw new Error(wd.message);
      if (fd.cod != 200) throw new Error(fd.message);
      hideLoader();
      displayWeatherDetails(wd, fd);
    })
    .catch((err) => {
      hideLoader();
      showToast(err.message || "Could not get weather.");
    });
}

// ─────────────────────────────────────────────────────────────
//  DISPLAY
// ─────────────────────────────────────────────────────────────
function displayWeatherDetails(wd, fd) {
  const isDay = wd.dt > wd.sys.sunrise && wd.dt < wd.sys.sunset;

  // search box
  document.getElementById("searchInput").value = wd.name;

  // recent
  addRecentCity(wd.name); //TODo
  // renderRecentDropdown();

  // city + country
  const parts = wd.name.split(" "),
    last = parts.pop();
  document.getElementById("city").innerHTML =
    (parts.length ? parts.join(" ") + " " : "") +
    `<em class="text-[var(--ac)]">${last}</em>`;
  document.getElementById("country").innerText = wd.sys.country;

  // date clock (live ticking, city timezone)
  startCityClock(wd.timezone);

  // condition
  document.getElementById("condIcon").textContent = owmEmoji(
    wd.weather[0].id,
    isDay,
  );
  document.getElementById("condName").textContent =
    wd.weather[0].description.replace(/\b\w/g, (c) => c.toUpperCase());

  // background + theme
  setBackground(wd.weather[0].id, isDay);

  // temperatures
  renderTemps(wd, fd);

  // stats
  document.getElementById("wH").textContent = wd.main.humidity + "%";
  document.getElementById("wW").textContent =
    (wd.wind.speed * 3.6).toFixed(1) + " km/h";
  document.getElementById("wV").textContent = wd.visibility
    ? (wd.visibility / 1000).toFixed(1) + " km"
    : "—";
  document.getElementById("wP").textContent = wd.main.pressure + " hPa";

  // forecasts
  renderForecast(fd);
  renderHourly(fd, wd.timezone);
}

// ─────────────────────────────────────────────────────────────
//  HOURLY FORECAST
// ─────────────────────────────────────────────────────────────
function renderHourly(fd, tzOffsetSec) {
  const container = document.getElementById("hourly-scroll");
  container.innerHTML = "";

  const utcMs = Date.now() + new Date().getTimezoneOffset() * 60000;
  const nowSec = Math.floor((utcMs + tzOffsetSec * 1000) / 1000);

  // show next 12 slots (3h each = 36h)
  fd.list.slice(0, 8).forEach((slot) => {
    const slotDate = new Date(
      utcMs + tzOffsetSec * 1000 - Date.now() + slot.dt * 1000,
    );
    const isNow = Math.abs(slot.dt - nowSec) < 5400; // within 1.5h

    const time = new Date(slot.dt * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC", // we manually shift so use UTC display
    });

    // shift display time to city tz
    const citySlotDate = new Date(slot.dt * 1000 + tzOffsetSec * 1000);
    const displayTime = citySlotDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
      timeZone: "UTC",
    });

    const isDay = slot.sys?.pod === "d";
    const temp =
      currentUnit === "C"
        ? Math.round(slot.main.temp)
        : Math.round((slot.main.temp * 9) / 5 + 32);

    const card = document.createElement("div");
    card.className = `hour-card${isNow ? " now" : ""}`;
    card.innerHTML = `
      <div class="hour-time">${isNow ? "Now" : displayTime}</div>
      <div class="hour-icon">${owmEmoji(slot.weather[0].id, slot.sys?.pod === "d")}</div>
      <div class="hour-temp">${temp}°</div>
    `;
    container.appendChild(card);
  });
}

// // ─────────────────────────────────────────────────────────────
// //  5-DAY FORECAST
// // ─────────────────────────────────────────────────────────────
function renderForecast(fd) {
  const grid = document.getElementById("fcGrid");

  // api returns 40 entries (every 3hr)
  // we pick the best entry per day — prefer noon (12:00:00)
  const dailyMap = {};

  fd.list.forEach((item) => {
    const date = item.dt_txt.split(" ")[0]; // "2026-03-12"
    const hour = item.dt_txt.split(" ")[1]; // "12:00:00"

    // save first entry of the day, overwrite if noon entry found
    if (!dailyMap[date] || hour === "12:00:00") {
      dailyMap[date] = item;
    }
  });

  // convert object to array and take only 5 days
  const days = Object.values(dailyMap).slice(1, 6);

  grid.innerHTML = days
    .map((day) => {
      // dt is unix timestamp in seconds — JS needs milliseconds so × 1000
      const date = new Date(day.dt * 1000);

      // format day name: "Wed"
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

      // format date string: "12 Mar"
      const dateStr = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      });

      // get weather emoji
      const emoji = owmEmoji(day.weather[0].id, true);
      // capitalize each word of description
      const desc = day.weather[0].description.replace(/\b\w/g, (c) =>
        c.toUpperCase(),
      );

      const tempMax = Math.round(day.main.temp_max);
      const humidity = day.main.humidity;
      const wind = (day.wind.speed * 3.6).toFixed(1);

      return `
        <div class="fc-card">
          <div class="fc-day">${dayName} ${dateStr}</div>
          <div class="fc-icon">${emoji}</div>
          <div class="fc-max">${tempMax}° C</div>
          <div class="fc-desc">${desc}</div>
          <div class="fc-divider"></div>
          <div class="fc-stats">
            <span>💧 ${humidity}%</span>
            <span>💨 ${wind} km/h</span>
          </div>
        </div>
      `;
    })
    .join("");
}


// ─────────────────────────────────────────────────────────────
//  TEMPERATURES
// ─────────────────────────────────────────────────────────────
function renderTemps(wd, fd) {
  // store raw °C values
  currentTemp = Math.round(wd.main.temp);
  feelsTemp = Math.round(wd.main.feels_like);

  // today's hi/lo from forecast slots that match today's date
  const todaySlots = fd.list.filter((s) => {
    const d = new Date(s.dt * 1000),
      now = new Date();
    return d.getDate() === now.getDate();
  });
  highTemp = Math.round(
    todaySlots.length
      ? Math.max(...todaySlots.map((s) => s.main.temp_max))
      : wd.main.temp_max,
  );
  lowTemp = Math.round(
    todaySlots.length
      ? Math.min(...todaySlots.map((s) => s.main.temp_min))
      : wd.main.temp_min,
  );

  checkAlert(currentTemp);
  updateTempDisplay();
}

function updateTempDisplay() {
  if (currentTemp === null) return;
  const conv = (v) =>
    currentUnit === "C" ? Math.round(v) : Math.round((v * 9) / 5 + 32);
  const unit = `°${currentUnit}`;

  document.getElementById("tempDisplay").textContent = `${conv(currentTemp)}°`;
  document.getElementById("tempHiLow").textContent =
    `H:${conv(highTemp)}°  ·  L:${conv(lowTemp)}°`;
  document.getElementById("tempFeels").textContent =
    `Feels like ${conv(feelsTemp)}${unit}`;
}

// ─────────────────────────────────────────────────────────────
//  UNIT TOGGLE
// ─────────────────────────────────────────────────────────────
function setUnit() {
  currentUnit = currentUnit === "C" ? "F" : "C";
  document.getElementById("unitToggleBtn").textContent = `°${currentUnit}`;
  updateTempDisplay();
}

// ─────────────────────────────────────────────────────────────
//  DATE / CLOCK  (city's timezone)
// ─────────────────────────────────────────────────────────────
function startCityClock(tzOffsetSec) {
  if (cityClockInterval) clearInterval(cityClockInterval);

  function tick() {
    const utcMs = Date.now() + new Date().getTimezoneOffset() * 60000;
    const cityDate = new Date(utcMs + tzOffsetSec * 1000);

    const date = cityDate.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const time = cityDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    document.getElementById("liveDate").textContent = `${date}  ·  ${time}`;
  }

  tick();
  cityClockInterval = setInterval(tick, 1000);
}

// ─────────────────────────────────────────────────────────────
//  ALERT BAR
// ─────────────────────────────────────────────────────────────
function checkAlert(tc) {
  const bar = document.getElementById("alertBar");
  if (tc >= 40) {
    document.getElementById("alertTxt").textContent =
      `Extreme heat! ${tc}°C — stay hydrated and seek shade.`;
    document.getElementById("alertIcon").textContent = "🔥";
    bar.classList.remove("hidden");
  } else if (tc <= -10) {
    document.getElementById("alertTxt").textContent =
      `Extreme cold! ${tc}°C — dress in layers and limit outdoor exposure.`;
    document.getElementById("alertIcon").textContent = "🥶";
    bar.classList.remove("hidden");
  } else {
    bar.classList.add("hidden");
  }
}

// ─────────────────────────────────────────────────────────────
//  RECENT CITIES
// ─────────────────────────────────────────────────────────────
function getRecentCities() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecentCity(city) {
  let list = getRecentCities().filter(
    (c) => c.toLowerCase() !== city.toLowerCase(),
  );
  list.unshift(city);
  if (list.length > 8) list = list.slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

// ─────────────────────────────────────────────────────────────
//  LOADER / TOAST
// ─────────────────────────────────────────────────────────────
function showLoader() {
  document.getElementById("loader").classList.remove("hidden");
}
function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
}

function showToast(msg) {
  document.getElementById("toastMsg").textContent = msg;
  document.getElementById("toast").classList.remove("hidden");
  setTimeout(closeToast, 4000);
}
function closeToast() {
  document.getElementById("toast").classList.add("hidden");
}

// ─────────────────────────────────────────────────────────────
//  BACKGROUND SYSTEM
// ─────────────────────────────────────────────────────────────
let targetWaveColor = [80, 170, 255];

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

const NIGHT_VARIANTS = ["rainy", "stormy", "snowy", "cloudy"];

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
  lightning.style.animation = "none";
  lightning.style.opacity = "0";
  clouds.forEach((c) => {
    c.style.opacity = "0";
    c.style.filter = "blur(24px)";
  });

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
      starsWrap.style.opacity = "0.2";
      targetWaveColor = WAVE_COLORS.rainy;
      if (grp === "stormy") {
        lightning.style.animation = "lightning 8s ease-in-out infinite";
        targetWaveColor = WAVE_COLORS.stormy;
      }
    } else if (grp === "snowy") {
      clouds[0].style.opacity = "0.4";
      snowWrap.style.opacity = "1";
      starsWrap.style.opacity = "0.3";
      targetWaveColor = WAVE_COLORS.snowy;
    } else if (grp === "cloudy") {
      clouds.forEach((c) => (c.style.opacity = "0.4"));
      starsWrap.style.opacity = "0.2";
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
        lightning.style.animation = "lightning 8s ease-in-out infinite";
        break;
      default:
        colors = BG_THEMES.clear;
        sun.style.opacity = "0.4";
    }
    targetWaveColor = WAVE_COLORS[grp] ?? WAVE_COLORS.clear;
  }

  bg.style.background = `linear-gradient(180deg,${colors[0]} 0%,${colors[1]} 30%,${colors[2]} 65%,${colors[3]} 100%)`;

  document.body.className = document.body.className
    .replace(/theme-\S+/g, "")
    .replace(/\b(bg-day|bg-night|bg-rain|night-mode|rainy-mode)\b/g, "")
    .trim();

  if (isDay) {
    document.body.classList.add(`theme-${grp}`);
  } else {
    document.body.classList.add(
      `theme-night${NIGHT_VARIANTS.includes(grp) ? `-${grp}` : ""}`,
    );
  }
}

function owmGroup(id) {
  if (id === 800) return "sunny";
  if (id >= 801 && id <= 804) return "cloudy";
  if (id >= 700 && id <= 799) return "foggy";
  if (id >= 600 && id <= 699) return "snowy";
  if (id >= 500 && id <= 599) return "rainy";
  if (id >= 300 && id <= 399) return "rainy";
  if (id >= 200 && id <= 299) return "stormy";
  return "clear";
}

function owmEmoji(id, isDay) {
  if (id >= 200 && id <= 299) return "⛈️";
  if (id >= 300 && id <= 399) return "🌦️";
  if (id >= 500 && id <= 504) return "🌧️";
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

// ─────────────────────────────────────────────────────────────
//  PARTICLES
// ─────────────────────────────────────────────────────────────
function generateParticles() {
  const rainWrap = document.getElementById("rainWrap");
  const snowWrap = document.getElementById("snowWrap");
  const starsWrap = document.getElementById("starsWrap");

  if (!rainWrap.children.length) {
    for (let i = 0; i < 160; i++) {
      const d = document.createElement("div");
      d.className = "raindrop";
      const h = 18 + Math.random() * 38;
      d.style.cssText = `height:${h}px;left:${Math.random() * 100}%;animation-duration:${0.5 + Math.random() * 0.7}s;animation-delay:-${Math.random() * 1.2}s;`;
      rainWrap.appendChild(d);
    }
  }
  if (!snowWrap.children.length) {
    for (let i = 0; i < 70; i++) {
      const f = document.createElement("div");
      f.className = "snowflake";
      f.textContent = ["❅", "❆", "*"][Math.floor(Math.random() * 3)];
      const sz = 8 + Math.random() * 14;
      f.style.cssText = `font-size:${sz}px;left:${Math.random() * 100}%;animation-duration:${4 + Math.random() * 6}s;animation-delay:-${Math.random() * 8}s;`;
      snowWrap.appendChild(f);
    }
  }
  if (!starsWrap.children.length) {
    for (let i = 0; i < 140; i++) {
      const s = document.createElement("div");
      s.className = "star";
      const sz = 1 + Math.random() * 2.5;
      s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random() * 80}%;left:${Math.random() * 100}%;animation-duration:${2 + Math.random() * 4}s;animation-delay:-${Math.random() * 4}s;`;
      starsWrap.appendChild(s);
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  WAVE CANVAS
// ─────────────────────────────────────────────────────────────
const canvas = document.getElementById("waveCanvas");
const ctx = canvas.getContext("2d");
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

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
