# -*- coding: utf-8 -*-
"""NERDC-aligned PRIMARY curriculum map (schemes of work) for the Lesson Notes
library. PRIM = { subjects:[ {name, icon, cls:{ "B1":[t1,t2,t3], ... }} ] }
where each term is a list of week topics (week 10 = revision/test).
Full 8-part lesson notes are seeded for Basic 1 Mathematics (see n_b1m_*.py);
schemes cover Basic 1 across all subjects + Basic 4 samples, and the library
grows class by class from here."""

PRIM = {
 "classes": ["B1", "B2", "B3", "B4", "B5", "B6"],
 "classNames": {"B1": "Basic 1", "B2": "Basic 2", "B3": "Basic 3",
                "B4": "Basic 4", "B5": "Basic 5", "B6": "Basic 6"},
 "subjects": [
  {"name": "Mathematics", "icon": "🔢", "cls": {
    "B1": [
      ["Whole numbers 1\u20135", "Whole numbers 6\u201310", "Ordering & comparing numbers 1\u201310", "Addition 1\u201310", "Addition: number line", "Subtraction 1\u201310", "Addition & subtraction together", "Fractions: half of a whole", "Ordinal numbers 1st\u201310th", "Revision & term test"],
      ["Whole numbers 11\u201320", "Addition 11\u201320", "Subtraction 11\u201320", "Money: coins & notes", "Money: shopping & change", "Length: long, short, tall", "Capacity: full, empty, more", "Weight: heavy & light", "Time: days & months", "Revision & term test"],
      ["Whole numbers 1\u201350", "Counting in 2s, 5s, 10s", "Addition & subtraction of money", "Multiplication as repeated addition", "Fractions: halves & quarters", "Length: paces and cubes", "Data: sorting & tables", "Shapes & patterns", "Review and word problems (one-step)", "Revision & term test"]],
    "B4": [
      ["Whole numbers & place value (1,000s)", "Addition & subtraction of large numbers", "Multiplication by 2- and 3-digit numbers", "Division with remainders", "Common fractions & equivalent fractions", "Decimals: tenths and hundredths", "Money: shopping, bills and change", "Length, perimeter and area", "Time, calendar and dates", "Revision & term test"],
      ["Numbers and numeration (millions)", "Ratio and proportion", "Simple percentages", "Lines, angles and shapes", "Symmetry and reflection", "Data: pictograms and bar charts", "Weight and capacity", "Open sentences and simple equations", "Everyday word problems", "Revision & term test"],
      ["Revision of whole numbers", "Fractions: add & subtract like denominators", "Decimals: addition and subtraction", "Multiplication and division review", "Plane shapes: triangles, quadrilaterals", "Volume of cubes and cuboids", "Money: profit and loss (simple)", "Statistics: mode and range", "Problem-solving workshop", "Revision & term test"]]}},
  {"name": "English Studies", "icon": "📖", "cls": {
    "B1": [
      ["Phonemic awareness: sounds of letters a\u2013m", "Letter sounds n\u2013z and blends", "Reading simple words and phrases", "Listening: following simple instructions", "Speaking: introducing oneself", "Writing: capital and small letters", "Writing: three-letter words", "Comprehension: short stories", "Rhymes and songs", "Revision & term test"],
      ["Vowel sounds and word families", "Reading: short sentences", "Grammar: nouns (naming words)", "Grammar: verbs (action words)", "Punctuation: full stop and capital letter", "Composition: my family", "Listening comprehension", "Spelling and dictation", "Oral English: polite expressions", "Revision & term test"],
      ["Consonant blends and digraphs", "Reading aloud: fluency", "Grammar: adjectives (describing words)", "Singular and plural", "Comprehension: riddles and poems", "Composition: the market", "Punctuation: question mark", "Spelling and dictation", "Storytelling and drama", "Revision & term test"]]}},
  {"name": "Basic Science & Technology", "icon": "🔬", "cls": {
    "B1": [
      ["My body: parts of the body", "The senses: seeing, hearing, touching", "Living and non-living things", "Plants around us", "Animals around us", "Water: uses of water", "Air: what is air?", "Colour and shapes", "Simple machines: tools at home", "Revision & term test"],
      ["The weather: sunny, rainy, windy", "Safety at home and school", "Health: keeping clean", "Food and water safety", "The five senses and how we use them", "Soil: sand, clay and loam", "Plants we eat", "Animals that live in water", "Energy: light and heat", "Revision & term test"],
      ["The environment: caring for it", "Materials: hard and soft objects", "Technology: simple machines and tools", "Magnets: things a magnet attracts", "Sound: loud and soft sounds", "Growing plants: from seed to plant", "Computer: parts of the computer", "Computer: how we use it", "Project: my science corner", "Revision & term test"]],
    "B4": [
      ["Living things: classification", "The human body: major organs", "The skeleton and muscles", "Health: diseases and prevention", "Plants: photosynthesis (simple)", "Soil: formation and composition", "Water: sources and purification", "Air: composition and uses", "Energy: forms of energy", "Revision & term test"],
      ["Matter: solid, liquid and gas", "Changes in matter", "Heat and temperature", "Light: reflection and shadows", "Sound: production and transmission", "Electricity: simple circuits", "Magnetism", "Weather instruments", "The earth and the solar system (intro)", "Revision & term test"],
      ["Technology: tools and gadgets", "Computer: input and output devices", "Computer: the keyboard", "Computer: safe use and care", "Measurement: length, mass, time", "Force and simple machines", "Erosion and conservation", "The primary science fair project", "Environmental sanitation", "Revision & term test"]]}},
  {"name": "Social Studies", "icon": "🌍", "cls": {
    "B1": [
      ["Who am I? My name and family", "My home and my school", "People in my school", "My village/town: places we visit", "The family: members and roles", "Greetings and culture", "Our weather and seasons", "Safety in the home", "My country: Nigeria", "Revision & term test"],
      ["The community: who lives with us", "Work people do", "Markets and trading", "Road safety", "Transport: ways of moving", "Communication: talking and writing", "Public places", "Respect for elders", "Festivals and celebrations", "Revision & term test"],
      ["The school as a community", "Rules and why we need them", "Children's rights: going to school", "Needs and wants", "Money and shopping", "Caring for public property", "Our environment: keeping it clean", "Natural features: rivers, hills", "The flag and national symbols", "Revision & term test"]]}},
  {"name": "Civic Education", "icon": "🏛️", "cls": {
    "B1": [
      ["What is civic education?", "Myself: features and qualities", "My family roles", "My school and its rules", "Greeting and politeness", "Honesty at home and school", "Sharing and caring", "Respecting elders and teachers", "The Nigerian flag", "Revision & term test"],
      ["Values: good and bad behaviour", "Obedience and self-control", "Cleanliness and health", "Care of property", "Cooperation with others", "The community and its leaders", "Patriotism: loving my country", "The national anthem", "Citizens: who is a citizen?", "Revision & term test"],
      ["Rules and regulations", "Rights of the child", "Duties at home and school", "Good citizenship: examples", "The family as the first school", "The neighbourhood", "Festivals and national identity", "Heroes and heroines of Nigeria", "Revision & term test", "Revision & term test"]]}},
  {"name": "Christian Religious Studies", "icon": "✝️", "cls": {
    "B1": [
      ["God as our Creator", "God's creation: the world", "Adam and Eve in the garden", "Noah and the flood", "Abraham: the friend of God", "Joseph and his brothers", "Moses: baby in the basket", "David and Goliath", "Jesus: the birth of Jesus", "Revision & term test"],
      ["Jesus in the temple", "The baptism of Jesus", "Jesus chooses his disciples", "Jesus teaches: the Beatitudes", "Jesus feeds five thousand", "Jesus heals the sick", "The parable of the lost sheep", "Zacchaeus the tax collector", "The entry into Jerusalem", "Revision & term test"],
      ["The Last Supper", "The crucifixion of Jesus", "The resurrection of Jesus", "The ascension", "The coming of the Holy Spirit", "Peter and John heal a lame man", "Paul: the journey to Damascus", "The early church", "God's love for us", "Revision & term test"]]}},
  {"name": "Agricultural Science", "icon": "🌱", "cls": {
    "B1": [
      ["What is agriculture?", "Farmers: people who produce food", "The farm and its parts", "Plants we grow at home", "Animals we rear at home", "The school garden", "Tools used in the garden", "Caring for plants: watering", "Food we get from plants", "Revision & term test"],
      ["Caring for animals", "Feeding our animals", "The importance of animals", "Vegetables we can grow", "Planting seeds", "Weeding the garden", "The uses of the soil", "Fertilizer: manure for plants", "Pests and how to keep them away", "Revision & term test"],
      ["Growing maize", "Growing vegetables in containers", "Harvesting our crops", "Storing food at home", "The importance of agriculture", "Farm animals: birds", "Farm animals: goats and sheep", "Marketing our farm produce", "The young farmer's project", "Revision & term test"]]}},
  {"name": "Home Economics", "icon": "🏠", "cls": {
    "B1": [
      ["The home: rooms in the house", "Care of the home: sweeping and dusting", "Personal hygiene: bathing and care", "Care of the teeth", "Care of the hands and nails", "The family and its meals", "Foods we eat: fruits and vegetables", "Simple table manners", "Washing the hands before meals", "Revision & term test"],
      ["Care of clothes", "Dressing neatly", "The kitchen: what belongs there", "Simple kitchen tools", "Care of kitchen tools", "Cleaning the dining area", "Making a simple drink", "Preparing simple snacks with an adult", "Waste disposal at home", "Revision & term test"],
      ["The family budget: saving", "The food we like and why", "Eating the right food", "Care of the bathroom", "Arranging the bedroom", "Care of the sitting room", "Simple first aid: cuts and scrapes", "Greeting and hospitality", "The homemaker's day", "Revision & term test"]]}},
  {"name": "Cultural & Creative Arts", "icon": "🎨", "cls": {
    "B1": [
      ["What is art and craft?", "Drawing: lines and shapes", "Colouring: primary colours", "Paper craft: folding and cutting", "Modelling with clay or dough", "Music: making sounds", "Rhythm and clapping", "Singing in groups", "Movement and dance", "Revision & term test"],
      ["Printing with everyday objects", "Patterns and design", "Making a simple toy", "The Nigerian culture: food and dress", "Festivals and colours", "Songs of the community", "Instrument making: home-made shakers", "Simple acting: role play", "Display of our work", "Revision & term test"],
      ["Drawing from nature", "Weaving with paper strips", "Theatre: stories in play", "Music: high and low sounds", "Dance: movements and steps", "Cultural dressing: our heritage", "Designing a greeting card", "The art exhibition", "Creative play and imagination", "Revision & term test"]]}},
  {"name": "Computer Studies (ICT)", "icon": "💻", "cls": {
    "B1": [
      ["What is a computer?", "Parts of the computer: monitor, keyboard, mouse", "Turning the computer on and off", "The mouse: moving and clicking", "The keyboard: letters and numbers", "The computer room: rules", "Technology in my home", "Where we see computers", "Caring for the computer", "Revision & term test"],
      ["Using words on the computer (intro)", "Typing our names", "Games that teach: matching and sorting", "Drawing on the computer (paint, intro)", "Colouring pictures", "Saving our work", "The computer: a tool for learning", "What the computer cannot do", "Safe use: asking an adult", "Revision & term test"],
      ["The computer and the community", "Computers in the bank, school and market", "The keyboard: space bar and letters", "The mouse: drag and drop", "Listening with the computer: sounds", "Watching and learning with videos", "Storing our work", "Clean and careful habits", "My computer week: revision", "Revision & term test"]]}},
  {"name": "Physical & Health Education", "icon": "🏃", "cls": {
    "B1": [
      ["What is physical education?", "Locomotor movements: walking, running, jumping", "Non-locomotor movements: bending, stretching", "Games: circle games", "Body awareness and balance", "Motor skills: throwing and catching", "Rhythmic movement", "Simple relay games", "Safety in the playground", "Revision & term test"],
      ["Personal hygiene and health", "Care of the body: bathing and dressing", "Rest and sleep: why we need them", "Food and health: eating well", "Cleanliness of the environment", "Common sicknesses and prevention", "The health centre: our helpers", "Warm-up and cool-down", "Loose and lively games", "Revision & term test"],
      ["Running and skipping", "Jumping and leaping", "Ball games: kicking and dribbling", "Striking and catching", "Obstacle course", "Team work in games", "Sportsmanship: winning and losing", "The school sports day", "The healthy me: revision", "Revision & term test"]]}},
  {"name": "Verbal Reasoning", "icon": "🧠", "cls": {
    "B1": [
      ["Listening and following directions", "Pictures and words: matching", "Rhyming words", "Beginning and ending sounds", "Word families: -at, -an, -og", "Opposites: big/small, hot/cold", "Odd one out (pictures)", "Classifying words: things we eat", "Series: letters a, b, c…", "Revision & term test"],
      ["Missing letters in words", "Same beginning sounds", "Words that go together", "Simple analogies (picture-based)", "Sentence sense: right or wrong", "Arranging words in order", "Completing simple sentences", "Sound-alike words", "Vocabulary building", "Revision & term test"],
      ["Letter sequences and patterns", "Word building: making new words", "Synonyms: words with the same meaning", "More opposites", "Categorisation: animals, food, clothes", "Riddles and puzzles", "Comprehension of short instructions", "Alphabetical order: first letters", "Mixed revision and games", "Revision & term test"]]}},
  {"name": "Quantitative Reasoning", "icon": "🧮", "cls": {
    "B1": [
      ["Counting and matching sets", "Number recognition 1\u201310", "Comparing sets: more or less", "Number lines 1\u201310", "Patterns: shapes and colours", "Simple addition in pictures", "Simple subtraction in pictures", "Odd and even: sharing pairs", "Number words 1\u201310", "Revision & term test"],
      ["Counting 11\u201320", "Sequences: what comes next", "Addition puzzles up to 20", "Subtraction puzzles up to 20", "Money: matching prices", "Sorting by size and shape", "Ordering numbers", "Number bonds of 10", "Simple logic: true or false", "Revision & term test"],
      ["Counting to 50 (activities)", "Skip counting patterns", "Picture problems with 2 steps", "Shapes and their count", "Fair sharing", "Comparing measures", "Simple codes and symbols", "Time: ordering the day", "Puzzle games and challenges", "Revision & term test"]]}},
 ]
}
