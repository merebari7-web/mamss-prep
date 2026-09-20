# -*- coding: utf-8 -*-
"""Commerce: facts + light numeric items, 100 per level."""
from engine import G, H, pad_wrongs, mcq_opts

SUBJECT = "Commerce"

FACTS = {
1: [
 ("commerce", "trade and the aids to trade", "trade basics"),
 ("trade", "the buying and selling of goods and services", "trade basics"),
 ("trade by barter", "the direct exchange of goods for goods without the use of money", "trade basics"),
 ("home trade", "trade carried out within the borders of a country", "trade basics"),
 ("foreign trade", "trade carried out between one country and another", "trade basics"),
 ("import trade", "the buying of goods from another country", "trade basics"),
 ("export trade", "the selling of goods to another country", "trade basics"),
 ("wholesale trade", "the buying of goods in bulk and selling them in smaller quantities to retailers", "trade basics"),
 ("retail trade", "the sale of goods in small quantities to the final consumer", "trade basics"),
 ("currency", "the money in use in a country", "trade basics"),
 ("competition", "the rivalry among sellers for the same customers", "trade basics"),
 ("wholesaler", "the middleman who buys in bulk from the manufacturer and sells to retailers", "trade basics"),
 ("retailer", "the middleman who buys from the wholesaler and sells to the consumer", "trade basics"),
 ("customer", "a person who buys goods or services from a shop or business", "trade basics"),
 ("supplier", "a person or firm that provides goods to another business", "trade basics"),
 ("auction", "a public sale in which goods are sold to the highest bidder", "trade basics"),
 ("transport", "the movement of people and goods from one place to another", "aids to trade"),
 ("warehousing", "the storing of goods until they are needed", "aids to trade"),
 ("insurance", "the arrangement by which risks of loss are shared among many contributors", "aids to trade"),
 ("banking", "the business of accepting deposits and granting loans", "aids to trade"),
 ("advertising", "the publicising of goods and services to attract buyers", "aids to trade"),
 ("communication", "the sending and receiving of information between people", "aids to trade"),
 ("sole proprietorship", "a business owned and controlled by one person", "business organisation"),
 ("partnership", "a business owned by two to twenty persons who share profits and losses", "business organisation"),
 ("cooperative society", "a business owned and run jointly by its members for mutual benefit", "business organisation"),
 ("limited liability company", "a company whose members are liable only to the value of their shares", "business organisation"),
 ("sale", "the exchange of goods or services for money", "trade basics"),
 ("purchase", "the act of buying something", "trade basics"),
 ("cash", "money in the form of coins and notes", "business finance"),
 ("turnover", "the total value of goods sold in a given period", "business finance"),
 ("stock", "the goods kept by a trader for sale", "business finance"),
 ("debtor", "a person who owes money to a business", "business finance"),
 ("creditor", "a person to whom a business owes money", "business finance"),
],
2: [
 ("invoice", "the document sent by the seller to the buyer showing the goods supplied and their prices", "business documents"),
 ("receipt", "the document that acknowledges that payment has been made", "business documents"),
 ("proforma invoice", "the document sent to a buyer to show the terms and price of goods before they are supplied", "business documents"),
 ("credit note", "the document used to correct an overcharge or to record returned goods", "business documents"),
 ("debit note", "the document used to correct an undercharge on an invoice", "business documents"),
 ("order form", "the document used by a buyer to order goods from a seller", "business documents"),
 ("quotation", "the document that states the price and terms at which a seller is willing to supply goods", "business documents"),
 ("catalogue", "the booklet that lists and illustrates the goods of a seller", "business documents"),
 ("bill of lading", "the document issued by a shipping company acknowledging receipt of goods for shipment", "business documents"),
 ("airway bill", "the document used by an airline to acknowledge receipt of goods for air transport", "business documents"),
 ("bank statement", "the printed record of all the transactions in a bank account", "banking"),
 ("bank draft", "a cheque drawn by a bank on itself", "banking"),
 ("standing order", "an instruction to a bank to make fixed payments regularly", "banking"),
 ("current account", "a bank account from which money can be withdrawn on demand by cheque", "banking"),
 ("savings account", "a bank account that earns interest and requires a passbook", "banking"),
 ("fixed deposit account", "a bank account in which money is kept for a fixed period at a higher interest", "banking"),
 ("bank loan", "money lent by a bank to a customer, usually with interest", "banking"),
 ("commercial bank", "a bank that accepts deposits and grants loans to the public", "banking"),
 ("merchant bank", "a bank that mainly finances international trade and issues securities", "banking"),
 ("microfinance bank", "a bank that provides small loans to low-income customers", "banking"),
 ("insurance policy", "the written contract between the insured and the insurer", "insurance"),
 ("premium", "the amount paid by the insured to the insurer", "insurance"),
 ("insurable interest", "the financial interest of the insured in the item insured", "insurance"),
 ("utmost good faith", "the principle that both parties to an insurance contract must disclose all material facts", "insurance"),
 ("indemnity", "the principle that insurance compensates the insured without allowing him to profit", "insurance"),
 ("subrogation", "the principle that gives the insurer the right to take over the insured's rights after payment", "insurance"),
 ("underwriter", "the person who assesses risks and accepts them for insurance", "insurance"),
 ("life assurance", "an insurance that pays a sum on the death or maturity of the insured", "insurance"),
 ("transit insurance", "the insurance that covers goods while they are being transported", "insurance"),
 ("chain of distribution", "the route through which goods pass from the producer to the consumer", "marketing"),
 ("middleman", "the intermediary between the producer and the consumer", "marketing"),
 ("transportation", "the movement of goods and people from place to place", "aids to trade"),
 ("storage", "the keeping of goods until they are needed", "aids to trade"),
 ("expiry date", "the date after which a product should not be used", "marketing"),
],
3: [
 ("public limited company", "a company whose shares are sold to the general public on the stock exchange", "business organisation"),
 ("private limited company", "a company whose shares are not sold to the general public", "business organisation"),
 ("share", "a unit of capital in a company", "business finance"),
 ("ordinary shares", "shares that carry voting rights and a variable dividend", "business finance"),
 ("preference shares", "shares that receive a fixed dividend before ordinary shareholders", "business finance"),
 ("dividend", "the part of a company's profit distributed to shareholders", "business finance"),
 ("debenture", "a document acknowledging a loan to a company at a fixed interest", "business finance"),
 ("stock exchange", "the market where shares and other securities are bought and sold", "stock exchange"),
 ("broker", "a licensed agent who buys and sells shares on behalf of investors", "stock exchange"),
 ("bull", "a stock exchange operator who expects share prices to rise", "stock exchange"),
 ("bear", "a stock exchange operator who expects share prices to fall", "stock exchange"),
 ("stag", "an operator who buys new shares hoping to sell them at a profit", "stock exchange"),
 ("prospectus", "the document that invites the public to buy the shares of a company", "business organisation"),
 ("memorandum of association", "the document that states the name, objectives and capital of a company", "business organisation"),
 ("articles of association", "the document that contains the internal rules of a company", "business organisation"),
 ("certificate of incorporation", "the document that gives a company legal existence", "business organisation"),
 ("shareholders", "the owners of a company", "business organisation"),
 ("board of directors", "the group elected to manage the affairs of a company", "business organisation"),
 ("company secretary", "the officer responsible for the records and legal affairs of a company", "business organisation"),
 ("auditor", "the independent person who examines the accounts of a company", "business organisation"),
 ("nominal capital", "the amount of capital a company is authorised to raise", "business finance"),
 ("working capital", "the difference between current assets and current liabilities", "business finance"),
 ("fixed assets", "the assets that are kept for long-term use, such as machinery", "business finance"),
 ("current assets", "the assets that can be converted into cash within a year", "business finance"),
 ("liabilities", "the debts or obligations of a business", "business finance"),
 ("balance sheet", "the statement that shows the assets and liabilities of a business", "business finance"),
 ("trading account", "the account that shows the gross profit of a business", "business finance"),
 ("gross profit", "the excess of sales over the cost of goods sold", "business finance"),
 ("net profit", "the profit left after all expenses have been deducted from gross profit", "business finance"),
 ("break-even point", "the level of sales at which total revenue equals total cost", "business finance"),
 ("entreport trade", "the trade in which goods are imported for re-export", "trade basics"),
 ("terms of trade", "the ratio of export prices to import prices", "trade basics"),
 ("balance of trade", "the difference between the value of visible exports and visible imports", "trade basics"),
 ("entrepot", "a port through which goods are imported for re-export", "trade basics"),
 ("NAFDAC", "the agency that regulates food and drugs in Nigeria", "government agencies"),
 ("SON", "the agency that sets standards for products in Nigeria", "government agencies"),
],
}

