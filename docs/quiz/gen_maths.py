# -*- coding: utf-8 -*-
"""Mathematics: 100 questions per level (SS1/SS2/SS3), all answers computed & verified."""
from engine import G, H, SIGNED, pad_wrongs, mcq_opts

SUBJECT = "Mathematics"

FACTS = {
1: [
 ("integer", "a whole number that can be positive, negative or zero", "number"),
 ("prime number", "a whole number greater than 1 that has exactly two factors", "number"),
 ("factor", "a number that divides another number exactly", "number"),
 ("multiple", "the product of a given number and any whole number", "number"),
 ("numerator", "the top number of a fraction", "fraction"),
 ("denominator", "the bottom number of a fraction", "fraction"),
 ("improper fraction", "a fraction whose numerator is greater than its denominator", "fraction"),
 ("mixed number", "a number made of a whole number and a fraction", "fraction"),
 ("ratio", "the comparison of two or more quantities of the same kind", "ratio"),
 ("proportion", "the statement that two ratios are equal", "ratio"),
 ("mean", "the sum of a set of values divided by the number of values", "statistics"),
 ("median", "the middle value of a set of numbers arranged in order", "statistics"),
 ("mode", "the value that occurs most frequently in a set of data", "statistics"),
 ("range", "the difference between the highest and the lowest value in a set", "statistics"),
 ("acute angle", "an angle that measures less than 90 degrees", "geometry"),
 ("right angle", "an angle that measures exactly 90 degrees", "geometry"),
 ("triangle", "a plane figure with three sides and three angles", "geometry"),
 ("perimeter", "the total distance round a plane figure", "geometry"),
 ("probability", "the chance that an event will occur", "statistics"),
 ("complementary angles", "two angles whose sum is 90 degrees", "geometry"),
 ("supplementary angles", "two angles whose sum is 180 degrees", "geometry"),
 ("equilateral triangle", "a triangle with all its three sides equal", "geometry"),
 ("isosceles triangle", "a triangle with two equal sides", "geometry"),
 ("scalene triangle", "a triangle with no two sides equal", "geometry"),
 ("reflex angle", "an angle greater than 180 degrees but less than 360 degrees", "geometry"),
 ("parallel lines", "lines that never meet, however far they are extended", "geometry"),
 ("fraction", "a number that represents a part of a whole", "number"),
 ("percentage", "a way of expressing a number as a part of 100", "number"),
 ("estimation", "finding an approximate value of a quantity", "number"),
],
2: [
 ("equation", "a mathematical statement showing that two expressions are equal", "algebra"),
 ("linear equation", "an equation in which the highest power of the unknown is one", "algebra"),
 ("coefficient", "the number that multiplies a variable in an algebraic term", "algebra"),
 ("quadratic equation", "an equation in which the highest power of the unknown is two", "algebra"),
 ("gradient", "the slope or steepness of a line", "algebra"),
 ("standard form", "writing a number as k multiplied by 10 raised to a power, where k is between 1 and 10", "number"),
 ("base", "the number of digits used in a number system", "number"),
 ("indices", "another name for powers, such as x squared or x cubed", "algebra"),
 ("logarithm", "the power to which a base must be raised to give a given number", "algebra"),
 ("simple interest", "interest calculated on the original principal only", "business math"),
 ("compound interest", "interest calculated on the principal plus interest already earned", "business math"),
 ("mutually exclusive events", "events that cannot occur at the same time", "statistics"),
 ("congruent figures", "figures that are exactly the same shape and size", "geometry"),
 ("similar figures", "figures that have the same shape but different sizes", "geometry"),
 ("tangent to a circle", "a straight line that touches a circle at exactly one point", "geometry"),
 ("chord", "a straight line joining two points on the circumference of a circle", "geometry"),
 ("sector", "the part of a circle bounded by two radii and an arc", "geometry"),
 ("hypotenuse", "the longest side of a right-angled triangle", "trigonometry"),
 ("sine of an angle", "the ratio of the opposite side to the hypotenuse in a right-angled triangle", "trigonometry"),
 ("cosine of an angle", "the ratio of the adjacent side to the hypotenuse in a right-angled triangle", "trigonometry"),
 ("tangent of an angle", "the ratio of the opposite side to the adjacent side in a right-angled triangle", "trigonometry"),
 ("frequency", "the number of times a value occurs in a set of data", "statistics"),
 ("histogram", "a bar chart used for grouped continuous data", "statistics"),
 ("substitution", "the replacement of a variable by a numerical value in an expression", "algebra"),
 ("simultaneous equations", "two or more equations solved together for the same unknowns", "algebra"),
 ("quadrilateral", "a plane figure with four sides", "geometry"),
 ("circumference", "the distance round a circle", "geometry"),
 ("velocity", "the speed of a body in a given direction", "physics math"),
 ("density", "the mass of a substance per unit volume", "physics math"),
],
3: [
 ("differentiation", "the process of finding the derivative of a function", "calculus"),
 ("derivative", "the rate of change of a function with respect to its variable", "calculus"),
 ("integration", "the reverse process of differentiation", "calculus"),
 ("mapping", "a rule that connects the elements of one set to those of another", "algebra"),
 ("sequence", "a set of numbers arranged in a definite order", "sequences"),
 ("arithmetic progression", "a sequence in which each term differs from the previous one by a constant", "sequences"),
 ("geometric progression", "a sequence in which each term is found by multiplying the previous one by a constant", "sequences"),
 ("common difference", "the constant difference between consecutive terms of an arithmetic progression", "sequences"),
 ("common ratio", "the constant multiplier between consecutive terms of a geometric progression", "sequences"),
 ("bearing", "the direction of one point from another, measured clockwise from north", "geometry"),
 ("inverse function", "a function that reverses the effect of another function", "algebra"),
 ("matrix", "a rectangular array of numbers arranged in rows and columns", "algebra"),
 ("determinant", "the value of a matrix computed as ad - bc for a 2 by 2 matrix", "algebra"),
 ("vector", "a quantity that has both magnitude and direction", "algebra"),
 ("rotation", "a transformation that turns a shape about a fixed point", "geometry"),
 ("reflection", "a transformation that flips a shape over a mirror line", "geometry"),
 ("enlargement", "a transformation that changes the size of a shape by a scale factor", "geometry"),
 ("translation", "a transformation that slides a shape without turning it", "geometry"),
 ("scale factor", "the ratio of the length of the image to the corresponding length of the object", "geometry"),
 ("acceleration", "the rate of change of velocity with time", "calculus"),
 ("mean deviation", "the average of the absolute deviations of values from the mean", "statistics"),
 ("standard deviation", "the square root of the variance of a set of data", "statistics"),
 ("permutation", "an arrangement of objects in a definite order", "statistics"),
 ("combination", "a selection of objects in which the order does not matter", "statistics"),
 ("angle of elevation", "the angle between the horizontal and the line of sight of an object above the observer", "geometry"),
 ("angle of depression", "the angle between the horizontal and the line of sight of an object below the observer", "geometry"),
 ("surd", "a root of a number that cannot be expressed exactly as a rational number", "algebra"),
 ("constant of proportionality", "the number k in a statement such as y = kx", "algebra"),
 ("polar coordinates", "coordinates given as a distance and an angle from a fixed point", "geometry"),
 ("modulus of a vector", "the magnitude or length of a vector, found using Pythagoras' theorem", "algebra"),
],
}

