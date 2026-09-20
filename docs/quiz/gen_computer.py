# -*- coding: utf-8 -*-
"""Computer Studies / ICT: facts + binary/unit numeric questions, 100 per level."""
from engine import G, H, pad_wrongs, mcq_opts

SUBJECT = "Computer Studies"

FACTS = {
1: [
 ("computer", "an electronic machine that accepts data, processes it and gives out information", "hardware"),
 ("hardware", "the physical parts of a computer that can be seen and touched", "hardware"),
 ("software", "the set of instructions that tells the computer what to do", "software"),
 ("central processing unit", "the part of the computer that processes data and controls the system", "hardware"),
 ("monitor", "the output device that displays information on a screen", "hardware"),
 ("keyboard", "the main input device used for typing data into the computer", "hardware"),
 ("mouse", "the pointing device used to control the cursor on the screen", "hardware"),
 ("printer", "the output device that produces a hard copy of information", "hardware"),
 ("speaker", "the output device that produces sound from the computer", "hardware"),
 ("scanner", "the input device that copies pictures and documents into the computer", "hardware"),
 ("system unit", "the box that contains the main parts of the computer", "hardware"),
 ("input device", "a device used to enter data into the computer", "hardware"),
 ("output device", "a device used to present results from the computer", "hardware"),
 ("operating system", "the system software that manages the resources of the computer", "software"),
 ("word processor", "the application software used for typing and editing documents", "software"),
 ("spreadsheet", "the application software used for calculations, arranged in rows and columns", "software"),
 ("presentation software", "the application used to create slides for display", "software"),
 ("internet", "the worldwide network that connects computers together", "internet"),
 ("browser", "the software used to view pages on the World Wide Web", "internet"),
 ("search engine", "the tool used to find information on the web", "internet"),
 ("website", "a collection of web pages that belong to one address", "internet"),
 ("email", "the electronic means of sending messages over the internet", "internet"),
 ("World Wide Web", "the system of interlinked pages of information on the internet", "internet"),
 ("URL", "the address of a web page on the internet", "internet"),
 ("ICT", "Information and Communication Technology", "general"),
 ("data", "the raw facts fed into a computer", "general"),
 ("information", "the processed data that is meaningful to the user", "general"),
 ("memory", "the part of the computer that stores data and instructions", "hardware"),
 ("random access memory", "the temporary memory that loses its data when the computer is switched off", "hardware"),
 ("read only memory", "the permanent memory that keeps its contents when the computer is off", "hardware"),
 ("storage device", "a device used to keep data permanently", "hardware"),
 ("flash drive", "a small portable storage device that plugs into a USB port", "hardware"),
 ("joystick", "the input device used for playing games", "hardware"),
 ("microphone", "the input device used for recording sound into the computer", "hardware"),
 ("projector", "the output device that displays computer images on a large screen", "hardware"),
 ("hard disk", "the main permanent storage device inside a computer", "hardware"),
],
2: [
 ("bit", "the smallest unit of data in a computer, either 0 or 1", "data representation"),
 ("byte", "a group of eight bits", "data representation"),
 ("binary", "the number system that uses only the digits 0 and 1", "data representation"),
 ("decimal", "the number system that uses the digits 0 to 9", "data representation"),
 ("virus", "a program that damages or disrupts a computer system", "security"),
 ("malware", "any malicious software that harms a computer system", "security"),
 ("firewall", "a security system that controls traffic between a network and the internet", "security"),
 ("antivirus", "a program that detects and removes computer viruses", "security"),
 ("encryption", "the coding of data so that only authorised users can read it", "security"),
 ("password", "a secret word or phrase used to gain access to a system", "security"),
 ("phishing", "a fraudulent attempt to obtain sensitive information by pretending to be a trusted party", "security"),
 ("hacker", "a person who breaks into computer systems without permission", "security"),
 ("network", "a group of computers connected together to share data and resources", "networking"),
 ("local area network", "a network confined to a small area such as a school building", "networking"),
 ("wide area network", "a network that covers a very large geographical area", "networking"),
 ("metropolitan area network", "a network that covers a city", "networking"),
 ("server", "a computer that provides services to other computers on a network", "networking"),
 ("client", "a computer that receives services from a server", "networking"),
 ("modem", "the device that connects a computer to the internet through a telephone line", "networking"),
 ("router", "the device that directs data packets between networks", "networking"),
 ("protocol", "the set of rules that governs data transmission between computers", "networking"),
 ("IP address", "the unique number that identifies a device on a network", "networking"),
 ("topology", "the layout of computers and cables in a network", "networking"),
 ("star topology", "a network layout in which all nodes connect to a central hub", "networking"),
 ("cloud computing", "the use of computing resources stored on remote servers over the internet", "networking"),
 ("HTML", "the language used to create web pages", "software"),
 ("application software", "the software that performs specific tasks for the user", "software"),
 ("system software", "the software that manages the hardware and provides a platform for applications", "software"),
 ("insertion", "the adding of a new record to a file or database", "data handling"),
 ("retrieval", "the bringing back of stored data when needed", "data handling"),
 ("backup", "a copy of data kept in case the original is lost", "data handling"),
 ("communication", "the process of sending and receiving information", "networking"),
 ("data transmission", "the sending of data from one device to another", "networking"),
 ("laptop", "a small portable computer", "hardware"),
 ("projector", "the output device that displays computer images on a large screen", "hardware"),
],
3: [
 ("program", "a set of instructions that tells a computer what to do", "programming"),
 ("algorithm", "a step-by-step procedure for solving a problem", "programming"),
 ("flowchart", "a diagram that shows the steps of a program using symbols", "programming"),
 ("pseudocode", "a plain-language description of the steps of an algorithm", "programming"),
 ("programming language", "a language used to write instructions for a computer", "programming"),
 ("high-level language", "a programming language that is close to human language, such as Python", "programming"),
 ("low-level language", "a programming language close to machine code, such as assembly", "programming"),
 ("compiler", "the program that translates a high-level language into machine code all at once", "programming"),
 ("interpreter", "the program that translates and executes a high-level language line by line", "programming"),
 ("variable", "a named location in memory that stores a value which can change", "programming"),
 ("constant", "a value that does not change while a program is running", "programming"),
 ("loop", "a programming structure that repeats a set of instructions", "programming"),
 ("array", "a collection of data items of the same type stored under one name", "programming"),
 ("function", "a named block of code that performs a specific task", "programming"),
 ("debugging", "the finding and correcting of errors in a program", "programming"),
 ("syntax error", "an error caused by breaking the rules of a programming language", "programming"),
 ("logical error", "an error in the design of a program that gives wrong results", "programming"),
 ("database", "an organised collection of related data", "databases"),
 ("DBMS", "the software used to create and manage databases", "databases"),
 ("table", "the structure in a relational database that holds records", "databases"),
 ("record", "a complete set of related fields about one item in a database", "databases"),
 ("field", "a single item of data in a database record", "databases"),
 ("primary key", "the field that uniquely identifies each record in a table", "databases"),
 ("query", "a request for specific data from a database", "databases"),
 ("SQL", "the standard language used to query and manage databases", "databases"),
 ("artificial intelligence", "the simulation of human intelligence by machines", "emerging technology"),
 ("robotics", "the branch of technology that deals with the design of robots", "emerging technology"),
 ("virtual reality", "a computer-generated three-dimensional environment that a user can explore", "emerging technology"),
 ("multimedia", "the combination of text, graphics, sound and video in one presentation", "emerging technology"),
 ("e-commerce", "the buying and selling of goods over the internet", "internet"),
 ("e-learning", "the use of electronic media for learning", "internet"),
 ("blog", "an online journal or diary published on the web", "internet"),
 ("social media", "websites and apps that allow users to share content and interact", "internet"),
 ("spreadsheet cell", "the box in a spreadsheet where a row and a column meet", "software"),
 ("spreadsheet formula", "an expression in a spreadsheet that performs a calculation", "software"),
],
}

