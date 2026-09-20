/* v36.0 — AI Study Tutor (lazy, boot-safe, loaded by polish.js at idle).
   v36 adds the curriculum brain (currFor): answers drawn from the lazy
   window.CURR topic library across all 27 subjects, with a self-test
   question and a pointer to the Curriculum Atlas. v34.0 core below:
   A real, honest study-assistant layer:
   💬 Ask — a built-in knowledge engine answers from your study library
   (60+ curriculum facts, the Formula Vault, topic maps) — 100% offline.
   ✨ Optional BYO key — paste a Gemini or OpenAI key (stored only on your
   device) to get full LLM answers; the app falls back to the built-in
   engine if the call fails. Clearly labelled 📚 Library vs ✨ AI.
   📊 Insights — live analytics over your real attempt history: weakest
   subjects/topics, pace, forgetting-risk (spaced-review), streak, and
   a generated revision plan.
   🎯 Explain this question — hint-based breakdown of the question on screen
   (never reveals the answer). Additive, fails silent. */
(function () {
  "use strict";
  if (window.__ai) return;
  window.__ai = 1;

  var KEY = "nssc_ai_key";
  var CHAT = "nssc_ai_chat";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var CSS =
    "html.ai .ai-ov{position:fixed;inset:0;z-index:131;background:rgba(8,10,20,.55);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:14px}" +
    "html.ai .ai-box{width:min(560px,100%);max-height:94dvh;overflow:auto;border-radius:20px;background:var(--card-solid,#fdf8ec);border:1px solid rgba(220,184,95,.55);box-shadow:0 46px 100px -34px rgba(0,0,0,.85);padding:13px;color:var(--ink,#20302a);display:flex;flex-direction:column}" +
    "html.ai .ai-h{display:flex;align-items:center;gap:8px;font-size:1rem;font-weight:800;margin-bottom:2px}" +
    "html.ai .ai-x{margin-left:auto;border:0;background:transparent;color:var(--mut,#8a7a5c);font-size:1rem;cursor:pointer;padding:4px 8px;border-radius:8px}" +
    "html.ai .ai-x:hover{background:rgba(0,0,0,.06)}" +
    "html.ai .ai-sub{font-size:.68rem;color:var(--mut,#8a7a5c);margin-bottom:9px}" +
    "html.ai .ai-tabs{display:flex;gap:6px;margin-bottom:9px}" +
    "html.ai .ai-tab{border:1px solid var(--card-border,#cbb386);background:transparent;border-radius:99px;padding:6px 13px;font-size:.72rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit}" +
    "html.ai .ai-tab.on{background:linear-gradient(135deg,#f0dca6,#c9a25f);color:#241a05;border-color:transparent}" +
    "html.ai .ai-chat{display:flex;flex-direction:column;gap:9px;min-height:240px;max-height:46dvh;overflow-y:auto;padding:3px 2px;border:1px solid var(--card-border,#e0d3b2);border-radius:14px;background:var(--panel,#f7f1e2);padding:10px}" +
    "html.ai .ai-msg{max-width:88%;padding:8px 12px;border-radius:14px;font-size:.82rem;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}" +
    "html.ai .ai-u{align-self:flex-end;background:linear-gradient(135deg,#eccf8e,#c9a25f);color:#241a05;border-bottom-right-radius:4px;font-weight:700}" +
    "html.ai .ai-b{align-self:flex-start;background:var(--card-solid,#fff);border:1px solid var(--card-border,#e0d3b2);border-bottom-left-radius:4px}" +
    "html.ai .ai-badge{display:inline-block;font-size:.56rem;font-weight:900;letter-spacing:.07em;border-radius:99px;padding:2px 7px;margin-bottom:4px;vertical-align:middle}" +
    "html.ai .ai-lib{background:var(--opt-hover,rgba(201,162,39,.12));color:#5b3d09}" +
    "html.ai .ai-ai{background:linear-gradient(135deg,#e6d4f7,#8b5cf6);color:#fff}" +
    "html.ai .ai-row{display:flex;gap:7px;margin-top:9px}" +
    "html.ai .ai-in{flex:1;border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:12px;padding:10px 12px;font-size:.85rem;color:var(--ink,#20302a);font-family:inherit;outline:none}" +
    "html.ai .ai-in:focus{border-color:#c9a25f;box-shadow:0 0 0 3px rgba(201,162,39,.22)}" +
    "html.ai .ai-go{border:1px solid var(--card-border,#cbb386);background:linear-gradient(135deg,#eccf8e,#c9a25f);color:#241a05;font-weight:900;border-radius:12px;padding:0 16px;font-size:.85rem;cursor:pointer;font-family:inherit}" +
    "html.ai .ai-go:disabled{opacity:.6;cursor:wait}" +
    "html.ai .ai-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}" +
    "html.ai .ai-chip{border:1px solid var(--card-border,#d8cbab);background:var(--opt-bg,#fdf8ec);border-radius:99px;padding:4px 10px;font-size:.64rem;font-weight:700;cursor:pointer;color:var(--ink-2,#4a5877);font-family:inherit}" +
    "html.ai .ai-chip:hover{border-color:#c9a25f;color:#5b3d09}" +
    "html.ai .ai-stat{border:1px solid var(--card-border,#e0d3b2);background:var(--panel,#f7f1e2);border-radius:14px;padding:11px 13px;margin-bottom:8px}" +
    "html.ai .ai-stat b{font-size:.8rem;display:block;margin-bottom:3px}" +
    "html.ai .ai-stat span,.ai .ai-stat li{font-size:.72rem;color:var(--ink-2,#4a5877);line-height:1.55}" +
    "html.ai .ai-stat ul{padding-left:16px;margin:2px 0 0}" +
    "html.ai .ai-key{border:1px solid var(--card-border,#e0d3b2);background:var(--panel,#f7f1e2);border-radius:14px;padding:12px;font-size:.72rem;color:var(--ink-2,#4a5877);line-height:1.6}" +
    "html.ai .ai-key input,html.ai .ai-key select{width:100%;border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:10px;padding:8px 10px;font-size:.78rem;color:var(--ink,#20302a);font-family:inherit;margin:5px 0 7px}" +
    "html.ai .ai-key .ai-go{width:auto;padding:8px 14px}" +
    "html.ai .ai-note{font-size:.6rem;color:var(--mut,#8a7a5c);text-align:center;margin-top:8px}";

  function css() { if (!document.getElementById("aiCss")) { var s = document.createElement("style"); s.id = "aiCss"; s.textContent = CSS; document.head.appendChild(s); } }

  /* ================= KNOWLEDGE BASE ================= */
  /* curated curriculum facts — concise, exam-oriented, Nigerian syllabus */
  var FACTS = [
    { k: ["photosynthesis", "chlorophyll", "chloroplast", "sunlight glucose"], s: "Biology", a: "Photosynthesis is how green plants make glucose from carbon dioxide and water using energy from sunlight, catalysed by chlorophyll.\nWord equation: carbon dioxide + water  →(sunlight/chlorophyll)→  glucose + oxygen.\nIt happens mainly in the leaves (palisade cells), and it stores the sun's energy as chemical energy.", t: "WAEC loves: the conditions for photosynthesis (light, chlorophyll, CO₂, water) and the products (glucose + oxygen)." },
    { k: ["respiration", "breathing"], s: "Biology", a: "Respiration is the release of energy from glucose inside living cells.\nAerobic: glucose + oxygen → carbon dioxide + water + energy.\nAnaerobic in muscles: glucose → lactic acid + less energy; in yeast: glucose → ethanol + carbon dioxide.", t: "Respiration happens in the MITOCHONDRIA — energy is stored as ATP." },
    { k: ["osmosis"], s: "Biology", a: "Osmosis is the movement of WATER molecules from a region of high water concentration to low water concentration through a selectively-permeable membrane. No energy is needed.", t: "It's water only — solutes don't move. Plant roots absorb water by osmosis." },
    { k: ["diffusion"], s: "Biology", a: "Diffusion is the net movement of particles from a region of higher concentration to lower concentration until they are evenly spread. It needs no energy.", t: "Gases (O₂, CO₂) move in and out of cells by diffusion." },
    { k: ["cell", "organelle"], s: "Biology", a: "The cell is the basic unit of life. Key parts: nucleus (controls the cell, holds DNA), cytoplasm (chemical reactions), cell membrane (controls what enters/leaves), mitochondria (respiration), ribosomes (proteins). Plant cells also have a cell wall (cellulose), chloroplasts and a large vacuole.", t: "Compare plant vs animal cells — a classic WAEC table question." },
    { k: ["nucleus"], s: "Biology", a: "The nucleus is the control centre of the cell. It contains chromosomes (DNA + protein) which carry genes — the units of inheritance.", t: "DNA → gene → chromosome: the order of size is DNA < gene < chromosome." },
    { k: ["dna", "gene", "chromosome", "inheritance", "heredity"], s: "Biology", a: "Heredity is the passing of characteristics from parents to offspring. Genes (sections of DNA on chromosomes) code for traits. In humans each body cell has 46 chromosomes (23 pairs); sex cells have 23.", t: "Mendel's monohybrid cross gives a 3:1 ratio in the F₂ generation." },
    { k: ["ecosystem", "food chain", "food web", "habitat"], s: "Biology", a: "An ecosystem is a community of living things interacting with their non-living environment. A food chain shows energy flow: producer → primary consumer → secondary consumer → tertiary consumer. Only about 10% of energy passes to the next level.", t: "Producers are always green plants/ algae; decomposers (bacteria, fungi) recycle nutrients." },
    { k: ["pollination", "flower"], s: "Biology", a: "Pollination is the transfer of pollen grains from the anther to the stigma. Insect-pollinated flowers are brightly coloured and scented; wind-pollinated flowers are dull, light and produce lots of pollen.", t: "Fertilisation follows pollination: male nucleus + female nucleus in the ovule." },
    { k: ["transpiration"], s: "Biology", a: "Transpiration is the loss of water vapour from plant leaves through stomata. It pulls water up the xylem and cools the plant. Faster in hot, dry, windy conditions.", t: "Xylem = water up; phloem = food (sucrose) both ways." },
    { k: ["soil", "fertiliser", "manure", "crop"], s: "Agricultural Science", a: "Soil is the medium for plant growth; its main components are mineral particles (sand, silt, clay), humus, water, air and living organisms. Fertilisers add nutrients: NPK = Nitrogen (leaves), Phosphorus (roots), Potassium (fruits/flowers).", t: "Loamy soil (balanced sand/silt/clay/humus) is best for most crops." },
    { k: ["malaria"], s: "Biology", a: "Malaria is caused by Plasmodium, transmitted by the female Anopheles mosquito. Symptoms: fever, chills, headache. Prevention: sleep under treated nets, clear stagnant water, insecticide spraying.", t: "Malaria is NOT caused by the mosquito — the mosquito transmits the parasite." },
    { k: ["vaccination", "immunisation", "immunity"], s: "Biology", a: "Vaccination introduces a weakened or dead pathogen (antigen) so the body produces antibodies and memory cells. On real infection the immune response is faster and stronger.", t: "Active immunity: your body makes the antibodies (vaccine/natural infection)." },
    { k: ["atom", "proton", "neutron", "electron", "atomic"], s: "Chemistry", a: "An atom is the smallest particle of an element. It has a nucleus of protons (+) and neutrons (0) and a cloud of electrons (−). Atomic number = number of protons; mass number = protons + neutrons; neutral atom: protons = electrons.", t: "Isotopes = same protons, different neutrons (e.g. Cl-35 and Cl-37)." },
    { k: ["molecule", "compound", "mixture", "element"], s: "Chemistry", a: "An element contains one type of atom. A compound is two or more elements chemically combined (fixed ratio, new properties). A molecule is the smallest particle of a substance held by covalent bonds. A mixture is physically combined and easily separated.", t: "Compounds can only be separated by chemical means; mixtures by physical means." },
    { k: ["isotope"], s: "Chemistry", a: "Isotopes are atoms of the same element with the same number of protons but different numbers of neutrons, so they have different mass numbers but identical chemical properties. e.g. carbon-12 and carbon-14.", t: "Relative atomic mass is the weighted average of an element's isotopes." },
    { k: ["periodic table", "period", "group"], s: "Chemistry", a: "The periodic table arranges elements by increasing atomic number. A GROUP is a vertical column (same number of outer electrons → similar properties); a PERIOD is a horizontal row (same number of shells). Group 1 = alkali metals, Group 17 = halogens, Group 18 = noble gases.", t: "Across a period, metallic character decreases; down a group it increases." },
    { k: ["bond", "ionic", "covalent", "valence", "electrovalent"], s: "Chemistry", a: "Ionic bonding: metal gives electrons to a non-metal (e.g. NaCl) — held by electrostatic attraction. Covalent bonding: non-metals share electrons (e.g. H₂O, CO₂). Valence electrons are the outer-shell electrons that form bonds.", t: "Ionic compounds conduct when molten/dissolved; covalent usually don't." },
    { k: ["acid", "base", "alkali", "salt", "neutralisation", "ph"], s: "Chemistry", a: "Acids release H⁺ ions (pH < 7); bases release OH⁻ or accept H⁺ (pH > 7); alkalis are soluble bases. Neutralisation: acid + base → salt + water (also acid + carbonate → salt + water + CO₂).", t: "pH scale 0–14; pH 7 is neutral. Indicators: litmus, methyl orange, phenolphthalein." },
    { k: ["mole", "molar mass", "avogadro", "concentration", "stoichiometry"], s: "Chemistry", a: "The mole is the amount containing 6.02 × 10²³ particles (Avogadro's number). n = mass/molar mass; n = particles/Nₐ; for gases at s.t.p. n = volume/22.4 dm³. Concentration = moles/volume (mol/dm³).", t: "Always balance the equation first, then convert everything to moles." },
    { k: ["balanced equation", "chemical equation"], s: "Chemistry", a: "A balanced chemical equation has the same number of each atom on both sides. It shows reactants → products and the mole ratios (coefficients), which let you calculate masses and volumes.", t: "Law of conservation of matter: atoms are never created or destroyed." },
    { k: ["oxidation", "reduction", "redox", "redox"], s: "Chemistry", a: "Oxidation is loss of electrons (or gain of oxygen); reduction is gain of electrons (or loss of oxygen). Together = redox. The oxidising agent accepts electrons; the reducing agent donates them.", t: "OIL RIG — Oxidation Is Loss, Reduction Is Gain (of electrons)." },
    { k: ["electrolysis", "electrolyte"], s: "Chemistry", a: "Electrolysis is the decomposition of an electrolyte (molten or aqueous ionic compound) by direct current. Positive ions (cations) move to the cathode; negative ions (anions) to the anode. Mass deposited obeys Faraday's laws: m = MIt/(nF), F = 96 500 C/mol.", t: "In aqueous solutions, the ion that is lower in the reactivity series is discharged first." },
    { k: ["alkane", "alkene", "hydrocarbon", "organic"], s: "Chemistry", a: "Hydrocarbons contain only carbon and hydrogen. Alkanes (CₙH₂ₙ₊₂) are saturated — single bonds, unreactive (e.g. methane CH₄). Alkenes (CₙH₂ₙ) have a C=C double bond, decolourise bromine water, and make polymers.", t: "The first four alkanes: methane, ethane, propane, butane." },
    { k: ["alcohol", "ethanol", "fermentation"], s: "Chemistry", a: "Alcohols have the –OH group. Ethanol (C₂H₅OH) is made by fermentation of glucose with yeast (no air) and purified by fractional distillation. It burns to CO₂ + water.", t: "Ethanol is the alcohol in drinks; methanol is poisonous." },
    { k: ["polymer", "plastic"], s: "Chemistry", a: "A polymer is a large molecule made of many repeating units (monomers) joined by polymerisation. Addition polymers (e.g. polythene from ethene) have no by-product; condensation polymers (nylon) lose small molecules.", t: "Monomers of alkenes polymerise by addition — the C=C bond opens." },
    { k: ["newton", "force", "first law", "inertia"], s: "Physics", a: "Newton's First Law: a body stays at rest or moves at constant velocity unless acted on by a resultant (net) force. This is inertia — the tendency to resist a change in motion.", t: "Seat-belts work because of inertia — the body keeps moving when the car stops." },
    { k: ["newton second", "f=ma", "acceleration"], s: "Physics", a: "Newton's Second Law: the resultant force equals mass × acceleration, F = ma. Force is measured in newtons (N) where 1 N = 1 kg·m/s². Acceleration is the rate of change of velocity.", t: "F = ma gives the NET force; add all forces in the direction of motion first." },
    { k: ["newton third", "action reaction"], s: "Physics", a: "Newton's Third Law: for every action there is an equal and opposite reaction. Forces act on DIFFERENT bodies — that's why a rocket moves up while gases push down.", t: "Forces come in pairs; they never act on the same body." },
    { k: ["momentum", "impulse"], s: "Physics", a: "Momentum p = mv (kg·m/s). Impulse = Ft = change in momentum (mv − mu). Momentum is conserved in collisions — total momentum before = total after.", t: "Longer stopping time (crumple zones, airbags) reduces the force for the same change in momentum." },
    { k: ["energy", "kinetic", "potential", "efficiency"], s: "Physics", a: "Energy is the capacity to do work (joules). Kinetic energy KE = ½mv²; potential energy PE = mgh. Law of conservation: energy is never lost, only transformed. Efficiency = useful output/input × 100%.", t: "Speed is squared in KE — doubling speed quadruples the energy." },
    { k: ["power", "work"], s: "Physics", a: "Work is done when a force moves something: W = Fs cos θ (joules). Power is the rate of doing work: P = W/t = Fv (watts).", t: "1 kW = 1000 W; energy bills use kWh = kilowatts × hours." },
    { k: ["density"], s: "Physics", a: "Density ρ = mass/volume (kg/m³). Things float if their density is less than the fluid's. Archimedes: upthrust = weight of fluid displaced.", t: "Ice floats because its density (≈920 kg/m³) is less than water's (1000 kg/m³)." },
    { k: ["pressure"], s: "Physics", a: "Pressure = force/area (Pascals, N/m²). In liquids: P = hρg (deeper = more pressure). Atmospheric pressure ≈ 101 kPa at sea level and decreases with height.", t: "A sharp knife cuts better because it reduces the area, increasing pressure." },
    { k: ["ohm", "current", "voltage", "resistance", "circuit"], s: "Physics", a: "Ohm's law: V = IR — voltage = current × resistance. Current (amps) is the rate of flow of charge; Q = It. Electrical power P = VI = I²R = V²/R.", t: "Series: same current, resistors add. Parallel: same voltage, total resistance is smaller than the smallest resistor." },
    { k: ["wave", "frequency", "wavelength"], s: "Physics", a: "A wave transfers energy without transferring matter. Speed v = f × λ (m/s). Frequency (Hz) = waves per second; period T = 1/f. Transverse (light) vibrates perpendicular; longitudinal (sound) parallel.", t: "Sound needs a medium; light doesn't. Sound is fastest in solids." },
    { k: ["sound"], s: "Physics", a: "Sound is a longitudinal wave needing a medium. Speed ≈ 330 m/s in air. Echo distance = vt/2 (the sound goes there AND back). Pitch depends on frequency; loudness on amplitude.", t: "Lower temperature → slower sound in air." },
    { k: ["light", "reflection", "refraction"], s: "Physics", a: "Light travels in straight lines. Reflection: angle of incidence = angle of reflection. Refraction: bending when speed changes (snell: n = sin i/sin r). Refractive index n = c/v.", t: "Total internal reflection happens when the angle exceeds the critical angle (sin c = 1/n) — that's how optical fibres work." },
    { k: ["lens", "mirror", "image"], s: "Physics", a: "Lens/mirror formula: 1/f = 1/u + 1/v. Magnification m = v/u. Convex lens converges light (real image); concave diverges. A convex lens gives a magnified image when the object is inside the focal length.", t: "The human eye's lens forms a real, inverted image on the retina." },
    { k: ["heat", "temperature", "specific heat"], s: "Physics", a: "Temperature measures average kinetic energy; heat is energy in transit. Q = mcΔθ (specific heat capacity) and Q = mL for changes of state (latent heat).", t: "During a change of state the temperature stays constant — the energy goes into breaking bonds." },
    { k: ["gravity", "gravitational", "g"], s: "Physics", a: "Gravity pulls masses together. Weight W = mg (g ≈ 9.8 m/s² or 10 m/s² if told). Universal gravitation: F = Gm₁m₂/r². On Earth g is roughly constant near the surface.", t: "Mass is the amount of matter (kg) — weight is a force (N), and it changes with location." },
    { k: ["velocity", "speed", "distance", "motion", "equations of motion"], s: "Physics", a: "Speed = distance/time; velocity is speed in a given direction. Equations of motion (constant acceleration): v = u + at; s = ut + ½at²; v² = u² + 2as.", t: "Pick the equation that skips the variable you don't need." },
    { k: ["electricity", "magnet", "electromagnet"], s: "Physics", a: "Electricity is the flow of electrons. Magnets attract iron and have N/S poles — like poles repel. A current produces a magnetic field (electromagnet); by Faraday's law a changing magnetic field induces a voltage (generator).", t: "Generators: kinetic → electrical. Motors: electrical → kinetic." },
    { k: ["quadratic", "factorise", "roots"], s: "Mathematics", a: "A quadratic has the form ax² + bx + c = 0. Solve by factorising, completing the square, or the formula x = (−b ± √(b² − 4ac))/2a. The discriminant b² − 4ac tells you: >0 two real roots, =0 one repeated, <0 no real roots.", t: "Sum of roots = −b/a; product = c/a — handy for checking your answers." },
    { k: ["simultaneous"], s: "Mathematics", a: "Simultaneous equations are two (or more) equations with the same unknowns. Solve by elimination (add/subtract to remove one variable) or substitution (make one variable the subject).", t: "Check both solutions in BOTH equations before you finish." },
    { k: ["indices", "powers", "laws of indices"], s: "Mathematics", a: "Index laws: aᵐ × aⁿ = aᵐ⁺ⁿ; aᵐ ÷ aⁿ = aᵐ⁻ⁿ; (aᵐ)ⁿ = aᵐⁿ; a⁰ = 1; a⁻ⁿ = 1/aⁿ; a^(m/n) = ⁿ√(aᵐ).", t: "Same base? Add (×), subtract (÷), multiply (power of a power)." },
    { k: ["logarithm", "log"], s: "Mathematics", a: "If aˣ = b then x = logₐb. Laws: log(xy) = log x + log y; log(x/y) = log x − log y; log xⁿ = n log x; logₐa = 1; log 1 = 0. Change of base: logₐx = log x/log a.", t: "Logs turn multiplication into addition — that's how you solve aˣ = b." },
    { k: ["surd"], s: "Mathematics", a: "Surds are irrational roots like √2, √3. Simplify √(a×b) = √a × √b and rationalise: 1/√a = √a/a (multiply top and bottom by √a).", t: "Never leave a root in the denominator of a final answer." },
    { k: ["sequence", "arithmetic", "geometric"], s: "Mathematics", a: "Arithmetic progression (add d): Tₙ = a + (n−1)d; Sₙ = n/2[2a + (n−1)d]. Geometric progression (multiply r): Tₙ = arⁿ⁻¹; Sₙ = a(rⁿ − 1)/(r − 1); infinite sum S∞ = a/(1 − r) when |r| < 1.", t: "Find d (difference) or r (ratio) first — then everything follows." },
    { k: ["set", "venn", "probability"], s: "Mathematics", a: "A set is a collection of objects. Notation: A∩B = intersection (both), A∪B = union (either). Probability P = favourable/total (0 to 1). P(A∪B) = P(A) + P(B) − P(A∩B). Independent events: P(A∩B) = P(A) × P(B).", t: "If P(A) + P(B) are for mutually exclusive events, just add them." },
    { k: ["mean", "median", "mode", "range", "statistics"], s: "Mathematics", a: "Mean = sum/n; median = middle value (ordered); mode = most frequent; range = max − min. Variance σ² = Σ(x−x̄)²/n and standard deviation σ = √σ² measure spread.", t: "In grouped data use the class midpoint as x, and Σf as n." },
    { k: ["trigonometry", "sohcahtoa", "sine", "cosine", "tan"], s: "Mathematics", a: "In a right-angled triangle: sin θ = opp/hyp, cos θ = adj/hyp, tan θ = opp/adj. Exact values to learn: sin30 = cos60 = ½, sin45 = cos45 = √2/2, tan45 = 1, sin60 = cos30 = √3/2.", t: "Sine rule a/sinA = b/sinB for any triangle; cosine rule a² = b² + c² − 2bc cosA for the angle between two sides." },
    { k: ["pythagoras", "theorem"], s: "Mathematics", a: "Pythagoras: in a right-angled triangle, c² = a² + b² (c is the hypotenuse, the side opposite the right angle).", t: "Spot 3-4-5, 5-12-13 and 8-15-17 triples to save time." },
    { k: ["circle", "pi", "arc", "sector"], s: "Mathematics", a: "Circumference = 2πr; area = πr². Arc length = (θ/360) × 2πr; sector area = (θ/360) × πr² (θ in degrees). π ≈ 3.14159 or 22/7.", t: "Angles in a circle: angle at centre = 2 × angle at circumference (same arc); opposite angles of a cyclic quadrilateral add to 180°." },
    { k: ["mensuration", "volume", "cylinder", "cone", "sphere"], s: "Mathematics", a: "Cuboid V = lwh; cylinder V = πr²h; cone V = ⅓πr²h (slant l = √(r²+h²)); sphere V = 4πr³/3, surface area 4πr². Similar shapes: lengths ×k, areas ×k², volumes ×k³.", t: "Write the formula first — method marks are half the marks." },
    { k: ["interest", "compound", "simple", "percentage"], s: "Mathematics", a: "Simple interest I = PRT/100. Compound: A = P(1 + R/100)ⁿ then interest = A − P. Percentage change = (change/original) × 100%.", t: "For compound interest, the number of periods n matters — months count as fractions." },
    { k: ["demand", "supply", "equilibrium"], s: "Economics", a: "Demand is the quantity consumers are willing and able to buy at each price (downward-sloping); supply is what producers offer (upward-sloping). Equilibrium price is where demand = supply. Excess demand pushes price up; excess supply pushes it down.", t: "A change in price moves ALONG the curve; income/taste change SHIFTS the curve." },
    { k: ["inflation", "cost of living"], s: "Economics", a: "Inflation is a persistent rise in the general price level, reducing the purchasing power of money. Measured with the Consumer Price Index.", t: "Demand-pull (too much money chasing goods) vs cost-push (rising production costs)." },
    { k: ["gdp", "national income"], s: "Economics", a: "GDP is the total value of goods and services produced in a country in a year. National income measures a country's earnings and is used to compare living standards.", t: "Gross Domestic Product ÷ population = income per head." },
    { k: ["opportunity cost", "scarcity"], s: "Economics", a: "Scarcity means wants are unlimited but resources are limited — so every choice has an opportunity cost: the next best alternative forgone.", t: "The core of Economics is choice under scarcity." },
    { k: ["money", "bank", "credit"], s: "Economics", a: "Money is anything generally acceptable in payment for goods and settling debts. Functions: medium of exchange, store of value, unit of account, standard of deferred payment. Banks create credit by lending out deposits.", t: "Barter fails because it needs a double coincidence of wants." },
    { k: ["tax", "budget", "government"], s: "Economics", a: "Taxes are compulsory payments to government. Direct (income tax — on income) vs indirect (VAT, import duties — on spending). A budget is the government's planned revenue and expenditure.", t: "A deficit budget: planned spending exceeds planned revenue." },
    { k: ["constitution"], s: "Government", a: "A constitution is the set of fundamental rules by which a country is governed. Nigeria's 1999 Constitution (amended) provides for federalism, separation of powers and fundamental human rights.", t: "Rigid vs flexible constitutions — Nigeria's is written and partly rigid." },
    { k: ["democracy", "election"], s: "Government", a: "Democracy is government by the people, usually through free and fair elections. Features: periodic elections, universal adult suffrage, rule of law, protection of human rights, an independent judiciary.", t: "INEC conducts Nigerian federal elections: President, National Assembly, Governorship, State Assemblies." },
    { k: ["federalism", "separation of powers"], s: "Government", a: "Federalism shares power between a central government and states/regions (Nigeria: federal, state, local government). Separation of powers divides government into executive, legislature and judiciary so no arm becomes too powerful.", t: "Checks and balances let each arm limit the others." },
    { k: ["human rights", "rule of law"], s: "Civic Education", a: "Human rights are basic entitlements (life, dignity, education, fair hearing). The rule of law means everyone — including government — is subject to the law. Fundamental rights are enforced in court.", t: "Duties match rights: pay taxes, obey laws, protect public property." },
    { k: ["computer", "hardware", "software"], s: "Computer Studies", a: "Hardware is the physical parts (CPU, monitor, keyboard); software is the programs (OS, apps, browsers). The CPU = control unit + ALU + registers; it executes instructions. Input → processing → output → storage is the basic model.", t: "The operating system (Windows, Android, Linux) manages hardware and software." },
    { k: ["algorithm", "programming"], s: "Computer Studies", a: "An algorithm is a step-by-step procedure to solve a problem — often shown as a flowchart or pseudocode. A program is an algorithm written in a language the computer can run.", t: "Flowchart shapes: oval = start/end, rectangle = process, diamond = decision." },
    { k: ["internet", "browser", "email"], s: "Computer Studies", a: "The internet is a global network of networks. A browser (Chrome, Firefox) displays web pages; a search engine finds them; email sends messages over networks. Websites live on servers and are fetched by their URL.", t: "http vs https: the 's' means the connection is encrypted (secure)." },
    { k: ["spreadsheet", "database"], s: "Computer Studies", a: "A spreadsheet (Excel) stores data in rows and columns with formulas like =SUM(A1:A5) and functions (AVERAGE, IF). A database stores organised data in tables with fields (columns) and records (rows), queried with SQL.", t: "In a data model: table = entity, row = record, column = field." },
    { k: ["noun", "verb", "adjective", "adverb", "pronoun", "tense"], s: "English Language", a: "Grammar essentials: a noun names things; a verb shows action/state; an adjective describes a noun; an adverb describes a verb (often -ly); a pronoun replaces a noun (he, she, it). Tense shows time: present, past, future — each with simple, continuous, perfect and perfect-continuous forms.", t: "Subject–verb agreement is the most tested rule: 'Each of the boys IS…' (singular)." },
    { k: ["clause", "sentence", "phrase"], s: "English Language", a: "A phrase has no subject-verb pair; a clause has both. Independent clauses stand alone; dependent clauses cannot. A simple sentence = one clause; compound joins them with and/but/or; complex adds a subordinate clause.", t: "A run-on (comma splice) is one of the commonest SSCE errors." },
    { k: ["simile", "metaphor", "figure of speech"], s: "Literature in English", a: "Simile compares using 'like' or 'as' ('brave as a lion'); metaphor is a direct comparison ('time is a thief'); personification gives human qualities ('the wind whispered'); alliteration repeats initial sounds; onomatopoeia imitates sound.", t: "Identifying figures of speech is worth marks in both objective and essay sections." },
    { k: ["comprehension", "summary"], s: "English Language", a: "Comprehension: read the passage twice, then answer in your own words, quoting only when asked. Summary: find the main points, cut examples, keep to the word limit, use your own words.", t: "In summary writing, every 10 words of the passage ≈ 2 words of summary is a safe guide." },
    { k: ["poultry", "livestock"], s: "Agricultural Science", a: "Poultry farming is raising fowls for eggs and meat. Key practices: brooding, vaccination, balanced feed, clean housing, culling. Livestock (cattle, goats, sheep) need grazing or zero-grazing, watering and disease control (e.g. Newcastle disease in poultry).", t: "Point-of-lay hens start laying at about 18–20 weeks." },
    { k: ["weed", "tillage"], s: "Agricultural Science", a: "Weeds are unwanted plants competing with crops for nutrients, water and light. Control: manual (hoeing), mechanical, chemical (herbicides), biological. Tillage is preparing the land (ploughing, harrowing) to give seeds a good seedbed.", t: "Zero tillage (no ploughing) conserves soil moisture and reduces erosion." }
  ];
  var SUGGEST = ["What is photosynthesis?", "Newton's second law", "Quadratic formula", "Plan my revision", "Explain the current question"];

  var KW_RE = {};
  function kwRe(kw) {
    if (KW_RE[kw]) return KW_RE[kw];
    var t = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var multi = kw.indexOf(" ") >= 0;
    var r = multi ? new RegExp("\\b" + t + "\\b") : new RegExp("\\b" + t + "(?:s|es)?\\b");
    KW_RE[kw] = r;
    return r;
  }
  function factFor(q) {
    var norm = " " + q.toLowerCase().replace(/[^a-z0-9\s']/g, " ").replace(/\s+/g, " ").trim() + " ";
    var best = null, bestScore = 0;
    for (var i = 0; i < FACTS.length; i++) {
      var f = FACTS[i], score = 0;
      for (var j = 0; j < f.k.length; j++) {
        var kw = f.k[j].toLowerCase().replace(/\s+/g, " ").trim();
        if (!kw) continue;
        var re = kwRe(kw);
        // full-word (boundary) match only — no substring hits like "g" in "gibberish"
        if (!re.test(norm)) continue;
        if (kw.length >= 4) score += 2 + Math.min(2, kw.length / 8);
        else if (kw.length === 3) score += 2;
        else score += 0.9;
      }
      if (score > bestScore) { bestScore = score; best = f; }
    }
    return bestScore >= 2 ? best : null;
  }

  function formulaFor(q) {
    var F = null;
    try { F = window.FORMS || null; } catch (e) {}
    if (!F || !F.length) return null;
    var norm = q.toLowerCase();
    var best = null, bestScore = 0;
    for (var i = 0; i < F.length; i++) {
      var f = F[i];
      var hay = (f[2] + " " + f[0] + " " + f[1]).toLowerCase();
      var score = 0;
      var toks = norm.replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
      for (var j = 0; j < toks.length; j++) {
        var t = toks[j];
        if (t.length < 3) continue;
        if (hay.indexOf(t) >= 0) score += 1 + t.length / 10;
      }
      if (score > bestScore) { bestScore = score; best = f; }
    }
    return bestScore >= 2 ? best : null;
  }

  /* v36 — curriculum brain: answer from the lazy window.CURR topic
     library (summaries + keywords for all 27 subjects), so questions
     the fact engine never covered still get a real answer. Anchored
     scoring: a topic-name or keyword hit is required, summaries only
     add weak support — gibberish still falls through to fallback. */
  function currFor(q) {
    var C = null;
    try { C = window.CURR || null; } catch (e) {}
    if (!C) return null;
    var norm = " " + String(q || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim() + " ";
    if (norm.length < 6) return null;
    var toks = norm.split(" ").filter(function (t) { return t.length >= 3; });
    if (!toks.length) return null;
    var best = null, bestScore = 0, keys = Object.keys(C);
    for (var si = 0; si < keys.length; si++) {
      var sub = keys[si], arr = C[sub];
      if (!arr || !arr.length) continue;
      var slow = sub.toLowerCase();
      var subjHit = slow.indexOf(" ") >= 0 ? norm.indexOf(slow) >= 0 : toks.indexOf(slow) >= 0;
      for (var i = 0; i < arr.length; i++) {
        var tp = arr[i];
        if (!tp || !tp[0]) continue;
        var name = String(tp[0]).toLowerCase();
        var kws = Array.isArray(tp[1]) ? tp[1].join(" ").toLowerCase() : String(tp[1] || "").toLowerCase();
        var sum = String(tp[2] || "").toLowerCase();
        var score = 0, anchored = false, weak = 0;
        if (subjHit) { score += 2.5; anchored = true; }
        if (name.length > 4 && norm.indexOf(name) >= 0) { score += 6; anchored = true; }
        for (var j = 0; j < toks.length; j++) {
          var t = toks[j];
          if (name.indexOf(t) >= 0) { score += 2; anchored = true; }
          else if (kws.indexOf(t) >= 0) { score += 2; anchored = true; }
          else if (t.length >= 5 && sum.indexOf(t) >= 0) weak += 0.5;
        }
        score += Math.min(1.5, weak);
        if (anchored && score > bestScore) { bestScore = score; best = { s: sub, tp: tp }; }
      }
    }
    return bestScore >= 2.5 ? best : null;
  }

  /* ---------------- INSIGHTS ---------------- */
  function normalize(recs) {
    var out = [];
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i] || {};
      var subj = r.subj || r.s || "Mixed";
      var pct = typeof r.pct === "number" ? r.pct : (r.correct && r.total) ? Math.round(r.correct / r.total * 100) : null;
      if (pct === null || !subj) continue;
      out.push({ subj: subj, pct: pct, d: r.d || r.date || r.tms || null, tp: r.tp || null });
    }
    return out;
  }
  function dayKey(d) {
    var dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate();
  }
  function analyze(recs) {
    try { window.__rawRecs = recs || []; } catch (e) {}
    var norm = normalize(recs || []);
    var subjects = {}, topics = {}, days = {};
    for (var i = 0; i < norm.length; i++) {
      var r = norm[i];
      if (!subjects[r.subj]) subjects[r.subj] = { n: 0, sum: 0, last: null };
      subjects[r.subj].n++; subjects[r.subj].sum += r.pct;
      if (r.d && (!subjects[r.subj].last || new Date(r.d) > new Date(subjects[r.subj].last))) subjects[r.subj].last = r.d;
      var dk = dayKey(r.d);
      if (dk) days[dk] = (days[dk] || 0) + 1;
      if (r.tp && r.tp.length) {
        for (var j = 0; j < r.tp.length; j++) {
          var t = r.tp[j];
          if (!t || !t.s) continue;
          var key = t.s + "|" + (t.t || "General");
          if (!topics[key]) topics[key] = { s: t.s, t: t.t || "General", acc: [], last: null };
          if (typeof t.acc === "number") topics[key].acc.push(t.acc);
          if (t.d && (!topics[key].last || new Date(t.d) > new Date(topics[key].last))) topics[key].last = t.d;
        }
      }
    }
    var subjArr = Object.keys(subjects).map(function (s) {
      return { s: s, n: subjects[s].n, avg: subjects[s].sum / subjects[s].n, last: subjects[s].last };
    });
    var withN = subjArr.filter(function (x) { return x.n >= 2; }).sort(function (a, b) { return a.avg - b.avg; });
    var weak = withN.length ? withN[0] : null;
    var strong = subjArr.length ? subjArr.sort(function (a, b) { return b.avg - a.avg; })[0] : null;
    // forgetting risk: topics/subjects last attempted 7+ days ago
    var risk = [];
    var now = Date.now();
    Object.keys(topics).forEach(function (k) {
      var t = topics[k];
      if (t.last) {
        var age = (now - new Date(t.last).getTime()) / 864e5;
        if (age >= 7) risk.push({ s: t.s, t: t.t, days: Math.round(age) });
      }
    });
    if (!risk.length) subjArr.forEach(function (x) {
      if (x.last) { var age2 = (now - new Date(x.last).getTime()) / 864e5; if (age2 >= 7) risk.push({ s: x.s, t: "", days: Math.round(age2) }); }
    });
    // streak: consecutive days with attempts ending today or yesterday
    var dkeys = Object.keys(days).sort();
    var streak = 0;
    for (var k3 = dkeys.length - 1; k3 >= 0; k3--) {
      var dk2 = dayKey(new Date(now - streak * 864e5));
      if (dk2 === dkeys[k3]) streak++;
      else if (dk2 === dayKey(new Date(now - (streak + 1) * 864e5)) && k3 === dkeys.length - 1) { /* allow yesterday start */ }
      else break;
    }
    var recs2 = [];
    if (weak) recs2.push("Weakest subject: **" + weak.s + "** (" + weak.n + " papers, avg " + Math.round(weak.avg) + "%) — drill it first.");
    if (strong && strong.s !== (weak && weak.s)) recs2.push("Strongest: " + strong.s + " (avg " + Math.round(strong.avg) + "%) — keep it warm with one paper a week.");
    if (risk.length) recs2.push("Revisit soon (7+ days untouched): " + risk.slice(0, 3).map(function (r) { return r.t ? r.t + " (" + r.s + ")" : r.s; }).join(", ") + ".");
    var topAcc = Object.keys(topics).map(function (k) { return topics[k]; }).filter(function (t) { return t.acc.length >= 2; });
    var weakestTopic = topAcc.sort(function (a, b) {
      var aa = a.acc.reduce(function (x, y) { return x + y; }, 0) / a.acc.length;
      var bb = b.acc.reduce(function (x, y) { return x + y; }, 0) / b.acc.length;
      return aa - bb;
    })[0];
    if (weakestTopic) {
      var wavg = weakestTopic.acc.reduce(function (x, y) { return x + y; }, 0) / weakestTopic.acc.length;
      recs2.push("Topic to sharpen: " + weakestTopic.t + " (" + weakestTopic.s + ") at " + Math.round(wavg) + "% accuracy.");
    }
    var avg = norm.length ? norm.reduce(function (x, y) { return x + y.pct; }, 0) / norm.length : 0;
    return {
      total: norm.length, avg: Math.round(avg), subjects: subjArr, weak: weak, strong: strong,
      risk: risk, streak: streak, topic: weakestTopic, recs: recs2
    };
  }

  /* ---------------- REPLIES ---------------- */
  function replies(q) {
    var ql = q.toLowerCase();
    if (/plan|schedule|organi[sz]e|revis/.test(ql)) {
      var a = analyze(window.__rawRecs || []);
      var lines = ["Here's a plan based on your own history:"];
      if (a.weak) lines.push("1. **" + a.weak.s + "** — 20 min/day (lowest average, " + Math.round(a.weak.avg) + "%).");
      else lines.push("1. Start every session with 15 min of a paper in your weakest area.");
      if (a.topic) lines.push("2. Topic drill: **" + a.topic.t + "** — 10 questions, review each wrong one.");
      if (a.risk.length) lines.push("3. Spaced review: re-do " + a.risk.slice(0, 2).map(function (r) { return r.t || r.s; }).join(" and ") + " before the weekend.");
      lines.push("4. One full past paper on Saturday, timed; reflection journal after.");
      if (a.streak) lines.push("5. You're on a " + a.streak + "-day streak — protect it with 10 minutes even on busy days.");
      else lines.push("5. Start a 3-day streak today — just one paper counts.");
      return { kind: "lib", title: "📋 Revision plan", text: lines.join("\n"), src: "plan" };
    }
    if (/insight|progress|weak|strength|report|how am i|analys/.test(ql)) {
      var a2 = analyze(window.__rawRecs || []);
      if (!a2.total) return { kind: "lib", title: "📊 Insights", text: "I haven't seen any completed papers yet. Finish one paper (try ⚡ a quick drill) and I'll analyse your weak spots, pace and forgetting-risk.", src: "insights" };
      var t = ["📊 **Your study insights** — " + a2.total + " complete paper(s), average " + a2.avg + "%.", "• " + (a2.recs.join("\n• ") || "Keep going — consistency is the whole game."), a2.streak ? "• 🔥 Streak: " + a2.streak + " day(s)." : "• Start a streak today!"];
      return { kind: "lib", title: "📊 Insights", text: t.join("\n"), src: "insights" };
    }
    if (/explain|current question|on screen|this question/.test(ql)) {
      var qt = null, subj = "";
      try { var el = document.getElementById("qText"); qt = el ? el.textContent : null; } catch (e) {}
      try { var sel = document.getElementById("qSubject"); subj = sel && sel.value ? sel.value : ""; } catch (e) {}
      if (!qt || !qt.trim()) return { kind: "lib", title: "🎯 Explain a question", text: "I'll break down any question you're looking at — start a paper or drill first, then ask me again and I'll spot the topic and give you the method (hints only, never the answer).", src: "explain" };
      var tc = topicDetect(subj, qt);
      var head = tc ? "Topic spotted: **" + tc + "**" + (subj ? " (" + subj + ")" : "") + ".\n" : "I couldn't pin the topic, but here's the method approach:\n";
      var f = formulaFor(qt + " " + (tc || ""));
      var kb = factFor((tc || "") + " " + (subj || ""));
      var body = "";
      if (kb) body += kb.a + "\n";
      else if (f) body += "**" + f[2] + "**: " + f[3] + "\n" + f[4] + "\n";
      else body += "1. Read the question twice and underline the given values and the unknown.\n2. Write the formula or relationship for the topic.\n3. Substitute, solve, then check units and sense.\n";
      body += "\n_Answer kept hidden — work it out and you'll remember it longer._";
      return { kind: "lib", title: "🎯 Breakdown", text: head + body, src: "explain" };
    }
    var fact = factFor(q);
    if (fact) {
      var txt = "**" + fact.s + "** — " + fact.a + (fact.t ? "\n\n💡 " + fact.t : "");
      return { kind: "lib", title: fact.s, text: txt, src: "fact" };
    }
    var fo = formulaFor(q);
    if (fo) {
      return { kind: "lib", title: fo[0] + " · " + fo[1], text: "**" + fo[2] + "**: " + fo[3] + "\n" + fo[4] + "\n\nLook it up any time in the 📐 Formula Vault.", src: "formula" };
    }
    var cu = currFor(q);
    if (cu) {
      var ctp = cu.tp, csm = Array.isArray(ctp[3]) ? ctp[3] : [];
      var ctxt = "**" + cu.s + " · " + ctp[0] + "** — " + (ctp[2] || "See your topic notes for the full breakdown.");
      if (csm.length && csm[0].q) ctxt += "\n\n✍️ Self-test: " + csm[0].q;
      ctxt += "\n\nOpen 🗺 Curriculum Atlas to drill this topic.";
      return { kind: "lib", title: cu.s + " · " + ctp[0], text: ctxt, src: "curriculum" };
    }
    return { kind: "lib", title: "Hmm", text: "I couldn't find that in your study library yet. Try one of these, or open 📐 Formula Vault if you're after a formula:\n• " + SUGGEST.slice(0, 4).join("\n• "), src: "fallback" };
  }

  function topicDetect(subj, text) {
    var T = null;
    try { T = window.TOPICS; } catch (e) {}
    if (!T) return null;
    var best = null, bestScore = 0;
    var hay = (text || "").toLowerCase();
    Object.keys(T).forEach(function (s) {
      if (subj && s !== subj) return;
      var cats = T[s] || [];
      for (var i = 0; i < cats.length; i++) {
        var cat = cats[i], name = cat[0], kws = cat[1] || [];
        var score = 0;
        for (var j = 0; j < kws.length; j++) if (hay.indexOf(kws[j]) >= 0) score += 1 + kws[j].length / 10;
        if (score > bestScore) { bestScore = score; best = name; }
      }
    });
    return bestScore >= 1 ? best : null;
  }

  /* ---------------- BYO AI KEY ---------------- */
  function aiAsk(q, done) {
    var cfg = ls(KEY, null);
    if (!cfg || !cfg.key) { done(null); return; }
    var sys = "You are a friendly Nigerian WAEC/NECO/JAMB tutor inside a study app. Answer in 2-6 short, clear sentences with an example where helpful. Never use markdown headings.";
    var body, headers = { "Content-Type": "application/json" };
    if (cfg.provider === "gemini") {
      body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: sys + "\n\nStudent: " + q }] }] });
      headers["x-goog-api-key"] = cfg.key;
    } else {
      body = JSON.stringify({ model: cfg.model || "gpt-4o-mini", messages: [{ role: "system", content: sys }, { role: "user", content: q }] });
      headers.Authorization = "Bearer " + cfg.key;
    }
    var url = cfg.provider === "gemini"
      ? "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
      : "https://api.openai.com/v1/chat/completions";
    var to = setTimeout(function () { done(null); }, 20000);
    try {
      fetch(url, { method: "POST", headers: headers, body: body })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (js) {
          clearTimeout(to);
          var text = cfg.provider === "gemini"
            ? (js.candidates && js.candidates[0] && js.candidates[0].content && js.candidates[0].content.parts && js.candidates[0].content.parts.map(function (p) { return p.text; }).join(""))
            : (js.choices && js.choices[0] && js.choices[0].message && js.choices[0].message.content);
          done(text || null);
        })
        .catch(function () { clearTimeout(to); done(null); });
    } catch (e) { clearTimeout(to); done(null); }
  }

  /* ---------------- UI ---------------- */
  var TAB = "ask", BUSY = false;
  function log(v) { try { window.__rawRecs = v || []; } catch (e) {} }
  function rawRecs() {
    try {
      if (typeof attempts === "function") {
        var a = attempts() || [];
        // map a few fields; normalize() handles the rest
        var out = [];
        for (var i = 0; i < a.length; i++) {
          var r = a[i];
          out.push({ subj: r.subj || r.s, pct: r.pct, d: r.d || r.date || r.tms, tp: r.tp });
        }
        log(out);
        return out;
      }
    } catch (e) {}
    log([]);
    return [];
  }

  function bubble(cls, badge, text) {
    var m = document.createElement("div");
    m.className = "ai-msg " + cls;
    var h = "";
    if (badge) h += '<span class="ai-badge ' + (badge === "AI" ? "ai-ai" : "ai-lib") + '">' + (badge === "AI" ? "✨ AI" : "📚 Library") + "</span>";
    m.innerHTML = h + text.replace(/\n/g, "<br>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    return m;
  }
  function addUser(t) {
    var chat = $("aiChat");
    chat.appendChild(bubble("ai-u", "", esc(t)));
    chat.scrollTop = chat.scrollHeight;
  }
  function ask(q) {
    if (!q || !q.trim() || BUSY) return;
    BUSY = true;
    addUser(q);
    var chat = $("aiChat");
    var go = $("aiGo");
    if (go) go.disabled = true;
    var cfg = ls(KEY, null);
    var done = function (llm) {
      BUSY = false;
      if (go) go.disabled = false;
      // blank the input
      var inp = $("aiIn"); if (inp) inp.value = "";
      var text, badge;
      if (llm) { text = llm; badge = "AI"; }
      else {
        var r = replies(q);
        text = r.text;
        badge = "Library";
        var title = r.title && r.title !== "Hmm" ? "**" + r.title + "**\n" : "";
        text = title + text;
      }
      chat.appendChild(bubble("ai-b", badge, text));
      chat.scrollTop = chat.scrollHeight;
    };
    if (cfg && cfg.key) aiAsk(q, done);
    else setTimeout(function () { done(null); }, 350);
  }

  function renderAsk() {
    var body = $("aiBody");
    if (!body) return;
    var saved = ls(CHAT, null);
    body.innerHTML =
      '<div class="ai-chat" id="aiChat">' +
        (saved && saved.length ? "" : '<div class="ai-msg ai-b">👋 Hi — I\'m your study tutor. I answer from <b>your own library</b>: curriculum facts, the Formula Vault and your real results. Ask me anything, or try a chip below.</div>') +
      "</div>" +
      '<div class="ai-row"><input class="ai-in" id="aiIn" placeholder="Ask… e.g. define osmosis, quadratic formula, plan my revision" aria-label="Ask the tutor"><button class="ai-go" id="aiGo">➤</button></div>' +
      '<div class="ai-chips" id="aiChips">' + SUGGEST.map(function (s) { return '<button type="button" class="ai-chip" data-q="' + esc(s) + '">' + esc(s) + "</button>"; }).join("") + "</div>";
    if (saved && saved.length) {
      for (var i = 0; i < saved.length; i++) {
        var m = saved[i];
        $("aiChat").appendChild(bubble(m.u ? "ai-u" : "ai-b", m.u ? "" : (m.kind === "AI" ? "AI" : "Library"), m.t));
      }
      $("aiChat").scrollTop = $("aiChat").scrollHeight;
    }
    $("aiGo").onclick = function () { ask($("aiIn").value); };
    $("aiIn").onkeydown = function (e) { if (e.key === "Enter") ask($("aiIn").value); };
    Array.prototype.forEach.call(document.querySelectorAll(".ai-chip"), function (b) {
      b.onclick = function () {
        var q = b.getAttribute("data-q");
        if (q === "Explain the current question") ask(q);
        else if ($("aiIn")) { $("aiIn").value = q; ask(q); }
      };
    });
  }

  function renderInsights() {
    var body = $("aiBody");
    if (!body) return;
    rawRecs();
    var a = analyze(window.__rawRecs || []);
    var html = "";
    if (!a.total) {
      html = '<div class="ai-stat"><b>📊 No analysis yet</b><span>Finish one paper (or a drill) and this becomes a live report: weakest subjects, weakest topics, pace, forgetting-risk and your streak.</span></div>';
    } else {
      html += '<div class="ai-stat"><b>📊 Overview</b><span>' + a.total + " complete paper(s) · average <b>" + a.avg + "%</b> · 🔥 " + a.streak + "-day streak</span></div>";
      a.subjects.slice().sort(function (x, y) { return y.avg - x.avg; }).forEach(function (s) {
        var bar = Math.max(6, s.avg);
        html += '<div class="ai-stat"><b>' + esc(s.s) + " · " + Math.round(s.avg) + "% (" + s.n + " papers)</b>" +
          '<div style="background:var(--bar-track,#e6decc);border-radius:99px;height:8px;overflow:hidden"><div style="width:' + bar + '%;height:100%;background:linear-gradient(90deg,#eccf8e,#c9a25f);border-radius:99px"></div></div></div>';
      });
      html += '<div class="ai-stat"><b>🎯 What to do next</b><ul>' + a.recs.map(function (r) { return "<li>" + r.replace(/\*\*/g, "") + "</li>"; }).join("") + "</ul></div>";
    }
    html += '<div class="ai-note">All numbers come from your attempts on this device — nothing is uploaded.</div>';
    body.innerHTML = html;
  }

  function renderKey() {
    var body = $("aiBody");
    if (!body) return;
    var cfg = ls(KEY, null) || { provider: "gemini", key: "", model: "gpt-4o-mini" };
    body.innerHTML =
      '<div class="ai-key">' +
        "<b>🔑 Bring your own AI key (optional)</b><br>" +
        "The built-in tutor works offline from your library. Paste a free-tier <b>Gemini</b> or <b>OpenAI</b> API key to unlock real LLM answers. The key is saved <b>only on this device</b> and sent only to your chosen provider." +
        '<select id="aiProv" aria-label="Provider"><option value="gemini"' + (cfg.provider === "gemini" ? " selected" : "") + '>Google Gemini (free tier)</option><option value="openai"' + (cfg.provider === "openai" ? " selected" : "") + '>OpenAI</option></select>' +
        '<input id="aiKey" type="password" placeholder="Paste your API key…" value="' + esc(cfg.key || "") + '" aria-label="API key">' +
        '<button class="ai-go" id="aiSave">Save key</button> <button class="ai-chip" id="aiClear">Remove</button>' +
      "</div>";
    $("aiSave").onclick = function () {
      var k = $("aiKey").value.trim();
      if (!k) { toast && toast("Paste a key first", "🔑"); return; }
      lss(KEY, { provider: $("aiProv").value, key: k, model: "gpt-4o-mini" });
      toast && toast("AI key saved (this device only)", "✨");
    };
    $("aiClear").onclick = function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      toast && toast("AI key removed — built-in tutor active", "📚");
      renderKey();
    };
  }

  function setTab(t) {
    TAB = t;
    Array.prototype.forEach.call(document.querySelectorAll(".ai-tab"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-t") === t);
    });
    if (t === "ask") renderAsk();
    else if (t === "insights") renderInsights();
    else renderKey();
  }

  function open(tab) {
    css();
    document.documentElement.classList.add("ai");
    var ov = $("aiOv");
    if (ov) { ov.style.display = "flex"; setTab(tab || TAB); return; }
    ov = document.createElement("div");
    ov.id = "aiOv";
    ov.className = "ai-ov";
    ov.setAttribute("aria-label", "AI Study Tutor");
    ov.innerHTML =
      '<div class="ai-box" role="dialog" aria-label="AI Study Tutor">' +
        '<div class="ai-h"><span>🧠 AI Study Tutor</span><button class="ai-x" id="aiX" aria-label="Close">✕</button></div>' +
        '<div class="ai-sub">Answers from your study library — or connect your own AI key</div>' +
        '<div class="ai-tabs"><button type="button" class="ai-tab on" data-t="ask">💬 Ask</button><button type="button" class="ai-tab" data-t="insights">📊 Insights</button><button type="button" class="ai-tab" data-t="key">🔑 AI key</button></div>' +
        '<div id="aiBody"></div>' +
      "</div>";
    document.body.appendChild(ov);
    $("aiX").onclick = close;
    Array.prototype.forEach.call(ov.querySelectorAll(".ai-tab"), function (b) {
      b.onclick = function () { setTab(b.getAttribute("data-t")); };
    });
    ov.onclick = function (e) { if (e.target === ov) close(); };
    setTab(tab || TAB);
  }
  function close() {
    // persist chat
    try {
      var chat = $("aiChat");
      if (chat) {
        var msgs = Array.prototype.map.call(chat.querySelectorAll(".ai-msg"), function (m) {
          var u = m.classList.contains("ai-u");
          return { u: u, t: m.textContent, kind: /✨ AI/.test(m.querySelector(".ai-badge") ? m.querySelector(".ai-badge").textContent : "") ? "AI" : "Library" };
        });
        lss(CHAT, msgs.slice(-14));
      }
    } catch (e) {}
    var ov = $("aiOv");
    if (ov) { try { ov.remove(); } catch (e) {} }
  }

  /* ---------------- boot ---------------- */
  function boot() {
    css();
    try { document.documentElement.classList.add("ai"); } catch (e) {}
    try { chips(); } catch (e) {}
    try { hooks(); } catch (e) {}
    try {
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && document.getElementById("aiOv")) close();
      });
    } catch (e) {}
    window.__aiApi = { ask: ask, reply: replies, analyze: analyze, curr: currFor, open: open, close: close, FACTS: FACTS.length };
  }
  function chips() {
    var w = document.getElementById("examChip");
    var host = w ? null : document.querySelector(".hero-copy");
    if (!w && !host) return;
    function mk(id, emo, t, sub, fn) {
      var b = document.createElement("button");
      b.type = "button"; b.id = id;
      b.className = "ex-tile bt-chip";
      b.innerHTML = emo + " <span>" + t + "<small>" + sub + "</small></span>";
      b.addEventListener("click", fn);
      return b;
    }
    var b = mk("aiLaunch", "🧠", "AI Tutor", "Ask · insights · your key", function () { open("ask"); });
    if (w) w.insertBefore(b, w.lastChild);
    else {
      var grp = document.createElement("div");
      grp.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:8px";
      grp.appendChild(b);
      host.insertBefore(grp, host.querySelector(".stats"));
    }
  }
  function hooks() {
    var h = function (add) {
      add("Tools", "🧠", "AI Study Tutor", "Ask questions, get insights, connect an AI key", function () { open("ask"); });
      add("Tools", "📊", "AI Insights", "Weak spots, pace, forgetting-risk, plan", function () { open("insights"); });
    };
    if (window.__proPalHooks && window.__proPalHooks.push) window.__proPalHooks.push(h);
    else window.__proPalHooks = [h];
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
