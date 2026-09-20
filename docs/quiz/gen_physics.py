# -*- coding: utf-8 -*-
"""Physics: facts + formula-based numeric questions, 100 per level."""
from engine import G, H, AN, pad_wrongs, mcq_opts

SUBJECT = "Physics"

FACTS = {
1: [
 ("mass", "the quantity of matter contained in a body", "measurement"),
 ("weight", "the force of gravity acting on a body", "measurement"),
 ("volume", "the amount of space occupied by a body", "measurement"),
 ("density", "the mass of a substance per unit volume", "measurement"),
 ("speed", "the distance travelled per unit time", "mechanics"),
 ("velocity", "the rate of change of displacement with time", "mechanics"),
 ("acceleration", "the rate of change of velocity with time", "mechanics"),
 ("distance", "the total length of the path travelled by a body", "mechanics"),
 ("displacement", "the distance in a stated direction from the starting point", "mechanics"),
 ("force", "a push or a pull that can change the state of motion of a body", "mechanics"),
 ("inertia", "the tendency of a body to resist any change in its state of motion", "mechanics"),
 ("friction", "the force that opposes motion between two surfaces in contact", "mechanics"),
 ("gravity", "the force that pulls bodies towards the centre of the earth", "mechanics"),
 ("work", "the product of the force applied and the distance moved in the direction of the force", "energy"),
 ("energy", "the capacity of a body to do work", "energy"),
 ("power", "the rate at which work is done", "energy"),
 ("kinetic energy", "the energy possessed by a body due to its motion", "energy"),
 ("potential energy", "the energy possessed by a body due to its position or state", "energy"),
 ("momentum", "the product of the mass of a body and its velocity", "mechanics"),
 ("pressure", "the force acting normally per unit area", "pressure"),
 ("atmospheric pressure", "the pressure exerted by the weight of the air on the earth's surface", "pressure"),
 ("thermometer", "the instrument used to measure temperature", "heat"),
 ("conduction", "the transfer of heat through a solid without the movement of the material itself", "heat"),
 ("convection", "the transfer of heat in fluids by the movement of the heated particles", "heat"),
 ("radiation", "the transfer of heat in the form of waves without a material medium", "heat"),
 ("reflection", "the bouncing back of light from a surface", "optics"),
 ("refraction", "the bending of light as it passes from one medium to another", "optics"),
 ("shadow", "the dark region formed when an opaque object blocks light", "optics"),
 ("frequency", "the number of complete oscillations or waves per second", "waves"),
 ("wavelength", "the distance between two successive crests or troughs of a wave", "waves"),
 ("scalar quantity", "a quantity that has magnitude only, such as mass", "measurement"),
 ("vector quantity", "a quantity that has both magnitude and direction, such as velocity", "measurement"),
],
2: [
 ("current", "the rate of flow of electric charge in a circuit", "electricity"),
 ("voltage", "the potential difference between two points in a circuit", "electricity"),
 ("resistance", "the opposition of a conductor to the flow of current", "electricity"),
 ("conductor", "a material that allows electricity or heat to pass through it easily", "electricity"),
 ("insulator", "a material that does not allow electricity or heat to pass through it easily", "electricity"),
 ("series circuit", "a circuit in which the components are connected one after another", "electricity"),
 ("parallel circuit", "a circuit in which the components are connected across the same two points", "electricity"),
 ("ammeter", "the instrument used to measure electric current", "electricity"),
 ("voltmeter", "the instrument used to measure potential difference", "electricity"),
 ("magnet", "a body that attracts iron and steel", "magnetism"),
 ("magnetic field", "the region around a magnet in which its influence is felt", "magnetism"),
 ("electromagnet", "a magnet produced by the flow of electric current through a coil", "magnetism"),
 ("transformer", "a device that changes the voltage of an alternating current", "electricity"),
 ("generator", "a machine that converts mechanical energy into electrical energy", "electricity"),
 ("electric motor", "a machine that converts electrical energy into mechanical energy", "electricity"),
 ("amplitude", "the maximum displacement of a wave from its rest position", "waves"),
 ("sound", "a form of energy produced by vibration and transmitted as longitudinal waves", "waves"),
 ("echo", "the reflection of sound that is heard after the original sound", "waves"),
 ("pitch", "the quality of a sound determined by its frequency", "waves"),
 ("loudness", "the quality of a sound determined by its amplitude", "waves"),
 ("convex lens", "a lens that is thicker in the middle than at the edges and converges light", "optics"),
 ("concave lens", "a lens that is thinner in the middle than at the edges and diverges light", "optics"),
 ("dispersion", "the splitting of white light into its component colours", "optics"),
 ("spectrum", "the band of colours produced when white light is dispersed", "optics"),
 ("specific heat capacity", "the quantity of heat needed to raise the temperature of unit mass of a substance by one degree", "heat"),
 ("latent heat", "the heat absorbed or released when a substance changes state without a change in temperature", "heat"),
 ("thermostat", "a device that keeps temperature constant by controlling the supply of heat", "heat"),
 ("expansion", "the increase in the size of a substance when it is heated", "heat"),
 ("resultant force", "the single force that has the same effect as two or more forces acting together", "mechanics"),
 ("equilibrium", "the state of a body in which the resultant force acting on it is zero", "mechanics"),
 ("centre of gravity", "the point at which the whole weight of a body appears to act", "mechanics"),
 ("work done", "the product of force and the distance moved in the direction of the force", "energy"),
],
3: [
 ("terminal velocity", "the constant velocity reached by a falling body when air resistance equals its weight", "mechanics"),
 ("projectile", "a body that is thrown into the air and moves under the influence of gravity", "mechanics"),
 ("impulse", "the product of a force and the time for which it acts", "mechanics"),
 ("momentum", "the product of the mass of a body and its velocity", "mechanics"),
 ("stress", "the force acting per unit cross-sectional area of a material", "mechanics"),
 ("strain", "the ratio of the extension of a material to its original length", "mechanics"),
 ("elastic limit", "the maximum load a material can bear without becoming permanently deformed", "mechanics"),
 ("simple harmonic motion", "the to-and-fro motion in which the acceleration is directed to a fixed point and proportional to the displacement", "waves"),
 ("resonance", "the vibration of a body at its natural frequency due to a periodic force", "waves"),
 ("interference", "the effect produced when two waves of the same frequency meet", "waves"),
 ("diffraction", "the spreading of waves as they pass through a narrow opening", "waves"),
 ("electromagnetic spectrum", "the range of all types of electromagnetic radiation arranged in order of wavelength", "waves"),
 ("charge", "the property of matter that causes it to experience a force in an electric field", "electricity"),
 ("electric field", "the region around a charged body in which a force acts on another charge", "electricity"),
 ("capacitance", "the ability of a body to store electric charge", "electricity"),
 ("kilowatt-hour", "the commercial unit of electrical energy", "electricity"),
 ("fuse", "a safety device that melts and breaks a circuit when the current is too high", "electricity"),
 ("earth wire", "the wire that connects the metal case of an appliance to the ground for safety", "electricity"),
 ("radioactivity", "the spontaneous emission of radiation by an unstable nucleus", "nuclear physics"),
 ("alpha particle", "a helium nucleus emitted during radioactive decay, with low penetrating power", "nuclear physics"),
 ("beta particle", "a fast-moving electron emitted during radioactive decay", "nuclear physics"),
 ("gamma ray", "an electromagnetic wave of very short wavelength emitted during radioactive decay", "nuclear physics"),
 ("half-life", "the time taken for half the atoms in a radioactive substance to decay", "nuclear physics"),
 ("nuclear fission", "the splitting of a heavy nucleus into lighter nuclei with the release of energy", "nuclear physics"),
 ("nuclear fusion", "the joining of light nuclei to form a heavier nucleus with the release of energy", "nuclear physics"),
 ("potential difference", "the work done in moving unit charge between two points", "electricity"),
 ("electromotive force", "the energy provided by a source per unit charge", "electricity"),
 ("efficiency", "the ratio of useful output energy to the total input energy", "energy"),
 ("machine", "a device that makes work easier by changing the size or direction of a force", "mechanics"),
 ("mechanical advantage", "the ratio of the load to the effort in a machine", "mechanics"),
 ("velocity ratio", "the ratio of the distance moved by the effort to the distance moved by the load", "mechanics"),
 ("moment", "the turning effect of a force about a point", "mechanics"),
],
}


