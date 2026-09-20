# -*- coding: utf-8 -*-
"""English Language: 100 questions per level via word banks + grammar/idiom params + fact forms."""
from engine import G, H, AN, pad_wrongs, mcq_opts

SUBJECT = "English Language"

FACTS = {
1: [
 ("noun", "a word that names a person, place, animal, thing or idea", "parts of speech"),
 ("verb", "a word that expresses an action or a state of being", "parts of speech"),
 ("adjective", "a word that describes or modifies a noun", "parts of speech"),
 ("adverb", "a word that modifies a verb, an adjective or another adverb", "parts of speech"),
 ("pronoun", "a word used in place of a noun", "parts of speech"),
 ("preposition", "a word that shows the relationship between a noun and other words", "parts of speech"),
 ("conjunction", "a word used to join words, phrases or clauses", "parts of speech"),
 ("article", "one of the words 'a', 'an' and 'the'", "parts of speech"),
 ("abstract noun", "the name of an idea, quality or state, such as honesty", "types of nouns"),
 ("collective noun", "the name of a group of people or things, such as a flock", "types of nouns"),
 ("common noun", "a general name for a person or thing, such as 'boy'", "types of nouns"),
 ("proper noun", "the name of a particular person, place or thing, such as 'Lagos'", "types of nouns"),
 ("singular", "the form of a word that refers to only one person or thing", "number and sentence"),
 ("plural", "the form of a word that refers to more than one person or thing", "number and sentence"),
 ("subject", "the person or thing about which something is said in a sentence", "number and sentence"),
 ("predicate", "the part of a sentence that says something about the subject", "number and sentence"),
 ("sentence", "a group of words that expresses a complete thought", "number and sentence"),
 ("paragraph", "a group of sentences written about one main idea", "number and sentence"),
 ("full stop", "the punctuation mark (.) used at the end of a statement", "punctuation"),
 ("comma", "the punctuation mark (,) used to separate items in a sentence", "punctuation"),
 ("question mark", "the punctuation mark (?) used at the end of a question", "punctuation"),
 ("capital letter", "the large form of a letter used at the beginning of a sentence", "punctuation"),
 ("synonym", "a word that has the same or nearly the same meaning as another word", "vocabulary"),
 ("antonym", "a word that is opposite in meaning to another word", "vocabulary"),
 ("homophone", "a word that sounds the same as another word but has a different meaning and spelling", "vocabulary"),
 ("proverb", "a short well-known saying that gives advice or expresses a general truth", "vocabulary"),
 ("idiom", "a group of words whose meaning is different from the meanings of the individual words", "vocabulary"),
 ("vowel", "a speech sound made with an open mouth, represented by the letters a, e, i, o and u", "sound system"),
 ("consonant", "a speech sound made by partly blocking the air, such as the sounds b, t and k", "sound system"),
 ("syllable", "a single unit of sound in a word, containing a vowel sound", "sound system"),
 ("comprehension", "the ability to understand what is read or heard", "reading and writing"),
 ("summary", "a short statement that gives the main points of a passage", "reading and writing"),
 ("spelling", "the correct way of writing words", "reading and writing"),
 ("figure of speech", "a word or expression used in a non-literal sense for effect", "reading and writing"),
],
2: [
 ("clause", "a group of words that contains a subject and a verb and forms part of a sentence", "clauses"),
 ("phrase", "a group of words that does not contain a complete subject and verb", "clauses"),
 ("main clause", "a clause that can stand alone as a complete sentence", "clauses"),
 ("subordinate clause", "a clause that cannot stand alone and depends on a main clause", "clauses"),
 ("tense", "the form of a verb that shows the time of the action", "verbs"),
 ("active voice", "the form of a verb in which the subject performs the action", "verbs"),
 ("passive voice", "the form of a verb in which the subject receives the action", "verbs"),
 ("auxiliary verb", "a helping verb used with a main verb, such as 'be', 'have' or 'will'", "verbs"),
 ("modal verb", "a verb that expresses ability, possibility or obligation, such as 'can' or 'must'", "verbs"),
 ("direct speech", "the exact words spoken by a person, usually in quotation marks", "reporting"),
 ("reported speech", "the words of a speaker reported by another person, without quotation marks", "reporting"),
 ("interjection", "a word that expresses sudden emotion, such as 'wow'", "grammar"),
 ("countable noun", "a noun that can be counted and has a plural form", "grammar"),
 ("uncountable noun", "a noun that cannot be counted and usually has no plural form", "grammar"),
 ("comparative", "the form of an adjective used to compare two things", "grammar"),
 ("superlative", "the form of an adjective used to compare three or more things", "grammar"),
 ("register", "the style of language suited to a particular situation", "style"),
 ("formal language", "the careful, standard language used in official and academic writing", "style"),
 ("informal language", "the relaxed language used in everyday conversation with friends", "style"),
 ("slang", "very informal words and expressions used by a particular group", "style"),
 ("jargon", "the special words used by people in a particular profession or trade", "style"),
 ("intonation", "the rise and fall of the voice in speech", "speech"),
 ("stress", "the extra force given to a particular syllable when speaking", "speech"),
 ("pronunciation", "the way in which a word or language is spoken", "speech"),
 ("accent", "the way a person pronounces words, from their region or background", "speech"),
 ("abbreviation", "a shortened form of a word or phrase", "word building"),
 ("acronym", "a word formed from the first letters of a group of words, such as 'NATO'", "word building"),
 ("skimming", "reading quickly to get the general idea of a passage", "reading skills"),
 ("scanning", "reading quickly to find a particular piece of information", "reading skills"),
 ("topic sentence", "the sentence that states the main idea of a paragraph", "reading skills"),
],
3: [
 ("affix", "a letter or group of letters added to the beginning or end of a word", "word formation"),
 ("prefix", "a letter group added to the beginning of a word to change its meaning", "word formation"),
 ("suffix", "a letter group added to the end of a word to change its meaning", "word formation"),
 ("root", "the base part of a word to which prefixes and suffixes are added", "word formation"),
 ("derivation", "the formation of new words by adding affixes to a root word", "word formation"),
 ("compounding", "the formation of a new word by joining two existing words", "word formation"),
 ("lexis", "the vocabulary of a language", "semantics"),
 ("semantics", "the study of the meanings of words and sentences", "semantics"),
 ("polysemy", "the quality of a single word having several related meanings", "semantics"),
 ("ambiguity", "the quality of having more than one possible meaning", "semantics"),
 ("denotation", "the exact, dictionary meaning of a word", "semantics"),
 ("connotation", "the associated or emotional meaning of a word", "semantics"),
 ("concord", "the agreement between the subject and the verb in a sentence", "syntax"),
 ("syntax", "the arrangement of words to form grammatical sentences", "syntax"),
 ("ellipsis", "the omission of words that can be understood from the context", "syntax"),
 ("inversion", "the reversing of the normal order of the subject and the verb", "syntax"),
 ("parallelism", "the use of similar grammatical structures to give balance", "syntax"),
 ("phonetics", "the study of the sounds of speech", "sound system"),
 ("phonology", "the study of the sound system of a language", "sound system"),
 ("diction", "the choice of words used by a writer or speaker", "style"),
 ("tone", "the attitude of a writer or speaker towards the subject", "style"),
 ("style", "the distinctive way in which a writer uses language", "style"),
 ("eponym", "a word formed from the name of a person, such as 'sandwich'", "word building"),
 ("neologism", "a newly invented word or expression", "word building"),
 ("collocation", "the habitual combination of words, such as 'make a decision'", "word building"),
 ("inference", "a conclusion drawn from evidence in a text", "reading skills"),
 ("prediction", "the act of saying what will happen next in a text", "reading skills"),
 ("context clues", "the words around an unfamiliar word that help to explain it", "reading skills"),
 ("official language", "the language in which a country conducts its government business", "language"),
 ("punctuation", "the marks used in writing to organise sentences and convey meaning", "language"),
],
}