# ---------------- LEVEL 1 (SS1) ----------------
def p_add(g):
    a, b = g.randint(11, 89), g.randint(11, 89)
    return g.build(f"Simplify: {a} + {b}.", g.distract(a + b) + [str(a + b)], 3, f"{a} + {b} = {a + b}.")

def p_sub(g):
    a, b = g.randint(36, 99), g.randint(11, 35)
    return g.build(f"Simplify: {a} - {b}.", g.distract(a - b) + [str(a - b)], 3, f"{a} - {b} = {a - b}.")

def p_mul(g):
    a, b = g.randint(6, 24), g.randint(3, 12)
    return g.build(f"Evaluate: {a} × {b}.", g.distract(a * b) + [str(a * b)], 3, f"{a} × {b} = {a * b}.")

def p_div(g):
    b = g.randint(3, 12)
    c = g.randint(4, 15)
    a = b * c
    return g.build(f"Evaluate: {a} ÷ {b}.", g.distract(c) + [str(c)], 3, f"{a} ÷ {b} = {c}.")

def p_pct(g):
    p = g.choice([5, 10, 15, 20, 25, 30, 40, 50, 60, 75])
    n = g.randint(20, 200) * 2
    c = p * n // 100
    return g.build(f"What is {p}% of {n}?", g.distract(c) + [str(c)], 3, f"{p}/100 × {n} = {c}.")

def p_frac_of(g):
    n, d = g.choice([(1, 2), (1, 3), (2, 3), (1, 4), (3, 4), (2, 5), (3, 5), (1, 5), (1, 6), (5, 6)])
    w = g.randint(12, 120)
    c = n * w // d
    return g.build(f"What is {n}/{d} of {w}?", g.distract(c) + [str(c)], 3, f"{n}/{d} × {w} = {c}.")

def p_frac_simplify(g):
    from math import gcd
    h = g.choice([2, 3, 4, 5])
    n0, d0 = 1, 2
    while gcd(n0, d0) != 1:
        n0, d0 = g.randint(1, 4), g.randint(2, 6)
    n, d = n0 * h, d0 * h
    ans = f"{n0}/{d0}"
    wrongs = pad_wrongs(g.rng, [f"{n}/{d}", f"{n*2}/{d*2}", f"{n+1}/{d+1}"], ans, 3)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Simplify: {n}/{d}.", o, ai,
                   f"The highest common factor of {n} and {d} is {h}; divide through to get {ans}.")

