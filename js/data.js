var LJ = globalThis.LJ || (globalThis.LJ = {});

LJ.DATA = {
  tools: [
    { id: "hand-axe", name: "Hand Axe", icon: "🪓", power: 1, cost: 0, blurb: "Grandad's axe. Still sharp enough." },
    { id: "felling-axe", name: "Felling Axe", icon: "⛏️", power: 3, cost: 75, blurb: "Long handle, heavy head, real swing." },
    { id: "bow-saw", name: "Bow Saw", icon: "🪚", power: 8, cost: 600, blurb: "Crosscut blade for thicker stems." },
    { id: "petrol-saw", name: "Petrol Chainsaw", icon: "🛠️", power: 25, cost: 4000, blurb: "Two-stroke roar. Mind the kickback." },
    { id: "pro-saw", name: "Pro Chainsaw", icon: "⚙️", power: 90, cost: 30000, blurb: "Anti-vibration handles and a torque-heavy engine." },
    { id: "carbide-saw", name: "Carbide Chainsaw", icon: "💠", power: 400, cost: 120000, blurb: "Carbide-tipped chain. Chews through hardwood." },
    { id: "hydro-saw", name: "Hydraulic Shear Saw", icon: "🔩", power: 2500, cost: 1000000, blurb: "Hydraulic head on a telescoping boom." },
    { id: "plasma-saw", name: "Plasma Cutter Saw", icon: "🔥", power: 18000, cost: 10000000, blurb: "Experimental. The trees never see it coming." },
    { id: "laser-saw", name: "Laser Felling Rig", icon: "🔆", power: 140000, cost: 50000000, blurb: "Coherent light, perfectly straight cuts." }
  ],

  machines: [
    {
      id: "crew", name: "Ground Crew", icon: "👷", photo: "assets/machines/crew.jpg", rate: 0.6, cost: 20, growth: 1.1, unlock: 0,
      blurb: "Hand crew limbing and bucking logs by the road."
    },
    {
      id: "skidder", name: "HSM 805 Articulated Skidder", icon: "🚜", photo: "assets/machines/skidder.jpg", rate: 3, cost: 150, growth: 1.12, unlock: 500,
      blurb: "Crane skidder dragging trunk bundles to the landing."
    },
    {
      id: "feller", name: "John Deere 843L-II Feller-Buncher", icon: "🌲", photo: "assets/machines/feller.jpg", rate: 14, cost: 1200, growth: 1.13, unlock: 5000,
      blurb: "Wheeled cutting head that fells and bunches in one swing."
    },
    {
      id: "grapple", name: "John Deere 648L-II Grapple Skidder", icon: "🦬", photo: "assets/machines/grapple.jpg", rate: 22, cost: 4000, growth: 1.13, unlock: 15000,
      blurb: "Articulated grapple skidder hauling whole trees."
    },
    {
      id: "forwarder", name: "John Deere 1510G Forwarder", icon: "🚛", photo: "assets/machines/forwarder.jpg", rate: 60, cost: 9000, growth: 1.14, unlock: 40000,
      blurb: "Eight wheels, a loader crane and a 15-tonne load."
    },
    {
      id: "tigrix-f550", name: "Tigercat 820 Track Feller-Buncher", icon: "🌳", photo: "assets/machines/tigrix-f550.jpg", rate: 90, cost: 40000, growth: 1.14, unlock: 120000,
      blurb: "Compact tracked feller for thinning and small clearfells."
    },
    {
      id: "harvester", name: "Komatsu 901XC Harvester", icon: "🏗️", photo: "assets/machines/harvester.jpg", rate: 300, cost: 75000, growth: 1.15, unlock: 300000,
      blurb: "Fells, delimbs and cuts to length in one cycle."
    },
    {
      id: "pondrix-14w", name: "Ponsse Elephant Forwarder", icon: "🚚", photo: "assets/machines/pondrix-14w.jpg", rate: 900, cost: 250000, growth: 1.15, unlock: 800000,
      blurb: "Eight-wheel giant hauling 18 tonnes a trip."
    },
    {
      id: "heavy", name: "John Deere 1470G Harvester", icon: "🛻", photo: "assets/machines/heavy.jpg", rate: 1800, cost: 700000, growth: 1.15, unlock: 3000000,
      blurb: "Heavy wheeled harvester for big stems and steep stands."
    },
    {
      id: "processor", name: "Pondrix Multi-Head Processor", icon: "🤖", photo: "assets/machines/processor.svg", rate: 10000, cost: 6000000, growth: 1.15, unlock: 10000000,
      blurb: "Measures, optimises and cuts every stem in parallel."
    },
    {
      id: "drone", name: "Vorrex AutoDrone Harvester", icon: "🛸", photo: "assets/machines/drone.svg", rate: 60000, cost: 70000000, growth: 1.15, unlock: 30000000,
      blurb: "Operator-free harvesting drones with a shared map."
    },
    {
      id: "swarm", name: "Vorrex Swarm Harvester", icon: "🐝", photo: "assets/machines/swarm.svg", rate: 250000, cost: 400000000, growth: 1.16, unlock: 100000000,
      blurb: "Dozens of cutting pods coordinated by one brain."
    },
    {
      id: "titan", name: "Vorrex Titan Fleet Unit", icon: "🚀", photo: "assets/machines/titan.svg", rate: 500000, cost: 900000000, growth: 1.16, unlock: 300000000,
      blurb: "Fleet-scale unit. Lumber trembles at its approach."
    }
  ],

  sawmill: [
    { id: "mill-band", name: "Band Saw Line", icon: "🪵", cost: 2500, price: 0.15, blurb: "Better boards mean better prices. +15% sale price." },
    { id: "mill-kiln", name: "Kiln Drying", icon: "🔥", cost: 40000, price: 0.25, blurb: "Kiln-dried lumber sells for a premium. +25% sale price." },
    { id: "mill-plane", name: "CNC Planer", icon: "📐", cost: 600000, price: 0.4, blurb: "Precision planing. +40% sale price." },
    { id: "mill-export", name: "Export Terminal", icon: "🚢", cost: 4000000, price: 0.6, blurb: "Ships to every continent. +60% sale price." }
  ],

  zones: [
    {
      id: "sapling", name: "Sapling Hill", unlock: 0, hp: 12, research: 0.05, tree: "sapling", size: 0.62,
      sky: ["#8fd8ff", "#e9fbe9"], sun: "#fff6c2", far: "#9bd3b0", near: "#6fb98a", ground: "#4f9d5e", leaf: "#67c26b", leaf2: "#3d9650", trunk: "#7b5636",
      blurb: "Gentle slope of birch and young aspen."
    },
    {
      id: "pine", name: "Pine Ridge", unlock: 5000, hp: 60, research: 0.25, tree: "pine", size: 0.8,
      sky: ["#6ec3f5", "#fff0cf"], sun: "#fff3a8", far: "#7aa98f", near: "#4f8a6a", ground: "#3f7d4f", leaf: "#2f8a4e", leaf2: "#1f6b3b", trunk: "#6b4425",
      blurb: "Sun-warmed pine on a dry ridge."
    },
    {
      id: "spruce", name: "Spruce Valley", unlock: 100000, hp: 300, research: 0.5, tree: "spruce", size: 0.95,
      sky: ["#4a86c5", "#d8e8f7"], sun: "#eaf6ff", far: "#5c7f99", near: "#3e6a5a", ground: "#2f5d48", leaf: "#1f5c45", leaf2: "#133f31", trunk: "#4a3322",
      blurb: "Damp valley floor under tall spruce."
    },
    {
      id: "taiga", name: "Frontier Taiga", unlock: 2000000, hp: 1500, research: 1, tree: "fir", size: 1,
      sky: ["#2d4d7a", "#7a8fb0"], sun: "#c9dcff", far: "#3e5a6e", near: "#2b4a48", ground: "#253f3a", leaf: "#1b4b3b", leaf2: "#103527", trunk: "#3d2b1f",
      blurb: "Boreal wilderness, permafrost and long winters."
    },
    {
      id: "oldgrowth", name: "Old Growth Forest", unlock: 20000000, hp: 9000, research: 2, tree: "oldgrowth", size: 1.05,
      sky: ["#f2a65a", "#ffd9a0"], sun: "#ffe0a3", far: "#8b5e6b", near: "#5b4a4a", ground: "#3c4a33", leaf: "#2f6b3a", leaf2: "#1c4a28", trunk: "#5a3a25",
      blurb: "Ancient giants, mossy trunks and protected status."
    },
    {
      id: "redwood", name: "Redwood Coast", unlock: 300000000, hp: 60000, research: 4, tree: "redwood", size: 1.15,
      sky: ["#9ad0e6", "#f7e7c6"], sun: "#fff8e0", far: "#8fa8a0", near: "#577f72", ground: "#2e5b46", leaf: "#2f7d4c", leaf2: "#165235", trunk: "#7a3e2a",
      blurb: "Fog-soaked coast where the tallest trees on Earth grow."
    }
  ],

  research: [
    { id: "hyd1", branch: "hydraulics", name: "Hydraulic Pumps I", cost: 5, req: null, desc: "+15% machine output." },
    { id: "hyd2", branch: "hydraulics", name: "Hydraulic Pumps II", cost: 40, req: "hyd1", desc: "+25% machine output." },
    { id: "hyd3", branch: "hydraulics", name: "Closed-Loop Hydraulics", cost: 250, req: "hyd2", desc: "+60% machine output." },
    { id: "hyd4", branch: "hydraulics", name: "Fleet Telematics", cost: 1800, req: "hyd3", desc: "+100% machine output." },

    { id: "fel1", branch: "felling", name: "Sharper Chains", cost: 8, req: null, desc: "+50% tap damage." },
    { id: "fel2", branch: "felling", name: "Crit Strikes", cost: 35, req: "fel1", desc: "+10% crit chance on every tap." },
    { id: "fel3", branch: "felling", name: "Guide-Bar Precision", cost: 200, req: "fel2", desc: "+100% tap damage." },
    { id: "fel4", branch: "felling", name: "Ballistic Carbide", cost: 1500, req: "fel3", desc: "+10% crit chance and crits deal ×6 instead of ×4." },

    { id: "mkt1", branch: "markets", name: "Export Contracts", cost: 10, req: null, desc: "+15% timber sale price." },
    { id: "mkt2", branch: "markets", name: "Forward Trading", cost: 60, req: "mkt1", desc: "Unlocks Auto-Sell." },
    { id: "mkt3", branch: "markets", name: "Index Futures", cost: 300, req: "mkt2", desc: "+40% timber sale price." },
    { id: "mkt5", branch: "markets", name: "Price Floors", cost: 400, req: "mkt2", desc: "Auto-Sell waits until the market reaches a floor you set." },
    { id: "mkt4", branch: "markets", name: "Commodity Hedging", cost: 2000, req: "mkt3", desc: "Market price swings are half as wild." },

    { id: "aut1", branch: "automation", name: "Auto-Fell", cost: 25, req: null, desc: "Unlocks Auto-Fell: your saw swings on its own." },
    { id: "aut2", branch: "automation", name: "Auto-Hire", cost: 120, req: "aut1", desc: "Unlocks Auto-Hire: buys the best machine each second." },
    { id: "aut3", branch: "automation", name: "Twin Tool Heads", cost: 350, req: "aut1", desc: "Auto-Fell hits twice as often." },
    { id: "aut4", branch: "automation", name: "Dispatch AI", cost: 2500, req: "aut2", desc: "Auto-Hire also picks up overhauls when cheaper." },

    { id: "crw1", branch: "workforce", name: "Crew Training", cost: 15, req: null, desc: "+20% Ground Crew output." },
    { id: "crw2", branch: "workforce", name: "Safety Certification", cost: 90, req: "crw1", desc: "Crews spot weak spots: +3% crit chance." },
    { id: "crw3", branch: "workforce", name: "Shift Rotation", cost: 600, req: "crw2", desc: "Offline earnings rise to 75%." },
    { id: "crw4", branch: "workforce", name: "Forestry Degree", cost: 4000, req: "crw3", desc: "+25% contract rewards." },

    { id: "sus1", branch: "sustainability", name: "Replanting Program", cost: 30, req: null, desc: "+25% seedlings from Replant." },
    { id: "sus2", branch: "sustainability", name: "Soil Health", cost: 150, req: "sus1", desc: "+10% all timber income." },
    { id: "sus3", branch: "sustainability", name: "Biomass Boilers", cost: 800, req: "sus2", desc: "Burns slash for power: +20% machine output." },
    { id: "sus4", branch: "sustainability", name: "Carbon Credits", cost: 5000, req: "sus3", desc: "Seedling bonuses are 50% stronger." }
  ],

  research_branches: [
    { id: "hydraulics", name: "Hydraulics" },
    { id: "felling", name: "Felling" },
    { id: "markets", name: "Markets" },
    { id: "automation", name: "Automation" },
    { id: "workforce", name: "Workforce" },
    { id: "sustainability", name: "Sustainability" }
  ],

  events: [
    { id: "boom", name: "Timber Boom", icon: "📈", desc: "Sale prices ×1.6 for 60s.", duration: 60, weight: 3 },
    { id: "lucky", name: "Lucky Crew", icon: "🍀", desc: "+25% crit chance for 45s.", duration: 45, weight: 3 },
    { id: "beetle", name: "Bark Beetle Outbreak", icon: "🪲", desc: "Machines run at 75% for 60s.", duration: 60, weight: 2 },
    { id: "sunny", name: "Perfect Weather", icon: "☀️", desc: "Machines +20% for 90s.", duration: 90, weight: 2 },
    { id: "windfall", name: "Auction Windfall", icon: "💰", desc: "Instant cash worth about a minute of output.", instant: true, weight: 1 }
  ],

  // pay: seconds of current sale income, used when it beats the fixed zone reward.
  contractTemplates: [
    { kind: "deliver", title: "Pulpwood Order", icon: "📦", desc: "Deliver {amount} timber to the mill.", mult: [1, 1.2], time: 240 },
    { kind: "click", title: "Rush Felling", icon: "🪓", desc: "Land {amount} taps within the window.", mult: [1, 1.5], time: 120, pay: 75 },
    { kind: "machines", title: "Fleet Hire", icon: "🧑‍🔧", desc: "Hire {amount} machines in total.", mult: [1, 1.3], time: 300, pay: 90 }
  ],

  achievements: [
    { id: "first-chop", name: "First Chop", icon: "🪓", desc: "Fell your first tree.", test: (s) => s.trees >= 1 },
    { id: "chopping-block", name: "Chopping Block", icon: "🪵", desc: "Fell 100 trees.", test: (s) => s.trees >= 100 },
    { id: "lumber-legend", name: "Lumber Legend", icon: "🏆", desc: "Fell 5,000 trees.", test: (s) => s.trees >= 5000 },
    { id: "itchy-finger", name: "Itchy Finger", icon: "👆", desc: "Tap the tree 500 times.", test: (s) => s.clicks >= 500 },
    { id: "crit-happens", name: "Crit Happens", icon: "💥", desc: "Land 100 critical strikes.", test: (s) => s.crits >= 100 },
    { id: "pocket-change", name: "Pocket Change", icon: "💵", desc: "Earn $1,000 from sales.", test: (s) => s.cashEarned >= 1000 },
    { id: "market-maker", name: "Market Maker", icon: "💰", desc: "Earn $1M from sales.", test: (s) => s.cashEarned >= 1e6 },
    { id: "timber-baron", name: "Timber Baron", icon: "🎩", desc: "Produce 1M timber in lifetime.", test: (s) => s.lifetimeTimber >= 1e6 },
    { id: "forest-mogul", name: "Forest Mogul", icon: "🌍", desc: "Produce 1B timber in lifetime.", test: (s) => s.lifetimeTimber >= 1e9 },
    { id: "crew-chief", name: "Crew Chief", icon: "👷", desc: "Hire 10 Ground Crews in one run.", test: (s) => (s.machines.crew || 0) >= 10 },
    { id: "first-skidder", name: "First Skidder", icon: "🚜", desc: "Hire a skidder.", test: (s) => (s.machines.skidder || 0) >= 1 },
    { id: "feller-fan", name: "Feller Fan", icon: "🌲", desc: "Hire a feller-buncher.", test: (s) => (s.machines.feller || 0) >= 1 },
    { id: "heavy-lifting", name: "Heavy Lifting", icon: "🚛", desc: "Hire a forwarder.", test: (s) => (s.machines.forwarder || 0) >= 1 },
    { id: "harvest-moon", name: "Harvest Moon", icon: "🏗️", desc: "Hire a harvester.", test: (s) => (s.machines.harvester || 0) >= 1 },
    { id: "heavy-metal", name: "Heavy Metal", icon: "🛻", desc: "Hire a heavy harvester.", test: (s) => (s.machines.heavy || 0) >= 1 },
    { id: "drone-days", name: "Drone Days", icon: "🛸", desc: "Hire an AutoDrone harvester.", test: (s) => (s.machines.drone || 0) >= 1 },
    { id: "full-fleet", name: "Full Fleet", icon: "🚀", desc: "Own at least one of every machine.", test: (s) => LJ.DATA.machines.every((m) => (s.machines[m.id] || 0) >= 1) },
    { id: "overhauled", name: "Overhauled", icon: "🔧", desc: "Overhaul any machine.", test: (s) => Object.values(s.overhauls).some((v) => v > 0) },
    { id: "chainsaw-massacre", name: "Chainsaw Massacre", icon: "🛠️", desc: "Equip a petrol chainsaw.", test: (s) => s.tool >= 3 },
    { id: "carbide-dreams", name: "Carbide Dreams", icon: "💠", desc: "Equip a carbide chainsaw.", test: (s) => s.tool >= 5 },
    { id: "laser-focus", name: "Laser Focus", icon: "🔆", desc: "Equip the laser felling rig.", test: (s) => s.tool >= 8 },
    { id: "first-research", name: "Research Mind", icon: "🧪", desc: "Unlock your first research node.", test: (s) => Object.keys(s.nodes).length >= 1 },
    { id: "full-tree", name: "Full Tree", icon: "🌳", desc: "Unlock 15 research nodes.", test: (s) => Object.keys(s.nodes).length >= 15 },
    { id: "automated", name: "Hands-Free", icon: "🤖", desc: "Run Auto-Fell.", test: (s) => !!s.nodes.aut1 && s.auto.fell },
    { id: "contract-cash", name: "Contract Killer", icon: "📋", desc: "Complete 10 contracts.", test: (s) => s.contractsDone >= 10 },
    { id: "replanter", name: "Replanter", icon: "🌱", desc: "Replant the forest once.", test: (s) => s.replants >= 1 },
    { id: "second-growth", name: "Second Growth", icon: "🌿", desc: "Replant three times.", test: (s) => s.replants >= 3 },
    { id: "old-growth", name: "Ancient Ground", icon: "🌳", desc: "Reach Old Growth Forest.", test: (s) => s.zone >= 4 },
    { id: "redwood-royalty", name: "Redwood Royalty", icon: "👑", desc: "Reach the Redwood Coast.", test: (s) => s.zone >= 5 },
    { id: "event-witness", name: "Weather Watcher", icon: "🌦️", desc: "Witness 5 forest events.", test: (s) => s.eventsSeen >= 5 },
    { id: "marathon", name: "Marathon Logger", icon: "⏱️", desc: "Play for 10 hours.", test: (s) => s.playtime >= 36000 },
    { id: "crew-of-twenty", name: "Crew of Twenty", icon: "👥", desc: "Have 20 Ground Crews on the ground.", test: (s) => (s.machines.crew || 0) >= 20 },
    { id: "tool-shed", name: "Tool Shed", icon: "🧰", desc: "Own every hand tool in the catalogue.", test: (s) => s.tool >= LJ.DATA.tools.length - 1 },
    { id: "swarm-intelligence", name: "Swarm Intelligence", icon: "🧠", desc: "Hire a Vorrex Swarm Harvester.", test: (s) => (s.machines.swarm || 0) >= 1 },
    { id: "titan-watch", name: "Titan Watch", icon: "🌌", desc: "Hire a Vorrex Titan Fleet Unit.", test: (s) => (s.machines.titan || 0) >= 1 }
  ]
};
