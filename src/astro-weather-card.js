/**
 * Astro Weather Card for Home Assistant
 * https://github.com/copystring/astro-weather-card
 * 
 * Author: copystring
 * License: MIT
 */

const CARD_VERSION = "1.1.0";
import { localize } from "./localize.js";

console.info(
  `%c ASTRO-WEATHER-CARD %c v${CARD_VERSION} `,
  'color: #ffffff; background: #4f46e5; font-weight: 700; border-radius: 4px 0 0 4px;',
  'color: #ffffff; background: #1e1b4b; font-weight: 700; border-radius: 0 4px 4px 0;'
);

class AstroWeatherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentDayIdx = 0;
    this._selectedHourIdx = 2; // Default 00:00 Mitternacht
    this._initialized = false;
    this._hass = null;
    this._config = {};
  }

  connectedCallback() {
    if (!this._initialized) {
      this._render();
    }
  }

  static async getConfigElement() {
    return document.createElement('astro-weather-card-editor');
  }

  static getStubConfig() {
    return {
      title: "Astro-Wetter",
      weather_entity: "weather.astroweather",
      seeing_entity: "sensor.astroweather_backyard_seeing",
      wind_entity: "sensor.astroweather_backyard_10m_wind_speed",
      humidity_entity: "sensor.astroweather_backyard_2m_relative_humidity",
      dewpoint_entity: "sensor.astroweather_backyard_2m_dewpoint",
      cloud_low_entity: "sensor.astroweather_backyard_cloud_low",
      cloud_mid_entity: "sensor.astroweather_backyard_cloud_mid",
      cloud_high_entity: "sensor.astroweather_backyard_cloud_high"
    };
  }

  setConfig(config) {
    this._config = Object.assign({
      title: "Astro-Wetter",
      show_targets: true,
      show_forecast: true,
      show_hourly: true,
      show_twilight: true
    }, config);

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._render();
      return;
    }
    this._updateFromHass();
  }

  getCardSize() {
    return 6;
  }

  _getLang() {
    if (this._config && this._config.language) {
      return this._config.language.toLowerCase();
    }
    if (this._hass) {
      const l = (this._hass.locale?.language || this._hass.language || 'en').toLowerCase();
      if (l.startsWith('de')) return 'de';
    }
    return 'en';
  }

  l(key) {
    return localize(key, this._getLang());
  }


  // Hilfsmethode: Standarddaten für die 7-Tage-Vorschau
  _getForecastData() {
    const lang = this._getLang();
    const l = (k) => localize(k, lang);
    return [
      {
        name: l("days.today"), fullDate: lang === "de" ? "Dienstag, 07. Oktober" : "Tuesday, Oct 07",
        verdict: l("verdicts.do_not_setup"), color: "red", score: 17,
        desc: l("verdicts.do_not_setup_desc"),
        clouds: 69, cloudLow: 85, cloudMid: 15, cloudHigh: 0, cloudStatus: lang === "de" ? "Hochnebel" : "High Fog",
        dew: 98, dewpoint: 7.5, dewStatus: l("dew_alert"),
        wind: 3.6, windStatus: l("windstill"), windNote: l("no_shaking"),
        seeing: 1.37, seeingStatus: l("steady"), seeingNote: l("sharp_details"),
        moon: "🌘 15%", moonDetail: `${l("moon")}: 15% (${l("moon_rise")} 03:24)`, moonX: 395, moonY: 55,
        sunset: `19:18 ${l("sunset")}`, sunrise: `06:58 ${l("sunrise")}`, coreWindow: "20:36 – 05:40",
        twilightEvening: `19:18 (${l("dusk")})`, twilightNight: `20:36 - 05:40 ${l("dark_night")}`, twilightMorning: `06:58 (${l("dawn")})`,
        hourly: [
          { time: "20:00", clouds: 75, seeing: "1.5″", cx: 125, cy: 110 },
          { time: "22:00", clouds: 72, seeing: "1.4″", cx: 220, cy: 60 },
          { time: "00:00", clouds: 69, seeing: "1.4″", cx: 330, cy: 35 },
          { time: "02:00", clouds: 66, seeing: "1.3″", cx: 440, cy: 60 },
          { time: "04:00", clouds: 70, seeing: "1.4″", cx: 535, cy: 110 },
          { time: "06:00", clouds: 80, seeing: "1.6″", cx: 590, cy: 145 }
        ]
      },
      {
        name: l("days.wed"), fullDate: lang === "de" ? "Mittwoch, 08. Oktober" : "Wednesday, Oct 08",
        verdict: l("verdicts.rain_front"), color: "red", score: 13,
        desc: l("verdicts.rain_front_desc"),
        clouds: 90, cloudLow: 90, cloudMid: 40, cloudHigh: 10, cloudStatus: lang === "de" ? "Regenfront" : "Rain Front",
        dew: 95, dewpoint: 8.0, dewStatus: l("dew_risk"),
        wind: 12.4, windStatus: l("moderate"), windNote: lang === "de" ? "Leichte Vibrationen" : "Minor vibration",
        seeing: 2.10, seeingStatus: l("turbulent"), seeingNote: lang === "de" ? "Flimmern am Planeten" : "Planetary blur",
        moon: "🌘 9%", moonDetail: `${l("moon")}: 9% (${l("moon_rise")} 04:40)`, moonX: 430, moonY: 70,
        sunset: `19:15 ${l("sunset")}`, sunrise: `07:00 ${l("sunrise")}`, coreWindow: "20:33 – 05:42",
        twilightEvening: `19:15 (${l("dusk")})`, twilightNight: `20:33 - 05:42 ${l("dark_night")}`, twilightMorning: `07:00 (${l("dawn")})`,
        hourly: [
          { time: "20:00", clouds: 95, seeing: "2.3″", cx: 125, cy: 110 },
          { time: "22:00", clouds: 90, seeing: "2.1″", cx: 220, cy: 60 },
          { time: "00:00", clouds: 88, seeing: "2.0″", cx: 330, cy: 35 },
          { time: "02:00", clouds: 92, seeing: "2.1″", cx: 440, cy: 60 },
          { time: "04:00", clouds: 95, seeing: "2.2″", cx: 535, cy: 110 },
          { time: "06:00", clouds: 98, seeing: "2.4″", cx: 590, cy: 145 }
        ]
      },
      {
        name: l("days.thu"), fullDate: lang === "de" ? "Donnerstag, 09. Oktober" : "Thursday, Oct 09",
        verdict: l("verdicts.stormy"), color: "red", score: 8,
        desc: l("verdicts.stormy_desc"),
        clouds: 99, cloudLow: 95, cloudMid: 80, cloudHigh: 50, cloudStatus: lang === "de" ? "Stark bewölkt" : "Overcast",
        dew: 99, dewpoint: 9.2, dewStatus: lang === "de" ? "Nass" : "Wet",
        wind: 24.5, windStatus: l("gusty"), windNote: lang === "de" ? "Starkes Wackeln" : "Heavy vibration",
        seeing: 2.80, seeingStatus: l("poor"), seeingNote: lang === "de" ? "Starkes Flackern" : "Severe scintillation",
        moon: "🌘 4%", moonDetail: `${l("moon")}: 4% (${l("moon_rise")} 05:55)`, moonX: 470, moonY: 90,
        sunset: `19:13 ${l("sunset")}`, sunrise: `07:02 ${l("sunrise")}`, coreWindow: "20:31 – 05:44",
        twilightEvening: `19:13 (${l("dusk")})`, twilightNight: `20:31 - 05:44 ${l("dark_night")}`, twilightMorning: `07:02 (${l("dawn")})`,
        hourly: [
          { time: "20:00", clouds: 100, seeing: "2.9″", cx: 125, cy: 110 },
          { time: "22:00", clouds: 99, seeing: "2.8″", cx: 220, cy: 60 },
          { time: "00:00", clouds: 99, seeing: "2.8″", cx: 330, cy: 35 },
          { time: "02:00", clouds: 98, seeing: "2.7″", cx: 440, cy: 60 },
          { time: "04:00", clouds: 99, seeing: "2.8″", cx: 535, cy: 110 },
          { time: "06:00", clouds: 100, seeing: "3.0″", cx: 590, cy: 145 }
        ]
      },
      {
        name: l("days.fri"), fullDate: lang === "de" ? "Freitag, 10. Oktober" : "Friday, Oct 10",
        verdict: l("verdicts.showers"), color: "red", score: 15,
        desc: l("verdicts.showers_desc"),
        clouds: 85, cloudLow: 80, cloudMid: 60, cloudHigh: 30, cloudStatus: lang === "de" ? "Wolkig" : "Cloudy",
        dew: 92, dewpoint: 6.8, dewStatus: l("dew_risk"),
        wind: 9.8, windStatus: l("calm"), windNote: lang === "de" ? "Akzeptabel" : "Acceptable",
        seeing: 1.85, seeingStatus: l("moderate"), seeingNote: lang === "de" ? "Brauchbar für Mond" : "Good for moon",
        moon: "🌘 1%", moonDetail: `${l("moon")}: 1% (${l("moon_rise")} 07:12)`, moonX: 520, moonY: 115,
        sunset: `19:11 ${l("sunset")}`, sunrise: `07:03 ${l("sunrise")}`, coreWindow: "20:29 – 05:46",
        twilightEvening: `19:11 (${l("dusk")})`, twilightNight: `20:29 - 05:46 ${l("dark_night")}`, twilightMorning: `07:03 (${l("dawn")})`,
        hourly: [
          { time: "20:00", clouds: 90, seeing: "1.9″", cx: 125, cy: 110 },
          { time: "22:00", clouds: 88, seeing: "1.8″", cx: 220, cy: 60 },
          { time: "00:00", clouds: 85, seeing: "1.8″", cx: 330, cy: 35 },
          { time: "02:00", clouds: 80, seeing: "1.8″", cx: 440, cy: 60 },
          { time: "04:00", clouds: 75, seeing: "1.7″", cx: 535, cy: 110 },
          { time: "06:00", clouds: 82, seeing: "1.9″", cx: 590, cy: 145 }
        ]
      },
      {
        name: l("days.sat"), fullDate: lang === "de" ? "Samstag, 11. Oktober" : "Saturday, Oct 11",
        verdict: l("verdicts.new_moon_cloudy"), color: "amber", score: 20,
        desc: l("verdicts.new_moon_cloudy_desc"),
        clouds: 99, cloudLow: 90, cloudMid: 70, cloudHigh: 40, cloudStatus: lang === "de" ? "Bedeckt" : "Overcast",
        dew: 94, dewpoint: 6.2, dewStatus: l("dew_risk"),
        wind: 7.2, windStatus: l("calm"), windNote: l("no_shaking"),
        seeing: 1.65, seeingStatus: l("sharp"), seeingNote: l("steady"),
        moon: "🌑 0%", moonDetail: `${l("new_moon")}`, moonX: 330, moonY: 35,
        sunset: `19:08 ${l("sunset")}`, sunrise: `07:05 ${l("sunrise")}`, coreWindow: "20:27 – 05:48",
        twilightEvening: `19:08 (${l("dusk")})`, twilightNight: `20:27 - 05:48 ${l("dark_night")}`, twilightMorning: `07:05 (${l("dawn")})`,
        hourly: [
          { time: "20:00", clouds: 100, seeing: "1.7″", cx: 125, cy: 110 },
          { time: "22:00", clouds: 99, seeing: "1.6″", cx: 220, cy: 60 },
          { time: "00:00", clouds: 98, seeing: "1.6″", cx: 330, cy: 35 },
          { time: "02:00", clouds: 97, seeing: "1.6″", cx: 440, cy: 60 },
          { time: "04:00", clouds: 99, seeing: "1.7″", cx: 535, cy: 110 },
          { time: "06:00", clouds: 100, seeing: "1.8″", cx: 590, cy: 145 }
        ]
      },
      {
        name: l("days.sun"), fullDate: lang === "de" ? "Sonntag, 12. Oktober" : "Sunday, Oct 12",
        verdict: l("verdicts.gaps"), color: "amber", score: 48,
        desc: l("verdicts.gaps_desc"),
        clouds: 65, cloudLow: 50, cloudMid: 25, cloudHigh: 15, cloudStatus: lang === "de" ? "Lücken" : "Cloud Gaps",
        dew: 86, dewpoint: 5.1, dewStatus: l("dew_risk"),
        wind: 5.4, windStatus: l("windstill"), windNote: l("no_shaking"),
        seeing: 1.45, seeingStatus: l("sharp"), seeingNote: l("sharp_details"),
        moon: "🌒 3%", moonDetail: `${l("moon")}: 3% (${l("moon_set")} 20:15)`, moonX: 200, moonY: 70,
        sunset: `19:06 ${l("sunset")}`, sunrise: `07:07 ${l("sunrise")}`, coreWindow: "20:25 – 05:50",
        twilightEvening: `19:06 (${l("dusk")})`, twilightNight: `20:25 - 05:50 ${l("dark_night")}`, twilightMorning: `07:07 (${l("dawn")})`,
        hourly: [
          { time: "20:00", clouds: 75, seeing: "1.6″", cx: 125, cy: 110 },
          { time: "22:00", clouds: 60, seeing: "1.5″", cx: 220, cy: 60 },
          { time: "00:00", clouds: 45, seeing: "1.4″", cx: 330, cy: 35 },
          { time: "02:00", clouds: 40, seeing: "1.4″", cx: 440, cy: 60 },
          { time: "04:00", clouds: 55, seeing: "1.5″", cx: 535, cy: 110 },
          { time: "06:00", clouds: 70, seeing: "1.6″", cx: 590, cy: 145 }
        ]
      },
      {
        name: l("days.mon"), fullDate: lang === "de" ? "Montag, 13. Oktober" : "Monday, Oct 13",
        verdict: l("verdicts.best_chance"), color: "emerald", score: 55,
        desc: l("verdicts.best_chance_desc"),
        clouds: 45, cloudLow: 20, cloudMid: 15, cloudHigh: 10, cloudStatus: lang === "de" ? "Teils klar" : "Partly Clear",
        dew: 78, dewpoint: 3.8, dewStatus: l("dew_heater"),
        wind: 4.2, windStatus: l("calm"), windNote: l("no_shaking"),
        seeing: 1.25, seeingStatus: l("sharp"), seeingNote: l("steady"),
        moon: "🌒 8%", moonDetail: `${l("moon")}: 8% (${l("moon_set")} 21:05)`, moonX: 240, moonY: 55,
        sunset: `19:04 ${l("sunset")}`, sunrise: `07:09 ${l("sunrise")}`, coreWindow: "20:23 – 05:52",
        twilightEvening: `19:04 (${l("dusk")})`, twilightNight: `20:23 - 05:52 ${l("dark_night")}`, twilightMorning: `07:09 (${l("dawn")})`,
        hourly: [
          { time: "20:00", clouds: 55, seeing: "1.4″", cx: 125, cy: 110 },
          { time: "22:00", clouds: 40, seeing: "1.3″", cx: 220, cy: 60 },
          { time: "00:00", clouds: 35, seeing: "1.2″", cx: 330, cy: 35 },
          { time: "02:00", clouds: 30, seeing: "1.2″", cx: 440, cy: 60 },
          { time: "04:00", clouds: 45, seeing: "1.3″", cx: 535, cy: 110 },
          { time: "06:00", clouds: 60, seeing: "1.4″", cx: 590, cy: 145 }
        ]
      }
    ];
  }

  _updateFromHass() {
    if (!this._hass || !this._hass.states) return;

    const days = this._daysData || this._getForecastData();
    const today = days[0];

    const getVal = (entityId) => {
      if (!entityId || !this._hass.states[entityId]) return null;
      return this._hass.states[entityId].state;
    };

    // 1. Weather Entity Fallback / Auto-Detection
    const weatherEntityId = this._config.weather_entity || 
      (this._hass.states['weather.astroweather_backyard'] ? 'weather.astroweather_backyard' : 
      (this._hass.states['weather.astroweather'] ? 'weather.astroweather' : null));
    const weatherAttr = weatherEntityId && this._hass.states[weatherEntityId]?.attributes ? this._hass.states[weatherEntityId].attributes : {};

    // 2. Score & Condition
    let score = null;
    const condVal = getVal(this._config.condition_entity || 'sensor.astroweather_backyard_condition');
    if (condVal && !isNaN(parseFloat(condVal))) {
      score = Math.round(parseFloat(condVal));
    } else if (weatherAttr.condition_percentage !== undefined && !isNaN(parseFloat(weatherAttr.condition_percentage))) {
      score = Math.round(parseFloat(weatherAttr.condition_percentage));
    }

    if (score !== null) {
      today.score = score;
      if (score >= 70) {
        today.color = 'emerald';
        today.verdict = this.l('verdicts.great_night');
        today.desc = this.l('verdicts.great_night_desc');
      } else if (score >= 45) {
        today.color = 'emerald';
        today.verdict = this.l('verdicts.good_conditions');
        today.desc = this.l('verdicts.good_conditions_desc');
      } else if (score >= 25) {
        today.color = 'amber';
        today.verdict = this.l('verdicts.fair_conditions');
        today.desc = this.l('verdicts.fair_conditions_desc');
      } else {
        today.color = 'red';
        today.verdict = this.l('verdicts.do_not_setup');
        today.desc = this.l('verdicts.do_not_setup_desc');
      }
    }

    // 3. Seeing
    let seeing = null;
    const seeingVal = getVal(this._config.seeing_entity || 'sensor.astroweather_backyard_seeing');
    if (seeingVal && !isNaN(parseFloat(seeingVal))) {
      seeing = parseFloat(seeingVal);
    } else if (weatherAttr.seeing !== undefined && !isNaN(parseFloat(weatherAttr.seeing))) {
      seeing = parseFloat(weatherAttr.seeing);
    }
    if (seeing !== null) {
      today.seeing = seeing.toFixed(2).replace('.', ',');
      if (seeing < 1.4) {
        today.seeingStatus = this.l('sharp');
        today.seeingNote = this.l('sharp_details');
      } else if (seeing < 2.0) {
        today.seeingStatus = this.l('steady');
        today.seeingNote = this.l('steady');
      } else {
        today.seeingStatus = this.l('turbulent');
        today.seeingNote = this.l('turbulent');
      }
    }

    // 4. Wind
    let wind = null;
    const windVal = getVal(this._config.wind_entity || 'sensor.astroweather_backyard_10m_wind_speed');
    if (windVal && !isNaN(parseFloat(windVal))) {
      wind = parseFloat(windVal);
    } else if (weatherAttr.wind_speed !== undefined && !isNaN(parseFloat(weatherAttr.wind_speed))) {
      wind = parseFloat(weatherAttr.wind_speed);
    }
    if (wind !== null) {
      today.wind = wind.toFixed(1).replace('.', ',');
      if (wind < 8) {
        today.windStatus = this.l('windstill');
        today.windNote = this.l('no_shaking');
      } else if (wind < 20) {
        today.windStatus = this.l('moderate');
        today.windNote = this._getLang() === 'de' ? 'Leichte Vibrationen' : 'Minor vibration';
      } else {
        today.windStatus = this.l('gusty');
        today.windNote = this._getLang() === 'de' ? 'Sturmböen / Wackeln' : 'Gusty / Shaking';
      }
    }

    // 5. Humidity & Dew Point
    let hum = null;
    const humVal = getVal(this._config.humidity_entity || 'sensor.astroweather_backyard_2m_relative_humidity');
    if (humVal && !isNaN(parseFloat(humVal))) {
      hum = Math.round(parseFloat(humVal));
    } else if (weatherAttr.humidity !== undefined && !isNaN(parseFloat(weatherAttr.humidity))) {
      hum = Math.round(parseFloat(weatherAttr.humidity));
    }
    if (hum !== null) {
      today.dew = hum;
      if (hum >= 90) today.dewStatus = this.l('dew_alert');
      else if (hum >= 75) today.dewStatus = this.l('dew_heater');
      else today.dewStatus = this.l('calm');
    }

    let dewpoint = null;
    const dewVal = getVal(this._config.dewpoint_entity || 'sensor.astroweather_backyard_2m_dewpoint');
    if (dewVal && !isNaN(parseFloat(dewVal))) {
      dewpoint = parseFloat(dewVal);
    } else if (weatherAttr.dewpoint !== undefined && !isNaN(parseFloat(weatherAttr.dewpoint))) {
      dewpoint = parseFloat(weatherAttr.dewpoint);
    }
    if (dewpoint !== null) {
      today.dewpoint = dewpoint.toFixed(1);
    }

    // 6. Clouds
    let clouds = null;
    const cloudVal = getVal(this._config.cloud_entity || 'sensor.astroweather_backyard_cloud_cover');
    if (cloudVal && !isNaN(parseFloat(cloudVal))) {
      clouds = Math.round(parseFloat(cloudVal));
    } else if (weatherAttr.cloudcover_percentage !== undefined && !isNaN(parseFloat(weatherAttr.cloudcover_percentage))) {
      clouds = Math.round(parseFloat(weatherAttr.cloudcover_percentage));
    }
    if (clouds !== null) {
      today.clouds = clouds;
      if (clouds <= 10) today.cloudStatus = this._getLang() === 'de' ? 'Klarer Himmel' : 'Clear Sky';
      else if (clouds <= 35) today.cloudStatus = this._getLang() === 'de' ? 'Teils klar' : 'Partly Clear';
      else if (clouds <= 70) today.cloudStatus = this._getLang() === 'de' ? 'Bewölkt' : 'Mostly Cloudy';
      else today.cloudStatus = this._getLang() === 'de' ? 'Bedeckt' : 'Overcast';

      // Update hourly preview for today if clouds are clear
      if (today.hourly) {
        today.hourly.forEach((h, idx) => {
          h.clouds = Math.max(0, Math.min(100, Math.round(clouds + (idx % 2 === 0 ? 5 : 0))));
        });
      }
    }

    const cloudLowVal = getVal(this._config.cloud_low_entity || 'sensor.astroweather_backyard_clouds_area_low');
    if (cloudLowVal && !isNaN(parseFloat(cloudLowVal))) {
      today.cloudLow = Math.round(parseFloat(cloudLowVal));
    } else if (weatherAttr.cloud_area_fraction_low !== undefined) {
      today.cloudLow = Math.round(parseFloat(weatherAttr.cloud_area_fraction_low));
    }

    const cloudMidVal = getVal(this._config.cloud_mid_entity || 'sensor.astroweather_backyard_clouds_area_medium');
    if (cloudMidVal && !isNaN(parseFloat(cloudMidVal))) {
      today.cloudMid = Math.round(parseFloat(cloudMidVal));
    } else if (weatherAttr.cloud_area_fraction_medium !== undefined) {
      today.cloudMid = Math.round(parseFloat(weatherAttr.cloud_area_fraction_medium));
    }

    const cloudHighVal = getVal(this._config.cloud_high_entity || 'sensor.astroweather_backyard_clouds_area_high');
    if (cloudHighVal && !isNaN(parseFloat(cloudHighVal))) {
      today.cloudHigh = Math.round(parseFloat(cloudHighVal));
    } else if (weatherAttr.cloud_area_fraction_high !== undefined) {
      today.cloudHigh = Math.round(parseFloat(weatherAttr.cloud_area_fraction_high));
    }

    this._renderDynamicContent();
  }

  _render() {
    this._daysData = this._getForecastData();
    const lang = this._getLang();
    
    // Standort-Label ermitteln (aus Config oder Zone Home)
    let locationLabel = this._config.title || this.l("title_default");
    let coordLabel = "";
    if (this._hass && this._hass.config) {
      const lat = this._hass.config.latitude ? this._hass.config.latitude.toFixed(2) + "° N" : "";
      const lon = this._hass.config.longitude ? this._hass.config.longitude.toFixed(2) + "° O" : "";
      if (lat && lon) coordLabel = `${lat} • ${lon}`;
      if (!this._config.title && this._hass.config.location_name) {
        locationLabel = this._hass.config.location_name.toUpperCase();
      }
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --astro-bg: var(--ha-card-background, #080b14);
          --astro-card-bg: rgba(15, 23, 42, 0.75);
          --astro-border: rgba(255, 255, 255, 0.08);
          --astro-primary-text: var(--primary-text-color, #f8fafc);
          --astro-secondary-text: var(--secondary-text-color, #94a3b8);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: var(--astro-primary-text);
          box-sizing: border-box;
        }

        *, *:before, *:after {
          box-sizing: inherit;
        }

        .card-container {
          background: #06080f;
          background-image: 
            radial-gradient(at 50% 0%, #0f1526 0%, transparent 65%),
            radial-gradient(at 100% 100%, #0a0d18 0%, transparent 60%);
          border-radius: var(--ha-card-border-radius, 20px);
          border: 1px solid var(--astro-border);
          padding: 14px;
          overflow: hidden;
        }

        @media (min-width: 640px) {
          .card-container {
            padding: 18px;
          }
        }

        .panel {
          background: var(--astro-card-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--astro-border);
          border-radius: 16px;
        }

        .panel-verdict-red {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.95) 70%);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .panel-verdict-green {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(15, 23, 42, 0.95) 70%);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        .panel-verdict-amber {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.95) 70%);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        /* HEADER */
        .header {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 14px;
        }
        @media (min-width: 768px) {
          .header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .header-title-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .astro-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #818cf8;
          flex-shrink: 0;
        }

        .location-title {
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0;
          color: #ffffff;
        }

        .coords-badge {
          font-size: 10px;
          font-family: monospace;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(71, 85, 105, 0.6);
          padding: 2px 6px;
          border-radius: 6px;
          color: #cbd5e1;
          margin-left: 6px;
        }

        .live-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 600;
          color: #34d399;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 2px 6px;
          border-radius: 6px;
          margin-left: 6px;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        /* TAGES-NAVIGATOR */
        .day-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(71, 85, 105, 0.5);
          border-radius: 14px;
          padding: 3px 6px;
          min-width: 220px;
        }
        .nav-btn {
          background: rgba(30, 41, 59, 0.9);
          border: none;
          color: #cbd5e1;
          width: 30px;
          height: 30px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, transform 0.1s;
        }
        .nav-btn:hover { background: #334155; }
        .nav-btn:active { transform: scale(0.95); }

        .nav-day-info {
          text-align: center;
          padding: 0 10px;
        }
        .nav-day-title {
          font-size: 13px;
          font-weight: 700;
          display: block;
        }
        .nav-day-sub {
          font-size: 10px;
          color: #94a3b8;
          display: block;
        }

        /* 3-SPALTEN GRID */
        .main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 1024px) {
          .main-grid {
            grid-template-columns: 5fr 4fr 3fr;
            align-items: start;
          }
        }

        .col {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
        }

        /* HERO CARD */
        .hero-card {
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 16px;
        }
        .hero-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .hero-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .hero-verdict {
          font-size: 16px;
          font-weight: 900;
          margin: 0;
          color: #ffffff;
        }
        .hero-desc {
          font-size: 12px;
          color: #cbd5e1;
          margin: 3px 0 0 0;
          line-height: 1.4;
        }
        .hero-score-box {
          border-left: 1px solid rgba(255, 255, 255, 0.12);
          padding-left: 14px;
          text-align: right;
          flex-shrink: 0;
        }
        .hero-score-label {
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 700;
          color: #94a3b8;
          display: block;
          letter-spacing: 0.5px;
        }
        .hero-score-num {
          font-size: 26px;
          font-weight: 900;
          line-height: 1.1;
        }

        /* HIMMELSKUPPEL */
        .dome-box {
          padding: 16px;
          border-radius: 16px;
        }
        .dome-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        .dome-title {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #e2e8f0;
          margin: 0;
        }
        .dome-sub {
          font-size: 10px;
          color: #94a3b8;
          margin: 2px 0 0 0;
        }
        .dome-window {
          font-size: 12px;
          font-weight: 700;
          font-family: monospace;
          color: #a5b4fc;
        }
        .dome-svg-wrap {
          background: #04060d;
          border-radius: 14px;
          border: 1px solid rgba(51, 65, 85, 0.5);
          padding: 8px;
          overflow: hidden;
        }
        .dome-svg-wrap svg {
          width: 100%;
          height: auto;
          display: block;
        }

        /* TWILIGHT PROGRESS BAR */
        .twilight-wrap {
          margin-top: 10px;
        }
        .twilight-times {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .twilight-bar {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          display: flex;
          overflow: hidden;
          background: #0f172a;
          border: 1px solid rgba(51, 65, 85, 0.5);
        }

        /* SICHTBARE ZIELE */
        .targets-box {
          padding: 12px 14px;
        }
        .targets-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 8px;
        }
        .target-item {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(51, 65, 85, 0.6);
          border-radius: 10px;
          padding: 8px;
          overflow: hidden;
        }
        .target-name {
          font-size: 11px;
          font-weight: 700;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .target-time {
          font-size: 11px;
          color: #f1f5f9;
          font-weight: 600;
          margin-top: 2px;
          display: block;
        }
        .target-sub {
          font-size: 9px;
          color: #94a3b8;
          display: block;
        }

        /* 4 METRIKEN KACHELN */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .metric-card {
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .metric-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.5px;
        }
        .metric-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
        }
        .badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .badge-green { background: rgba(16, 185, 129, 0.2); color: #34d399; }
        .badge-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

        .metric-val-wrap {
          display: flex;
          align-items: baseline;
          gap: 3px;
        }
        .metric-val {
          font-size: 22px;
          font-weight: 900;
          line-height: 1;
        }
        .metric-unit {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
        }
        .metric-status {
          font-size: 11px;
          font-weight: 700;
          margin-left: 4px;
        }

        .metric-bar-bg {
          width: 100%;
          height: 5px;
          background: rgba(30, 41, 59, 0.8);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 6px;
        }
        .metric-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .metric-footer {
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px solid rgba(51, 65, 85, 0.5);
          font-size: 9px;
          color: #94a3b8;
        }

        /* SEEING TOOLTIP */
        .help-btn {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(71, 85, 105, 0.6);
          color: #cbd5e1;
          font-size: 9px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: 4px;
        }
        .seeing-popover {
          display: none;
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.96);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          border: 1px solid rgba(99, 102, 241, 0.5);
          padding: 10px;
          z-index: 20;
          flex-direction: column;
          justify-content: space-between;
        }
        .seeing-popover.open {
          display: flex;
        }

        /* STÜNDLICHER VERLAUF */
        .hourly-box {
          padding: 14px;
        }
        .hourly-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .hourly-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
        }
        .hour-pill {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(51, 65, 85, 0.6);
          border-radius: 10px;
          padding: 6px 4px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .hour-pill:hover {
          background: rgba(30, 41, 59, 0.8);
        }
        .hour-pill.selected {
          border-color: #818cf8;
          background: rgba(49, 46, 129, 0.6);
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
        }
        .hour-time { font-size: 10px; font-weight: 700; color: #cbd5e1; display: block; }
        .hour-cloud { font-size: 11px; font-weight: 900; margin: 3px 0; display: block; }
        .hour-seeing { font-size: 8px; font-family: monospace; color: #94a3b8; display: block; }

        /* 7-TAGE VORSCHAU */
        .forecast-box {
          padding: 14px;
        }
        .forecast-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .forecast-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .forecast-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid rgba(51, 65, 85, 0.5);
          background: rgba(15, 23, 42, 0.5);
          cursor: pointer;
          transition: all 0.15s;
        }
        .forecast-row:hover {
          background: rgba(30, 41, 59, 0.6);
        }
        .forecast-row.selected {
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(99, 102, 241, 0.7);
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.25);
        }
        .f-day { font-size: 11px; font-weight: 700; display: block; }
        .f-date { font-size: 9px; color: #94a3b8; display: block; }
        .f-badge-neumond {
          font-size: 7px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 4px;
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
          margin-left: 4px;
        }
        .range-bar {
          width: 50px;
          height: 4px;
          background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%);
          border-radius: 2px;
          position: relative;
        }
        .range-thumb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 4px #000000;
          position: absolute;
          top: -2px;
          transform: translateX(-50%);
        }
        .f-score {
          font-size: 12px;
          font-family: monospace;
          font-weight: 800;
          width: 32px;
          text-align: right;
        }

        .notice-box {
          margin-top: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(120, 53, 15, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.3);
          font-size: 10px;
          color: #fde68a;
          line-height: 1.4;
        }
      </style>

      <div class="card-container">
        
        <!-- HEADER -->
        <header class="header">
          <div class="header-title-box">
            <div class="astro-icon">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>
              </svg>
            </div>
            <div>
              <div style="display: flex; align-items: center; flex-wrap: wrap;">
                <h1 class="location-title" id="cardLocationTitle">${locationLabel}</h1>
                ${coordLabel ? `<span class="coords-badge">${coordLabel}</span>` : ''}
                <div class="live-badge">
                  <span class="live-dot"></span>
                  <span>LIVE</span>
                </div>
              </div>
              <span style="font-size: 10px; color: #94a3b8;">${this.l("sub_title")}</span>
            </div>
          </div>

          <!-- TAGES-NAVIGATOR -->
          <div class="day-nav">
            <button class="nav-btn" id="btnPrevDay" title="Vorheriger Tag">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div class="nav-day-info">
              <span class="nav-day-title" id="navDayName">Heute</span>
              <span class="nav-day-sub" id="navDayDate">Dienstag, 07. Oktober</span>
            </div>
            <button class="nav-btn" id="btnNextDay" title="Nächster Tag">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </header>

        <!-- 3-SPALTEN GRID -->
        <div class="main-grid">

          <!-- SPALTE 1: ENTSCHEIDUNG, HIMMELSKUPPEL, PLANETEN -->
          <div class="col">
            
            <!-- HERO BANNER -->
            <div id="verdictBox" class="panel panel-verdict-red hero-card">
              <div class="hero-left">
                <div id="verdictIconContainer" class="hero-icon" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171;">
                  <svg id="verdictSvg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h2 id="verdictTitle" class="hero-verdict">Heute nicht aufbauen</h2>
                  <p id="verdictSummary" class="hero-desc">Dichter Hochnebel blockiert die Sterne. Hohe Feuchte lässt die Optik beschlagen.</p>
                </div>
              </div>
              <div class="hero-score-box">
                <span class="hero-score-label">Astro-Index</span>
                <span id="verdictScoreVal" class="hero-score-num" style="color: #f87171;">17<span style="font-size: 11px; font-weight: 500; color: #94a3b8;">/100</span></span>
              </div>
            </div>

            <!-- HIMMELSKUPPEL -->
            <div class="panel dome-box">
              <div class="dome-header">
                <div>
                  <h3 class="dome-title">${this.l("sky_dome")}</h3>
                  <p class="dome-sub">${this.l("sky_dome_sub")}</p>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #94a3b8; display: block;">${this.l("dark_night")}</span>
                  <span id="domeCoreTimeBadge" class="dome-window">20:36 – 05:40 Uhr</span>
                </div>
              </div>

              <!-- SVG GRAFIK -->
              <div class="dome-svg-wrap">
                <svg viewBox="0 0 660 210">
                  <defs>
                    <radialGradient id="nightSkyGlow" cx="50%" cy="25%" r="70%">
                      <stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.9"/>
                      <stop offset="65%" stop-color="#0f172a" stop-opacity="0.95"/>
                      <stop offset="100%" stop-color="#04060d" stop-opacity="1"/>
                    </radialGradient>
                    <linearGradient id="deepSkyArc" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stop-color="#3b82f6"/>
                      <stop offset="50%" stop-color="#6366f1"/>
                      <stop offset="100%" stop-color="#38bdf8"/>
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                  </defs>

                  <rect width="660" height="210" fill="url(#nightSkyGlow)" rx="12"/>

                  <!-- Sternfeld -->
                  <circle cx="120" cy="50" r="1.2" fill="#ffffff" opacity="0.8"/>
                  <circle cx="160" cy="90" r="0.9" fill="#ffffff" opacity="0.5"/>
                  <circle cx="210" cy="65" r="1.3" fill="#ffffff" opacity="0.9"/>
                  <circle cx="250" cy="80" r="0.8" fill="#ffffff" opacity="0.6"/>
                  <circle cx="280" cy="45" r="1.1" fill="#ffffff" opacity="0.8"/>
                  <circle cx="330" cy="38" r="1.4" fill="#ffffff" opacity="0.95" filter="url(#glow)"/>
                  <circle cx="370" cy="55" r="1.0" fill="#ffffff" opacity="0.7"/>
                  <circle cx="430" cy="70" r="1.2" fill="#ffffff" opacity="0.85"/>
                  <circle cx="490" cy="95" r="0.9" fill="#ffffff" opacity="0.6"/>
                  <circle cx="530" cy="120" r="0.7" fill="#ffffff" opacity="0.4"/>

                  <!-- M31 Andromeda -->
                  <ellipse cx="370" cy="72" rx="5" ry="2.5" fill="#a5b4fc" opacity="0.5" transform="rotate(-25 370 72)"/>
                  <text x="370" y="86" fill="#64748b" font-size="8" text-anchor="middle">M31 Andromeda</text>

                  <!-- Führungslinie & Bogen -->
                  <path d="M 70,145 A 260,115 0 0,1 590,145" fill="none" stroke="#26334d" stroke-width="2"/>
                  <path d="M 145,103 A 260,115 0 0,1 515,103" fill="none" stroke="url(#deepSkyArc)" stroke-width="5" stroke-linecap="round"/>

                  <!-- Horizont-Linie -->
                  <line x1="20" y1="145" x2="640" y2="145" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
                  <text x="30" y="140" fill="#64748b" font-size="9" font-weight="700">WEST</text>
                  <text x="630" y="140" fill="#64748b" font-size="9" font-weight="700" text-anchor="end">${lang === "de" ? "OST" : "EAST"}</text>

                  <!-- Zenit -->
                  <text x="330" y="16" fill="#818cf8" font-size="9" font-weight="700" text-anchor="middle">${this.l("zenith_midnight")}</text>

                  <!-- Sonne Auf/Untergang -->
                  <circle cx="70" cy="145" r="5" fill="#ea580c"/>
                  <text x="70" y="165" fill="#f97316" font-size="10" font-weight="700" text-anchor="middle" id="domeSunsetText">19:18 ${this.l("sunset")}</text>

                  <circle cx="590" cy="145" r="5" fill="#f59e0b"/>
                  <text x="590" y="165" fill="#f59e0b" font-size="10" font-weight="700" text-anchor="middle" id="domeSunriseText">06:58 ${this.l("sunrise")}</text>

                  <!-- Mond Knoten -->
                  <g id="moonNode" style="transition: transform 0.3s ease;">
                    <circle cx="395" cy="55" r="11" fill="#38bdf8" opacity="0.12"/>
                    <circle cx="395" cy="55" r="6" fill="#cbd5e1" stroke="#38bdf8" stroke-width="1.5"/>
                    <text x="395" y="38" fill="#e2e8f0" font-size="9" font-weight="600" text-anchor="middle" id="moonNodeText">${this.l("moon")}: 15% (${this.l("moon_rise")} 03:24)</text>
                  </g>

                  <!-- Zeit Cursor -->
                  <g id="timeCursorNode" style="transition: transform 0.4s ease;" transform="translate(330, 35)">
                    <circle cx="0" cy="0" r="7" fill="#6366f1" opacity="0.3"/>
                    <circle cx="0" cy="0" r="4" fill="#ffffff" stroke="#6366f1" stroke-width="2"/>
                    <rect x="-22" y="8" width="44" height="15" rx="4" fill="#1e1b4b" stroke="#6366f1" stroke-width="1"/>
                    <text x="0" y="19" fill="#e0e7ff" font-size="9" font-weight="700" text-anchor="middle" id="timeCursorLabel">00:00</text>
                  </g>

                  <!-- Tagseite Gestrichelt -->
                  <path d="M 70,145 A 260,35 0 0,0 590,145" fill="none" stroke="rgba(245, 158, 11, 0.15)" stroke-width="1.5" stroke-dasharray="3,3"/>
                </svg>
              </div>

              <!-- Dämmerungsleiste -->
              <div class="twilight-wrap">
                <div class="twilight-times">
                  <span id="twilightEveningTime">19:18</span>
                  <span id="twilightNightTime" style="color: #a5b4fc; font-weight: 600;">20:36 bis 05:40 Dunkle Nacht</span>
                  <span id="twilightMorningTime">06:58</span>
                </div>
                <div class="twilight-bar">
                  <div style="width: 12%; background: rgba(245, 158, 11, 0.5);" title="Abenddämmerung"></div>
                  <div style="width: 76%; background: #4f46e5;" title="Astronomische Dunkelheit"></div>
                  <div style="width: 12%; background: rgba(245, 158, 11, 0.5);" title="Morgendämmerung"></div>
                </div>
              </div>
            </div>

            <!-- SICHTBARE ZIELE HEUTE -->
            <div class="panel targets-box">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #e2e8f0; margin: 0;">${this.l("targets_tonight")}</h4>
                <span style="font-size: 10px; color: #94a3b8; font-family: monospace;">${lang === "de" ? "Oktober" : "October"}</span>
              </div>
              <div class="targets-grid">
                <div class="target-item">
                  <span class="target-name" style="color: #fbbf24;">🪐 Saturn</span>
                  <span class="target-time">20:00 – 01:30</span>
                  <span class="target-sub">${this.l("ring_edge")}</span>
                </div>
                <div class="target-item">
                  <span class="target-name" style="color: #38bdf8;">⚪ Jupiter</span>
                  <span class="target-time">${lang === "de" ? "Ab 22:45" : "From 22:45"}</span>
                  <span class="target-sub">${this.l("four_moons")}</span>
                </div>
                <div class="target-item">
                  <span class="target-name" style="color: #a5b4fc;">🌌 M31</span>
                  <span class="target-time">Zenit 23:15</span>
                  <span class="target-sub">${this.l("andromeda_galaxy")}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- SPALTE 2: METRIKEN & STÜNDLICHER VERLAUF -->
          <div class="col">

            <!-- 4 KERN-METRIKEN -->
            <div class="metrics-grid">
              
              <!-- BEWÖLKUNG -->
              <div class="panel metric-card">
                <div class="metric-header">
                  <span class="metric-label">${this.l("cloud_cover")}</span>
                  <span id="cardCloudBadge" class="metric-badge badge-red">69%</span>
                </div>
                <div>
                  <div class="metric-val-wrap">
                    <span id="cardCloudVal" class="metric-val">69</span>
                    <span class="metric-unit">%</span>
                    <span id="cardCloudStatus" class="metric-status" style="color: #f87171;">Hochnebel</span>
                  </div>
                  <div class="metric-bar-bg">
                    <div id="cardCloudBar" class="metric-bar-fill" style="width: 69%; background: #ef4444;"></div>
                  </div>
                </div>
                <div class="metric-footer" style="display: flex; justify-content: space-between;">
                  <span>T: <strong id="cloudLowVal" style="color: #f87171;">85%</strong></span>
                  <span>M: <strong id="cloudMidVal" style="color: #cbd5e1;">15%</strong></span>
                  <span>H: <strong id="cloudHighVal" style="color: #34d399;">0%</strong></span>
                </div>
              </div>

              <!-- FEUCHTE & TAU -->
              <div class="panel metric-card">
                <div class="metric-header">
                  <span class="metric-label">${this.l("humidity_dew")}</span>
                  <span id="cardDewBadge" class="metric-badge badge-red">98%</span>
                </div>
                <div>
                  <div class="metric-val-wrap">
                    <span id="cardDewVal" class="metric-val">98</span>
                    <span class="metric-unit">%</span>
                    <span id="cardDewStatus" class="metric-status" style="color: #f87171;">Tau-Alarm</span>
                  </div>
                  <div class="metric-bar-bg">
                    <div id="cardDewBar" class="metric-bar-fill" style="width: 98%; background: #ef4444;"></div>
                  </div>
                </div>
                <div class="metric-footer">
                  ${this.l("dewpoint")}: <strong id="dewpointVal" style="color: #e2e8f0;">7.5 °C</strong> (${this.l("dew_heater")})
                </div>
              </div>

              <!-- WIND -->
              <div class="panel metric-card">
                <div class="metric-header">
                  <span class="metric-label">${this.l("wind_mount")}</span>
                  <span id="cardWindBadge" class="metric-badge badge-green">${this.l("calm")}</span>
                </div>
                <div>
                  <div class="metric-val-wrap">
                    <span id="cardWindVal" class="metric-val" style="color: #34d399;">3,6</span>
                    <span class="metric-unit">km/h</span>
                    <span id="cardWindStatus" class="metric-status" style="color: #34d399;">Windstill</span>
                  </div>
                  <div class="metric-bar-bg" style="display: flex; gap: 2px;">
                    <div style="width: 33%; background: #10b981; height: 100%;"></div>
                    <div style="width: 33%; background: #334155; height: 100%;"></div>
                    <div style="width: 34%; background: #334155; height: 100%;"></div>
                  </div>
                </div>
                <div class="metric-footer" id="cardWindNote">
                  Kein Wackeln am Stativ
                </div>
              </div>

              <!-- SEEING -->
              <div class="panel metric-card">
                <div class="metric-header">
                  <div style="display: flex; align-items: center;">
                    <span class="metric-label">${this.l("seeing")}</span>
                    <button class="help-btn" id="btnSeeingHelp" title="Was ist Seeing?">?</button>
                  </div>
                  <span id="cardSeeingBadge" class="metric-badge badge-green">${this.l("sharp")}</span>
                </div>
                <div>
                  <div class="metric-val-wrap">
                    <span id="cardSeeingVal" class="metric-val" style="color: #34d399;">1,37</span>
                    <span class="metric-unit">″</span>
                    <span id="cardSeeingStatus" class="metric-status" style="color: #34d399;">Ruhig</span>
                  </div>
                  <div class="metric-bar-bg" style="display: flex; gap: 2px;">
                    <div style="width: 40%; background: #10b981; height: 100%;"></div>
                    <div style="width: 30%; background: #334155; height: 100%;"></div>
                    <div style="width: 30%; background: #334155; height: 100%;"></div>
                  </div>
                </div>
                <div class="metric-footer" id="cardSeeingNote">
                  Scharfe Planetendetails
                </div>

                <!-- SEEING POPOVER -->
                <div class="seeing-popover" id="seeingPopover">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; color: #a5b4fc; font-size: 11px; font-weight: 700;">
                      <span>${this.l("what_is_seeing")}</span>
                      <button id="btnCloseSeeing" style="background:none; border:none; color:#94a3b8; cursor:pointer;">✕</button>
                    </div>
                    <p style="font-size: 10px; color: #cbd5e1; margin-top: 6px; line-height: 1.4;">
                      ${this.l("seeing_explanation")}
                    </p>
                  </div>
                  <button id="btnAckSeeing" style="background: rgba(99, 102, 241, 0.4); border: 1px solid rgba(99, 102, 241, 0.6); color: #e0e7ff; font-size: 10px; font-weight: 700; border-radius: 6px; padding: 4px; cursor: pointer;">
                    ${this.l("understood")}
                  </button>
                </div>
              </div>

            </div>

            <!-- STÜNDLICHER VERLAUF -->
            <div class="panel hourly-box">
              <div class="hourly-header">
                <div>
                  <h4 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #e2e8f0; margin: 0;">${this.l("hourly_forecast")}</h4>
                  <span style="font-size: 9px; color: #94a3b8;">${this.l("hourly_sub")}</span>
                </div>
                <span id="selectedHourBadge" style="font-size: 10px; font-family: monospace; color: #a5b4fc; background: rgba(30, 27, 75, 0.8); border: 1px solid rgba(99, 102, 241, 0.4); padding: 2px 8px; border-radius: 6px;">
                  Fokus: 00:00 Uhr
                </span>
              </div>
              <div class="hourly-grid" id="hourlyGridContainer">
                <!-- Dynamisch -->
              </div>
            </div>

          </div>

          <!-- SPALTE 3: 7-TAGE VORSCHAU -->
          <div class="col">
            <div class="panel forecast-box">
              <div class="forecast-header">
                <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #e2e8f0; margin: 0;">${this.l("forecast_7day")}</h3>
                <span style="font-size: 9px; color: #94a3b8;">${this.l("click_to_switch")}</span>
              </div>

              <div class="forecast-list" id="forecastContainer">
                <!-- Dynamisch -->
              </div>

              <!-- NEUMOND HINWEIS -->
              <div class="notice-box">
                <strong>${this.l("new_moon_notice_title")}</strong> ${this.l("new_moon_notice_text")}
              </div>
            </div>
          </div>

        </div>

      </div>
    `;

    this._bindEvents();
    this._renderDynamicContent();
    this._initialized = true;
  }

  _bindEvents() {
    const root = this.shadowRoot;
    
    root.getElementById('btnPrevDay').addEventListener('click', () => this._changeDay(-1));
    root.getElementById('btnNextDay').addEventListener('click', () => this._changeDay(1));

    const popover = root.getElementById('seeingPopover');
    root.getElementById('btnSeeingHelp').addEventListener('click', () => popover.classList.toggle('open'));
    root.getElementById('btnCloseSeeing').addEventListener('click', () => popover.classList.remove('open'));
    root.getElementById('btnAckSeeing').addEventListener('click', () => popover.classList.remove('open'));
  }

  _changeDay(delta) {
    const days = this._daysData || this._getForecastData();
    let next = this._currentDayIdx + delta;
    if (next < 0) next = days.length - 1;
    if (next >= days.length) next = 0;
    this._currentDayIdx = next;
    this._renderDynamicContent();
  }

  _selectDay(idx) {
    this._currentDayIdx = idx;
    this._renderDynamicContent();
  }

  _selectHour(idx) {
    this._selectedHourIdx = idx;
    const days = this._daysData || this._getForecastData();
    const d = days[this._currentDayIdx];
    const h = d.hourly[idx];
    if (!h) return;

    const root = this.shadowRoot;
    root.getElementById('selectedHourBadge').innerText = `${this.l("focus")}: ${h.time} (${h.clouds}% ${this.l("clouds")}, Seeing ${h.seeing})`;

    const cursorNode = root.getElementById('timeCursorNode');
    if (cursorNode) {
      cursorNode.setAttribute('transform', `translate(${h.cx}, ${h.cy})`);
      root.getElementById('timeCursorLabel').innerText = `${h.time}`;
    }

    this._renderHourlyGrid();
  }

  _renderDynamicContent() {
    const root = this.shadowRoot;
    const days = this._daysData || this._getForecastData();
    const d = days[this._currentDayIdx];
    if (!d) return;

    // Navigator
    root.getElementById('navDayName').innerText = d.name;
    root.getElementById('navDayDate').innerText = d.fullDate;

    // Verdict Hero
    const verdictBox = root.getElementById('verdictBox');
    const verdictIcon = root.getElementById('verdictIconContainer');
    const verdictSvg = root.getElementById('verdictSvg');
    const scoreVal = root.getElementById('verdictScoreVal');

    root.getElementById('verdictTitle').innerText = d.verdict;
    root.getElementById('verdictSummary').innerText = d.desc;
    scoreVal.innerHTML = `${d.score}<span style="font-size: 11px; font-weight: 500; color: #94a3b8;">/100</span>`;

    if (d.color === 'emerald') {
      verdictBox.className = "panel panel-verdict-green hero-card";
      verdictIcon.style.background = "rgba(16, 185, 129, 0.15)";
      verdictIcon.style.borderColor = "rgba(16, 185, 129, 0.3)";
      verdictIcon.style.color = "#34d399";
      verdictSvg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>';
      scoreVal.style.color = "#34d399";
    } else if (d.color === 'amber') {
      verdictBox.className = "panel panel-verdict-amber hero-card";
      verdictIcon.style.background = "rgba(245, 158, 11, 0.15)";
      verdictIcon.style.borderColor = "rgba(245, 158, 11, 0.3)";
      verdictIcon.style.color = "#fbbf24";
      verdictSvg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>';
      scoreVal.style.color = "#fbbf24";
    } else {
      verdictBox.className = "panel panel-verdict-red hero-card";
      verdictIcon.style.background = "rgba(239, 68, 68, 0.15)";
      verdictIcon.style.borderColor = "rgba(239, 68, 68, 0.3)";
      verdictIcon.style.color = "#f87171";
      verdictSvg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>';
      scoreVal.style.color = "#f87171";
    }

    // Kuppel
    root.getElementById('moonNodeText').innerText = d.moonDetail;
    const moonNode = root.getElementById('moonNode');
    if (moonNode) {
      moonNode.setAttribute('transform', `translate(${d.moonX - 395}, ${d.moonY - 55})`);
    }
    root.getElementById('domeSunsetText').innerText = d.sunset;
    root.getElementById('domeSunriseText').innerText = d.sunrise;
    root.getElementById('domeCoreTimeBadge').innerText = d.coreWindow;
    root.getElementById('twilightEveningTime').innerText = d.twilightEvening.split(' ')[0];
    root.getElementById('twilightNightTime').innerText = d.twilightNight;
    root.getElementById('twilightMorningTime').innerText = d.twilightMorning.split(' ')[0];

    // Metriken
    root.getElementById('cardCloudVal').innerText = d.clouds;
    root.getElementById('cardCloudBar').style.width = `${d.clouds}%`;
    root.getElementById('cardCloudBadge').innerText = `${d.clouds}%`;
    root.getElementById('cardCloudStatus').innerText = d.cloudStatus;
    root.getElementById('cloudLowVal').innerText = `${d.cloudLow}%`;
    root.getElementById('cloudMidVal').innerText = `${d.cloudMid}%`;
    root.getElementById('cloudHighVal').innerText = `${d.cloudHigh}%`;

    root.getElementById('cardDewVal').innerText = d.dew;
    root.getElementById('cardDewBar').style.width = `${d.dew}%`;
    root.getElementById('cardDewBadge').innerText = `${d.dew}%`;
    root.getElementById('cardDewStatus').innerText = d.dewStatus;
    root.getElementById('dewpointVal').innerText = `${d.dewpoint} °C`;

    root.getElementById('cardWindVal').innerText = d.wind;
    root.getElementById('cardWindStatus').innerText = d.windStatus;
    root.getElementById('cardWindNote').innerText = d.windNote;

    root.getElementById('cardSeeingVal').innerText = d.seeing;
    root.getElementById('cardSeeingStatus').innerText = d.seeingStatus;
    root.getElementById('cardSeeingNote').innerText = d.seeingNote;

    this._renderHourlyGrid();
    this._renderForecastList();
    this._selectHour(this._selectedHourIdx);
  }

  _renderHourlyGrid() {
    const root = this.shadowRoot;
    const days = this._daysData || this._getForecastData();
    const d = days[this._currentDayIdx];
    const container = root.getElementById('hourlyGridContainer');
    if (!container || !d) return;

    container.innerHTML = d.hourly.map((h, i) => {
      const isSel = i === this._selectedHourIdx;
      const cloudCol = h.clouds < 50 ? '#34d399' : (h.clouds < 75 ? '#fbbf24' : '#f87171');
      return `
        <div class="hour-pill ${isSel ? 'selected' : ''}" data-hour="${i}">
          <span class="hour-time">${h.time}</span>
          <span class="hour-cloud" style="color: ${cloudCol};">${h.clouds}%</span>
          <span class="hour-seeing">${h.seeing}</span>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.hour-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-hour'), 10);
        this._selectHour(idx);
      });
    });
  }

  _renderForecastList() {
    const root = this.shadowRoot;
    const days = this._daysData || this._getForecastData();
    const container = root.getElementById('forecastContainer');
    if (!container) return;

    container.innerHTML = days.map((item, i) => {
      const isSel = i === this._currentDayIdx;
      const scoreCol = item.color === 'emerald' ? '#34d399' : (item.color === 'amber' ? '#fbbf24' : '#f87171');
      const isNeumond = i === 4;

      return `
        <div class="forecast-row ${isSel ? 'selected' : ''}" data-day="${i}">
          <div style="display: flex; align-items: center; min-width: 0; flex: 1;">
            <div>
              <span class="f-day">${item.name}</span>
              <span class="f-date">${item.fullDate.split(', ')[1]}</span>
            </div>
            ${isNeumond ? `<span class="f-badge-neumond">${this.l("new_moon")}</span>` : ''}
          </div>

          <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; margin: 0 10px;">
            <span>${item.moon}</span>
            <span style="color: #94a3b8; font-size: 10px;">☁️ ${item.clouds}%</span>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <div class="range-bar">
              <div class="range-thumb" style="left: ${item.score}%;"></div>
            </div>
            <span class="f-score" style="color: ${scoreCol};">
              ${item.score}%
            </span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.forecast-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-day'), 10);
        this._selectDay(idx);
      });
    });
  }
}

// Custom Element registrieren
customElements.define('astro-weather-card', AstroWeatherCard);

// Visueller Lovelace Editor
class AstroWeatherCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this.render();
  }
  set hass(hass) {
    this._hass = hass;
  }
  render() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .card-config { display: flex; flex-direction: column; gap: 12px; font-family: inherit; }
        .row { display: flex; flex-direction: column; gap: 4px; }
        label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color, #94a3b8); }
        input { padding: 8px 10px; border-radius: 6px; border: 1px solid var(--divider-color, #334155); background: var(--card-background-color, #1e293b); color: var(--primary-text-color, #fff); }
      </style>
      <div class="card-config">
        <div class="row">
          <label>Titel / Standort</label>
          <input id="title" type="text" value="${this._config.title || 'Astro-Wetter'}" />
        </div>
        <div class="row">
          <label>Wetter-Entität</label>
          <input id="weather_entity" type="text" value="${this._config.weather_entity || 'weather.astroweather'}" placeholder="weather.astroweather" />
        </div>
        <div class="row">
          <label>Seeing-Sensor (optional)</label>
          <input id="seeing_entity" type="text" value="${this._config.seeing_entity || ''}" placeholder="sensor.astroweather_backyard_seeing" />
        </div>
        <div class="row">
          <label>Wind-Sensor (optional)</label>
          <input id="wind_entity" type="text" value="${this._config.wind_entity || ''}" placeholder="sensor.astroweather_backyard_10m_wind_speed" />
        </div>
        <div class="row">
          <label>Luftfeuchte-Sensor (optional)</label>
          <input id="humidity_entity" type="text" value="${this._config.humidity_entity || ''}" placeholder="sensor.astroweather_backyard_2m_relative_humidity" />
        </div>
        <div class="row">
          <label>Taupunkt-Sensor (optional)</label>
          <input id="dewpoint_entity" type="text" value="${this._config.dewpoint_entity || ''}" placeholder="sensor.astroweather_backyard_2m_dewpoint" />
        </div>
      </div>
    `;

    const inputs = this.shadowRoot.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        const newConfig = { ...this._config };
        inputs.forEach(i => {
          if (i.value) newConfig[i.id] = i.value;
          else delete newConfig[i.id];
        });
        const event = new CustomEvent('config-changed', {
          detail: { config: newConfig },
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(event);
      });
    });
  }
}
customElements.define('astro-weather-card-editor', AstroWeatherCardEditor);

// Lovelace Custom Card Picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'astro-weather-card',
  name: 'Astro Weather Card',
  description: 'Astronomical Weather & Observation Planning Card with sky dome, seeing, and 7-day forecast.',
  preview: true,
  documentationURL: 'https://github.com/copystring/astro-weather-card'
});
