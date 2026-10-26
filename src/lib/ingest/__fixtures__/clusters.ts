/**
 * Hand-labeled stories for checking story clustering. Each event is told by
 * several outlets in their own words; the decoys share words with an event
 * ("rates", "earthquake", "Apple", "wildfire") but are about something else,
 * so they must stay on their own.
 */
export interface LabeledStory {
  /** Stories with the same event belong in one cluster; decoys have their own. */
  event: string;
  hoursAgo: number;
  title: string;
  summary: string;
  tags?: string[];
}

export const labeledStories: LabeledStory[] = [
  // The Fed holds rates.
  {
    event: "fed",
    hoursAgo: 6,
    title: "Fed holds interest rates steady, signals two cuts later this year",
    summary:
      "The Federal Reserve kept its benchmark rate between 4.25% and 4.5% on Wednesday, with officials projecting two quarter-point cuts before December as inflation eases.",
    tags: ["FederalReserve"],
  },
  {
    event: "fed",
    hoursAgo: 5.5,
    title: "Federal Reserve leaves rates unchanged as Powell urges patience",
    summary:
      "Chair Jerome Powell said the central bank needs more evidence that inflation is heading back to 2% before it lowers borrowing costs.",
  },
  {
    event: "fed",
    hoursAgo: 4,
    title: "Powell: the Fed is in no hurry to cut, even with inflation cooling",
    summary:
      "Speaking after the two-day policy meeting, Powell said Fed officials would watch jobs and price data closely before any move on rates.",
  },
  {
    event: "ecb",
    hoursAgo: 30,
    title: "ECB cuts interest rates for a third time as eurozone growth stalls",
    summary:
      "The European Central Bank lowered its deposit rate to 2.5%, citing weak growth across the eurozone and inflation close to its target.",
  },
  {
    event: "boe",
    hoursAgo: 8,
    title: "Bank of England holds rates as UK inflation ticks up",
    summary: "The Monetary Policy Committee voted 7-2 to keep Bank Rate at 4%, after consumer prices rose faster than expected in September.",
  },

  // An earthquake off Japan.
  {
    event: "quake",
    hoursAgo: 12,
    title: "Magnitude 7.1 earthquake strikes off coast of Japan, tsunami advisory issued",
    summary:
      "The quake hit at 4:12 a.m. local time about 60 km off Miyagi prefecture, the Japan Meteorological Agency said, and residents near the coast were told to move to higher ground.",
    tags: ["Japan", "Earthquake"],
  },
  {
    event: "quake",
    hoursAgo: 11.5,
    title: "Strong quake shakes northeastern Japan; no major damage reported",
    summary: "Buildings swayed in Sendai and Tokyo after the magnitude 7.1 tremor off Miyagi. Officials said there were no reports of serious injuries.",
  },
  {
    event: "quake",
    hoursAgo: 9,
    title: "Japan lifts tsunami advisory after 7.1 quake off Miyagi",
    summary: "Authorities lifted the advisory three hours after the earthquake, saying waves of up to 30 cm had reached parts of the Miyagi coast.",
  },
  {
    event: "quake",
    hoursAgo: 8,
    title: "Earthquake in Japan halts bullet trains and cuts power to 40,000 homes",
    summary: "Shinkansen services between Tokyo and Sendai were suspended for hours after the magnitude 7.1 quake, and power was out across Miyagi.",
  },
  {
    event: "california-quake",
    hoursAgo: 10,
    title: "Small earthquake rattles Southern California; no injuries reported",
    summary: "A magnitude 4.2 earthquake centered near Ridgecrest was felt across Los Angeles, the US Geological Survey said.",
  },

  // A phone launch.
  {
    event: "iphone",
    hoursAgo: 20,
    title: "Apple unveils iPhone 18 with thinner design and faster A20 chip",
    summary: "The iPhone 18 lineup, shown at Apple's September event in Cupertino, is the company's thinnest yet and runs on the new A20 processor.",
    tags: ["Apple", "iPhone"],
  },
  {
    event: "iphone",
    hoursAgo: 18,
    title: "iPhone 18 first look: Apple bets on battery life and a slimmer body",
    summary: "We spent an hour with the iPhone 18. The A20 chip is fast, but the bigger story is a battery that Apple says lasts a full day longer.",
  },
  {
    event: "iphone",
    hoursAgo: 16,
    title: "Apple's iPhone 18 starts at $799 and ships next Friday",
    summary: "Preorders for the iPhone 18 open on Friday, with prices unchanged from last year's models in the US.",
  },
  {
    event: "apple-fine",
    hoursAgo: 14,
    title: "EU fines Apple €1.8 billion over App Store music rules",
    summary: "The European Commission said Apple stopped music streaming services from telling users about cheaper subscriptions outside the App Store.",
  },
  {
    event: "galaxy",
    hoursAgo: 15,
    title: "Samsung's new Galaxy phone promises a week of battery life",
    summary: "The Galaxy M60 uses a silicon-carbon battery that Samsung says lasts seven days on a single charge.",
  },

  // A wildfire near Athens.
  {
    event: "athens-fire",
    hoursAgo: 26,
    title: "Wildfire forces evacuations near Athens as strong winds fan the flames",
    summary: "Residents of several suburbs north of Athens were told to leave their homes as the fire spread through pine forest on Mount Penteli.",
  },
  {
    event: "athens-fire",
    hoursAgo: 24,
    title: "Greece battles fast-moving blaze on the outskirts of Athens; thousands evacuated",
    summary: "More than 500 firefighters and 12 water-dropping aircraft fought the fire on Mount Penteli as Greece asked EU partners for help.",
    tags: ["Greece", "Wildfires"],
  },
  {
    event: "athens-fire",
    hoursAgo: 7,
    title: "Firefighters bring Athens wildfire under control after two days",
    summary: "Greek officials said the Penteli fire was contained overnight. Evacuated residents began returning to damaged homes.",
  },
  {
    event: "california-fire",
    hoursAgo: 22,
    title: "California braces for an early wildfire season amid record heat",
    summary: "Fire officials warned that dry grasslands and temperatures above 40C could fuel large fires weeks earlier than usual.",
  },

  // A title race.
  {
    event: "arsenal",
    hoursAgo: 28,
    title: "Arsenal clinch the Premier League title with a final-day win over Everton",
    summary: "A 2-0 win at the Emirates gave Arsenal their first league title in 22 years, two points ahead of Liverpool.",
    tags: ["Arsenal", "PremierLeague"],
  },
  {
    event: "arsenal",
    hoursAgo: 27,
    title: "Champions at last: Arsenal end a 22-year wait for the league title",
    summary: "Mikel Arteta's side beat Everton 2-0 on the final day to finish two points clear of Liverpool and lift the Premier League trophy.",
  },
  {
    event: "arsenal",
    hoursAgo: 25,
    title: "Arteta hails 'unbelievable' squad after Arsenal seal the title",
    summary: "The Arsenal manager praised his players after the win over Everton secured the club's first Premier League title since 2004.",
  },
  {
    event: "city-manager",
    hoursAgo: 20,
    title: "Manchester City part ways with their manager after a trophyless season",
    summary: "City finished fourth in the Premier League and went out of the Champions League in the last 16.",
  },

  // A pilots' strike.
  {
    event: "air-france",
    hoursAgo: 10,
    title: "Air France pilots walk out, grounding half of the airline's flights",
    summary: "The SNPL union called the strike over pay and rosters, and Air France said it would cancel about 1,200 flights through Sunday.",
  },
  {
    event: "air-france",
    hoursAgo: 6,
    title: "Strike by Air France pilots cancels 1,200 flights on a busy holiday weekend",
    summary: "Passengers at Paris Charles de Gaulle faced long queues as Air France cancelled flights during the pilots' strike.",
  },
  {
    event: "lufthansa",
    hoursAgo: 12,
    title: "Lufthansa reports record summer passenger numbers",
    summary: "Europe's largest airline group carried 38 million passengers between June and August and raised its profit forecast.",
  },

  // A drug approval.
  {
    event: "peanut",
    hoursAgo: 9,
    title: "FDA approves the first daily pill to treat peanut allergy in children",
    summary: "The Food and Drug Administration approved the oral treatment for children aged 4 to 17 after trials showed it cut severe reactions by half.",
  },
  {
    event: "peanut",
    hoursAgo: 5,
    title: "Peanut allergy pill wins US approval, offering families a new option",
    summary: "Parents of children with peanut allergies welcomed the FDA decision, though allergists said the pill is not a cure.",
  },
  {
    event: "food-study",
    hoursAgo: 13,
    title: "Ultra-processed food linked to higher risk of asthma in children, study finds",
    summary: "Researchers followed 12,000 children for a decade and found those who ate the most ultra-processed food were more likely to develop asthma.",
  },

  // An election.
  {
    event: "canada",
    hoursAgo: 33,
    title: "Liberals win Canada's election but fall short of a majority",
    summary: "Prime Minister Mark Carney's Liberals won 168 of 343 seats, four short of a majority in the House of Commons.",
    tags: ["Canada", "Election"],
  },
  {
    event: "canada",
    hoursAgo: 31,
    title: "Canada election: Carney's Liberals will lead a minority government",
    summary: "Carney said he would seek support from other parties after the Liberals came up short of the 172 seats needed for a majority.",
  },
  {
    event: "canada",
    hoursAgo: 29,
    title: "Conservatives gain seats as Canada returns a minority parliament",
    summary: "The Conservatives won 144 seats, their best result in a decade, while the Liberals stay in power without a majority.",
  },
  {
    event: "australia",
    hoursAgo: 18,
    title: "Australia's prime minister calls a snap election for March",
    summary: "Voters will go to the polls on March 14, two months earlier than expected, the government announced.",
  },

  // A rocket test.
  {
    event: "starship",
    hoursAgo: 21,
    title: "SpaceX's Starship completes a full orbit before splashing down in the Indian Ocean",
    summary: "The ninth Starship test flight reached orbit for the first time and the ship survived re-entry, SpaceX said.",
    tags: ["SpaceX", "Starship"],
  },
  {
    event: "starship",
    hoursAgo: 19,
    title: "Starship reaches orbit on its ninth flight, a milestone for Musk's Mars plans",
    summary: "Elon Musk said the successful SpaceX test brings uncrewed Mars missions closer, after earlier flights exploded.",
  },
  {
    event: "artemis",
    hoursAgo: 17,
    title: "NASA delays Artemis III crewed moon landing to 2028",
    summary: "The agency said the lunar lander and new spacesuits need more testing before astronauts can return to the Moon.",
  },

  // A media merger.
  {
    event: "merger",
    hoursAgo: 3,
    title: "Paramount and Warner Bros. Discovery agree to a $40 billion merger",
    summary: "The deal would combine two of Hollywood's oldest studios along with CNN, CBS and the HBO Max and Paramount+ streaming services.",
  },
  {
    event: "merger",
    hoursAgo: 2,
    title: "Hollywood shake-up: Warner Bros. Discovery to combine with Paramount",
    summary: "Shareholders of Warner Bros. Discovery would own 55% of the combined company under the $40 billion agreement, Paramount said.",
  },
  {
    event: "netflix",
    hoursAgo: 4,
    title: "Netflix raises prices in the US and Canada",
    summary: "The standard plan rises to $19.99 a month as the streaming service adds more live sports.",
  },
];
