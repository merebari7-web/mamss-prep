#!/usr/bin/env python3
# v15 generator: merges _curr_core1/2/ext.js, tops up second-authored questions,
# and emits _curr_data.js (healthy JS). _curr_data.js is committed.
import json, re

def load(path):
    s = open(path, encoding='utf-8').read()
    return s

def strip_close(s):
    s = s.rstrip()
    assert s.endswith('};'), path
    return s[:-2].rstrip()

def extract_obj(src):
    idx = src.index('{')
    depth = 0; ins = False; esc = False
    for i in range(idx, len(src)):
        c = src[i]
        if ins:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '"': ins = False
            continue
        if c == '"': ins = True; continue
        if c in '{[': depth += 1
        elif c in '}]':
            depth -= 1
            if depth == 0:
                return json.loads(src[idx:i+1])
    raise ValueError('unbalanced')

# ---- extra questions for every topic that needs a second one ----
ADD = {
 "Essay Writing (Narrative & Argumentative)": [
   {"q":"Which paragraph of an argumentative essay restates the main stand?","o":["the introduction","the first body paragraph","the conclusion","the title"],"a":2,"e":"The conclusion summarises and restates the position taken in the essay."}],
 "Summary Writing": [
   {"q":"Which of these must a good summary avoid?","o":["your own wording","copied sentences","the main ideas","a fixed length"],"a":1,"e":"Summaries are written in your own words; copying loses marks."}],
 "Tenses & Concord": [
   {"q":"Neither the teacher nor the students ___ in the hall.","o":["is","are","was","has"],"a":1,"e":"With neither…nor the verb agrees with the nearer subject: the students → are."}],
 "The Respiratory System": [
   {"q":"Air enters the lungs through the…","o":["oesophagus","trachea","spine","aorta"],"a":1,"e":"The trachea (windpipe) carries air to the bronchi and lungs."}],
 "Coordination: The Nervous System": [
   {"q":"The basic unit of the nervous system is the…","o":["neurone","hormone","alveolus","nephron"],"a":0,"e":"Neurones (nerve cells) carry impulses."}],
 "Reproduction in Humans": [
   {"q":"Which organ produces the ovum?","o":["uterus","ovary","oviduct","vagina"],"a":1,"e":"The ovaries produce ova and the hormones oestrogen and progesterone."}],
 "Genetics & Evolution": [
   {"q":"The physical appearance of an organism is its…","o":["genotype","phenotype","gene","chromosome"],"a":1,"e":"Phenotype is the observable trait; genotype is the genetic makeup."}],
 "Organic Chemistry: Alkanes": [
   {"q":"Crude oil is separated into fractions by…","o":["filtration","fractional distillation","electrolysis","crystallisation"],"a":1,"e":"Fractional distillation separates crude oil by boiling point."}],
 "Rates of Reaction": [
   {"q":"Powdered calcium carbonate reacts faster than lumps because it has more…","o":["mass","surface area","density","volume"],"a":1,"e":"Fine particles expose more surface area for collisions."}],
 "Reversible Reactions & Equilibrium": [
   {"q":"At equilibrium, the rates of the forward and backward reactions are…","o":["zero","equal","unequal","increasing"],"a":1,"e":"Equilibrium is dynamic: both reactions continue at equal rates."}],
 "Water & Solutions": [
   {"q":"A solution is a mixture of a solute and a…","o":["solvent","precipitate","suspension","filtrate"],"a":0,"e":"The solute dissolves in the solvent to form the solution."}],
 "Projectile Motion": [
   {"q":"The horizontal motion of a projectile is…","o":["accelerating","uniform","decelerating","zero"],"a":1,"e":"No horizontal force acts, so horizontal velocity stays constant."}],
 "Sound Waves": [
   {"q":"The speed of sound is greatest in…","o":["air","water","steel","a vacuum"],"a":2,"e":"Sound travels fastest in solids because particles are closer."}],
 "Light: Lenses & Mirrors": [
   {"q":"The image formed by a plane mirror is…","o":["real and inverted","virtual and same size","magnified","blurred"],"a":1,"e":"A plane mirror forms a virtual, upright, same-size image."}],
 "Electronics & Semiconductors": [
   {"q":"Adding impurities to a pure semiconductor is called…","o":["doping","fusion","refining","ionising"],"a":0,"e":"Doping adds impurities to control conductivity."}],
 "Pests & Diseases of Crops": [
   {"q":"Growing different crops in alternate seasons to break pest life cycles is…","o":["monoculture","crop rotation","bush burning","mulching"],"a":1,"e":"Crop rotation is a cultural control method."}],
 "Animal Nutrition & Feeds": [
   {"q":"A feed rich in protein for growing animals is…","o":["groundnut cake","straw","silage","sawdust"],"a":0,"e":"Groundnut cake is a protein-rich concentrate."}],
 "Poultry & Livestock Production": [
   {"q":"Newcastle disease in poultry is prevented by…","o":["vaccination","dipping","deworming","drenching"],"a":0,"e":"Routine vaccination protects against Newcastle disease."}],
 "Fisheries & Fish Farming": [
   {"q":"Which water condition is most important for fish survival?","o":["colour","dissolved oxygen","turbidity only","temperature constant at 30°C"],"a":1,"e":"Adequate dissolved oxygen is essential; fish die without it."}],
 "Farm Management & Records": [
   {"q":"A statement of income and expenses over a period is a…","o":["cash book","inventory","balance sheet only","farm plan"],"a":0,"e":"The cash book records day-to-day money received and paid."}],
 "The Executive": [
   {"q":"In a presidential system the head of government is the…","o":["prime minister","president","speaker","chief justice"],"a":1,"e":"The president is both head of state and head of government."}],
 "The Legislature": [
   {"q":"A proposed law before parliament is a…","o":["decree","bill","treaty","writ"],"a":1,"e":"A bill becomes an act of parliament after passage and assent."}],
 "The Judiciary": [
   {"q":"Which court first hears most criminal cases in Nigeria?","o":["Supreme Court","Magistrate Court","Court of Appeal","Federal High Court of Appeal"],"a":1,"e":"Magistrate courts try most minor criminal cases at first instance."}],
 "Federalism": [
   {"q":"In a federation, residual powers are exercised by the…","o":["central government","component units","judiciary","traditional rulers"],"a":1,"e":"Residual matters not listed in the constitution belong to the states."}],
 "The Constitution & Rule of Law": [
   {"q":"Which of these promotes the rule of law?","o":["immunity for officials","independent courts","secret trials","arbitrary arrest"],"a":1,"e":"An independent judiciary and equality before the law uphold it."}],
 "Local Government": [
   {"q":"Local governments are funded mainly by…","o":["exports","statutory allocations","licence fees only","foreign aid"],"a":1,"e":"Revenue comes from statutory allocations and internally generated revenue."}],
 "Non-African Prose Study": [
   {"q":"The vantage point from which a story is told is its…","o":["plot","point of view","setting","conflict"],"a":1,"e":"Point of view is the narrative perspective (first or third person)."}],
 "African Poetry Study": [
   {"q":"Repetition of initial consonant sounds in a poem is called…","o":["assonance","alliteration","rhyme","metre"],"a":1,"e":"Alliteration repeats initial consonant sounds."}],
 "Unseen Poetry Analysis": [
   {"q":"The overall feeling created by a poem is its…","o":["subject","mood","rhyme","diction"],"a":1,"e":"Mood is the emotional atmosphere of the poem."}],
 "Literary Devices & Figures": [
   {"q":"Words that imitate sounds, like buzz, are…","o":["onomatopoeia","simile","hyperbole","paradox"],"a":0,"e":"Onomatopoeia imitates natural sounds."}],
 "Comparative Analysis": [
   {"q":"A question asking how two texts are alike and different is…","o":["descriptive","comparative","narrative","rhetorical"],"a":1,"e":"Comparative questions test similarities and differences."}],
 "Textual Evidence & Style": [
   {"q":"The writer's choice of words is his or her…","o":["diction","plot","setting","dialogue"],"a":0,"e":"Diction is word choice; it shapes tone and style."}],
 "Weather & Climate": [
   {"q":"The average weather condition of a place over many years is its…","o":["weather","climate","season","forecast"],"a":1,"e":"Climate is the long-term average; weather is day-to-day."}],
 "Population & Settlement": [
   {"q":"People moving out of a country to live in another is…","o":["immigration","emigration","transhumance","commuting"],"a":1,"e":"Emigration is leaving; immigration is entering."}],
 "River Landforms & Delta": [
   {"q":"A bend in a river is called a…","o":["levee","meander","gorge","delta"],"a":1,"e":"Meanders are bends that migrate across the floodplain."}],
 "Industrial & Economic Geography": [
   {"q":"Which industry processes raw materials into finished goods?","o":["primary","secondary","tertiary","quaternary only"],"a":1,"e":"Secondary (manufacturing) industry transforms raw materials."}],
 "Environmental Hazards & Conservation": [
   {"q":"Afforestation is the practice of…","o":["cutting trees","planting trees","burning bushes","flooding land"],"a":1,"e":"Tree planting checks soil erosion and desertification."}],
 "Stock Exchange & Securities": [
   {"q":"The market where existing shares are bought and sold is the…","o":["money market","stock exchange","commodity market","labour market"],"a":1,"e":"The stock exchange is the secondary market for securities."}],
 "Transport & Communication": [
   {"q":"Which is a means of communication?","o":["railway","telephone","pipeline","aircraft"],"a":1,"e":"Telephone carries information, not goods."}],
 "International Trade & Finance": [
   {"q":"A tax on imported goods is called a…","o":["excise duty","import duty","income tax","capital tax"],"a":1,"e":"Import (customs) duties are levied on goods entering a country."}],
 "Business Units": [
   {"q":"The maximum number of partners in an ordinary partnership in Nigeria is…","o":["2","5","20","50"],"a":2,"e":"An ordinary partnership has 2–20 partners."}],
 "Business Finance & Accounting": [
   {"q":"Money owed by a business to others are its…","o":["assets","liabilities","capital","reserves"],"a":1,"e":"Liabilities are debts: loans, creditors and overdrafts."}],
 "Word Processing": [
   {"q":"A standard word-processed letter file saves with the extension…","o":[".xls",".docx",".ppt",".png"],"a":1,"e":".docx is the Word format."}],
 "Database Concepts": [
   {"q":"A software that manages a database is a…","o":["CMS","DBMS","CSS","DNS"],"a":1,"e":"A Database Management System creates, stores and queries data."}],
 "Data Security & Ethics": [
   {"q":"Making data unreadable to unauthorised users is called…","o":["compression","encryption","formatting","defragmentation"],"a":1,"e":"Encryption scrambles data; only the key reads it."}],
 "Citizenship & National Identity": [
   {"q":"A person who belongs to a state with full rights and duties is a…","o":["visitor","citizen","resident","alien"],"a":1,"e":"Citizenship carries rights and duties in a state."}],
 "Rights, Duties & Obligations": [
   {"q":"Which of these is a fundamental human right?","o":["tax payment","right to life","jury service","voting duty"],"a":1,"e":"The right to life is inalienable and protects all persons."}],
 "Drug Abuse & Substance Use": [
   {"q":"One healthy way to resist peer pressure to use drugs is…","o":["isolation from everyone","joining positive clubs and hobbies","skipping school","copying friends"],"a":1,"e":"Positive activities and good friends protect against drug abuse."}],
 "Human Trafficking": [
   {"q":"Human trafficking involves the victim in…","o":["voluntary work","exploitation","self-employment","education"],"a":1,"e":"Victims are exploited: forced labour, prostitution or begging."}],
 "Anti-Corruption Agencies": [
   {"q":"Bribery is best described as…","o":["a gift freely given","giving money to influence official decisions","charity","tax"],"a":1,"e":"Bribery tries to buy favourable decisions."}],
 "Responsible Citizenship & Leadership": [
   {"q":"A citizen who reports corruption is practising…","o":["whistle-blowing","conspiracy","sedition","bias"],"a":0,"e":"Whistle-blowing exposes wrongdoing for the public good."}],
 "Partial Fractions": [
   {"q":"Partial fractions are used mainly to…","o":["simplify complex fractions","find roots only","solve triangles","expand brackets"],"a":0,"e":"They decompose a fraction into simpler parts for integration and algebra."}],
 "Islamic Law: Shariah & Ethics": [
   {"q":"The lawful and unlawful in Islamic law are called…","o":["halal and haram","sunni and shia","makkah and madinah","zakat and sawm"],"a":0,"e":"Halal is lawful; haram is forbidden."}],
 "Word Processing & Documents": [
   {"q":"Bullets and numbering are used in documents to…","o":["hide text","list items clearly","change paper size","delete words"],"a":1,"e":"Lists improve organisation and readability."}],
 "Spreadsheets & Charts": [
   {"q":"A pie chart is best used to show…","o":["a trend over time","parts of a whole","a comparison between two bars only","raw numbers only"],"a":1,"e":"Pie charts show proportions of a whole."}],
 "Database Design": [
   {"q":"A one-to-many relationship links…","o":["two tables","one table field to many records in another","two files","two queries only"],"a":1,"e":"One record in a table relates to many records in another."}],
 "Presentation & Multimedia": [
   {"q":"Transitions in a presentation are…","o":["the slide design","effects when changing slides","the font size","printed notes"],"a":1,"e":"Transitions animate the move from one slide to the next."}],
 "Internet & Web Technologies": [
   {"q":"The protocol of the World Wide Web is…","o":["FTP","HTTP","SMTP","POP"],"a":1,"e":"HTTP(s) carries web pages to browsers."}],
 "Data Security & Cyber Ethics": [
   {"q":"A program that locks your files and demands payment is…","o":["ransomware","firewall","cookie","antivirus"],"a":0,"e":"Ransomware encrypts files and demands a ransom."}],
 "Meal Planning & Menu Design": [
   {"q":"A shopping list is written from the…","o":["meal plan","food advertisement","leftovers","recipe only"],"a":0,"e":"The menu determines what to buy, within budget."}],
 "Methods of Cooking": [
   {"q":"Cooking in hot oil is called…","o":["boiling","frying","steaming","grilling"],"a":1,"e":"Frying cooks food in fat, shallow or deep."}],
 "Food Preservation": [
   {"q":"Food that has spoiled is usually…","o":["safer to eat","unsafe and must be discarded","fresher","cheaper"],"a":1,"e":"Spoiled food can cause food poisoning."}],
 "Kitchen Hygiene & Safety": [
   {"q":"Food should be stored at the correct temperature mainly to…","o":["improve taste","slow microbial growth","increase weight","save space"],"a":1,"e":"Cold storage slows the microbes that spoil food."}],
 "Nutritional Needs of the Family": [
   {"q":"Adolescents need extra of which nutrient for growth?","o":["salt","protein and iron","fat only","water only"],"a":1,"e":"Rapid growth demands protein, calcium and iron."}],
 "Food Service & Entertaining": [
   {"q":"In a formal setting, the napkin is placed…","o":["inside the glass","beside or on the plate","on the floor","under the chair"],"a":1,"e":"A folded napkin sits at the place setting."}],
 "Les Adjectifs & Pronoms Possessifs": [
   {"q":"Choisissez: C'est ____ stylo.","o":["mon","ma","mes","mienne"],"a":0,"e":"Stylo est masculin: mon stylo."}],
 "L'Interrogation & La Négation": [
   {"q":"Choisissez la forme correcte: ____ tu viens ?","o":["Est-ce que","Est-ce","Qu'est-ce","Que"],"a":0,"e":"Est-ce que tu viens ? est la question polie."}],
 "La Compréhension & L'Expression Écrite": [
   {"q":"Dans une lettre, la formule de politesse se place…","o":["au début","à la fin","au milieu","dans le titre"],"a":1,"e":"La formule de politesse clôt la lettre."}],
}

def main():
    # prepare the top-up question bank, then run the Node build runner
    import subprocess, textwrap
    json.dump(ADD, open('/tmp/add.json', 'w', encoding='utf-8'), ensure_ascii=False)
    r = subprocess.run(['node', 'quiz/_curr_build.js'], capture_output=True, text=True)
    print(r.stdout)
    if r.returncode != 0:
        print(r.stderr)
        raise SystemExit(r.returncode)

main()
