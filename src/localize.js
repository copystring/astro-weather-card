// Internationalization (i18n) for Astro Weather Card

export const languages = {
  en: {
    title_default: "Astro Weather",
    sub_title: "Astro Weather & Observing Window",
    live: "LIVE",
    today: "Today",
    astro_index: "Astro-Index",
    dark_night: "Dark Night",
    sky_dome: "Sky Dome",
    sky_dome_sub: "West (Sunset) ➔ Zenith ➔ East (Dawn)",
    zenith_midnight: "Zenith / Midnight",
    sunset: "Sunset",
    sunrise: "Sunrise",
    moon: "Moon",
    moon_rise: "Rise",
    moon_set: "Set",
    dusk: "Dusk",
    dawn: "Dawn",
    cloud_cover: "Cloud Cover",
    humidity_dew: "Humidity / Dew",
    dew_alert: "Dew Alert",
    dew_risk: "Moist",
    dewpoint: "Dew point",
    dew_heater: "Heater recommended",
    wind_mount: "Wind (Mount)",
    calm: "Calm",
    windstill: "Calm",
    moderate: "Moderate",
    gusty: "Gusty",
    no_shaking: "No mount vibration",
    seeing: "Seeing",
    sharp: "Sharp",
    steady: "Steady",
    turbulent: "Turbulent",
    poor: "Poor",
    sharp_details: "Sharp planetary details",
    what_is_seeing: "What is Seeing?",
    seeing_explanation: "Measures atmospheric turbulence in arcseconds (\"). The lower the value (< 1.8\"), the calmer the air and the sharper the image in your telescope!",
    understood: "Understood",
    hourly_forecast: "Hourly Forecast",
    hourly_sub: "Click an hour to focus in the sky dome",
    focus: "Focus",
    clouds: "Clouds",
    targets_tonight: "Tonight's Targets",
    ring_edge: "Ring edge",
    four_moons: "4 Galilean moons",
    andromeda_galaxy: "Andromeda Galaxy",
    forecast_7day: "7-Day Forecast",
    click_to_switch: "Click to switch",
    new_moon: "NEW MOON",
    new_moon_notice_title: "Notice New Moon (Sat):",
    new_moon_notice_text: "Ideal moonless night, but 99% cloud front. Best observing chances starting Sunday/Monday!",
    verdicts: {
      do_not_setup: "Do not set up tonight",
      do_not_setup_desc: "Dense clouds block the stars. High humidity threatens optics.",
      rain_front: "Overcast & Showers",
      rain_front_desc: "Passing rain front and dense clouds. Keep your telescope dry.",
      stormy: "Continuous Rain & Wind",
      stormy_desc: "Strong winds and closed cloud cover. Completely unsuitable.",
      showers: "Showers & Clouds",
      showers_desc: "Only short cloud gaps in late night. High shower risk.",
      new_moon_cloudy: "New Moon, but 99% Clouds",
      new_moon_cloudy_desc: "Perfect dark sky without moonlight, but overcast.",
      gaps: "Cloud gaps after 11 PM",
      gaps_desc: "Clearing sky around midnight. Good window for deep-sky & planets.",
      best_chance: "Best night of the week!",
      best_chance_desc: "Dry air, steady atmosphere and minimal moonlight. Great view of Jupiter & M31."
    },
    days: {
      today: "Today",
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
      sun: "Sunday"
    }
  },
  de: {
    title_default: "Astro-Wetter",
    sub_title: "Astro-Wetter & Beobachtungsfenster",
    live: "LIVE",
    today: "Heute",
    astro_index: "Astro-Index",
    dark_night: "Dunkle Nacht",
    sky_dome: "Himmelskuppel",
    sky_dome_sub: "West (Abend) ➔ Zenit ➔ Ost (Morgen)",
    zenith_midnight: "Zenit / Mitternacht",
    sunset: "Untergang",
    sunrise: "Aufgang",
    moon: "Mond",
    moon_rise: "Aufgang",
    moon_set: "Untergang",
    dusk: "Einnorden",
    dawn: "Dämmerung",
    cloud_cover: "Bewölkung",
    humidity_dew: "Feuchte / Tau",
    dew_alert: "Tau-Alarm",
    dew_risk: "Feucht",
    dewpoint: "Taupunkt",
    dew_heater: "Heizband",
    wind_mount: "Wind (Stativ)",
    calm: "Ruhig",
    windstill: "Windstill",
    moderate: "Mäßig",
    gusty: "Böig",
    no_shaking: "Kein Wackeln am Stativ",
    seeing: "Seeing",
    sharp: "Scharf",
    steady: "Ruhig",
    turbulent: "Unruhig",
    poor: "Schlecht",
    sharp_details: "Scharfe Planetendetails",
    what_is_seeing: "Was bedeutet Seeing?",
    seeing_explanation: "Misst das Luftflimmern in Bogensekunden (\"). Je kleiner der Wert (< 1,8\"), desto ruhiger die Atmosphäre und schärfer das Bild im Teleskop!",
    understood: "Verstanden",
    hourly_forecast: "Stündlicher Verlauf",
    hourly_sub: "Klicke eine Stunde für Fokus in der Kuppel",
    focus: "Fokus",
    clouds: "Wolken",
    targets_tonight: "Sichtbare Ziele heute",
    ring_edge: "Ringkante",
    four_moons: "4 Galilei-Monde",
    andromeda_galaxy: "Andromeda Galaxie",
    forecast_7day: "7-Tage Vorschau",
    click_to_switch: "Klick zum Wechseln",
    new_moon: "NEUMOND",
    new_moon_notice_title: "Hinweis Neumond (Sa):",
    new_moon_notice_text: "Ideale Mondnacht, aber 99% Regenfront. Beste Beobachtungschancen ab Sonntag/Montag!",
    verdicts: {
      do_not_setup: "Heute nicht aufbauen",
      do_not_setup_desc: "Dichter Hochnebel blockiert die Sterne. Hohe Feuchte lässt die Optik beschlagen.",
      rain_front: "Bedeckt & Schauer",
      rain_front_desc: "Durchziehende Regenfront und dichte Wolkendecke. Teleskop im Trockenen lassen.",
      stormy: "Dauerregen & Sturm",
      stormy_desc: "Kräftiger Wind und geschlossene Wolkendecke. Absolut ungeeignet.",
      showers: "Regenschauer & Wolken",
      showers_desc: "Nur kurze Wolkenlücken in der zweiten Nachthälfte. Hohes Schauerrisiko.",
      new_moon_cloudy: "Neumond, aber 99% Wolken",
      new_moon_cloudy_desc: "Perfekter Neumondhimmel ohne Mondlicht, aber leider dichte Wolkendecke.",
      gaps: "Wolkenlücken ab 23 Uhr",
      gaps_desc: "Aufklarender Himmel vor Mitternacht. Gutes Fenster für Deep-Sky und Planeten.",
      best_chance: "Beste Chance der Woche!",
      best_chance_desc: "Trockene Kaltluft, ruhige Atmosphäre und kaum Mondlicht. Klare Sicht auf Jupiter und M31."
    },
    days: {
      today: "Heute",
      mon: "Montag",
      tue: "Dienstag",
      wed: "Mittwoch",
      thu: "Donnerstag",
      fri: "Freitag",
      sat: "Samstag",
      sun: "Sonntag"
    }
  }
};

export function localize(key, lang = 'en') {
  const chosenLang = languages[lang] ? lang : 'en';
  const parts = key.split('.');
  let obj = languages[chosenLang];
  for (const p of parts) {
    if (obj && obj[p] !== undefined) {
      obj = obj[p];
    } else {
      // Fallback to English
      let fallback = languages['en'];
      for (const fp of parts) {
        if (fallback && fallback[fp] !== undefined) fallback = fallback[fp];
        else return key;
      }
      return fallback;
    }
  }
  return obj;
}
