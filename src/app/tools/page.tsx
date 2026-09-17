"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cx } from "@/lib/utils";

/* ═══════════════════ DATA ═══════════════════ */

const FORMULAS = {
  Mathematics: [
    { name: "Quadratic Formula", formula: "x = (-b ± √(b²-4ac)) / 2a", note: "Solves ax² + bx + c = 0" },
    { name: "Area of Circle", formula: "A = πr²", note: "r = radius" },
    { name: "Distance Formula", formula: "d = √((x₂-x₁)² + (y₂-y₁)²)", note: "Between two points" },
    { name: "Arithmetic Progression", formula: "Tₙ = a + (n-1)d", note: "nth term; a = first term, d = common difference" },
    { name: "Geometric Progression", formula: "Tₙ = arⁿ⁻¹", note: "nth term; r = common ratio" },
    { name: "Sum of AP", formula: "Sₙ = n/2 [2a + (n-1)d]", note: "Sum of first n terms" },
    { name: "Pythagoras", formula: "c² = a² + b²", note: "Right-angled triangle" },
  ],
  Physics: [
    { name: "Newton's Second Law", formula: "F = ma", note: "Force = mass × acceleration" },
    { name: "Speed", formula: "v = d/t", note: "velocity = distance / time" },
    { name: "Kinetic Energy", formula: "KE = ½mv²", note: "m = mass, v = velocity" },
    { name: "Ohm's Law", formula: "V = IR", note: "Voltage = Current × Resistance" },
    { name: "Wave Equation", formula: "v = fλ", note: "velocity = frequency × wavelength" },
    { name: "Power", formula: "P = W/t = IV", note: "Work per time or Current × Voltage" },
    { name: "Hooke's Law", formula: "F = ke", note: "Force = spring constant × extension" },
    { name: "Density", formula: "ρ = m/V", note: "mass per unit volume" },
  ],
  Chemistry: [
    { name: "Moles", formula: "n = m/M", note: "moles = mass / molar mass" },
    { name: "Boyle's Law", formula: "P₁V₁ = P₂V₂", note: "At constant temperature" },
    { name: "Charles's Law", formula: "V₁/T₁ = V₂/T₂", note: "At constant pressure" },
    { name: "Ideal Gas", formula: "PV = nRT", note: "R = 8.314 J/(mol·K)" },
    { name: "pH", formula: "pH = -log[H⁺]", note: "Hydrogen ion concentration" },
    { name: "Avogadro's Number", formula: "Nₐ = 6.02 × 10²³", note: "Particles per mole" },
  ],
};

const ELEMENTS = [
  { z: 1, sym: "H", name: "Hydrogen", mass: 1.008, cat: "nonmetal" },
  { z: 2, sym: "He", name: "Helium", mass: 4.003, cat: "noble" },
  { z: 3, sym: "Li", name: "Lithium", mass: 6.941, cat: "alkali" },
  { z: 4, sym: "Be", name: "Beryllium", mass: 9.012, cat: "alkaline" },
  { z: 5, sym: "B", name: "Boron", mass: 10.81, cat: "metalloid" },
  { z: 6, sym: "C", name: "Carbon", mass: 12.01, cat: "nonmetal" },
  { z: 7, sym: "N", name: "Nitrogen", mass: 14.01, cat: "nonmetal" },
  { z: 8, sym: "O", name: "Oxygen", mass: 16.00, cat: "nonmetal" },
  { z: 9, sym: "F", name: "Fluorine", mass: 19.00, cat: "halogen" },
  { z: 10, sym: "Ne", name: "Neon", mass: 20.18, cat: "noble" },
  { z: 11, sym: "Na", name: "Sodium", mass: 22.99, cat: "alkali" },
  { z: 12, sym: "Mg", name: "Magnesium", mass: 24.31, cat: "alkaline" },
  { z: 13, sym: "Al", name: "Aluminium", mass: 26.98, cat: "metal" },
  { z: 14, sym: "Si", name: "Silicon", mass: 28.09, cat: "metalloid" },
  { z: 15, sym: "P", name: "Phosphorus", mass: 30.97, cat: "nonmetal" },
  { z: 16, sym: "S", name: "Sulphur", mass: 32.07, cat: "nonmetal" },
  { z: 17, sym: "Cl", name: "Chlorine", mass: 35.45, cat: "halogen" },
  { z: 18, sym: "Ar", name: "Argon", mass: 39.95, cat: "noble" },
  { z: 19, sym: "K", name: "Potassium", mass: 39.10, cat: "alkali" },
  { z: 20, sym: "Ca", name: "Calcium", mass: 40.08, cat: "alkaline" },
  { z: 26, sym: "Fe", name: "Iron", mass: 55.85, cat: "transition" },
  { z: 29, sym: "Cu", name: "Copper", mass: 63.55, cat: "transition" },
  { z: 30, sym: "Zn", name: "Zinc", mass: 65.38, cat: "transition" },
  { z: 35, sym: "Br", name: "Bromine", mass: 79.90, cat: "halogen" },
  { z: 47, sym: "Ag", name: "Silver", mass: 107.9, cat: "transition" },
  { z: 53, sym: "I", name: "Iodine", mass: 126.9, cat: "halogen" },
  { z: 79, sym: "Au", name: "Gold", mass: 197.0, cat: "transition" },
  { z: 82, sym: "Pb", name: "Lead", mass: 207.2, cat: "metal" },
];