# (word, synonym, antonym)
WORDS = {
1: [("abundant","plentiful","scarce"),("commence","begin","end"),("rapid","fast","slow"),
    ("feeble","weak","strong"),("vacant","empty","occupied"),("conceal","hide","reveal"),
    ("assist","help","hinder"),("enormous","huge","tiny"),("diligent","hardworking","lazy"),
    ("peculiar","strange","ordinary"),("mend","repair","destroy"),("courteous","polite","rude"),
    ("fragrant","sweet-smelling","stinking"),("tardy","late","punctual"),("brave","courageous","cowardly"),
    ("weary","tired","energetic")],
2: [("benevolent","kind","cruel"),("transparent","clear","opaque"),("obsolete","outdated","modern"),
    ("lucid","clear","confusing"),("arrogant","proud","humble"),("candid","frank","secretive"),
    ("diligent","industrious","idle"),("plausible","believable","unlikely"),("strenuous","demanding","easy"),
    ("prosperous","wealthy","poor"),("cautious","careful","careless"),("fictitious","imaginary","real"),
    ("diminish","reduce","increase"),("concur","agree","disagree"),("prudent","wise","foolish"),
    ("exemplary","model","bad")],
3: [("laconic","brief","verbose"),("pragmatic","practical","idealistic"),("sagacious","wise","foolish"),
    ("venerable","respected","disgraced"),("taciturn","reserved","talkative"),("ubiquitous","omnipresent","rare"),
    ("cursory","hasty","thorough"),("garrulous","talkative","quiet"),("benign","harmless","harmful"),
    ("spurious","fake","genuine"),("tenacious","persistent","wavering"),("saunter","walk slowly","run"),
    ("zealous","enthusiastic","indifferent"),("meticulous","careful","careless"),("obdurate","stubborn","yielding"),
    ("pulchritudinous","beautiful","ugly")],
}

