# -*- coding: utf-8 -*-
"""Economics: facts + light numeric items, 100 per level."""
from engine import G, H, pad_wrongs, mcq_opts

SUBJECT = "Economics"

FACTS = {
1: [
 ("scarcity", "the limited supply of resources relative to unlimited human wants", "basic concepts"),
 ("opportunity cost", "the value of the next best alternative foregone when a choice is made", "basic concepts"),
 ("scale of preference", "a list of wants arranged in order of importance", "basic concepts"),
 ("choice", "the selection of one alternative out of a number of alternatives", "basic concepts"),
 ("utility", "the satisfaction derived from the consumption of a commodity", "basic concepts"),
 ("goods", "physical commodities that can satisfy human wants", "basic concepts"),
 ("services", "intangible things done for people to satisfy their wants", "basic concepts"),
 ("wealth", "the total stock of assets that have money value", "basic concepts"),
 ("wants", "the desires of human beings for goods and services", "basic concepts"),
 ("production", "the creation of goods and services to satisfy human wants", "production"),
 ("consumption", "the use of goods and services to satisfy wants", "production"),
 ("distribution", "the sharing of goods and services among the members of the society", "production"),
 ("exchange", "the giving of one thing in return for another", "production"),
 ("barter", "the direct exchange of goods for goods without the use of money", "production"),
 ("money", "anything that is generally acceptable as a medium of exchange", "money and banking"),
 ("market", "any arrangement that brings buyers and sellers into contact", "demand and supply"),
 ("demand", "the quantity of a commodity that consumers are willing and able to buy at a given price", "demand and supply"),
 ("supply", "the quantity of a commodity that producers are willing and able to offer for sale at a given price", "demand and supply"),
 ("price", "the amount of money paid for a unit of a commodity", "demand and supply"),
 ("land", "the natural resources used in production", "factors of production"),
 ("labour", "the human effort, both physical and mental, used in production", "factors of production"),
 ("capital", "the man-made resources used in production", "factors of production"),
 ("entrepreneur", "the person who combines the factors of production and bears the risk", "factors of production"),
 ("wages", "the reward for labour", "factors of production"),
 ("rent", "the reward for land", "factors of production"),
 ("interest", "the reward for capital", "factors of production"),
 ("profit", "the reward for the entrepreneur", "factors of production"),
 ("consumer", "a person who buys goods and services for personal use", "basic concepts"),
 ("producer", "a person who creates goods and services for sale", "basic concepts"),
 ("retailer", "a trader who buys in small quantities and sells to the final consumer", "basic concepts"),
],
2: [
 ("price elasticity of demand", "the responsiveness of quantity demanded to a change in price", "demand and supply"),
 ("price elasticity of supply", "the responsiveness of quantity supplied to a change in price", "demand and supply"),
 ("substitute goods", "goods that can be used in place of each other, such as butter and margarine", "demand and supply"),
 ("complementary goods", "goods that are consumed together, such as bread and butter", "demand and supply"),
 ("normal goods", "goods whose demand rises as income rises", "demand and supply"),
 ("inferior goods", "goods whose demand falls as income rises", "demand and supply"),
 ("equilibrium price", "the price at which quantity demanded equals quantity supplied", "demand and supply"),
 ("surplus", "the excess of quantity supplied over quantity demanded at a given price", "demand and supply"),
 ("shortage", "the excess of quantity demanded over quantity supplied at a given price", "demand and supply"),
 ("market demand", "the total demand for a commodity by all consumers at a given price", "demand and supply"),
 ("fixed cost", "a cost that does not change with the level of output", "production and costs"),
 ("variable cost", "a cost that changes with the level of output", "production and costs"),
 ("total cost", "the sum of fixed cost and variable cost", "production and costs"),
 ("average cost", "the total cost divided by the number of units produced", "production and costs"),
 ("marginal cost", "the additional cost of producing one extra unit", "production and costs"),
 ("total revenue", "the price multiplied by the quantity sold", "production and costs"),
 ("perfect competition", "a market with many buyers and sellers of identical products and free entry", "market structures"),
 ("monopoly", "a market with a single seller of a product that has no close substitute", "market structures"),
 ("oligopoly", "a market dominated by a few large sellers", "market structures"),
 ("duopoly", "a market with only two sellers", "market structures"),
 ("monopsony", "a market with a single buyer", "market structures"),
 ("bank rate", "the rate at which the central bank lends money to commercial banks", "money and banking"),
 ("central bank", "the bank that issues currency and controls the banking system of a country", "money and banking"),
 ("bank overdraft", "a facility that allows a customer to withdraw more than the balance in the account", "money and banking"),
 ("cheque", "a written order to a bank to pay a stated sum from a customer's account", "money and banking"),
 ("demand deposit", "money deposited in a current account that can be withdrawn on demand", "money and banking"),
 ("inflation", "a persistent rise in the general price level", "national income"),
 ("unemployment", "the situation in which people who are able and willing to work cannot find jobs", "national income"),
 ("division of labour", "the breaking of production into stages with different workers specialising", "production and costs"),
 ("specialisation", "the concentration of an individual or firm on a particular line of production", "production and costs"),
],
3: [
 ("gross domestic product", "the total value of goods and services produced within a country in a year", "national income"),
 ("gross national product", "the total value of goods and services produced by citizens of a country in a year", "national income"),
 ("per capita income", "the national income divided by the population of a country", "national income"),
 ("deflation", "a persistent fall in the general price level", "national income"),
 ("devaluation", "the deliberate reduction of the value of a country's currency in terms of other currencies", "international trade"),
 ("revaluation", "the deliberate increase of the value of a country's currency in terms of other currencies", "international trade"),
 ("balance of trade", "the difference between the value of a country's visible exports and imports", "international trade"),
 ("balance of payments", "the record of all the transactions of a country with other countries", "international trade"),
 ("tariff", "a tax imposed on imported goods", "international trade"),
 ("quota", "a limit placed on the quantity of a commodity that may be imported", "international trade"),
 ("exchange rate", "the rate at which one currency is exchanged for another", "international trade"),
 ("free trade", "trade between countries without tariff or quota restrictions", "international trade"),
 ("protectionism", "the restriction of imports to protect local industries", "international trade"),
 ("comparative advantage", "a country's advantage in producing the commodity at a lower opportunity cost", "international trade"),
 ("fiscal policy", "the use of government revenue and expenditure to regulate the economy", "public finance"),
 ("monetary policy", "the control of money supply and interest rates to regulate the economy", "public finance"),
 ("budget", "a financial statement of estimated income and expenditure of a government", "public finance"),
 ("direct tax", "a tax levied directly on the income of individuals and firms", "public finance"),
 ("indirect tax", "a tax levied on goods and services, such as import duties", "public finance"),
 ("progressive tax", "a tax whose rate increases as income increases", "public finance"),
 ("regressive tax", "a tax that takes a larger proportion of income from low-income earners", "public finance"),
 ("proportional tax", "a tax that takes the same percentage of all incomes", "public finance"),
 ("public debt", "the total amount owed by a government", "public finance"),
 ("development bank", "a bank that provides long-term loans for development projects", "money and banking"),
 ("mortgage bank", "a bank that specialises in loans for housing", "money and banking"),
 ("money market", "the market for short-term funds", "money and banking"),
 ("capital market", "the market for long-term funds such as shares and debentures", "money and banking"),
 ("foreign exchange market", "the market where different currencies are bought and sold", "international trade"),
 ("OPEC", "the Organisation of Petroleum Exporting Countries", "international organisations"),
 ("World Trade Organization", "the international body that regulates trade between countries", "international organisations"),
 ("World Bank", "the international institution that provides loans for development", "international organisations"),
 ("International Monetary Fund", "the institution that promotes international monetary cooperation", "international organisations"),
],
}