def p_dec(g):
    a = g.randint(11, 99)
    b = g.choice([2, 4, 5, 10, 20, 25, 50])
    return g.build(f"Express {a}/{b} as a decimal.", g.distract(a / b) + [H(a / b)], 3, f"{a} ÷ {b} = {H(a / b)}.")

def p_mean(g):
    n = g.choice([3, 4, 5, 6])
    base = g.randint(5, 28)
    vals = [max(1, base + g.randint(-3, 5)) for _ in range(n)]
    m = sum(vals) / n
    return g.build(f"Find the mean of {', '.join(H(v) for v in vals)}.", g.distract(m) + [H(m)], 3,
                   f"Sum = {sum(vals)}; mean = {sum(vals)} ÷ {n} = {H(m)}.")

def p_xline(g):
    a, b = g.randint(1, 12), g.randint(1, 30)
    x = g.randint(1, 15)
    rhs = a * x + b
    ans = str(x)
    wrongs = pad_wrongs(g.rng, [str(x + 1), str(x * 2), str(max(1, x - 1)), str(x + a), str(x - a)], ans, 3, numeric=x)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Solve for x: {a}x + {b} = {rhs}.", o, ai,
                   f"{a}x = {rhs} - {b} = {rhs - b}; x = {rhs - b} ÷ {a} = {x}.")

def p_unknown(g):
    a = g.choice([2, 3, 4, 5, 6, 7, 8])
    x = g.randint(2, 12)
    return g.build(f"If y = {a}x and y = {a * x}, find x.", g.distract(x) + [str(x)], 3,
                   f"x = {a * x} ÷ {a} = {x}.")

def p_neg(g):
    a = g.randint(5, 20)
    b = g.randint(1, 9)
    ans = str(-a + b)
    wrongs = pad_wrongs(g.rng, [str(a - b), str(-a - b), str(a + b), str(-a + b - 1)], ans, 3, numeric=abs(a - b))
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Evaluate: -{a} + {b}.", o, ai, f"-{a} + {b} = {H(b - a)}.")

def p_seq(g):
    d = g.choice([2, 3, 4, 5, 6, 7])
    a = g.randint(1, 12)
    term = g.choice([3, 4, 5, 6, 7, 8])
    prev = [a + (t - 1) * d for t in range(1, term)]
    val = a + (term - 1) * d
    return g.build(f"Find the {term}th term of the sequence {', '.join(H(v) for v in prev)}, ...",
                   g.distract(val) + [str(val)], 3, f"Tn = a + (n - 1)d = {a} + ({term} - 1)({d}) = {val}.")

def p_ratio_share(g):
    r1, r2 = g.choice([(2, 3), (1, 2), (3, 4), (2, 5), (3, 5), (1, 4), (5, 6), (2, 7)])
    t = g.choice([20, 40, 50, 100, 120, 150, 200]) * (r1 + r2) // g.choice([2, 5, 10])
    share = t * min(r1, r2) // (r1 + r2)
    return g.build(f"Share {t} in the ratio {r1}:{r2}. What is the smaller share?",
                   g.distract(share) + [str(share)], 3,
                   f"Total parts = {r1 + r2}; smaller share = {t} × {min(r1, r2)}/{r1 + r2} = {share}.")

def p_area_rect(g):
    l, w = g.randint(4, 20), g.randint(3, 15)
    return g.build(f"Find the area of a rectangle of length {l} cm and breadth {w} cm.",
                   g.distract(l * w, " cm²") + [f"{l * w} cm²"], 3, f"Area = {l} × {w} = {l * w} cm².")

def p_perimeter(g):
    l, w = g.randint(5, 25), g.randint(3, 15)
    return g.build(f"Find the perimeter of a rectangle of length {l} cm and width {w} cm.",
                   g.distract(2 * (l + w), " cm") + [f"{2 * (l + w)} cm"], 3, f"Perimeter = 2({l} + {w}) = {2 * (l + w)} cm.")

def p_complement(g):
    a = g.randint(15, 80)
    return g.build(f"Angle A = {a}°. Find the size of its complement.",
                   g.distract(90 - a, "°") + [f"{90 - a}°"], 3, f"90° - {a}° = {90 - a}°.")

def p_supplement(g):
    a = g.choice([40, 50, 60, 70, 80, 100, 110, 120, 130, 140])
    return g.build(f"Find the supplement of an angle of {a}°.",
                   g.distract(180 - a, "°") + [f"{180 - a}°"], 3, f"180° - {a}° = {180 - a}°.")

def p_si(g):
    P = g.choice([100, 200, 250, 400, 500, 800, 1000, 2000])
    R = g.choice([2, 3, 4, 5, 10, 12, 15, 20])
    T = g.choice([1, 2, 3, 4, 5])
    I = P * R * T // 100
    return g.build(f"Find the simple interest on ₦{P} at {R}% per annum for {T} year(s).",
                   g.distract(I, "", pre="₦") + [f"₦{I}"], 3, f"S.I. = PRT/100 = ({P} × {R} × {T})/100 = ₦{I}.")