# (correct spelling, common incorrect)
SPELL = {
1: [("accommodation","accomodation"),("necessary","neccesary"),("embarrass","embarass"),
    ("committee","comittee"),("occurrence","occurence"),("separate","seperate"),
    ("restaurant","restarant"),("privilege","priviledge"),("independent","independant"),
    ("business","buisness"),("environment","enviroment"),("advertisement","advertisment")],
2: [("temperature","temprature"),("conscience","conscence"),("questionnaire","questionaire"),
    ("maintenance","maintainance"),("pronunciation","pronounciation"),("liaison","liason"),
    ("millennium","millenium"),("perseverance","perseverence"),("recommend","reccomend"),
    ("definitely","definately"),("government","goverment"),("exaggerate","exagerate")],
3: [("accommodation","acommodation"),("asymmetry","assymetry"),("embarrassment","embarrasment"),
    ("correspondence","correspondance"),("surveillance","surveilance"),("conscientious","consciencious"),
    ("parliamentary","parlimentary"),("annihilate","anihilate"),("miscellaneous","miscelanious"),
    ("acupuncture","acupunture"),("bureaucracy","beauracracy"),("psychology","sycology")],
}

# (sentence with ____, correct, [wrongs], explanation)
GAPFILL = {
1: [("She has been living in Enugu ___ 2015.","since",["for","from","at"],"'Since' is used with a point in time; 'for' with a period."),
    ("The children ___ playing outside now.","are",["is","was","has"],"The subject 'children' is plural, so 'are' agrees."),
    ("I have ___ finished my homework.","just",["yet","already just","ever"],"'Just' means a short time ago and is placed between have and the verb."),
    ("He does not ___ his parents.","obey",["obeys","obeyed","obeying"],"After 'does not', use the base form of the verb."),
    ("___ of the two girls is your sister?","Which",["Who","Whom","What"],"'Which' is used when choosing from a limited number."),
    ("She is ___ honest girl.","an",["a","the","some"],"'Honest' begins with a vowel sound, so 'an' is used."),
    ("Bola and Tolu ___ my friends.","are",["is","was","has"],"A compound subject joined by 'and' takes a plural verb."),
    ("We arrived ___ the station before the train left.","at",["in","on","to"],"We say 'arrive at' a place such as a station."),
    ("The soup tastes ___ .","nice",["nicely","more nice","nicest"],"After a linking verb such as 'tastes', use an adjective."),
    ("___ you like some tea?","Would",["Do","Are","Did"],"'Would you like' is the polite way to offer something.")],
2: [("Neither John nor Peter ___ present at the assembly.","was",["were","are","have been"],"With 'neither...nor', the verb agrees with the nearer subject (Peter), which is singular."),
    ("The committee ___ divided in their opinion.","were",["was","is","has"],"When members act individually, the collective noun takes a plural verb."),
    ("If I ___ you, I would apologise at once.","were",["am","was","be"],"Unreal conditional sentences use 'were' for all persons."),
    ("By next June, she ___ in Lagos for ten years.","will have lived",["will live","has lived","lived"],"The future perfect tense describes an action completed before a future time."),
    ("The CEO, together with his aides, ___ arriving tomorrow.","is",["are","were","have been"],"The subject is 'the CEO'; phrases in between do not change the number."),
    ("Each of the students ___ a textbook.","has",["have","are having","had had"],"'Each' is singular and takes a singular verb."),
    ("___ you were, the car would be here.","Had",["Were","If","Should"],"This is an inverted conditional: 'Had you been there'."),
    ("It was Ada ___ found the lost purse.","who",["whom","which","whose"],"Use 'who' for the subject of the relative clause referring to a person."),
    ("The principal, as well as the teachers, ___ at the meeting.","was",["were","are","have been"],"Intervening phrases do not affect the number of the subject."),
    ("I would rather you ___ quiet.","kept",["keep","keeps","will keep"],"After 'would rather' + different subject, use the past tense.")],
3: [("Had I known, I ___ earlier.","would have come",["would come","will come","came"],"This past unreal conditional takes 'would have' + past participle."),
    ("The man, together with his sons, ___ arrested.","was",["were","have been","are"],"The subject is singular ('the man'), so 'was' is correct."),
    ("___ the end of the month, the project will have been completed.","By",["At","In","On"],"'By' a future time is used with the future perfect tense."),
    ("I would sooner lose than ___ .","cheat",["cheats","cheated","cheating"],"Parallel structure after 'would sooner' requires the base form."),
    ("Neither the student nor his parents ___ informed.","were",["was","has","is"],"With 'neither...nor', the verb agrees with the nearer subject, which is plural."),
    ("It is high time we ___ our ways.","changed",["change","changes","will change"],"After 'it is high time', the past subjunctive is used."),
    ("The news ___ disturbing.","is",["are","were","have been"],"'News' is singular even though it ends in 's'."),
    ("Scarcely had he arrived ___ the phone rang.","when",["than","that","then"],"The correct correlative with 'scarcely' is 'when'."),
    ("She is one of the students who ___ hard.","work",["works","worked","is working"],"The relative pronoun 'who' refers to the plural 'students'."),
    ("The bill, together with the receipts, ___ on the table.","was",["were","are","have been"],"The subject is singular; the intervening phrase is ignored.")],
}

