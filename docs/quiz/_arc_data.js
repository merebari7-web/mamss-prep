/* ============================================================
   v11.0 — STUDY ARCADE + VIDEO STUDIO (arcade.js) · data layer
   Four curriculum games built on the app's verified question bank
   and subject topics, plus lesson-video channels and links.
   ============================================================ */
"use strict";
/* Term/definition pairs for every subject — powers Term Match + Memory Pairs. */
var PAIRS = {
  "Mathematics": [
    { t: "Quadratic equation", d: "An equation of the form ax² + bx + c = 0, solved by factorising, completing the square or the formula" },
    { t: "Mean", d: "The average of a data set: sum of values divided by their count" },
    { t: "Hypotenuse", d: "The longest side of a right-angled triangle, opposite the right angle" },
    { t: "Probability", d: "A number from 0 to 1 measuring how likely an event is to happen" },
    { t: "Gradient", d: "The slope of a line: change in y divided by change in x" },
    { t: "Venn diagram", d: "A picture of overlapping sets showing unions, intersections and complements" }
  ],
  "English Language": [
    { t: "Synonym", d: "A word with the same or nearly the same meaning as another word" },
    { t: "Antonym", d: "A word opposite in meaning to another word" },
    { t: "Simile", d: "A comparison using 'like' or 'as', e.g. brave as a lion" },
    { t: "Metaphor", d: "A direct comparison that says one thing IS another, e.g. time is money" },
    { t: "Conjunction", d: "A joining word such as and, but, because, or, although" },
    { t: "Comprehension", d: "Reading a passage and answering questions about its meaning" }
  ],
  "Biology": [
    { t: "Photosynthesis", d: "Plants making glucose from carbon dioxide and water using sunlight" },
    { t: "Mitosis", d: "Cell division producing two identical daughter cells" },
    { t: "Osmosis", d: "Movement of water through a membrane from dilute to concentrated solution" },
    { t: "Enzyme", d: "A biological catalyst that speeds up chemical reactions in cells" },
    { t: "Habitat", d: "The natural home of an organism — where it lives" },
    { t: "Genotype", d: "The genetic make-up of an organism, e.g. Tt" }
  ],
  "Chemistry": [
    { t: "Atom", d: "The smallest particle of an element that keeps its chemical properties" },
    { t: "Ion", d: "An atom or group of atoms that has gained or lost electrons" },
    { t: "Covalent bond", d: "A bond formed by sharing pairs of electrons between atoms" },
    { t: "pH", d: "A scale 0–14 measuring how acidic or alkaline a solution is" },
    { t: "Catalyst", d: "A substance that speeds a reaction without being used up" },
    { t: "Distillation", d: "Separating liquids by boiling and condensing them again" }
  ],
  "Physics": [
    { t: "Velocity", d: "Speed in a stated direction — a vector quantity" },
    { t: "Acceleration", d: "Rate of change of velocity, measured in m/s²" },
    { t: "Newton's second law", d: "Force equals mass times acceleration (F = ma)" },
    { t: "Refraction", d: "Bending of light as it passes from one medium into another" },
    { t: "Ohm's law", d: "Current is proportional to voltage: V = IR" },
    { t: "Kinetic energy", d: "Energy of motion: ½mv²" }
  ],
  "Agricultural Science": [
    { t: "Soil fertility", d: "The ability of soil to supply nutrients for plant growth" },
    { t: "Manure", d: "Decomposed plant and animal waste used to enrich soil" },
    { t: "Ruminant", d: "A cud-chewing animal like cattle, sheep or goat" },
    { t: "Tillage", d: "Turning and loosening the soil before planting" },
    { t: "Poultry", d: "Domestic birds kept for eggs and meat" },
    { t: "Mulching", d: "Covering soil with leaves or straw to keep moisture" }
  ],
  "Economics": [
    { t: "Scarcity", d: "Limited resources against unlimited wants — the basic economic problem" },
    { t: "Demand", d: "The quantity of a good buyers are willing and able to buy at a price" },
    { t: "Elasticity", d: "How much quantity demanded changes when price changes" },
    { t: "GDP", d: "Total value of goods and services produced in a country in a year" },
    { t: "Inflation", d: "A sustained general rise in the price level" },
    { t: "Opportunity cost", d: "The next best alternative given up when a choice is made" }
  ],
  "Government": [
    { t: "Constitution", d: "The supreme law stating how a state is governed" },
    { t: "Separation of powers", d: "Dividing power among executive, legislature and judiciary" },
    { t: "Suffrage", d: "The right to vote in elections" },
    { t: "Federalism", d: "A system sharing power between a central and component states" },
    { t: "Delegate", d: "A representative who must follow the wishes of those who sent them" },
    { t: "Rule of law", d: "Everyone, including rulers, is subject to the law" }
  ],
  "Literature in English": [
    { t: "Protagonist", d: "The main character at the centre of a story or play" },
    { t: "Irony", d: "Saying or showing the opposite of what is meant or expected" },
    { t: "Stanza", d: "A group of lines forming a unit in a poem" },
    { t: "Theme", d: "The central idea or message a work explores" },
    { t: "Dialogue", d: "Conversation between characters in a play or prose" },
    { t: "Climax", d: "The turning point of highest tension in a plot" }
  ],
  "Geography": [
    { t: "Erosion", d: "Wearing away of the land by water, wind or ice" },
    { t: "Weathering", d: "Breaking down of rocks in place by weather and climate" },
    { t: "Longitude", d: "Lines running north–south; used with time zones" },
    { t: "Delta", d: "A fan of sediments where a river meets a sea or lake" },
    { t: "Population density", d: "Number of people per square kilometre" },
    { t: "Plateau", d: "A high flat landform raised above surrounding country" }
  ],
  "Commerce": [
    { t: "Commerce", d: "The trade and services that move goods from producer to consumer" },
    { t: "Retailer", d: "A trader who sells goods in small quantities to final consumers" },
    { t: "Insurance", d: "A contract paying compensation against specified risks for a premium" },
    { t: "Balance of trade", d: "The difference between a country's exports and imports of goods" },
    { t: "Working capital", d: "Money needed for the day-to-day running of a business" },
    { t: "Advertising", d: "Informing and persuading people to buy a product" }
  ],
  "Computer Studies": [
    { t: "CPU", d: "The processor that fetches, decodes and executes instructions" },
    { t: "Algorithm", d: "A step-by-step set of instructions to solve a problem" },
    { t: "RAM", d: "Volatile working memory that loses data when power goes off" },
    { t: "URL", d: "The address of a web page, e.g. https://example.com" },
    { t: "Compiler", d: "Program that translates source code into machine code" },
    { t: "Firewall", d: "A security system that filters incoming and outgoing network traffic" }
  ],
  "Civic Education": [
    { t: "Citizenship", d: "Legal membership of a state with rights and duties" },
    { t: "Integrity", d: "Being honest and upright even when no one is watching" },
    { t: "Rule of law", d: "The principle that the law governs everyone equally" },
    { t: "Tolerance", d: "Respecting people whose views and ways differ from yours" },
    { t: "Nationalism", d: "Patriotism and loyalty that puts the nation first" },
    { t: "Democracy", d: "Government by the people through free and fair elections" }
  ],
  "Further Mathematics": [
    { t: "Determinant", d: "For matrix [[a,b],[c,d]] the value ad − bc" },
    { t: "Dot product", d: "a·b = |a||b|cosθ, giving the angle between vectors" },
    { t: "Binomial coefficient", d: "C(n,r) = n!/(r!(n−r)!), the numbers in Pascal's triangle" },
    { t: "Derivative", d: "The gradient function dy/dx — rate of change of a curve" },
    { t: "Definite integral", d: "A signed area under a curve between two limits" },
    { t: "Complex conjugate", d: "For z = x + iy, z̄ = x − iy" }
  ],
  "Christian Religious Studies": [
    { t: "Covenant", d: "A solemn binding agreement between God and His people" },
    { t: "The Fall", d: "Adam and Eve's disobedience that brought sin into the world" },
    { t: "Passover", d: "The feast remembering the angel passing over Israelite homes" },
    { t: "Parable", d: "A story Jesus told to teach a truth about God's kingdom" },
    { t: "Pentecost", d: "The coming of the Holy Spirit that gave birth to the church" },
    { t: "Beatitudes", d: "The blessings Jesus taught in the Sermon on the Mount" }
  ],
  "Islamic Religious Studies": [
    { t: "Wahy", d: "The revelation of the Qur'an delivered through Angel Jibril" },
    { t: "Shahadah", d: "The testimony of faith — first pillar of Islam" },
    { t: "Salah", d: "The five daily obligatory prayers" },
    { t: "Zakat", d: "The compulsory poor-due given from wealth" },
    { t: "Hijrah", d: "The migration of the Prophet (SAW) from Makkah to Madinah" },
    { t: "Mizan", d: "The scales on which deeds are weighed on the Last Day" }
  ],
  "Data Processing": [
    { t: "Byte", d: "A group of 8 bits that holds one character" },
    { t: "Volatile memory", d: "Memory that loses its data when power is cut (RAM)" },
    { t: "Primary key", d: "The field that uniquely identifies each record in a table" },
    { t: "Binary", d: "The base-2 number system using only 0 and 1" },
    { t: "Spreadsheet", d: "Software of rows and columns with formulas like SUM" },
    { t: "Phishing", d: "Fraudulent emails or sites that steal personal data" }
  ],
  "Food & Nutrition": [
    { t: "Balanced diet", d: "A diet with all nutrients in the right proportions" },
    { t: "Protein", d: "The body-building nutrient found in meat, fish, beans, eggs" },
    { t: "Scurvy", d: "A deficiency disease caused by lack of vitamin C" },
    { t: "Menu", d: "The written list of dishes planned for a meal or day" },
    { t: "Steaming", d: "Cooking in steam above boiling water — preserves vitamins" },
    { t: "Food preservation", d: "Methods like drying, salting and freezing that keep food safe longer" }
  ],
  "French": [
    { t: "Le genre", d: "Masculin ou féminin — every French noun has a gender" },
    { t: "Le passé composé", d: "The past tense formed with avoir/être + past participle" },
    { t: "Le pronom", d: "A word that replaces a noun: je, tu, il, elle, nous, vous, ils, elles" },
    { t: "La salutation", d: "The greeting that opens a letter: Cher ami, Chère madame…" },
    { t: "Parce que", d: "The connector meaning 'because' — it introduces a cause" },
    { t: "L'accord", d: "Making adjectives agree in gender and number with the noun" }
  ]
};
/* Curated lesson-video library (real, verified links; every entry opens in the
   in-app player). Users can add their own — see the Video Studio tab. */
