# Astro Weather Card for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/default)
[![GitHub release](https://img.shields.io/github/v/release/copystring/astro-weather-card)](https://github.com/copystring/astro-weather-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, highly visual **Astronomical Weather & Observation Planning Card** for Home Assistant Lovelace. 

Designed specifically for stargazers, astrophotographers, and amateur astronomers who need an instant, practical answer to the question: **"Should I set up my telescope tonight?"**

---

## ✨ Features

- **⚡ Instant Observation Verdict:** Clear 3-second recommendation (*"Heute aufbauen"*, *"Bedingungen mäßig"*, *"Heute nicht aufbauen"*) with a unified 0–100 Astro-Index score.
- **🌌 Interactive Sky Dome (Himmelskuppel):** Visualizes the nocturnal sky arch with the Zenith at midnight, dynamic Moon position & illumination, sunset/sunrise horizon markers, and twilight phases.
- **🎯 Crucial Astronomical Metrics:**
  - **Seeing / Atmospheric Steadiness:** Direct arcsecond readout (`″`) with simple interpretation (*"Scharf / Ruhig"* vs. *"Luftflimmern"*) plus an interactive explanation popover.
  - **Cloud Coverage & Layers:** Integrated low, medium, and high cloud breakdown directly in the card.
  - **Humidity & Dew Point Risk:** Early warning for lens dew formation and dew heater requirements.
  - **Wind & Mount Stability:** Practical wind speed assessment with tripod vibration indicators.
- **⏱️ Night Timeline & Cursor:** Interactive hourly buttons allow scrubbing through the night and moving the position indicator across the sky dome.
- **🪐 Visible Celestial Targets:** Prominent planetary and deep-sky targets visible during the night (Saturn, Jupiter, M31 Andromeda Galaxy, etc.).
- **📅 7-Day Observation Forecast:** Compact multi-day planning with moon phases, cloud percentages, and smart alerts (e.g. New Moon warnings during overcast weather).
- **📱 100% Responsive & Self-Contained:** Built with pure Web Components & Shadow DOM. Zero external CDN dependencies, fully offline-compatible, and responsive on mobile, tablets, and ultrawide desktops.

---

## 📦 Installation

### Method 1: HACS (Recommended)

1. Open **HACS** in your Home Assistant.
2. Click on the 3 dots in the top right corner and choose **Custom repositories**.
3. Paste the repository URL: `https://github.com/copystring/astro-weather-card`
4. Select category: **Dashboard** (or **Lovelace**).
5. Click **Add**, then search for **Astro Weather Card** and click **Download**.
6. Refresh your browser.

### Method 2: Manual Installation

1. Download `astro-weather-card.js` from the [latest release](https://github.com/copystring/astro-weather-card/releases).
2. Copy the file into your Home Assistant directory: `/config/www/astro-weather-card.js`.
3. Go to **Settings** ➔ **Dashboards** ➔ **Resources** and add `/local/astro-weather-card.js` as **JavaScript Module**.

---

## ⚙️ Configuration

### Minimal YAML

```yaml
type: custom:astro-weather-card
```

### Full Configuration Example

```yaml
type: custom:astro-weather-card
title: "Sternwarte Fürstenhagen"
weather_entity: weather.astroweather
seeing_entity: sensor.astroweather_backyard_seeing
wind_entity: sensor.astroweather_backyard_10m_wind_speed
humidity_entity: sensor.astroweather_backyard_2m_relative_humidity
dewpoint_entity: sensor.astroweather_backyard_2m_dewpoint
condition_entity: sensor.astroweather_backyard_condition
cloud_low_entity: sensor.astroweather_backyard_cloud_low
cloud_mid_entity: sensor.astroweather_backyard_cloud_mid
cloud_high_entity: sensor.astroweather_backyard_cloud_high
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | **Required** | `custom:astro-weather-card` |
| `title` | string | `Astro-Wetter` | Custom header title (or falls back to Home Assistant location name) |
| `weather_entity` | string | `weather.astroweather` | Weather entity providing astronomical forecast data |
| `seeing_entity` | string | optional | Entity providing atmospheric seeing in arcseconds (`″`) |
| `wind_entity` | string | optional | Entity providing wind speed (km/h) |
| `humidity_entity` | string | optional | Entity providing relative humidity (%) |
| `dewpoint_entity` | string | optional | Entity providing dew point temperature (°C) |
| `condition_entity` | string | optional | Entity providing 0–100 observation condition score |

---

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/copystring/astro-weather-card.git
cd astro-weather-card

# Install dependencies
npm install

# Build distribution bundle
npm run build
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
