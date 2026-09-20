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