def p_money(g):
    x = g.randint(2, 9)
    a = g.randint(50, 300)
    c = x * a + x * 25
    return g.build(f"Ada bought {x} books at ₦{a} each and {x} pens at ₦25 each. How much did she pay altogether?",
                   g.distract(c, pre="₦") + [f"₦{c}"], 3, f"({x} × ₦{a}) + ({x} × ₦25) = ₦{x * a} + ₦{x * 25} = ₦{c}.")

LEVEL1_F = [p_add, p_sub, p_mul, p_div, p_pct, p_frac_of, p_frac_simplify, p_dec, p_mean,
            p_xline, p_unknown, p_neg, p_seq, p_ratio_share, p_area_rect, p_perimeter,
            p_complement, p_supplement, p_si, p_money]

# ---------------- LEVEL 2 (SS2) ----------------
def p_eval(g):
    a, b, c = g.randint(2, 9), g.randint(2, 9), g.randint(1, 9)
    return g.build(f"Evaluate: {a} × {b} + {c}.", g.distract(a * b + c) + [str(a * b + c)], 3,
                   f"{a} × {b} = {a * b}; plus {c} gives {a * b + c}.")

def p_expand(g):
    a, b, c = g.randint(2, 9), g.randint(1, 12), g.randint(1, 12)
    co, const = a + c, -a * b
    ans = SIGNED(co, const)
    o = g.shuffle([ans, SIGNED(co, a * b), f"{co}x + {b}", f"{a + c}x - {b}"])
    return g.build(f"Simplify: {a}(x - {b}) + {c}x.", o, o.index(ans),
                   f"{a}(x - {b}) = {a}x - {a * b}; adding {c}x gives {SIGNED(co, const)}.")

def p_powers(g):
    b = g.choice([2, 3, 4, 5, 6, 7, 8, 9, 10])
    n = g.choice([2, 3, 4])
    return g.build(f"Evaluate: {b}^{n}.", g.distract(b ** n) + [str(b ** n)], 3,
                   f"{b} × {b} × … ({n} times) = {b ** n}.")

def p_sqrt(g):
    r = g.randint(4, 20)
    return g.build(f"What is the square root of {r * r}?", g.distract(r) + [str(r)], 3, f"√{r * r} = {r}.")

