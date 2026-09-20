# -*- coding: utf-8 -*-
"""Geography: facts + longitude/scale numeric items, 100 per level."""
from engine import G, H, pad_wrongs, mcq_opts

SUBJECT = "Geography"

FACTS = {
1: [
 ("latitude", "the angular distance of a point north or south of the equator", "maps and coordinates"),
 ("longitude", "the angular distance of a point east or west of the Prime Meridian", "maps and coordinates"),
 ("equator", "the line of latitude at zero degrees", "maps and coordinates"),
 ("Prime Meridian", "the line of longitude at zero degrees", "maps and coordinates"),
 ("Tropic of Cancer", "the line of latitude 23.5 degrees north of the equator", "maps and coordinates"),
 ("Tropic of Capricorn", "the line of latitude 23.5 degrees south of the equator", "maps and coordinates"),
 ("hemisphere", "half of the earth, such as the northern hemisphere", "maps and coordinates"),
 ("globe", "a model of the earth", "maps and coordinates"),
 ("map", "a representation of the earth's surface on a flat sheet", "maps and coordinates"),
 ("scale", "the ratio between the distance on a map and the actual distance on the ground", "maps and coordinates"),
 ("compass", "the instrument used to find direction", "maps and coordinates"),
 ("key", "the part of a map that explains its symbols", "maps and coordinates"),
 ("continent", "a very large land mass, such as Africa", "physical geography"),
 ("ocean", "a very large body of salt water", "physical geography"),
 ("river", "a large stream of water flowing through land to a sea or lake", "physical geography"),
 ("mountain", "a very high landform rising steeply above the surrounding land", "physical geography"),
 ("hill", "a raised part of the earth's surface, lower than a mountain", "physical geography"),
 ("plateau", "a large area of high, flat land", "physical geography"),
 ("plain", "a broad, flat area of land", "physical geography"),
 ("valley", "a low area of land between hills or mountains", "physical geography"),
 ("weather", "the condition of the atmosphere at a particular time and place", "climate"),
 ("climate", "the average weather condition of a place over a long period", "climate"),
 ("temperature", "the degree of hotness or coldness of the air", "climate"),
 ("rainfall", "the amount of rain that falls in a place over a period", "climate"),
 ("wind", "the movement of air from one place to another", "climate"),
 ("rain gauge", "the instrument used to measure rainfall", "climate"),
 ("barometer", "the instrument used to measure atmospheric pressure", "climate"),
 ("thermometer", "the instrument used to measure temperature", "climate"),
 ("hygrometer", "the instrument used to measure humidity", "climate"),
 ("anemometer", "the instrument used to measure wind speed", "climate"),
 ("environment", "the surroundings in which living things exist", "environmental geography"),
 ("conservation", "the wise use and protection of natural resources", "environmental geography"),
 ("ecological balance", "the state of equilibrium between living things and their environment", "environmental geography"),
 ("natural hazard", "a natural event such as a flood or drought that threatens human life and property", "environmental geography"),
],
2: [
 ("erosion", "the wearing away and removal of soil and rock by water, wind or ice", "physical processes"),
 ("weathering", "the breaking down of rocks in their original position", "physical processes"),
 ("deposition", "the dropping of transported material as the transporting agent slows down", "physical processes"),
 ("drainage basin", "the area of land drained by a river and its tributaries", "physical processes"),
 ("watershed", "the high land that separates one drainage basin from another", "physical processes"),
 ("tributary", "a small river that flows into a bigger river", "physical processes"),
 ("delta", "the fan-shaped deposit formed where a river enters a sea or lake", "physical processes"),
 ("meander", "a bend in a river", "physical processes"),
 ("oxbow lake", "the crescent-shaped lake formed when a river cuts across a meander", "physical processes"),
 ("waterfall", "a sudden drop in the course of a river", "physical processes"),
 ("water table", "the level below which the ground is saturated with water", "physical processes"),
 ("spring", "a place where groundwater flows out of the ground naturally", "physical processes"),
 ("igneous rock", "a rock formed from the cooling and solidification of magma", "physical processes"),
 ("sedimentary rock", "a rock formed from the compaction of sediments", "physical processes"),
 ("metamorphic rock", "a rock formed by the action of heat and pressure on existing rocks", "physical processes"),
 ("faulting", "the breaking of rocks along a line of weakness", "physical processes"),
 ("folding", "the bending of rock layers due to earth movements", "physical processes"),
 ("earthquake", "a sudden shaking of the earth's crust", "physical processes"),
 ("volcano", "an opening in the earth's crust through which molten rock erupts", "physical processes"),
 ("population density", "the number of people living per square kilometre", "population"),
 ("migration", "the movement of people from one place to another", "population"),
 ("emigration", "the movement of people out of a country", "population"),
 ("immigration", "the movement of people into a country", "population"),
 ("push factors", "the negative conditions that drive people away from an area", "population"),
 ("pull factors", "the attractive conditions that draw people to an area", "population"),
 ("census", "the official counting of the people of a country", "population"),
 ("overpopulation", "a situation in which the population exceeds the available resources", "population"),
 ("urbanisation", "the movement of people from rural areas to towns and cities", "population"),
 ("settlement", "a place where people live, such as a village or city", "population"),
 ("land use", "the ways in which land is used by man", "economic geography"),
 ("irrigation", "the artificial supply of water to farmland", "economic geography"),
 ("plantation agriculture", "the large-scale cultivation of cash crops such as cocoa", "economic geography"),
],
3: [
 ("mangrove", "the salt-tolerant trees of the Niger Delta coastal swamps", "vegetation"),
 ("tropical rainforest", "the dense evergreen forest of hot, wet regions", "vegetation"),
 ("derived savanna", "the vegetation formed when rainforest is cleared and grassland takes over", "vegetation"),
 ("Guinea savanna", "the grassland with scattered trees found in the middle belt of Nigeria", "vegetation"),
 ("Sudan savanna", "the grassland of short trees found in the drier north of Nigeria", "vegetation"),
 ("Sahel", "the semi-desert belt bordering the Sahara", "vegetation"),
 ("desert", "a region with very low rainfall and sparse vegetation", "vegetation"),
 ("convectional rainfall", "rainfall caused by the heating of the ground and the rising of moist air", "climate"),
 ("relief rainfall", "rainfall caused when moist air is forced to rise over high land", "climate"),
 ("cyclonic rainfall", "rainfall associated with the meeting of cold and warm air masses", "climate"),
 ("harmattan", "the dry, dusty north-east trade wind that blows over West Africa", "climate"),
 ("trade winds", "the winds that blow steadily towards the equator", "climate"),
 ("monsoon", "a seasonal wind that brings heavy rain, especially in south Asia", "climate"),
 ("equatorial climate", "the hot, wet climate found along the equator with rain all year", "climate"),
 ("Mediterranean climate", "the climate of hot dry summers and warm wet winters", "climate"),
 ("isotherm", "a line joining places of equal temperature", "climate"),
 ("isobar", "a line joining places of equal atmospheric pressure", "climate"),
 ("isohyet", "a line joining places of equal rainfall", "climate"),
 ("contour line", "a line on a map joining points of equal height above sea level", "maps and coordinates"),
 ("relief", "the shape of the land surface", "maps and coordinates"),
 ("economic activities", "the activities by which people earn their living", "economic geography"),
 ("cash crop", "a crop grown mainly for sale", "economic geography"),
 ("food crop", "a crop grown mainly for consumption by the farmer", "economic geography"),
 ("nomadic herding", "the moving of cattle from place to place in search of pasture", "economic geography"),
 ("crude oil", "the mineral that is Nigeria's leading export", "economic geography"),
 ("rainforest timber", "the hardwood such as mahogany obtained from tropical forests", "economic geography"),
 ("industrialisation", "the establishment and growth of industries in a country", "economic geography"),
 ("transportation", "the movement of people and goods from place to place", "economic geography"),
 ("seaport", "a town with harbour facilities where ships load and unload", "economic geography"),
 ("foreign trade", "the exchange of goods and services between countries", "economic geography"),
 ("bilateral trade", "trade between two countries", "economic geography"),
 ("multilateral trade", "trade among many countries", "economic geography"),
],
}