def discount_q(g):
    price = g.choice([200, 500, 1000, 2000, 4000, 5000])
    pct = g.choice([5, 10, 20, 25, 50])
    ans = price * pct // 100
    wrongs = pad_wrongs(g.rng, [H(price - ans), H(ans * 2), H(price * pct // 50)], str(ans), numeric=ans)
    o, ai = mcq_opts(g.rng, wrongs, str(ans))
    return g.build(f"A trader gives a discount of {pct}% on an article marked ₦{price}. What is the discount?",
                   o, ai, f"Discount = {pct}% of ₦{price} = ₦{pct}/100 × {price} = ₦{ans}.")

def si_q(g):
    P = g.choice([500, 1000, 2000, 5000, 10000])
    R = g.choice([5, 10, 15, 20])
    T = g.choice([1, 2, 3])
    ans = P * R * T // 100
    wrongs = pad_wrongs(g.rng, [H(P + ans), H(ans * 2), H(P // 10)], str(ans), numeric=ans)
    o, ai = mcq_opts(g.rng, wrongs, str(ans))
    return g.build(f"A trader borrowed ₦{P} from a bank at {R}% simple interest per annum for {T} year(s). How much interest must he pay?",
                   o, ai, f"Interest = (₦{P} × {R} × {T}) ÷ 100 = ₦{ans}.")

FUNCS = {1: [], 2: [discount_q, si_q], 3: [discount_q, si_q]}
FACT_TARGET = {1: 100, 2: 95, 3: 95}

def generate(level, seed=1, target=100, blocked=None):
    g = G(SUBJECT, seed, blocked)
    g.lvl = level
    g.fill_facts(FACTS[level], FACT_TARGET[level], use_cap=4)
    g.fill_params(FUNCS[level], target)
    g.shuffle_qs()
    return g.qs
