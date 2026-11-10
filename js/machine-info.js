var LJ = globalThis.LJ || (globalThis.LJ = {});

const CC_BY_SA_4 = { licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0" };
const CC_BY_4 = { licence: "CC BY 4.0", licenceUrl: "https://creativecommons.org/licenses/by/4.0" };
const CC_BY_SA_3 = { licence: "CC BY-SA 3.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0" };
const FICTIONAL_ART = { label: "Drawn for Timberline", author: "Timberline project", licence: "Same licence as the game" };

LJ.MachineInfo = {
  crew: {
    type: "Hand crew",
    use: "Limbs and bucks felled trees by the road with hand tools and chainsaws.",
    power: "Human effort and chainsaws",
    credit: {
      label: "Bûcheron affutant tronçonneuse.jpg",
      url: "https://commons.wikimedia.org/wiki/File:B%C3%BBcheron_affutant_tron%C3%A7onneuse.jpg",
      author: "Moinats",
      ...CC_BY_SA_4
    },
    note: "A crew is people, not a machine, so there is no model to cite."
  },

  skidder: {
    maker: "HSM Hohenloher Spezial-Maschinenbau (Germany)",
    model: "HSM 805",
    type: "Articulated crane skidder",
    use: "Drags trunk bundles from the stump to the landing.",
    weight: "12,600 kg",
    power: "129 kW (175 hp), Volvo Penta TAD581VE",
    size: "Double-drum winch, 2 × 80 kN (standard)",
    sources: [{ label: "HSM 805 technical data (PDF)", url: "https://www.hsm-forest.net/files/hsm/downloads/Datenblaetter_2022/HSM_series_805_EN.pdf" }],
    credit: {
      label: "HSM 805 Articulated Skidder side view.jpg",
      url: "https://commons.wikimedia.org/wiki/File:HSM_805_Articulated_Skidder_side_view.jpg",
      author: "Gabinho",
      ...CC_BY_SA_3
    },
    identified: true
  },

  feller: {
    maker: "John Deere",
    model: "843L-II",
    type: "Wheeled feller-buncher",
    use: "Fells standing trees and bunches them for a skidder or grapple.",
    weight: "13,910 kg (17,081 kg with FD22B head)",
    power: "201 kW (270 hp), PowerTech PSS 6.8 L",
    size: "Felling head cutting capacity 559 mm (22 in), FD22B",
    sources: [
      {
        label: "Deere L-Series wheeled feller-buncher brochure (PDF)",
        url: "https://www.deere.com/assets/pdfs/common/products/wheeled-feller-bunchers/wheeled-feller-bunchers-l-series-dkdlwfb.pdf"
      }
    ],
    credit: {
      label: "Feller buncher-4.jpg",
      url: "https://commons.wikimedia.org/wiki/File:Feller_buncher-4.jpg",
      author: "Wikideas1",
      licence: "CC0 (public domain)",
      licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/"
    },
    identified: false,
    note: "The photo does not name its machine. The 843L-II is the closest real wheeled feller-buncher, so the specs are for that model."
  },

  grapple: {
    maker: "John Deere",
    model: "648L-II",
    type: "Articulated grapple skidder",
    use: "Hauls whole trees or bunches to the landing with a grapple.",
    weight: "19,054 kg",
    power: "177 kW (237 hp), PowerTech PSS 6.8 L",
    size: "Grapple opening 3.2 m, grapple area up to 1.63 m²",
    sources: [
      {
        label: "John Deere 648L-II skidder specifications (PDF)",
        url: "https://www.deere.com/assets/pdfs/common/products/skidders/msk648liiu-648l-ii-skidder.pdf"
      }
    ],
    credit: {
      label: "Articulated grapple rubber tired skidder (1982).jpg",
      url: "https://commons.wikimedia.org/wiki/File:Articulated_grapple_rubber_tired_skidder_(1982).jpg",
      author: "US Forest Service (USDA)",
      licence: "Public domain (US federal government work)"
    },
    identified: false,
    note: "The photo is a 1982 US Forest Service figure and does not name the machine. The 648L-II is the closest real grapple skidder."
  },

  forwarder: {
    maker: "John Deere",
    model: "1510G",
    type: "Eight-wheel forwarder with loader crane",
    use: "Carries cut logs from the felling site to the forest road on a loading bunk.",
    weight: "16,330 kg (6-wheel) / 18,230 kg (8-wheel)",
    power: "164 kW (220 hp), PowerTech Plus 6068",
    size: "Load rating 15,000 kg, crane reach 8.5 m or 10 m",
    sources: [
      {
        label: "John Deere 1510G forwarder specifications (PDF)",
        url: "https://www.deere.com/assets/pdfs/common/products/forwarders/MFO1510GF-1510G-forwarder.pdf"
      }
    ],
    credit: {
      label: "John Deere 1510G forwarder near Mörsdorf.jpg",
      url: "https://commons.wikimedia.org/wiki/File:John_Deere_1510G_forwarder_near_M%C3%B6rsdorf.jpg",
      author: "Steffen Mokosch",
      ...CC_BY_SA_4
    },
    identified: true
  },

  "tigrix-f550": {
    maker: "Tigercat",
    model: "820",
    type: "Compact track feller-buncher",
    use: "Thinning and small-diameter clearfelling, with a tight-tuck boom.",
    weight: "26,000 kg (less attachment)",
    power: "212 kW (284 hp), Tigercat FPT N67 Tier 4f",
    size: "Maximum cutting radius 8.43 m",
    sources: [{ label: "Tigercat 820 feller-buncher", url: "https://www.tigercat.com/product/820-feller-buncher/" }],
    credit: {
      label: "Fellerbuncher.JPG",
      url: "https://commons.wikimedia.org/wiki/File:Fellerbuncher.JPG",
      author: "Conrado",
      licence: "Public domain (released by the author)"
    },
    identified: false,
    note: "The photo does not name its machine. The Tigercat 820 is the closest real tracked feller-buncher."
  },

  harvester: {
    maker: "Komatsu Forest",
    model: "901XC",
    type: "Eight-wheel thinning harvester",
    use: "Fells, delimbs and cuts to length in one cycle on steep, difficult thinning ground.",
    weight: "20,210 kg (from)",
    power: "170 kW (228 hp), AGCO Power 6.6 L (Stage V)",
    size: "Width 2,776 mm with 600/45 tyres, crane reach 10 to 11 m",
    sources: [{ label: "Komatsu 901XC", url: "https://www.komatsuforest.com/forest-machines/our-wheeled-harvesters/901xc" }],
    credit: {
      label: "Komatsu 901XC harvester in Muuratsalo 01.jpg",
      url: "https://commons.wikimedia.org/wiki/File:Komatsu_901XC_harvester_in_Muuratsalo_01.jpg",
      author: "Antti Leppänen",
      ...CC_BY_4
    },
    identified: true
  },

  "pondrix-14w": {
    maker: "Ponsse",
    model: "Elephant",
    type: "Eight-wheel heavy forwarder",
    use: "Hauls the biggest loads on long, steep or rough forwarding routes.",
    weight: "22,000 kg minimum, 22,800 kg typical",
    power: "210 kW (286 hp), Mercedes-Benz OM936 LA",
    size: "Load capacity 18,000 kg, K121 crane reach 8 to 10 m",
    sources: [
      {
        label: "Ponsse Elephant catalogue (PDF)",
        url: "https://ponsse.jp/wp-content/uploads/2025/04/elephant_catalog_eng.pdf"
      }
    ],
    credit: {
      label: "Ponsse Elephant forwarder Vuosaari.jpg",
      url: "https://commons.wikimedia.org/wiki/File:Ponsse_Elephant_forwarder_Vuosaari.jpg",
      author: "Antti Leppänen",
      ...CC_BY_4
    },
    identified: true
  },

  heavy: {
    maker: "John Deere",
    model: "1470G",
    type: "Heavy wheeled harvester",
    use: "Cuts big stems and works steep stands.",
    weight: "22,900 kg (minimum)",
    power: "200 kW (268 hp), PowerTech Plus 6090",
    size: "Crane reach 8.6 to 11 m (CH9 boom)",
    sources: [
      {
        label: "John Deere G-Series wheeled harvesters (PDF)",
        url: "https://www.deere.com/assets/pdfs/common/products/wheeled-harvesters/wheeled-harvesters-g-series-dkdgwhvr.pdf"
      }
    ],
    credit: {
      label: "Wartenberg Landenhausen John Deere forest harvester ds.png",
      url: "https://commons.wikimedia.org/wiki/File:Wartenberg_Landenhausen_John_Deere_forest_harvester_ds.png",
      author: "UuMUfQ",
      licence: "CC BY-SA 3.0 or GFDL 1.2+",
      licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0"
    },
    identified: false,
    note: "The photo shows a John Deere forest harvester but does not name the model. The 1470G is the closest real match in the G series."
  },

  processor: {
    type: "Concept multi-head processor",
    use: "Measures, optimises and cuts every stem in parallel.",
    credit: FICTIONAL_ART,
    note: "Fictional machine, so there is no real model to cite. The illustration is drawn for this game."
  },

  drone: {
    type: "Concept autonomous harvester",
    use: "Operator-free harvesting drones with a shared map.",
    credit: FICTIONAL_ART,
    note: "Fictional machine, so there is no real model to cite. The illustration is drawn for this game."
  },

  swarm: {
    type: "Concept swarm harvester",
    use: "Dozens of cutting pods coordinated by one brain.",
    credit: FICTIONAL_ART,
    note: "Fictional machine, so there is no real model to cite. The illustration is drawn for this game."
  },

  titan: {
    type: "Concept fleet unit",
    use: "Fleet-scale unit. Lumber trembles at its approach.",
    credit: FICTIONAL_ART,
    note: "Fictional machine, so there is no real model to cite. The illustration is drawn for this game."
  }
};