def bin2dec(g):
    n = g.randint(2, 31)
    b = bin(n)[2:]
    wrongs = pad_wrongs(g.rng, [str(n + 1), str(n - 1), str(n * 2)], str(n), numeric=n)
    o, ai = mcq_opts(g.rng, wrongs, str(n))
    return g.build(f"Convert {b}₂ (binary) to base ten.", o, ai,
                   f"{b}₂ = {sum(int(d) * 2 ** (len(b) - 1 - i) for i, d in enumerate(b))} in base ten.")

def dec2bin(g):
    n = g.randint(5, 40)
    b = bin(n)[2:]
    wrongs = pad_wrongs(g.rng, [b + "0", b + "1", bin(n + 1)[2:]], b)
    o, ai = mcq_opts(g.rng, wrongs, b)
    return g.build(f"Express {n} in base two.", o, ai, f"{n} = {b}₂.")

def units_q(g):
    unit, mult, u = g.choice([("kilobyte", 1024, "bytes"), ("megabyte", 1024, "kilobytes"), ("gigabyte", 1024, "megabytes")])
    n = g.choice([1, 2, 4, 8])
    ans = H(n * mult) + " " + u
    wrongs = pad_wrongs(g.rng, [H(n * 1000) + " " + u, H(n * mult * 2) + " " + u, H(n + mult) + " " + u], ans)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"How many {u} are there in {n} {unit}(s)?", o, ai, f"1 {unit} = {mult} {u}, so {n} × {mult} = {H(n * mult)} {u}.")

FUNCS = {1: [], 2: [bin2dec, units_q], 3: [bin2dec, dec2bin, units_q]}
FACT_TARGET = {1: 100, 2: 94, 3: 92}

def generate(level, seed=1, target=100, blocked=None):
    g = G(SUBJECT, seed, blocked)
    g.lvl = level
    g.fill_facts(FACTS[level], FACT_TARGET[level], use_cap=4)
    g.fill_params(FUNCS[level], target)
    g.shuffle_qs()
    return g.qs