def fmt_clock(total):
    hh, mm = (total // 60) % 24, total % 60
    suffix = "a.m." if hh < 12 else "p.m."
    hh12 = hh % 12 or 12
    return f"{hh12}:{mm:02d} {suffix}" if mm else f"{hh12} {suffix}"

def time_q(g):
    lon = g.choice([15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165])
    mins = lon * 4
    total = 12 * 60 + mins
    ans = fmt_clock(total)
    cands = [fmt_clock(total + 60), fmt_clock(total - 60), fmt_clock(total + 120),
             fmt_clock(total - 120), f"{lon} hours", f"{mins} minutes"]
    wrongs = pad_wrongs(g.rng, cands, ans)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"If the time at the Prime Meridian (0°) is 12 noon, what is the local time at longitude {lon}°E?",
                   o, ai, f"Each degree of longitude equals 4 minutes. {lon}° × 4 min = {mins} min = {mins//60} h {mins%60} min; "
                          f"adding this to 12 noon gives {ans}.")

def time_gap_q(g):
    lon = g.choice([15, 30, 45, 60, 90, 120, 150])
    mins = lon * 4
    ans = f"{mins} minutes"
    cands = [f"{mins + 60} minutes", f"{mins - 60} minutes", f"{mins + 120} minutes",
             f"{lon} minutes", f"{mins // 60} hours"]
    wrongs = pad_wrongs(g.rng, cands, ans)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"Two places differ by {lon} degrees of longitude. What is their time difference in minutes?",
                   o, ai, f"1° = 4 minutes, so {lon}° × 4 = {mins} minutes.")

