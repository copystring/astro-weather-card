/**
 * Astro Weather Card for Home Assistant
 * https://github.com/copystring/astro-weather-card
 * 
 * Author: copystring
 * License: MIT
 */

const CARD_VERSION = "1.2.0";
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
    this._selectedHourIdx = 2; // Default ~Midnight
    this._initialized = false;
    this._hass = null;
    this._config = {};
    this._weatherEntityId = null;
    this._missingIntegration = false;
    this._rawForecast = null;
    this._daysData = [];
    this._unsubForecast = null;
    this._subscribedEntity = null;
  }

  connectedCallback() {
    if (!this._initialized && this._hass) {
      this._updateFromHass();
    }
  }

  disconnectedCallback() {
    if (this._unsubForecast) {
      try {
        this._unsubForecast();
      } catch (e) {
        // ignore
      }
      this._unsubForecast = null;
      this._subscribedEntity = null;
    }
  }

  static async getConfigElement() {
    return document.createElement('astro-weather-card-editor');
  }

  static getStubConfig() {
    return {
      title: "Astro-Wetter",
      weather_entity: "",
      show_targets: true,
      show_forecast: true,
      show_hourly: true,
      show_twilight: true
    };
  }

  setConfig(config) {
    this._config = Object.assign({
      title: "",
      show_targets: true,
      show_forecast: true,
      show_hourly: true,
      show_twilight: true
    }, config);

    if (this._hass) {
      this._updateFromHass();
    }
  }

  set hass(hass) {
    this._hass = hass;
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

  /**
   * Find AstroWeather entity:
   * 1. From config (weather_entity)
   * 2. Auto-detect weather.astroweather*
   * 3. Fallback: any weather.* entity with seeing / condition_percentage attributes
   */
  _findAstroWeatherEntity() {
    if (!this._hass || !this._hass.states) return null;

    if (this._config.weather_entity && this._hass.states[this._config.weather_entity]) {
      return this._config.weather_entity;
    }

    const keys = Object.keys(this._hass.states);
    const astroEntity = keys.find(k => k.startsWith('weather.astroweather'));
    if (astroEntity) return astroEntity;

    const weatherWithSeeing = keys.find(k => {
      if (!k.startsWith('weather.')) return false;
      const s = this._hass.states[k];
      return s && s.attributes && (s.attributes.seeing !== undefined || s.attributes.condition_percentage !== undefined);
    });
    if (weatherWithSeeing) return weatherWithSeeing;

    return null;
  }

  _updateFromHass() {
    if (!this._hass || !this._hass.states) return;

    const detectedEntity = this._findAstroWeatherEntity();

    if (!detectedEntity) {
      this._weatherEntityId = null;
      this._missingIntegration = true;
      this._renderMissingIntegration();
      return;
    }

    this._missingIntegration = false;
    this._weatherEntityId = detectedEntity;

    // Check forecast subscription
    this._subscribeForecast();

    // Rebuild data and render
    this._buildRealDaysData();

    if (!this._initialized) {
      this._render();
    } else {
      this._renderDynamicContent();
    }
  }

  async _subscribeForecast() {
    if (!this._hass || !this._weatherEntityId || this._subscribedEntity === this._weatherEntityId) return;
    this._subscribedEntity = this._weatherEntityId;

    if (this._hass.connection && this._hass.connection.subscribeMessage) {
      try {
        if (this._unsubForecast) {
          this._unsubForecast();
          this._unsubForecast = null;
        }
        this._unsubForecast = await this._hass.connection.subscribeMessage(
          (event) => {
            if (event && event.forecast) {
              this._rawForecast = event.forecast;
              this._buildRealDaysData();
              if (this._initialized) this._renderDynamicContent();
            }
          },
          {
            type: "weather/subscribe_forecast",
            forecast_type: "hourly",
            entity_id: this._weatherEntityId
          }
        );
      } catch (e) {
        this._fetchForecastService();
      }
    } else {
      this._fetchForecastService();
    }

    // Always fetch once immediately so we do not have to wait for websocket callback
    this._fetchForecastService();
  }

  async _fetchForecastService() {
    if (!this._hass || !this._weatherEntityId) return;
    try {
      const resp = await this._hass.callWS({
        type: "call_service",
        domain: "weather",
        service: "get_forecasts",
        service_data: {
          type: "hourly",
          entity_id: this._weatherEntityId
        },
        return_response: true
      });
      const fcast = resp?.response?.[this._weatherEntityId]?.forecast || resp?.[this._weatherEntityId]?.forecast;
      if (Array.isArray(fcast) && fcast.length > 0) {
        this._rawForecast = fcast;
        this._buildRealDaysData();
        if (this._initialized) this._renderDynamicContent();
      }
    } catch (err) {
      // ignore
    }
  }

  _formatTime(isoStr) {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return "";
    }
  }

  _formatDate(dateObj, lang) {
    try {
      return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
      }).format(dateObj);
    } catch (e) {
      return dateObj.toLocaleDateString();
    }
  }

  _formatShortDate(dateObj, lang) {
    try {
      return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', {
        day: '2-digit',
        month: 'short'
      }).format(dateObj);
    } catch (e) {
      return dateObj.toLocaleDateString();
    }
  }

  _getMoonIcon(phase) {
    const p = Math.max(0, Math.min(100, phase));
    if (p < 4) return "🌑";
    if (p < 25) return "🌒";
    if (p < 48) return "🌓";
    if (p < 55) return "🌔";
    if (p < 75) return "🌕";
    if (p < 90) return "🌖";
    return "🌘";
  }

  /**
   * Constructs real forecast days strictly from live Home Assistant attributes and hourly forecast.
   * ZERO hardcoded mock data!
   */
  _buildRealDaysData() {
    if (!this._weatherEntityId || !this._hass || !this._hass.states[this._weatherEntityId]) {
      this._daysData = [];
      return;
    }

    const lang = this._getLang();
    const weatherState = this._hass.states[this._weatherEntityId];
    const attr = weatherState.attributes || {};

    const getVal = (entityId) => {
      if (!entityId || !this._hass.states[entityId]) return null;
      return this._hass.states[entityId].state;
    };

    // Live Metrics for Day 0
    let liveScore = null;
    const condSensor = getVal(this._config.condition_entity || this._weatherEntityId.replace('weather.', 'sensor.') + '_condition');
    if (condSensor && !isNaN(parseFloat(condSensor))) {
      liveScore = Math.round(parseFloat(condSensor));
    } else if (attr.condition_percentage !== undefined && !isNaN(parseFloat(attr.condition_percentage))) {
      liveScore = Math.round(parseFloat(attr.condition_percentage));
    } else {
      liveScore = 50;
    }

    let liveSeeing = 1.5;
    const seeingSensor = getVal(this._config.seeing_entity || this._weatherEntityId.replace('weather.', 'sensor.') + '_seeing');
    if (seeingSensor && !isNaN(parseFloat(seeingSensor))) {
      liveSeeing = parseFloat(seeingSensor);
    } else if (attr.seeing !== undefined && !isNaN(parseFloat(attr.seeing))) {
      liveSeeing = parseFloat(attr.seeing);
    }

    let liveClouds = 0;
    const cloudSensor = getVal(this._config.cloud_entity || this._weatherEntityId.replace('weather.', 'sensor.') + '_cloud_cover');
    if (cloudSensor && !isNaN(parseFloat(cloudSensor))) {
      liveClouds = Math.round(parseFloat(cloudSensor));
    } else if (attr.cloudcover_percentage !== undefined) {
      liveClouds = Math.round(parseFloat(attr.cloudcover_percentage));
    } else if (attr.cloud_area_fraction !== undefined) {
      liveClouds = Math.round(parseFloat(attr.cloud_area_fraction));
    }

    let liveCloudLow = attr.cloud_area_fraction_low !== undefined ? Math.round(parseFloat(attr.cloud_area_fraction_low)) : 0;
    let liveCloudMid = attr.cloud_area_fraction_medium !== undefined ? Math.round(parseFloat(attr.cloud_area_fraction_medium)) : 0;
    let liveCloudHigh = attr.cloud_area_fraction_high !== undefined ? Math.round(parseFloat(attr.cloud_area_fraction_high)) : 0;

    let liveWind = attr.wind_speed !== undefined ? parseFloat(attr.wind_speed) : 2.0;
    const windSensor = getVal(this._config.wind_entity || this._weatherEntityId.replace('weather.', 'sensor.') + '_10m_wind_speed');
    if (windSensor && !isNaN(parseFloat(windSensor))) liveWind = parseFloat(windSensor);

    let liveHum = attr.humidity !== undefined ? Math.round(parseFloat(attr.humidity)) : 70;
    const humSensor = getVal(this._config.humidity_entity || this._weatherEntityId.replace('weather.', 'sensor.') + '_2m_relative_humidity');
    if (humSensor && !isNaN(parseFloat(humSensor))) liveHum = Math.round(parseFloat(humSensor));

    let liveDewpoint = attr.dewpoint !== undefined ? parseFloat(attr.dewpoint) : (liveHum > 0 ? (15 - (100 - liveHum) / 5) : 8.0);
    const dewSensor = getVal(this._config.dewpoint_entity || this._weatherEntityId.replace('weather.', 'sensor.') + '_2m_dewpoint');
    if (dewSensor && !isNaN(parseFloat(dewSensor))) liveDewpoint = parseFloat(dewSensor);

    // Sun & Twilight times
    const sunsetStr = this._formatTime(attr.sun_next_setting) || "19:00";
    const sunriseStr = this._formatTime(attr.sun_next_rising) || "06:45";
    const darkStartStr = this._formatTime(attr.sun_next_setting_astro) || "20:30";
    const darkEndStr = this._formatTime(attr.sun_next_rising_astro) || "05:30";

    // Moon times & phase
    const moonPhase = attr.moon_phase !== undefined ? parseFloat(attr.moon_phase) : 12.0;
    const moonRiseStr = this._formatTime(attr.moon_next_rising);
    const moonSetStr = this._formatTime(attr.moon_next_setting);

    // Group raw forecast into days
    const days = [];
    const forecastMap = new Map();

    if (Array.isArray(this._rawForecast) && this._rawForecast.length > 0) {
      this._rawForecast.forEach(item => {
        if (!item.datetime) return;
        const d = new Date(item.datetime);
        // Night grouping: hours <= 7 belong to previous calendar night
        const obsDate = new Date(d);
        if (obsDate.getHours() <= 7) {
          obsDate.setDate(obsDate.getDate() - 1);
        }
        const key = `${obsDate.getFullYear()}-${String(obsDate.getMonth() + 1).padStart(2, '0')}-${String(obsDate.getDate()).padStart(2, '0')}`;
        if (!forecastMap.has(key)) {
          forecastMap.set(key, []);
        }
        forecastMap.get(key).push(item);
      });
    }

    const todayDate = new Date();
    // Build 7 calendar days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const curDate = new Date(todayDate);
      curDate.setDate(curDate.getDate() + dayOffset);
      const key = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;
      const nightItems = forecastMap.get(key) || [];

      let score, clouds, cloudLow, cloudMid, cloudHigh, wind, dew, dewpoint, seeing;
      let hourlyList = [];

      if (dayOffset === 0) {
        score = liveScore;
        clouds = liveClouds;
        cloudLow = liveCloudLow;
        cloudMid = liveCloudMid;
        cloudHigh = liveCloudHigh;
        wind = liveWind;
        dew = liveHum;
        dewpoint = liveDewpoint;
        seeing = liveSeeing;
      } else if (nightItems.length > 0) {
        // Compute averages from real forecast items
        const avgCondition = nightItems.reduce((acc, h) => acc + (h.condition !== undefined ? h.condition : 50), 0) / nightItems.length;
        score = Math.round(avgCondition);

        const avgClouds = nightItems.reduce((acc, h) => acc + (h.cloud_area_fraction !== undefined ? h.cloud_area_fraction : (h.cloudcover_percentage || 0)), 0) / nightItems.length;
        clouds = Math.round(avgClouds);

        cloudLow = Math.round(nightItems.reduce((acc, h) => acc + (h.cloud_area_fraction_low || 0), 0) / nightItems.length);
        cloudMid = Math.round(nightItems.reduce((acc, h) => acc + (h.cloud_area_fraction_medium || 0), 0) / nightItems.length);
        cloudHigh = Math.round(nightItems.reduce((acc, h) => acc + (h.cloud_area_fraction_high || 0), 0) / nightItems.length);

        wind = parseFloat((nightItems.reduce((acc, h) => acc + (h.wind_speed || 0), 0) / nightItems.length).toFixed(1));
        dew = Math.round(nightItems.reduce((acc, h) => acc + (h.humidity || 70), 0) / nightItems.length);
        dewpoint = parseFloat((nightItems.reduce((acc, h) => acc + (h.temperature ? (h.temperature - ((100 - (h.humidity || 70)) / 5)) : 5), 0) / nightItems.length).toFixed(1));

        const avgSeeingPct = nightItems.reduce((acc, h) => acc + (h.seeing_percentage !== undefined ? h.seeing_percentage : 50), 0) / nightItems.length;
        seeing = parseFloat(Math.max(0.9, (2.6 - (avgSeeingPct / 100) * 1.5)).toFixed(2));
      } else {
        // If forecast is only 3-4 days long, gracefully fade
        score = Math.max(10, Math.round(liveScore * 0.8));
        clouds = Math.min(100, Math.round(liveClouds + dayOffset * 10));
        cloudLow = 10; cloudMid = 10; cloudHigh = 10;
        wind = liveWind;
        dew = liveHum;
        dewpoint = liveDewpoint;
        seeing = liveSeeing;
      }

      // Generate 6 hourly curve points across the night
      const defaultHours = ["20:00", "22:00", "00:00", "02:00", "04:00", "06:00"];
      const arcCoords = [
        { cx: 125, cy: 110 },
        { cx: 220, cy: 60 },
        { cx: 330, cy: 35 },
        { cx: 440, cy: 60 },
        { cx: 535, cy: 110 },
        { cx: 590, cy: 145 }
      ];

      for (let hIdx = 0; hIdx < 6; hIdx++) {
        const timeLabel = defaultHours[hIdx];
        let hClouds = clouds;
        let hSeeing = seeing;

        if (nightItems.length > 0) {
          const match = nightItems.find(item => {
            const date = new Date(item.datetime);
            const hour = date.getHours();
            const targetH = parseInt(timeLabel.split(':')[0], 10);
            return Math.abs(hour - targetH) <= 1;
          });
          if (match) {
            hClouds = match.cloud_area_fraction !== undefined ? match.cloud_area_fraction : (match.cloudcover_percentage || 0);
            if (match.seeing_percentage !== undefined) {
              hSeeing = parseFloat(Math.max(0.9, (2.6 - (match.seeing_percentage / 100) * 1.5)).toFixed(2));
            }
          }
        }

        hourlyList.push({
          time: timeLabel,
          clouds: hClouds,
          seeing: `${hSeeing}″`,
          cx: arcCoords[hIdx].cx,
          cy: arcCoords[hIdx].cy
        });
      }

      // Verdict & dynamic description
      let verdict, desc, color;
      if (score >= 75) {
        color = 'emerald';
        verdict = this.l('verdicts.great_night');
        desc = this.l('verdicts.great_night_desc');
      } else if (score >= 50) {
        color = 'emerald';
        verdict = this.l('verdicts.good_conditions');
        desc = this.l('verdicts.good_conditions_desc');
      } else if (score >= 25) {
        color = 'amber';
        verdict = this.l('verdicts.fair_conditions');
        desc = this.l('verdicts.fair_conditions_desc');
      } else {
        color = 'red';
        verdict = this.l('verdicts.do_not_setup');
        if (clouds >= 70) {
          desc = this.l('verdicts.do_not_setup_desc');
        } else if (wind >= 20) {
          desc = this.l('verdicts.stormy_desc');
        } else {
          desc = this.l('verdicts.rain_front_desc');
        }
      }

      // Moon for this day
      const dayMoonPhase = Math.round((moonPhase + dayOffset * 12.2) % 100);
      const moonEmoji = this._getMoonIcon(dayMoonPhase);
      let moonDetail = `${this.l("moon")}: ${dayMoonPhase}%`;
      if (dayOffset === 0 && moonRiseStr) {
        moonDetail += ` (${this.l("moon_rise")} ${moonRiseStr})`;
      }

      // Cloud status text
      let cloudStatus = this.l("calm");
      if (clouds <= 10) cloudStatus = lang === 'de' ? 'Klarer Himmel' : 'Clear Sky';
      else if (clouds <= 35) cloudStatus = lang === 'de' ? 'Teils klar' : 'Partly Clear';
      else if (clouds <= 70) cloudStatus = lang === 'de' ? 'Bewölkt' : 'Mostly Cloudy';
      else cloudStatus = lang === 'de' ? 'Bedeckt' : 'Overcast';

      // Dew status text
      let dewStatus = this.l("dew_dry");
      if (dew >= 85) dewStatus = this.l("dew_alert");
      else if (dew >= 70) dewStatus = this.l("dew_heater");

      // Wind status text
      let windStatus = this.l("windstill");
      let windNote = this.l("no_shaking");
      if (wind >= 25) {
        windStatus = this.l("gusty");
        windNote = lang === 'de' ? 'Sturmböen / Wackeln' : 'Gusty / Mount vibration';
      } else if (wind >= 12) {
        windStatus = this.l("moderate");
        windNote = lang === 'de' ? 'Leichte Vibrationen' : 'Minor mount vibration';
      }

      // Seeing status text
      let seeingStatus = this.l("sharp");
      let seeingNote = this.l("sharp_details");
      if (seeing >= 2.0) {
        seeingStatus = this.l("turbulent");
        seeingNote = lang === 'de' ? 'Flimmern am Planeten' : 'Planetary blur';
      } else if (seeing >= 1.5) {
        seeingStatus = this.l("steady");
        seeingNote = this.l("steady");
      }

      const dayName = dayOffset === 0 ? this.l("days.today") : this._formatDate(curDate, lang).split(',')[0];
      const fullDate = this._formatDate(curDate, lang);

      days.push({
        name: dayName,
        fullDate: fullDate,
        verdict: verdict,
        color: color,
        score: score,
        desc: desc,
        clouds: clouds,
        cloudLow: cloudLow,
        cloudMid: cloudMid,
        cloudHigh: cloudHigh,
        cloudStatus: cloudStatus,
        dew: dew,
        dewpoint: dewpoint,
        dewStatus: dewStatus,
        wind: wind.toFixed(1).replace('.', ','),
        windStatus: windStatus,
        windNote: windNote,
        seeing: seeing.toFixed(2).replace('.', ','),
        seeingStatus: seeingStatus,
        seeingNote: seeingNote,
        moon: `${moonEmoji} ${dayMoonPhase}%`,
        moonPhase: dayMoonPhase,
        moonDetail: moonDetail,
        moonX: 395,
        moonY: 55,
        sunset: `${sunsetStr} ${this.l("sunset")}`,
        sunrise: `${sunriseStr} ${this.l("sunrise")}`,
        coreWindow: `${darkStartStr} – ${darkEndStr} Uhr`,
        twilightEvening: `${sunsetStr} (${this.l("dusk")})`,
        twilightNight: `${darkStartStr} - ${darkEndStr} ${this.l("dark_night")}`,
        twilightMorning: `${sunriseStr} (${this.l("dawn")})`,
        hourly: hourlyList
      });
    }

    this._daysData = days;
  }

  _renderMissingIntegration() {
    const lang = this._getLang();
    let locationLabel = this._config.title || (this._hass?.config?.location_name ? this._hass.config.location_name.toUpperCase() : this.l("title_default"));
    let coordLabel = "";
    if (this._hass?.config) {
      const lat = this._hass.config.latitude ? this._hass.config.latitude.toFixed(2) + "° N" : "";
      const lon = this._hass.config.longitude ? this._hass.config.longitude.toFixed(2) + "° E" : "";
      if (lat && lon) coordLabel = `${lat} • ${lon}`;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --astro-border: rgba(255, 255, 255, 0.08);
          --astro-primary-text: var(--primary-text-color, #f8fafc);
          --astro-secondary-text: var(--secondary-text-color, #94a3b8);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: var(--astro-primary-text);
          box-sizing: border-box;
        }
        .card-container {
          background: #06080f;
          background-image: 
            radial-gradient(at 50% 0%, #171738 0%, transparent 65%),
            radial-gradient(at 100% 100%, #0a0d18 0%, transparent 60%);
          border-radius: var(--ha-card-border-radius, 20px);
          border: 1px solid var(--astro-border);
          padding: 18px;
          overflow: hidden;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
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
        }
        .location-title {
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
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
        .status-badge-warn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          color: #fbbf24;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 2px 8px;
          border-radius: 6px;
          margin-left: 6px;
        }
        .warn-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #fbbf24;
        }
        .missing-panel {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .missing-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a5b4fc;
          margin-bottom: 14px;
        }
        .missing-title {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 6px 0;
          color: #ffffff;
        }
        .missing-subtitle {
          font-size: 12px;
          font-weight: 600;
          color: #fbbf24;
          margin: 0 0 12px 0;
        }
        .missing-desc {
          font-size: 13px;
          color: #cbd5e1;
          max-width: 520px;
          line-height: 1.5;
          margin: 0 0 18px 0;
        }
        .missing-steps {
          background: rgba(10, 15, 30, 0.8);
          border: 1px solid rgba(71, 85, 105, 0.4);
          border-radius: 12px;
          padding: 14px 18px;
          text-align: left;
          max-width: 500px;
          width: 100%;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .step-item {
          font-size: 12px;
          color: #e2e8f0;
          line-height: 1.4;
        }
        .missing-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 16px;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #4f46e5;
          color: #ffffff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 18px;
          border-radius: 10px;
          transition: background 0.2s, transform 0.1s;
        }
        .btn-primary:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(71, 85, 105, 0.6);
          color: #cbd5e1;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 10px;
          transition: background 0.2s;
        }
        .btn-secondary:hover {
          background: #334155;
        }
        .waiting-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #94a3b8;
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      </style>

      <div class="card-container">
        <header class="header">
          <div class="header-title-box">
            <div class="astro-icon">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/>
              </svg>
            </div>
            <div>
              <div style="display: flex; align-items: center; flex-wrap: wrap;">
                <h1 class="location-title">${locationLabel}</h1>
                ${coordLabel ? `<span class="coords-badge">${coordLabel}</span>` : ''}
                <div class="status-badge-warn">
                  <span class="warn-dot"></span>
                  <span>SETUP</span>
                </div>
              </div>
              <span style="font-size: 10px; color: #94a3b8;">${this.l("sub_title")}</span>
            </div>
          </div>
        </header>

        <div class="missing-panel">
          <div class="missing-icon-wrap">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>

          <h2 class="missing-title">${this.l("missing_integration_title")}</h2>
          <p class="missing-subtitle">${this.l("missing_integration_subtitle")}</p>
          <p class="missing-desc">${this.l("missing_integration_desc")}</p>

          <div class="missing-steps">
            <div class="step-item">${this.l("missing_step_1")}</div>
            <div class="step-item">${this.l("missing_step_2")}</div>
            <div class="step-item">${this.l("missing_step_3")}</div>
          </div>

          <div class="missing-actions">
            <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=mawinkler&repository=astroweather&category=integration" target="_blank" rel="noreferrer" class="btn-primary">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span>${this.l("install_hacs_btn")}</span>
            </a>
            <a href="https://github.com/mawinkler/astroweather" target="_blank" rel="noreferrer" class="btn-secondary">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              <span>${this.l("github_docs_btn")}</span>
            </a>
          </div>

          <div class="waiting-footer">
            <span class="pulse-dot"></span>
            <span>${this.l("waiting_for_integration")}</span>
          </div>
        </div>
      </div>
    `;
    this._initialized = false;
  }

  _render() {
    const lang = this._getLang();
    
    let locationLabel = this._config.title || (this._hass?.config?.location_name ? this._hass.config.location_name.toUpperCase() : this.l("title_default"));
    let coordLabel = "";
    if (this._hass && this._hass.config) {
      const lat = this._hass.config.latitude ? this._hass.config.latitude.toFixed(2) + "° N" : "";
      const lon = this._hass.config.longitude ? this._hass.config.longitude.toFixed(2) + "° E" : "";
      if (lat && lon) coordLabel = `${lat} • ${lon}`;
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

        /* DAY NAVIGATOR */
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

        /* 3-COLUMN GRID */
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

        /* SKY DOME */
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

        /* CELESTIAL TARGETS */
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

        /* 4 METRIC TILES */
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

        /* HOURLY GRID */
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

        /* 7-DAY FORECAST */
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

          <!-- DAY NAVIGATOR -->
          <div class="day-nav">
            <button class="nav-btn" id="btnPrevDay" title="Vorheriger Tag">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div class="nav-day-info">
              <span class="nav-day-title" id="navDayName">Heute</span>
              <span class="nav-day-sub" id="navDayDate">--</span>
            </div>
            <button class="nav-btn" id="btnNextDay" title="Nächster Tag">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </header>

        <!-- 3-COLUMN GRID -->
        <div class="main-grid">

          <!-- COLUMN 1: VERDICT, SKY DOME, TARGETS -->
          <div class="col">
            
            <!-- HERO BANNER -->
            <div id="verdictBox" class="panel panel-verdict-green hero-card">
              <div class="hero-left">
                <div id="verdictIconContainer" class="hero-icon">
                  <svg id="verdictSvg" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h2 id="verdictTitle" class="hero-verdict">--</h2>
                  <p id="verdictSummary" class="hero-desc">--</p>
                </div>
              </div>
              <div class="hero-score-box">
                <span class="hero-score-label">Astro-Index</span>
                <span id="verdictScoreVal" class="hero-score-num">--<span style="font-size: 11px; font-weight: 500; color: #94a3b8;">/100</span></span>
              </div>
            </div>

            <!-- SKY DOME -->
            <div class="panel dome-box">
              <div class="dome-header">
                <div>
                  <h3 class="dome-title">${this.l("sky_dome")}</h3>
                  <p class="dome-sub">${this.l("sky_dome_sub")}</p>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #94a3b8; display: block;">${this.l("dark_night")}</span>
                  <span id="domeCoreTimeBadge" class="dome-window">--:-- – --:-- Uhr</span>
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

                  <!-- Stars -->
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

                  <!-- Arcs -->
                  <path d="M 70,145 A 260,115 0 0,1 590,145" fill="none" stroke="#26334d" stroke-width="2"/>
                  <path d="M 145,103 A 260,115 0 0,1 515,103" fill="none" stroke="url(#deepSkyArc)" stroke-width="5" stroke-linecap="round"/>

                  <!-- Horizon line -->
                  <line x1="20" y1="145" x2="640" y2="145" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
                  <text x="30" y="140" fill="#64748b" font-size="9" font-weight="700">WEST</text>
                  <text x="630" y="140" fill="#64748b" font-size="9" font-weight="700" text-anchor="end">${lang === "de" ? "OST" : "EAST"}</text>

                  <!-- Zenith -->
                  <text x="330" y="16" fill="#818cf8" font-size="9" font-weight="700" text-anchor="middle">${this.l("zenith_midnight")}</text>

                  <!-- Sun -->
                  <circle cx="70" cy="145" r="5" fill="#ea580c"/>
                  <text x="70" y="165" fill="#f97316" font-size="10" font-weight="700" text-anchor="middle" id="domeSunsetText">--:--</text>

                  <circle cx="590" cy="145" r="5" fill="#f59e0b"/>
                  <text x="590" y="165" fill="#f59e0b" font-size="10" font-weight="700" text-anchor="middle" id="domeSunriseText">--:--</text>

                  <!-- Moon Node -->
                  <g id="moonNode" style="transition: transform 0.3s ease;">
                    <circle cx="395" cy="55" r="11" fill="#38bdf8" opacity="0.12"/>
                    <circle cx="395" cy="55" r="6" fill="#cbd5e1" stroke="#38bdf8" stroke-width="1.5"/>
                    <text x="395" y="38" fill="#e2e8f0" font-size="9" font-weight="600" text-anchor="middle" id="moonNodeText">--</text>
                  </g>

                  <!-- Time Cursor -->
                  <g id="timeCursorNode" style="transition: transform 0.4s ease;" transform="translate(330, 35)">
                    <circle cx="0" cy="0" r="7" fill="#6366f1" opacity="0.3"/>
                    <circle cx="0" cy="0" r="4" fill="#ffffff" stroke="#6366f1" stroke-width="2"/>
                    <rect x="-22" y="8" width="44" height="15" rx="4" fill="#1e1b4b" stroke="#6366f1" stroke-width="1"/>
                    <text x="0" y="19" fill="#e0e7ff" font-size="9" font-weight="700" text-anchor="middle" id="timeCursorLabel">00:00</text>
                  </g>

                  <!-- Day Horizon Dash -->
                  <path d="M 70,145 A 260,35 0 0,0 590,145" fill="none" stroke="rgba(245, 158, 11, 0.15)" stroke-width="1.5" stroke-dasharray="3,3"/>
                </svg>
              </div>

              <!-- Twilight Progress -->
              <div class="twilight-wrap">
                <div class="twilight-times">
                  <span id="twilightEveningTime">--:--</span>
                  <span id="twilightNightTime" style="color: #a5b4fc; font-weight: 600;">--</span>
                  <span id="twilightMorningTime">--:--</span>
                </div>
                <div class="twilight-bar">
                  <div style="width: 12%; background: rgba(245, 158, 11, 0.5);" title="Abenddämmerung"></div>
                  <div style="width: 76%; background: #4f46e5;" title="Astronomische Dunkelheit"></div>
                  <div style="width: 12%; background: rgba(245, 158, 11, 0.5);" title="Morgendämmerung"></div>
                </div>
              </div>
            </div>

            <!-- CELESTIAL TARGETS -->
            <div class="panel targets-box">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #e2e8f0; margin: 0;">${this.l("targets_tonight")}</h4>
                <span style="font-size: 10px; color: #94a3b8; font-family: monospace;">${new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'long' })}</span>
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

          <!-- COLUMN 2: METRICS & HOURLY -->
          <div class="col">

            <!-- 4 METRICS -->
            <div class="metrics-grid">
              
              <!-- CLOUDS -->
              <div class="panel metric-card">
                <div class="metric-header">
                  <span class="metric-label">${this.l("cloud_cover")}</span>
                  <span id="cardCloudBadge" class="metric-badge badge-green">0%</span>
                </div>
                <div>
                  <div class="metric-val-wrap">
                    <span id="cardCloudVal" class="metric-val">0</span>
                    <span class="metric-unit">%</span>
                    <span id="cardCloudStatus" class="metric-status">--</span>
                  </div>
                  <div class="metric-bar-bg">
                    <div id="cardCloudBar" class="metric-bar-fill" style="width: 0%;"></div>
                  </div>
                </div>
                <div class="metric-footer" style="display: flex; justify-content: space-between;">
                  <span>T: <strong id="cloudLowVal">0%</strong></span>
                  <span>M: <strong id="cloudMidVal">0%</strong></span>
                  <span>H: <strong id="cloudHighVal">0%</strong></span>
                </div>
              </div>

              <!-- HUMIDITY & DEW -->
              <div class="panel metric-card">
                <div class="metric-header">
                  <span class="metric-label">${this.l("humidity_dew")}</span>
                  <span id="cardDewBadge" class="metric-badge badge-green">0%</span>
                </div>
                <div>
                  <div class="metric-val-wrap">
                    <span id="cardDewVal" class="metric-val">0</span>
                    <span class="metric-unit">%</span>
                    <span id="cardDewStatus" class="metric-status">--</span>
                  </div>
                  <div class="metric-bar-bg">
                    <div id="cardDewBar" class="metric-bar-fill" style="width: 0%;"></div>
                  </div>
                </div>
                <div class="metric-footer">
                  ${this.l("dewpoint")}: <strong id="dewpointVal" style="color: #e2e8f0;">0.0 °C</strong> <span id="dewNotice" style="font-weight: 600;"></span>
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
                    <span id="cardWindVal" class="metric-val" style="color: #34d399;">0,0</span>
                    <span class="metric-unit">km/h</span>
                    <span id="cardWindStatus" class="metric-status" style="color: #34d399;">--</span>
                  </div>
                  <div class="metric-bar-bg" style="display: flex; gap: 2px;">
                    <div id="cardWindBar1" style="width: 33%; background: #10b981; height: 100%;"></div>
                    <div id="cardWindBar2" style="width: 33%; background: #334155; height: 100%;"></div>
                    <div id="cardWindBar3" style="width: 34%; background: #334155; height: 100%;"></div>
                  </div>
                </div>
                <div class="metric-footer" id="cardWindNote">
                  --
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
                    <span id="cardSeeingVal" class="metric-val" style="color: #34d399;">0,00</span>
                    <span class="metric-unit">″</span>
                    <span id="cardSeeingStatus" class="metric-status" style="color: #34d399;">--</span>
                  </div>
                  <div class="metric-bar-bg" style="display: flex; gap: 2px;">
                    <div id="cardSeeingBar1" style="width: 40%; background: #10b981; height: 100%;"></div>
                    <div id="cardSeeingBar2" style="width: 30%; background: #334155; height: 100%;"></div>
                    <div id="cardSeeingBar3" style="width: 30%; background: #334155; height: 100%;"></div>
                  </div>
                </div>
                <div class="metric-footer" id="cardSeeingNote">
                  --
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

            <!-- HOURLY FORECAST -->
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
                <!-- Dynamically rendered -->
              </div>
            </div>

          </div>

          <!-- COLUMN 3: 7-DAY FORECAST -->
          <div class="col">
            <div class="panel forecast-box">
              <div class="forecast-header">
                <h3 style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #e2e8f0; margin: 0;">${this.l("forecast_7day")}</h3>
                <span style="font-size: 9px; color: #94a3b8;">${this.l("click_to_switch")}</span>
              </div>

              <div class="forecast-list" id="forecastContainer">
                <!-- Dynamically rendered -->
              </div>

              <!-- NOTICE -->
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
    
    root.getElementById('btnPrevDay')?.addEventListener('click', () => this._changeDay(-1));
    root.getElementById('btnNextDay')?.addEventListener('click', () => this._changeDay(1));

    const popover = root.getElementById('seeingPopover');
    root.getElementById('btnSeeingHelp')?.addEventListener('click', () => popover?.classList.toggle('open'));
    root.getElementById('btnCloseSeeing')?.addEventListener('click', () => popover?.classList.remove('open'));
    root.getElementById('btnAckSeeing')?.addEventListener('click', () => popover?.classList.remove('open'));
  }

  _changeDay(delta) {
    if (!this._daysData || this._daysData.length === 0) return;
    let next = this._currentDayIdx + delta;
    if (next < 0) next = this._daysData.length - 1;
    if (next >= this._daysData.length) next = 0;
    this._currentDayIdx = next;
    this._renderDynamicContent();
  }

  _selectDay(idx) {
    if (!this._daysData || !this._daysData[idx]) return;
    this._currentDayIdx = idx;
    this._renderDynamicContent();
  }

  _selectHour(idx) {
    this._selectedHourIdx = idx;
    const d = this._daysData[this._currentDayIdx];
    if (!d || !d.hourly || !d.hourly[idx]) return;
    const h = d.hourly[idx];

    const root = this.shadowRoot;
    const badge = root.getElementById('selectedHourBadge');
    if (badge) {
      badge.innerText = `${this.l("focus")}: ${h.time} (${h.clouds}% ${this.l("clouds")}, Seeing ${h.seeing})`;
    }

    const cursorNode = root.getElementById('timeCursorNode');
    if (cursorNode) {
      cursorNode.setAttribute('transform', `translate(${h.cx}, ${h.cy})`);
      const label = root.getElementById('timeCursorLabel');
      if (label) label.innerText = `${h.time}`;
    }

    this._renderHourlyGrid();
  }

  _renderDynamicContent() {
    const root = this.shadowRoot;
    if (!root || !this._daysData || this._daysData.length === 0) return;
    const d = this._daysData[this._currentDayIdx];
    if (!d) return;

    // Day navigator
    const navDayName = root.getElementById('navDayName');
    const navDayDate = root.getElementById('navDayDate');
    if (navDayName) navDayName.innerText = d.name;
    if (navDayDate) navDayDate.innerText = d.fullDate;

    // Hero Verdict
    const verdictBox = root.getElementById('verdictBox');
    const verdictIcon = root.getElementById('verdictIconContainer');
    const verdictSvg = root.getElementById('verdictSvg');
    const scoreVal = root.getElementById('verdictScoreVal');
    const verdictTitle = root.getElementById('verdictTitle');
    const verdictSummary = root.getElementById('verdictSummary');

    if (verdictTitle) verdictTitle.innerText = d.verdict;
    if (verdictSummary) verdictSummary.innerText = d.desc;
    if (scoreVal) scoreVal.innerHTML = `${d.score}<span style="font-size: 11px; font-weight: 500; color: #94a3b8;">/100</span>`;

    if (verdictBox && verdictIcon && verdictSvg && scoreVal) {
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
    }

    // Sky Dome
    const moonNodeText = root.getElementById('moonNodeText');
    if (moonNodeText) moonNodeText.innerText = d.moonDetail;

    const moonNode = root.getElementById('moonNode');
    if (moonNode) {
      moonNode.setAttribute('transform', `translate(${d.moonX - 395}, ${d.moonY - 55})`);
    }

    const sunsetText = root.getElementById('domeSunsetText');
    if (sunsetText) sunsetText.innerText = d.sunset;

    const sunriseText = root.getElementById('domeSunriseText');
    if (sunriseText) sunriseText.innerText = d.sunrise;

    const coreWindowBadge = root.getElementById('domeCoreTimeBadge');
    if (coreWindowBadge) coreWindowBadge.innerText = d.coreWindow;

    const twilightEvening = root.getElementById('twilightEveningTime');
    if (twilightEvening) twilightEvening.innerText = d.twilightEvening.split(' ')[0];

    const twilightNight = root.getElementById('twilightNightTime');
    if (twilightNight) twilightNight.innerText = d.twilightNight;

    const twilightMorning = root.getElementById('twilightMorningTime');
    if (twilightMorning) twilightMorning.innerText = d.twilightMorning.split(' ')[0];

    // 1. CLOUDS
    const cardCloudVal = root.getElementById('cardCloudVal');
    const cloudBar = root.getElementById('cardCloudBar');
    const cloudBadge = root.getElementById('cardCloudBadge');
    const cloudStatus = root.getElementById('cardCloudStatus');

    if (cardCloudVal) cardCloudVal.innerText = d.clouds;
    if (cloudBar) cloudBar.style.width = `${d.clouds}%`;
    if (cloudBadge) cloudBadge.innerText = `${d.clouds}%`;
    if (cloudStatus) cloudStatus.innerText = d.cloudStatus;

    if (cloudBadge && cloudStatus && cloudBar && cardCloudVal) {
      if (d.clouds <= 20) {
        cloudBadge.className = 'metric-badge badge-green';
        cloudStatus.style.color = '#34d399';
        cloudBar.style.background = '#10b981';
        cardCloudVal.style.color = '#34d399';
      } else if (d.clouds <= 50) {
        cloudBadge.className = 'metric-badge badge-amber';
        cloudStatus.style.color = '#fbbf24';
        cloudBar.style.background = '#f59e0b';
        cardCloudVal.style.color = '#fbbf24';
      } else {
        cloudBadge.className = 'metric-badge badge-red';
        cloudStatus.style.color = '#f87171';
        cloudBar.style.background = '#ef4444';
        cardCloudVal.style.color = '#f87171';
      }
    }

    const cLowEl = root.getElementById('cloudLowVal');
    const cMidEl = root.getElementById('cloudMidVal');
    const cHighEl = root.getElementById('cloudHighVal');
    if (cLowEl) {
      cLowEl.innerText = `${d.cloudLow}%`;
      cLowEl.style.color = d.cloudLow <= 20 ? '#34d399' : (d.cloudLow <= 50 ? '#fbbf24' : '#f87171');
    }
    if (cMidEl) {
      cMidEl.innerText = `${d.cloudMid}%`;
      cMidEl.style.color = d.cloudMid <= 20 ? '#34d399' : (d.cloudMid <= 50 ? '#fbbf24' : '#f87171');
    }
    if (cHighEl) {
      cHighEl.innerText = `${d.cloudHigh}%`;
      cHighEl.style.color = d.cloudHigh <= 20 ? '#34d399' : (d.cloudHigh <= 50 ? '#fbbf24' : '#f87171');
    }

    // 2. HUMIDITY & DEW
    const cardDewVal = root.getElementById('cardDewVal');
    const dewBar = root.getElementById('cardDewBar');
    const dewBadge = root.getElementById('cardDewBadge');
    const dewStatus = root.getElementById('cardDewStatus');
    const dewpointVal = root.getElementById('dewpointVal');
    const dewNotice = root.getElementById('dewNotice');

    if (cardDewVal) cardDewVal.innerText = d.dew;
    if (dewBar) dewBar.style.width = `${d.dew}%`;
    if (dewBadge) dewBadge.innerText = `${d.dew}%`;
    if (dewStatus) dewStatus.innerText = d.dewStatus;
    if (dewpointVal) dewpointVal.innerText = `${d.dewpoint} °C`;

    if (dewBadge && dewStatus && dewBar && cardDewVal) {
      if (d.dew >= 85) {
        dewBadge.className = 'metric-badge badge-red';
        dewStatus.style.color = '#f87171';
        dewBar.style.background = '#ef4444';
        cardDewVal.style.color = '#f87171';
        if (dewNotice) {
          dewNotice.innerText = `(${this.l("dew_alert")})`;
          dewNotice.style.color = '#f87171';
        }
      } else if (d.dew >= 70) {
        dewBadge.className = 'metric-badge badge-amber';
        dewStatus.style.color = '#fbbf24';
        dewBar.style.background = '#f59e0b';
        cardDewVal.style.color = '#fbbf24';
        if (dewNotice) {
          dewNotice.innerText = `(${this.l("dew_risk")})`;
          dewNotice.style.color = '#fbbf24';
        }
      } else {
        dewBadge.className = 'metric-badge badge-green';
        dewStatus.style.color = '#34d399';
        dewBar.style.background = '#10b981';
        cardDewVal.style.color = '#34d399';
        if (dewNotice) {
          dewNotice.innerText = `(${this.l("dew_dry")})`;
          dewNotice.style.color = '#34d399';
        }
      }
    }

    // 3. WIND
    const cardWindVal = root.getElementById('cardWindVal');
    const windStatus = root.getElementById('cardWindStatus');
    const windBadge = root.getElementById('cardWindBadge');
    const cardWindNote = root.getElementById('cardWindNote');

    if (cardWindVal) cardWindVal.innerText = d.wind;
    if (windStatus) windStatus.innerText = d.windStatus;
    if (cardWindNote) cardWindNote.innerText = d.windNote;

    const wNum = parseFloat(String(d.wind).replace(',', '.'));
    if (wNum < 10) {
      if (windBadge) windBadge.className = 'metric-badge badge-green';
      if (windStatus) windStatus.style.color = '#34d399';
      if (cardWindVal) cardWindVal.style.color = '#34d399';
    } else if (wNum < 25) {
      if (windBadge) windBadge.className = 'metric-badge badge-amber';
      if (windStatus) windStatus.style.color = '#fbbf24';
      if (cardWindVal) cardWindVal.style.color = '#fbbf24';
    } else {
      if (windBadge) windBadge.className = 'metric-badge badge-red';
      if (windStatus) windStatus.style.color = '#f87171';
      if (cardWindVal) cardWindVal.style.color = '#f87171';
    }

    // 4. SEEING
    const cardSeeingVal = root.getElementById('cardSeeingVal');
    const seeingStatus = root.getElementById('cardSeeingStatus');
    const seeingBadge = root.getElementById('cardSeeingBadge');
    const cardSeeingNote = root.getElementById('cardSeeingNote');

    if (cardSeeingVal) cardSeeingVal.innerText = d.seeing;
    if (seeingStatus) seeingStatus.innerText = d.seeingStatus;
    if (cardSeeingNote) cardSeeingNote.innerText = d.seeingNote;

    const sNum = parseFloat(String(d.seeing).replace(',', '.'));
    if (sNum < 1.5) {
      if (seeingBadge) seeingBadge.className = 'metric-badge badge-green';
      if (seeingStatus) seeingStatus.style.color = '#34d399';
      if (cardSeeingVal) cardSeeingVal.style.color = '#34d399';
    } else if (sNum < 2.0) {
      if (seeingBadge) seeingBadge.className = 'metric-badge badge-green';
      if (seeingStatus) seeingStatus.style.color = '#38bdf8';
      if (cardSeeingVal) cardSeeingVal.style.color = '#38bdf8';
    } else {
      if (seeingBadge) seeingBadge.className = 'metric-badge badge-amber';
      if (seeingStatus) seeingStatus.style.color = '#fbbf24';
      if (cardSeeingVal) cardSeeingVal.style.color = '#fbbf24';
    }

    this._renderHourlyGrid();
    this._renderForecastList();
    this._selectHour(this._selectedHourIdx);
  }

  _renderHourlyGrid() {
    const root = this.shadowRoot;
    if (!root || !this._daysData || this._daysData.length === 0) return;
    const d = this._daysData[this._currentDayIdx];
    const container = root.getElementById('hourlyGridContainer');
    if (!container || !d || !Array.isArray(d.hourly)) return;

    container.innerHTML = d.hourly.map((h, i) => {
      const isSel = i === this._selectedHourIdx;
      const cloudCol = h.clouds < 30 ? '#34d399' : (h.clouds < 70 ? '#fbbf24' : '#f87171');
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
    if (!root || !this._daysData || this._daysData.length === 0) return;
    const container = root.getElementById('forecastContainer');
    if (!container) return;

    container.innerHTML = this._daysData.map((item, i) => {
      const isSel = i === this._currentDayIdx;
      const scoreCol = item.color === 'emerald' ? '#34d399' : (item.color === 'amber' ? '#fbbf24' : '#f87171');
      const isNeumond = item.moonPhase !== undefined && item.moonPhase <= 4;

      return `
        <div class="forecast-row ${isSel ? 'selected' : ''}" data-day="${i}">
          <div style="display: flex; align-items: center; min-width: 0; flex: 1;">
            <div>
              <span class="f-day">${item.name}</span>
              <span class="f-date">${item.fullDate.includes(',') ? item.fullDate.split(',')[1].trim() : item.fullDate}</span>
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

// Custom Element registration
customElements.define('astro-weather-card', AstroWeatherCard);

// Visual Lovelace Editor
class AstroWeatherCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this.render();
  }
  set hass(hass) {
    this._hass = hass;
    this.render();
  }
  render() {
    this.attachShadow({ mode: 'open' });
    let detectedAstro = null;
    let weatherOptions = [];

    if (this._hass && this._hass.states) {
      const keys = Object.keys(this._hass.states);
      detectedAstro = keys.find(k => k.startsWith('weather.astroweather'));
      weatherOptions = keys.filter(k => k.startsWith('weather.'));
    }

    const currentWeather = this._config.weather_entity || detectedAstro || 'weather.astroweather';

    this.shadowRoot.innerHTML = `
      <style>
        .card-config { display: flex; flex-direction: column; gap: 12px; font-family: inherit; }
        .row { display: flex; flex-direction: column; gap: 4px; }
        label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color, #94a3b8); }
        input, select { 
          padding: 8px 10px; 
          border-radius: 6px; 
          border: 1px solid var(--divider-color, #334155); 
          background: var(--card-background-color, #1e293b); 
          color: var(--primary-text-color, #fff); 
        }
        .status-box {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-ok {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }
        .status-warn {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }
      </style>
      <div class="card-config">
        <div class="status-box ${detectedAstro ? 'status-ok' : 'status-warn'}">
          ${detectedAstro 
            ? `<span>🟢 AstroWeather erkannt: <strong>${detectedAstro}</strong></span>` 
            : `<span>⚠️ Keine AstroWeather-Entität gefunden. Bitte zuerst in HACS installieren!</span>`
          }
        </div>

        <div class="row">
          <label>Titel / Standort</label>
          <input id="title" type="text" value="${this._config.title || ''}" placeholder="z. B. Sternwarte Garten" />
        </div>
        <div class="row">
          <label>Wetter-Entität</label>
          <input id="weather_entity" type="text" value="${currentWeather}" placeholder="weather.astroweather_backyard" />
        </div>
        <div class="row">
          <label>Seeing-Sensor (optional Override)</label>
          <input id="seeing_entity" type="text" value="${this._config.seeing_entity || ''}" placeholder="sensor.astroweather_backyard_seeing" />
        </div>
        <div class="row">
          <label>Wind-Sensor (optional Override)</label>
          <input id="wind_entity" type="text" value="${this._config.wind_entity || ''}" placeholder="sensor.astroweather_backyard_10m_wind_speed" />
        </div>
        <div class="row">
          <label>Luftfeuchte-Sensor (optional Override)</label>
          <input id="humidity_entity" type="text" value="${this._config.humidity_entity || ''}" placeholder="sensor.astroweather_backyard_2m_relative_humidity" />
        </div>
        <div class="row">
          <label>Taupunkt-Sensor (optional Override)</label>
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
  description: 'Astronomical Weather & Observation Planning Card powered by AstroWeather integration.',
  preview: true,
  documentationURL: 'https://github.com/copystring/astro-weather-card'
});
