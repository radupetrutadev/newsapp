/**
 * Searches for measuring search quality (scripts/search-eval.mjs), over the
 * demo stories in supabase/seed.sql. "words" queries use a story's own words,
 * which full-text search finds; "meaning" queries describe a story in other
 * words, which it can't. `relevant` lists the slugs a good search returns.
 *
 * No imports: the script loads this file with plain Node.
 */
export interface EvalQuery {
  query: string;
  kind: "words" | "meaning";
  relevant: string[];
}

export const evalQueries: EvalQuery[] = [
  {
    query: "methane deal",
    kind: "words",
    relevant: [
      "climate-summit-methane-deal",
      "methane-pledge-140-countries-40-percent",
      "methane-deal-gas-producers",
      "lawmakers-methane-rules-after-summit",
    ],
  },
  { query: "quantum computer", kind: "words", relevant: ["quantum-computer-error-corrected-record"] },
  { query: "marathon record", kind: "words", relevant: ["marathon-world-record-falls"] },
  { query: "flu vaccine", kind: "words", relevant: ["nasal-flu-vaccine-late-stage-trial"] },
  {
    query: "northern lights",
    kind: "meaning",
    relevant: ["solar-storm-auroras-southern-skies", "auroras-far-south-solar-storm"],
  },
  { query: "frozen water on the moon", kind: "meaning", relevant: ["lunar-lander-confirms-water-ice"] },
  { query: "exercise and heart health", kind: "meaning", relevant: ["daily-walks-lower-heart-disease-risk"] },
  { query: "hackers stealing logins", kind: "meaning", relevant: ["phishing-wave-targets-password-managers"] },
  { query: "trains between capital cities", kind: "words", relevant: ["high-speed-rail-three-capitals-opens"] },
  { query: "planting trees", kind: "meaning", relevant: ["reforestation-one-million-hectares"] },
  { query: "shorter working week", kind: "meaning", relevant: ["cities-trial-four-day-work-week"] },
  { query: "overcrowded holiday destinations", kind: "meaning", relevant: ["historic-cities-cap-daily-visitors"] },
  { query: "flu shot without needles", kind: "meaning", relevant: ["nasal-flu-vaccine-late-stage-trial"] },
  { query: "phone that lasts longer between charges", kind: "meaning", relevant: ["smartphone-chips-two-day-battery"] },
  { query: "renewables beat coal", kind: "meaning", relevant: ["solar-overtakes-coal-global-electricity"] },
  { query: "youngest chess player", kind: "meaning", relevant: ["teen-chess-prodigy-candidates"] },
  { query: "a planet that could support life", kind: "meaning", relevant: ["earth-sized-planet-habitable-zone"] },
  {
    query: "AI you can run on your own computer",
    kind: "meaning",
    relevant: ["open-source-model-matches-proprietary-ai", "open-source-ai-model-rattles-rivals"],
  },
  { query: "stocks rise as price increases slow", kind: "meaning", relevant: ["markets-rally-inflation-cools"] },
];

/** About none of the stories: a good search returns nothing. */
export const unrelatedQuery = "purple elephant parade";
