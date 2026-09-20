/* v10.0 — THE TEACHING SUITE (edu.js)
   A deferred feature module for MAMSS Prep.
   It adds the tools a Nigerian SS1–SS3 teacher and every Senior Secondary
   candidate actually use in class:
     📚 Lesson Notes    — term-organized, objectives + content + key points +
                          worked examples + class evaluation, per SS1/SS2/SS3
     💻 CBT Centre      — a real computer-based test (instructions, candidate
                          form, answer sheet, timer, submit, review + result slip)
     🗓 Scheme of Work  — 1st/2nd/3rd term weekly topic outline, all 13 subjects
     🧭 Syllabus Map    — the 13-subject SS1–SS3 syllabus, class by class
     🏅 Marking Guide   — WAEC/NECO grade scale + quick marking tips

   Everything runs on the device and reuses the app's own question bank, so it
   can never drift from the syllabus content that is already verified in bank.js.
*/
(function () {
  "use strict";

/* v11.0 — EXTENDED CURRICULUM SUBJECTS
   Six more Nigerian SS1–SS3 subjects, delivered through the existing Teaching
   Suite lesson-note engine (topics -> keywords -> key facts -> questions).
   Each topic: [name, keywords[], keyFactsString, questions[{q,o,a,e}]].
   Questions are authored against the WAEC/NECO syllabus; the suite renders
   the first two as worked examples and the rest as class evaluation. */
var EXTRA_SUBJECTS = {
  "Further Mathematics": {
    why: "The SS1–SS3 Further Mathematics syllabus extends core mathematics into the rigorous ideas examined for Further Maths WAEC/NECO elective papers: sets and logic, vectors, matrices, binomial expansion, calculus and complex numbers.",
    topics: [
      ["Sets & Logic", ["set", "union", "intersection", "complement", "truth", "proposition", "venn", "subset"],
        "A set is a well-defined collection of objects. A ∪ B collects elements in A or B; A ∩ B keeps elements in both; A′ holds elements outside A. n(A ∪ B) = n(A) + n(B) − n(A ∩ B). A logical statement has a truth value true or false, and implications p ⇒ q are false only when p is true and q is false.",
        [
          { q: "If n(A) = 20, n(B) = 24 and n(A ∩ B) = 9, find n(A ∪ B).", o: ["35", "44", "53", "29"], a: 0, e: "Using n(A ∪ B) = 20 + 24 − 9 = 35 by the inclusion–exclusion rule." },
          { q: "Which of the following is always true for sets A and B?", o: ["A ∩ B ⊆ A ∪ B", "A ∪ B ⊆ A ∩ B", "A ⊆ A ∩ B", "A ∩ B = A ∪ B"], a: 0, e: "Every element of A ∩ B belongs to A and to B, so it belongs to A ∪ B. The intersection is always a subset of the union." },
          { q: "The statement 'If it rains, the ground is wet' is false when:", o: ["it rains and the ground is wet", "it rains and the ground is not wet", "it does not rain and the ground is wet", "it does not rain and the ground is dry"], a: 1, e: "An implication p ⇒ q is false only when p is true and q is false." }
        ]],
      ["Vectors & Matrices", ["vector", "magnitude", "matrix", "determinant", "scalar", "dot product", "inverse", "transpose"],
        "A vector has magnitude and direction; |v| = √(x² + y²). The dot product a·b = |a||b|cosθ gives the angle between vectors. A 2×2 matrix [[a,b],[c,d]] has determinant ad − bc and inverse (1/det)[[d,−b],[−c,a]]. Matrices add and subtract element-wise; they multiply row-by-column.",
        [
          { q: "Given a = (3, 4), find |a|.", o: ["5", "7", "25", "3.5"], a: 0, e: "|a| = √(3² + 4²) = √25 = 5." },
          { q: "The determinant of the matrix [[2,3],[4,5]] is:", o: ["−2", "2", "22", "10"], a: 0, e: "det = (2 × 5) − (3 × 4) = 10 − 12 = −2." },
          { q: "If a·b = 0 for non-zero vectors a and b, then the vectors are:", o: ["parallel", "perpendicular", "equal in length", "opposite"], a: 1, e: "a·b = |a||b|cosθ = 0 gives cosθ = 0 so θ = 90°, i.e. perpendicular." }
        ]],
      ["Binomial Expansion", ["binomial", "expansion", "coefficient", "power", "pascal", "term", "ncr"],
        "The binomial theorem expands (a + b)ⁿ = Σ C(n,r) aⁿ⁻ʳ bʳ. Pascal's triangle gives the coefficients: 1, 1; 1, 2, 1; 1, 3, 3, 1; 1, 4, 6, 4, 1. The general term is T(r+1) = C(n,r) aⁿ⁻ʳ bʳ. n! / (r!(n − r)!) counts the number of ways of choosing r items from n.",
        [
          { q: "The coefficient of x² in the expansion of (1 + x)⁴ is:", o: ["4", "6", "8", "12"], a: 1, e: "C(4,2) = 4!/(2!2!) = 6." },
          { q: "How many terms are in the full expansion of (x + y)⁶?", o: ["6", "7", "8", "12"], a: 1, e: "(a + b)ⁿ has n + 1 terms, so 6 + 1 = 7 terms." },
          { q: "In the expansion of (2 + x)³ the constant term is:", o: ["8", "4", "2", "1"], a: 0, e: "The term with no x is 2³ = 8." }
        ]],
      ["Differentiation", ["derivative", "gradient", "tangent", "stationary", "maximum", "minimum", "limit", "rate"],
        "The derivative dy/dx measures the rate of change and gives the gradient of the tangent. Power rule: d/dx(xⁿ) = nxⁿ⁻¹. Sum and constant rules let you differentiate term by term. At stationary points dy/dx = 0; a negative second derivative indicates a maximum, a positive one a minimum.",
        [
          { q: "If y = 3x² + 2x, find dy/dx.", o: ["6x + 2", "3x + 2", "6x² + 2", "3x²"], a: 0, e: "Power rule: 3 × 2x = 6x, and 2x differentiates to 2." },
          { q: "The gradient of y = x² at x = 3 is:", o: ["6", "9", "3", "12"], a: 0, e: "dy/dx = 2x, so at x = 3 the gradient is 6." },
          { q: "At a stationary point where d²y/dx² > 0, the curve has a:", o: ["minimum", "maximum", "point of inflection", "vertical asymptote"], a: 0, e: "A positive second derivative means the gradient is increasing, so the point is a local minimum." }
        ]],
      ["Integration", ["integral", "area", "antiderivative", "definite", "constant", "under the curve", "power rule"],
        "Integration reverses differentiation: ∫xⁿ dx = xⁿ⁺¹/(n+1) + C. A definite integral between limits a and b gives the signed area between the curve and the x-axis. The + C (constant of integration) is needed for indefinite integrals. Areas below the x-axis come out negative.",
        [
          { q: "Evaluate ∫₁³ 2x dx.", o: ["8", "4", "6", "16"], a: 0, e: "∫2x dx = x², so [x²]₁³ = 9 − 1 = 8." },
          { q: "∫ dx/x² equals:", o: ["−1/x + C", "1/x + C", "−x⁻³/3 + C", "ln x² + C"], a: 0, e: "∫x⁻² dx = x⁻¹/(−1) + C = −1/x + C." },
          { q: "The constant of integration C is required because:", o: ["differentiation removes constants", "the function is discontinuous", "integrals always diverge", "the limits are negative"], a: 0, e: "Any constant has derivative zero, so the antiderivative is only determined up to an added constant." }
        ]],
      ["Complex Numbers", ["complex", "imaginary", "i ", "conjugate", "modulus", "argand", "real part"],
        "A complex number z = x + iy has real part x and imaginary part y, with i² = −1. The conjugate z̄ = x − iy; z·z̄ = x² + y² = |z|². On the Argand diagram z is the point (x, y); its modulus is the distance from the origin. Addition and multiplication follow normal algebra rules using i² = −1.",
        [
          { q: "Simplify (2 + 3i) + (4 − i).", o: ["6 + 2i", "6 + 4i", "8 + 2i", "6 − 2i"], a: 0, e: "Add real parts: 2 + 4 = 6; add imaginary parts: 3i − i = 2i." },
          { q: "If z = 3 + 4i, then |z| =", o: ["5", "7", "25", "√7"], a: 0, e: "|z| = √(3² + 4²) = √25 = 5." },
          { q: "The conjugate of 5 − 2i is:", o: ["5 + 2i", "−5 + 2i", "−5 − 2i", "2 − 5i"], a: 0, e: "The conjugate negates the imaginary part only: 5 + 2i." }
        ]]
    ]
  },
  "Christian Religious Studies": {
    why: "The CRS syllabus (WAEC/NECO) moves from the early stories of Genesis through the patriarchs, the law of Moses and the prophets to the life, teaching, death and resurrection of Jesus and the growth of the early church.",
    topics: [
      ["Creation & The Fall", ["creation", "genesis", "adam", "eve", "serpent", "garden", "forbidden", "image of god"],
        "Genesis 1–3 teaches that God created the heavens and the earth in an ordered sequence and made humankind in His image. Adam and Eve lived in the Garden of Eden in fellowship with God. The serpent tempted them to eat the forbidden fruit, bringing sin, shame and separation from God.",
        [
          { q: "According to Genesis, what did God create on the fourth day?", o: ["Sun, moon and stars", "Birds and fish", "Land animals", "The sea"], a: 0, e: "Day four: God made lights in the sky — the sun, moon and stars — 'for signs and for seasons'." },
          { q: "Why did God forbid Adam and Eve from the tree of knowledge of good and evil?", o: ["To test their obedience", "Because the fruit was poisonous", "Because it gave immortality", "To punish the serpent"], a: 0, e: "The command tested their love and obedience; eating it was disobedience, not a natural need." },
          { q: "The immediate consequence of Adam and Eve's disobedience was:", o: ["they hid from God", "they gained wisdom", "they became immortal", "the garden was enlarged"], a: 0, e: "Their eyes were opened and they hid from God — shame and broken fellowship replaced closeness." }
        ]],
      ["Abraham: Call & Covenant", ["abraham", "covenant", "faith", "promise", "isaac", "circumcision", "ur", "offering"],
        "God called Abram from Ur of the Chaldeans and promised land, descendants and blessing for all families of the earth. Abram believed God, and it was counted to him as righteousness. The covenant was sealed with the sign of circumcision; his name became Abraham, 'father of many nations'.",
        [
          { q: "What was God's command to Abraham in Genesis 12:1?", o: ["Leave your country and go to a land I will show you", "Build an ark", "Lead Israel out of Egypt", "Pluck out your eye"], a: 0, e: "God called him to separate from his people and follow, a journey of faith." },
          { q: "The sign of the Abrahamic covenant was:", o: ["circumcision", "the rainbow", "the Sabbath", "the Passover lamb"], a: 0, e: "Circumcision was the physical sign confirming God's promise to Abraham and his descendants." },
          { q: "Abraham's greatest test of faith came when God asked him to:", o: ["sacrifice Isaac", "leave Egypt", "marry twice", "build a tower"], a: 0, e: "Offering Isaac showed Abraham trusted God even when the promise seemed impossible." }
        ]],
      ["Moses & The Law", ["moses", "pharaoh", "passover", "ten commandments", "exodus", "sinai", "burning bush", "plagues"],
        "Moses was called at the burning bush to lead Israel out of Egypt. Ten plagues and the Passover convinced Pharaoh to let the people go. At Mount Sinai God gave the Ten Commandments and the covenant law, which revealed God's character and Israel's duty to live as His holy people.",
        [
          { q: "The Passover feast commemorates:", o: ["the angel of death passing over Israelite homes", "the crossing of the Red Sea", "the giving of the Law", "the first harvest"], a: 0, e: "The blood of the lamb marked Israelite houses so the destroyer passed over them." },
          { q: "Which commandment teaches respect for parents?", o: ["Honour your father and mother", "You shall not steal", "Remember the Sabbath", "You shall not covet"], a: 0, e: "The fifth commandment promises long life for honouring parents." },
          { q: "Moses received the tablets of the Law at:", o: ["Mount Sinai", "Mount Moriah", "Mount Carmel", "Mount Nebo"], a: 0, e: "Sinai is where God made the covenant with Israel and gave the Law through Moses." }
        ]],
      ["The Prophets", ["prophet", "elijah", "isaiah", "jeremiah", "amos", "justice", "idolatry", "repentance"],
        "Prophets were God's messengers — Elijah against Baal worship, Amos for social justice for the poor, Isaiah calling Israel to holiness, Jeremiah warning of judgment and promising a new covenant. They denounced idolatry, oppression of the weak and empty religion, and called the people to repent.",
        [
          { q: "Amos is known mainly for condemning:", o: ["injustice against the poor", "the building of the temple", "foreign wars", "overeating"], a: 0, e: "Amos thundered that empty worship while 'selling the righteous for silver' would not stand before God." },
          { q: "On Mount Carmel Elijah challenged the prophets of:", o: ["Baal", "Asherah", "Molech", "Dagon"], a: 0, e: "The contest proved that the LORD, not Baal, answers by fire." },
          { q: "Isaiah's vision in the temple emphasised God's:", o: ["holiness", "weakness", "distance", "anger only"], a: 0, e: "'Holy, holy, holy' is the heart of Isaiah's call, which leads to cleansing and commission." }
        ]],
      ["The Life & Teachings of Jesus", ["jesus", "parable", "sermon", "beatitudes", "miracles", "love", "kingdom of god", "baptism"],
        "Jesus was baptised by John and began preaching the kingdom of God. The Sermon on the Mount gave the Beatitudes and commands of love, forgiveness and trust. His parables taught the kingdom in everyday pictures; his miracles showed divine authority. His death and resurrection secured salvation.",
        [
          { q: "The Beatitudes begin Jesus' teaching recorded in:", o: ["the Sermon on the Mount", "the Last Supper", "the Transfiguration", "the Temple cleansing"], a: 0, e: "Matthew 5–7 records the Sermon on the Mount, opening with the Beatitudes." },
          { q: "The parable of the Good Samaritan teaches:", o: ["love your neighbour whoever they are", "never travel at night", "priests are useless", "the law is enough"], a: 0, e: "The Samaritan — an outsider — showed mercy where the religious leaders did not." },
          { q: "At the Last Supper Jesus gave the new commandment to:", o: ["love one another", "build more churches", "memorise the Law", "avoid Rome"], a: 0, e: "'Love one another as I have loved you' is the distinguishing mark of his disciples." }
        ]],
      ["The Early Church", ["pentecost", "apostles", "peter", "paul", "holy spirit", "persecution", "gentiles", "mission"],
        "At Pentecost the Holy Spirit empowered the apostles; Peter preached and about three thousand believed. The church shared possessions and met daily. Persecution scattered believers, which spread the gospel to Samaria and beyond. Paul's missions carried the message to the Gentiles across the Roman world.",
        [
          { q: "The church was born publicly at:", o: ["Pentecost", "Easter", "the Ascension", "the Transfiguration"], a: 0, e: "The Spirit's coming at Pentecost, with Peter's sermon, began the preaching of the risen Christ." },
          { q: "The first Christian martyr was:", o: ["Stephen", "James", "Peter", "Philip"], a: 0, e: "Stephen, full of faith and the Spirit, was stoned as the church faced its first persecution." },
          { q: "Paul's main mission work was to:", o: ["the Gentiles", "Egypt only", "the priests", "the Romans alone"], a: 0, e: "Paul was the apostle to the Gentiles, planting churches across Asia Minor and Greece." }
        ]]
    ]
  },
  "Islamic Religious Studies": {
    why: "The IRS syllabus covers the sources of Islam, the articles of faith and pillars, the life of the Prophet (SAW), worship and the moral teachings Islam requires of every believer, in line with WAEC/NECO objectives.",
    topics: [
      ["Sources of Islam", ["qur'an", "hadith", "wahy", "sunnah", "revelation", "jibril", "chapters", "surah"],
        "The Qur'an is the speech of Allah revealed to Prophet Muhammad (SAW) through Angel Jibril over about 23 years; it has 114 surahs. The Hadith records the sayings, actions and approvals of the Prophet. The Sunnah is his practised way of life. Together the Qur'an and Sunnah are the two primary sources of Islamic law and guidance.",
        [
          { q: "The Qur'an was revealed through which angel?", o: ["Jibril (Gabriel)", "Mika'il", "Israfil", "Izra'il"], a: 0, e: "Angel Jibril brought the revelation (wahy) to the Prophet (SAW)." },
          { q: "How many surahs does the Qur'an contain?", o: ["114", "100", "50", "99"], a: 0, e: "The Qur'an has 114 chapters, each called a surah." },
          { q: "The recorded sayings and actions of the Prophet (SAW) are called:", o: ["Hadith", "Tafsir", "Fiqh", "Ijma"], a: 0, e: "Hadith is the record of the Prophet's words and deeds, second to the Qur'an as a source." }
        ]],
      ["Articles of Faith & Pillars", ["iman", "shahadah", "salah", "zakat", "sawm", "hajj", "belief", "six articles"],
        "Iman comprises six articles: belief in Allah, His angels, His books, His messengers, the Last Day and destiny, good and bad. Islam is built on five pillars: Shahadah (testimony of faith), Salah (five daily prayers), Zakat (poor-due), Sawm (fasting Ramadan) and Hajj (pilgrimage for the able).",
        [
          { q: "Which is NOT one of the five pillars of Islam?", o: ["Sawm (fasting)", "Shahadah", "Zakat", "Iddah"], a: 3, e: "The pillars are Shahadah, Salah, Zakat, Sawm and Hajj; Iddah is the waiting period after a divorce or widowhood." },
          { q: "How many times do Muslims pray each day?", o: ["five", "three", "seven", "one"], a: 0, e: "Salah is obligatory five times daily: Fajr, Zuhr, Asr, Maghrib and Isha." },
          { q: "Spending in charity and caring — the pillar concerned with the poor is:", o: ["Zakat", "Hajj", "Sawm", "Shahadah"], a: 0, e: "Zakat purifies wealth by giving a fixed share to those in need." }
        ]],
      ["The Sīrah: Life of the Prophet (SAW)", ["makkah", "madinah", "hijrah", "migration", "prophet muhammad", "cave", "birth", "message"],
        "Muhammad (SAW) was born in Makkah about 570 CE and received the first revelation in the Cave of Hira. Persecution led to the Hijrah (migration) to Madinah in 622 CE, which begins the Islamic calendar. In Madinah he built the community and the first mosque, and returned to Makkah peacefully, forgiving its people.",
        [
          { q: "The Hijrah refers to the migration to:", o: ["Madinah", "Makkah", "Jerusalem", "Ta'if"], a: 0, e: "The Prophet and his companions migrated from Makkah to Madinah in 622 CE." },
          { q: "The first revelation came to the Prophet (SAW) in:", o: ["the Cave of Hira", "the Ka'bah", "the mosque of Quba", "Mount Arafat"], a: 0, e: "In the Cave of Hira, Jibril brought the first verses of Surah Al-Alaq." },
          { q: "The Islamic calendar (Hijrah calendar) begins in:", o: ["622 CE", "570 CE", "610 CE", "632 CE"], a: 0, e: "The year of the Hijrah to Madinah, 622 CE, is year one of the Islamic calendar." }
        ]],
      ["Worship & Purification", ["wudu", "ghusl", "salah", "tahara", "cleanliness", "masjid", "qiblah", "prayer"],
        "Taharah (purification) is a condition for valid prayer: wudu (ablution) before Salah, and ghusl after states of major impurity. Prayers face the Qiblah (the Ka'bah in Makkah) and may be offered in a masjid or any clean place. Cleanliness of body, clothing and place is half of faith.",
        [
          { q: "The ablution performed before prayer is called:", o: ["Wudu", "Ghusl", "Tayammum only", "Ihram"], a: 0, e: "Wudu washes the hands, mouth, nose, face, arms, head and feet as preparation for Salah." },
          { q: "Muslims face the ________ when praying.", o: ["Qiblah", "Sunnah", "Mihrab only", "Kiswah"], a: 0, e: "All prayers are directed towards the Qiblah, the direction of the Ka'bah in Makkah." },
          { q: "The full ceremonial bath after major impurity is called:", o: ["Ghusl", "Wudu", "Tayammum", "Sujud"], a: 0, e: "Ghusl washes the whole body with water to restore ritual purity." }
        ]],
      ["Ethics & Social Teachings", ["honesty", "truth", "kindness", "parents", "charity", "justice", "patience", "brotherhood"],
        "Islam commands truthfulness, honesty in trade, kindness to parents, justice and mercy. Lying, backbiting, cheating, oppression and intoxicants are forbidden. Muslims are one brotherhood: helping the needy, visiting the sick and greeting others with peace are acts of worship rewarded by Allah.",
        [
          { q: "Which action is forbidden in Islam?", o: ["Backbiting", "Helping the poor", "Honouring parents", "Greeting others"], a: 0, e: "Backbiting (gheebah) is compared to eating the flesh of a dead brother — strictly forbidden." },
          { q: "The Islamic greeting is:", o: ["As-salamu alaykum", "Bismillah", "Alhamdulillah", "Allahu akbar"], a: 0, e: "'As-salamu alaykum' means 'peace be upon you' and spreads love among believers." },
          { q: "Trading with false measurement is condemned because it is:", o: ["dishonest", "lawful", "optional", "encouraged"], a: 0, e: "The Qur'an condemns giving short measure — honesty in trade is an Islamic obligation." }
        ]],
      ["The Last Day & Akhirah", ["akhirah", "judgement", "paradise", "hell", "resurrection", "mizan", "sirat", "day of judgement"],
        "Belief in the Last Day means the world will end, all people will be resurrected and judged. The scales (Mizan) weigh good and bad deeds; the bridge (Sirat) is crossed by the righteous; the outcome is Jannah (paradise) or Jahannam (hell). This belief inspires accountability and righteous living.",
        [
          { q: "The weighing of deeds on the Last Day is done on the:", o: ["Mizan (scales)", "Sirat", "Ka'bah", "Minbar"], a: 0, e: "Every deed will be weighed on the Mizan to show the balance of good and evil." },
          { q: "The eternal reward for the righteous is called:", o: ["Jannah", "Jahannam", "Dunya", "Ma'ad"], a: 0, e: "Jannah is paradise, the eternal reward prepared for the righteous." },
          { q: "Belief in the Last Day directly encourages:", o: ["accountability in daily life", "fatalism and idleness", "escaping work", "avoiding society"], a: 0, e: "Knowing that deeds are judged and rewarded moves believers towards honesty and self-restraint." }
        ]]
    ]
  },
  "Data Processing": {
    why: "Data Processing (WAEC/'Computer Studies' branch) covers the concept of data, computer hardware, numbering systems, information technology in society, application software, the internet and emerging technologies such as cloud computing.",
    topics: [
      ["Computers & ICT Fundamentals", ["hardware", "software", "input", "output", "cpu", "ict", "data", "information"],
        "ICT is the use of computers and networks to store, process and transmit information. Hardware is the physical part; software is the programs. The CPU fetches, decodes and executes instructions. Raw data lacks meaning until it is processed into information — the fundamental purpose of computing.",
        [
          { q: "The brain of the computer that executes instructions is the:", o: ["CPU", "RAM", "Monitor", "Hard disk"], a: 0, e: "The Central Processing Unit fetches, decodes and executes program instructions." },
          { q: "Which of these is an output device?", o: ["Printer", "Scanner", "Keyboard", "Mouse"], a: 0, e: "A printer presents processed data to the user; the others are input devices." },
          { q: "Data that has been processed into a meaningful form is called:", o: ["information", "raw data", "bits", "firmware"], a: 0, e: "Processing gives data context and meaning, turning it into information." }
        ]],
      ["Numbering Systems", ["binary", "denary", "hexadecimal", "octal", "base", "bit", "byte", "convert"],
        "Computers use the binary system (base 2) with bits 0 and 1; a byte is 8 bits. The denary (base 10), octal (base 8) and hexadecimal (base 16) systems represent numbers differently. Conversion uses place values: e.g. 1011₂ = 1×8 + 0×4 + 1×2 + 1×1 = 11₁₀.",
        [
          { q: "Convert 1010₂ to denary.", o: ["10", "8", "12", "20"], a: 0, e: "1010₂ = 8 + 0 + 2 + 0 = 10 in base 10." },
          { q: "How many bits are in one byte?", o: ["8", "4", "16", "2"], a: 0, e: "A byte is a group of 8 bits." },
          { q: "The hexadecimal system has base:", o: ["16", "8", "10", "2"], a: 0, e: "Hexadecimal uses digits 0–9 and A–F, i.e. base 16." }
        ]],
      ["Storage & Memory", ["ram", "rom", "ssd", "hdd", "memory", "cache", "volatile", "storage device"],
        "Primary memory (RAM, ROM, cache) is directly accessed by the CPU; RAM is volatile (loses data when power goes), ROM keeps startup instructions. Secondary storage (HDD, SSD, flash drives, memory cards) holds data permanently but more slowly. The memory hierarchy trades speed for capacity and cost.",
        [
          { q: "Which memory is volatile?", o: ["RAM", "ROM", "Hard disk", "Flash drive"], a: 0, e: "RAM loses its contents when power is switched off." },
          { q: "Data on a secondary storage device is kept:", o: ["permanently", "only while power is on", "for one second", "in cache only"], a: 0, e: "Secondary storage is non-volatile and retains data after the computer is off." },
          { q: "A solid-state drive differs from a hard disk because it has:", o: ["no moving parts", "more moving parts", "less capacity always", "no storage media"], a: 0, e: "SSDs store data on flash memory chips with no rotating platters." }
        ]],
      ["Operating Systems & Applications", ["os", "windows", "file", "folder", "word processor", "spreadsheet", "utility", "interface"],
        "An operating system (Windows, macOS, Linux, Android) manages hardware, files, memory and programs, providing the interface between user and machine. Application software — word processors, spreadsheets, browsers, presentation tools — lets users do specific tasks. Files are organised in folders in a hierarchical structure.",
        [
          { q: "Which is an operating system?", o: ["Linux", "Microsoft Word", "Google Chrome", "Photoshop"], a: 0, e: "Linux is an OS; the others are application software." },
          { q: "A spreadsheet is best used for:", o: ["calculations and data tables", "writing essays", "editing photos", "making calls"], a: 0, e: "Spreadsheets (Excel, Sheets) organise data in rows and columns with formulas." },
          { q: "The program that starts the computer and manages resources is the:", o: ["operating system", "browser", "antivirus", "compiler"], a: 0, e: "The OS boots the machine and coordinates all hardware and software." }
        ]],
      ["The Internet & E-Services", ["internet", "browser", "email", "search engine", "url", "http", "website", "security"],
        "The internet is a global network of networks; the World Wide Web is the system of linked pages accessed by browsers. Websites are addressed by URLs; pages are transferred with HTTP/HTTPS. E-services include email, e-learning, e-banking and e-commerce. Security practices — strong passwords, HTTPS, avoiding phishing — protect users.",
        [
          { q: "The protocol that secures web traffic is:", o: ["HTTPS", "FTP", "SMTP", "POP3"], a: 0, e: "HTTPS encrypts data between browser and server. FTP transfers files; SMTP/POP3 handle mail." },
          { q: "A 'search engine' is used to:", o: ["find information on the web", "print documents", "store files offline", "compile code"], a: 0, e: "Search engines index billions of web pages and return relevant results to queries." },
          { q: "Which practice improves online security?", o: ["using unique strong passwords", "sharing passwords with friends", "opening every email attachment", "using the same password everywhere"], a: 0, e: "Unique, strong passwords limit the damage if one account is compromised." }
        ]],
      ["Databases & Spreadsheets", ["database", "table", "record", "field", "query", "primary key", "sort", "filter"],
        "A database is an organised collection of related data. Tables hold records (rows) made of fields (columns); a primary key uniquely identifies each record. Queries select, sort and filter data, and formulas (SUM, AVERAGE, IF) analyse it in spreadsheets. Good design avoids duplicated data.",
        [
          { q: "In a database table, a single row of data is a:", o: ["record", "field", "query", "report"], a: 0, e: "Rows are records; columns are fields." },
          { q: "The field that uniquely identifies each record is the:", o: ["primary key", "foreign key", "memo field", "index"], a: 0, e: "A primary key ensures each record can be found and never duplicated." },
          { q: "Which spreadsheet formula adds the range B2 to B10?", o: ["=SUM(B2:B10)", "=ADD B2-B10", "=TOTAL(B2,B10)", "=COUNT(B2:B10)"], a: 0, e: "SUM(B2:B10) returns the total of the numbers in the range." }
        ]]
    ]
  },
  "Food & Nutrition": {
    why: "Food & Nutrition (WAEC) covers nutrients and their functions, balanced diets for each family member, meal planning, food hygiene and safety, cooking methods, and preservation so students can plan, prepare and serve nutritious, safe meals.",
    topics: [
      ["Nutrients & Their Functions", ["protein", "carbohydrate", "fat", "vitamin", "mineral", "water", "fibre", "energy"],
        "The six classes of nutrients are carbohydrates, proteins, fats and oils, vitamins, minerals and water. Carbohydrates and fats supply energy; proteins build and repair body tissues; vitamins and minerals protect and regulate; fibre aids digestion; water is essential for life. Deficiency of a nutrient causes specific deficiency diseases.",
        [
          { q: "Which nutrient is the body's main energy source?", o: ["Carbohydrates", "Proteins", "Minerals", "Water"], a: 0, e: "Carbohydrates (starch, sugar) are the chief energy foods." },
          { q: "Proteins are mainly needed for:", o: ["body building and repair", "energy only", "cooling the body", "digestion only"], a: 0, e: "Proteins build, repair and maintain body tissues and make enzymes and hormones." },
          { q: "Lack of vitamin C causes:", o: ["scurvy", "rickets", "anaemia", "goitre"], a: 0, e: "Scurvy (bleeding gums) results from vitamin C deficiency; rickets is vitamin D deficiency." }
        ]],
      ["Food Groups & Balanced Diet", ["balanced diet", "food groups", "protein foods", "energy foods", "body building", "protective foods"],
        "A balanced diet contains the right proportions of all nutrients for a person's age, sex, activity and state of health. Food groups include energy foods (cereals, roots), body-building foods (meat, fish, beans, eggs, milk), protective foods (fruit, vegetables) and fats/oils. A meal should combine these in the right amounts.",
        [
          { q: "Which foods belong to the protective group?", o: ["Fruits and vegetables", "Beans and meat", "Rice and yam", "Butter and oil"], a: 0, e: "Fruits and vegetables supply vitamins and minerals that protect the body." },
          { q: "A meal containing rice, fish, vegetables and groundnut oil is:", o: ["balanced", "one-sided", "unhealthy always", "incomplete"], a: 0, e: "It provides energy, protein, protective nutrients and fats — a balanced pattern." },
          { q: "Energy needs are HIGHEST for:", o: ["a growing teenage athlete", "a sleeping baby", "an elderly bedridden person", "an office worker on leave"], a: 0, e: "Rapid growth plus strenuous activity raises energy requirements sharply." }
        ]],
      ["Meal Planning & Menu", ["menu", "meal planning", "budget", "family", "nutrition", "food cost", "seasonal", "variety"],
        "Meal planning means deciding what food to buy and cook ahead of time. A good plan balances nutrients, suits the family's needs and budget, uses seasonal foods, avoids monotony and saves time and money. A menu is the written list of dishes for a meal or a day. Leftovers can be used creatively.",
        [
          { q: "A written list of dishes served at a meal is called a:", o: ["menu", "recipe", "budget", "ration"], a: 0, e: "The menu states what will be eaten, planned in advance." },
          { q: "Which factor does NOT belong in meal planning?", o: ["The colour of the plate", "Family budget", "Nutrient needs", "Availability of food"], a: 0, e: "Budget, needs and availability shape a plan; plate colour is presentation." },
          { q: "Buying food in season is encouraged because it is:", o: ["cheaper and fresher", "always imported", "more processed", "harder to cook"], a: 0, e: "Seasonal produce costs less, is fresher and often more nutritious." }
        ]],
      ["Food Hygiene & Safety", ["hygiene", "contamination", "bacteria", "hand washing", "food poisoning", "storage", "safe water", "personal hygiene"],
        "Food hygiene prevents food poisoning by stopping harmful bacteria from reaching food. Rules include washing hands before handling food, cooking thoroughly, keeping raw and cooked food apart, chilling leftovers quickly and using safe water. Personal hygiene — clean clothes, covered hair, no touching — protects the food, the cook and the consumer.",
        [
          { q: "The most common cause of food poisoning is:", o: ["harmful bacteria", "too much salt", "overcooking", "eating fruit"], a: 0, e: "Bacteria multiply in food that is not cooked, chilled or handled hygienically." },
          { q: "Leftover food should be:", o: ["cooled and refrigerated quickly", "left on the table overnight", "reheated later without care", "covered with cloth only"], a: 0, e: "Fast cooling and chilling stop bacterial growth." },
          { q: "Before handling food, a cook must:", o: ["wash hands with soap", "taste the food", "wear jewellery", "wipe hands on apron"], a: 0, e: "Hand-washing with soap and water is the first rule of food hygiene." }
        ]],
      ["Methods of Cooking", ["boiling", "frying", "roasting", "steaming", "baking", "stewing", "grilling", "cooking"],
        "Cooking makes food safe, digestible and tasty and destroys harmful organisms. Moist methods include boiling, steaming and stewing; dry methods include roasting, baking and grilling; frying uses hot oil. Each method affects nutrient loss — steaming preserves most vitamins, while long boiling and deep frying lose more.",
        [
          { q: "Which cooking method preserves most vitamins?", o: ["Steaming", "Deep frying", "Boiling for a long time", "Grilling at high heat"], a: 0, e: "Steaming cooks with little water contact, so heat-labile vitamins survive better." },
          { q: "Cooking food in hot oil is called:", o: ["frying", "boiling", "steaming", "stewing"], a: 0, e: "Frying cooks food in hot oil — shallow or deep." },
          { q: "A main reason for cooking food is to:", o: ["destroy harmful micro-organisms", "increase its weight", "remove all vitamins", "make it raw again"], a: 0, e: "Heat kills bacteria and parasites, making food safe to eat." }
        ]],
      ["Food Preservation & Storage", ["preservation", "refrigeration", "drying", "salting", "canning", "smoking", "freezing", "shelf life"],
        "Preservation keeps food safe and edible for longer by slowing or stopping the action of micro-organisms and enzymes. Methods include refrigeration and freezing, drying, salting, smoking, canning, boiling with sugar or vinegar, and modern vacuum packing. Well-preserved food keeps its nutrients at low cost and prevents waste.",
        [
          { q: "Which method preserves fish traditionally by removing moisture?", o: ["Drying", "Frying", "Steaming", "Grating"], a: 0, e: "Sun-drying removes water, so bacteria cannot grow." },
          { q: "Refrigeration preserves food mainly by:", o: ["slowing microbial growth", "killing all germs", "adding preservatives", "cooking it"], a: 0, e: "Low temperature slows bacterial multiplication — it does not sterilise the food." },
          { q: "Adding salt to meat or fish preserves it because salt:", o: ["draws out water", "adds vitamins", "raises temperature", "removes protein"], a: 0, e: "Salt reduces water activity, denying micro-organisms the moisture they need." }
        ]]
    ]
  },
  "French": {
    why: "The French syllabus builds listening, speaking, reading and writing skills: le vocabulaire courant, le genre et les articles, les temps des verbes, les adjectifs et pronoms, la compréhension des textes et l'expression écrite pour WAEC/NECO.",
    topics: [
      ["Les Articles & Le Genre", ["le", "la", "les", "un", "une", "des", "masculin", "féminin", "gender", "article"],
        "Le nom français est masculin ou féminin. Les articles définis (le, la, l', les) désignent des personnes ou choses précises; les articles indéfinis (un, une, des) désignent des choses non précises. La plupart des noms féminins se terminent par -e (une table), mais il faut apprendre le genre avec le mot.",
        [
          { q: "Choisissez le bon article: _____ table.", o: ["la", "le", "les", "l'"], a: 0, e: "'Table' est féminin, donc 'la table'." },
          { q: "Choisissez le bon article: _____ livre.", o: ["un", "une", "des", "la"], a: 0, e: "'Livre' (book) est masculin, donc 'un livre'." },
          { q: "Le pluriel de 'un cahier' est:", o: ["des cahiers", "les cahier", "un cahiers", "des cahier"], a: 0, e: "Au pluriel on ajoute un -s: des cahiers, avec l'article indéfini pluriel 'des'." }
        ]],
      ["Les Verbes: Présent & Passé Composé", ["verbe", "conjugaison", "présent", "passé composé", "avoir", "être", "participe passé", "terminaison"],
        "Au présent, les verbes du 1er groupe (parler) donnent: je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent. Le passé composé se forme avec l'auxiliaire avoir ou être + le participe passé: j'ai parlé, elle est allée. Avec être, le participe s'accorde avec le sujet.",
        [
          { q: "Conjuguez: Nous (manger) ___ au présent.", o: ["mangeons", "mangent", "manges", "mangez"], a: 0, e: "Avec 'nous', le 1er groupe prend -ons: nous mangeons." },
          { q: "Le passé composé de 'je finir' est:", o: ["j'ai fini", "je finis", "je finirai", "j'avais finir"], a: 0, e: "Avec l'auxiliaire avoir + participe passé: j'ai fini." },
          { q: "Avec l'auxiliaire 'être', le participe passé s'accorde avec:", o: ["le sujet", "l'objet direct", "le verbe", "rien"], a: 0, e: "Exemple: elle est allée — accord féminin singulier avec le sujet." }
        ]],
      ["Les Adjectifs & Les Pronoms", ["adjectif", "pronom", "possessif", "beau", "nouveau", "il", "elle", "accord"],
        "L'adjectif s'accorde en genre et en nombre avec le nom: un grand garçon, une grande fille, des grands garçons. Les adjectifs possessifs (mon, ma, mes; ton, ta, tes; son, sa, ses) indiquent la possession. Les pronoms personnels sujets (je, tu, il, elle, nous, vous, ils, elles) remplacent le sujet du verbe.",
        [
          { q: "Choisissez: une ___ maison.", o: ["belle", "beau", "beaux", "bel"], a: 0, e: "'Maison' est féminin, donc l'adjectif prend -e: belle." },
          { q: "Le possessif correct: ___ frère (masculin singulier).", o: ["mon", "ma", "mes", "ton"], a: 0, e: "Devant un nom masculin singulier: mon frère." },
          { q: "Quel pronom remplace 'les élèves'?", o: ["ils", "elle", "tu", "nous"], a: 0, e: "'Les élèves' est pluriel masculin, donc 'ils'." }
        ]],
      ["La Famille & La Vie Quotidienne", ["famille", "père", "mère", "frère", "soeur", "journée", "maison", "quotidien"],
        "Le vocabulaire de la famille: le père, la mère, le frère, la sœur, l'oncle, la tante, le grand-père, la grand-mère. La vie quotidienne décrit le lever, le petit-déjeuner, l'école, les repas et le coucher. Les phrases avec 'je me lève', 'nous déjeunons' décrivent les routines de la journée.",
        [
          { q: "La sœur de ma mère est ma:", o: ["tante", "cousine", "grand-mère", "nièce"], a: 0, e: "La sœur de la mère est la tante." },
          { q: "'Je me lève à six heures' signifie:", o: ["I get up at six", "I sleep at six", "I eat at six", "I leave at six"], a: 0, e: "Se lever = to get up." },
          { q: "Le repas du matin s'appelle:", o: ["le petit-déjeuner", "le déjeuner", "le dîner", "le goûter"], a: 0, e: "Le petit-déjeuner est le repas du matin." }
        ]],
      ["La Compréhension & La Lecture", ["compréhension", "lecture", "texte", "question", "répondre", "vocabulaire", "sens", "context"],
        "Pour comprendre un texte, on lit d'abord les questions, puis le texte entier pour en saisir le sens général. On repère les mots clés, les verbes et les connecteurs (mais, parce que, donc). On répond dans la langue du texte, en donnant des phrases complètes qui reprennent les mots de la question.",
        [
          { q: "Avant de lire un texte, il faut d'abord:", o: ["lire les questions", "deviner des mots", "écrire en français", "mémoriser tout"], a: 0, e: "Lire les questions guide la recherche de l'information." },
          { q: "'Parce que' introduit:", o: ["une cause", "une conséquence", "un contraste", "un lieu"], a: 0, e: "Parce que (because) exprime la cause." },
          { q: "Quand on répond à une question de compréhension, on doit:", o: ["répondre par une phrase complète", "copier le texte entier", "répondre au hasard", "changer le sujet"], a: 0, e: "Une réponse en phrase complète montre qu'on a compris le texte." }
        ]],
      ["L'Expression Écrite", ["rédaction", "lettre", "essai", "introduction", "conclusion", "paragraphe", "écrire", "courrier"],
        "Une bonne rédaction a une introduction, un développement en paragraphes et une conclusion. Pour une lettre: la date, la salutation (Cher ami, Chère madame), le corps et la formule de politesse (Amicalement, Bien à toi). On emploie les connecteurs (d'abord, ensuite, enfin) et on vérifie l'orthographe et l'accord.",
        [
          { q: "Une lettre commence par:", o: ["la date et la salutation", "la conclusion", "la signature seulement", "le titre"], a: 0, e: "On écrit la date en haut, puis la salutation: Cher/Chere..." },
          { q: "Quel connecteur exprime l'ordre final des idées?", o: ["enfin", "mais", "parce que", "si"], a: 0, e: "D'abord, ensuite, enfin organisent le plan du texte." },
          { q: "La formule de politesse d'une lettre à un ami est:", o: ["Amicalement", "Sincèrement vôtre, M. le Président", "À qui de droit", "Veuillez agréer"], a: 0, e: "À un ami on écrit amicalement; les formules officielles conviennent aux lettres formelles." }
        ]]
    ]
  }
};
  function extraSubjectsMerge(base) {
    if (typeof EXTRA_SUBJECTS !== "object") return base;
    var have = base.slice();
    Object.keys(EXTRA_SUBJECTS).forEach(function (x) { if (have.indexOf(x) < 0) have.push(x); });
    return have;
  }
  function extraTopic(subject, topic) {
    try {
      if (typeof EXTRA_SUBJECTS === "object" && EXTRA_SUBJECTS[subject]) {
        var t = (EXTRA_SUBJECTS[subject].topics || []).filter(function (x) { return x[0] === topic; })[0];
        return t || null;
      }
    } catch (e) {}
    return null;
  }
  function curEntry(subject, topic) {
    try {
      if (typeof window.CURR !== "undefined" && window.CURR && window.CURR[subject])
        return (window.CURR[subject] || []).filter(function (x) { return x[0] === topic; })[0] || null;
    } catch (e) {}
    return null;
  }
  function curEnsure(repaint) {
    try {
      if (typeof window.SYLL !== "undefined" && window.SYLL && typeof window.CURR !== "undefined" && window.CURR) return;
      if (window.curo) window.curo(function () { try { if (repaint) repaint(); } catch (e) {} });
    } catch (e) {}
  }


  var DOC = document;
  function $(id) { return DOC.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function toast(msg, ico) {
    try { if (window.toast) window.toast(msg, ico || "🎓"); } catch (e) {}
  }
  function say(t) { try { if (window.speakText) window.speakText(t); } catch (e) {} }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function fmtTime(s) {
    s = Math.max(0, Math.round(+s || 0));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  function shuffle(a) {
    a = (a || []).slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function st(k, d) { try { return window.store ? store.get(k, d) : d; } catch (e) { return d; } }
  function setSt(k, v) { try { window.store && store.set(k, v); } catch (e) {} }

  /* ---------- reads from the app ---------- */
  function subjectList() {
    try {
      var q = window.QUIZ_RAW;
      if (q && Array.isArray(q.subj) && q.subj.length >= 13) return extraSubjectsMerge(q.subj.slice());
    } catch (e) {}
    try {
      if (Array.isArray(CLASSES) && CLASSES.length && CLASSES[0].questions) {
        var seen = [], out = [];
        CLASSES[0].questions.forEach(function (x) { if (seen.indexOf(x.s) < 0) { seen.push(x.s); out.push(x.s); } });
        if (out.length) return extraSubjectsMerge(out);
      }
    } catch (e) {}
    return extraSubjectsMerge(["Mathematics", "English Language", "Biology", "Chemistry", "Physics",
      "Agricultural Science", "Economics", "Government", "Literature in English",
      "Geography", "Commerce", "Computer Studies", "Civic Education"]);
  }
  function classList() {
    try {
      if (Array.isArray(CLASSES) && CLASSES.length === 3) return CLASSES.map(function (c) { return c.class; });
    } catch (e) {}
    return ["SS1", "SS2", "SS3"];
  }
  function topicsOf(subject) {
    var out = [];
    function add(arr, kws) {
      if (!arr || !arr[0]) return;
      var has = out.some(function (x) { return x[0] === arr[0]; });
      if (!has) out.push([arr[0], kws || []]);
    }
    try {
      if (typeof window.CURR !== "undefined" && window.CURR && window.CURR[subject])
        window.CURR[subject].forEach(function (t) { add(t, t[1]); });
    } catch (e) {}
    try {
      if (typeof EXTRA_SUBJECTS === "object" && EXTRA_SUBJECTS[subject] && EXTRA_SUBJECTS[subject].topics)
        EXTRA_SUBJECTS[subject].topics.forEach(function (t) { add(t, t[1]); });
    } catch (e) {}
    try {
      if (typeof TOPICS !== "undefined" && TOPICS && TOPICS[subject])
        TOPICS[subject].forEach(function (t) { add(t, t[1]); });
    } catch (e) {}
    if (out.length) return out;
    try {
      var nb = notesOf(subject);
      if (nb) return Object.keys(nb).map(function (t) { return [t, []]; });
    } catch (e) {}
    return [];
  }
  function notesOf(subject) {
    var mm = {};
    try {
      if (typeof EXTRA_SUBJECTS === "object" && EXTRA_SUBJECTS[subject])
        (EXTRA_SUBJECTS[subject].topics || []).forEach(function (t) { mm[t[0]] = t[2] || ""; });
    } catch (e) {}
    try {
      if (window.notesBank) { var nb0 = notesBank()[subject] || {}; Object.keys(nb0).forEach(function (k) { mm[k] = nb0[k]; }); }
    } catch (e) {}
    try {
      if (typeof RNOTES !== "undefined" && RNOTES[subject])
        Object.keys(RNOTES[subject]).forEach(function (k) { mm[k] = RNOTES[subject][k]; });
    } catch (e) {}
    try {
      if (typeof window.CURR !== "undefined" && window.CURR && window.CURR[subject])
        window.CURR[subject].forEach(function (t) { if (t && t[2]) mm[t[0]] = t[2]; });
    } catch (e) {}
    return mm;
  }
  function subjectsData() {
    try {
      if (Array.isArray(CLASSES) && CLASSES.length === 3 && CLASSES[0].questions) return CLASSES;
    } catch (e) {}
    return [];
  }
  function questionsFor(clsIndex, subject) {
    var data = subjectsData();
    if (!data.length) return [];
    var arr = data[Math.max(0, Math.min(2, +clsIndex || 0))].questions || [];
    if (!subject || subject === "All subjects") return arr.slice();
    return arr.filter(function (q) { return q.s === subject; });
  }
  function kwPhrase(kws) {
    kws = (kws || []).filter(function (k) { return k && k.length > 1; });
    if (!kws.length) return "the core ideas of this topic";
    var top = kws.slice(0, 5).map(function (k) { return "'" + k.trim() + "'"; });
    if (top.length === 1) return top[0];
    return top.slice(0, -1).join(", ") + " and " + top[top.length - 1];
  }
  function subjectCurriculum(subject) {
    try {
      if (typeof EXTRA_SUBJECTS === "object" && EXTRA_SUBJECTS[subject] && EXTRA_SUBJECTS[subject].why) return EXTRA_SUBJECTS[subject].why;
    } catch (e) {}
    var m = {
      "Mathematics": "The SS1–SS3 Mathematics syllabus covers number systems, algebra, geometry, trigonometry, mensuration, statistics, probability, functions, graphs and their applications to everyday and exam problems.",
      "English Language": "English Language at Senior Secondary level develops grammar, vocabulary, comprehension, essay and letter writing, oral English (phonetics and stress) and the expression skills examined in WAEC, NECO and JAMB.",
      "Biology": "Biology follows the living world from cells and organisation, through ecology, genetics and evolution, to plant and animal physiology, with health, nutrition and disease prevention linked to Nigerian life.",
      "Chemistry": "Chemistry builds the particulate nature of matter, atomic structure and bonding, acids and bases, chemical reactions, separation techniques, organic chemistry and the physical chemistry needed for WAEC/NECO.",
      "Physics": "Physics covers measurement, mechanics and motion, heat and thermodynamics, electricity and magnetism, waves and optics, pressure and fluids, and modern physics — all examined with formulas and numerical work.",
      "Agricultural Science": "Agricultural Science spans soil and crop production, animal production, farm management, agricultural technology and processing, ecology, genetics and improvement, with strong ties to Nigerian farming practice.",
      "Economics": "Economics develops basic concepts and theory, demand and supply, market structures, money and banking, national income and trade, public finance, development and production in the Nigerian and global economy.",
      "Government": "Government examines political concepts, constitutions, democracy and elections, Nigerian political history, public administration, political parties, pressure groups and international organisations such as the UN, AU and ECOWAS.",
      "Literature in English": "Literature in English covers poetry, prose, drama, literary terms and devices, African literature, and comprehension and analysis of prescribed texts, with critical thinking and close reading at the centre.",
      "Geography": "Geography combines physical geography, climate and weather, landforms and water, settinng, population, settlement, industry and map work — the skills needed to read and interpret the Nigerian environment.",
      "Commerce": "Commerce develops trade, commerce and industry, business organisations, money and banking, insurance, consumerism, trade and finance, and the principles behind Nigerian commercial life.",
      "Computer Studies": "Computer Studies builds hardware and systems, software and applications, internet and networks, programming and algorithms, data and security, and ICT fundamentals, ethics and digital citizenship.",
      "Civic Education": "Civic Education cultivates values and citizenship, rights and duties, national consciousness, democracy and governance, social and community issues, and health, environment and national development."
    };
    return m[subject] || ("The Senior Secondary " + subject + " syllabus is delivered as a progressive three-year course that leaves students ready for WAEC, NECO and JAMB at the end of SS3.");
  }
  function classFocus(cls) {
    if (cls === "SS1") return "SS1 is the foundation year. Introduce the key vocabulary, definitions and basic procedures, then work simple examples until the class is confident before moving forward.";
    if (cls === "SS2") return "SS2 consolidates and extends SS1. Apply the concepts to longer questions, link the topic to other parts of the syllabus and build exam-style working habits.";
    return "SS3 is the WAEC/NECO/JAMB year. Revise the essentials, practise under timed conditions, avoid common mistakes and connect this topic to the questions that frequently appear in public examinations.";
  }
  function lessonObjectives(topicName, kws) {
    var base = [
      "Define and explain " + esc(topicName) + " in your own words.",
      "Identify the key terms and ideas: " + kwPhrase(kws) + ".",
      "Work through at least one clear example with correct working.",
      "Use the facts, formulas or definitions in a WAEC/NECO-style question.",
      "Explain the connection between this topic and other parts of " + ("the syllabus") + "."
    ];
    return base;
  }
  function contentPara(subject, topicName, kws, cls) {
    var card = notesOf(subject)[topicName] || "";
    return cls + " " + topicName + ". " + subjectCurriculum(subject) +
      " This lesson centres on " + kwPhrase(kws) +
      (card ? ". The key facts and formulas for this topic are set out below, so the class can read them, learn them and apply them." : ". Work through the definition first, then the explanatory points and the worked example.") +
      ". In " + cls + " the emphasis is on " + (cls === "SS1" ? "building a solid foundation" : cls === "SS2" ? "deepening understanding and improving accuracy" : "exam readiness, accuracy and speed") + ".";
  }
  function schemeFor(subject, cls) {
    var out = [];
    try {
      if (typeof window.SYLL !== "undefined" && window.SYLL && window.SYLL[subject] && window.SYLL[subject].length === 9) {
        var srows = window.SYLL[subject];
        var termNames = ["1st Term", "2nd Term", "3rd Term"];
        var focuses = ["Foundations and first units", "Development and applications", "Revision and public-examination preparation"];
        for (var ti = 0; ti < 3; ti++) {
          var wk = [];
          srows.slice(ti * 3, ti * 3 + 3).forEach(function (r) { r.forEach(function (tp) { wk.push(tp); }); });
          wk = wk.slice(0, 12);
          out.push([{ term: termNames[ti], focus: focuses[ti] }, wk.map(function (tp, j) { return { week: "Week " + (j + 1), topic: tp }; })]);
        }
        return out;
      }
    } catch (e) {}
    var topics = topicsOf(subject);
    if (!topics.length) return out;
    var t1 = topics.slice(0, 2), t2 = topics.slice(2, 4), t3 = topics.slice(4);
    function weeks(topicArr, labels) {
      return labels.map(function (lbl, i) {
        return { week: lbl, topic: (topicArr[i % topicArr.length] || [topicArr[0] || ["General", []]])[0] };
      });
    }
    out.push([{ term: "1st Term", focus: "Foundations and first units" }, weeks(t1, ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8", "Week 9", "Week 10", "Week 11", "Week 12"])]);
    out.push([{ term: "2nd Term", focus: "Development and applications" }, weeks(t2, ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8", "Week 9", "Week 10", "Week 11", "Week 12"])]);
    out.push([{ term: "3rd Term", focus: "Revision and public-examination preparation" }, weeks(t3, ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8", "Week 9", "Week 10", "Week 11", "Week 12"])]);
    return out;
  }
  function matchQuestions(subject, topicName, kws, clsIndex, n) {
    var need = n || 4;
    var ex = extraTopic(subject, topicName);
    if (ex) return (ex[3] || []).slice(0, need);
    var out = [];
    try {
      var ce = curEntry(subject, topicName);
      if (ce && ce[3] && ce[3].length) out = out.concat(ce[3]);
    } catch (e) {}
    var all = questionsFor(clsIndex, subject);
    var matched = [];
    if (kws && kws.length) {
      matched = all.filter(function (q) {
        var t = (q.q + " " + (q.e || "")).toLowerCase();
        return kws.some(function (k) { return k && k.length >= 2 && t.indexOf(k.toLowerCase()) >= 0; });
      });
    }
    if (matched.length < need) matched = all.slice();
    if (!out.length) return shuffle(matched).slice(0, need);
    return out.concat(shuffle(matched)).slice(0, need);
  }
  function gradeFor(pct) {
    if (pct >= 75) return "A1";
    if (pct >= 70) return "B2";
    if (pct >= 65) return "B3";
    if (pct >= 60) return "C4";
    if (pct >= 55) return "C5";
    if (pct >= 50) return "C6";
    if (pct >= 45) return "D7";
    if (pct >= 40) return "E8";
    return "F9";
  }
  function verdictFor(pct) {
    if (pct >= 70) return "Distinction — excellent.";
    if (pct >= 50) return "Credit — solid, keep building.";
    if (pct >= 40) return "Pass — revise the weak topics.";
    return "Below pass — review the lesson and retry.";
  }

  /* ---------- module state ---------- */
  var state = {
    route: "notes",
    subj: subjectList()[0],
    cls: classList()[2] || "SS3",
    topic: null,
    cbt: null
  };

  /* ---------- launcher ---------- */
  function injectLauncher() {
    if ($("eduLaunch")) return;
    var b = DOC.createElement("button");
    b.id = "eduLaunch";
    b.type = "button";
    b.title = "Open the Teaching Suite — lesson notes, CBT, scheme of work";
    b.setAttribute("aria-label", "Open the Teaching Suite");
    b.innerHTML = '<span class="edu-launch-ico">🎓</span><span class="edu-launch-txt">Teaching Suite</span>';
    b.onclick = function () { open(); };
    DOC.body.appendChild(b);
  }

  /* ---------- read-aloud ---------- */
  var SPEAKU = null;
  function speakTxt(t) {
    try {
      if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== "undefined") {
        if (SPEAKU) { window.speechSynthesis.cancel(); SPEAKU = null; return 0; }
        var u = new SpeechSynthesisUtterance(t); SPEAKU = u; window.speechSynthesis.speak(u); return 1;
      }
    } catch (e) {}
    return -1;
  }
  function speak() {
    var subj = state.subj, topic = state.topic, cls = state.cls;
    if (!topic) return toast("Choose a topic first", "⚠️");
    var kws = kwArr(subj, topic);
    var card = notesOf(subj)[topic] || "";
    var txt = "Lesson note. " + (contentPara(subj, topic, kws, cls) || "") + " Objectives. " + lessonObjectives(topic, kws).join(" ") + " Key points. " + card + " " + classFocus(cls);
    try { if (window.speakText) { window.speakText(txt); return toast("Reading the lesson aloud", "🔊"); } } catch (e) {}
    var r = speakTxt(txt);
    if (r === 1) toast("Reading the lesson aloud — tap again to stop", "🔊");
    else if (r === 0) toast("Stopped", "🔊");
    else toast("Read-aloud needs a browser with speech support", "🔊");
  }
  function stopSpeak() { try { if (SPEAKU && window.speechSynthesis) { window.speechSynthesis.cancel(); SPEAKU = null; } } catch (e) {} }

  /* ---------- modal ---------- */
  function close() {
    var o = $("eduOv");
    if (o && o.parentNode) {
      var pv = o.getAttribute("data-prevov") || "";
      try { DOC.body.style.overflow = pv; } catch (e) {}
      o.parentNode.removeChild(o);
    }
    if (CBT && CBT.timer) { clearInterval(CBT.timer); CBT.timer = null; }
    stopSpeak();
  }
  function open(kind, arg) {
    try { close(); } catch (e) {}
    var ov = DOC.createElement("div");
    ov.id = "eduOv";
    ov.className = "edu-ov";
    ov.setAttribute("data-prevov", DOC.body.style.overflow || "");
    DOC.body.style.overflow = "hidden";
    var modal = DOC.createElement("div");
    modal.id = "eduModal";
    modal.className = "edu-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = "";
    ov.appendChild(modal);
    DOC.body.appendChild(ov);
    if (kind) state.route = kind;
    paint(arg);
  }
  function paint(arg) {
    var m = $("eduModal");
    if (!m) return;
    m.innerHTML = shellHtml(arg);
    var r = state.route;
    if (r === "cbt") return cbtRoute(arg);
    if (r === "scheme") return schemeRoute(arg);
    if (r === "syllabus") return syllabusRoute(arg);
    if (r === "marks") return marksRoute(arg);
    return notesRoute(arg);
  }
  function shellHtml(arg) {
    var tabs = [
      ["notes", "📚 Lesson Notes", "Lesson notes for SS1–SS3"],
      ["cbt", "💻 CBT", "Computer-based test"],
      ["scheme", "🗓 Scheme", "Termly scope & sequence"],
      ["syllabus", "🧭 Syllabus", "Full subject map"],
      ["marks", "🏅 Marking", "WAEC/NECO grading"]
    ];
    var t = tabs.map(function (x) {
      return '<button type="button" class="edu-tab' + (state.route === x[0] ? " on" : "") + '" title="' + esc(x[2]) + '" onclick="EDU.go(\'' + x[0] + '\')">' + x[1] + "</button>";
    }).join("");
    return '<div class="edu-head"><div class="edu-brand"><b>🎓 Teaching Suite</b><small>SS1–SS3 · Nigerian curriculum · all 19 subjects</small></div><button type="button" class="edu-x" onclick="EDU.close()" aria-label="Close">✕</button></div>' +
      '<div class="edu-tabs" role="tablist">' + t + "</div>" +
      '<div class="edu-body" id="eduSBody"></div>' +
      '<div class="edu-foot">Runs on this device · no account needed · © merebari web</div>';
  }
  function body() { return $("eduSBody"); }

  /* ---------- lesson notes ---------- */
  function notesRoute(arg) {
    var subs = subjectList(), cls = state.cls || "SS3", subj = state.subj || subs[0];
    var topics = topicsOf(subj);
    if (!state.topic || !topics.some(function (t) { return t[0] === state.topic; })) state.topic = topics.length ? topics[0][0] : null;
    var b = body(); if (!b) return;
    var topicSel = topics.map(function (t) {
      return '<button type="button" class="edu-chip' + (state.topic === t[0] ? " on" : "") + '" onclick="EDU.topic(\'' + esc(t[0]).replace(/'/g, "\\'") + '\')">' + esc(t[0]) + "</button>";
    }).join("");
    b.innerHTML =
      '<div class="edu-sec">'
      + '<h3>📚 Lesson Notes</h3>'
      + '<p class="edu-lede">Ready-to-use lesson notes for every SS1–SS3 subject: learning objectives, content, key points, worked examples and a class evaluation drawn from the app\u2019s verified question bank.</p>'
      + '<div class="edu-pickrow">'
      + '<label>Class <select class="edu-sel" id="eduCls">' + classList().map(function (c) { return '<option value="' + esc(c) + '"' + (c === cls ? " selected" : "") + '>' + esc(c) + "</option>"; }).join("") + "</select></label>"
      + '<label>Subject <select class="edu-sel" id="eduSub">' + subs.map(function (s) { return '<option value="' + esc(s) + '"' + (s === subj ? " selected" : "") + '>' + esc(s) + "</option>"; }).join("") + "</select></label>"
      + "</div>"
      + '<div class="edu-chiprow">' + topicSel + "</div>"
      + '<div class="edu-grid2">'
      + '<div class="edu-card"><h4>📘 Lesson content</h4><div id="eduLesson">' + lessonHtml(subj, state.topic, cls) + "</div></div>"
      + '<div class="edu-card"><h4>✍️ Evaluations &amp; practice</h4><div id="eduWork">' + workHtml(subj, state.topic, cls) + "</div></div>"
      + "</div>"
      + "</div>";
    var clsSel = $("eduCls"), subSel = $("eduSub");
    if (clsSel) clsSel.onchange = function () { state.cls = clsSel.value; paint(); };
    if (subSel) subSel.onchange = function () { state.subj = subSel.value; state.topic = topicsOf(state.subj)[0] ? topicsOf(state.subj)[0][0] : null; paint(); };
    curEnsure(function () { try { paint(); } catch (e) {} });
  }
  function lessonHtml(subj, topic, cls) {
    if (!topic) return "<p class=\"edu-empty\">Choose a topic to see the lesson note.</p>";
    var kws = [];
    try {
      var tp = (TOPICS[subj] || []).filter(function (x) { return x[0] === topic; })[0];
      kws = tp ? tp[1] : [];
    } catch (e) {}
    var card = notesOf(subj)[topic] || "";
    var bullets = card ? card.split(". ").filter(function (x) { return x && x.length > 2; }).map(function (x) { return "• " + x.trim(); }).join("<br>") : "• Read the worked example and class evaluation below.";
    var objs = lessonObjectives(topic, kws).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    var focus = classFocus(cls);
    return '<div class="edu-note">'
      + '<p><b>Topic:</b> ' + esc(topic) + ' · <b>Class:</b> ' + esc(cls) + ' · <b>Subject:</b> ' + esc(subj) + '</p>'
      + '<p><b>Curriculum context.</b> ' + esc(contentPara(subj, topic, kws, cls)) + '</p>'
      + '<p><b>Learning focus for ' + esc(cls) + '.</b> ' + esc(focus) + '</p>'
      + '<div class="edu-sub"><b>🎯 Objectives</b><ul>' + objs + "</ul></div>"
      + '<div class="edu-sub"><b>📌 Key points &amp; facts</b><div class="edu-card-mini">' + bullets + '</div></div>'
      + '<div class="edu-sub"><b>🖨 Teacher tip.</b> Ask the class to read the key points once, close the screen, then write the facts they remember. This retrieval practice is the single most reliable way to teach a topic for WAEC/NECO.</div>'
      + "<div style=\"display:flex;gap:8px;flex-wrap:wrap;margin-top:12px\">"
      + '<button type="button" class="edu-btn" onclick="EDU.speak()">🔊 Hear this lesson</button>'
      + '<button type="button" class="edu-btn" onclick="EDU.lessonPrint()">🖨 Print this lesson</button>'
      + '<button type="button" class="edu-btn gold" onclick="EDU.lessonDrill(\'' + esc(subj).replace(/'/g, "\\'") + '\',\'' + esc(topic).replace(/'/g, "\\'") + '\',\'' + esc(cls).replace(/'/g, "\\'") + '\')">▶ Drill this topic</button>'
      + "</div></div>";
  }
  function workHtml(subj, topic, cls) {
    if (!topic) return "<p class=\"edu-empty\">Choose a topic to see the class evaluation.</p>";
    var ci = classList().indexOf(cls); if (ci < 0) ci = 2;
    var examples = matchQuestions(subj, topic, kwArr(subj, topic), ci, 2);
    var evalr = matchQuestions(subj, topic, kwArr(subj, topic), ci, 4);
    function qBlock(q, i, ex) {
      if (!q) return "";
      return '<div class="edu-q">'
        + '<div class="edu-qhead"><b>Q' + (i + 1) + '</b>' + (ex ? '<span class="edu-tag">Worked example</span>' : '<span class="edu-tag">Class evaluation</span>') + "</div>"
        + '<div class="edu-qtext">' + esc(q.q) + "</div>"
        + '<div class="edu-opts">' + (q.o || []).map(function (o, k) { return '<div class="edu-opt">' + ["A", "B", "C", "D"][k] + ". " + esc(o) + "</div>"; }).join("") + "</div>"
        + '<button type="button" class="edu-mini" onclick="EDU.reveal(\'eduExp' + i + '\', this)">👁 Show answer &amp; explanation</button>'
        + '<div class="edu-exp" id="eduExp' + i + '" hidden><b>Answer: ' + ["A", "B", "C", "D"][q.a] + '</b> — ' + esc(q.e) + "</div>"
        + "</div>";
    }
    var exHtml = examples.map(function (q, i) { return qBlock(q, i, true); }).join("");
    var evHtml = evalr.map(function (q, i) { return qBlock(q, i, false); }).join("");
    return '<div class="edu-qwrap"><h5>Worked examples</h5>' + (exHtml || "<p class=\"edu-empty\">Examples will appear here.</p>") + '</div>'
      + '<div class="edu-qwrap"><h5>Class evaluation</h5>' + (evHtml || "<p class=\"edu-empty\">Evaluation questions will appear here.</p>") + "</div>";
  }
  function kwArr(subj, topic) {
    var ex = extraTopic(subj, topic);
    if (ex) return ex[1] || [];
    try {
      var ce = curEntry(subj, topic);
      if (ce && ce[1]) return ce[1];
    } catch (e) {}
    try { var tp = (TOPICS[subj] || []).filter(function (x) { return x[0] === topic; })[0]; return tp ? tp[1] : []; } catch (e) { return []; }
  }
  function reveal(id, btn) {
    var el = $(id);
    if (el && btn) {
      el.hidden = !el.hidden;
      btn.textContent = el.hidden ? "👁 Show answer & explanation" : "🙈 Hide answer";
    }
  }
  function lessonDrill(subj, topic, cls) {
    try {
      close();
      if (window.drillSubject) drillSubject(subj === "All subjects" ? null : subj, 10);
    } catch (e) { toast("Could not open the drill — choose a paper from the home screen", "⚠️"); }
  }
  function lessonPrint() {
    var subj = state.subj, topic = state.topic, cls = state.cls;
    if (!topic) return toast("Choose a topic first", "⚠️");
    var w = window.open("", "eduPrint", "width=760,height=900");
    if (!w) return toast("Allow pop-ups to print the lesson", "⚠️");
    var kws = kwArr(subj, topic);
    var card = notesOf(subj)[topic] || "";
    var bullets = card ? card.split(". ").filter(function (x) { return x && x.length > 2; }).map(function (x) { return "<li>" + esc(x.trim()) + "</li>"; }).join("") : "<li>See worked example.</li>";
    var objs = lessonObjectives(topic, kws).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    w.document.write(
      "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Lesson Note - " + esc(topic) + "</title>" +
      "<style>body{font-family:Georgia,serif;padding:24px;color:#111} h1{font-size:1.4rem} .box{border:1px solid #999;border-radius:8px;padding:12px;margin:14px 0} small{color:#666}</style></head><body>" +
      "<h1>🎓 Lesson Note — " + esc(subj) + "</h1>" +
      "<p><b>Class:</b> " + esc(cls) + " · <b>Topic:</b> " + esc(topic) + "</p>" +
      "<div class='box'><b>Curriculum context.</b> " + esc(contentPara(subj, topic, kws, cls)) + "</div>" +
      "<div class='box'><h3>🎯 Objectives</h3><ul>" + objs + "</ul></div>" +
      "<div class='box'><h3>📌 Key points</h3><ul>" + bullets + "</ul></div>" +
      "<div class='box'><h3>✍️ Class evaluation</h3>" +
      matchQuestions(subj, topic, kws, classList().indexOf(cls) < 0 ? 2 : classList().indexOf(cls), 4).map(function (q, i) {
        return "<p><b>" + (i + 1) + ".</b> " + esc(q.q) + "</p><ol type='A'><li>" + esc(q.o[0]) + "</li><li>" + esc(q.o[1]) + "</li><li>" + esc(q.o[2]) + "</li><li>" + esc(q.o[3]) + "</li></ol>";
      }).join("") + "</div>" +
      "<p><small>Generated by MAMSS Prep · © merebari web</small></p></body></html>");
    w.document.close(); w.focus();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 350);
  }

  /* ---------- CBT ---------- */
  var CBT = null;
  function cbtRoute() {
    var subs = subjectList(), b = body(); if (!b) return;
    b.innerHTML =
      '<div class="edu-sec">'
      + '<h3>💻 Computer-Based Test (CBT)</h3>'
      + '<p class="edu-lede">A real CBT experience for class tests or WAEC/NECO-style practice: candidate registration, timed answering, an answer-sheet grid, flagging, submission and a printable result slip.</p>'
      + '<div class="edu-cbt-wrap">'
      + '<div class="edu-card">'
      + '<h4>Candidate registration</h4>'
      + '<label class="edu-field">Candidate name<br><input class="edu-input" id="cbtName" maxlength="80" placeholder="e.g. Adebayo Funke"></label>'
      + '<label class="edu-field">School / centre<br><input class="edu-input" id="cbtSchool" maxlength="120" placeholder="e.g. Government College, Lagos"></label>'
      + '<div class="edu-pickrow">'
      + '<label>Class <select class="edu-sel" id="cbtCls">' + classList().map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") + "</select></label>"
      + "<label>Subject <select class=\"edu-sel\" id=\"cbtSub\">" + subs.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("") + "</select></label>"
      + '</div>'
      + '<div class="edu-pickrow">'
      + '<label>Questions <select class="edu-sel" id="cbtCount"><option>10</option><option selected>20</option><option>30</option><option>50</option><option>100</option></select></label>'
      + '<label>Time (minutes) <select class="edu-sel" id="cbtMins"><option>15</option><option>30</option><option>45</option><option selected>60</option></select></label>'
      + "</div>"
      + '<label class="edu-check"><input type="checkbox" id="cbtAgree"> I have read and will obey the CBT rules. I understand that switching tabs or windows may be recorded and that malpractice is a serious offence.</label>'
      + '<button type="button" class="edu-btn gold" id="cbtStart" style="margin-top:12px">▶ Start CBT</button>'
      + "</div>"
      + '<div class="edu-card edu-help"><h4>📋 How the CBT works</h4>'
      + "<ol>"
      + "<li>Fill the candidate details and choose subject, class, number of questions and time.</li>"
      + "<li>On the start screen confirm the details, then begin when you are ready.</li>"
      + "<li>Use <b>Previous</b> / <b>Next</b>, the answer-sheet grid, and the <b>Flag</b> button for questions you want to return to.</li>"
      + "<li>Submit your test. You will get a full review with explanations and a printable result slip with a WAEC/NECO-style grade.</li>"
      + "</ol>"
      + "<p>Because this is a practice app, the review screen shows the correct answers and explanations so you can learn from every question.</p></div>"
      + "</div>"
      + "</div>";
    var btn = $("cbtStart"); if (btn) btn.onclick = cbtStart;
  }
  function cbtStart() {
    var subj = $("cbtSub") ? $("cbtSub").value : state.subj;
    var cls = $("cbtCls") ? $("cbtCls").value : state.cls;
    var cnt = +($("cbtCount") ? $("cbtCount").value : 20);
    var mins = +($("cbtMins") ? $("cbtMins").value : 60);
    var name = $("cbtName") ? $("cbtName").value.trim() : "";
    var school = $("cbtSchool") ? $("cbtSchool").value.trim() : "";
    var agree = $("cbtAgree") ? $("cbtAgree").checked : false;
    if (!name) return toast("Enter the candidate name", "⚠️");
    if (!agree) return toast("Tick the rules box before starting", "⚠️");
    var ci = classList().indexOf(cls); if (ci < 0) ci = 2;
    var qs = shuffle(questionsFor(ci, subj)).slice(0, cnt);
    if (qs.length < cnt) return toast("Not enough questions for that class and subject", "⚠️");
    CBT = {
      subj: subj, cls: cls, name: name, school: school, mins: mins, count: cnt,
      qs: qs, idx: 0, answers: {}, flags: {}, started: Date.now(), deadline: Date.now() + mins * 60000, submitted: false, timer: null
    };
    cbtIntro();
  }
  function cbtIntro() {
    var b = body(); if (!b || !CBT) return;
    b.innerHTML = '<div class="edu-sec"><h3>💻 CBT — confirm and begin</h3>'
      + '<div class="edu-card">'
      + '<p><b>Candidate:</b> ' + esc(CBT.name) + (CBT.school ? "<br><b>School/Centre:</b> " + esc(CBT.school) : "") + "</p>"
      + '<p><b>Class:</b> ' + esc(CBT.cls) + ' · <b>Subject:</b> ' + esc(CBT.subj) + "<br><b>Questions:</b> " + CBT.count + " · <b>Time:</b> " + CBT.mins + " minutes</p>"
      + '<div class="edu-rules"><b>INSTRUCTIONS</b><ul>'
      + "<li>Answer ALL questions. Each question carries 1 mark.</li>"
      + "<li>Every question has four options A–D. Choose only one.</li>"
      + "<li>There is no negative marking.</li>"
      + "<li>Use the flag button to mark a question for revision.</li>"
      + "<li>Do not open other tabs or windows while the test is running.</li>"
      + "</ul></div>"
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">'
      + '<button type="button" class="edu-btn gold" onclick="EDU.cbtBegin()">▶ Begin CBT</button>'
      + '<button type="button" class="edu-btn" onclick="EDU.go(\'cbt\')">↩ Back to setup</button>'
      + "</div></div></div>";
  }
  function cbtBegin() {
    if (!CBT) return;
    var m = $("eduModal"); if (!m) return;
    var header = '<div class="edu-cbt-top">'
      + '<div><b>💻 CBT</b><small class="edu-cbt-subj">' + esc(CBT.subj) + " · " + esc(CBT.cls) + " · " + CBT.count + " questions</small></div>"
      + '<div class="edu-cbt-timer" id="cbtClock"><b>⏱ ' + fmtTime((CBT.deadline - Date.now()) / 1000) + "</b></div>"
      + '<button type="button" class="edu-mini" onclick="EDU.cbtSubmitNow()">✓ Submit now</button>'
      + "</div>";
    m.innerHTML = shellHtml("cbt").replace('<div class="edu-body" id="eduSBody"></div>', '<div class="edu-body" id="eduSBody">' + header + '<div class="edu-cbt" id="cbtBody"></div></div>');
    cbtPaint();
    if (CBT.timer) clearInterval(CBT.timer);
    CBT.timer = setInterval(cbtTick, 1000);
  }
  function cbtTick() {
    if (!CBT || CBT.submitted) return;
    var left = Math.max(0, Math.round((CBT.deadline - Date.now()) / 1000));
    var c = $("cbtClock"); if (c) c.innerHTML = "<b>⏱ " + fmtTime(left) + "</b>";
    if (left <= 0) cbtSubmitNow(true);
  }
  function cbtPaint() {
    var b = $("cbtBody"); if (!b || !CBT) return;
    var q = CBT.qs[CBT.idx] || {};
    var ans = CBT.answers[CBT.idx];
    var flags = [];
    CBT.qs.forEach(function (x, i) {
      flags.push('<button type="button" class="edu-cell' + (CBT.answers[i] !== undefined ? " done" : "") + (CBT.flags[i] ? " flag" : "") + (i === CBT.idx ? " on" : "") + '" onclick="EDU.cbtGo(' + i + ')" title="Question ' + (i + 1) + '">' + (i + 1) + "</button>");
    });
    var answered = Object.keys(CBT.answers).length;
    var flagCount = Object.keys(CBT.flags).length;
    b.innerHTML =
      '<div class="edu-cbt-q">'
      + '<div class="edu-cbt-qhead"><span class="edu-cell on">' + (CBT.idx + 1) + "</span><b>" + esc(CBT.subj) + "</b><small>" + esc(CBT.cls) + " · CBT</small><button type='button' class='edu-mini' onclick='EDU.cbtFlag()'>" + (CBT.flags[CBT.idx] ? "🚩 Flagged" : "🚩 Flag") + "</button></div>"
      + '<div class="edu-cbt-qtext">' + esc(q.q) + "</div>"
      + '<div class="edu-opts">' + (q.o || []).map(function (o, k) {
        return '<button type="button" class="edu-opt' + (ans === k ? " on" : "") + '" onclick="EDU.cbtPick(' + k + ')">' + ["A", "B", "C", "D"][k] + ". " + esc(o) + "</button>";
      }).join("") + "</div>"
      + "</div>"
      + '<div class="edu-cbt-actions">'
      + '<button type="button" class="edu-btn" onclick="EDU.cbtPrev()" ' + (CBT.idx === 0 ? "disabled" : "") + ">← Previous</button>"
      + '<button type="button" class="edu-btn gold" onclick="EDU.cbtNext()" ' + (CBT.idx >= CBT.count - 1 ? "disabled" : "") + ">Next →</button>"
      + "</div>"
      + '<div class="edu-grid"><div class="edu-card"><b>Answer sheet</b><div class="edu-sheet">' + flags.join("") + "</div></div>"
      + '<div class="edu-card"><h5>Progress</h5><div class="edu-bar"><div style="width:' + Math.round(answered / CBT.count * 100) + '%"></div></div>'
      + "<p>" + answered + " answered · " + flagCount + " flagged</p></div></div>";
  }
  function cbtPick(i) {
    if (!CBT) return;
    CBT.answers[CBT.idx] = i;
    cbtPaint();
  }
  function cbtFlag() {
    if (!CBT) return;
    CBT.flags[CBT.idx] = !CBT.flags[CBT.idx];
    cbtPaint();
  }
  function cbtGo(i) { if (CBT) { CBT.idx = Math.max(0, Math.min(CBT.count - 1, i)); cbtPaint(); } }
  function cbtPrev() { cbtGo((CBT ? CBT.idx : 0) - 1); }
  function cbtNext() { cbtGo((CBT ? CBT.idx : 0) + 1); }
  function cbtSubmitNow() {
    if (!CBT || CBT.submitted) return;
    var n = CBT.qs.length;
    var answered = Object.keys(CBT.answers).length;
    if (answered < n) {
      var ok = confirm("You have answered " + answered + " of " + n + " questions. Submit anyway?");
      if (!ok) return;
    }
    if (CBT.timer) { clearInterval(CBT.timer); CBT.timer = null; }
    CBT.submitted = true;
    cbtReview();
  }
  function cbtReview() {
    if (!CBT) return;
    var m = $("eduModal"); if (!m) return;
    var total = CBT.qs.length, correct = 0;
    CBT.qs.forEach(function (q, i) { if (CBT.answers[i] === q.a) correct++; });
    var pct = Math.round(correct / total * 100);
    var timeUsed = Math.round((Date.now() - CBT.started) / 1000);
    var grade = gradeFor(pct);
    var head = '<div class="edu-cbt-top"><div><b>📄 CBT Result</b><small class="edu-cbt-subj">' + esc(CBT.subj) + " · " + esc(CBT.cls) + "</small></div>"
      + '<button type="button" class="edu-mini" onclick="EDU.cbtPrint()">🖨 Print result slip</button></div>';
    m.innerHTML = shellHtml("cbt").replace('<div class="edu-body" id="eduSBody"></div>',
      '<div class="edu-body" id="eduSBody">' + head +
      '<div class="edu-result">'
      + '<div class="edu-result-grid">'
      + '<div><b>Candidate</b><span>' + esc(CBT.name) + "</span></div>"
      + '<div><b>Class / Subject</b><span>' + esc(CBT.cls) + " · " + esc(CBT.subj) + "</span></div>"
      + '<div><b>Score</b><span>' + correct + " / " + total + " (" + pct + "%)</span></div>"
      + '<div><b>Grade</b><span class="edu-grade">' + grade + "</span></div>"
      + '<div><b>Time used</b><span>' + fmtTime(timeUsed) + "</span></div>"
      + '<div><b>Verdict</b><span>' + esc(verdictFor(pct)) + "</span></div>"
      + "</div>"
      + '<div class="edu-bar"><div style="width:' + pct + '%"></div></div>'
      + "</div>"
      + '<h4>Review &amp; explanations</h4>'
      + CBT.qs.map(function (q, i) {
        var a = CBT.answers[i];
        var ok = a === q.a;
        return '<div class="edu-q">'
          + '<div class="edu-qhead"><b>Q' + (i + 1) + "</b>" + (CBT.flags[i] ? "<span class=\"edu-tag\">🚩 Flagged</span>" : "") + "<span class=\"edu-tag " + (ok ? "ok" : "no") + "\">" + (ok ? "✓ Correct" : "✗ Wrong") + "</span></div>"
          + '<div class="edu-qtext">' + esc(q.q) + "</div>"
          + '<div class="edu-opts">' + (q.o || []).map(function (o, k) {
            var cls = "edu-opt" + (k === q.a ? " ok" : (k === a ? " no" : ""));
            return '<div class="' + cls + '">' + ["A", "B", "C", "D"][k] + ". " + esc(o) + (k === q.a ? " ✓" : "") + "</div>";
          }).join("") + "</div>"
          + '<div class="edu-exp" style="display:block"><b>Explanation:</b> ' + esc(q.e) + "</div>"
          + "</div>";
      }).join("")
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">'
      + '<button type="button" class="edu-btn gold" onclick="EDU.cbtBegin()">↺ Retake</button>'
      + '<button type="button" class="edu-btn" onclick="EDU.go(\'cbt\')">↩ New CBT</button>'
      + '<button type="button" class="edu-btn" onclick="EDU.go(\'notes\')">📚 Go to lesson notes</button>'
      + "</div></div>");
  }
  function cbtPrint() {
    if (!CBT) return;
    var total = CBT.qs.length, correct = 0;
    CBT.qs.forEach(function (q, i) { if (CBT.answers[i] === q.a) correct++; });
    var pct = Math.round(correct / total * 100);
    var w = window.open("", "cbtResult", "width=760,height=900");
    if (!w) return toast("Allow pop-ups to print the result", "⚠️");
    w.document.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title>CBT Result</title><style>body{font-family:Georgia,serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #999;padding:7px;text-align:left}.g{font-size:1.4rem;color:#1a6}</style></head><body>"
      + "<h1>NIGERIAN SENIOR SECONDARY CBT — RESULT SLIP</h1><p>© merebari web · generated by MAMSS Prep</p>"
      + "<table><tr><td><b>Candidate</b></td><td>" + esc(CBT.name) + "</td><td><b>School / Centre</b></td><td>" + esc(CBT.school || "—") + "</td></tr>"
      + "<tr><td><b>Class</b></td><td>" + esc(CBT.cls) + "</td><td><b>Subject</b></td><td>" + esc(CBT.subj) + "</td></tr>"
      + "<tr><td><b>Date</b></td><td>" + new Date().toLocaleDateString("en-GB") + "</td><td><b>Time used</b></td><td>" + fmtTime((Date.now() - CBT.started) / 1000) + "</td></tr>"
      + "<tr><td><b>Score</b></td><td>" + correct + " / " + total + " (" + pct + "%)</td><td><b>Grade</b></td><td class='g'>" + gradeFor(pct) + "</td></tr></table>"
      + "<p>" + esc(verdictFor(pct)) + "</p>"
      + "<p><small>This result slip is a practice record, not an official examination certificate.</small></p></body></html>");
    w.document.close(); w.focus();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 350);
  }

  /* ---------- scheme of work ---------- */
  function schemeRoute() {
    var b = body(); if (!b) return;
    var subs = subjectList(), cls = state.cls || "SS3";
    b.innerHTML = '<div class="edu-sec"><h3>🗓 Scheme of Work</h3>'
      + '<p class="edu-lede">A suggested term-by-term scope and sequence (1st, 2nd and 3rd terms) for every SS1–SS3 subject. It maps to the same topics used by the question bank and lesson notes, so a teacher can plan straight into the app.</p>'
      + '<div class="edu-pickrow">'
      + '<label>Class <select class="edu-sel" id="schCls">' + classList().map(function (c) { return '<option value="' + esc(c) + '"' + (c === cls ? " selected" : "") + '>' + esc(c) + "</option>"; }).join("") + "</select></label>"
      + '<label>Subject <select class="edu-sel" id="schSub">' + subs.map(function (s) { return '<option value="' + esc(s) + '"' + (s === state.subj ? " selected" : "") + '>' + esc(s) + "</option>"; }).join("") + "</select></label>"
      + "</div>"
      + '<div class="edu-scheme" id="schBody">' + schemeHtml(state.subj, cls) + "</div></div>";
    var sc = $("schCls"), ss = $("schSub");
    if (sc) sc.onchange = function () { state.cls = sc.value; $("schBody").innerHTML = schemeHtml(state.subj, state.cls); };
    if (ss) ss.onchange = function () { state.subj = ss.value; $("schBody").innerHTML = schemeHtml(state.subj, state.cls); };
    curEnsure(function () { var sb = $("schBody"); if (sb) sb.innerHTML = schemeHtml(state.subj, state.cls); });
  }
  function schemeHtml(subj, cls) {
    var rows = schemeFor(subj, cls);
    if (!rows.length) return "<p class=\"edu-empty\">No scheme available for this subject yet.</p>";
    return '<div class="edu-grid3">' + rows.map(function (r) {
      var meta = r[0];
      var items = r[1].map(function (w) {
        return '<div class="edu-week"><b>' + esc(w.week) + "</b><span>" + esc(w.topic) + "</span></div>";
      }).join("");
      return '<div class="edu-card"><h4>' + esc(meta.term) + '</h4><small class="edu-sub-label">' + esc(meta.focus) + "</small><div class=\"edu-weeklist\">" + items + "</div></div>";
    }).join("") + "</div>" +
      '<div class="edu-note" style="margin-top:12px"><b>Teaching tip.</b> Use one week on each row. Link each topic to its lesson note in the <b>📚 Lesson Notes</b> tab, then set the class a 10-question CBT from the <b>💻 CBT</b> tab at the end of every unit.</div>';
  }

  /* ---------- syllabus ---------- */
  function syllabusRoute() {
    var b = body(); if (!b) return;
    var subs = subjectList(), cls = state.cls || "SS3";
    b.innerHTML = '<div class="edu-sec"><h3>🧭 SS1–SS3 Syllabus Map</h3>'
      + '<p class="edu-lede">The complete Nigerian Senior Secondary syllabus for all 19 subjects — 684 topics laid out term by term (1st, 2nd and 3rd) across SS1–SS3. Every topic on the map has a lesson note, practice questions and a scheme-of-work slot, so teachers and students can see the whole three-year course at a glance.</p>'
      + '<div class="edu-pickrow"><label>Class <select class="edu-sel" id="sylCls">' + classList().map(function (c) { return '<option value="' + esc(c) + '"' + (c === cls ? " selected" : "") + '>' + esc(c) + "</option>"; }).join("") + "</select></label></div>"
      + '<div class="edu-grid" id="sylBody">' + syllabusHtml(cls) + "</div></div>";
    var sc = $("sylCls"); if (sc) sc.onchange = function () { state.cls = sc.value; $("sylBody").innerHTML = syllabusHtml(state.cls); };
    curEnsure(function () { var sb = $("sylBody"); if (sb) sb.innerHTML = syllabusHtml(state.cls); });
  }
  function syllabusHtml(cls) {
    var subs = subjectList(), hasSyll = false;
    try { hasSyll = typeof window.SYLL !== "undefined" && window.SYLL && Object.keys(window.SYLL).length >= 19; } catch (e) {}
    return '<div class="edu-grid3">' + subs.map(function (s) {
      if (hasSyll && window.SYLL[s] && window.SYLL[s].length === 9) {
        var srows = window.SYLL[s];
        var terms = [["1st Term", srows.slice(0, 3)], ["2nd Term", srows.slice(3, 6)], ["3rd Term", srows.slice(6, 9)]];
        var tHtml = terms.map(function (tr) {
          return '<div class="edu-sub"><b>' + tr[0] + '</b><div>' +
            tr[1].map(function (r) { return r.map(function (t) { return '<span class="edu-pill">' + esc(t) + "</span>"; }).join(""); }).join("") + "</div></div>";
        }).join("");
        return '<div class="edu-card"><h4>' + esc(s) + ' <small>' + esc(cls) + "</small></h4>" +
          '<p class="edu-sub-label">' + esc(subjectCurriculum(s)) + "</p>" + tHtml + "</div>";
      }
      var topics = topicsOf(s);
      var items = topics.map(function (t) { return '<span class="edu-pill">' + esc(t[0]) + "</span>"; }).join("");
      return '<div class="edu-card"><h4>' + esc(s) + ' <small>' + esc(cls) + "</small></h4>" +
        '<p class="edu-sub-label">' + esc(subjectCurriculum(s)) + "</p>" + (items || "<p class=\"edu-empty\">No topics listed.</p>") + "</div>";
    }).join("") + "</div>";
  }

  /* ---------- marking guide ---------- */
  function marksRoute() {
    var b = body(); if (!b) return;
    var grades = [
      [75, 100, "A1", "Excellent; distinction-level performance."],
      [70, 74, "B2", "Very good; clearly above average."],
      [65, 69, "B3", "Good; strong credit performance."],
      [60, 64, "C4", "Good; above average."],
      [55, 59, "C5", "Fair credit; adequate."],
      [50, 54, "C6", "Credit pass; sufficiency."],
      [45, 49, "D7", "Pass; weak but acceptable."],
      [40, 44, "E8", "Pass; fail threshold."],
      [0, 39, "F9", "Fail."]
    ];
    b.innerHTML = '<div class="edu-sec"><h3>🏅 Marking Guide</h3>'
      + '<p class="edu-lede">The widely-used WAEC/NECO 9-point grading scale, plus quick marking rules for teachers marking CBT results in class.</p>'
      + '<div class="edu-card"><h4>Grade scale</h4><table class="edu-table"><thead><tr><th>Score (%)</th><th>Grade</th><th>Description</th></tr></thead><tbody>'
      + grades.map(function (g) { return "<tr><td>" + g[0] + "–" + g[1] + "</td><td><b>" + g[2] + "</b></td><td>" + esc(g[3]) + "</td></tr>"; }).join("")
      + "</tbody></table></div>"
      + '<div class="edu-grid2">'
      + '<div class="edu-card"><h4>Marking rules</h4><ul>'
      + "<li>Each objective question carries 1 mark; there is no negative marking.</li>"
      + "<li>Score = correct answers ÷ total questions × 100.</li>"
      + "<li>A candidate who scores below C6 should redo the lesson and retake a shorter test.</li>"
      + "<li>Flags and unfinished questions are the best revision targets — not the questions the candidate already knew.</li>"
      + "</ul></div>"
      + '<div class="edu-card"><h4>Teacher’s quick checklist</h4><ul>'
      + "<li>Has the whole class seen the topic’s key facts?</li>"
      + "<li>Did the class attempt the worked example before the answer was revealed?</li>"
      + "<li>Which two topics need reteaching next week?</li>"
      + "<li>Are the weakest students getting a 10-question CBT for confidence?</li>"
      + "</ul></div></div>"
      + '<div class="edu-note"><b>Tip.</b> Use the <b>💻 CBT</b> tab to generate a test, then this guide to grade the result slip instantly.</div></div>';
  }

  /* ---------- css ---------- */
  function injectCss() {
    if ($("eduCss")) return;
    var c = DOC.createElement("style");
    c.id = "eduCss";
    c.textContent =
      ".edu-launcher{position:fixed;right:14px;top:calc(14px + env(safe-area-inset-top));z-index:99;display:inline-flex;align-items:center;min-height:40px;gap:8px;background:var(--card-solid,#fff);border:1px solid var(--card-border,#d8cdb4);border-radius:999px;padding:8px 14px;cursor:pointer;box-shadow:var(--shadow,0 8px 24px -12px rgba(0,0,0,.35));color:var(--ink,#1c1626);font-family:inherit;font-size:.82rem;font-weight:700;transition:.2s}.edu-launcher:hover{transform:translateY(-2px);border-color:var(--gold,#c9a25f)}.edu-launch-ico{font-size:1.15rem}.edu-launch-txt{display:none}@media(min-width:520px){.edu-launch-txt{display:inline}}" +
      ".edu-ov{position:fixed;inset:0;z-index:160;background:rgba(10,8,16,.55);display:flex;align-items:center;justify-content:center;padding:10px}.edu-modal{position:relative;width:min(950px,100%);max-height:92vh;overflow:auto;background:var(--bg,#f5efe4);color:var(--ink,#1c1626);border-radius:18px;box-shadow:0 30px 70px -20px rgba(0,0,0,.5)}.edu-head{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--card-border,#ddd2b8);background:var(--card-solid,#fffaf0)}.edu-brand b{display:block;font-size:1.05rem}.edu-brand small{color:var(--mut,#7b736a);font-size:.7rem}.edu-x{background:transparent;border:1px solid var(--card-border,#ddd2b8);border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:1rem;color:var(--ink)}.edu-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 14px;border-bottom:1px solid var(--card-border,#ddd2b8);background:var(--card-solid,#fffaf0)}.edu-tab{border:1px solid var(--card-border,#ddd2b8);background:var(--bg,#f5efe4);color:var(--ink);border-radius:999px;padding:8px 12px;font-size:.78rem;cursor:pointer;white-space:nowrap;font-family:inherit}.edu-tab.on{background:var(--green-d,#1f8a68);border-color:var(--green-d,#1f8a68);color:#fff}.edu-body{padding:16px 18px 24px}.edu-foot{padding:10px 18px;border-top:1px solid var(--card-border,#ddd2b8);color:var(--mut,#7b736a);font-size:.68rem;text-align:center;background:var(--card-solid,#fffaf0)}" +
      ".edu-sec h3{font-size:1.25rem;margin:2px 0 8px;color:var(--green-d,#1f8a68)}.edu-lede{font-size:.86rem;line-height:1.6;color:var(--ink-2,#3f3a47);margin:0 0 16px;max-width:760px}.edu-pickrow{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin:10px 0}.edu-pickrow label,.edu-field{display:flex;flex-direction:column;font-size:.7rem;letter-spacing:.05em;color:var(--mut,#7b736a);text-transform:uppercase;font-weight:700}.edu-sel,.edu-input{border:1.5px solid var(--chip-border,#c9bd9d);background:var(--opt-bg,#fffaf0);color:var(--ink,#1c1626);border-radius:10px;padding:10px 12px;margin-top:4px;font-size:.9rem;font-family:inherit;min-width:150px}.edu-input{min-width:0;width:100%;text-transform:none}.edu-card{background:var(--card,#fffaf0);border:1px solid var(--card-border,#ddd2b8);border-radius:14px;padding:14px 16px;margin-bottom:14px}.edu-card h4{margin:0 0 8px;font-size:.96rem;color:var(--gold-d,#8a5f24)}.edu-card h5{margin:4px 0 8px;font-size:.88rem;color:var(--green-d,#1f8a68)}.edu-card-mini{background:var(--panel,#f7f0e2);border:1px dashed var(--card-border,#ddd2b8);border-radius:10px;padding:10px 12px;margin:8px 0;font-size:.86rem;line-height:1.7;color:var(--ink-2,#3f3a47)}.edu-grid{display:grid;gap:14px}.edu-grid2{display:grid;gap:14px;grid-template-columns:1fr;margin-top:14px}@media(min-width:860px){.edu-grid2{grid-template-columns:1fr 1fr}.edu-grid3{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}}@media(max-width:860px){.edu-grid3{grid-template-columns:1fr}}" +
      ".edu-chiprow{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0}.edu-chip{border:1.5px solid var(--chip-border,#c9bd9d);background:var(--chip-bg,#fffaf0);color:var(--ink);padding:7px 11px;border-radius:999px;font-size:.76rem;cursor:pointer;font-family:inherit}.edu-chip.on{background:var(--green-d,#1f8a68);border-color:var(--green-d,#1f8a68);color:#fff}.edu-sub{margin-top:12px}.edu-sub h4,.edu-sub b{color:var(--ink)}.edu-sub ul{margin:6px 0 0;padding-left:18px;font-size:.86rem;line-height:1.7}.edu-note{font-size:.86rem;line-height:1.68;color:var(--ink-2,#3f3a47)}.edu-btn{border:1.5px solid var(--chip-border,#c9bd9d);background:var(--opt-bg,#fffaf0);color:var(--ink);border-radius:999px;padding:9px 14px;font-size:.8rem;cursor:pointer;font-family:inherit}.edu-btn.gold{background:var(--green-d,#1f8a68);border-color:var(--green-d,#1f8a68);color:#fff}.edu-btn:hover{border-color:var(--gold,#c9a25f)}.edu-btn[disabled]{opacity:.45;cursor:not-allowed}" +
      ".edu-q{background:var(--panel,#f7f0e2);border:1px solid var(--card-border,#ddd2b8);border-radius:12px;padding:11px 13px;margin-bottom:10px}.edu-qhead{display:flex;align-items:center;gap:8px;font-size:.74rem;color:var(--mut,#7b736a);margin-bottom:7px}.edu-qhead b{font-size:.95rem;color:var(--green-d,#1f8a68)}.edu-qtext{font-size:.95rem;line-height:1.55;margin-bottom:9px}.edu-opts{display:grid;gap:7px;margin-bottom:8px}.edu-opt{text-align:left;border:1.5px solid var(--opt-border,#d4c8aa);background:var(--opt-bg,#fffaf0);color:var(--ink);border-radius:10px;padding:9px 11px;font-size:.86rem;cursor:pointer;font-family:inherit}.edu-opt.on,.edu-opt.ok{border-color:var(--green-2,#1f8a68);background:var(--green-l,#e4f2ec)}.edu-opt.no{border-color:var(--red,#c0392b);background:var(--red-l,#fbe9e7)}.edu-mini{border:1px solid var(--card-border,#ddd2b8);background:transparent;border-radius:999px;padding:6px 10px;font-size:.72rem;cursor:pointer;color:var(--ink);font-family:inherit}.edu-tag{background:var(--panel,#f7f0e2);border-radius:999px;padding:2px 8px;font-size:.68rem}.edu-tag.ok{background:var(--green-l,#e4f2ec);color:#1a6a4a}.edu-tag.no{background:var(--red-l,#fbe9e7);color:#a93226}.edu-exp{font-size:.83rem;line-height:1.6;color:var(--ink-2,#3f3a47);background:var(--green-l,#e4f2ec);border-radius:9px;padding:8px 10px;margin-top:7px}.edu-empty{color:var(--mut,#7b736a);font-size:.85rem}" +
      ".edu-check{display:flex;gap:8px;align-items:flex-start;font-size:.78rem;color:var(--ink-2,#3f3a47);line-height:1.5;margin-top:12px}.edu-help li{font-size:.82rem;line-height:1.65}.edu-rules{background:var(--panel,#f7f0e2);border:1px dashed var(--card-border,#ddd2b8);border-radius:10px;padding:10px 14px;margin-top:12px;font-size:.8rem}.edu-rules li{line-height:1.7}.edu-cbt-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between;padding:8px 0 10px;border-bottom:1px solid var(--card-border,#ddd2b8);margin-bottom:12px}.edu-cbt-subj{display:block;font-size:.72rem;color:var(--mut,#7b736a)}.edu-cbt-timer{font-size:1.2rem;font-weight:900;color:var(--green-d,#1f8a68);font-variant-numeric:tabular-nums}.edu-cbt{max-width:720px;margin:0 auto}.edu-cbt-qhead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.8rem;margin-bottom:10px;color:var(--mut,#7b736a)}.edu-cbt-qtext{font-size:1.08rem;line-height:1.65;margin-bottom:14px}.edu-cbt-actions{display:flex;gap:8px;justify-content:space-between;margin:14px 0}.edu-sheet{display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:6px;margin-top:8px}.edu-cell{width:34px;height:34px;border-radius:9px;border:1.5px solid var(--chip-border,#c9bd9d);background:var(--opt-bg,#fffaf0);font-size:.74rem;cursor:pointer;color:var(--ink);font-family:inherit}.edu-cell.done{background:var(--green-l,#e4f2ec);border-color:var(--green-2,#1f8a68)}.edu-cell.flag{border-style:dashed;border-color:var(--gold,#c9a25f)}.edu-cell.on{background:var(--green-d,#1f8a68);color:#fff;border-color:var(--green-d,#1f8a68)}.edu-bar{height:12px;border-radius:999px;background:var(--bar-track,#e7ddc6);overflow:hidden;margin:8px 0}.edu-bar>div{height:100%;background:linear-gradient(90deg,var(--gold-d,#8a5f24),var(--gold,#c9a25f))}" +
      ".edu-result{background:var(--card,#fffaf0);border:1px solid var(--card-border,#ddd2b8);border-radius:14px;padding:16px;margin-bottom:14px}.edu-result-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:10px}.edu-result-grid b{display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mut,#7b736a);margin-bottom:3px}.edu-result-grid span{font-size:.92rem;font-weight:700}.edu-grade{color:var(--green-d,#1f8a68);font-size:1.3rem}" +
      ".edu-scheme{margin-top:14px}.edu-weeklist{display:flex;flex-direction:column;gap:5px;margin-top:10px}.edu-week{display:flex;justify-content:space-between;gap:10px;border:1px solid var(--card-border,#ddd2b8);border-radius:9px;padding:7px 9px;font-size:.78rem;background:var(--panel,#f7f0e2)}.edu-week b{color:var(--gold-d,#8a5f24)}.edu-week span{color:var(--ink-2,#3f3a47);text-align:right}.edu-sub-label{display:block;font-size:.75rem;line-height:1.55;color:var(--mut,#7b736a);margin-bottom:8px}.edu-pill{display:inline-block;background:var(--panel,#f7f0e2);border:1px solid var(--card-border,#ddd2b8);border-radius:999px;padding:4px 9px;font-size:.72rem;margin:2px;color:var(--ink-2,#3f3a47)}.edu-table{width:100%;border-collapse:collapse;font-size:.82rem}.edu-table th,.edu-table td{border:1px solid var(--card-border,#ddd2b8);padding:7px 9px;text-align:left}.edu-table th{background:var(--panel,#f7f0e2);color:var(--gold-d,#8a5f24)}" +
      "@media(max-width:560px){.edu-modal{border-radius:14px}.edu-body{padding:12px 12px 20px}.edu-launcher{right:10px;top:10px}.edu-pickrow .edu-sel{min-width:100%}.edu-btn{width:100%}}" + "/* v16 Lumina — Teaching Suite polish (appended to the edu.js injectCss\n   string by patch_v16.py). Vars come from the app :root. */\n.edu-modal{box-shadow:0 44px 92px -30px rgba(20,35,70,.5),inset 0 2px 0 -1px rgba(201,162,39,.95),inset 0 0 0 1px rgba(201,162,39,.15)}\n.edu-sec h3{font-size:clamp(1.1rem,2.6vw,1.34rem)}\n.edu-card{transition:transform .18s ease,box-shadow .25s ease,border-color .25s ease}\n.edu-card:hover{transform:translateY(-2px);border-color:rgba(201,162,39,.55);box-shadow:0 18px 36px -20px rgba(20,35,70,.42)}\n.edu-chip{border-radius:999px;transition:transform .15s ease,box-shadow .2s ease,border-color .2s ease,background .2s ease,color .2s ease}\n.edu-chip:hover{transform:translateY(-1px)}\n.edu-chip.on{background:var(--grad-gold);border-color:transparent;color:#31220a;font-weight:900;box-shadow:0 10px 20px -10px rgba(201,162,39,.85)}\n.edu-pill{background:rgba(201,162,39,.09);border-color:rgba(201,162,39,.4)}\n.edu-note{border-left:4px solid var(--gold);background:linear-gradient(90deg,rgba(201,162,39,.07),transparent 65%)}\n.edu-q{border-left:3px solid rgba(201,162,39,.55)}\n.edu-table tbody tr{transition:background .15s ease}\n.edu-table tbody tr:hover{background:rgba(201,162,39,.08)}\n.edu-btn{background:var(--grad-gold);border-color:transparent;color:#31220a;font-weight:900;box-shadow:0 10px 20px -10px rgba(201,162,39,.8)}\n.edu-sub b{display:inline-block;padding-bottom:3px;border-bottom:2px solid rgba(201,162,39,.5)}\n"
    + "/* v17 Lumina II — Teaching Suite refinement (appended to the edu.css chain\n   by patch_v17.py). */\n.edu-head{background:linear-gradient(180deg,rgba(201,162,39,.12),transparent);border-bottom:1px solid rgba(201,162,39,.28)}\n.edu-opt{transition:transform .14s ease,border-color .18s ease,background .18s ease}\n.edu-opt:hover{transform:translateY(-1px);border-color:rgba(201,162,39,.6);background:rgba(201,162,39,.07)}\n.edu-tag{background:var(--grad-gold);color:#31220a;font-weight:900;border-radius:999px;padding:2px 10px;box-shadow:0 6px 14px -6px rgba(201,162,39,.8)}\n.edu-week{transition:background .15s ease}\n.edu-week:hover{background:rgba(201,162,39,.09)}\n@media(max-width:560px){\n  .edu-head{padding:10px 12px}\n}\n"
    + "/* v18 Aurum — Teaching Suite first-class: gold question-number chips, refined\n   class/subject selects, gold-tinted mark-scheme tables, modal gold mist. */\n.edu-modal{box-shadow:0 44px 92px -30px rgba(20,35,70,.5),inset 0 2px 0 -1px rgba(201,162,39,.95),inset 0 0 0 1px rgba(201,162,39,.16),0 0 90px -34px rgba(201,162,39,.45)}\n.edu-qhead b{display:inline-grid;place-items:center;min-width:32px;height:32px;border-radius:999px;background:var(--grad-gold);color:#31220a;font-size:.78rem;font-weight:900;box-shadow:0 8px 18px -8px rgba(201,162,39,.85),inset 0 1px 0 rgba(255,255,255,.55)}\n.edu-qhead{display:flex;align-items:center;gap:9px}\n.edu-sel{border:1.5px solid rgba(201,162,39,.5);background:linear-gradient(180deg,var(--card-solid,#fffaf0),var(--panel,#f7f0e2));border-radius:10px;padding:9px 12px;font-weight:700;color:var(--ink,#1c1626);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 8px 18px -12px rgba(20,35,70,.4)}\n.edu-sel:focus-visible{outline:2px solid var(--gold,#c9a227);outline-offset:2px}\n.edu-table th{background:linear-gradient(180deg,rgba(201,162,39,.2),rgba(201,162,39,.07));text-transform:uppercase;letter-spacing:.06em}\n.edu-week b{color:#8a6d1f;display:inline-block;min-width:58px}\n.edu-sub-label b{color:#8a6d1f}\n"
    + "/* v19 — Responsiveness across all devices (Teaching Suite): dvh + safe-area,\n   select fluidity at ultra-narrow, landscape modal handling. */\n.edu-modal{max-height:100dvh}\n.edu-body{padding-bottom:calc(20px + env(safe-area-inset-bottom))}\n@media(max-width:359px){\n  .edu-sel{min-width:0;width:100%}\n  .edu-pickrow{flex-direction:column;align-items:stretch}\n  .edu-chiprow{flex-wrap:wrap}\n  .edu-modal{padding:10px}\n}\n@media(max-height:520px){\n  .edu-modal{max-height:100dvh;border-radius:0}\n  .edu-head{padding:8px 10px}\n}\n";
    DOC.head.appendChild(c);
  }

  /* ---------- exposed ---------- */
  function go(kind) {
    if (kind === "close") return close();
    if (["notes", "cbt", "scheme", "syllabus", "marks"].indexOf(kind) >= 0) state.route = kind;
    open(state.route);
  }
  function topic(t) { state.topic = t; paint(); }

  injectCss();
  injectLauncher();

  window.EDU = window.EDU || {};
  window.EDU.ready = true;
  window.EDU.go = go;
  window.EDU.close = close;
  window.EDU.open = open;
  window.EDU.topic = topic;
  window.EDU.subject = function (s) { try { state.subj = s; var tp = topicsOf(s); state.topic = tp.length ? tp[0][0] : null; paint(); } catch (e) {} };
  window.EDU.reveal = reveal;
  window.EDU.lessonPrint = lessonPrint;
  window.EDU.speak = speak;
  window.EDU.stopSpeak = stopSpeak;
  window.EDU.lessonDrill = lessonDrill;
  window.EDU.cbtBegin = cbtBegin;
  window.EDU.cbtPick = cbtPick;
  window.EDU.cbtFlag = cbtFlag;
  window.EDU.cbtGo = cbtGo;
  window.EDU.cbtPrev = cbtPrev;
  window.EDU.cbtNext = cbtNext;
  window.EDU.cbtSubmitNow = cbtSubmitNow;
  window.EDU.cbtPrint = cbtPrint;
})();
