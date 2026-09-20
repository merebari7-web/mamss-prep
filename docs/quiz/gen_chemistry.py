# -*- coding: utf-8 -*-
"""Chemistry: facts + element symbols + formula + numeric params, 100 per level."""
from engine import G, H, AN, pad_wrongs, mcq_opts

SUBJECT = "Chemistry"

FACTS = {
1: [
 ("atom", "the smallest particle of an element that can take part in a chemical reaction", "atomic structure"),
 ("molecule", "a group of two or more atoms held together by chemical bonds", "atomic structure"),
 ("element", "a pure substance that cannot be split into simpler substances by chemical means", "atomic structure"),
 ("compound", "a substance formed when two or more elements combine chemically in fixed proportions", "atomic structure"),
 ("mixture", "a combination of two or more substances that are not chemically combined", "atomic structure"),
 ("proton", "the positively charged particle found in the nucleus of an atom", "atomic structure"),
 ("neutron", "the uncharged particle found in the nucleus of an atom", "atomic structure"),
 ("electron", "the negatively charged particle that orbits the nucleus of an atom", "atomic structure"),
 ("atomic number", "the number of protons in the nucleus of an atom", "atomic structure"),
 ("mass number", "the total number of protons and neutrons in the nucleus of an atom", "atomic structure"),
 ("chemical symbol", "the short way of representing an element, such as Na for sodium", "atomic structure"),
 ("chemical formula", "the representation of a compound by the symbols of its elements", "atomic structure"),
 ("periodic table", "the table that arranges elements in order of increasing atomic number", "periodic table"),
 ("noble gases", "the unreactive elements in Group 0 of the periodic table", "periodic table"),
 ("metals", "elements that are usually shiny and good conductors of heat and electricity", "periodic table"),
 ("non-metals", "elements that are usually dull and poor conductors of heat and electricity", "periodic table"),
 ("acid", "a substance that turns blue litmus red and has a pH below 7", "acids and bases"),
 ("base", "a substance that turns red litmus blue and reacts with an acid to form a salt", "acids and bases"),
 ("alkali", "a soluble base", "acids and bases"),
 ("neutralisation", "the reaction between an acid and a base to form a salt and water", "acids and bases"),
 ("pH scale", "the scale from 0 to 14 that measures the acidity or alkalinity of a solution", "acids and bases"),
 ("indicator", "a substance that changes colour to show whether a solution is acidic or alkaline", "acids and bases"),
 ("evaporation", "the change of a liquid into a gas at any temperature below its boiling point", "states of matter"),
 ("condensation", "the change of a gas into a liquid", "states of matter"),
 ("sublimation", "the change of a solid directly into a gas without melting", "states of matter"),
 ("melting point", "the temperature at which a solid changes into a liquid", "states of matter"),
 ("boiling point", "the temperature at which a liquid changes into a gas throughout the liquid", "states of matter"),
 ("solute", "the substance that dissolves in a liquid to form a solution", "mixtures and separation"),
 ("solvent", "the liquid that dissolves a solute", "mixtures and separation"),
 ("solution", "a uniform mixture of a solute dissolved in a solvent", "mixtures and separation"),
 ("filtration", "the method used to separate an insoluble solid from a liquid", "mixtures and separation"),
 ("distillation", "the method used to separate a liquid from a solution by boiling and condensing", "mixtures and separation"),
],
2: [
 ("ion", "an atom or group of atoms that has gained or lost electrons and become charged", "chemical bonding"),
 ("cation", "a positively charged ion formed by the loss of electrons", "chemical bonding"),
 ("anion", "a negatively charged ion formed by the gain of electrons", "chemical bonding"),
 ("ionic bond", "the bond formed by the transfer of electrons from one atom to another", "chemical bonding"),
 ("covalent bond", "the bond formed by the sharing of electrons between atoms", "chemical bonding"),
 ("valency", "the combining power of an element", "chemical bonding"),
 ("electrolysis", "the decomposition of a compound into its elements by the passage of electricity", "electrolysis"),
 ("electrolyte", "a substance that conducts electricity when molten or in solution", "electrolysis"),
 ("anode", "the positive electrode in electrolysis", "electrolysis"),
 ("cathode", "the negative electrode in electrolysis", "electrolysis"),
 ("oxidation", "the loss of electrons by a substance", "electrolysis"),
 ("reduction", "the gain of electrons by a substance", "electrolysis"),
 ("mole", "the amount of a substance containing about 6.02 × 10²³ particles", "mole concept"),
 ("molar mass", "the mass of one mole of a substance in grams", "mole concept"),
 ("empirical formula", "the simplest whole-number ratio of the atoms in a compound", "mole concept"),
 ("molecular formula", "the actual number of atoms of each element in a molecule", "mole concept"),
 ("exothermic reaction", "a reaction that releases heat to the surroundings", "energy changes"),
 ("endothermic reaction", "a reaction that absorbs heat from the surroundings", "energy changes"),
 ("salt", "the compound formed when the hydrogen of an acid is replaced by a metal", "acids and bases"),
 ("rusting", "the slow corrosion of iron in the presence of oxygen and water", "acids and bases"),
 ("alloy", "a mixture of a metal with another metal or a non-metal", "metals"),
 ("brass", "an alloy of copper and zinc", "metals"),
 ("bronze", "an alloy of copper and tin", "metals"),
 ("corrosion", "the gradual destruction of a metal by chemical action", "metals"),
 ("period", "a horizontal row of elements in the periodic table", "periodic table"),
 ("group", "a vertical column of elements in the periodic table", "periodic table"),
 ("metalloids", "elements with properties midway between those of metals and non-metals", "periodic table"),
 ("hard water", "water that does not readily form a lather with soap", "water"),
 ("soft water", "water that readily forms a lather with soap", "water"),
 ("catalyst", "a substance that speeds up a chemical reaction without being used up", "reaction rates"),
 ("reversible reaction", "a reaction that can proceed in both forward and backward directions", "reaction rates"),
],
3: [
 ("hydrocarbon", "an organic compound containing only hydrogen and carbon", "organic chemistry"),
 ("alkanes", "saturated hydrocarbons with the general formula CnH2n+2", "organic chemistry"),
 ("alkenes", "unsaturated hydrocarbons with the general formula CnH2n", "organic chemistry"),
 ("functional group", "the part of an organic molecule that gives it its characteristic reactions", "organic chemistry"),
 ("ethanol", "the alcohol with the formula C2H5OH", "organic chemistry"),
 ("methanol", "the alcohol with the formula CH3OH", "organic chemistry"),
 ("ethanoic acid", "the carboxylic acid with the formula CH3COOH", "organic chemistry"),
 ("isomers", "compounds with the same molecular formula but different structural formulae", "organic chemistry"),
 ("homologous series", "a family of organic compounds with the same functional group and general formula", "organic chemistry"),
 ("fermentation", "the breakdown of sugar to ethanol and carbon dioxide by yeast", "organic chemistry"),
 ("saponification", "the reaction of fats or oils with alkali to form soap", "organic chemistry"),
 ("polymer", "a large molecule made of many smaller repeating units called monomers", "organic chemistry"),
 ("monomer", "the small repeating unit from which a polymer is built", "organic chemistry"),
 ("ester", "the compound formed when an alcohol reacts with a carboxylic acid", "organic chemistry"),
 ("crude oil", "a mixture of hydrocarbons found beneath the earth's surface", "organic chemistry"),
 ("fractional distillation", "the process used to separate the fractions of crude oil", "organic chemistry"),
 ("cracking", "the breaking of large hydrocarbon molecules into smaller ones", "organic chemistry"),
 ("activation energy", "the minimum energy needed for particles to react when they collide", "reaction kinetics"),
 ("catalyst", "a substance that increases the rate of a reaction without being used up", "reaction kinetics"),
 ("equilibrium", "the state in which the forward and backward rates of a reversible reaction are equal", "reaction kinetics"),
 ("collision theory", "the theory that reactions occur when particles collide with sufficient energy", "reaction kinetics"),
 ("rate of reaction", "the change in concentration of a reactant or product per unit time", "reaction kinetics"),
 ("exothermic reaction", "a reaction that releases heat to the surroundings", "energy changes"),
 ("endothermic reaction", "a reaction that absorbs heat from the surroundings", "energy changes"),
 ("titration", "the process of adding a solution of known concentration to a solution of unknown concentration", "analytical chemistry"),
 ("standard solution", "a solution whose concentration is accurately known", "analytical chemistry"),
 ("litmus", "an indicator that is red in acid and blue in alkali", "analytical chemistry"),
 ("amphoteric substance", "a substance that can act as both an acid and a base", "analytical chemistry"),
 ("nuclear energy", "the energy released when the nucleus of an atom changes", "nuclear chemistry"),
 ("radioactive decay", "the process by which unstable nuclei break down and emit radiation", "nuclear chemistry"),
 ("isotopes", "atoms of the same element with different numbers of neutrons", "atomic structure"),
 ("electronic configuration", "the arrangement of electrons in the shells of an atom", "atomic structure"),
],
}

