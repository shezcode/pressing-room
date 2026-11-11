---
status: accepted
---

# Order lines snapshot Records instead of referencing them

An Order line copies the Record's artist, title, Format and price at the moment of purchase, and also keeps the `recordId` and `coverUrl`. The admin can edit and delete Records, so a line that merely pointed at a live Record would change a Customer's Order history on every edit and break their Collection on every deletion. Copying the data keeps Orders and Collections stable regardless of what happens to the catalog afterwards.

## Considered Options

- **Reference the live Record by id.** Less duplicated data, and corrections flow through to old Orders. Rejected because price changes would rewrite past Order totals, and deleting a Record would need soft-delete or leave dangling references in Collections.
- **Reference the Record and freeze only the price, archiving instead of deleting.** A middle ground that was discussed. Not chosen: it makes "delete" mean "archive" and lets later edits alter what a Customer sees in their history.

## Consequences

- Deleting a Record removes it from the shop but leaves Order lines intact; Collection entries for a deleted Record still show, without a link to a detail page.
- Cover files are never deleted from disk, because Order lines may still point at them.
- Editing a Record never changes existing Orders.