const CAT_COLORS: Record<string, string> = {
  nonmetal: "#34D399", halogen: "#FBBF24", noble: "#A78BFA", alkali: "#F87171",
  alkaline: "#F472B6", metal: "#7DD3FC", metalloid: "#38BDF8", transition: "#C8F169",
};

const CONVERSIONS: Record<string, { units: string[]; factors: number[] }> = {
  Length: { units: ["m", "cm", "mm", "km", "inches", "feet", "yards", "miles"], factors: [1, 0.01, 0.001, 1000, 0.0254, 0.3048, 0.9144, 1609.344] },
  Mass: { units: ["kg", "g", "mg", "tonnes", "pounds", "ounces"], factors: [1, 0.001, 0.000001, 1000, 0.453592, 0.0283495] },
  Temperature: { units: ["°C", "°F", "K"], factors: [] },
  Volume: { units: ["L", "mL", "cm³", "m³", "gallons"], factors: [1, 0.001, 0.001, 1000, 3.78541] },
  Time: { units: ["seconds", "minutes", "hours", "days", "weeks"], factors: [1, 60, 3600, 86400, 604800] },
};

function convertTemp(val: number, from: string, to: string): number {
  let celsius: number;
  if (from === "°C") celsius = val;
  else if (from === "°F") celsius = (val - 32) * 5 / 9;
  else celsius = val - 273.15;
  if (to === "°C") return celsius;
  if (to === "°F") return celsius * 9 / 5 + 32;
  return celsius + 273.15;
}

/* ═══════════════════ TABS ═══════════════════ */

const TABS = [
  { id: "formulas", label: "📐 Formula Vault", icon: "📐" },
  { id: "periodic", label: "🧪 Periodic Table", icon: "🧪" },
  { id: "converter", label: "🔄 Converter", icon: "🔄" },
  { id: "calculator", label: "🔢 Calculator", icon: "🔢" },
];

