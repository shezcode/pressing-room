const bcrypt = require("bcryptjs");
const { writeRecords } = require("../lib/recordsStore");
const { readUsers, writeUsers } = require("../lib/usersStore");
const { readOrders, writeOrders } = require("../lib/ordersStore");
const { readSubscribers, writeSubscribers } = require("../lib/subscribersStore");
const { validateShippingAddress } = require("../lib/addressValidation");

const DAY_MS = 24 * 60 * 60 * 1000;
const production = process.env.NODE_ENV === "production";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@mail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123!";
const DEMO_CUSTOMER_EMAIL = process.env.DEMO_CUSTOMER_EMAIL || "customer@mail.com";
const DEMO_CUSTOMER_PASSWORD = process.env.DEMO_CUSTOMER_PASSWORD || "customer123!";

const account = (name, email, password, role, extra = {}) => ({
  id: crypto.randomUUID(),
  name,
  email,
  password: bcrypt.hashSync(password, 10),
  role,
  ...extra,
  createdAt: new Date().toISOString(),
});

// Create the Admin unless it already exists, so running the seed again never
// duplicates it. Returns false when the Admin cannot be left in place.
const seedAdmin = () => {
  const users = readUsers();
  const existing = users.find((user) => user.email === ADMIN_EMAIL);

  if (existing) {
    if (existing.role === "admin") {
      console.log("Admin already exists");
      return true;
    }
    console.error(`${ADMIN_EMAIL} is already registered as a ${existing.role}`);
    return false;
  }

  users.push(account("Admin", ADMIN_EMAIL, ADMIN_PASSWORD, "admin"));

  if (!writeUsers(users)) {
    return false;
  }
  console.log(`Seeded the Admin (${ADMIN_EMAIL})`);
  return true;
};

// Newest first: the first entry is the most recently added Record (the hero artwork).
// Stock: Bon Iver is Out of stock and Igor has its last copy. Madvillany is the Cassette, Sinatra the CD.
const seedRecords = [
  {
    artist: "Ralphie Choo",
    title: "Cobre",
    format: "Vinyl",
    variant: "LP",
    year: 2024,
    genre: "Alt pop",
    price: 3600,
    stock: 14,
    cover: "ralphie.webp",
    featured: false,
    description:
      "Brass, drums and glitchy pop, pressed on heavyweight vinyl with a gatefold sleeve.",
  },
  {
    artist: "The Beatles",
    title: "1967-1970",
    format: "Vinyl",
    variant: "2xLP",
    year: 1973,
    genre: "Rock",
    price: 3600,
    stock: 22,
    cover: "beatles1.webp",
    featured: false,
    description:
      "The 'Blue Album' double LP: the band's late-sixties singles, from Strawberry Fields Forever to Let It Be.",
  },
  {
    artist: "The Beatles",
    title: "Abbey Road",
    format: "Vinyl",
    variant: null,
    year: 1969,
    genre: "Rock",
    price: 3600,
    stock: 18,
    cover: "beatles2.webp",
    featured: false,
    description:
      "The last album the band recorded together, with the side-two medley and the famous zebra crossing.",
  },
  {
    artist: "Bon Iver",
    title: "i, i",
    format: "Vinyl",
    variant: null,
    year: 2019,
    genre: "Folk",
    price: 3600,
    stock: 0,
    cover: "boniver.webp",
    featured: false,
    description:
      "Layered vocals and warm electronics from the fourth Bon Iver record.",
  },
  {
    artist: "C Tangana",
    title: "El madrileño",
    format: "Vinyl",
    variant: null,
    year: 2020,
    genre: "Spanish Pop",
    price: 3600,
    stock: 31,
    cover: "ctangana.webp",
    featured: false,
    description:
      "Rumba, flamenco and pop with a long list of guests, from the Madrid songwriter.",
  },
  {
    artist: "Tyler, the creator",
    title: "Igor",
    format: "Vinyl",
    variant: null,
    year: 2019,
    genre: "Hip-hop",
    price: 3600,
    stock: 1,
    cover: "tyler.webp",
    featured: false,
    description:
      "A synth-heavy, melodic album told as one continuous story, in a blonde wig and pastel suit.",
  },
  {
    artist: "Hozier",
    title: "Unreal unearth",
    format: "Vinyl",
    variant: null,
    year: 2023,
    genre: "Rock",
    price: 3600,
    stock: 25,
    cover: "hozier.webp",
    featured: false,
    description:
      "A journey through Dante's circles of hell, told in soul-tinged folk rock.",
  },
  {
    artist: "Madvillain",
    title: "Madvillany",
    format: "Cassette",
    variant: null,
    year: 2004,
    genre: "Hip-hop",
    price: 3600,
    stock: 9,
    cover: "madv.webp",
    featured: false,
    description:
      "MF DOOM and Madlib's cult classic: short, dense and full of samples.",
  },
  {
    artist: "Frank Sinatra",
    title: "Nothing but the best",
    format: "CD",
    variant: null,
    year: 2008,
    genre: "Jazz",
    price: 3600,
    stock: 40,
    cover: "sinatra.webp",
    featured: false,
    description:
      "Twenty-one of the crooner's finest recordings, remastered for this collection.",
  },
  {
    artist: "Pink Floyd",
    title: "The Dark Side of the Moon",
    format: "Vinyl",
    variant: "LP",
    year: 1973,
    genre: "Prog rock",
    price: 4200,
    stock: 15,
    cover: "pinkfloyd.webp",
    featured: true,
    description:
      "The landmark concept album about time, money and madness, with the prism sleeve.",
  },
  {
    artist: "Harry Styles",
    title: "Harry's house",
    format: "Vinyl",
    variant: "LP",
    year: 2022,
    genre: "Pop",
    price: 4200,
    stock: 12,
    cover: "harry.webp",
    featured: true,
    description:
      "Synth-pop and soft rock, with As It Was and Late Night Talking.",
  },
];