def p_frac_of2(g):
    n, d = g.choice([(1, 2), (1, 3), (2, 3), (1, 4), (3, 4), (2, 5), (3, 5), (1, 5), (4, 5)])
    tot = g.choice([40, 60, 80, 100, 120, 150, 200])
    return g.build(f"A class has {tot} students. {n}/{d} of them are boys. How many boys are there?",
                   g.distract(n * tot // d) + [str(n * tot // d)], 3, f"{n}/{d} × {tot} = {n * tot // d}.")

def p_pct_of(g):
    p = g.choice([10, 20, 25, 40, 50, 75])
    n = g.randint(30, 400)
    return g.build(f"Find {p}% of {n}.", g.distract(p * n // 100) + [str(p * n // 100)], 3,
                   f"{p}% of {n} = {p} × {n} ÷ 100 = {p * n // 100}.")

def p_pct_fraction(g):
    c = g.choice([20, 25, 30, 40, 45, 50, 60, 70, 75, 90])
    t = g.choice([50, 100, 200, 250, 400, 500])
    p = c * 100 // t
    return g.build(f"Express {c} as a percentage of {t}.", g.distract(p, "%") + [f"{p}%"], 3,
                   f"{c}/{t} × 100 = {p}%.")

def p_linear(g):
    a = g.choice([2, 3, 4, 5, 6])
    b = g.randint(1, 12)
    x = g.randint(2, 12)
    rhs = a * x + b
    ans = str(x)
    wrongs = pad_wrongs(g.rng, [str(x + 1), str(x * 2), str(max(1, x - 1)), str(x + a)], ans, 3, numeric=x)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Solve: {a}x + {b} = {rhs}.", o, ai,
                   f"{a}x = {rhs} - {b} = {rhs - b}; x = {rhs - b} ÷ {a} = {x}.")

def p_seq2(g):
    d = g.choice([2, 3, 4, 5, 6, 7])
    a = g.randint(1, 12)
    n = g.choice([5, 6, 7, 8, 9, 10])
    return g.build(f"Find the {n}th term of the A.P: {a}, {a + d}, {a + 2 * d}, ...",
                   g.distract(a + (n - 1) * d) + [str(a + (n - 1) * d)], 3,
                   f"Tn = a + (n - 1)d = {a} + ({n} - 1)({d}) = {a + (n - 1) * d}.")

def p_speed(g):
    s = g.choice([30, 40, 45, 60, 75, 80, 90, 100, 120])
    t = g.choice([1, 1.5, 2, 2.5, 3, 4])
    return g.build(f"A car travels at {H(s)} km/h for {H(t)} hours. How far does it travel?",
                   g.distract(s * t, " km") + [f"{H(s * t)} km"], 3, f"Distance = speed × time = {H(s)} × {H(t)} = {H(s * t)} km.")

def p_ratio_share2(g):
    r1, r2 = g.choice([(1, 2), (2, 3), (3, 4), (2, 5), (1, 3), (3, 5), (2, 7)])
    total = (r1 + r2) * g.choice([6, 10, 12, 15, 20, 30])
    share = total * max(r1, r2) // (r1 + r2)
    return g.build(f"Divide ₦{total} between two people in the ratio {r1}:{r2}. What is the larger share?",
                   g.distract(share, pre="₦") + [f"₦{share}"], 3,
                   f"Larger share = ₦{total} × {max(r1, r2)}/{r1 + r2} = ₦{share}.")

def p_average(g):
    a = g.randint(10, 90)
    b = g.randint(10, 90)
    m = (a + b) / 2
    return g.build(f"The average of two numbers is {H(m)}. If one number is {a}, what is the other?",
                   g.distract(b) + [str(b)], 3, f"Sum = 2 × {H(m)} = {2 * m}; other number = {2 * m} - {a} = {b}.")

def p_interest2(g):
    P = g.choice([500, 1000, 2000, 4000, 5000])
    R = g.choice([5, 10, 15, 20, 25])
    T = g.choice([2, 3])
    I = P * R * T // 100
    return g.build(f"A man deposited ₦{P} in a bank at {R}% simple interest per annum. Find the interest after {T} years.",
                   g.distract(I, pre="₦") + [f"₦{I}"], 3, f"S.I. = ({P} × {R} × {T})/100 = ₦{I}.")

def p_square(g):
    a = g.randint(3, 9)
    b = g.randint(1, 8)
    ans = str((a + b) ** 2)
    wrongs = pad_wrongs(g.rng, [str(a ** 2 + b ** 2), str((a + b) * 2), str(a ** 2 - b ** 2)],
                        ans, 3, numeric=(a + b) ** 2)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Find the value of ({a} + {b})² (a = {a}, b = {b}).", o, ai,
                   f"({a} + {b})² = {a + b}² = {a + b} × {a + b} = {(a + b) ** 2}.")

def p_plot(g):
    a = g.randint(1, 6)
    b = g.randint(2, 10)
    x = g.randint(1, 8)
    return g.build(f"If y = {a}x + {b}, find y when x = {x}.", g.distract(a * x + b) + [str(a * x + b)], 3,
                   f"y = {a}({x}) + {b} = {a * x} + {b} = {a * x + b}.")

def p_volume(g):
    l, w, h = g.randint(2, 10), g.randint(2, 10), g.randint(2, 10)
    return g.build(f"Find the volume of a cuboid of dimensions {l} cm × {w} cm × {h} cm.",
                   g.distract(l * w * h, " cm³") + [f"{l * w * h} cm³"], 3,
                   f"V = {l} × {w} × {h} = {l * w * h} cm³.")

def p_area_tri(g):
    b, h = g.randint(4, 16), g.randint(3, 12)
    return g.build(f"Find the area of a triangle of base {b} cm and height {h} cm.",
                   g.distract(b * h / 2, " cm²") + [f"{H(b * h / 2)} cm²"], 3,
                   f"Area = ½ × {b} × {h} = {H(b * h / 2)} cm².")

def p_median(g):
    vals = [g.choice([2, 4, 6, 8, 10, 12, 14]) for _ in range(7)]
    s = sorted(vals)
    return g.build(f"Find the median of {', '.join(H(v) for v in vals)}.",
                   g.distract(s[3]) + [str(s[3])], 3,
                   f"In order: {', '.join(H(v) for v in s)}; the 4th value is the median: {s[3]}.")

LEVEL2_F = [p_eval, p_expand, p_powers, p_sqrt, p_frac_of2, p_pct_of, p_pct_fraction, p_linear,
            p_seq2, p_speed, p_ratio_share2, p_average, p_interest2, p_square, p_plot, p_volume,
            p_area_tri, p_median]

# ---------------- LEVEL 3 (SS3) ----------------
def p_quad(g):
    r1, r2 = sorted([g.randint(1, 9), g.randint(1, 9)])
    if g.chance(0.5):
        sumr, prod = r1 + r2, r1 * r2
        ans = f"x = {r1} or x = {r2}"
        wrongs = pad_wrongs(g.rng, [f"x = -{r1} or x = -{r2}", f"x = 1 or x = {prod}",
                                    f"x = {prod} or x = 1", f"x = {sumr} or x = 0",
                                    f"x = -{r1} or x = {r2}"], ans, 3)
        o, ai = mcq_opts(g.rng, wrongs, ans)
        return g.build(f"Solve: x² - {sumr}x + {prod} = 0.", o, ai,
                       f"(x - {r1})(x - {r2}) = 0, so x = {r1} or x = {r2}.")
    if r1 == r2:
        return None
    ans = f"x = {r1} or x = -{r2}"
    wrongs = pad_wrongs(g.rng, [f"x = -{r1} or x = {r2}", f"x = {r1} or x = {r2}",
                                f"x = -{r1} or x = -{r2}", f"x = -{r1} or x = -{r2}"], ans, 3)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Solve: x² + {r2 - r1}x - {r1 * r2} = 0.", o, ai,
                   f"(x - {r1})(x + {r2}) = 0, so x = {r1} or x = -{r2}.")