var VIDEOS = [
  { t: "WAEC & NECO Mathematics — full revision", s: "Mathematics", c: "SS3", id: "U_cHam0p4UE", ch: "Davetuts Academy" },
  { t: "SS3 TV Lesson: Chemical Equilibrium", s: "Chemistry", c: "SS3", id: "8BdV4HenhgU", ch: "Lagos State TV Lessons" },
  { t: "SS3 TV Lesson: Chemistry Practical", s: "Chemistry", c: "SS3", id: "sr4_vP6OnnA", ch: "Lagos State TV Lessons" },
  { t: "Chemistry for SS3 — Lesson 13", s: "Chemistry", c: "SS3", id: "ePCj7vYcMjc", ch: "Mr Osho" }
];
var CHANNELS = [
  { t: "Myschool Nigeria", d: "Free online classroom lessons for WAEC, NECO, JAMB CBT and more", u: "https://www.youtube.com/@MyschoolNigeria/playlists" },
  { t: "Davetuts Academy", d: "Past-question solving and full revisions for WAEC/NECO Mathematics", u: "https://www.youtube.com/@davetutsacademy" },
  { t: "O3SCHOOLS", d: "Nigerian exam-prep channel — WAEC practice, JAMB practice, CBT drills", u: "https://www.youtube.com/@o3schools" },
  { t: "FlashLearners", d: "English, Mathematics and science lessons plus exam tips", u: "https://www.youtube.com/@flashlearners" }
];

/* Authored questions for the 6 extended subjects (also used by edu.js; kept here so the
   Arcade games cover all 19 subjects even before the Teaching Suite loads). */