# (name, symbol, protons) — kept small; symbol and proton questions are generated from it
ELEMENTS = {
1: [("sodium","Na",11),("potassium","K",19),("iron","Fe",26),("copper","Cu",29),
    ("calcium","Ca",20),("magnesium","Mg",12),("aluminium","Al",13),("chlorine","Cl",17),
    ("hydrogen","H",1),("oxygen","O",8),("nitrogen","N",7),("carbon","C",6),
    ("sulphur","S",16),("zinc","Zn",30),("silver","Ag",47),("gold","Au",79),
    ("helium","He",2),("neon","Ne",10),("lead","Pb",82),("tin","Sn",50)],
2: [("barium","Ba",56),("mercury","Hg",80),("cobalt","Co",27),("nickel","Ni",28),
    ("manganese","Mn",25),("chromium","Cr",24),("fluorine","F",9),("bromine","Br",35),
    ("iodine","I",53),("silicon","Si",14),("phosphorus","P",15),("argon","Ar",18),
    ("lithium","Li",3),("beryllium","Be",4),("boron","B",5),("titanium","Ti",22),
    ("platinum","Pt",78),("molybdenum","Mo",42),("strontium","Sr",38),("selenium","Se",34)],
3: [("uranium","U",92),("tungsten","W",74),("radium","Ra",88),("francium","Fr",87),
    ("caesium","Cs",55),("germanium","Ge",32),("gallium","Ga",31),("arsenic","As",33),
    ("rubidium","Rb",37),("yttrium","Y",39),("cadmium","Cd",48),("bismuth","Bi",83),
    ("antimony","Sb",51),("xenon","Xe",54),("krypton","Kr",36),("radon","Rn",86),
    ("polonium","Po",84),("astatine","At",85),("actinium","Ac",89),("protactinium","Pa",91)],
}

