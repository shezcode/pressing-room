const FORMATS = ["Vinyl", "CD", "Cassette"];
exports.FORMATS = FORMATS;

// The phonograph dates from 1877; allow next year for upcoming pressings
const MIN_YEAR = 1877;
const maxYear = () => new Date().getFullYear() + 1;

const MAX_NAME_LENGTH = 200;
const MAX_SHORT_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;

const NON_NEGATIVE_INT = /^\d+$/;
const MAX_INT = 100_000_000;

// A trimmed string field, required or optional. Pushes a message into `errors` when invalid.
const textField = (body, field, { label, maxLength, required }, errors) => {
  const raw = body[field];
  const value = typeof raw === "string" ? raw.trim() : "";

  if (required && !value) {
    errors[field] = `${label} is required`;
  } else if (value.length > maxLength) {
    errors[field] = `${label} must be at most ${maxLength} characters`;
  }
  return value;
};

// A non-negative integer that arrives as a string (multipart) or a number (JSON)
const integerField = (body, field, label, errors) => {
  const raw = body[field];
  const text = typeof raw === "number" ? String(raw) : raw;

  if (typeof text !== "string" || !NON_NEGATIVE_INT.test(text.trim())) {
    errors[field] = `${label} must be a non-negative whole number`;
    return null;
  }

  const value = Number(text.trim());
  if (value > MAX_INT) {
    errors[field] = `${label} is too large`;
    return null;
  }
  return value;
};

// Validate the fields of a Record from a request body. Returns the cleaned values
// and a map of field name to message (empty when everything is valid).
// Price is in integer USD cents, as stored.
exports.validateRecordFields = (body) => {
  const errors = {};

  const artist = textField(
    body,
    "artist",
    { label: "Artist", maxLength: MAX_NAME_LENGTH, required: true },
    errors,
  );
  const title = textField(
    body,
    "title",
    { label: "Title", maxLength: MAX_NAME_LENGTH, required: true },
    errors,
  );
  const genre = textField(
    body,
    "genre",
    { label: "Genre", maxLength: MAX_SHORT_LENGTH, required: false },
    errors,
  );
  const variant = textField(
    body,
    "variant",
    { label: "Variant", maxLength: MAX_SHORT_LENGTH, required: false },
    errors,
  );
  const description = textField(
    body,
    "description",
    {
      label: "Description",
      maxLength: MAX_DESCRIPTION_LENGTH,
      required: false,
    },
    errors,
  );

  if (!FORMATS.includes(body.format)) {
    errors.format = `Format must be one of: ${FORMATS.join(", ")}`;
  }

  const price = integerField(body, "price", "Price", errors);
  const stock = integerField(body, "stock", "Stock", errors);

  const year = integerField(body, "year", "Year", errors);
  if (year !== null && (year < MIN_YEAR || year > maxYear())) {
    errors.year = `Year must be between ${MIN_YEAR} and ${maxYear()}`;
  }

  // Multipart sends booleans as text; an absent flag means not Featured
  const featuredRaw = body.featured;
  if (
    featuredRaw !== undefined &&
    ![true, false, "true", "false"].includes(featuredRaw)
  ) {
    errors.featured = "Featured must be true or false";
  }

  return {
    errors,
    values: {
      artist,
      title,
      format: body.format,
      variant: variant || null,
      year,
      genre,
      price,
      stock,
      featured: featuredRaw === true || featuredRaw === "true",
      description,
    },
  };
};