// The Demo Customer's two past Orders, as ordinary Order lines (ADR 0001) of seeded Records
const demoOrders = (customerId, records, now) => {
  const byTitle = (title) => records.find((record) => record.title === title);
  const shippingAddress = validateShippingAddress({
    name: "Demo Customer",
    street: "Calle Gran Vía 1",
    city: "Madrid",
    postalCode: "28013",
    isoCode: "ES",
    communityId: "12",
    provinceId: "28",
  }).values;

  return [
    { daysAgo: 40, lines: [["The Dark Side of the Moon", 1], ["Madvillany", 1]] },
    { daysAgo: 12, lines: [["Cobre", 1], ["Abbey Road", 2]] },
  ].map(({ daysAgo, lines }) => {
    const orderLines = lines.map(([title, quantity]) => {
      const { id, artist, format, price, coverUrl } = byTitle(title);
      return { recordId: id, artist, title, format, price, coverUrl, quantity };
    });
    return {
      id: crypto.randomUUID(),
      customerId,
      lines: orderLines,
      shippingAddress,
      total: orderLines.reduce((sum, line) => sum + line.price * line.quantity, 0),
      status: "Placed",
      datePlaced: new Date(now - daysAgo * DAY_MS).toISOString(),
    };
  });
};

// Without demo, add what is missing and keep existing data. With demo, replace
// every Customer, Order and Subscriber with the seed. Returns false on failure.
const seed = ({ demo = false } = {}) => {
  // Production has no fallback, so the public defaults never become real accounts
  const required = demo
    ? ["ADMIN_EMAIL", "ADMIN_PASSWORD", "DEMO_CUSTOMER_EMAIL", "DEMO_CUSTOMER_PASSWORD"]
    : ["ADMIN_EMAIL", "ADMIN_PASSWORD"];
  const missing = required.filter((name) => !process.env[name]);
  if (production && missing.length) {
    console.error(`${missing.join(", ")} must be set in production`);
    return false;
  }

  const now = Date.now();
  const records = seedRecords.map(({ cover, ...record }, index) => ({
    id: crypto.randomUUID(),
    ...record,
    coverUrl: `/uploads/covers/${cover}`,
    dateAdded: new Date(now - index * DAY_MS).toISOString(),
  }));

  if (demo) {
    const customer = account("Demo Customer", DEMO_CUSTOMER_EMAIL, DEMO_CUSTOMER_PASSWORD, "customer", {
      countryId: "1",
      communityId: "12",
      provinceId: "28",
    });
    const ok =
      writeUsers([account("Admin", ADMIN_EMAIL, ADMIN_PASSWORD, "admin"), customer]) &&
      writeRecords(records) &&
      writeOrders(demoOrders(customer.id, records, now)) &&
      writeSubscribers([]);
    if (ok) {
      console.log(`Demo reset: the Admin, the Demo Customer (${DEMO_CUSTOMER_EMAIL}) and ${records.length} Records`);
    }
    return ok;
  }

  // Rewriting what is read creates the Order and Subscriber files on a fresh clone and keeps any data already there
  const ok =
    seedAdmin() &&
    writeRecords(records) &&
    writeOrders(readOrders()) &&
    writeSubscribers(readSubscribers());
  if (ok) {
    console.log(`Seeded ${records.length} Records`);
  }
  return ok;
};

if (require.main === module && !seed()) {
  process.exit(1);
}

module.exports = { seed, ADMIN_EMAIL, DEMO_CUSTOMER_EMAIL };
