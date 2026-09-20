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
