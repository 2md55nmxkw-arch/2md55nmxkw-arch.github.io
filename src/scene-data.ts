export type Season = "winter" | "spring" | "summer" | "autumn";
export type Period = "night" | "morning" | "day" | "sunset";

export const PERIODS: Period[] = ["night", "morning", "day", "sunset"];

export const SCENE_FILES: Record<Season, Record<Period, string>> = {
  winter: {
    night: "winter_night",
    morning: "winter_morning",
    day: "winter_day",
    sunset: "winter_sunset",
  },
  spring: {
    night: "spring_night",
    morning: "spring_city_hero",
    day: "spring_day",
    sunset: "spring_sunset",
  },
  summer: {
    night: "summer_night",
    morning: "summer_morning",
    day: "summer_day",
    sunset: "summer_sunset",
  },
  autumn: {
    night: "autumn_night",
    morning: "autumn_morning",
    day: "autumn_day",
    sunset: "autumn_sunset",
  },
};

export function seasonForMonth(month: number): Season {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

export function sceneForHour(hour: number): Period {
  if (hour >= 21 || hour < 5) return "night";
  if (hour < 8) return "morning";
  if (hour < 18) return "day";
  return "sunset";
}
