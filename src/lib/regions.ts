export interface SchoolLocation {
  city: string;
  capital: boolean;
}

/**
 * Institution → main campus city. Multi-campus institutions are mapped to
 * their principal campus; the analysis reports this as an approximation.
 */
const SCHOOL_CITY: Record<string, string> = {
  "Aalto-yliopisto": "Espoo",
  "Centria-ammattikorkeakoulu": "Kokkola",
  "Diakonia-ammattikorkeakoulu": "Helsinki",
  "Haaga-Helia ammattikorkeakoulu": "Helsinki",
  "Helsingin yliopisto": "Helsinki",
  "Humanistinen ammattikorkeak.": "Helsinki",
  "Hämeen ammattikorkeakoulu": "Hämeenlinna",
  "Itä-Suomen yliopisto": "Joensuu/Kuopio",
  "Jyväskylän ammattikorkeakoulu": "Jyväskylä",
  "Jyväskylän yliopisto": "Jyväskylä",
  "Kaakkois-Suomen Ammattikorkeak.": "Kouvola/Mikkeli",
  "Kajaanin ammattikorkeakoulu": "Kajaani",
  "Karelia-ammattikorkeakoulu": "Joensuu",
  "Lab-ammattikorkeakoulu": "Lahti",
  "Lapin ammattikorkeakoulu": "Rovaniemi",
  "Lapin yliopisto": "Rovaniemi",
  "Laurea-ammattikorkeakoulu": "Vantaa",
  "Lpr-Lahden tekn.yliop.LUT": "Lappeenranta",
  "Metropolia Ammattikorkeakoulu": "Helsinki",
  "Oulun ammattikorkeakoulu": "Oulu",
  "Oulun yliopisto": "Oulu",
  "Poliisiammattikorkeakoulu": "Tampere",
  "Satakunnan ammattikorkeakoulu": "Pori",
  "Savonia-ammattikorkeakoulu": "Kuopio",
  "Seinäjoen ammattikorkeakoulu": "Seinäjoki",
  "Svenska handelshögskolan": "Helsinki",
  "Taideyliopisto": "Helsinki",
  "Tampereen ammattikorkeakoulu": "Tampere",
  "Tampereen yliopisto": "Tampere",
  "Turun ammattikorkeakoulu": "Turku",
  "Turun yliopisto": "Turku",
  "Vaasan ammattikorkeakoulu": "Vaasa",
  "Vaasan yliopisto": "Vaasa",
  "Yrkeshögskolan Arcada": "Helsinki",
  "Yrkeshögskolan Novia": "Vaasa",
  "Åbo Akademi": "Turku",
};

export const CAPITAL_CITIES = new Set(["Helsinki", "Espoo", "Vantaa", "Kauniainen"]);

export function locationOf(schoolName: string): SchoolLocation {
  const city = SCHOOL_CITY[schoolName] ?? "Tuntematon";
  return { city, capital: CAPITAL_CITIES.has(city) };
}