def p_gradient(g):
    x1, y1 = g.randint(1, 6), g.randint(1, 10)
    m = g.choice([1, 2, 3, 4, 5, 1.5, 2.5])
    dx = g.choice([1, 2, 3, 4])
    x2, y2 = x1 + dx, y1 + m * dx
    return g.build(f"Find the gradient of the line through P({x1}, {y1}) and Q({x2}, {H(y2)}).",
                   g.distract(m) + [H(m)], 3,
                   f"m = (y₂ - y₁)/(x₂ - x₁) = {H(y2 - y1)}/{dx} = {H(m)}.")

def p_stdform(g):
    a = g.choice([1, 2, 3, 4, 5, 6, 7, 8, 9])
    m = g.randint(1, 6)
    v = a * 10 ** m
    o = g.shuffle([f"{a} × 10^{m}", f"{a} × 10^{m + 1}", f"{a / 10} × 10^{m}", f"{a * 10} × 10^{m}"])
    return g.build(f"Express {v} in standard form.", o, o.index(f"{a} × 10^{m}"),
                   f"{v} = {a} × 10^{m}.")

def p_indices(g):
    b = g.choice([2, 3, 5, 7])
    m = g.randint(2, 6)
    n = g.choice([x for x in (2, 3, 4, 5, 6) if x != m])
    ans = f"{b}^{m + n}"
    wrongs = pad_wrongs(g.rng, [f"{b}^{m * n}", f"{b}^{m - n}", f"{b}^{n - m}", f"{b}^{m + n + 1}"], ans, 3)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Simplify: {b}^{m} × {b}^{n}.", o, ai,
                   f"Multiply powers of the same base by adding indices: {b}^({m} + {n}) = {b}^{m + n}.")

def p_increase(g):
    pct = g.choice([10, 20, 25, 50, 75])
    n = g.choice([100, 200, 300, 400, 500, 80, 120, 160])
    inc = pct * n // 100
    return g.build(f"Increase {n} by {pct}%.", g.distract(n + inc) + [str(n + inc)], 3,
                   f"Increase = {pct}% of {n} = {inc}; new value = {n} + {inc} = {n + inc}.")

def p_decrease(g):
    pct = g.choice([10, 20, 25, 50])
    n = g.choice([100, 200, 300, 400, 500, 80, 120])
    dec = pct * n // 100
    return g.build(f"Decrease {n} by {pct}%.", g.distract(n - dec) + [str(n - dec)], 3,
                   f"Decrease = {pct}% of {n} = {dec}; new value = {n} - {dec} = {n - dec}.")

def p_diff(g):
    a = g.choice([2, 3, 4, 5, 6])
    b = g.randint(1, 8)
    x = g.randint(1, 5)
    d = 2 * a * x - b
    return g.build(f"If y = {a}x² - {b}x + 7, find dy/dx when x = {x}.",
                   g.distract(d) + [str(d)], 3, f"dy/dx = {2 * a}x - {b}; at x = {x}: {2 * a}({x}) - {b} = {d}.")

def p_log(g):
    b, m = g.choice([2, 3, 4, 5, 10]), g.randint(2, 5)
    v = b ** m
    ans = str(m)
    wrongs = pad_wrongs(g.rng, [str(v), str(m + 1), str(b), str(m - 1), str(b * m)], ans, 3, numeric=m)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Evaluate: log_{b} {v}.", o, ai,
                   f"{b}^{m} = {v}, therefore log_{b} {v} = {m}.")

def p_simult(g):
    a = g.randint(2, 6)
    b = g.randint(2, 6)
    x, y = g.randint(1, 12), g.randint(1, 12)
    c1, c2 = a * x + b * y, x + y
    ans = f"x = {x}, y = {y}"
    wrongs = pad_wrongs(g.rng, [f"x = {y}, y = {x}", f"x = {x + 1}, y = {max(0, y - 1)}",
                                f"x = {max(0, x - 1)}, y = {y + 1}", f"x = {x + 2}, y = {y}",
                                f"x = {x}, y = {y + 2}"], ans, 3)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Solve the simultaneous equations: x + y = {c2} and {a}x + {b}y = {c1}.", o, ai,
                   f"From the first equation y = {c2} - x; substituting gives {a}x + {b}({c2} - x) = {c1}, hence x = {x}, y = {y}.")

