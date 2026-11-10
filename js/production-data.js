var LJ = globalThis.LJ || (globalThis.LJ = {});

LJ.DATA.production = {
  maxStages: 5,
  maxStations: 12,
  stationGrowth: 1.6,
  rateGrowth: 10,
  costGrowth: 10,
  baseCapacity: 300,
  stages: [
    { id: "saw", name: "Sawing", icon: "🪚", rate: 6, cost: 15000, value: 1, blurb: "Breaks logs into rough boards." },
    { id: "plane", name: "Planing", icon: "🪵", rate: 4, cost: 40000, value: 1.6, blurb: "Smooth, graded boards." },
    { id: "dry", name: "Kiln Drying", icon: "🔥", rate: 3, cost: 80000, value: 1.5, blurb: "Dries stock to a premium moisture level." },
    { id: "pack", name: "Packaging", icon: "📦", rate: 8, cost: 12000, value: 1.6, blurb: "Crates and bundles ready to ship." }
  ],
  warehouse: {
    cost: 200000,
    growth: 2.5,
    capacity: 800,
    icon: "🏬",
    name: "Warehouse",
    blurb: "Adds 800 logs of storage for the production queue."
  },
  factory: {
    cost: 150000,
    growth: 2.4,
    icon: "🏭",
    name: "Factory",
    blurb: "Adds one more production line slot."
  }
};

LJ.DATA.achievements.push(
  {
    id: "first-line",
    name: "Mill Floor",
    icon: "🏭",
    desc: "Build your first production line.",
    test: (s) => !!s.prod && s.prod.lines.length >= 1
  },
  {
    id: "full-chain",
    name: "Full Chain",
    icon: "🔗",
    desc: "Run a line through all four processes.",
    test: (s) => !!s.prod && s.prod.lines.some((l) => l.stages.length === LJ.DATA.production.stages.length)
  }
);