def unitize(o, ans, unit):
    """Append unit to every option and return (options, correct_index)."""
    ou = [x + unit for x in o]
    return ou, ou.index(ans + unit)

def unitize(o, ans, unit):
    """Append unit to every option and return (options, correct_index)."""
    ou = [x + unit for x in o]
    return ou, ou.index(ans + unit)

def num_build(g, stem, ans, unit, expl, wrongs, numeric):
    w = pad_wrongs(g.rng, wrongs, ans, numeric=numeric)
    o, _ = mcq_opts(g.rng, w, ans)
    ou, ai = unitize(o, ans, unit)
    return g.build(stem, ou, ai, expl)

def speed_q(g):
    d = g.choice([30, 40, 60, 80, 100, 120, 150, 200]); t = g.choice([1, 2, 3, 4, 5])
    ans = H(d / t)
    return num_build(g, f"A car covers a distance of {d} km in {t} hours. Find its average speed.", ans, " km/h",
                     f"Speed = distance ÷ time = {d} ÷ {t} = {ans} km/h.", [H(d), H(d * t), H(t)], d / t)

def weight_q(g):
    m = g.choice([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]); ans = H(10 * m)
    return num_build(g, f"Find the weight of a body of mass {m} kg. (Take g = 10 m/s²)", ans, " N",
                     f"Weight = mass × gravity = {m} × 10 = {ans} N.", [H(m), H(m * 5), H(m * 20)], 10 * m)