def p_gp(g):
    r = g.choice([2, 3, 1.5])
    a = g.randint(1, 6)
    t3 = a * r * r
    return g.build(f"Find the 3rd term of the G.P: {H(a)}, {H(a * r)}, ...",
                   g.distract(t3) + [H(t3)], 3, f"Tn = ar^(n-1) = {a} × {H(r)}² = {H(t3)}.")

def p_cone(g):
    r = g.choice([2, 3, 4, 5, 6])
    h = g.choice([2, 3, 5, 7, 9])
    v = round(r * r * h / 3)
    ans = f"{v}π cm³"
    wrongs = pad_wrongs(g.rng, [f"{3 * v}π cm³", f"{r * r * h}π cm³", f"{2 * v}π cm³", f"{v + r}π cm³"],
                        ans, 3)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"A cone has base radius {r} cm and height {h} cm. Find its volume in terms of π.",
                   o, ai, f"V = ⅓πr²h = ⅓ × π × {r}² × {h} = {v}π cm³.")

def p_distance(g):
    dx, dy = g.choice([(3, 4), (5, 12), (6, 8), (9, 12), (8, 15)])
    x1, y1 = g.randint(0, 5), g.randint(0, 5)
    from math import sqrt
    ans = H(sqrt(dx * dx + dy * dy))
    o = g.shuffle([ans, H(sqrt(dx * dx + dy * dy) + 1), H(dx + dy), H(dx * dy)])
    return g.build(f"Find the distance between P({x1}, {y1}) and Q({x1 + dx}, {y1 + dy}).", o, o.index(ans),
                   f"d = √({dx}² + {dy}²) = √{dx * dx + dy * dy} = {ans}.")

def p_integral(g):
    a = g.choice([3, 6, 9, 12])
    x = g.choice([1, 2, 3, 4])
    v = a * x ** 3 // 3
    return g.build(f"Evaluate: ∫ {a}x² dx from x = 0 to x = {x}.", g.distract(v) + [str(v)], 3,
                   f"∫ {a}x² dx = {a}x³/3; at x = {x} this is {a}({x}³)/3 = {v}.")

def p_ladder(g):
    from math import sqrt
    a, b = g.choice([(3, 4), (6, 8), (5, 12), (8, 15), (9, 12)])
    ans = H(sqrt(a * a + b * b))
    wrongs = pad_wrongs(g.rng, [H(a + b), H(sqrt(a * a + b * b) + 2), H(abs(a - b)), H(sqrt(a * a + b * b) + 1)], ans, 3)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"A ladder rests against a wall. Its foot is {a} m from the wall and its top reaches {b} m up the wall. Find the length of the ladder.",
                   o, ai, f"Pythagoras: L² = {a}² + {b}² = {a * a + b * b}; L = √{a * a + b * b} = {ans} m.")

def p_bearing(g):
    b = g.choice([30, 45, 60, 90, 120, 135, 150, 190, 210, 225, 240, 270, 300, 330])
    back = (b + 180) % 360
    o = g.shuffle([f"{back}°", f"{b}°", f"{(b + 90) % 360}°", f"{(b + 270) % 360}°"])
    return g.build(f"Point X is on a bearing of {b}° from point Y. Find the bearing of Y from X.", o, o.index(f"{back}°"),
                   f"Back bearing = forward bearing + 180° = {b}° + 180° = {back}°.")

def p_vec(g):
    x1, y1 = g.randint(1, 5), g.randint(1, 5)
    x2, y2 = g.randint(1, 5), g.randint(1, 5)
    vx, vy = x1 + x2, y1 + y2
    ans = f"({vx}, {vy})"
    wrongs = pad_wrongs(g.rng, [f"({x1 - x2}, {y1 - y2})", f"({x2 - x1}, {y2 - y1})",
                                f"({x1 + y2}, {y1 + x2})", f"({vx + 1}, {vy})", f"({x1 * x2}, {y1 * y2})"],
                        ans, 3)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"If vector a = ({x1}, {y1}) and vector b = ({x2}, {y2}), find a + b.", o, ai,
                   f"Add corresponding components: ({x1} + {x2}, {y1} + {y2}) = ({vx}, {vy}).")

def p_matrix(g):
    a, b, c, d = g.randint(1, 6), g.randint(1, 6), g.randint(1, 6), g.randint(1, 6)
    det = a * d - b * c
    return g.build(f"Given the matrix M = [[{a}, {b}], [{c}, {d}]], find its determinant.",
                   g.distract(det) + [str(det)], 3, f"det(M) = ({a} × {d}) - ({b} × {c}) = {a * d} - {b * c} = {det}.")