# (idiom, meaning)
IDIOMS = {
2: [("to let the cat out of the bag","to reveal a secret"),
    ("to burn the midnight oil","to work or study late into the night"),
    ("to put the cart before the horse","to do things in the wrong order"),
    ("a piece of cake","something very easy to do"),
    ("to beat about the bush","to avoid coming to the point"),
    ("to turn a deaf ear","to refuse to listen"),
    ("once in a blue moon","very rarely"),
    ("to add insult to injury","to make a bad situation worse"),
    ("to have cold feet","to become nervous about doing something"),
    ("to cry over spilt milk","to complain about something that cannot be changed")],
3: [("to throw in the towel","to admit defeat"),
    ("to strike while the iron is hot","to act at the right moment"),
    ("to bell the cat","to take a risky action for the good of a group"),
    ("to bury the hatchet","to make peace"),
    ("to spill the beans","to give away a secret"),
    ("to be in hot water","to be in trouble"),
    ("to turn over a new leaf","to begin a better way of life"),
    ("to bite the bullet","to face a difficult situation bravely"),
    ("to sail through","to pass easily"),
    ("a red herring","a misleading clue")],
}

def syn_q(g):
    w, syn, ant = g.choice(WORDS[g.lvl])
    wrongs = pad_wrongs(g.rng, [ant, w + "ness", "quiet", "bold"], syn)
    o, ai = mcq_opts(g.rng, wrongs, syn)
    return g.build(f"Choose the word nearest in meaning to the underlined word: The man made an <u>{w}</u> decision.",
                   o, ai, f"'{w}' means '{syn}', the opposite of '{ant}'.")

def ant_q(g):
    w, syn, ant = g.choice(WORDS[g.lvl])
    wrongs = pad_wrongs(g.rng, [syn, "gentle", "massive", "bright"], ant)
    o, ai = mcq_opts(g.rng, wrongs, ant)
    return g.build(f"Choose the word opposite in meaning to the underlined word: The teacher described his work as <u>{w}</u>.",
                   o, ai, f"The opposite of '{w}' is '{ant}'.")

def spell_q(g):
    right, wrong = g.choice(SPELL[g.lvl])
    wrongs = pad_wrongs(g.rng, [wrong, wrong + "e", wrong[:-1] + "a", right[::-1]], right)
    o, ai = mcq_opts(g.rng, wrongs, right)
    return g.build(f"Choose the correctly spelt word from the options for the word ‘{wrong}’.", o, ai,
                   f"'{right}' is the correct spelling.")

def gap_q(g):
    sent, corr, wrongs, why = g.choice(GAPFILL[g.lvl])
    o, ai = mcq_opts(g.rng, list(wrongs), corr)
    return g.build(f"Fill the gap: {sent}", o, ai, why)

def idiom_q(g):
    idiom, meaning = g.choice(IDIOMS.get(g.lvl, []))
    if not idiom: return None
    wrongs = pad_wrongs(g.rng, ["to work very hard", "to prepare for a journey", "to be very angry", "to win easily"], meaning)
    o, ai = mcq_opts(g.rng, wrongs, meaning)
    return g.build(f"The idiom '{idiom}' means:", o, ai, f"'{idiom}' means {meaning}.")

FUNCS = {
1: [syn_q, ant_q, spell_q, gap_q],
2: [syn_q, ant_q, spell_q, gap_q, idiom_q],
3: [syn_q, ant_q, spell_q, gap_q, idiom_q],
}
FACT_TARGET = {1: 52, 2: 60, 3: 66}

def generate(level, seed=1, target=100, blocked=None):
    g = G(SUBJECT, seed, blocked)
    g.lvl = level
    g.fill_facts(FACTS[level], FACT_TARGET[level], use_cap=4)
    g.fill_params(FUNCS[level], target)
    g.shuffle_qs()
    return g.qs