def tr_q(g):
    P = g.choice([50, 100, 150, 200, 250])
    Q = g.choice([10, 20, 30, 40, 50])
    ans = P * Q
    wrongs = pad_wrongs(g.rng, [H(P + Q), H(P * Q * 2), H(Q)], str(ans), numeric=ans)
    o, ai = mcq_opts(g.rng, wrongs, str(ans))
    return g.build(f"A trader sells {Q} units of a commodity at ₦{P} per unit. Find his total revenue.",
                   [x + "" for x in o], ai, f"Total revenue = price × quantity = ₦{P} × {Q} = ₦{ans}.")

def mean_q(g):
    vals = g.sample([120, 140, 160, 180, 200, 240, 260, 300], 4)
    m = sum(vals) // 4
    wrongs = pad_wrongs(g.rng, [H(sum(vals)), H(m + 10), H(m - 10)], str(m), numeric=m)
    o, ai = mcq_opts(g.rng, wrongs, str(m))
    return g.build(f"The prices of four commodities are ₦{', ₦'.join(H(v) for v in vals)}. Find the average price.",
                   o, ai, f"Average = (₦{'+₦'.join(H(v) for v in vals)}) ÷ 4 = ₦{m}.")

def pct_q(g):
    n = g.choice([200, 250, 300, 400, 500])
    p = g.choice([10, 20, 25, 40, 50])
    ans = p * n // 100
    wrongs = pad_wrongs(g.rng, [H(n - ans), H(n + ans), H(ans * 2)], str(ans), numeric=ans)
    o, ai = mcq_opts(g.rng, wrongs, str(ans))
    return g.build(f"A man earns ₦{n} per month and spends {p}% of it on food. How much does he spend on food?",
                   o, ai, f"{p}% of ₦{n} = {p}/100 × {n} = ₦{ans}.")

FUNCS = {1: [tr_q], 2: [tr_q, mean_q], 3: [tr_q, mean_q, pct_q]}
FACT_TARGET = {1: 90, 2: 90, 3: 90}

def generate(level, seed=1, target=100, blocked=None):
    g = G(SUBJECT, seed, blocked)
    g.lvl = level
    g.fill_facts(FACTS[level], FACT_TARGET[level], use_cap=4)
    g.fill_params(FUNCS[level], target)
    g.shuffle_qs()
    return g.qs