def p_combo(g):
    n, r = g.choice([(5, 2), (6, 2), (5, 3), (7, 2), (6, 3), (8, 2)])
    from math import comb
    v = comb(n, r)
    return g.build(f"How many ways can {r} students be chosen from {n} students?", g.distract(v) + [str(v)], 3,
                   f"C({n}, {r}) = {n}!/({r}! × {n - r}!) = {v}.")

def p_surds(g):
    k = g.choice([2, 3, 4, 5, 6])
    m = g.choice([x for x in (2, 3, 5, 6, 7, 10) if x != k])
    v = k * k * m
    ans = f"{k}√{m}"
    wrongs = pad_wrongs(g.rng, [f"{m}√{k}", f"{k + m}√{m}", f"{k * m}", f"{k}√{m + 1}"], ans, 3)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Simplify √{v}.", o, ai,
                   f"√{v} = √({k}² × {m}) = {k}√{m}.")

def p_ap_sum(g):
    a = g.randint(2, 15)
    d = g.choice([2, 3, 4, 5])
    n = g.choice([5, 6, 7, 8, 10])
    S = n * (2 * a + (n - 1) * d) // 2
    return g.build(f"Find the sum of the first {n} terms of the A.P: {a}, {a + d}, {a + 2 * d}, ...",
                   g.distract(S) + [str(S)], 3,
                   f"S = n/2 × (2a + (n - 1)d) = {n}/2 × ({2 * a} + {n - 1} × {d}) = {S}.")

def p_circle_angle(g):
    c = g.choice([40, 50, 60, 70, 80])
    return g.build(f"An angle at the centre of a circle is {c}°. What is the angle at the circumference standing on the same arc?",
                   g.distract(c / 2, "°") + [f"{H(c / 2)}°"], 3, "The angle at the centre is twice the angle at the circumference, so the angle is "
                   f"{c}° ÷ 2 = {H(c / 2)}°.")

def p_prob2(g):
    n, r = g.choice([(10, 3), (12, 5), (20, 5), (16, 4), (10, 6), (15, 6)])
    while n - r == r:
        r += 1
    ans = f"{r}/{n}"
    wrongs = pad_wrongs(g.rng, [f"{n - r}/{n}", f"{r}/{n - r}", f"{n}/{r}", f"{r + 1}/{n}"], ans, 3)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"A bag contains {n} balls, {r} of which are red. What is the probability of picking a red ball?",
                   o, ai, f"P(red) = favourable outcomes ÷ total outcomes = {r}/{n}.")

def p_trig_id(g):
    return g.build("If sin θ = 0.6, find the value of sin²θ + cos²θ.",
                   ["0.36", "0.64", "1", "2"], 2, "For any angle, sin²θ + cos²θ = 1.")

def p_trig2(g):
    from math import sqrt
    opp = g.choice([3, 5, 7, 9]) * g.choice([1, 2, 3])
    hyp = g.choice([5, 13, 17, 25]) * g.choice([1, 2, 3])
    if opp >= hyp: opp = hyp // 2
    adj = H(sqrt(hyp * hyp - opp * opp))
    o = g.shuffle([f"cos θ = {adj}/{hyp}", f"cos θ = {opp}/{hyp}", f"cos θ = {hyp}/{adj}", f"cos θ = {adj}/{opp}"])
    return g.build(f"In a right-angled triangle, sin θ = {opp}/{hyp}. Find cos θ.", o, o.index(f"cos θ = {adj}/{hyp}"),
                   f"Adjacent = √({hyp}² - {opp}²) = {adj}; cos θ = adjacent/hypotenuse = {adj}/{hyp}.")

def p_vector_mag(g):
    from math import sqrt
    x, y = g.choice([(3, 4), (6, 8), (5, 12), (8, 15), (9, 12)])
    return g.build(f"Find the magnitude of the vector ({x}, {y}).", g.distract(sqrt(x * x + y * y)) + [H(sqrt(x * x + y * y))], 3,
                   f"|v| = √({x}² + {y}²) = √{x * x + y * y} = {H(sqrt(x * x + y * y))}.")

LEVEL3_F = [p_quad, p_gradient, p_stdform, p_indices, p_increase, p_decrease, p_diff, p_log,
            p_simult, p_gp, p_cone, p_distance, p_integral, p_ladder, p_bearing, p_vec,
            p_matrix, p_combo, p_surds, p_ap_sum, p_circle_angle, p_prob2, p_trig_id, p_trig2,
            p_vector_mag]

FUNCS = {1: LEVEL1_F, 2: LEVEL2_F, 3: LEVEL3_F}
FACT_TARGET = {1: 30, 2: 30, 3: 30}

def generate(level, seed=1, target=100, blocked=None):
    g = G(SUBJECT, seed, blocked)
    g.fill_facts(FACTS[level], FACT_TARGET[level], use_cap=2)
    g.fill_params(FUNCS[level], target)
    g.shuffle_qs()
    return g.qs
