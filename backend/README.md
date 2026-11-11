# Pressing Room API

The Node.js/Express API behind the Pressing Room record shop. It uses JSON files under `db/` as its database, so there is nothing to set up.

## Installation

```bash
npm install
```

## Usage

Start the development server:

```bash
npm run dev
```

Or start the production server:

```bash
npm start
```

The server runs on http://localhost:3000 by default (override with `PORT`). `JWT_SECRET`, `ALLOWED_ORIGINS` and `NODE_ENV` are described under "Server settings" in the root README.

## Seeding

```bash
npm run seed
```

Creates the Admin account (stored hashed) from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and replaces the catalog in `db/records.json` with the sample Records. Locally those variables fall back to development defaults; with `NODE_ENV=production` the seed exits unless both are set. The seed also creates any missing data file (`users`, `orders`, `records`, `subscribers`), which are ignored by git. Run it again at any time to reset the catalog; the Admin is only created once. The Record covers live in `uploads/covers/` and are served statically under `/uploads`.

## Authentication

Register a user (signup) or login (signin) to get a JWT token valid for 24 hours, then send it in the `Authorization: Bearer <token>` header of protected requests.

| Method | Endpoint     | Description               |
| ------ | ------------ | ------------------------- |
| POST   | /auth/signup | Register a new user       |
| POST   | /auth/signin | Login and get a JWT token |

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword", "name": "Your Name", "countryId": "1", "communityId": "08", "provinceId": "28"}'

curl -X POST http://localhost:3000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'
```

Only Spain (`countryId` `1`) has communities and provinces: they are required for it and dropped for any other country.

Users have a role, `customer` or `admin`. Signup always creates a `customer` and ignores any `role` in the request; the Admin exists only through the seed. Both routes return the user (with its `role`) and a token whose payload carries `userId`, `email` and `role`.

Routes are protected with `adminOnly` and `customerOnly` from `middleware/roles.js`. Both answer 401 without a valid token; `adminOnly` answers 403 to anyone but the Admin, and `customerOnly` answers 403 to the Admin.

## Orders

Customer only (401 without a token, 403 for the Admin).

| Method | Endpoint        | Description                           |
| ------ | --------------- | ------------------------------------- |
| POST   | /api/orders     | Place an Order from Cart lines        |
| GET    | /api/orders/:id | Get one of your own Orders (else 404) |

`POST /api/orders` takes `lines` (`recordId` and `quantity`, each Record once) and a `shippingAddress` (`name`, `street`, `city`, `postalCode`, plus `isoCode`, `communityId` and `provinceId` from the `/location` routes). Prices always come from the stored Records. Stock is checked and reduced in one synchronous write: if any line references a missing Record or exceeds its stock, the response is 409 with `code: "ORDER_REJECTED"` and a `lines` list of each failing line (`reason` is `missing` or `insufficientStock`, plus the copies `available`), and nothing is reduced. Each Order line snapshots the Record's artist, title, Format, price and cover (see ADR-0001). Orders are stored in `db/orders.json`.

## API Documentation

The interactive Swagger documentation is available at http://localhost:3000/api-docs when the server is running.

## API Endpoints

| Method | Endpoint                          | Auth   | Description                                          |
| ------ | --------------------------------- | ------ | ---------------------------------------------------- |
| GET    | /api/records                      | Public | A page of Records, newest first (`page`, `limit`)   |
| GET    | /api/records/:id                  | Public | A single Record, 404 when unknown                    |
| POST   | /api/records                      | Admin  | Create a Record (multipart, with a `cover` image)    |
| PUT    | /api/records/:id                  | Admin  | Update a Record (multipart, `cover` optional)        |
| DELETE | /api/records/:id                  | Admin  | Delete a Record, keeping its cover file              |
| GET    | /location/countries               | Public | Countries                                            |
| GET    | /location/communities             | Public | Autonomous communities                               |
| GET    | /location/provinces/:communityId  | Public | Provinces of a community                             |

`POST /api/records` takes a multipart body with the Record's fields and a `cover` file (JPEG, PNG or WebP, up to 5 MB). Price is in integer USD cents. An invalid request gets 400 with `{ message, errors }`, where `errors` has a message per invalid field; no token gets 401 and a Customer gets 403.

`PUT /api/records/:id` takes the same fields and validates them the same way; the `cover` file is optional and the Record keeps its current cover without one. Stock and the Featured flag are changed through it. `DELETE /api/records/:id` answers 204. Both answer 404 for an unknown Record. Replaced and deleted Records' cover files stay on disk, because Order lines still point at them.

`GET /api/records` returns `{ records, total, page, limit }`. Out of stock Records (stock `0`) are included. A Record has `id`, `artist`, `title`, `format` (`Vinyl`, `CD` or `Cassette`), optional `variant`, `year`, `genre`, `price` (integer USD cents), `stock`, `coverUrl`, `featured`, `description` and `dateAdded`.

```bash
curl "http://localhost:3000/api/records?page=1&limit=9"
curl http://localhost:3000/api/records/RECORD_ID
```