# (compound name, formula)
FORMULAS = {
1: [("water","H₂O"),("carbon dioxide","CO₂"),("common salt","NaCl"),("sulphuric acid","H₂SO₄"),
    ("hydrochloric acid","HCl"),("ammonia","NH₃"),("methane","CH₄"),("oxygen gas","O₂"),
    ("hydrogen peroxide","H₂O₂"),("calcium carbonate","CaCO₃"),("nitrogen gas","N₂"),("sodium hydroxide","NaOH")],
2: [("chlorine gas","Cl₂"),("sodium trioxocarbonate (IV)","Na₂CO₃"),("calcium hydroxide","Ca(OH)₂"),
    ("sulphur dioxide","SO₂"),("hydrogen sulphide","H₂S"),("nitric acid","HNO₃"),
    ("phosphoric acid","H₃PO₄"),("potassium permanganate","KMnO₄"),("ethanol","C₂H₅OH"),
    ("glucose","C₆H₁₂O₆"),("copper (II) sulphate","CuSO₄"),("sodium bicarbonate","NaHCO₃")],
3: [("ethanoic acid","CH₃COOH"),("methanol","CH₃OH"),("propane","C₃H₈"),("butane","C₄H₁₀"),
    ("ethene","C₂H₄"),("ethyne (acetylene)","C₂H₂"),("benzene","C₆H₆"),("octane","C₈H₁₈"),
    ("sulphur trioxide","SO₃"),("dinitrogen monoxide","N₂O"),("calcium oxide","CaO"),
    ("sodium carbonate decahydrate","Na₂CO₃·10H₂O")],
}