def scale_q(g):
    scale = g.choice([50000, 100000, 200000, 500000])
    cm = g.choice([2, 4, 5, 8, 10, 15])
    km = cm * scale / 100000
    ans = H(km) + " km"
    wrongs = pad_wrongs(g.rng, [H(km * 2) + " km", H(km / 2) + " km", H(km / 4) + " km", H(km * 10) + " km"], ans)
    o, ai = mcq_opts(g.rng, wrongs, ans)
    return g.build(f"On a map of scale 1 : {scale}, a road measures {cm} cm. What is the actual length of the road?",
                   o, ai, f"Actual distance = {cm} × {scale} cm = {H(cm * scale)} cm = {H(cm * scale / 100000)} km.")

def lat_q(g):
    lat = g.choice([10, 15, 20, 25, 30, 35, 40, 45])
    ans = lat * 111
    wrongs = pad_wrongs(g.rng, [H(ans + 111), H(ans - 111), H(ans * 2), H(ans + 222)], str(ans), numeric=ans)
    o, ai = mcq_opts(g.rng, wrongs, str(ans))
    return g.build(f"Approximately how many kilometres is a point at latitude {lat}°N from the equator? (1° ≈ 111 km)",
                   o, ai, f"{lat} × 111 km = {ans} km.")

FUNCS = {1: [], 2: [time_q, scale_q, time_gap_q], 3: [time_q, time_gap_q, scale_q, lat_q]}
FACT_TARGET = {1: 100, 2: 92, 3: 90}

def generate(level, seed=1, target=100, blocked=None):
    g = G(SUBJECT, seed, blocked)
    g.lvl = level
    g.fill_facts(FACTS[level], FACT_TARGET[level], use_cap=4)
    g.fill_params(FUNCS[level], target)
    g.shuffle_qs()
    return g.qs
