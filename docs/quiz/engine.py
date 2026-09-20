# -*- coding: utf-8 -*-
"""Question-generation engine: fact forms, parametric fill, dedup, verification."""
import random

LETTERS = ["A", "B", "C", "D"]

def H(x):
    """Human-friendly number formatting."""
    if isinstance(x, float) and abs(x - round(x)) < 1e-9:
        x = int(round(x))
    if isinstance(x, int):
        return str(x)
    return ("%g" % x)

def AN(word):
    return "an" if word[:1].lower() in "aeiou" else "a"

def pad_wrongs(rng, cands, right, need=3, numeric=None, unit="", pre=""):
    """Dedupe candidate wrong options; pad with numeric variants until `need`."""
    out = []
    for s in list(cands):
        if s and s != right and s not in out:
            out.append(s)
    if numeric is not None:
        for v in (2, 0.5, 3, 0.25, 1.5, 4, 5, 0.75, 6, 0.2, 2.5, 8):
            if len(out) >= need:
                break
            x = numeric * v
            s = pre + H(x) + unit
            if s != right and s not in out:
                out.append(s)
    return out[:need]

def mcq_opts(rng, wrongs, right):
    """Shuffle wrongs + the correct option; return (options, correct_index)."""
    opts = list(wrongs) + [right]
    rng.shuffle(opts)
    return opts, opts.index(right)

def SIGNED(co, const, var="x"):
    """Format 'co*var + const' cleanly, e.g. 7x - 10 instead of 7x + -10."""
    if const < 0:
        return f"{co}{var} - {-const}"
    return f"{co}{var} + {const}"

class G:
    def __init__(self, subject, seed=1, blocked=None):
        self.subject = subject
        self.rng = random.Random(seed)
        self.qs = []
        self._texts = set()
        self.blocked = set(blocked or ())

    # ---------- rng helpers ----------
    def choice(self, seq): return self.rng.choice(list(seq))
    def sample(self, seq, n):
        seq = list(seq)
        return self.rng.sample(seq, min(n, len(seq)))
    def shuffle(self, seq):
        s = list(seq); self.rng.shuffle(s); return s
    def randint(self, a, b): return self.rng.randint(a, b)
    def chance(self, p): return self.rng.random() < p
    def pick(self, pairs):  # weighted-ish random pick from list of (weight, value)
        return self.rng.choices([p[1] for p in pairs], weights=[p[0] for p in pairs])[0]

    # ---------- assembly ----------
    def build(self, q, o, a, e, s=None):
        return {"s": s or self.subject, "q": q, "o": list(o), "a": a, "e": e}

    def add(self, q):
        if not q or q["q"] in self._texts or q["q"] in self.blocked:
            return False
        self._texts.add(q["q"])
        self.qs.append(q)
        return True

    def distract(self, correct, unit="", variants=(2, 0.5, 3, 0.25, 1.5, 4), pre=""):
        """3 distinct plausible wrong strings around a numeric answer."""
        right = pre + H(correct) + unit
        cands, seen = [], set()
        for v in variants:
            x = correct * v
            s = pre + H(x) + unit
            if abs(x) > 1e-9 and s not in seen and s != right:
                seen.add(s); cands.append(s)
        for d in (1, 2, 3, 4, 5, 6):
            if len(cands) >= 3: break
            x = correct - d
            s = pre + H(x) + unit
            if abs(x) > 1e-9 and s not in seen and s != right:
                seen.add(s); cands.append(s)
        return self.sample(cands, 3)


    # ---------- filling ----------
    def fill(self, make, target, max_tries=1200):
        tries = 0
        while len(self.qs) < target and tries < max_tries:
            tries += 1
            self.add(make())
        if len(self.qs) < target:
            raise RuntimeError(f"{self.subject}: only {len(self.qs)}/{target} unique questions generated")

    def fill_params(self, fns, target, max_tries=1500):
        if not fns:
            return
        tries = 0
        while len(self.qs) < target and tries < max_tries:
            tries += 1
            for fn in fns:
                if len(self.qs) >= target: break
                self.add(fn(self))
        if len(self.qs) < target:
            raise RuntimeError(f"{self.subject}: params reached only {len(self.qs)}/{target}")

    # ---------- fact forms (entries: (term, definition, category)) ----------
    def _fact_q(self, f, same, others, fmt):
        term, definition, cat = f
        if fmt == 0:   # "Which of the following is {term}?" options = definitions
            opts = self.sample([x[1] for x in others], 3) + [definition]
            self.rng.shuffle(opts)
            return self.build(f"Which of the following is {AN(term)} {term}?", opts,
                              opts.index(definition), f"{term}: {definition}")
        if fmt == 1:   # "What does this description refer to?" options = terms
            opts = self.sample([x[0] for x in others], 3) + [term]
            self.rng.shuffle(opts)
            cap = definition[0].upper() + definition[1:]
            return self.build(f"What does the description below refer to? “{cap}.”", opts,
                              opts.index(term), f"{term}: {definition}")
        if fmt == 2:   # "Which is NOT a {cat}?" answer = intruder
            pool = same if len(same) >= 3 else others
            intr = self.choice([x for x in others if x[2] != cat] or others)
            opts = self.sample([x[0] for x in pool if x[0] != intr[0]], 3) + [intr[0]]
            self.rng.shuffle(opts)
            return self.build(f"Which of the following is NOT {AN(cat)} {cat}?", opts,
                              opts.index(intr[0]), f"{intr[0]} is not {AN(cat)} {cat}; it is {AN(intr[2])} {intr[2]}.")
        if fmt == 4:   # "Which pair is correctly matched?" term—definition
            wrong_defs = self.sample([x[1] for x in others], 3)
            right = f"{term} — {definition}"
            opts = [right] + [f"{term} — {d}" for d in wrong_defs]
            self.rng.shuffle(opts)
            return self.build(f"Consider the term '{term}'. Which of the following pairs is correctly matched?",
                              opts, opts.index(right), f"{term} — {definition}.")
        return None

    def fill_facts(self, entries, target, use_cap=4):
        facts = self.shuffle(entries)
        uses = {f[0]: [] for f in facts}
        guard = 0
        while len(self.qs) < target and guard < 120:
            guard += 1
            for f in facts:
                if len(self.qs) >= target: break
                term, definition, cat = f
                if len(uses.get(term, [])) >= use_cap: continue
                same = [x for x in facts if x[2] == cat and x[0] != term]
                others = [x for x in facts if x[0] != term]
                cand = [0, 1, 4]
                if cat and len(same) >= 3:
                    cand.append(2)
                cand = [c for c in cand if c not in uses[term]]
                if not cand: continue
                fmt = self.choice(cand)
                q = self._fact_q(f, same, others, fmt)
                if q and self.add(q):
                    uses[term].append(fmt)

    def shuffle_qs(self):
        self.qs = self.shuffle(self.qs)
