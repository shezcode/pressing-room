const fs = require("fs");
const path = require("path");

const MAX_FIELD_LENGTH = 200;

// The location lists behind the signup selects; a missing or unreadable file means no choices
const readList = (file, key) => {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(__dirname, "../db", file), "utf8")
    )[key];
  } catch (error) {
    console.error(`Error reading ${file}:`, error);
    return [];
  }
};
exports.readList = readList;

// A required trimmed string. Pushes a message into `errors` when invalid.
const textField = (address, field, label, errors) => {
  const raw = address[field];
  const value = typeof raw === "string" ? raw.trim() : "";

  if (!value) {
    errors[field] = `${label} is required`;
  } else if (value.length > MAX_FIELD_LENGTH) {
    errors[field] = `${label} must be at most ${MAX_FIELD_LENGTH} characters`;
  }
  return value;
};

// Validate a shipping address. The country, community and province must come
// from the location lists, and the province must belong to the community.
// Their names are copied into the address so an Order reads on its own.
// Returns the cleaned address and a map of field name to message.
exports.validateShippingAddress = (input) => {
  const address = input && typeof input === "object" ? input : {};
  const errors = {};

  const name = textField(address, "name", "Name", errors);
  const street = textField(address, "street", "Street", errors);
  const city = textField(address, "city", "City", errors);
  const postalCode = textField(address, "postalCode", "Postal code", errors);

  const country = readList("countries.json", "countries").find(
    (c) => c.isoCode === address.isoCode
  );
  const community = readList("communities.json", "communities").find(
    (c) => c.id === address.communityId
  );
  const province = readList("provinces.json", "provinces").find(
    (p) => p.id === address.provinceId && p.communityId === address.communityId
  );

  if (!country) {
    errors.isoCode = "Choose a country from the list";
  }
  if (!community) {
    errors.communityId = "Choose a community from the list";
  }
  if (!province) {
    errors.provinceId = "Choose a province of the chosen community";
  }

  return {
    errors,
    values: {
      name,
      street,
      city,
      postalCode,
      isoCode: country?.isoCode ?? null,
      country: country?.name ?? null,
      communityId: community?.id ?? null,
      community: community?.name ?? null,
      provinceId: province?.id ?? null,
      province: province?.name ?? null,
    },
  };
};
