# -*- coding: utf-8 -*-
"""Registry of subject generators: subject name -> (module, fixed seed)."""
import importlib

MODS = {}
for _m in ["gen_maths", "gen_english", "gen_biology", "gen_chemistry", "gen_physics",
           "gen_agric", "gen_economics", "gen_government", "gen_literature",
           "gen_geography", "gen_commerce", "gen_computer", "gen_civic"]:
    MODS[_m] = importlib.import_module(_m)

REGISTRY = [
    ("Mathematics",          MODS["gen_maths"],     11),
    ("English Language",     MODS["gen_english"],   13),
    ("Biology",              MODS["gen_biology"],   17),
    ("Chemistry",            MODS["gen_chemistry"], 19),
    ("Physics",              MODS["gen_physics"],   23),
    ("Agricultural Science", MODS["gen_agric"],     29),
    ("Economics",            MODS["gen_economics"], 31),
    ("Government",           MODS["gen_government"],37),
    ("Literature in English",MODS["gen_literature"],41),
    ("Geography",            MODS["gen_geography"], 43),
    ("Commerce",             MODS["gen_commerce"],  47),
    ("Computer Studies",     MODS["gen_computer"],  53),
    ("Civic Education",      MODS["gen_civic"],     59),
]
SUBJECTS = [r[0] for r in REGISTRY]

def question_bank(cls_index, target_per_subject=100):
    """class_index 0=SS1, 1=SS2, 2=SS3 -> {subject: [100 questions]}.

    Cross-subject dedup: each subject is generated with a "blocked" set of
    question stems already used by earlier subjects of the same class, so a
    mixed-class quiz never shows the same question twice. If a subject comes
    up short because of blocking, it is retried with the next seed.
    """
    level = cls_index + 1
    out = {}
    used_stems = set()
    for name, mod, seed in REGISTRY:
        qs = None
        for attempt in range(40):
            qs = mod.generate(level, seed=seed + attempt, target=target_per_subject, blocked=used_stems)
            if len(qs) == target_per_subject:
                break
            qs = None
        if qs is None:
            raise RuntimeError(f"{name} L{level}: could not reach {target_per_subject} unique-in-class questions")
        assert len(qs) == target_per_subject
        assert all(len(q["o"]) == 4 and 0 <= q["a"] <= 3 and q["e"] for q in qs)
        stems = [q["q"] for q in qs]
        assert len(set(stems)) == target_per_subject, f"{name} L{level}: duplicate stems inside subject"
        assert not (set(stems) & used_stems), f"{name} L{level}: cross-subject duplicate"
        used_stems.update(stems)
        out[name] = qs
    return out