def sym_q(g):
    name, sym, p = g.choice(ELEMENTS[g.lvl])
    wrong = [x[1] for x in ELEMENTS[g.lvl] if x[0] != name]
    wrongs = pad_wrongs(g.rng, [w for w in g.sample(wrong, 4)], sym)
    o, ai = mcq_opts(g.rng, wrongs, sym)
    return g.build(f"The chemical symbol for {name} is:", o, ai, f"{name} is represented by the symbol {sym}.")

def name_q(g):
    name, sym, p = g.choice(ELEMENTS[g.lvl])
    pool = [x[0] for x in ELEMENTS[g.lvl] if x[0] != name]
    wrongs = pad_wrongs(g.rng, list(g.sample(pool, 4)), name)
    o, ai = mcq_opts(g.rng, wrongs, name)
    return g.build(f"Which element has the chemical symbol {sym}?", o, ai, f"{sym} is the symbol of {name}.")

def proton_q(g):
    name, sym, p = g.choice(ELEMENTS[g.lvl])
    wrongs = pad_wrongs(g.rng, [str(p + 1), str(p - 1), str(p * 2), str(p // 2)], str(p), numeric=p)
    o, ai = mcq_opts(g.rng, wrongs, str(p))
    return g.build(f"How many protons are there in the nucleus of a {name} atom? (atomic number = {p})", o, ai,
                   f"The number of protons equals the atomic number, which is {p}.")

def formula_q(g):
    name, f = g.choice(FORMULAS[g.lvl])
    pool = [x[1] for x in FORMULAS[g.lvl] if x[0] != name]
    wrongs = pad_wrongs(g.rng, list(g.sample(pool, 4)), f)
    o, ai = mcq_opts(g.rng, wrongs, f)
    return g.build(f"What is the chemical formula of {name}?", o, ai, f"The formula of {name} is {f}.")

def electrons_q(g):
    name, sym, p = g.choice(ELEMENTS[g.lvl])
    wrongs = pad_wrongs(g.rng, [str(p + 1), str(p - 1), str(p * 2)], str(p), numeric=p)
    o, ai = mcq_opts(g.rng, wrongs, str(p))
    return g.build(f"In a neutral {name} atom, how many electrons surround the nucleus? (atomic number = {p})",
                   o, ai, f"In a neutral atom, electrons equal protons: {p}.")

def molar_q(g):
    name, sym, m = g.choice([("oxygen","O",16),("carbon","C",12),("nitrogen","N",14),("sulphur","S",32),
                             ("calcium","Ca",40),("sodium","Na",23),("magnesium","Mg",24),("aluminium","Al",27),
                             ("chlorine","Cl",35.5),("potassium","K",39),("iron","Fe",56),("zinc","Zn",65)])
    mm = g.randint(1, 4) * m
    mols = mm / m
    ans = H(mols)
    wrongs = pad_wrongs(g.rng, [H(mols + 1), H(mols * 2), H(mols - 1)], ans, numeric=mols)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"How many moles are there in {H(mm)} g of {name}? (relative atomic mass of {name} = {H(m)})",
                   o, ai, f"Moles = mass ÷ molar mass = {H(mm)} ÷ {H(m)} = {ans} mol.")

FUNCS = {
1: [sym_q, name_q, proton_q, formula_q],
2: [sym_q, name_q, proton_q, formula_q, electrons_q],
3: [sym_q, name_q, proton_q, formula_q, molar_q],
}
FACT_TARGET = {1: 60, 2: 70, 3: 78}

def generate(level, seed=1, target=100, blocked=None):
    g = G(SUBJECT, seed, blocked)
    g.lvl = level
    g.fill_facts(FACTS[level], FACT_TARGET[level], use_cap=4)
    g.fill_params(FUNCS[level], target)
    g.shuffle_qs()
    return g.qs
