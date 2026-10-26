export const FOOD = [
  [
    "Mango Magic",
    "Juices",
    120,
    "🥭",
    "photo-1600271886742-f049cd451bba",
    "Fresh mango, sunshine and a little Fruzo magic.",
  ],
  [
    "Strawberry Blush",
    "Shakes",
    160,
    "🍓",
    "photo-1553530666-ba11a7da3888",
    "Creamy strawberry blend, sweet and refreshing.",
  ],
  [
    "Blueberry Blast",
    "Shakes",
    170,
    "🫐",
    "photo-1572490122747-3968b75cc699",
    "Berry goodness in every delicious sip.",
  ],
  [
    "Fresh Lime",
    "Juices",
    80,
    "🍋",
    "photo-1513558161293-cdaf765edfd7",
    "A zesty classic with a cooling finish.",
  ],
  [
    "Chocolate Shake",
    "Shakes",
    150,
    "🍫",
    "photo-1572490122747-3968b75cc699",
    "Rich chocolate blended to perfection.",
  ],
  [
    "Passion Fruit Cooler",
    "Mocktails",
    140,
    "🍹",
    "photo-1544145945-f90425340c7e",
    "Tropical and tangy with a bright fruity kick.",
  ],
  [
    "French Fries",
    "Snacks",
    95,
    "🍟",
    "photo-1573080496219-bb080dd4f877",
    "Golden, crispy and perfectly seasoned.",
  ],
  [
    "Cheesy Sandwich",
    "Snacks",
    160,
    "🥪",
    "photo-1528735602780-2552fd46c7af",
    "Toasted, melty and loaded with flavor.",
  ],
  [
    "Pineapple Punch",
    "Juices",
    120,
    "🍍",
    "photo-1600271886742-f049cd451bba",
    "Sweet, tangy and tropical.",
  ],
  [
    "Virgin Mojito",
    "Mocktails",
    130,
    "🌿",
    "photo-1513558161293-cdaf765edfd7",
    "Fresh lime, mint and a crisp sparkle.",
  ],
  [
    "Watermelon Splash",
    "Juices",
    110,
    "🍉",
    "photo-1544145945-f90425340c7e",
    "Cool, fresh watermelon refreshment.",
  ],
  [
    "Fruit Bowl",
    "Snacks",
    140,
    "🍇",
    "photo-1490474418585-ba9bad8fd0ea",
    "A colorful mix of seasonal goodness.",
  ],
];
export const imageFor = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;
const names = [
  "Rahul Kumar",
  "Priya Nair",
  "Arjun Menon",
  "Aisha Rahman",
  "Aditya S",
  "Sneha Raj",
  "Nikhil Das",
  "Meera Joseph",
  "Anu S",
  "Rohit K",
  "Fathima A",
  "Devika N",
  "Vivek Raj",
  "Nisha Thomas",
  "Anand K",
  "Riya M",
  "Akshay P",
  "Jiya S",
  "Mithun B",
  "Sara N",
  "Amal George",
  "Farhan Ali",
  "Tina Jose",
  "Sreehari M",
  "Anjali P",
  "Kiran R",
  "Naveen K",
  "Diya Thomas",
  "Faris M",
  "Aparna K",
  "Joel Joseph",
  "Maria S",
  "Abhinav K",
  "Sandra V",
  "Ajmal K",
  "Reshma R",
  "Alan Joseph",
  "Aswin R",
  "Neha M",
  "Firoz A",
];
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();
export function makeInitial() {
  const menus = FOOD.map((a, i) => ({
    id: `m${i + 1}`,
    name: a[0],
    category: a[1],
    price: a[2],
    emoji: a[3],
    image: imageFor(a[4]),
    description: a[5],
    available: true,
    trending: [0, 1, 3, 6, 9].includes(i),
  }));
  const customers = names.map((name, i) => {
    const id = `c${i + 1}`;
    return {
      id,
      name,
      phone: `98765${String(43210 + i).padStart(5, "0")}`,
      joined: ago(110 - (i % 25)),
      consent: i % 5 !== 0,
      referralCode: generateReferralCode(id),
      referredBy: null, // referring customer ID, or null
    };
  });
  const purchases = [];
  const points = [];
  let n = 0;
  for (let i = 0; i < customers.length; i++) {
    const count = i < 25 ? 2 + (i % 5) : 1;
    for (let j = 0; j < count; j++) {
      const days =
        i < 15
          ? i * 2 + j * 8 + 1
          : i < 25
            ? 19 + j * 8
            : i < 32
              ? 34 + j * 9
              : 47 + j * 12;
      const amount = 150 + ((i * 73 + j * 113) % 680);
      const id = `p${++n}`;
      const date = ago(days);
      purchases.push({
        id,
        customerId: customers[i].id,
        amount,
        date,
        source: "staff",
      });
      points.push({
        id: `t${n}`,
        customerId: customers[i].id,
        amount: Math.floor(amount / 10),
        type: "earn",
        date,
        detail: "Purchase rewards",
        purchaseId: id,
      });
    }
  }
  const rewards = [
    {
      id: "r1",
      name: "Fresh Lime",
      points: 150,
      emoji: "🍋",
      description: "One refreshing fresh lime drink",
      active: true,
    },
    {
      id: "r2",
      name: "French Fries",
      points: 250,
      emoji: "🍟",
      description: "One portion of crispy French fries",
      active: true,
    },
    {
      id: "r3",
      name: "Mango Magic",
      points: 400,
      emoji: "🥭",
      description: "One signature Mango Magic juice",
      active: true,
    },
    {
      id: "r4",
      name: "Strawberry Blush",
      points: 550,
      emoji: "🍓",
      description: "One delicious strawberry shake",
      active: true,
    },
  ];
  const offers = [
    {
      id: "o1",
      title: "Double the joy!",
      description: "Earn 2× points on juices this weekend.",
      type: "multiplier",
      multiplier: 2,
      category: "Juices",
      active: true,
      until: ago(-14),
      emoji: "✨",
    },
    {
      id: "o2",
      title: "A little treat for you",
      description:
        "Return to Fruzo and enjoy a free lime drink with any purchase over ₹250.",
      type: "comeback",
      minSpend: 250,
      active: true,
      until: ago(-30),
      emoji: "🍋",
    },
    {
      id: "o3",
      title: "Happy Hour",
      description: "Try our signature shakes and collect rewards.",
      type: "display",
      active: true,
      until: ago(-20),
      emoji: "🥤",
    },
  ];
  return {
    menus,
    customers,
    purchases,
    points,
    rewards,
    offers,
    redemptions: [],
    coupons: [],
    messages: [],
    referrals: [], // { id, referrerCustomerId, referredCustomerId, status: 'pending'|'rewarded', createdAt, qualifyingPurchaseId, rewardedAt }
    feedbacks: [], // { id, customerId, rating, comment, date, rewardCredited }
    activeCustomer: "c1",
    restaurant: {
      name: "Fruzo",
      tagline: "We blend happiness",
      earnRate: 10,
      googleReviewUrl: "", // Set your Google review URL here
    },
    version: 1,
  };
}
export const dateFmt = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const money = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");
export const customerStats = (db, id) => {
  const bills = db.purchases.filter((p) => p.customerId === id);
  const credits = db.points.filter((t) => t.customerId === id);
  return {
    visits: bills.length,
    spent: bills.reduce((n, p) => n + p.amount, 0),
    points: credits.reduce((n, t) => n + t.amount, 0),
    last: bills.length
      ? bills.reduce((a, b) => (a.date > b.date ? a : b)).date
      : null,
  };
};
export const inactiveDays = (date) =>
  date ? Math.floor((Date.now() - new Date(date).getTime()) / 86400000) : 999;
export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
/**
 * Generate a stable, opaque referral code from a customer ID.
 * Uses a simple deterministic transform so the same ID always produces the
 * same code and the code does not expose the raw customer ID directly.
 * The result is 8 uppercase alphanumeric characters.
 */
export const generateReferralCode = (customerId) => {
  // XOR-fold the char codes of the id string, then base-36 encode with padding.
  let h = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < customerId.length; i++) {
    h ^= customerId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0; // FNV prime
  }
  return h.toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
};
