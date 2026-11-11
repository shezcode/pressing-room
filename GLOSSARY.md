# Pressing Room

A fictional online record shop, built as a learning project: a public landing page, a Record detail page, a Cart page and a login page, backed by a small open API.

## Language

**Record**:
A single item for sale in the shop, described by artist, title, Format, release year, genre, price, stock count, cover image and a short description.
_Avoid_: Product, item, album, pressing, listing

**Format**:
The physical medium a Record is sold on: Vinyl, CD or Cassette. Multi-disc variants such as 2xLP are part of the label, not a separate Format.
_Avoid_: Media, type

**Catalog**:
Every Record the shop sells, Out of stock ones included, browsable on its own page and narrowed by a search on artist and title or by Format.
_Avoid_: Products page, shop page, inventory

**Featured Record**:
A Record flagged to appear in the "Featured pressings" carousel on the landing page.
_Avoid_: Featured product, highlight

**Out of stock**:
The state of a Record whose stock count is zero. It stays visible in the shop but cannot be added to a Cart.
_Avoid_: Sold out, unavailable, hidden

**Cart**:
The set of Records a visitor intends to buy, kept in the visitor's browser and available without logging in. Each entry has a quantity, capped at the Record's stock count.
_Avoid_: Basket, bag, order

**Order**:
A Customer's completed purchase of one or more Records, created from the Cart at checkout. Its only status is Placed.
_Avoid_: Purchase, transaction, sale

**Order line**:
One entry of an Order: a snapshot of a Record's artist, title, Format and price at the moment of purchase, plus the quantity bought. It never changes when the Record is later edited or deleted.
_Avoid_: Order item, line item

**Collection**:
Every Record a Customer has bought across all their Orders, each shown once with the total quantity owned.
_Avoid_: Library, purchases, wishlist

## People

**Customer**:
A person with a signed-up account who can check out and own a Collection.
_Avoid_: User, buyer, shopper, member

**Admin**:
The single seeded account allowed to create, edit, delete and restock Records. It is never created through signup.
_Avoid_: Staff, owner, superuser, moderator

**Demo Customer**:
A seeded Customer, with two past Orders, that any visitor of the Demo can sign in as. Everyone shares it.
_Avoid_: Guest, test user, sample account

## Demo

**Demo**:
The public portfolio deployment of the shop, where every visitor can sign in as the Demo Customer or the Admin, covers cannot be uploaded, and all data returns to the seed every night.
_Avoid_: Sandbox, staging, live site

## Marketing

**Friday List**:
The shop's weekly newsletter, signed up to from the landing page only.
_Avoid_: Newsletter (as a proper name), mailing list

**Subscriber**:
An email address signed up to the Friday List.
_Avoid_: Member, follower