var XQ = {
 "Further Mathematics": [
  {
   "q": "If n(A) = 20, n(B) = 24 and n(A ∩ B) = 9, find n(A ∪ B).",
   "o": [
    "35",
    "44",
    "53",
    "29"
   ],
   "a": 0,
   "e": "Using n(A ∪ B) = 20 + 24 − 9 = 35 by the inclusion–exclusion rule."
  },
  {
   "q": "Which of the following is always true for sets A and B?",
   "o": [
    "A ∩ B ⊆ A ∪ B",
    "A ∪ B ⊆ A ∩ B",
    "A ⊆ A ∩ B",
    "A ∩ B = A ∪ B"
   ],
   "a": 0,
   "e": "Every element of A ∩ B belongs to A and to B, so it belongs to A ∪ B. The intersection is always a subset of the union."
  },
  {
   "q": "The statement 'If it rains, the ground is wet' is false when:",
   "o": [
    "it rains and the ground is wet",
    "it rains and the ground is not wet",
    "it does not rain and the ground is wet",
    "it does not rain and the ground is dry"
   ],
   "a": 1,
   "e": "An implication p ⇒ q is false only when p is true and q is false."
  },
  {
   "q": "Given a = (3, 4), find |a|.",
   "o": [
    "5",
    "7",
    "25",
    "3.5"
   ],
   "a": 0,
   "e": "|a| = √(3² + 4²) = √25 = 5."
  },
  {
   "q": "The determinant of the matrix [[2,3],[4,5]] is:",
   "o": [
    "−2",
    "2",
    "22",
    "10"
   ],
   "a": 0,
   "e": "det = (2 × 5) − (3 × 4) = 10 − 12 = −2."
  },
  {
   "q": "If a·b = 0 for non-zero vectors a and b, then the vectors are:",
   "o": [
    "parallel",
    "perpendicular",
    "equal in length",
    "opposite"
   ],
   "a": 1,
   "e": "a·b = |a||b|cosθ = 0 gives cosθ = 0 so θ = 90°, i.e. perpendicular."
  },
  {
   "q": "The coefficient of x² in the expansion of (1 + x)⁴ is:",
   "o": [
    "4",
    "6",
    "8",
    "12"
   ],
   "a": 1,
   "e": "C(4,2) = 4!/(2!2!) = 6."
  },
  {
   "q": "How many terms are in the full expansion of (x + y)⁶?",
   "o": [
    "6",
    "7",
    "8",
    "12"
   ],
   "a": 1,
   "e": "(a + b)ⁿ has n + 1 terms, so 6 + 1 = 7 terms."
  },
  {
   "q": "In the expansion of (2 + x)³ the constant term is:",
   "o": [
    "8",
    "4",
    "2",
    "1"
   ],
   "a": 0,
   "e": "The term with no x is 2³ = 8."
  },
  {
   "q": "If y = 3x² + 2x, find dy/dx.",
   "o": [
    "6x + 2",
    "3x + 2",
    "6x² + 2",
    "3x²"
   ],
   "a": 0,
   "e": "Power rule: 3 × 2x = 6x, and 2x differentiates to 2."
  },
  {
   "q": "The gradient of y = x² at x = 3 is:",
   "o": [
    "6",
    "9",
    "3",
    "12"
   ],
   "a": 0,
   "e": "dy/dx = 2x, so at x = 3 the gradient is 6."
  },
  {
   "q": "At a stationary point where d²y/dx² > 0, the curve has a:",
   "o": [
    "minimum",
    "maximum",
    "point of inflection",
    "vertical asymptote"
   ],
   "a": 0,
   "e": "A positive second derivative means the gradient is increasing, so the point is a local minimum."
  },
  {
   "q": "Evaluate ∫₁³ 2x dx.",
   "o": [
    "8",
    "4",
    "6",
    "16"
   ],
   "a": 0,
   "e": "∫2x dx = x², so [x²]₁³ = 9 − 1 = 8."
  },
  {
   "q": "∫ dx/x² equals:",
   "o": [
    "−1/x + C",
    "1/x + C",
    "−x⁻³/3 + C",
    "ln x² + C"
   ],
   "a": 0,
   "e": "∫x⁻² dx = x⁻¹/(−1) + C = −1/x + C."
  },
  {
   "q": "The constant of integration C is required because:",
   "o": [
    "differentiation removes constants",
    "the function is discontinuous",
    "integrals always diverge",
    "the limits are negative"
   ],
   "a": 0,
   "e": "Any constant has derivative zero, so the antiderivative is only determined up to an added constant."
  },
  {
   "q": "Simplify (2 + 3i) + (4 − i).",
   "o": [
    "6 + 2i",
    "6 + 4i",
    "8 + 2i",
    "6 − 2i"
   ],
   "a": 0,
   "e": "Add real parts: 2 + 4 = 6; add imaginary parts: 3i − i = 2i."
  },
  {
   "q": "If z = 3 + 4i, then |z| =",
   "o": [
    "5",
    "7",
    "25",
    "√7"
   ],
   "a": 0,
   "e": "|z| = √(3² + 4²) = √25 = 5."
  },
  {
   "q": "The conjugate of 5 − 2i is:",
   "o": [
    "5 + 2i",
    "−5 + 2i",
    "−5 − 2i",
    "2 − 5i"
   ],
   "a": 0,
   "e": "The conjugate negates the imaginary part only: 5 + 2i."
  }
 ],
 "Christian Religious Studies": [
  {
   "q": "According to Genesis, what did God create on the fourth day?",
   "o": [
    "Sun, moon and stars",
    "Birds and fish",
    "Land animals",
    "The sea"
   ],
   "a": 0,
   "e": "Day four: God made lights in the sky — the sun, moon and stars — 'for signs and for seasons'."
  },
  {
   "q": "Why did God forbid Adam and Eve from the tree of knowledge of good and evil?",
   "o": [
    "To test their obedience",
    "Because the fruit was poisonous",
    "Because it gave immortality",
    "To punish the serpent"
   ],
   "a": 0,
   "e": "The command tested their love and obedience; eating it was disobedience, not a natural need."
  },
  {
   "q": "The immediate consequence of Adam and Eve's disobedience was:",
   "o": [
    "they hid from God",
    "they gained wisdom",
    "they became immortal",
    "the garden was enlarged"
   ],
   "a": 0,
   "e": "Their eyes were opened and they hid from God — shame and broken fellowship replaced closeness."
  },
  {
   "q": "What was God's command to Abraham in Genesis 12:1?",
   "o": [
    "Leave your country and go to a land I will show you",
    "Build an ark",
    "Lead Israel out of Egypt",
    "Pluck out your eye"
   ],
   "a": 0,
   "e": "God called him to separate from his people and follow, a journey of faith."
  },
  {
   "q": "The sign of the Abrahamic covenant was:",
   "o": [
    "circumcision",
    "the rainbow",
    "the Sabbath",
    "the Passover lamb"
   ],
   "a": 0,
   "e": "Circumcision was the physical sign confirming God's promise to Abraham and his descendants."
  },
  {
   "q": "Abraham's greatest test of faith came when God asked him to:",
   "o": [
    "sacrifice Isaac",
    "leave Egypt",
    "marry twice",
    "build a tower"
   ],
   "a": 0,
   "e": "Offering Isaac showed Abraham trusted God even when the promise seemed impossible."
  },
  {
   "q": "The Passover feast commemorates:",
   "o": [
    "the angel of death passing over Israelite homes",
    "the crossing of the Red Sea",
    "the giving of the Law",
    "the first harvest"
   ],
   "a": 0,
   "e": "The blood of the lamb marked Israelite houses so the destroyer passed over them."
  },
  {
   "q": "Which commandment teaches respect for parents?",
   "o": [
    "Honour your father and mother",
    "You shall not steal",
    "Remember the Sabbath",
    "You shall not covet"
   ],
   "a": 0,
   "e": "The fifth commandment promises long life for honouring parents."
  },
  {
   "q": "Moses received the tablets of the Law at:",
   "o": [
    "Mount Sinai",
    "Mount Moriah",
    "Mount Carmel",
    "Mount Nebo"
   ],
   "a": 0,
   "e": "Sinai is where God made the covenant with Israel and gave the Law through Moses."
  },
  {
   "q": "Amos is known mainly for condemning:",
   "o": [
    "injustice against the poor",
    "the building of the temple",
    "foreign wars",
    "overeating"
   ],
   "a": 0,
   "e": "Amos thundered that empty worship while 'selling the righteous for silver' would not stand before God."
  },
  {
   "q": "On Mount Carmel Elijah challenged the prophets of:",
   "o": [
    "Baal",
    "Asherah",
    "Molech",
    "Dagon"
   ],
   "a": 0,
   "e": "The contest proved that the LORD, not Baal, answers by fire."
  },
  {
   "q": "Isaiah's vision in the temple emphasised God's:",
   "o": [
    "holiness",
    "weakness",
    "distance",
    "anger only"
   ],
   "a": 0,
   "e": "'Holy, holy, holy' is the heart of Isaiah's call, which leads to cleansing and commission."
  },
  {
   "q": "The Beatitudes begin Jesus' teaching recorded in:",
   "o": [
    "the Sermon on the Mount",
    "the Last Supper",
    "the Transfiguration",
    "the Temple cleansing"
   ],
   "a": 0,
   "e": "Matthew 5–7 records the Sermon on the Mount, opening with the Beatitudes."
  },
  {
   "q": "The parable of the Good Samaritan teaches:",
   "o": [
    "love your neighbour whoever they are",
    "never travel at night",
    "priests are useless",
    "the law is enough"
   ],
   "a": 0,
   "e": "The Samaritan — an outsider — showed mercy where the religious leaders did not."
  },
  {
   "q": "At the Last Supper Jesus gave the new commandment to:",
   "o": [
    "love one another",
    "build more churches",
    "memorise the Law",
    "avoid Rome"
   ],
   "a": 0,
   "e": "'Love one another as I have loved you' is the distinguishing mark of his disciples."
  },
  {
   "q": "The church was born publicly at:",
   "o": [
    "Pentecost",
    "Easter",
    "the Ascension",
    "the Transfiguration"
   ],
   "a": 0,
   "e": "The Spirit's coming at Pentecost, with Peter's sermon, began the preaching of the risen Christ."
  },
  {
   "q": "The first Christian martyr was:",
   "o": [
    "Stephen",
    "James",
    "Peter",
    "Philip"
   ],
   "a": 0,
   "e": "Stephen, full of faith and the Spirit, was stoned as the church faced its first persecution."
  },
  {
   "q": "Paul's main mission work was to:",
   "o": [
    "the Gentiles",
    "Egypt only",
    "the priests",
    "the Romans alone"
   ],
   "a": 0,
   "e": "Paul was the apostle to the Gentiles, planting churches across Asia Minor and Greece."
  }
 ],
 "Islamic Religious Studies": [
  {
   "q": "The Qur'an was revealed through which angel?",
   "o": [
    "Jibril (Gabriel)",
    "Mika'il",
    "Israfil",
    "Izra'il"
   ],
   "a": 0,
   "e": "Angel Jibril brought the revelation (wahy) to the Prophet (SAW)."
  },
  {
   "q": "How many surahs does the Qur'an contain?",
   "o": [
    "114",
    "100",
    "50",
    "99"
   ],
   "a": 0,
   "e": "The Qur'an has 114 chapters, each called a surah."
  },
  {
   "q": "The recorded sayings and actions of the Prophet (SAW) are called:",
   "o": [
    "Hadith",
    "Tafsir",
    "Fiqh",
    "Ijma"
   ],
   "a": 0,
   "e": "Hadith is the record of the Prophet's words and deeds, second to the Qur'an as a source."
  },
  {
   "q": "Which is NOT one of the five pillars of Islam?",
   "o": [
    "Sawm (fasting)",
    "Shahadah",
    "Zakat",
    "Iddah"
   ],
   "a": 3,
   "e": "The pillars are Shahadah, Salah, Zakat, Sawm and Hajj; Iddah is the waiting period after a divorce or widowhood."
  },
  {
   "q": "How many times do Muslims pray each day?",
   "o": [
    "five",
    "three",
    "seven",
    "one"
   ],
   "a": 0,
   "e": "Salah is obligatory five times daily: Fajr, Zuhr, Asr, Maghrib and Isha."
  },
  {
   "q": "Spending in charity and caring — the pillar concerned with the poor is:",
   "o": [
    "Zakat",
    "Hajj",
    "Sawm",
    "Shahadah"
   ],
   "a": 0,
   "e": "Zakat purifies wealth by giving a fixed share to those in need."
  },
  {
   "q": "The Hijrah refers to the migration to:",
   "o": [
    "Madinah",
    "Makkah",
    "Jerusalem",
    "Ta'if"
   ],
   "a": 0,
   "e": "The Prophet and his companions migrated from Makkah to Madinah in 622 CE."
  },
  {
   "q": "The first revelation came to the Prophet (SAW) in:",
   "o": [
    "the Cave of Hira",
    "the Ka'bah",
    "the mosque of Quba",
    "Mount Arafat"
   ],
   "a": 0,
   "e": "In the Cave of Hira, Jibril brought the first verses of Surah Al-Alaq."
  },
  {
   "q": "The Islamic calendar (Hijrah calendar) begins in:",
   "o": [
    "622 CE",
    "570 CE",
    "610 CE",
    "632 CE"
   ],
   "a": 0,
   "e": "The year of the Hijrah to Madinah, 622 CE, is year one of the Islamic calendar."
  },
  {
   "q": "The ablution performed before prayer is called:",
   "o": [
    "Wudu",
    "Ghusl",
    "Tayammum only",
    "Ihram"
   ],
   "a": 0,
   "e": "Wudu washes the hands, mouth, nose, face, arms, head and feet as preparation for Salah."
  },
  {
   "q": "Muslims face the ________ when praying.",
   "o": [
    "Qiblah",
    "Sunnah",
    "Mihrab only",
    "Kiswah"
   ],
   "a": 0,
   "e": "All prayers are directed towards the Qiblah, the direction of the Ka'bah in Makkah."
  },
  {
   "q": "The full ceremonial bath after major impurity is called:",
   "o": [
    "Ghusl",
    "Wudu",
    "Tayammum",
    "Sujud"
   ],
   "a": 0,
   "e": "Ghusl washes the whole body with water to restore ritual purity."
  },
  {
   "q": "Which action is forbidden in Islam?",
   "o": [
    "Backbiting",
    "Helping the poor",
    "Honouring parents",
    "Greeting others"
   ],
   "a": 0,
   "e": "Backbiting (gheebah) is compared to eating the flesh of a dead brother — strictly forbidden."
  },
  {
   "q": "The Islamic greeting is:",
   "o": [
    "As-salamu alaykum",
    "Bismillah",
    "Alhamdulillah",
    "Allahu akbar"
   ],
   "a": 0,
   "e": "'As-salamu alaykum' means 'peace be upon you' and spreads love among believers."
  },
  {
   "q": "Trading with false measurement is condemned because it is:",
   "o": [
    "dishonest",
    "lawful",
    "optional",
    "encouraged"
   ],
   "a": 0,
   "e": "The Qur'an condemns giving short measure — honesty in trade is an Islamic obligation."
  },
  {
   "q": "The weighing of deeds on the Last Day is done on the:",
   "o": [
    "Mizan (scales)",
    "Sirat",
    "Ka'bah",
    "Minbar"
   ],
   "a": 0,
   "e": "Every deed will be weighed on the Mizan to show the balance of good and evil."
  },
  {
   "q": "The eternal reward for the righteous is called:",
   "o": [
    "Jannah",
    "Jahannam",
    "Dunya",
    "Ma'ad"
   ],
   "a": 0,
   "e": "Jannah is paradise, the eternal reward prepared for the righteous."
  },
  {
   "q": "Belief in the Last Day directly encourages:",
   "o": [
    "accountability in daily life",
    "fatalism and idleness",
    "escaping work",
    "avoiding society"
   ],
   "a": 0,
   "e": "Knowing that deeds are judged and rewarded moves believers towards honesty and self-restraint."
  }
 ],
 "Data Processing": [
  {
   "q": "The brain of the computer that executes instructions is the:",
   "o": [
    "CPU",
    "RAM",
    "Monitor",
    "Hard disk"
   ],
   "a": 0,
   "e": "The Central Processing Unit fetches, decodes and executes program instructions."
  },
  {
   "q": "Which of these is an output device?",
   "o": [
    "Printer",
    "Scanner",
    "Keyboard",
    "Mouse"
   ],
   "a": 0,
   "e": "A printer presents processed data to the user; the others are input devices."
  },
  {
   "q": "Data that has been processed into a meaningful form is called:",
   "o": [
    "information",
    "raw data",
    "bits",
    "firmware"
   ],
   "a": 0,
   "e": "Processing gives data context and meaning, turning it into information."
  },
  {
   "q": "Convert 1010₂ to denary.",
   "o": [
    "10",
    "8",
    "12",
    "20"
   ],
   "a": 0,
   "e": "1010₂ = 8 + 0 + 2 + 0 = 10 in base 10."
  },
  {
   "q": "How many bits are in one byte?",
   "o": [
    "8",
    "4",
    "16",
    "2"
   ],
   "a": 0,
   "e": "A byte is a group of 8 bits."
  },
  {
   "q": "The hexadecimal system has base:",
   "o": [
    "16",
    "8",
    "10",
    "2"
   ],
   "a": 0,
   "e": "Hexadecimal uses digits 0–9 and A–F, i.e. base 16."
  },
  {
   "q": "Which memory is volatile?",
   "o": [
    "RAM",
    "ROM",
    "Hard disk",
    "Flash drive"
   ],
   "a": 0,
   "e": "RAM loses its contents when power is switched off."
  },
  {
   "q": "Data on a secondary storage device is kept:",
   "o": [
    "permanently",
    "only while power is on",
    "for one second",
    "in cache only"
   ],
   "a": 0,
   "e": "Secondary storage is non-volatile and retains data after the computer is off."
  },
  {
   "q": "A solid-state drive differs from a hard disk because it has:",
   "o": [
    "no moving parts",
    "more moving parts",
    "less capacity always",
    "no storage media"
   ],
   "a": 0,
   "e": "SSDs store data on flash memory chips with no rotating platters."
  },
  {
   "q": "Which is an operating system?",
   "o": [
    "Linux",
    "Microsoft Word",
    "Google Chrome",
    "Photoshop"
   ],
   "a": 0,
   "e": "Linux is an OS; the others are application software."
  },
  {
   "q": "A spreadsheet is best used for:",
   "o": [
    "calculations and data tables",
    "writing essays",
    "editing photos",
    "making calls"
   ],
   "a": 0,
   "e": "Spreadsheets (Excel, Sheets) organise data in rows and columns with formulas."
  },
  {
   "q": "The program that starts the computer and manages resources is the:",
   "o": [
    "operating system",
    "browser",
    "antivirus",
    "compiler"
   ],
   "a": 0,
   "e": "The OS boots the machine and coordinates all hardware and software."
  },
  {
   "q": "The protocol that secures web traffic is:",
   "o": [
    "HTTPS",
    "FTP",
    "SMTP",
    "POP3"
   ],
   "a": 0,
   "e": "HTTPS encrypts data between browser and server. FTP transfers files; SMTP/POP3 handle mail."
  },
  {
   "q": "A 'search engine' is used to:",
   "o": [
    "find information on the web",
    "print documents",
    "store files offline",
    "compile code"
   ],
   "a": 0,
   "e": "Search engines index billions of web pages and return relevant results to queries."
  },
  {
   "q": "Which practice improves online security?",
   "o": [
    "using unique strong passwords",
    "sharing passwords with friends",
    "opening every email attachment",
    "using the same password everywhere"
   ],
   "a": 0,
   "e": "Unique, strong passwords limit the damage if one account is compromised."
  },
  {
   "q": "In a database table, a single row of data is a:",
   "o": [
    "record",
    "field",
    "query",
    "report"
   ],
   "a": 0,
   "e": "Rows are records; columns are fields."
  },
  {
   "q": "The field that uniquely identifies each record is the:",
   "o": [
    "primary key",
    "foreign key",
    "memo field",
    "index"
   ],
   "a": 0,
   "e": "A primary key ensures each record can be found and never duplicated."
  },
  {
   "q": "Which spreadsheet formula adds the range B2 to B10?",
   "o": [
    "=SUM(B2:B10)",
    "=ADD B2-B10",
    "=TOTAL(B2,B10)",
    "=COUNT(B2:B10)"
   ],
   "a": 0,
   "e": "SUM(B2:B10) returns the total of the numbers in the range."
  }
 ],
 "Food & Nutrition": [
  {
   "q": "Which nutrient is the body's main energy source?",
   "o": [
    "Carbohydrates",
    "Proteins",
    "Minerals",
    "Water"
   ],
   "a": 0,
   "e": "Carbohydrates (starch, sugar) are the chief energy foods."
  },
  {
   "q": "Proteins are mainly needed for:",
   "o": [
    "body building and repair",
    "energy only",
    "cooling the body",
    "digestion only"
   ],
   "a": 0,
   "e": "Proteins build, repair and maintain body tissues and make enzymes and hormones."
  },
  {
   "q": "Lack of vitamin C causes:",
   "o": [
    "scurvy",
    "rickets",
    "anaemia",
    "goitre"
   ],
   "a": 0,
   "e": "Scurvy (bleeding gums) results from vitamin C deficiency; rickets is vitamin D deficiency."
  },
  {
   "q": "Which foods belong to the protective group?",
   "o": [
    "Fruits and vegetables",
    "Beans and meat",
    "Rice and yam",
    "Butter and oil"
   ],
   "a": 0,
   "e": "Fruits and vegetables supply vitamins and minerals that protect the body."
  },
  {
   "q": "A meal containing rice, fish, vegetables and groundnut oil is:",
   "o": [
    "balanced",
    "one-sided",
    "unhealthy always",
    "incomplete"
   ],
   "a": 0,
   "e": "It provides energy, protein, protective nutrients and fats — a balanced pattern."
  },
  {
   "q": "Energy needs are HIGHEST for:",
   "o": [
    "a growing teenage athlete",
    "a sleeping baby",
    "an elderly bedridden person",
    "an office worker on leave"
   ],
   "a": 0,
   "e": "Rapid growth plus strenuous activity raises energy requirements sharply."
  },
  {
   "q": "A written list of dishes served at a meal is called a:",
   "o": [
    "menu",
    "recipe",
    "budget",
    "ration"
   ],
   "a": 0,
   "e": "The menu states what will be eaten, planned in advance."
  },
  {
   "q": "Which factor does NOT belong in meal planning?",
   "o": [
    "The colour of the plate",
    "Family budget",
    "Nutrient needs",
    "Availability of food"
   ],
   "a": 0,
   "e": "Budget, needs and availability shape a plan; plate colour is presentation."
  },
  {
   "q": "Buying food in season is encouraged because it is:",
   "o": [
    "cheaper and fresher",
    "always imported",
    "more processed",
    "harder to cook"
   ],
   "a": 0,
   "e": "Seasonal produce costs less, is fresher and often more nutritious."
  },
  {
   "q": "The most common cause of food poisoning is:",
   "o": [
    "harmful bacteria",
    "too much salt",
    "overcooking",
    "eating fruit"
   ],
   "a": 0,
   "e": "Bacteria multiply in food that is not cooked, chilled or handled hygienically."
  },
  {
   "q": "Leftover food should be:",
   "o": [
    "cooled and refrigerated quickly",
    "left on the table overnight",
    "reheated later without care",
    "covered with cloth only"
   ],
   "a": 0,
   "e": "Fast cooling and chilling stop bacterial growth."
  },
  {
   "q": "Before handling food, a cook must:",
   "o": [
    "wash hands with soap",
    "taste the food",
    "wear jewellery",
    "wipe hands on apron"
   ],
   "a": 0,
   "e": "Hand-washing with soap and water is the first rule of food hygiene."
  },
  {
   "q": "Which cooking method preserves most vitamins?",
   "o": [
    "Steaming",
    "Deep frying",
    "Boiling for a long time",
    "Grilling at high heat"
   ],
   "a": 0,
   "e": "Steaming cooks with little water contact, so heat-labile vitamins survive better."
  },
  {
   "q": "Cooking food in hot oil is called:",
   "o": [
    "frying",
    "boiling",
    "steaming",
    "stewing"
   ],
   "a": 0,
   "e": "Frying cooks food in hot oil — shallow or deep."
  },
  {
   "q": "A main reason for cooking food is to:",
   "o": [
    "destroy harmful micro-organisms",
    "increase its weight",
    "remove all vitamins",
    "make it raw again"
   ],
   "a": 0,
   "e": "Heat kills bacteria and parasites, making food safe to eat."
  },
  {
   "q": "Which method preserves fish traditionally by removing moisture?",
   "o": [
    "Drying",
    "Frying",
    "Steaming",
    "Grating"
   ],
   "a": 0,
   "e": "Sun-drying removes water, so bacteria cannot grow."
  },
  {
   "q": "Refrigeration preserves food mainly by:",
   "o": [
    "slowing microbial growth",
    "killing all germs",
    "adding preservatives",
    "cooking it"
   ],
   "a": 0,
   "e": "Low temperature slows bacterial multiplication — it does not sterilise the food."
  },
  {
   "q": "Adding salt to meat or fish preserves it because salt:",
   "o": [
    "draws out water",
    "adds vitamins",
    "raises temperature",
    "removes protein"
   ],
   "a": 0,
   "e": "Salt reduces water activity, denying micro-organisms the moisture they need."
  }
 ],
 "French": [
  {
   "q": "Choisissez le bon article: _____ table.",
   "o": [
    "la",
    "le",
    "les",
    "l'"
   ],
   "a": 0,
   "e": "'Table' est féminin, donc 'la table'."
  },
  {
   "q": "Choisissez le bon article: _____ livre.",
   "o": [
    "un",
    "une",
    "des",
    "la"
   ],
   "a": 0,
   "e": "'Livre' (book) est masculin, donc 'un livre'."
  },
  {
   "q": "Le pluriel de 'un cahier' est:",
   "o": [
    "des cahiers",
    "les cahier",
    "un cahiers",
    "des cahier"
   ],
   "a": 0,
   "e": "Au pluriel on ajoute un -s: des cahiers, avec l'article indéfini pluriel 'des'."
  },
  {
   "q": "Conjuguez: Nous (manger) ___ au présent.",
   "o": [
    "mangeons",
    "mangent",
    "manges",
    "mangez"
   ],
   "a": 0,
   "e": "Avec 'nous', le 1er groupe prend -ons: nous mangeons."
  },
  {
   "q": "Le passé composé de 'je finir' est:",
   "o": [
    "j'ai fini",
    "je finis",
    "je finirai",
    "j'avais finir"
   ],
   "a": 0,
   "e": "Avec l'auxiliaire avoir + participe passé: j'ai fini."
  },
  {
   "q": "Avec l'auxiliaire 'être', le participe passé s'accorde avec:",
   "o": [
    "le sujet",
    "l'objet direct",
    "le verbe",
    "rien"
   ],
   "a": 0,
   "e": "Exemple: elle est allée — accord féminin singulier avec le sujet."
  },
  {
   "q": "Choisissez: une ___ maison.",
   "o": [
    "belle",
    "beau",
    "beaux",
    "bel"
   ],
   "a": 0,
   "e": "'Maison' est féminin, donc l'adjectif prend -e: belle."
  },
  {
   "q": "Le possessif correct: ___ frère (masculin singulier).",
   "o": [
    "mon",
    "ma",
    "mes",
    "ton"
   ],
   "a": 0,
   "e": "Devant un nom masculin singulier: mon frère."
  },
  {
   "q": "Quel pronom remplace 'les élèves'?",
   "o": [
    "ils",
    "elle",
    "tu",
    "nous"
   ],
   "a": 0,
   "e": "'Les élèves' est pluriel masculin, donc 'ils'."
  },
  {
   "q": "La sœur de ma mère est ma:",
   "o": [
    "tante",
    "cousine",
    "grand-mère",
    "nièce"
   ],
   "a": 0,
   "e": "La sœur de la mère est la tante."
  },
  {
   "q": "'Je me lève à six heures' signifie:",
   "o": [
    "I get up at six",
    "I sleep at six",
    "I eat at six",
    "I leave at six"
   ],
   "a": 0,
   "e": "Se lever = to get up."
  },
  {
   "q": "Le repas du matin s'appelle:",
   "o": [
    "le petit-déjeuner",
    "le déjeuner",
    "le dîner",
    "le goûter"
   ],
   "a": 0,
   "e": "Le petit-déjeuner est le repas du matin."
  },
  {
   "q": "Avant de lire un texte, il faut d'abord:",
   "o": [
    "lire les questions",
    "deviner des mots",
    "écrire en français",
    "mémoriser tout"
   ],
   "a": 0,
   "e": "Lire les questions guide la recherche de l'information."
  },
  {
   "q": "'Parce que' introduit:",
   "o": [
    "une cause",
    "une conséquence",
    "un contraste",
    "un lieu"
   ],
   "a": 0,
   "e": "Parce que (because) exprime la cause."
  },
  {
   "q": "Quand on répond à une question de compréhension, on doit:",
   "o": [
    "répondre par une phrase complète",
    "copier le texte entier",
    "répondre au hasard",
    "changer le sujet"
   ],
   "a": 0,
   "e": "Une réponse en phrase complète montre qu'on a compris le texte."
  },
  {
   "q": "Une lettre commence par:",
   "o": [
    "la date et la salutation",
    "la conclusion",
    "la signature seulement",
    "le titre"
   ],
   "a": 0,
   "e": "On écrit la date en haut, puis la salutation: Cher/Chere..."
  },
  {
   "q": "Quel connecteur exprime l'ordre final des idées?",
   "o": [
    "enfin",
    "mais",
    "parce que",
    "si"
   ],
   "a": 0,
   "e": "D'abord, ensuite, enfin organisent le plan du texte."
  },
  {
   "q": "La formule de politesse d'une lettre à un ami est:",
   "o": [
    "Amicalement",
    "Sincèrement vôtre, M. le Président",
    "À qui de droit",
    "Veuillez agréer"
   ],
   "a": 0,
   "e": "À un ami on écrit amicalement; les formules officielles conviennent aux lettres formelles."
  }
 ]
};
/* WAEC/NECO-style essay (theory) questions with model answers, marking points and
   examiner tips — every SS1-SS3 subject. Powers the Theory Hall. */