export default function ToolsPage() {
  const [tab, setTab] = useState("formulas");
  const [search, setSearch] = useState("");

  return (
    <main className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="font-mono text-xs tracking-[0.3em] text-dim">REFERENCE & UTILITIES</p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
            Study <span className="text-stroke">Tools</span>
          </h1>
        </header>

        {/* tab bar */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(""); }}
              className={cx(
                "rounded-xl border px-5 py-3 font-display text-sm font-bold transition-all",
                tab === t.id ? "border-lime bg-lime/10 text-lime" : "border-line text-dim hover:text-paper",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── FORMULA VAULT ─── */}
        {tab === "formulas" && (
          <div className="space-y-8">
            {Object.entries(FORMULAS).map(([subj, formulas]) => (
              <div key={subj}>
                <h2 className="mb-3 font-display text-lg font-black">{subj}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {formulas.map((f) => (
                    <motion.div
                      key={f.name}
                      whileHover={{ y: -2, scale: 1.01 }}
                      className="rounded-xl border border-line bg-panel p-5"
                    >
                      <p className="font-mono text-[10px] tracking-widest text-dim">{f.name.toUpperCase()}</p>
                      <p className="mt-2 font-mono text-xl font-bold text-lime">{f.formula}</p>
                      <p className="mt-2 text-xs text-dim">{f.note}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── PERIODIC TABLE ─── */}
        {tab === "periodic" && (
          <div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search elements..."
              className="mb-5 w-full max-w-sm rounded-xl border border-line bg-ink px-4 py-3 text-sm outline-none focus:border-lime placeholder:text-dim"
            />
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(CAT_COLORS).map(([cat, color]) => (
                <span key={cat} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[10px]">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="capitalize text-dim">{cat}</span>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
              {ELEMENTS.filter((e) =>
                !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.sym.toLowerCase().includes(search.toLowerCase()),
              ).map((e) => (
                <motion.div
                  key={e.z}
                  whileHover={{ scale: 1.05 }}
                  className="rounded-xl border border-line bg-panel p-3 text-center transition-all hover:border-white/30"
                >
                  <p className="font-mono text-[9px] text-dim tabular">{e.z}</p>
                  <p className="font-display text-2xl font-black" style={{ color: CAT_COLORS[e.cat] ?? "#fff" }}>
                    {e.sym}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold">{e.name}</p>
                  <p className="font-mono text-[9px] text-dim tabular">{e.mass}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ─── UNIT CONVERTER ─── */}
        {tab === "converter" && <ConverterPanel />}

        {/* ─── CALCULATOR ─── */}
        {tab === "calculator" && <CalcPanel />}
      </div>
    </main>
  );
}

/* ─── CONVERTER ─── */
function ConverterPanel() {
  const [category, setCategory] = useState("Length");
  const [fromUnit, setFromUnit] = useState(0);
  const [toUnit, setToUnit] = useState(1);
  const [value, setValue] = useState("1");

  const conv = CONVERSIONS[category];
  const result = useMemo(() => {
    const v = parseFloat(value);
    if (isNaN(v)) return "—";
    if (category === "Temperature") {
      return convertTemp(v, conv.units[fromUnit], conv.units[toUnit]).toFixed(4);
    }
    const base = v * conv.factors[fromUnit];
    return (base / conv.factors[toUnit]).toFixed(6).replace(/\.?0+$/, "");
  }, [value, category, fromUnit, toUnit, conv]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-panel p-6">
      <p className="font-mono text-[10px] tracking-widest text-dim">UNIT CONVERTER</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.keys(CONVERSIONS).map((c) => (
          <button
            key={c}
            onClick={() => { setCategory(c); setFromUnit(0); setToUnit(1); }}
            className={cx("rounded-lg border px-3 py-2 text-xs font-bold transition-colors", category === c ? "border-lime bg-lime/10 text-lime" : "border-line text-dim hover:text-paper")}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-dim">From</label>
          <select value={fromUnit} onChange={(e) => setFromUnit(Number(e.target.value))} className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm outline-none">
            {conv.units.map((u, i) => <option key={u} value={i}>{u}</option>)}
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value)} type="number" className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm outline-none focus:border-lime" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-dim">To</label>
          <select value={toUnit} onChange={(e) => setToUnit(Number(e.target.value))} className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm outline-none">
            {conv.units.map((u, i) => <option key={u} value={i}>{u}</option>)}
          </select>
          <div className="mt-2 rounded-lg border border-lime/30 bg-lime/5 px-3 py-2.5 font-mono text-lg font-bold text-lime tabular">
            {result}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CALCULATOR ─── */
function CalcPanel() {
  const [expr, setExpr] = useState("");
  const feed = (k: string) => {
    if (k === "C") return setExpr("");
    if (k === "⌫") return setExpr((s) => s.slice(0, -1));
    if (k === "=") {
      setExpr((s) => {
        if (!/^[0-9+\-*/.() ]+$/.test(s) || !s) return "ERR";
        try {
          const v = Function(`"use strict"; return (${s})`)() as number;
          return Number.isFinite(v) ? String(Math.round(v * 1e8) / 1e8) : "ERR";
        } catch { return "ERR"; }
      });
      return;
    }
    setExpr((s) => (s === "ERR" ? k : s + k));
  };
  const keys = ["C", "⌫", "(", ")", "7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "+", "="];
  return (
    <div className="mx-auto max-w-xs rounded-2xl border border-line bg-panel p-5">
      <p className="font-mono text-[10px] tracking-widest text-dim">SCIENTIFIC CALCULATOR</p>
      <div className="mt-3 min-h-12 truncate rounded-xl border border-line bg-ink px-4 py-3 text-right font-mono text-2xl text-lime tabular">
        {expr || "0"}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => feed(k)}
            className={cx(
              "rounded-xl py-3 font-mono text-sm font-bold transition-colors",
              k === "=" ? "bg-lime text-ink hover:bg-lime2" :
              k === "C" ? "bg-coral/20 text-coral hover:bg-coral/30" :
              "bg-white/5 text-paper hover:bg-white/10",
            )}
          >
            {k === "*" ? "×" : k === "/" ? "÷" : k}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-[9px] text-dim">WAEC / JAMB READY</p>
    </div>
  );
}
