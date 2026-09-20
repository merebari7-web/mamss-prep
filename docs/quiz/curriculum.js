/* ============================================================
   v35 — NIGERIAN CURRICULUM EXPANSION  (lazy, boot-safe)
   Adds the full WAEC/NECO senior-secondary subject range and
   extends the question bank at idle — the shell, bank.js and the
   boot wire are untouched. Provides:
     · 8 new subjects (History, Technical Drawing, Marketing,
       Insurance, Visual Arts, Music, Physical Education,
       Home Economics) → 27 subjects in total
     · ~375 bank questions (267 authored + 108 from the existing
       extra-subject library) distributed across SS1–SS3
     · window.CURR  — topic entries (summary + drill questions)
       for every subject, used by topic drills, mastery map…
     · window.SYLL  — 3-term × 9-row scheme of work per subject
     · TOPICS / SUBJECT_META / QUIZ_RAW.subj extensions
   Exposes window.__curicApi = { subjects, added, list }.
   ============================================================ */
(function () {
  "use strict";
  /* ---------- subject meta: [glyph, colour, svg emblem path] ---------- */
  var META = {
    "History": ["HI", "#5b3d1e", '<path d="M5 19 V6.5 C7 5.4 9.5 5.4 11.5 6.5 V19 C9.5 17.9 7 17.9 5 19 Z"/><path d="M19 18.5 V5.5 C17 6.6 14.5 6.6 12.5 5.5 V18 C14.5 16.9 17 16.9 19 18.5 Z"/><path d="M8 9.5 h1.5 M8 12.5 h1.5 M15.5 9 h1.5 M15.5 12 h1.5"/>'],
    "Technical Drawing": ["TD", "#113a5c", '<path d="M4 5 h16 v13 H4 Z"/><path d="M4 9.5 h16 M9.5 5 V18 M12.5 9.5 L18 15 M18 9.5 L12.5 15"/>'],
    "Marketing": ["MK", "#7a4a12", '<path d="M4 18 V6 l6 4 6-4 v12 Z"/><path d="M4 18 h16 M8 20 h8"/>'],
    "Insurance": ["IN", "#0e4d5e", '<path d="M12 3.5 l6 2.5 v5.5 c0 4.5-3 7.5-6 9 -3-1.5-6-4.5-6-9 V6 Z"/><path d="M9 11.8 l2.2 2.2 3.8-4.2"/>'],
    "Visual Arts": ["VA", "#6a2e63", '<path d="M12 3.8 C7 3.8 4 7.4 4 12 c0 4.6 3.4 8.2 8 8.2 2 0 3-1 3-2.4 0-1.6-1.6-2-1.6-3.4 0-1.5 1.3-2.3 3.3-2.3 h2.1 c1.9 0 3.2-1.3 3.2-3.1 C22 6.4 17.6 3.8 12 3.8 Z"/><circle cx="7.8" cy="9" r="1.1"/><circle cx="12" cy="7.4" r="1.1"/><circle cx="16.2" cy="9.2" r="1.1"/>'],
    "Music": ["MU", "#3f2a7a", '<path d="M9 16.5 V6.5 l9-2 v10"/><circle cx="6.8" cy="16.5" r="2.2"/><circle cx="15.8" cy="14.5" r="2.2"/><path d="M18 4.5 v10"/>'],
    "Physical Education": ["PE", "#8a2f1d", '<path d="M4.5 14.5 l5-1.5 L12 6 l3-1.5 L18.5 7 16.8 9 14 7.6 12 12.8 7 15 Z"/><circle cx="17.6" cy="4.4" r="1.6"/><path d="M4.5 14.5 L2.8 19.5 M12.8 13.2 L10 20 M18 12.5 l3.5 3"/>'],
    "Home Economics": ["HE", "#8c5c14", '<path d="M12 4.5 C8 9 6 11.4 6 14.2 a6 6 0 0 0 12 0 C18 11.4 16 9 12 4.5 Z"/><path d="M12 10.5 c-1.6 1.7-2.4 2.7-2.4 3.9 a2.4 2.4 0 0 0 4.8 0 c0-1.2-.8-2.2-2.4-3.9 Z"/>']
  };
  /* ---------- curriculum data: subject -> topics ----------
     [ [topic, [kws], summary, [ {q,o,a,e} ×3 ], ... ] ]       */
  var T = {
    "History": [
      ["Ancient Nigeria & Early States", ["nok", "benin", "ife", "kanem", "bornu", "oyo empire", "bronze"],
        "Nok (c. 1500 BC–AD 200) made famous terracotta heads and smelted iron. Ife (Yoruba) and Benin are celebrated for bronze and terracotta sculpture. Kanem-Bornu, the Hausa city-states and the Oyo Empire were powerful organised states with long-distance trade.",
        [{ q: "The Nok culture of central Nigeria is best known for its:", o: ["terracotta sculptures", "bronze plaques", "rock paintings", "ivory carvings"], a: 0, e: "Nok terracotta heads and figures, plus early iron smelting, define the culture." },
         { q: "The famous bronze plaques and heads of ancient Nigeria come mainly from:", o: ["Benin", "Kano", "Sokoto", "Ibadan"], a: 0, e: "Benin City's court art (bronze plaques, heads, ivory) is world renowned." },
         { q: "Which empire controlled the trans-Saharan trade routes from the Lake Chad region?", o: ["Kanem-Bornu", "Oyo", "Benin", "Nri"], a: 0, e: "Kanem-Bornu's power rested on control of the central Saharan trade." }] ],
      ["The Trans-Saharan & Atlantic Trades", ["trans-saharan", "caravan", "kola", "slave trade", "palm oil", "legitimate trade"],
        "Camels carried gold, salt, cloth and kola nuts across the Sahara between North Africa and the Sudan. From the 16th century the Atlantic slave trade devastated coastal societies; its abolition (1807) was followed by 'legitimate' trade in palm oil and other produce, which reshaped the Niger Delta.",
        [{ q: "Which animal made trans-Saharan trade possible?", o: ["the camel", "the horse", "the donkey", "the ox"], a: 0, e: "Camels can cross deserts for days without water." },
         { q: "The Atlantic slave trade was replaced in the 19th century mainly by trade in:", o: ["palm oil", "gold dust", "ivory", "salt"], a: 0, e: "After abolition, palm oil became the staple export of the Niger Delta." },
         { q: "The 1807 abolition of the slave trade was passed by the parliament of:", o: ["Britain", "France", "Portugal", "Spain"], a: 0, e: "Britain outlawed the slave trade in 1807 and enforced it with the Royal Navy." }] ],
      ["Colonial Rule in Nigeria", ["amalgamation", "1914", "lord lugard", "indirect rule", "warrant chiefs"],
        "Britain conquered Nigeria by 1903. Lord Lugard's amalgamation of the Northern and Southern Protectorates in 1914 created the modern 'Nigeria'. Indirect rule governed through traditional chiefs — successful in the North, but it invented 'warrant chiefs' and caused crises in the East (e.g. the 1929 Aba Women's Riot).",
        [{ q: "Nigeria was amalgamated into one territory in:", o: ["1914", "1900", "1861", "1939"], a: 0, e: "The Northern and Southern Protectorates merged on 1 January 1914 under Lord Lugard." },
         { q: "The system of ruling through traditional rulers is called:", o: ["indirect rule", "direct rule", "assimilative rule", "martial law"], a: 0, e: "Indirect rule used existing native authorities to enforce British administration." },
         { q: "The 1929 Aba Women's Riot protested against:", o: ["taxation and warrant chiefs", "missionary schools", "railway fares", "the press law"], a: 0, e: "Women of Eastern Nigeria revolted against new taxes and the warrant-chief system." }] ],
      ["Nigerian Nationalism & Independence", ["nationalism", "nnamdi azikiwe", "obafemi awolowo", "amadu bello", "1960", "self-government"],
        "After WWII, nationalist parties emerged: NCNC (Azikiwe), Action Group (Awolowo) and NPC (Bello). Constitutional conferences at London and Lagos led to self-government in 1954-57, and Nigeria became independent on 1 October 1960, with Dr Nnamdi Azikiwe as Governor-General and Sir Abubakar Tafawa Balewa as Prime Minister.",
        [{ q: "Nigeria gained independence on:", o: ["1 October 1960", "1 January 1960", "1 October 1963", "1 October 1957"], a: 0, e: "Independence came on 1 October 1960; Nigeria became a republic in 1963." },
         { q: "The NCNC was led by:", o: ["Nnamdi Azikiwe", "Obafemi Awolowo", "Ahmadu Bello", "Tafawa Balewa"], a: 0, e: "Dr Nnamdi Azikiwe led the National Council of Nigeria and the Cameroons." },
         { q: "Who was Nigeria's first Prime Minister?", o: ["Abubakar Tafawa Balewa", "Nnamdi Azikiwe", "Obafemi Awolowo", "Ahmadu Bello"], a: 0, e: "Sir Abubakar Tafawa Balewa headed the first independent government." }] ]
    ],
    "Technical Drawing": [
      ["Geometric Construction", ["bisect", "angle", "perpendicular", "tangent", "compass", "dividing a line"],
        "A line is bisected by arcs of equal radius from its ends. An angle is bisected by arcs from its vertex. A perpendicular is dropped with compass arcs; tangents touch a circle at exactly one point.",
        [{ q: "To bisect a straight line AB you draw equal arcs from:", o: ["A and B", "the midpoint only", "any two points on AB", "the ends at different radii"], a: 0, e: "Equal arcs from A and B cross above and below; their join bisects AB." },
         { q: "The instrument used to draw circles and arcs is the:", o: ["compass", "setsquare", "protractor", "divider"], a: 0, e: "A compass draws arcs and circles of set radius." },
         { q: "A line that touches a circle at only one point is a:", o: ["tangent", "chord", "secant", "normal"], a: 0, e: "A tangent touches the circle at one point and is perpendicular to the radius there." }] ],
      ["Scale & Dimensioning", ["scale", "ratio", "dimension", "extension line", "leader", "drawing sheet"],
        "Scale is the ratio of drawing size to real size (e.g. 1:2 halves). Dimensions are placed on uniformly spaced dimension lines with arrowheads, using extension lines. A leader lines notes. Standard sheet sizes run A4, A3, A2, A1, A0, each twice the previous area.",
        [{ q: "A drawing at 1:50 means 1 mm on paper equals:", o: ["50 mm on the object", "5 mm on the object", "500 mm on the object", "1 m on the object"], a: 0, e: "The ratio 1:50 reads as 1 unit on paper to 50 units on the object." },
         { q: "Extension lines are used to:", o: ["carry a dimension off the drawing", "join two views", "show hidden edges", "hatch a section"], a: 0, e: "Extension lines project the feature out so the dimension line can sit clear of the drawing." },
         { q: "Which sheet is twice the area of A3?", o: ["A2", "A4", "A1", "A0"], a: 0, e: "Each larger A-series sheet is exactly twice the area of the previous one." }] ],
      ["Orthographic Projection", ["orthographic", "front view", "plan", "end view", "first angle", "third angle"],
        "Orthographic projection shows an object by parallel views: front elevation, plan (from above) and end elevation. First-angle (used in Nigeria) places the plan below the front view; third-angle places the plan above. Hidden edges are shown by dashed lines.",
        [{ q: "In first-angle projection the plan is drawn:", o: ["below the front view", "above the front view", "to the left", "to the right"], a: 0, e: "First angle projects the plan below the front elevation." },
         { q: "Hidden edges in an orthographic view are drawn:", o: ["dashed", "solid thick", "chain thin", "wavy"], a: 0, e: "Short dashes show edges that would be hidden from the viewing direction." },
         { q: "The view of an object as seen from directly above is the:", o: ["plan", "front elevation", "end elevation", "section"], a: 0, e: "The plan is the top view, projected downward in first angle." }] ],
      ["Isometric & Pictorial Drawing", ["isometric", "30 degrees", "axonometric", "pictorial", "oblique"],
        "Pictorial drawing shows three faces at once. In isometric projection the two horizontal axes are drawn at 30°; the vertical axis stays vertical, and all three axes are equally foreshortened. Oblique drawing shows the front face true with receding lines at 30° or 45°.",
        [{ q: "In isometric drawing the horizontal axes are drawn at:", o: ["30° from horizontal", "45° from horizontal", "60° from horizontal", "90° from horizontal"], a: 0, e: "Isometric axes: vertical plus two at 30° above horizontal." },
         { q: "Oblique drawing keeps the ______ face true to scale.", o: ["front", "top", "side", "rear"], a: 0, e: "In oblique projection the front face is drawn full size, with receding lines slanted." },
         { q: "A pictorial drawing that shows three faces of an object is called:", o: ["isometric", "orthographic", "sectional", "development"], a: 0, e: "Isometric and oblique drawings show several faces in one view." }] ]
    ]
  };
  /* — engine (boot first, data appended below via concat) — */
  window.__curicData = window.__curicData || {};
  var D = window.__curicData;
  D.META = D.META || {};
  for (var km in META) D.META[km] = META[km];
  D.T = D.T || {};
  for (var k in T) D.T[k] = T[k];
})();
(function () {
  var META = {
    "Marketing": ["MK", "#7a4a12", '<path d="M4 18 V6 l6 4 6-4 v12 Z"/><path d="M4 18 h16 M8 20 h8"/>'],
    "Insurance": ["IN", "#0e4d5e", '<path d="M12 3.5 l6 2.5 v5.5 c0 4.5-3 7.5-6 9 -3-1.5-6-4.5-6-9 V6 Z"/><path d="M9 11.8 l2.2 2.2 3.8-4.2"/>']
  };
  var T = {
    "Marketing": [
      ["Marketing Concepts & Functions", ["marketing concept", "needs", "wants", "exchange", "market"],
        "Marketing identifies and satisfies customer needs profitably. Its functions include market research, product planning, buying, selling, transportation, storage, grading, financing, risk bearing and information. The marketing concept puts the customer first.",
        [{ q: "The philosophy that a firm should satisfy customer needs profitably is the:", o: ["marketing concept", "production concept", "selling concept", "product concept"], a: 0, e: "The marketing concept centres all decisions on customer needs and satisfaction." },
         { q: "Which is a physical distribution function of marketing?", o: ["transportation", "grading", "financing", "market research"], a: 0, e: "Moving goods from producer to consumer is physical distribution." },
         { q: "The function of dividing products into classes based on quality is:", o: ["grading", "storage", "exchange", "information"], a: 0, e: "Grading sorts products into quality classes; it aids pricing and buying." }] ],
      ["The Marketing Mix (4Ps)", ["product", "price", "place", "promotion", "marketing mix"],
        "The 4Ps: Product (what you sell), Price (what you charge), Place (distribution channels) and Promotion (advertising, sales promotion, personal selling, publicity). They must be blended to serve the target market.",
        [{ q: "The 4Ps of the marketing mix are product, price, place and:", o: ["promotion", "profit", "people", "packaging"], a: 0, e: "The classic mix is the 4Ps: product, price, place, promotion." },
         { q: "Deciding the channel through which goods reach consumers belongs to:", o: ["place", "product", "price", "promotion"], a: 0, e: "Place covers distribution channels, logistics and coverage." },
         { q: "Advertising, personal selling and sales promotion are elements of:", o: ["promotion", "pricing", "packaging", "product planning"], a: 0, e: "Promotion communicates value to the target audience." }] ],
      ["Product & Pricing Decisions", ["product life cycle", "branding", "price", "cost plus", "penetration"],
        "Products pass through introduction, growth, maturity and decline. Branding, packaging and labelling differentiate them. Prices may be cost-plus (cost + margin), penetrating (low to enter a market) or skimming (high at launch).",
        [{ q: "A low price set to enter a new market is called:", o: ["penetration pricing", "price skimming", "cost-plus pricing", "prestige pricing"], a: 0, e: "Penetration pricing uses a low price to capture market share quickly." },
         { q: "The correct order of the product life cycle is:", o: ["introduction, growth, maturity, decline", "growth, introduction, decline, maturity", "introduction, maturity, growth, decline", "maturity, growth, introduction, decline"], a: 0, e: "Products are introduced, grow, mature and then decline." },
         { q: "A name, sign or symbol that identifies a firm's product is a:", o: ["brand", "label", "warranty", "patent"], a: 0, e: "A brand — name, term or symbol — identifies and differentiates a product." }] ],
      ["Distribution & Promotion", ["channel", "wholesaler", "retailer", "middleman", "advertising"],
        "Channels move goods: producer → consumer (direct), or through wholesalers and retailers. Wholesalers buy in bulk and sell to retailers; retailers sell to final consumers. Promotion mixes advertising, personal selling, sales promotion and publicity.",
        [{ q: "A channel of producer → consumer is called:", o: ["direct distribution", "indirect distribution", "wholesale channel", "two-level channel"], a: 0, e: "Selling straight to the user is direct distribution." },
         { q: "The middleman who buys in bulk and resells to retailers is the:", o: ["wholesaler", "broker", "agent", "consumer"], a: 0, e: "Wholesalers buy in bulk, then sell smaller quantities to retailers." },
         { q: "Non-personal paid communication to the public is:", o: ["advertising", "publicity", "personal selling", "sales promotion"], a: 0, e: "Advertising is paid, non-personal promotion through media." }] ]
    ],
    "Insurance": [
      ["Risk & Insurance Principles", ["risk", "peril", "hazard", "insurable interest", "utmost good faith"],
        "Risk is the chance of loss; the peril is the event causing loss and the hazard increases its likelihood. Key principles: utmost good faith (disclose all facts), insurable interest (must lose financially), indemnity (no profit from a claim), subrogation and proximate cause.",
        [{ q: "The principle requiring full and honest disclosure of facts is:", o: ["utmost good faith", "insurable interest", "indemnity", "subrogation"], a: 0, e: "Utmost good faith obliges both parties to reveal all material facts." },
         { q: "For a valid contract, the insured must have a financial interest in the subject matter, called:", o: ["insurable interest", "proximate cause", "contribution", "average"], a: 0, e: "Insurable interest means the insured would suffer financially from the loss." },
         { q: "The event that actually causes a loss is the:", o: ["peril", "hazard", "risk", "premium"], a: 0, e: "A peril is the cause of loss (fire, flood, theft); a hazard increases the chance." }] ],
      ["Types of Insurance", ["life", "fire", "marine", "motor", "burglary", "theft"],
        "Life assurance — whole life, term and endowment — protects against death or pays at maturity. Fire, marine, motor, burglary and consequential-loss policies protect property and earnings. Marine covers hull and cargo against perils of the sea.",
        [{ q: "A policy that pays only if the insured dies within the period is:", o: ["term assurance", "whole life assurance", "endowment", "annuity"], a: 0, e: "Term assurance pays on death within the fixed term only." },
         { q: "Insurance of ships and cargo against perils of the sea is:", o: ["marine insurance", "fire insurance", "motor insurance", "burglary insurance"], a: 0, e: "Marine policies cover hull, cargo and freight at sea." },
         { q: "The contract covering a vehicle against accident and third-party claims is:", o: ["motor insurance", "life assurance", "marine insurance", "aviation insurance"], a: 0, e: "Motor insurance is compulsory for vehicles in Nigeria (third-party minimum)." }] ],
      ["The Insurance Contract", ["proposal", "policy", "premium", "acceptance", "cover note"],
        "The insured submits a proposal form; the insurer may issue a cover note and then the policy — the written contract. The premium is the price paid. Risks not covered are excluded, and the policy states the sum insured.",
        [{ q: "The document that is the written contract of insurance is the:", o: ["policy", "proposal form", "cover note", "certificate"], a: 0, e: "The policy sets out the terms, cover and exclusions." },
         { q: "The amount the insured pays for cover is the:", o: ["premium", "sum insured", "excess", "claim"], a: 0, e: "The premium is the consideration paid for the insurer's promise." },
         { q: "Temporary protection given before the policy is issued is a:", o: ["cover note", "endorsement", "warranty", "indemnity"], a: 0, e: "A cover note gives immediate temporary cover pending the policy." }] ],
      ["Insurance in Nigeria & Claims", ["naicom", "nigeria insurance", "claims", "assessment", "regulation"],
        "The National Insurance Commission (NAICOM) regulates insurers. A claim is reported to the insurer, who assesses the loss before settling it — the insured must prove the loss and give proof of insurable interest.",
        [{ q: "Insurance business in Nigeria is regulated by:", o: ["NAICOM", "CBN", "SEC", "NDIC"], a: 0, e: "The National Insurance Commission supervises insurance companies." },
         { q: "The first step after a loss is to:", o: ["notify the insurer", "repair the property", "cancel the policy", "buy a new policy"], a: 0, e: "Claims must be notified promptly so the insurer can assess the loss." },
         { q: "The principle that the insured cannot profit from a loss is:", o: ["indemnity", "contribution", "cession", "co-insurance"], a: 0, e: "Indemnity restores the insured to the pre-loss financial position." }] ]
    ]
  };
  var D = window.__curicData = window.__curicData || {};
  D.META = D.META || {};
  for (var k in META) D.META[k] = META[k];
  D.T = D.T || {};
  for (var k2 in T) D.T[k2] = T[k2];
})();
(function () {
  var META = {
    "Visual Arts": ["VA", "#6a2e63", '<path d="M12 3.8 C7 3.8 4 7.4 4 12 c0 4.6 3.4 8.2 8 8.2 2 0 3-1 3-2.4 0-1.6-1.6-2-1.6-3.4 0-1.5 1.3-2.3 3.3-2.3 h2.1 c1.9 0 3.2-1.3 3.2-3.1 C22 6.4 17.6 3.8 12 3.8 Z"/><circle cx="7.8" cy="9" r="1.1"/><circle cx="12" cy="7.4" r="1.1"/><circle cx="16.2" cy="9.2" r="1.1"/>'],
    "Music": ["MU", "#3f2a7a", '<path d="M9 16.5 V6.5 l9-2 v10"/><circle cx="6.8" cy="16.5" r="2.2"/><circle cx="15.8" cy="14.5" r="2.2"/><path d="M18 4.5 v10"/>']
  };
  var T = {
    "Visual Arts": [
      ["Elements & Principles of Art", ["line", "shape", "colour", "balance", "rhythm", "contrast", "proportion"],
        "Elements: line, shape, form, colour, value, texture, space. Principles: balance, contrast, emphasis, movement, pattern, rhythm and unity. Warm colours (red, orange, yellow) advance; cool colours (blue, green) recede.",
        [{ q: "Which is an ELEMENT of art?", o: ["line", "balance", "rhythm", "contrast"], a: 0, e: "Line, shape, form, value, colour, texture and space are the elements." },
         { q: "Red, orange and yellow are described as:", o: ["warm colours", "cool colours", "neutral colours", "complementary colours"], a: 0, e: "Warm colours suggest heat and advance in a composition." },
         { q: "The principle concerned with equal visual weight is:", o: ["balance", "texture", "value", "shape"], a: 0, e: "Balance gives stability through symmetrical or asymmetrical arrangement." }] ],
      ["Drawing & Painting Media", ["pencil", "charcoal", "watercolour", "tempera", "palette", "stippling"],
        "Drawing media: pencil, charcoal, pastel, ink. Painting media: watercolour, tempera, gouache, oil and acrylic. Pencil grades range 9H (hard) to 9B (soft). Techniques include hatching, cross-hatching, stippling and blending.",
        [{ q: "A very soft, black pencil is graded:", o: ["9B", "9H", "H", "F"], a: 0, e: "B grades are soft and dark; H grades are hard and light." },
         { q: "Painting with pigments bound in water and gum is:", o: ["tempera", "oil paint", "encaustic", "fresco secco"], a: 0, e: "Tempera uses water-soluble binders such as gum or egg." },
         { q: "Shading made of rows of short dots is called:", o: ["stippling", "hatching", "cross-hatching", "scumbling"], a: 0, e: "Stippling builds tone with dots; hatching uses parallel lines." }] ],
      ["Nigerian Arts & Crafts", ["bronze", "adire", "benin art", "nok", "carving", "textile"],
        "Nok terracottas, Ife and Benin bronzes, Esie stone figures and Tada figures are classical Nigerian art. Crafts: adire (Yoruba indigo resist-dyeing), Akwete and Aso-Oke weaving, Kano and Bida work, and varied wood and calabash carving.",
        [{ q: "The Yoruba indigo resist-dyed cloth is called:", o: ["adire", "aso-oke", "ankara", "kente"], a: 0, e: "Adire is tie- or starch-resisted indigo cloth of the Yoruba." },
         { q: "Aso-Oke is a traditional woven cloth of the:", o: ["Yoruba", "Igbo", "Hausa", "Ijaw"], a: 0, e: "Aso-Oke is the narrow-loom handwoven cloth of the Yoruba." },
         { q: "The classical art of ancient Benin is famous for:", o: ["bronze plaques and heads", "terracotta pots", "rock paintings", "ivory Lydenburg heads"], a: 0, e: "Benin court art is celebrated for its brass/bronze plaques and memorial heads." }] ],
      ["Design & Appreciation", ["design", "composition", "poster", "logo", "appreciation"],
        "Design works for a purpose: posters inform, logos identify. Composition arranges elements toward a focal point. Appreciation judges works by content (subject), form (how it is organised) and technique (the medium and handling).",
        [{ q: "A drawing's arrangement of elements toward a focal point is its:", o: ["composition", "subject", "medium", "perspective"], a: 0, e: "Composition is the overall arrangement of visual elements." },
         { q: "A symbol that identifies an organisation is a:", o: ["logo", "poster", "cartoon", "mural"], a: 0, e: "A logo is a graphic mark identifying a brand or body." },
         { q: "In art appreciation, the material used by the artist is the:", o: ["medium", "theme", "subject", "style"], a: 0, e: "Medium refers to the material (paint, bronze, clay) used to make the work." }] ]
    ],
    "Music": [
      ["Music Theory Basics", ["staff", "clef", "scale", "note", "time signature", "treble"],
        "Music is written on a staff of five lines. The treble clef fixes G on the second line; the bass clef fixes F on the fourth. Scales (e.g. C major) arrange notes by steps, and time signatures state beats per bar.",
        [{ q: "The musical staff has how many lines?", o: ["five", "four", "six", "seven"], a: 0, e: "Notes are placed on and between the five lines of the staff." },
         { q: "The scale with no sharps or flats is:", o: ["C major", "G major", "F major", "D major"], a: 0, e: "C major uses only the white keys — no sharps or flats." },
         { q: "A time signature of 4/4 means each bar has:", o: ["four quarter-note beats", "four half-note beats", "three quarter beats", "six eighth beats"], a: 0, e: "The top number gives beats per bar; 4/4 has four crotchet beats." }] ],
      ["Nigerian Music & Instruments", ["talking drum", "sakara", "dundun", "afrobeat", "highlife", "juju"],
        "The dundun (talking drum) can imitate speech tones; sakara and gangan are Yoruba drums; igba and ekwe feature in Igbo music. Highlife, juju (I.K. Dairo) and afrobeat (Fela Kuti) are popular Nigerian styles.",
        [{ q: "The Yoruba drum that imitates the tones of speech is the:", o: ["talking drum (dundun)", "bata only", "ekwe", "talking drum is Igbo"], a: 0, e: "The dundun talking drum reproduces speech tonal patterns." },
         { q: "Afrobeat was pioneered by:", o: ["Fela Anikulapo Kuti", "I.K. Dairo", "Bobby Benson", "Victor Uwaifo"], a: 0, e: "Fela Kuti fused highlife, jazz, funk and Yoruba rhythms into afrobeat." },
         { q: "Highlife music developed mainly in:", o: ["Ghana and Nigeria", "Kenya", "South Africa", "Ethiopia"], a: 0, e: "Highlife was born in Ghana and grew in Nigeria in the 20th century." }] ],
      ["Musical Forms & Ensembles", ["form", "call and response", "ensemble", "chorus", "sonata"],
        "Form is music's structure: binary (AB), ternary (ABA), rondo (ABACA), theme and variations, and through-composed. Call-and-response is a hallmark of African music — a leader sings and the group answers.",
        [{ q: "A structure of A–B–A is called:", o: ["ternary form", "binary form", "rondo", "sonata"], a: 0, e: "Ternary form returns to the opening section after a contrasting one." },
         { q: "In African music, when a soloist sings and the group replies, it is:", o: ["call and response", "unison singing", "polyphony", "ostinato"], a: 0, e: "Call-and-response alternates leader and chorus." },
         { q: "A repeated rhythmic or melodic pattern is an:", o: ["ostinato", "coda", "cadence", "interval"], a: 0, e: "An ostinato is a persistently repeated figure." }] ],
      ["Composition & Performance", ["composition", "tempo", "dynamics", "articulation", "notation"],
        "Composition involves choosing melody, harmony, rhythm and form. Tempo marks — allegro (fast), moderato (moderate), adagio (slow) — control speed; dynamics (p, mf, f) control volume. Articulation (legato, staccato) shapes notes.",
        [{ q: "A slow tempo marking is:", o: ["adagio", "allegro", "presto", "vivace"], a: 0, e: "Adagio means slow; allegro means fast." },
         { q: "The symbol p means:", o: ["soft (piano)", "loud (forte)", "moderately loud", "very loud"], a: 0, e: "p = piano (soft); f = forte (loud)." },
         { q: "Playing notes smoothly connected is called:", o: ["legato", "staccato", "glissando", "arpeggio"], a: 0, e: "Legato joins notes smoothly; staccato shortens them." }] ]
    ]
  };
  var D = window.__curicData = window.__curicData || {};
  D.META = D.META || {};
  for (var k in META) D.META[k] = META[k];
  D.T = D.T || {};
  for (var k2 in T) D.T[k2] = T[k2];
})();
(function () {
  var META = {
    "Physical Education": ["PE", "#8a2f1d", '<path d="M4.5 14.5 l5-1.5 L12 6 l3-1.5 L18.5 7 16.8 9 14 7.6 12 12.8 7 15 Z"/><circle cx="17.6" cy="4.4" r="1.6"/><path d="M4.5 14.5 L2.8 19.5 M12.8 13.2 L10 20 M18 12.5 l3.5 3"/>'],
    "Home Economics": ["HE", "#8c5c14", '<path d="M12 4.5 C8 9 6 11.4 6 14.2 a6 6 0 0 0 12 0 C18 11.4 16 9 12 4.5 Z"/><path d="M12 10.5 c-1.6 1.7-2.4 2.7-2.4 3.9 a2.4 2.4 0 0 0 4.8 0 c0-1.2-.8-2.2-2.4-3.9 Z"/>']
  };
  var T = {
    "Physical Education": [
      ["Athletics & Track Events", ["sprint", "relay", "javelin", "long jump", "starting block", "track"],
        "Athletics is track (running) and field (jumping, throwing) events. Sprints up to 400 m use starting blocks; relays (4 × 100 m, 4 × 400 m) pass a baton within the changeover zone. The finish is decided by the torso, not the head or arms.",
        [{ q: "In a relay race, the baton must be passed within the:", o: ["changeover zone", "starting line", "finish line", "anywhere on the track"], a: 0, e: "The baton changes hands inside the marked 20 m changeover zone." },
         { q: "The finish of a race is decided when the ______ crosses the line.", o: ["torso", "head", "hand", "foot"], a: 0, e: "Athletics rules define the finish by the torso, not limbs or head." },
         { q: "Which is a field event?", o: ["long jump", "100 m dash", "400 m hurdles", "marathon"], a: 0, e: "Long jump is a field event; the others are track events." }] ],
      ["Ball Games & Skills", ["football", "volleyball", "basketball", "dribbling", "serve", "offside"],
        "Football: 11 a side, 90 minutes, offside rule, throw-in, corner. Volleyball: six players, three touches, rotating service. Basketball: five players, dribbling, three-second rule, free throws.",
        [{ q: "A football team has how many players on the field?", o: ["11", "9", "10", "12"], a: 0, e: "Football is 11 v 11, with substitutions allowed." },
         { q: "In volleyball a team may touch the ball at most ______ times before returning it.", o: ["three", "two", "four", "five"], a: 0, e: "Three touches (usually dig, set, spike) are allowed per side." },
         { q: "Bouncing the ball continuously in basketball is called:", o: ["dribbling", "passing", "shooting", "rebounding"], a: 0, e: "Dribbling is bouncing the ball while moving." }] ],
      ["Gymnastics & Body Conditioning", ["gymnastics", "flexibility", "warm up", "cool down", "strength"],
        "Warm-up raises body temperature and prepares muscles; cool-down returns the body to rest. Gymnastics develops flexibility, balance, strength and co-ordination. Fitness components: strength, speed, endurance, flexibility and agility.",
        [{ q: "The first part of a training session should be:", o: ["a warm-up", "a cool-down", "max effort", "rest"], a: 0, e: "Warming up reduces injury risk and prepares the body for effort." },
         { q: "The ability to move joints through a full range is:", o: ["flexibility", "strength", "speed", "endurance"], a: 0, e: "Flexibility is the range of motion at a joint." },
         { q: "A cool-down helps to:", o: ["return the body to rest gradually", "build muscle", "increase heart rate", "replace lost sweat"], a: 0, e: "Cooling down gradually lowers the heart rate and prevents dizziness." }] ],
      ["Health, Safety & First Aid", ["first aid", "fracture", "bleeding", "cpr", "hygiene", "doping"],
        "First aid is immediate care before medical help. Routine: DRSABC (Danger, Response, Send for help, Airway, Breathing, CPR). Control bleeding by direct pressure; splint fractures without moving the limb; treat burns with cool water.",
        [{ q: "The first step in any first-aid emergency is to check for:", o: ["danger", "pulse", "blood pressure", "temperature"], a: 0, e: "Safety first — ensure the scene is safe before helping." },
         { q: "Severe external bleeding is best controlled by:", o: ["direct pressure on the wound", "a tight tourniquet always", "cold water only", "raising the head"], a: 0, e: "Direct, firm pressure over a clean pad controls most bleeding." },
         { q: "For a suspected fracture you should:", o: ["immobilise the part and seek help", "straighten the limb", "massage the area", "apply heat"], a: 0, e: "Keep the injured part still and splinted; never force it straight." }] ]
    ],
    "Home Economics": [
      ["Nutrition & Food Groups", ["carbohydrate", "protein", "vitamin", "mineral", "balanced diet"],
        "Food provides nutrients: carbohydrates and fats (energy), proteins (growth and repair), vitamins and minerals (protection and regulation), water and fibre. A balanced diet supplies all nutrients in the right proportions.",
        [{ q: "The nutrient chiefly supplying energy is:", o: ["carbohydrate", "protein", "vitamin C", "calcium"], a: 0, e: "Carbohydrates (and fats) are the body's main energy sources." },
         { q: "Protein is needed mainly for:", o: ["growth and repair of body tissues", "quick energy", "digestion of fats", "thickening blood"], a: 0, e: "Proteins build and repair tissues; they can also supply energy." },
         { q: "Calcium is essential for strong:", o: ["bones and teeth", "nerves only", "hair", "blood sugar"], a: 0, e: "Calcium builds bones and teeth and aids nerve and muscle function." }] ],
      ["Meal Planning & Food Preparation", ["meal planning", "food groups", "budget", "cooking methods", "hygiene"],
        "Meal planning balances the food groups, the family's needs, the budget and the season. Methods: boiling, steaming, frying, roasting, baking. Kitchen hygiene — washing hands, covering food, clean utensils — prevents food poisoning.",
        [{ q: "A meal planned for a family should first satisfy:", o: ["nutritional needs within the budget", "the cook's preference", "the latest fashion", "the cheapest dish only"], a: 0, e: "Plan around nutritional needs, family tastes and the available money." },
         { q: "Cooking food in steam above boiling water is:", o: ["steaming", "frying", "grilling", "braising"], a: 0, e: "Steaming cooks by moist heat and preserves nutrients." },
         { q: "To prevent food poisoning, cooked food should be:", o: ["covered and refrigerated promptly", "left on the counter overnight", "reheated many times", "stored with raw meat"], a: 0, e: "Cool cooked food quickly and refrigerate it; keep raw and cooked separate." }] ],
      ["Sewing & Clothing", ["fabric", "weave", "body measurement", "seams", "pattern"],
        "Fibres are natural (cotton, wool, silk) or synthetic (polyester, nylon). Weaves include plain, twill and satin. Take body measurements (bust, waist, hip) before cutting; seams join fabric and finishes prevent fraying.",
        [{ q: "Which is a natural fibre?", o: ["cotton", "polyester", "nylon", "acrylic"], a: 0, e: "Cotton, wool, silk and linen are natural fibres." },
         { q: "The woven pattern of a fabric that shows diagonal lines is:", o: ["twill weave", "plain weave", "satin weave", "knit"], a: 0, e: "Twill weave gives diagonal ridges (e.g. denim)." },
         { q: "Before cutting a garment you should take:", o: ["body measurements", "the fabric price", "washing instructions", "twice the length"], a: 0, e: "Accurate body measurements ensure a good fit." }] ],
      ["Family & Home Management", ["budget", "income", "resources", "home care", "savings"],
        "Home management uses family resources (money, time, energy, skills) to meet goals. A budget plans income against expenditure: essentials first, then savings. Home care covers cleaning, laundry, refuse disposal and safety.",
        [{ q: "A family plan of income and spending is a:", o: ["budget", "receipt", "loan", "lease"], a: 0, e: "A budget is a written plan of expected income and expenditure." },
         { q: "Which spending should a family budget place first?", o: ["essentials such as food and rent", "entertainment", "luxury items", "gifts"], a: 0, e: "Needs — food, shelter, health, education — come before wants." },
         { q: "Setting aside part of income for the future is called:", o: ["saving", "spending", "borrowing", "wasting"], a: 0, e: "Savings provide security for future needs and emergencies." }] ]
    ]
  };
  var D = window.__curicData = window.__curicData || {};
  D.META = D.META || {};
  for (var k in META) D.META[k] = META[k];
  D.T = D.T || {};
  for (var k2 in T) D.T[k2] = T[k2];
})();
(function () {
  var T = {
    "Mathematics": [
      ["Financial Arithmetic", ["simple interest", "compound", "vat", "discount", "profit", "commission"], "Interest I = PRT/100; amount A = P(1 + R/100)ⁿ for compound interest. Discount, profit, VAT and commission are all percentage applications.", [
        { q: "Find the simple interest on ₦50,000 at 8% per annum for 3 years.", o: ["₦12,000", "₦8,000", "₦4,000", "₦24,000"], a: 0, e: "I = PRT/100 = 50000 × 8 × 3 ÷ 100 = ₦12,000." },
        { q: "A trader marks goods at ₦20,000 and offers a 15% discount. The selling price is:", o: ["₦17,000", "₦3,000", "₦15,000", "₦16,500"], a: 0, e: "Discount = 15% of 20,000 = 3,000; SP = 20,000 − 3,000 = ₦17,000." },
        { q: "At 5% compound interest, ₦100,000 grows to how much after 2 years?", o: ["₦110,250", "₦110,000", "₦105,000", "₦115,000"], a: 0, e: "A = 100000(1.05)² = 100000 × 1.1025 = ₦110,250." }] ],
      ["Simultaneous Equations", ["simultaneous", "elimination", "substitution", "linear equations"], "Solve by substitution or elimination: make the coefficients of one variable equal, then add or subtract.", [
        { q: "Solve: x + y = 9 and x − y = 3.", o: ["x = 6, y = 3", "x = 3, y = 6", "x = 5, y = 4", "x = 7, y = 2"], a: 0, e: "Adding gives 2x = 12, so x = 6 and y = 9 − 6 = 3." },
        { q: "If 2x + y = 11 and x + y = 7, then x =", o: ["4", "3", "5", "6"], a: 0, e: "Subtract: (2x + y) − (x + y) = 11 − 7 → x = 4." },
        { q: "Solve: 3x − y = 5 and x + y = 7.", o: ["x = 3, y = 4", "x = 4, y = 3", "x = 2, y = 5", "x = 5, y = 2"], a: 0, e: "Adding gives 4x = 12 → x = 3, so y = 7 − 3 = 4." }] ],
      ["Probability: Combined Events", ["tree diagram", "independent events", "mutually exclusive", "with replacement"], "P(A and B) = P(A) × P(B) for independent events; P(A or B) = P(A) + P(B) for mutually exclusive events. Tree diagrams track outcomes of successive events.", [
        { q: "A coin is tossed twice. The probability of two heads is:", o: ["1/4", "1/2", "1/3", "3/4"], a: 0, e: "P(HH) = 1/2 × 1/2 = 1/4." },
        { q: "Two fair dice are thrown. P(both show 6) =", o: ["1/36", "1/6", "1/12", "1/18"], a: 0, e: "Independent: 1/6 × 1/6 = 1/36." },
        { q: "A bag has 3 red and 2 blue balls. A ball is drawn, replaced, and another drawn. P(red then blue) =", o: ["6/25", "9/25", "4/25", "3/10"], a: 0, e: "3/5 × 2/5 = 6/25 (with replacement)." }] ]
    ],
    "English Language": [
      ["Word Usage & Register", ["register", "collocation", "word usage", "suitable"], "Register is the style of language suited to a situation (formal, informal, technical). Collocations are words that naturally go together, e.g. 'make a decision', not 'do a decision'.", [
        { q: "Choose the most suitable word: 'The committee was ______ to three members.'", o: ["reduced", "decreased", "lessened", "abridged"], a: 0, e: "'Reduced to' is the correct collocation for numbers of people." },
        { q: "The correct expression is:", o: ["make a decision", "do a decision", "perform a decision", "take a decision"], a: 0, e: "'Make a decision' is the standard collocation." },
        { q: "'The doctor ______ the patient to rest.' The most formal word is:", o: ["advised", "told", "said", "informed"], a: 0, e: "Advise is the formal, professional register for medical guidance." }] ],
      ["Concord & Agreement", ["concord", "agreement", "subject verb", "singular", "plural"], "A verb agrees with its subject: singular subject takes a singular verb. Intervening phrases ('as well as', 'together with') do not change the number, and 'each/every' take singular verbs.", [
        { q: "Choose the correct form: 'Each of the boys ______ a pen.'", o: ["has", "have", "are having", "were having"], a: 0, e: "'Each' takes a singular verb: has." },
        { q: "'The teacher, together with the pupils, ______ present.'", o: ["was", "were", "are", "have been"], a: 0, e: "The subject is 'the teacher' (singular), so 'was'." },
        { q: "'Either the man or his wife ______ the house.'", o: ["owns", "own", "are owning", "have owned"], a: 0, e: "With 'either…or', the verb agrees with the nearer subject: 'his wife' → owns." }] ],
      ["Comprehension Skills", ["skimming", "scanning", "main idea", "inference", "context"], "Skim for the general idea, scan for specific facts. The main idea is what the paragraph is about; inference draws meaning not directly stated; context gives meaning to unfamiliar words.", [
        { q: "Reading quickly to get the general idea is called:", o: ["skimming", "scanning", "proofreading", "editing"], a: 0, e: "Skimming gives the gist; scanning looks for one detail." },
        { q: "A meaning the writer suggests without stating directly is:", o: ["an inference", "a fact", "a topic sentence", "a summary"], a: 0, e: "Inference is reading between the lines." },
        { q: "The sentence that states a paragraph's central point is the:", o: ["topic sentence", "closing sentence", "conclusion", "transition"], a: 0, e: "The topic sentence usually opens the paragraph with its main idea." }] ]
    ],
    "Biology": [
      ["Reproduction & Growth", ["pollination", "germination", "menstrual cycle", "fertilisation", "seed dispersal"], "Flowering plants reproduce by pollination and fertilisation; seeds germinate given water, oxygen and warmth. In humans the menstrual cycle (~28 days) prepares the uterus; fertilisation occurs in the oviduct.", [
        { q: "The transfer of pollen from anther to stigma is:", o: ["pollination", "germination", "fertilisation", "transpiration"], a: 0, e: "Pollination is the transfer of pollen; fertilisation is the fusion of gametes." },
        { q: "Which conditions are essential for seed germination?", o: ["water, oxygen and warmth", "light, carbon dioxide and cold", "darkness, heat and nitrogen", "only water in any amount"], a: 0, e: "Seeds need water, oxygen and a suitable temperature to germinate." },
        { q: "Fertilisation in a woman normally occurs in the:", o: ["oviduct (fallopian tube)", "uterus", "vagina", "ovary"], a: 0, e: "The sperm meets the egg in the oviduct; implantation follows in the uterus." }] ],
      ["Microbiology & Disease", ["bacteria", "virus", "malaria", "immunisation", "antibiotic"], "Pathogens: viruses (smaller, need host cells), bacteria, protozoa, fungi. Malaria is caused by Plasmodium, spread by female Anopheles mosquitoes. Antibiotics treat bacteria, not viruses; vaccines give immunity.", [
        { q: "Malaria is caused by:", o: ["Plasmodium", "a virus", "a bacterium", "a fungus"], a: 0, e: "Plasmodium (a protozoan) is carried by female Anopheles mosquitoes." },
        { q: "Antibiotics are effective against:", o: ["bacteria", "viruses", "all diseases", "malaria only"], a: 0, e: "Antibiotics kill bacteria; they do not work on viruses." },
        { q: "A substance that stimulates immunity without causing illness is a:", o: ["vaccine", "antibiotic", "antiseptic", "hormone"], a: 0, e: "Vaccines train the immune system with a harmless form of the pathogen." }] ],
      ["Transport in Plants", ["xylem", "phloem", "transpiration", "osmosis", "root pressure"], "Water moves up the xylem from roots to leaves, pulled by transpiration. Food (sucrose) moves in the phloem. Water enters root hairs by osmosis.", [
        { q: "Water is transported up a plant through the:", o: ["xylem", "phloem", "cambium", "cortex"], a: 0, e: "Xylem carries water and minerals; phloem carries food." },
        { q: "The loss of water vapour from leaves is:", o: ["transpiration", "respiration", "photosynthesis", "translocation"], a: 0, e: "Transpiration through stomata drives the transpiration stream." },
        { q: "Food made in leaves travels to other parts via the:", o: ["phloem", "xylem", "stomata", "veins only"], a: 0, e: "Phloem translocates sucrose and amino acids around the plant." }] ]
    ],
    "Chemistry": [
      ["Metals & Extraction", ["blast furnace", "ore", "alloy", "electrolysis", "iron", "aluminium"], "Metals occur as ores. Iron is extracted in a blast furnace with coke and limestone; aluminium by electrolysis of molten bauxite (cryolite lowers the melting point). Alloys (steel, brass) mix metals to improve properties.", [
        { q: "Iron is extracted from its ore in a:", o: ["blast furnace", "soap flask", "fractional column", "catalytic converter"], a: 0, e: "The blast furnace reduces iron ore with carbon monoxide from coke." },
        { q: "Aluminium is extracted from bauxite by:", o: ["electrolysis", "roasting", "fractional distillation", "precipitation"], a: 0, e: "Molten alumina is electrolysed — carbon electrodes produce aluminium." },
        { q: "A mixture of copper and zinc is the alloy:", o: ["brass", "steel", "bronze", "solder"], a: 0, e: "Brass = copper + zinc; bronze = copper + tin." }] ],
      ["Electrochemistry", ["electrolysis", "electrolyte", "electrode", "anode", "cathode", "faraday"], "Electrolysis passes current through an electrolyte. Oxidation occurs at the anode (+), reduction at the cathode (−). The amount of product depends on charge passed.", [
        { q: "In electrolysis, oxidation occurs at the:", o: ["anode", "cathode", "salt bridge", "voltmeter"], a: 0, e: "Anions lose electrons at the anode (oxidation)." },
        { q: "Which solution is a good electrolyte?", o: ["dilute sulphuric acid", "distilled water", "sugar solution", "pure alcohol"], a: 0, e: "Acids, bases and salts in water conduct because they ionise." },
        { q: "During electrolysis, cations move toward the:", o: ["cathode", "anode", "anode and cathode equally", "surface of the liquid"], a: 0, e: "Positive ions (cations) migrate to the negative electrode, the cathode." }] ],
      ["Air & Combustion", ["oxygen", "nitrogen", "combustion", "burning", "rusting", "air"], "Air is about 78% nitrogen and 21% oxygen. Combustion needs fuel, oxygen and heat. Rusting of iron needs oxygen and water; burning magnesium gives a white ash of magnesium oxide.", [
        { q: "Air contains approximately ______ oxygen.", o: ["21%", "78%", "50%", "1%"], a: 0, e: "By volume air is ~78% nitrogen, 21% oxygen, 1% other gases." },
        { q: "The three conditions for combustion are fuel, heat and:", o: ["oxygen (air)", "nitrogen", "carbon dioxide", "moisture"], a: 0, e: "Remove any of fuel, heat or oxygen and burning stops." },
        { q: "Magnesium burns in air to form:", o: ["magnesium oxide", "magnesium chloride", "magnesium nitrate", "magnesium carbonate"], a: 0, e: "2Mg + O₂ → 2MgO, a white solid." }] ]
    ],
    "Physics": [
      ["Electronics & Semiconductors", ["diode", "transistor", "p-n junction", "rectification", "semiconductor"], "Semiconductors (silicon, germanium) conduct better than insulators. A p-n junction diode allows current one way — it rectifies AC to DC. A transistor (three layers) amplifies signals or switches circuits.", [
        { q: "A diode allows current to flow in:", o: ["one direction only", "both directions", "alternating directions", "no direction"], a: 0, e: "The p-n junction is forward-biased one way and blocks the reverse direction." },
        { q: "Converting AC into DC is called:", o: ["rectification", "amplification", "oscillation", "modulation"], a: 0, e: "Diodes rectify; a full-wave rectifier uses four diodes in a bridge." },
        { q: "Which is a semiconductor?", o: ["silicon", "copper", "glass", "rubber"], a: 0, e: "Silicon and germanium are the classic semiconductors." }] ],
      ["Simple Machines", ["lever", "pulley", "inclined plane", "machanical advantage", "efficiency"], "Machines trade force for distance. MA = load/effort; VR = distance moved by effort ÷ distance by load; efficiency = MA/VR × 100%. Levers, pulleys, inclined planes, wedges, screws and wheel-and-axle are simple machines.", [
        { q: "MA = load ÷ effort. A machine lifting 200 N with 50 N effort has MA =", o: ["4", "0.25", "150", "250"], a: 0, e: "200/50 = 4." },
        { q: "A lever's turning effect is called:", o: ["moment", "work", "power", "pressure"], a: 0, e: "Moment = force × perpendicular distance from the pivot." },
        { q: "A machine with no friction would have efficiency:", o: ["100%", "50%", "0%", "more than 100%"], a: 0, e: "Efficiency compares useful work output to total input; friction lowers it below 100%." }] ],
      ["Heat Transfer", ["conduction", "convection", "radiation", "vacuum", "conductor"], "Heat moves by conduction (solids, no bulk motion), convection (fluids, rising currents) and radiation (electromagnetic waves, no medium needed). Vacuum flasks stop convection and conduction; silvered surfaces minimise radiation.", [
        { q: "Heat transfer through a metal rod by molecular vibration is:", o: ["conduction", "convection", "radiation", "evaporation"], a: 0, e: "Conduction passes energy from molecule to molecule without bulk movement." },
        { q: "Convection currents occur mainly in:", o: ["liquids and gases", "solids only", "vacuum", "all states equally"], a: 0, e: "Convection needs fluid flow, so only liquids and gases." },
        { q: "Heat from the Sun reaches the Earth by:", o: ["radiation", "conduction", "convection", "conduction through space"], a: 0, e: "Radiation crosses empty space; conduction and convection need matter." }] ]
    ],
    "Agricultural Science": [
      ["Farm Records & Accounting", ["farm records", "inventory", "ledger", "profit", "accounting"], "Records: inventory, labour, production, sales, financial. They guide planning, credit and taxation. Profit = total revenue − total cost; budgeting matches expected income and expenses.", [
        { q: "A record of all the assets on a farm is the:", o: ["inventory", "journal", "receipt", "work diary"], a: 0, e: "An inventory lists farm assets — equipment, stock, buildings — and their value." },
        { q: "Profit equals:", o: ["total revenue minus total cost", "total revenue plus cost", "sales minus debt", "income per hectare"], a: 0, e: "Profit is the surplus of revenue over all costs." },
        { q: "Which record gives the daily list of produce sold?", o: ["sales record", "inventory", "labour record", "land register"], a: 0, e: "Sales records track produce sold, prices and buyers." }] ],
      ["Crop Pests & Diseases", ["pest", "disease", "weed", "control", "pesticide", "resistant varieties"], "Pests (insects, nematodes, rodents) damage crops; diseases are caused by fungi, bacteria and viruses. Controls: cultural, biological, chemical, mechanical; resistant varieties and crop rotation reduce attacks.", [
        { q: "Using natural enemies to control pests is:", o: ["biological control", "chemical control", "mechanical control", "cultural control"], a: 0, e: "Biological control uses predators or parasites of the pest." },
        { q: "Growing different crops on a field in sequence is:", o: ["crop rotation", "monoculture", "mixed farming", "intercropping"], a: 0, e: "Rotation breaks pest and disease cycles and restores soil fertility." },
        { q: "Which disease of maize is caused by a fungus?", o: ["smut", "mosaic", "streak", "blotch of rice"], a: 0, e: "Maize smut is a fungal disease producing galls on the cob." }] ],
      ["Agricultural Marketing & Co-operatives", ["marketing", "cooperative", "middlemen", "grading", "market"], "Marketing moves produce from farm to consumer through functions: assembling, grading, storage, transport and selling. Middlemen add cost; co-operatives let farmers bulk and market together to earn better prices.", [
        { q: "A farmers' organisation that buys inputs and sells produce for members is a:", o: ["co-operative society", "plantation", "commodity board only", "research institute"], a: 0, e: "Co-operatives pool resources to buy cheaper and sell at better prices." },
        { q: "Sorting produce into quality classes is called:", o: ["grading", "assorting", "assembling", "bulking"], a: 0, e: "Grading raises market value and sets fair prices." },
        { q: "The main disadvantage of many middlemen is:", o: ["higher prices for consumers", "better quality produce", "faster transport", "lower storage cost"], a: 0, e: "Each middleman adds margin, raising the final consumer price." }] ]
    ],
    "Economics": [
      ["Economic Systems", ["capitalism", "socialism", "mixed economy", "planned economy", "public sector"], "Capitalism lets private owners and prices decide; socialism has state ownership and planning; a mixed economy (like Nigeria's) combines both — private firms with government regulation and state enterprises.", [
        { q: "An economy where resources are owned and allocated by the state is:", o: ["socialist/planned", "capitalist", "mixed", "traditional"], a: 0, e: "Socialism centralises ownership and planning in the state." },
        { q: "Nigeria is best described as a ______ economy.", o: ["mixed", "pure capitalist", "pure socialist", "barter"], a: 0, e: "Private and public sectors operate together under regulation." },
        { q: "In capitalism, prices are mainly determined by:", o: ["market forces of demand and supply", "government decree", "traditional customs", "central committees"], a: 0, e: "The price mechanism — demand and supply — allocates resources." }] ],
      ["Population & Labour Force", ["population", "birth rate", "labour force", "migration", "overpopulation"], "Population size changes with births, deaths and migration. The labour force is the working-age population willing and able to work. A large dependent population lowers output per head.", [
        { q: "The number of live births per 1,000 people per year is the:", o: ["birth rate", "fertility index", "growth rate", "mortality rate"], a: 0, e: "Birth rate = live births per 1,000 population per year." },
        { q: "People of working age who are able and willing to work form the:", o: ["labour force", "dependent population", "population density", "workforce reserve"], a: 0, e: "The labour force excludes children, retirees and the inactive." },
        { q: "Movement of people from rural to urban areas is:", o: ["rural-urban migration", "emigration", "commuting", "immigration"], a: 0, e: "Rural–urban migration swells cities and can drain farm labour." }] ],
      ["International Trade & Exchange", ["export", "import", "exchange rate", "balance of payments", "devaluation"], "Exports earn foreign exchange; imports use it. The balance of payments records all transactions. A country's currency price (exchange rate) moves with demand and supply; devaluation cheapens exports.", [
        { q: "Goods sold to other countries are:", o: ["exports", "imports", "re-exports", "duty"], a: 0, e: "Exports are goods and services sold abroad." },
        { q: "A record of a country's transactions with the rest of the world is the:", o: ["balance of payments", "budget", "national debt", "gross domestic product"], a: 0, e: "The balance of payments covers trade and financial flows." },
        { q: "If the naira is devalued, Nigerian exports become:", o: ["cheaper for foreigners", "dearer for foreigners", "unchanged in price", "illegal"], a: 0, e: "Devaluation makes exports cheaper in foreign currency, boosting demand." }] ]
    ]
  };
  var D = window.__curicData = window.__curicData || {};
  D.T = D.T || {};
  for (var k in T) D.T[k] = T[k];
})();
(function () {
  var T = {
    "Government": [
      ["Nigerian Federalism", ["federalism", "states", "concurrent list", "exclusive list", "constitution"], "Federalism divides power between the centre and component units. Nigeria's constitution uses an exclusive list (federal only), concurrent list (both) and residual list (states). It promotes unity in diversity but is expensive.", [
        { q: "Matters on which only the federal government can legislate are on the:", o: ["exclusive list", "concurrent list", "residual list", "executive list"], a: 0, e: "The exclusive list covers defence, currency, foreign affairs and similar national matters." },
        { q: "Under federalism, power is shared between the central government and the:", o: ["component states", "local governments only", "traditional rulers", "military"], a: 0, e: "Federalism allocates powers between centre and constituent units." },
        { q: "A major advantage of federalism in Nigeria is:", o: ["unity in diversity", "cheap administration", "single legal system", "central control"], a: 0, e: "Federalism lets diverse groups coexist under one country." }] ],
      ["The Executive & Judiciary", ["executive", "president", "judiciary", "separation of powers", "judicial review"], "The executive implements laws; the judiciary interprets them and can declare acts unconstitutional (judicial review). Separation of powers prevents one organ dominating the others.", [
        { q: "The arm of government that implements laws is the:", o: ["executive", "legislature", "judiciary", "civil service only"], a: 0, e: "The executive enforces and administers the law." },
        { q: "The power of courts to declare laws unconstitutional is:", o: ["judicial review", "executive order", "legislative veto", "impeachment"], a: 0, e: "Judicial review checks the other branches against the constitution." },
        { q: "The doctrine that each arm of government operates independently is:", o: ["separation of powers", "rule of law", "federal character", "checks only"], a: 0, e: "Separation of powers keeps executive, legislature and judiciary distinct." }] ],
      ["Electoral Processes", ["election", "franchise", "ballot", "electoral commission", "vote"], "Free and fair elections require an independent electoral commission (INEC), voter registration, secret ballot, and campaigning rules. Franchise is the right to vote. Rigging and violence undermine democracy.", [
        { q: "The body that conducts federal elections in Nigeria is:", o: ["INEC", "NASS", "EFCC", "NYSC"], a: 0, e: "The Independent National Electoral Commission organises elections." },
        { q: "The right to vote is called the:", o: ["franchise", "mandate", "suffragette", "electorate"], a: 0, e: "Franchise (suffrage) is the legal right to vote." },
        { q: "The system where the candidate with the most votes wins is:", o: ["first-past-the-post", "proportional representation", "run-off only", "electoral college only"], a: 0, e: "In first-past-the-post the highest polling candidate wins." }] ]
    ],
    "Literature in English": [
      ["Prose Fiction: Narrative", ["plot", "characterisation", "narration", "third person", "setting"], "Plot is the sequence of events (exposition, rising action, climax, resolution). Characterisation builds characters through speech, action and thought; the narrator may be first or third person.", [
        { q: "The sequence of events in a novel is its:", o: ["plot", "theme", "setting", "style"], a: 0, e: "Plot orders events and builds conflict to a climax." },
        { q: "A story told by 'he' or 'she' uses a ______ narrator.", o: ["third-person", "first-person", "second-person", "omniscient only"], a: 0, e: "Third-person narration reports events from outside the 'I'." },
        { q: "The turning point of a story's action is the:", o: ["climax", "exposition", "denouement", "flashback"], a: 0, e: "The climax is the moment of greatest tension before resolution." }] ],
      ["Poetry: Sound & Rhythm", ["rhyme", "rhythm", "alliteration", "assonance", "metre"], "Poets use rhyme (line-end sound matches), rhythm and metre (pattern of stressed syllables), alliteration (repeated consonants) and assonance (repeated vowels) to create music and meaning.", [
        { q: "Repetition of initial consonant sounds is:", o: ["alliteration", "assonance", "onomatopoeia", "simile"], a: 0, e: "Alliteration repeats initial consonants, e.g. 'slippery slope'." },
        { q: "The pattern of stressed and unstressed syllables is:", o: ["metre", "rhyme", "stanza", "refrain"], a: 0, e: "Metre is the rhythmic pattern of a line." },
        { q: "'Buzz', 'hiss' and 'crash' are examples of:", o: ["onomatopoeia", "metaphor", "personification", "irony"], a: 0, e: "Onomatopoeia imitates the sound it names." }] ],
      ["Drama: Stagecraft", ["tragedy", "comedy", "dramatic irony", "soliloquy", "act"], "Drama is written to be performed. Tragedy ends in disaster for the hero; comedy amuses and usually ends happily. A soliloquy reveals a character's thoughts; dramatic irony occurs when the audience knows more than the character.", [
        { q: "A play in which the hero falls through a fatal flaw is a:", o: ["tragedy", "comedy", "farce", "melodrama"], a: 0, e: "Tragedy shows the hero's downfall, often through hamartia." },
        { q: "A long speech by one character alone on stage is a:", o: ["soliloquy", "dialogue", "aside to the audience only", "chorus"], a: 0, e: "A soliloquy speaks the character's private thoughts aloud." },
        { q: "When the audience knows something the character does not, it is:", o: ["dramatic irony", "suspense", "flashback", "satire"], a: 0, e: "Dramatic irony creates tension from the gap in knowledge." }] ]
    ],
    "Geography": [
      ["Map Reading & Statistics", ["contour", "scale", "relief", "gradient", "map work"], "Contour lines join equal heights; close contours mean steep slopes. Scale (statement, ratio, linear) relates map distance to ground distance. Gradient = vertical interval ÷ horizontal equivalent.", [
        { q: "Lines joining points of equal height on a map are:", o: ["contours", "isobars", "isotherms", "latitude"], a: 0, e: "Contour lines represent elevation; isobars join equal pressure." },
        { q: "On a 1:50,000 map, 2 cm on the map equals ______ on the ground.", o: ["1 km", "100 m", "500 m", "5 km"], a: 0, e: "2 cm × 50,000 = 100,000 cm = 1 km." },
        { q: "Closely spaced contours indicate:", o: ["steep slope", "gentle slope", "flat land", "a plateau only"], a: 0, e: "Contours crowded together show a rapid rise — steep terrain." }] ],
      ["Environmental Conservation", ["conservation", "desertification", "deforestation", "erosion", "afforestation"], "Deforestation and overgrazing destroy vegetation and cause soil erosion and desertification. Conservation: afforestation, contour farming, controlled grazing, protected areas and reclamation.", [
        { q: "The spread of desert-like conditions is called:", o: ["desertification", "deforestation", "salinisation", "urbanisation"], a: 0, e: "Desertification is land degradation toward desert conditions, common in the Sahel." },
        { q: "Planting trees to restore a forest is:", o: ["afforestation", "deforestation", "irrigation", "mulching"], a: 0, e: "Afforestation plants trees on previously bare land." },
        { q: "Farming across the slope, not down it, is called:", o: ["contour farming", "shifting cultivation", "monoculture", "strip grazing"], a: 0, e: "Contour ploughing slows runoff and reduces soil erosion." }] ],
      ["Weather & Climate Elements", ["rainfall", "temperature", "humidity", "weather", "climate"], "Weather is the day-to-day state of the atmosphere; climate is the average over years. Elements: temperature, rainfall, pressure, wind, humidity, cloud. Convectional rain falls in hot afternoons; relief rain on windward slopes.", [
        { q: "The average atmospheric condition over many years is:", o: ["climate", "weather", "forecast", "season"], a: 0, e: "Climate is the long-term average of weather." },
        { q: "Rain formed when moist air is forced up a mountain is:", o: ["relief rainfall", "convectional rain", "cyclonic rain", "frontal drizzle"], a: 0, e: "Relief (orographic) rain falls on windward mountain slopes." },
        { q: "The amount of water vapour in the air is its:", o: ["humidity", "temperature", "pressure", "density"], a: 0, e: "Humidity measures water vapour; relative humidity compares it with saturation." }] ]
    ],
    "Commerce": [
      ["Business Units", ["sole trader", "partnership", "company", "cooperative", "public corporation"], "Sole proprietorship: one owner, unlimited liability, quick decisions. Partnership: 2–20 partners (banking 10). Company: incorporated, separate legal personality, limited liability. Co-operatives are member-owned.", [
        { q: "A business owned by one person with unlimited liability is a:", o: ["sole trader", "partnership", "joint stock company", "co-operative"], a: 0, e: "The sole trader bears all risks and debts personally." },
        { q: "A company is a separate legal entity, meaning it can:", o: ["sue and be sued in its own name", "not be taxed", "avoid audits", "ignore shareholders"], a: 0, e: "Incorporation gives the company its own legal personality." },
        { q: "The maximum number of partners in an ordinary partnership (non-banking) is:", o: ["20", "2", "10", "50"], a: 0, e: "Partnerships are limited to 20 members except banking (10)." }] ],
      ["Trade & International Commerce", ["domestic trade", "foreign trade", "import", "export", "barter"], "Domestic trade is within a country (wholesale and retail); foreign trade is between countries — imports, exports and re-exports. Barter (goods for goods) predates money; visible trade is goods, invisible trade is services.", [
        { q: "Trade between countries is called:", o: ["foreign trade", "domestic trade", "retail trade", "local trade"], a: 0, e: "Foreign (international) trade crosses national borders." },
        { q: "Trade in services such as shipping and banking is ______ trade.", o: ["invisible", "visible", "wholesale", "bilateral"], a: 0, e: "Invisible trade covers services; visible trade covers goods." },
        { q: "Buying goods abroad and reselling them without change is a:", o: ["re-export", "import", "entrepot", "transit"], a: 0, e: "Re-exports are imported goods sold on to third countries." }] ],
      ["Consumer Protection", ["consumer", "nafdac", "son", "fair price", "consumer rights"], "Consumers have rights: safety, information, choice, redress, representation. Agencies: NAFDAC (foods and drugs), SON (standards), CPC now FCCPC (competition and consumer protection).", [
        { q: "The agency that regulates food and drugs in Nigeria is:", o: ["NAFDAC", "SON", "NCC", "NIPC"], a: 0, e: "NAFDAC registers and controls food, drugs and chemicals." },
        { q: "The right to be compensated for a faulty product is the right to:", o: ["redress", "information", "safety", "choice"], a: 0, e: "Redress lets consumers seek compensation for harm or loss." },
        { q: "SON is chiefly responsible for:", o: ["setting product standards", "regulating banks", "postal services", "immigration"], a: 0, e: "The Standards Organisation of Nigeria sets and enforces standards." }] ]
    ],
    "Computer Studies": [
      ["Computer Applications & Software", ["word processor", "spreadsheet", "presentation", "operating system", "software"], "System software (operating systems) manages hardware; application software does user tasks — word processors (typing), spreadsheets (calculations, charts), presentation software (slides), databases (storage).", [
        { q: "Software used mainly for calculation and charts is a:", o: ["spreadsheet", "word processor", "browser", "compiler"], a: 0, e: "Spreadsheets (e.g. Excel) compute with formulas and chart data." },
        { q: "The software that manages computer hardware is the:", o: ["operating system", "spreadsheet", "game", "antivirus only"], a: 0, e: "The OS (Windows, Linux, Android) controls hardware and runs programs." },
        { q: "Slide shows for presentations are made with:", o: ["presentation software", "word processor", "database", "utility software"], a: 0, e: "Presentation tools (PowerPoint, Slides) build slide decks." }] ],
      ["The Internet & Communication", ["browser", "email", "www", "url", "search engine"], "The internet is a global network. The Web (WWW) is pages linked by URLs, viewed in browsers and found with search engines. Email sends messages with attachments; protocols such as HTTP and SMTP move the data.", [
        { q: "A program used to view web pages is a:", o: ["browser", "search engine", "router", "firewall"], a: 0, e: "Browsers (Chrome, Edge) render pages from the Web." },
        { q: "The unique address of a web page is its:", o: ["URL", "IP address only", "domain only", "cookie"], a: 0, e: "URLs (e.g. https://…/page) locate web resources." },
        { q: "A message sent electronically between users is:", o: ["email", "spreadsheet", "file only", "hyperlink"], a: 0, e: "Email delivers text and attachments over the internet." }] ],
      ["Computer Safety & Ethics", ["virus", "backup", "cybercrime", "password", "phishing"], "Computer viruses corrupt files; backups and antivirus software protect data. Strong passwords, updates and care with attachments prevent attacks. Phishing steals details with fake messages; cybercrime is a crime.", [
        { q: "A copy of data kept in case of loss is a:", o: ["backup", "virus", "cookie", "cache"], a: 0, e: "Backups let you restore data after damage or deletion." },
        { q: "Fake emails that trick users into giving passwords are:", o: ["phishing", "spoofing only", "trojan horses", "pharming only"], a: 0, e: "Phishing uses deceptive messages to harvest personal data." },
        { q: "The best first defence for an account is a:", o: ["strong password", "new phone", "larger screen", "cloud printer"], a: 0, e: "Strong, unique passwords resist guessing and breach-list attacks." }] ]
    ],
    "Civic Education": [
      ["Human Rights & Rule of Law", ["human rights", "rule of law", "constitution", "fundamental rights", "equality before the law"], "Human rights are inherent entitlements: life, dignity, fair hearing, freedom of expression and movement. The rule of law means everyone — including government — is subject to the law.", [
        { q: "The principle that the law governs everyone equally is:", o: ["rule of law", "separation of powers", "federalism", "popular sovereignty"], a: 0, e: "The rule of law demands supremacy of law and equality before it." },
        { q: "Rights guaranteed by the constitution are called:", o: ["fundamental human rights", "privileges", "customary gifts", "moral duties only"], a: 0, e: "Chapter IV of the constitution protects fundamental rights." },
        { q: "Which is a civic duty of citizens?", o: ["paying taxes", "buying cars", "attending parties", "travelling abroad"], a: 0, e: "Payment of taxes, voting and obeying laws are duties of citizens." }] ],
      ["Citizenship & Nationalism", ["citizenship", "nationalism", "patriotism", "duties", "birth"], "Citizenship may be by birth, registration or naturalisation. A citizen enjoys rights and owes duties — loyalty, obedience to law, tax, national service. Nationalism is love of country shown in action.", [
        { q: "Being a citizen of Nigeria by the nationality of parents is citizenship by:", o: ["birth", "registration", "naturalisation", "honorary grant"], a: 0, e: "Descent from Nigerian parents confers citizenship by birth." },
        { q: "Which shows patriotism?", o: ["defending the nation's reputation", "evading tax", "selling state secrets", "refusing service"], a: 0, e: "Patriotism is expressed in loyalty, service and good conduct." },
        { q: "A duty of every Nigerian citizen is:", o: ["payment of taxes", "changing the flag", "owning a car", "living abroad"], a: 0, e: "Paying tax is a civic duty that funds public services." }] ],
      ["Drug Abuse & Society", ["drug abuse", "substance", "addiction", "consequences", "rehabilitation"], "Drug abuse is using substances in ways or amounts that harm health. Consequences: addiction, organ damage, accidents, crime, broken families. Help: counselling, rehabilitation and community support.", [
        { q: "Using a drug despite harm to health is called:", o: ["drug abuse", "drug prescription", "medication", "immunisation"], a: 0, e: "Abuse is harmful or non-medical use of a substance." },
        { q: "A strong craving that is hard to control is:", o: ["addiction", "tolerance only", "withdrawal only", "immunity"], a: 0, e: "Addiction is compulsive dependence on a substance." },
        { q: "The best response to a friend abusing drugs is to:", o: ["encourage counselling and support", "join them", "ignore the problem", "buy more"], a: 0, e: "Early referral to counselling improves recovery chances." }] ]
    ]
  };
  var D = window.__curicData = window.__curicData || {};
  D.T = D.T || {};
  for (var k in T) D.T[k] = T[k];
})();
(function () {
  var T = {
    "Further Mathematics": [
      ["Complex Numbers", ["complex", "imaginary", "i squared", "modulus", "argand"], "i² = −1. A complex number z = a + bi has real part a and imaginary part b; |z| = √(a² + b²) and the argument is the angle on the Argand diagram.", [
        { q: "If i² = −1, then i⁴ equals:", o: ["1", "−1", "i", "−i"], a: 0, e: "i⁴ = (i²)² = (−1)² = 1." },
        { q: "The modulus of 3 + 4i is:", o: ["5", "7", "1", "25"], a: 0, e: "|z| = √(3² + 4²) = √25 = 5." },
        { q: "In z = 2 + 5i, the imaginary part is:", o: ["5", "2", "2i", "5i only"], a: 0, e: "The imaginary part is the coefficient of i, i.e. 5." }] ],
      ["Series & Sequences", ["arithmetic", "geometric", "common difference", "common ratio", "sum to infinity"], "Arithmetic sequence: Tₙ = a + (n−1)d; sum Sₙ = n/2 [2a + (n−1)d]. Geometric: Tₙ = arⁿ⁻¹; Sₙ = a(1−rⁿ)/(1−r); sum to infinity a/(1−r) for |r| < 1.", [
        { q: "The 10th term of 2, 5, 8, … is:", o: ["29", "32", "26", "30"], a: 0, e: "T₁₀ = 2 + 9 × 3 = 29." },
        { q: "The sum of the first 20 terms of 1, 3, 5, … is:", o: ["400", "420", "380", "440"], a: 0, e: "S₂₀ = 20/2 × (2 + 19 × 2) = 10 × 40 = 400." },
        { q: "The sum to infinity of 1 + 1/2 + 1/4 + … is:", o: ["2", "1.5", "3", "4"], a: 0, e: "S = a/(1−r) = 1/(1 − 1/2) = 2." }] ],
      ["Coordinate Geometry", ["gradient", "midpoint", "distance", "equation of a line", "perpendicular"], "Distance d = √((x₂−x₁)² + (y₂−y₁)²); midpoint = ((x₁+x₂)/2, (y₁+y₂)/2); gradient m = (y₂−y₁)/(x₂−x₁). Lines with slopes m₁m₂ = −1 are perpendicular.", [
        { q: "The distance between (0, 0) and (3, 4) is:", o: ["5", "7", "1", "12"], a: 0, e: "d = √(9 + 16) = 5." },
        { q: "The gradient of the line through (1, 2) and (4, 11) is:", o: ["3", "1/3", "9", "−3"], a: 0, e: "m = (11 − 2)/(4 − 1) = 9/3 = 3." },
        { q: "The midpoint of A(2, 6) and B(8, 4) is:", o: ["(5, 5)", "(6, 5)", "(5, 6)", "(10, 10)"], a: 0, e: "((2+8)/2, (6+4)/2) = (5, 5)." }] ]
    ],
    "Christian Religious Studies": [
      ["The Nativity & Early Life of Jesus", ["nativity", "birth of jesus", "mary", "bethlehem", "shepherds", "wise men"], "Jesus was born in Bethlehem of Judea to Mary; angels announced him to shepherds, and wise men from the East brought gifts. He was circumcised and presented in the temple; the family fled to Egypt from Herod.", [
        { q: "Jesus was born in:", o: ["Bethlehem", "Nazareth", "Jerusalem", "Capernaum"], a: 0, e: "Luke 2:4-7 — Joseph and Mary travelled to Bethlehem for the census." },
        { q: "The wise men were guided to Jesus by:", o: ["a star", "a dream only", "a prophet", "the temple priests"], a: 0, e: "Matthew 2: a star led the magi from the East to Bethlehem." },
        { q: "To escape Herod, the family of Jesus fled to:", o: ["Egypt", "Nazareth only", "Jericho", "Galilee only"], a: 0, e: "Matthew 2:13-15 — an angel warned Joseph to flee to Egypt." }] ],
      ["The Sermon & Parables", ["beatitudes", "sermon on the mount", "parable", "sower", "good samaritan"], "The Sermon on the Mount (Matthew 5–7) teaches the Beatitudes and the Lord's Prayer. Parables — the Sower, the Good Samaritan, the Prodigal Son — use everyday stories to teach the kingdom of God.", [
        { q: "The Good Samaritan helped a man who had been:", o: ["robbed and wounded", "taken ill", "arrested", "drowned"], a: 0, e: "Luke 10: the Samaritan showed mercy across ethnic and religious lines." },
        { q: "In the parable of the Sower, seed on rocky ground represents:", o: ["a shallow reception of the word", "the devil's theft", "a rich harvest", "false teachers only"], a: 0, e: "It springs up quickly but withers when trials come (Matthew 13)." },
        { q: "The Beatitudes begin the:", o: ["Sermon on the Mount", "Last Supper", "temptation of Jesus", "Great Commission"], a: 0, e: "Matthew 5 opens the Sermon on the Mount with the Beatitudes." }] ],
      ["The Passion & Resurrection", ["last supper", "betrayal", "crucifixion", "resurrection", "great commission"], "At the Last Supper Jesus instituted the Lord's Supper. Betrayed by Judas, denied by Peter, he was crucified and buried; on the third day he rose, appearing to the disciples. The Great Commission sends them to make disciples.", [
        { q: "Jesus was betrayed by:", o: ["Judas Iscariot", "Peter", "John", "Thomas"], a: 0, e: "Judas sold Jesus to the chief priests for thirty pieces of silver." },
        { q: "Jesus rose from the dead on the:", o: ["third day", "third week", "fortieth day", "seventh day"], a: 0, e: "The resurrection is celebrated at Easter, the third day after the crucifixion." },
        { q: "The Great Commission commands the disciples to:", o: ["make disciples of all nations", "build temples only", "collect taxes", "avoid gentiles"], a: 0, e: "Matthew 28:19-20 — go, baptise and teach all nations." }] ]
    ],
    "Islamic Religious Studies": [
      ["The Five Pillars of Islam", ["shahadah", "salat", "zakat", "sawm", "hajj"], "The five pillars: Shahadah (faith), Salat (five daily prayers), Zakat (almsgiving), Sawm (fasting in Ramadan) and Hajj (pilgrimage to Makkah for those able).", [
        { q: "The declaration of faith in Islam is the:", o: ["Shahadah", "Salat", "Sawm", "Zakat"], a: 0, e: "The Shahadah testifies there is no god but Allah and Muhammad is His messenger." },
        { q: "Muslims pray how many times daily?", o: ["five", "three", "seven", "one"], a: 0, e: "Salat: dawn, noon, afternoon, sunset and night prayers." },
        { q: "Fasting during the month of Ramadan is called:", o: ["Sawm", "Zakat", "Hajj", "Jihad"], a: 0, e: "Sawm is fasting from dawn to sunset during Ramadan." }] ],
      ["The Life of the Prophet Muhammad ﷺ", ["makkah", "madinah", "hijrah", "revelation", "kaaba"], "Born in Makkah about 570 CE, Muhammad received the first revelation in the Cave of Hira at 40. He preached monotheism, faced persecution, and migrated (Hijrah) to Madinah in 622 CE, where he built the first Muslim community.", [
        { q: "The Prophet Muhammad was born in:", o: ["Makkah", "Madinah", "Ta'if", "Jerusalem"], a: 0, e: "He was born in Makkah, of the Quraysh tribe, about 570 CE." },
        { q: "The migration to Madinah is called the:", o: ["Hijrah", "Hajj", "Isra", "Jumu'ah"], a: 0, e: "The Hijrah of 622 CE marks the start of the Islamic calendar." },
        { q: "The first revelation came in the Cave of:", o: ["Hira", "Thawr", "Uhud", "Fihl"], a: 0, e: "Angel Jibril appeared to him in the Cave of Hira near Makkah." }] ],
      ["Islamic Law & Morality", ["shariah", "halal", "haram", "sunnah", "morality"], "Shariah is the Islamic legal system from the Qur'an and Sunnah. Halal acts are permitted; haram are forbidden. Morality stresses honesty, kindness to parents, justice, modesty and trustworthiness.", [
        { q: "An act permitted in Islam is:", o: ["halal", "haram", "makruh", "mubah only"], a: 0, e: "Halal = permissible; haram = forbidden." },
        { q: "The practice of the Prophet, a major source of law, is the:", o: ["Sunnah", "Fatwa", "Khutbah", "Ijtihad only"], a: 0, e: "The Sunnah — his sayings and actions — guides interpretation." },
        { q: "Lying and cheating are considered:", o: ["haram", "halal", "mustahab", "sunnah"], a: 0, e: "Honesty is commanded; dishonesty is forbidden in Islam." }] ]
    ],
    "Data Processing": [
      ["Data & Information", ["data", "information", "processing", "raw", "database"], "Data are raw facts; information is processed data with meaning. Processing converts input to output: collection, storage, processing, retrieval, transmission, dissemination.", [
        { q: "Raw unprocessed facts are called:", o: ["data", "information", "knowledge", "reports"], a: 0, e: "Data becomes information after processing into a useful form." },
        { q: "The function of sorting, summarising and computing data is:", o: ["processing", "collection", "storage", "transmission"], a: 0, e: "Processing transforms input data into meaningful output." },
        { q: "A collection of related records stored systematically is a:", o: ["database", "spreadsheet cell", "hyperlink", "folder only"], a: 0, e: "A database organises related data for easy retrieval and update." }] ],
      ["Database Concepts", ["table", "record", "field", "primary key", "dbms"], "A database table holds records (rows) of fields (columns); the primary key uniquely identifies each record. A DBMS (e.g. MySQL, Oracle) creates, updates and queries the data.", [
        { q: "In a table, each ROW is called a:", o: ["record", "field", "key", "query"], a: 0, e: "Records (rows) hold one complete entry; fields (columns) hold attributes." },
        { q: "The field that uniquely identifies each record is the:", o: ["primary key", "foreign key", "index only", "memo field"], a: 0, e: "A primary key guarantees each record is uniquely identified." },
        { q: "Software for creating and managing databases is a:", o: ["DBMS", "operating system", "compiler", "browser"], a: 0, e: "A database management system stores, queries and secures data." }] ],
      ["Word Processing & Spreadsheets", ["word processor", "cell", "formula", "format", "spreadsheet"], "Word processors format documents (text, headings, tables, mail merge). Spreadsheets arrange data in cells; formulas like =A1+B1 compute values, and charts display them.", [
        { q: "In a spreadsheet, the intersection of a row and column is a:", o: ["cell", "sheet", "range", "chart"], a: 0, e: "Cells are named by column and row, e.g. B3." },
        { q: "A formula in Excel always begins with:", o: ["=", "+", "#", "@"], a: 0, e: "Formulas start with = (e.g. =SUM(A1:A5))." },
        { q: "Mail merge is a feature of:", o: ["word processors", "browsers", "antivirus", "games"], a: 0, e: "Mail merge sends personalised letters to many recipients." }] ]
    ],
    "Food & Nutrition": [
      ["Food Hygiene & Safety", ["hygiene", "contamination", "safe storage", "food poisoning", "personal hygiene"], "Food-borne illness follows contamination by germs, chemicals or pests. Hygiene rules: wash hands, keep raw and cooked apart, cook thoroughly, refrigerate promptly, clean surfaces.", [
        { q: "A common cause of food poisoning is:", o: ["under-cooked poultry", "overcooked rice", "fresh fruit", "boiled water"], a: 0, e: "Undercooked meat and poultry commonly carry harmful bacteria." },
        { q: "Leftover cooked food should be:", o: ["cooled and refrigerated at once", "kept at room temperature", "reheated all day", "covered and left out"], a: 0, e: "Rapid cooling and refrigeration stop bacterial growth." },
        { q: "Before handling food, you should:", o: ["wash your hands", "wear gloves only", "taste the food", "blow your nose"], a: 0, e: "Hand-washing is the single best hygiene defence." }] ],
      ["Food Preparation Methods", ["boiling", "steaming", "frying", "baking", "roasting"], "Moist methods (boiling, steaming, stewing) soften foods; dry methods (roasting, grilling, baking) brown and flavour; frying cooks in hot oil. Method choice affects nutrients, texture and cost.", [
        { q: "Cooking food in an oven with dry heat is:", o: ["baking", "steaming", "boiling", "poaching"], a: 0, e: "Baking cooks by dry heat in an oven (bread, cakes, pies)." },
        { q: "Which method conserves most water-soluble vitamins?", o: ["steaming", "long boiling", "frying", "grilling"], a: 0, e: "Steaming avoids leaching vitamins into cooking water." },
        { q: "Deep-frying cooks food by:", o: ["immersion in hot oil", "steam contact", "dry oven heat", "direct flame"], a: 0, e: "Deep-frying submerges food in hot oil for quick, even cooking." }] ],
      ["Foods for Special Groups", ["infant", "pregnant", "elderly", "athlete", "sick"], "Infants need breastmilk first, then gradually introduced weaning foods. Pregnant women need iron, folic acid and calcium. Athletes need extra energy and protein; the elderly need fewer calories but more fibre, calcium and fluids.", [
        { q: "The best first food for a baby is:", o: ["breastmilk", "cow's milk", "pap only", "honey"], a: 0, e: "Exclusive breastfeeding is recommended for the first six months." },
        { q: "A pregnant woman especially needs:", o: ["iron and folic acid", "sugar", "salt", "alcohol"], a: 0, e: "Iron and folic acid prevent anaemia and support the baby's development." },
        { q: "An athlete's diet should be rich in:", o: ["energy foods and protein", "only fruit", "only fat", "salt only"], a: 0, e: "Extra carbohydrate fuels training; protein repairs muscle." }] ]
    ],
    "French": [
      ["Le présent des verbes", ["avoir", "etre", "present", "conjugaison", "verb"], "Au présent: avoir → j'ai, tu as, il a, nous avons, vous avez, ils ont. Être → je suis, tu es, il est, nous sommes, vous êtes, ils sont. Les verbes en −er: je parle, tu parles, il parle, nous parlons.", [
        { q: "Complétez: 'Nous ______ deux livres.'", o: ["avons", "avez", "ont", "sont"], a: 0, e: "'Nous avons' — le présent du verbe avoir, première personne du pluriel." },
        { q: "Complétez: 'Tu ______ content.'", o: ["es", "est", "sommes", "êtes"], a: 0, e: "'Tu es' — le présent du verbe être, 2e personne du singulier." },
        { q: "Complétez: 'Ils ______ français.'", o: ["parlent", "parle", "parles", "parlons"], a: 0, e: "Avec 'ils' le verbe en −er prend 'ent': ils parlent." }] ],
      ["Les articles et le genre", ["le", "la", "les", "un", "une", "genre"], "Les articles définis: le (masculin), la (féminin), les (pluriel). Indéfinis: un, une, des. Le nom français a un genre: le livre (masc.), la maison (fém.).", [
        { q: "Choisissez: '______ table' (fém.):", o: ["la", "le", "les", "un"], a: 0, e: "'La table' — table est un nom féminin." },
        { q: "Choisissez: '______ livre' (masc.):", o: ["le", "la", "les", "des"], a: 0, e: "'Le livre' — livre est masculin." },
        { q: "Choisissez: '______ amis' (pluriel):", o: ["les", "le", "la", "une"], a: 0, e: "Au pluriel, l'article défini est 'les'." }] ],
      ["La famille et les salutations", ["famille", "salutations", "bonjour", "mere", "pere"], "Salutations: Bonjour (le matin/l'après-midi), Bonsoir (le soir), Au revoir. La famille: le père, la mère, le frère, la sœur, l'oncle, la tante, le grand-père, la grand-mère.", [
        { q: "Le matin on dit:", o: ["Bonjour", "Bonsoir", "Bonne nuit", "Au revoir"], a: 0, e: "'Bonjour' se dit le jour; 'Bonsoir' le soir." },
        { q: "'La mère de ma mère' est ma:", o: ["grand-mère", "tante", "sœur", "cousine"], a: 0, e: "La grand-mère est la mère du père ou de la mère." },
        { q: "Pour quitter, on dit:", o: ["Au revoir", "Bonjour", "Merci", "S'il vous plaît"], a: 0, e: "'Au revoir' signifie 'until we see each other again'." }] ]
    ]
  };
  var D = window.__curicData = window.__curicData || {};
  D.T = D.T || {};
  for (var k in T) D.T[k] = T[k];
})();
/* ================= BOOT + INJECTION ================= */
(function () {
  var D = window.__curicData || {};
  delete window.__curicData;
  var T = D.T || {}, META = D.META || {};
  var done = false, added = 0, ADDED = [];
  var NEWSUBJ = Object.keys(META);

  function tryBoot() {
    if (done) return;
    try {
      if (typeof CLASSES === "undefined" || !CLASSES.length || !CLASSES[0].questions) return;
      if (typeof QUIZ_RAW === "undefined" || !QUIZ_RAW || !QUIZ_RAW.subj) return;
      inject();
      done = true;
    } catch (e) {}
  }

  function inject() {
    /* --- 1. subject metadata, topics, curriculum + scheme --- */
    var subjSeen = {};
    function ensureSubj(s) {
      if (subjSeen[s]) return;
      subjSeen[s] = 1;
      if (QUIZ_RAW.subj.indexOf(s) < 0) QUIZ_RAW.subj.push(s);
      try { if (typeof SUBJECT_META !== "undefined" && META[s]) SUBJECT_META[s] = { icon: META[s][0], c: META[s][1], em: (typeof EMBLEM === "function" ? EMBLEM(META[s][2]) : "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">" + META[s][2] + "</svg>") }; } catch (e) {}
    }
    var CURR = {}, SYLL = {};
    try { if (typeof window.CURR === "object" && window.CURR) CURR = window.CURR; } catch (e) {}
    try { if (typeof window.SYLL === "object" && window.SYLL) SYLL = window.SYLL; } catch (e) {}
    var TK = null;
    try { TK = (typeof TOPICS !== "undefined" && TOPICS) ? TOPICS : null; } catch (e) {}

    var queue = [];
    for (var s in T) {
      var tp = T[s];
      ensureSubj(s);
      var names = [];
      for (var i = 0; i < tp.length; i++) {
        names.push(tp[i][0]);
        if (TK) try { TK[s] = TK[s] || []; TK[s].push([tp[i][0], tp[i][1]]); } catch (e) {}
      }
      CURR[s] = tp;
      /* scheme of work: 9 rows × 3 topics */
      var rows = [];
      for (var r = 0; r < 9; r++) rows.push([names[(r * 3) % names.length], names[(r * 3 + 1) % names.length], names[(r * 3 + 2) % names.length]]);
      SYLL[s] = rows;
      /* queue questions for class distribution */
      for (var j = 0; j < tp.length; j++) {
        var qs = tp[j][3] || [];
        for (var q = 0; q < qs.length; q++) queue.push([s, qs[q]]);
      }
    }
    window.CURR = CURR;
    window.SYLL = SYLL;

    /* --- 2. reuse the edu.js extra-subject library questions --- */
    var EX = null;
    try { EX = window.EXTRA_SUBJECTS || null; } catch (e) {}
    if (EX) for (var es in EX) {
      ensureSubj(es);
      var et = EX[es].topics || [];
      var eNames = [];
      for (var x = 0; x < et.length; x++) {
        eNames.push(et[x][0]);
        var eqs = et[x][3] || [];
        for (var y = 0; y < eqs.length; y++) queue.push([es, { q: eqs[y].q, o: eqs[y].o, a: eqs[y].a, e: eqs[y].e }]);
      }
      if (!CURR[es]) CURR[es] = et;
      if (!SYLL[es]) {
        var erows = [];
        for (var er = 0; er < 9; er++) erows.push([eNames[(er * 3) % eNames.length], eNames[(er * 3 + 1) % eNames.length], eNames[(er * 3 + 2) % eNames.length]]);
        SYLL[es] = erows;
      }
    }

    /* --- 3. distribute questions SS1/SS2/SS3 (no duplicates) --- */
    var counter = {};
    for (var z = 0; z < queue.length; z++) {
      var sub = queue[z][0], qo = queue[z][1];
      if (!qo || !qo.q || !qo.o || typeof qo.a !== "number") continue;
      counter[sub] = (counter[sub] || 0) + 1;
      var cls = counter[sub] % 3;
      var arr = CLASSES[cls].questions;
      var dup = false;
      for (var d = 0; d < arr.length; d++) if (arr[d].q === qo.q) { dup = true; break; }
      if (dup) continue;
      var fresh = { s: sub, q: qo.q, o: qo.o.slice(0, 4), a: qo.a, e: qo.e || "" };
      arr.push(fresh);
      ADDED.push({ c: cls, q: fresh });
      added++;
    }

    /* --- 3b. reinjector (defined BEFORE the dispatch: boot() rebuilds CLASSES
       synchronously during the event and must be able to restore these) --- */
    try {
      window.__curicReinject = function () {
        if (!ADDED.length || typeof CLASSES === "undefined" || !CLASSES.length) return;
        for (var i = 0; i < ADDED.length; i++) {
          var a = ADDED[i];
          if (!CLASSES[a.c] || !CLASSES[a.c].questions) continue;
          var arr = CLASSES[a.c].questions, found = false;
          for (var d = 0; d < arr.length; d++) if (arr[d].q === a.q.q) { found = true; break; }
          if (!found) arr.push(a.q);
        }
      };
    } catch (e) {}

    /* --- 4. announce + expose (done first: the event may re-trigger us) --- */
    done = true;
    try { window.dispatchEvent(new Event("quizbank-updated")); } catch (e) {}
    window.__curicApi = {
      subjects: NEWSUBJ.slice(),
      allSubjects: Object.keys(T).concat(Object.keys(EX || {})).filter(function (v, i, a2) { return a2.indexOf(v) === i; }),
      added: added,
      list: function () { return Object.keys(T); },
      stats: function () {
        var per = {};
        for (var c = 0; c < CLASSES.length; c++) for (var i2 = 0; i2 < CLASSES[c].questions.length; i2++) {
          var s2 = CLASSES[c].questions[i2].s; per[s2] = (per[s2] || 0) + 1;
        }
        return per;
      }
    };
  }

  /* --- wait for the bank, then inject --- */
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (window.__bankOK === 1 || (typeof CLASSES !== "undefined" && CLASSES.length)) tryBoot();
    if (done || tries > 120) clearInterval(iv);
  }, 250);
  try { window.addEventListener("quizbank-updated", function () { if (!done) tryBoot(); }); } catch (e) {}
})();