def force_q(g):
    m = g.choice([2, 4, 5, 6, 10, 12, 15, 20]); a = g.choice([2, 3, 4, 5, 6]); ans = m * a
    return num_build(g, f"What force is needed to give a mass of {m} kg an acceleration of {a} m/s²?", str(ans), " N",
                     f"F = ma = {m} × {a} = {ans} N.", [H(m + a), H(m * a * 2), H(m)], ans)

def density_q(g):
    m = g.choice([20, 30, 40, 60, 80, 100, 120]); v = g.choice([2, 4, 5, 10]); ans = H(m / v)
    return num_build(g, f"A body has a mass of {m} g and a volume of {v} cm³. Calculate its density.", ans, " g/cm³",
                     f"Density = mass ÷ volume = {m} ÷ {v} = {ans} g/cm³.", [H(m), H(m * v), H(v)], m / v)

def ohms_q(g):
    V = g.choice([6, 9, 12, 15, 24, 30, 36]); R = g.choice([2, 3, 4, 6, 10]); ans = H(V / R)
    return num_build(g, f"Find the current through a resistor of {R} Ω connected to a {V} V supply.", ans, " A",
                     f"I = V ÷ R = {V} ÷ {R} = {ans} A.", [H(V), H(V * R), H(R)], V / R)

def power_q(g):
    E = g.choice([100, 150, 200, 300, 400, 600]); t = g.choice([2, 4, 5, 10]); ans = H(E / t)
    return num_build(g, f"A machine does {E} J of work in {t} seconds. Calculate its power.", ans, " W",
                     f"Power = work ÷ time = {E} ÷ {t} = {ans} W.", [H(E), H(E * t), H(t)], E / t)

def ke_q(g):
    m = g.choice([2, 4, 6, 8, 10]); v = g.choice([2, 3, 4, 5, 6]); ans = H(0.5 * m * v * v)
    return num_build(g, f"Find the kinetic energy of a body of mass {m} kg moving with a velocity of {v} m/s.", ans, " J",
                     f"K.E. = ½mv² = ½ × {m} × {v}² = {ans} J.", [H(m * v), H(m * v * v), H(m * v / 2)], 0.5 * m * v * v)

def lambda_q(g):
    v = g.choice([3, 8, 6, 10, 15, 20]); f = g.choice([2, 4, 5, 10]); ans = H(v / f)
    return num_build(g, f"A wave travels with a speed of {v} m/s and a frequency of {f} Hz. Find its wavelength.", ans, " m",
                     f"λ = v ÷ f = {v} ÷ {f} = {ans} m.", [H(v), H(v * f), H(f)], v / f)

def pq(g):
    V = g.choice([12, 15, 24, 30]); I = g.choice([1, 2, 3, 4, 5]); ans = V * I
    return num_build(g, f"An appliance draws a current of {I} A from a {V} V supply. Find the power consumed.", str(ans), " W",
                     f"P = VI = {V} × {I} = {ans} W.", [H(V + I), H(V / I), H(V * 2)], ans)

FUNCS = {1: [speed_q, weight_q, density_q], 2: [speed_q, weight_q, density_q, ohms_q, power_q, ke_q],
         3: [speed_q, weight_q, density_q, ohms_q, power_q, ke_q, lambda_q, pq, force_q]}
FACT_TARGET = {1: 78, 2: 72, 3: 70}

def generate(level, seed=1, target=100, blocked=None):
    g = G(SUBJECT, seed, blocked)
    g.lvl = level
    g.fill_facts(FACTS[level], FACT_TARGET[level], use_cap=4)
    g.fill_params(FUNCS[level], target)
    g.shuffle_qs()
    return g.qs