var ESSEY = {
 "Mathematics": [
  {
   "q": "Solve the simultaneous equations: 2x + y = 7 and x − y = 2. Show all your working.",
   "pts": [
    "Correct elimination or substitution method shown",
    "x = 3 and y = 1 clearly stated",
    "Working set out step by step",
    "Answer checked in both original equations"
   ],
   "model": "Adding the two equations eliminates y: 3x = 9, so x = 3. Substituting x = 3 into 2x + y = 7 gives 6 + y = 7, so y = 1. Check: 3 − 1 = 2, which is correct.",
   "tip": "WAEC/NECO award method marks even when the final answer is wrong — always show your working."
  },
  {
   "q": "A trader bought 40 oranges for ₦2,000 and sold each at ₦60. Find his percentage profit.",
   "pts": [
    "Cost price stated (₦2,000)",
    "Total sales = 40 × 60 = ₦2,400",
    "Profit = ₦400",
    "% profit = (profit ÷ cost) × 100 = 20%"
   ],
   "model": "Total sales = 40 × ₦60 = ₦2,400. Profit = ₦2,400 − ₦2,000 = ₦400. Percentage profit = (400 ÷ 2,000) × 100 = 20%.",
   "tip": "State the formula first — it earns a mark even if the arithmetic slips."
  }
 ],
 "English Language": [
  {
   "q": "Write a speech you would deliver to your school assembly on the topic: 'Examination malpractice destroys the future.'",
   "pts": [
    "Correct speech format (salutation, body, conclusion)",
    "At least three developed points",
    "Persuasive and formal tone",
    "Clear ending with a call to action"
   ],
   "model": "Open with the salutation ('The Principal, teachers and fellow students'). Define malpractice and its causes, then develop three points: it kills real knowledge, it devalues certificates, and it leads to cancelled results and blacklisting. End with a direct call to study honestly.",
   "tip": "WAEC marks content, organisation and expression — plan three paragraphs: introduction, body of points, conclusion."
  },
  {
   "q": "From the prose text you studied this term, discuss one major theme and show how the writer develops it.",
   "pts": [
    "Theme clearly named",
    "At least two supporting incidents or characters",
    "Close reference or short quotation",
    "Personal judgement linked to society"
   ],
   "model": "Name the theme (for example, betrayal), choose two scenes that show it, explain what the writer reveals through each, then close with what the novel teaches us about people and society.",
   "tip": "Never retell the whole story — the marks are for analysis, not summary."
  }
 ],
 "Biology": [
  {
   "q": "Describe the process of photosynthesis and state three factors that affect its rate.",
   "pts": [
    "Word equation for photosynthesis (carbon dioxide + water → glucose + oxygen)",
    "Site: chloroplast; pigment: chlorophyll",
    "Role of light, carbon dioxide and water",
    "Three factors: light intensity, CO₂ concentration, temperature"
   ],
   "model": "Green plants make glucose from carbon dioxide and water using light energy trapped by chlorophyll in the chloroplasts, releasing oxygen. The rate rises with light intensity and CO₂ concentration up to a limit, and increases with temperature until enzymes denature, usually above about 45 °C.",
   "tip": "Write the word equation — a correct equation alone often earns full content marks."
  },
  {
   "q": "Explain the differences between arteries, veins and capillaries in structure and function.",
   "pts": [
    "Artery: thick elastic wall; carries blood away from the heart",
    "Vein: thinner wall with valves; carries blood toward the heart",
    "Capillary: wall one cell thick; site of exchange",
    "Pressure differences and blood flow direction"
   ],
   "model": "Arteries have thick, elastic, muscular walls and carry oxygenated blood (except the pulmonary artery) away from the heart under high pressure. Veins have thinner walls and valves to prevent backflow and carry blood toward the heart. Capillaries have walls one cell thick to allow diffusion of materials between blood and tissues.",
   "tip": "Learn the three as contrasts: thick/thin, away from/toward, valves/no valves."
  }
 ],
 "Chemistry": [
  {
   "q": "Distinguish between an electrolyte and a non-electrolyte, giving one example of each.",
   "pts": [
    "Electrolyte conducts electricity in solution or when molten",
    "Non-electrolyte does not conduct",
    "Example: NaCl (electrolyte); sugar or ethanol (non-electrolyte)",
    "Reason: presence of free mobile ions"
   ],
   "model": "An electrolyte is a substance whose aqueous solution or molten state conducts electricity because it contains free mobile ions (for example, NaCl). A non-electrolyte does not conduct because it dissolves or melts without forming ions (for example, sugar).",
   "tip": "Always give the 'why' — free mobile ions — not just the definition."
  },
  {
   "q": "Balance the equation Fe + O₂ → Fe₂O₃ and state the mole ratio of Fe to Fe₂O₃.",
   "pts": [
    "Balanced equation: 4Fe + 3O₂ → 2Fe₂O₃",
    "Mole ratio Fe : Fe₂O₃ = 4 : 2 = 2 : 1",
    "Atom count on both sides verified",
    "Oxygen balanced correctly (6 each side)"
   ],
   "model": "4Fe + 3O₂ → 2Fe₂O₃. Left-hand side: Fe 4, O 6. Right-hand side: Fe 4, O 6. The mole ratio of Fe to Fe₂O₃ is therefore 4 : 2, that is 2 : 1.",
   "tip": "Count the atoms on both sides as the final step — balancing is trial, verification earns the marks."
  }
 ],
 "Physics": [
  {
   "q": "State Newton's three laws of motion and give one everyday example of each.",
   "pts": [
    "First law (inertia) with example, e.g. seatbelts",
    "Second law: F = ma, e.g. pushing a loaded trolley",
    "Third law: action and reaction, e.g. recoil of a gun",
    "Examples correctly matched to laws"
   ],
   "model": "First law: a body stays at rest or in uniform motion unless acted on by a resultant force (a passenger lurches forward when a bus stops). Second law: the acceleration of a body is proportional to the resultant force and inversely proportional to its mass, F = ma (a loaded trolley is harder to push). Third law: to every action there is an equal and opposite reaction (a gun recoils when fired).",
   "tip": "Write each law in your own words AND give the formula F = ma — examiners award both."
  },
  {
   "q": "Define electric current. A current of 2 A flows for 5 minutes. Calculate the charge that passes.",
   "pts": [
    "Current = rate of flow of charge, I = Q/t",
    "Time converted to seconds (300 s)",
    "Q = It = 2 × 300 = 600 C",
    "Unit (coulomb) stated"
   ],
   "model": "Electric current is the rate of flow of charge: I = Q/t. Time = 5 × 60 = 300 s. Q = It = 2 × 300 = 600 coulombs.",
   "tip": "Convert minutes to seconds before substituting — a classic mark trap."
  }
 ],
 "Agricultural Science": [
  {
   "q": "Explain the importance of crop rotation in maintaining soil fertility.",
   "pts": [
    "Alternates crops with different nutrient demands",
    "Legumes restore nitrogen through root nodules",
    "Breaks the life cycle of pests and diseases",
    "Improves soil structure and reduces erosion"
   ],
   "model": "Crop rotation alternates crops so that no single nutrient is drained year after year; legumes such as groundnut fix atmospheric nitrogen, replenishing the soil; pests and diseases that attack one crop starve out when another crop is planted; and varied root systems improve tilth and reduce erosion.",
   "tip": "Link each point to the soil — the question is about fertility, not just farming practice."
  },
  {
   "q": "Describe three methods of preserving farm produce and explain why each works.",
   "pts": [
    "Drying or sun-drying (removes moisture)",
    "Refrigeration or cold storage (slows microbial growth)",
    "Smoking, salting or chemical preservation",
    "Each method linked to its principle"
   ],
   "model": "Sun-drying removes moisture so microbes cannot grow. Refrigeration slows the reproduction of micro-organisms. Smoking and salting create conditions (low moisture, high salt, antimicrobial chemicals) in which spoilage organisms cannot survive.",
   "tip": "Name the method first, then give the principle — two marks per method."
  }
 ],
 "Economics": [
  {
   "q": "Explain the law of diminishing returns and state the condition under which it operates.",
   "pts": [
    "As more units of a variable factor are added to a fixed factor, marginal product eventually falls",
    "Operates in the short run (at least one factor fixed)",
    "Illustration with a farm or factory",
    "Reason: over-utilisation of the fixed factor"
   ],
   "model": "The law states that as successive units of a variable factor (say labour) are added to a fixed factor (say land), the marginal product at first rises but eventually falls. It operates only in the short run, when at least one factor is fixed, because extra workers share the same plot or machinery and each adds less than the last.",
   "tip": "Say 'eventually' — the law does not say output falls at once, only after a point (the point of diminishing returns)."
  },
  {
   "q": "Define price elasticity of demand and explain how it guides a seller in fixing price.",
   "pts": [
    "PED = % change in quantity demanded ÷ % change in price",
    "Elastic demand (>1): a price cut raises total revenue",
    "Inelastic demand (<1): a price rise raises total revenue",
    "Factors: availability of substitutes, necessity, time"
   ],
   "model": "Price elasticity of demand measures the responsiveness of quantity demanded to a change in price. If demand is elastic, a seller lowers price to raise total revenue; if demand is inelastic, the seller raises price. Elasticity depends on substitutes, whether the good is a necessity, and the time available to adjust.",
   "tip": "State the formula AND the two revenue conclusions — both carry marks."
  }
 ],
 "Government": [
  {
   "q": "What is separation of powers? Explain how it is practised in a presidential system.",
   "pts": [
    "Legislature makes laws, executive implements, judiciary interprets",
    "Powers vested in separate organs",
    "Checks and balances between organs",
    "Example: Nigeria's 1999 Constitution (US-style presidential system)"
   ],
   "model": "Separation of powers means the three arms of government — legislature, executive and judiciary — are distinct organs with separate functions and personnel. In a presidential system the president is both head of state and government and is not a member of the legislature; each arm checks the others (for example, the legislature can override a veto and the judiciary can declare acts unconstitutional).",
   "tip": "Show you know the difference from a parliamentary system, where the executive is drawn from the legislature."
  },
  {
   "q": "State four functions of an electoral commission.",
   "pts": [
    "Registration of voters",
    "Compilation and publication of the voters' register",
    "Conduct and supervision of elections",
    "Announcement of results; nomination of candidates"
   ],
   "model": "An electoral commission registers voters, compiles and publishes the voters' register, conducts and supervises elections, receives nominations of candidates and announces election results.",
   "tip": "Four clean points are better than a paragraph — number them."
  }
 ],
 "Literature in English": [
  {
   "q": "Discuss the role of the protagonist in the prose text you studied this term, showing how he or she changes by the end.",
   "pts": [
    "Protagonist clearly identified",
    "Role in the plot described",
    "Evidence of change or growth",
    "Use of close reference or quotation"
   ],
   "model": "Identify the protagonist and his or her role at the start, then trace the key incidents that change him or her, and close with what the character becomes and why the change matters to the theme.",
   "tip": "Use the word 'characterisation' and mention at least one technique (dialogue, action, description)."
  },
  {
   "q": "Examine the use of irony in one poem you have studied.",
   "pts": [
    "Type of irony identified (situational, verbal or dramatic)",
    "Quote or close reference to the poem",
    "Effect of the irony on meaning or mood",
    "Personal response"
   ],
   "model": "Name the poem, identify the irony (for example, a speaker praising what the poem condemns), quote briefly, and explain how the irony sharpens the poem's message or creates its effect.",
   "tip": "One well-chosen quote analysed is worth more than three quoted without comment."
  }
 ],
 "Geography": [
  {
   "q": "Describe the causes and two effects of soil erosion.",
   "pts": [
    "Deforestation, overgrazing and bush burning",
    "Poor farming methods (monoculture, ploughing along slopes)",
    "Agents: running water and wind",
    "Effects: loss of fertile topsoil; siltation of rivers, flooding, reduced yields"
   ],
   "model": "Soil erosion is caused by deforestation, overgrazing, bush burning and poor farming practices that leave soil bare, so that raindrops and wind carry the topsoil away. Its effects include the loss of the fertile top layer (lower yields) and siltation of rivers with flooding downstream.",
   "tip": "Separate cause from effect clearly — two cause points, two effect points, named."
  },
  {
   "q": "Explain three factors that influence the climate of a place.",
   "pts": [
    "Latitude (temperatures fall away from the equator)",
    "Altitude (temperature falls with height)",
    "Distance from the sea (maritime vs continental)",
    "Relief, ocean currents or vegetation (any valid fourth)"
   ],
   "model": "Latitude controls temperature and seasons: places near the equator are hot, poles cold. Altitude: temperatures decrease about 6.5 °C per 1,000 m. Distance from the sea: coastal places have mild, moist climates while inland places are extreme in temperature and drier.",
   "tip": "For each factor, say WHAT it affects (temperature, rainfall, season) — not the factor alone."
  }
 ],
 "Commerce": [
  {
   "q": "Explain the importance of insurance to commerce.",
   "pts": [
    "Spreads and reduces business risk",
    "Gives security for loans (collateral) and confidence",
    "Encourages large-scale trade and investment",
    "Guarantees compensation for loss"
   ],
   "model": "Insurance pools risk: many pay small premiums so the few who suffer loss are compensated. It gives traders security to borrow, encourages bold large-scale trade and investment, and keeps commerce going after fire, theft or accident.",
   "tip": "Mention the insurance principle: many contribute so that the few who suffer are paid."
  },
  {
   "q": "Distinguish between a wholesaler and a retailer, giving two functions of each.",
   "pts": [
    "Wholesaler buys in bulk from producer, sells to retailers",
    "Retailer buys from wholesaler, sells in units to consumers",
    "Wholesaler: breaking bulk, storage, distribution",
    "Retailer: display, credit to consumers, final distribution"
   ],
   "model": "A wholesaler buys in large quantities from the producer and sells in smaller quantities to retailers, while a retailer buys from the wholesaler and sells in units to the final consumer. The wholesaler breaks bulk, stores and distributes; the retailer displays goods, gives credit and completes the final sale.",
   "tip": "Base the distinction on WHO they sell to, not on size of shop."
  }
 ],
 "Computer Studies": [
  {
   "q": "Describe the components of a computer system.",
   "pts": [
    "Hardware: physical parts (input, output, storage units)",
    "Software: system software and application software",
    "Data and human ware (users)",
    "Examples of each component"
   ],
   "model": "A computer system comprises hardware (the physical parts — input, processing, output and storage units such as keyboard, CPU, monitor and hard disk), software (system software like the operating system and application software like word processors), and human ware (the users who run the system), all working on data.",
   "tip": "Use four heads — hardware, software, human ware, data — each with one example."
  },
  {
   "q": "Explain the difference between the Internet and the World Wide Web.",
   "pts": [
    "Internet: the global network of interconnected networks",
    "WWW: an information system of interlinked documents (pages)",
    "Web is accessed over the Internet using HTTP",
    "Other Internet services: email, FTP, file transfer (to show the Web is not the Internet)"
   ],
   "model": "The Internet is the physical and logical network of connected networks that carries data worldwide. The World Wide Web is one service on it — interlinked documents (web pages) accessed through browsers using HTTP. Email, file transfer and video calls run on the Internet without the Web.",
   "tip": "The Web is a SERVICE on the Internet — say the Internet is the network, the Web is the information it carries."
  }
 ],
 "Civic Education": [
  {
   "q": "Define democracy and state four features of a democratic government.",
   "pts": [
    "Government of the people, by the people and for the people",
    "Free, fair and periodic elections",
    "Separation of powers and rule of law",
    "Protection of fundamental human rights / freedom of the press"
   ],
   "model": "Democracy is a system of government in which power belongs to the people, who exercise it directly or through freely elected representatives. Its features include free and fair periodic elections, universal adult suffrage, protection of fundamental human rights, the rule of law, separation of powers and an independent judiciary.",
   "tip": "Define first, then list — the definition alone earns the first mark."
  },
  {
   "q": "Explain three ways a citizen can fight corruption in Nigeria.",
   "pts": [
    "Refusing to give or take bribes",
    "Reporting corruption to agencies (e.g. EFCC, ICPC) / whistle-blowing",
    "Supporting and practising accountability in public office",
    "Leading by example and educating others; voting honestly"
   ],
   "model": "A citizen can refuse to give or take bribes, report corrupt practices to bodies such as the EFCC and ICPC, demand and practise transparency and accountability, and lead by example — educating family and community and making honest choices at the ballot box.",
   "tip": "Make each point an ACTION the citizen takes, not a complaint about the system."
  }
 ],
 "Further Mathematics": [
  {
   "q": "Given f(x) = x² − 4x + 3, find the coordinates of the turning point and state whether it is a maximum or a minimum.",
   "pts": [
    "f′(x) = 2x − 4",
    "Set 2x − 4 = 0 → x = 2",
    "f(2) = (2)² − 4(2) + 3 = −1, so (2, −1)",
    "Minimum, because the coefficient of x² is positive"
   ],
   "model": "f′(x) = 2x − 4. At the turning point f′(x) = 0, so 2x − 4 = 0 and x = 2. f(2) = 4 − 8 + 3 = −1. The turning point is (2, −1), and it is a minimum since the coefficient of x² is positive.",
   "tip": "Say WHY it is a minimum — the sign of the x² coefficient (or the second derivative) earns the mark."
  },
  {
   "q": "Evaluate the determinant of the matrix [[3, 1], [2, 4]] and state whether it is singular.",
   "pts": [
    "det = (3 × 4) − (1 × 2) = 12 − 2 = 10",
    "A matrix is singular when its determinant is zero",
    "Here det ≠ 0, so the matrix is non-singular",
    "Therefore its inverse exists"
   ],
   "model": "det = (3)(4) − (1)(2) = 12 − 2 = 10. Since the determinant is not zero, the matrix is non-singular and its inverse exists.",
   "tip": "Always add the conclusion 'non-singular ⇒ inverse exists' — it is the mark most candidates miss."
  }
 ],
 "Christian Religious Studies": [
  {
   "q": "Account for the two creation stories in Genesis 1–2 and state one lesson each teaches.",
   "pts": [
    "Genesis 1: ordered six-day creation, humanity created in God's image",
    "Genesis 2: more personal account centred on Adam, Eve and the garden",
    "Both affirm God as creator and humans as special",
    "Lessons: God's order and power; human dignity, responsibility and relationship"
   ],
   "model": "Genesis 1 presents creation as an orderly six-day work crowned by humanity made in God's image. Genesis 2 gives a closer account of Adam, Eve and the garden, stressing relationship and responsibility. Genesis 1 teaches God's power and order; Genesis 2 teaches human dignity, stewardship and companionship.",
   "tip": "Contrast, don't merge: one is cosmic and orderly, the other personal and relational."
  },
  {
   "q": "Outline the main events of the Exodus and explain their significance for Israel.",
   "pts": [
    "Call of Moses and the plagues on Egypt",
    "The Passover and the crossing of the Red Sea",
    "Covenant and the Ten Commandments at Sinai",
    "Significance: deliverance from slavery and a covenant identity"
   ],
   "model": "Key events: Moses is called at the burning bush; the ten plagues strike Egypt; Israel marks the Passover; the Red Sea is crossed; and at Sinai God makes a covenant and gives the Ten Commandments. Significance: Israel is delivered from slavery and becomes God's covenant people with a law to live by.",
   "tip": "Show the arc: slavery → plagues → deliverance → covenant. That order carries the marks."
  }
 ],
 "Islamic Religious Studies": [
  {
   "q": "Explain the significance of Tawhid (the oneness of Allah) in the life of a Muslim.",
   "pts": [
    "Allah is one; He has no partner or associate",
    "Tawhid is the foundation of Islamic belief and worship",
    "Belief in the unity of Allah is a condition of true faith",
    "It shapes conduct: gratitude, trust, sincerity and avoidance of shirk"
   ],
   "model": "Tawhid is the belief in the absolute oneness of Allah, who has no partner. It is the foundation of Islam: all worship is directed to Allah alone, and associating partners with Him (shirk) is the gravest error. In daily life Tawhid produces sincerity, gratitude and trust in Allah, since the Muslim answers to one God alone.",
   "tip": "Connect the belief to conduct — the exam wants life, not just a definition."
  },
  {
   "q": "Discuss two ways the Qur'an and the Sunnah guide the daily life of a Muslim.",
   "pts": [
    "Qur'an: source of law, morality and ritual guidance",
    "Sunnah: the practice of the Prophet, explaining and applying the Qur'an",
    "Examples: prayer, charity, honesty and family life",
    "Guidance in both worship (ibadah) and dealings (mu'amalat)"
   ],
   "model": "The Qur'an lays down the rules of worship and morality, while the Sunnah — the sayings and practice of Prophet Muhammad (SAW) — explains and applies them. Together they guide both worship (prayer, fasting, zakat) and everyday dealings (honesty in trade, kindness to parents, charity).",
   "tip": "Give one example from worship and one from daily dealings — that covers both parts of the question."
  }
 ],
 "Data Processing": [
  {
   "q": "Define a database and explain three advantages of a database management system (DBMS).",
   "pts": [
    "An organised collection of related data",
    "Reduced data redundancy",
    "Data integrity, consistency and security",
    "Easy retrieval, sharing and controlled access"
   ],
   "model": "A database is an organised collection of interrelated data stored so that it can be accessed, managed and updated efficiently. A DBMS reduces redundancy, protects data integrity and consistency, secures data through access control, and allows many users to retrieve and share data easily.",
   "tip": "Define first, then three distinct advantages — no overlapping points."
  },
  {
   "q": "Explain the difference between data and information, giving one example of each.",
   "pts": [
    "Data: raw, unprocessed facts",
    "Information: processed data with meaning",
    "Processing transforms data into information",
    "Example: 37.5 (data) → 'temperature 37.5 °C = fever' (information)"
   ],
   "model": "Data are raw, unprocessed facts such as the number '37.5'. Information is data that has been processed and given meaning — 'the body temperature is 37.5 °C, which indicates fever'. Processing, context and presentation turn data into information.",
   "tip": "Keep the example matched: the same value appears as data and then as information."
  }
 ],
 "Food & Nutrition": [
  {
   "q": "Explain the importance of a balanced diet and list the six classes of food.",
   "pts": [
    "Provides all the nutrients in the right proportions",
    "Carbohydrates, proteins, fats and oils, vitamins, minerals, water",
    "Prevents malnutrition and deficiency diseases",
    "Supplies energy, growth, repair and protection"
   ],
   "model": "A balanced diet supplies all the six classes of food — carbohydrates, proteins, fats and oils, vitamins, minerals and water — in the right proportions. It supplies energy, supports growth and repair, and protects the body against malnutrition and deficiency diseases.",
   "tip": "List the six in one breath, then explain importance — the list is a guaranteed mark."
  },
  {
   "q": "Describe three correct methods of food preservation used in the home.",
   "pts": [
    "Refrigeration or freezing (cold slows micro-organisms)",
    "Sun-drying (moisture removed)",
    "Salting, pickling or boiling/sterilisation",
    "Each method linked to how it prevents spoilage"
   ],
   "model": "Refrigeration and freezing slow the growth of micro-organisms; sun-drying removes the moisture microbes need; salting, pickling or thorough boiling/sterilisation changes conditions so microbes cannot survive. Each keeps food safe and usable longer.",
   "tip": "Method + principle = full marks; name the method, then say why it works."
  }
 ],
 "French": [
  {
   "q": "Écrivez une lettre de 80 à 100 mots à votre meilleur ami pour l'inviter à votre fête d'anniversaire.",
   "pts": [
    "Salutation et formule de politesse correctes",
    "Date, heure et lieu indiqués",
    "Trois ou quatre phrases cohérentes",
    "Accords, temps et orthographe acceptables"
   ],
   "model": "Cher ami, J'organise une fête d'anniversaire samedi prochain à seize heures à la maison. Il y aura de la musique, des gâteaux et tous nos amis. Viens avec ta sœur ! Réponds-moi vite. Ton ami, ...",
   "tip": "Respectez la consigne de longueur: comptez environ 85 mots et signez toujours."
  },
  {
   "q": "Décrivez votre journée à l'école en cinq phrases complètes.",
   "pts": [
    "Cinq phrases complètes",
    "Verbes au présent correctement conjugués",
    "Vocabulaire de l'école",
    "Accords et ponctuation corrects"
   ],
   "model": "Je me lève à six heures et je prends mon petit-déjeuner. Je vais à l'école en bus avec mes amis. Le matin, nous avons les cours de français et de mathématiques. Je mange à la cantine à midi. Après les cours, je rentre à la maison et je fais mes devoirs.",
   "tip": "Cinq phrases simples et correctes valent mieux qu'une longue phrase fautive."
  }
 ]
};

