# Hearth Release Notes

Last updated: October 15, 2026
Owner: Ana Lindqvist, Online Store Lead

Hearth is the software behind the online store at lanternsupply.example: the catalogue, the
cart, checkout, order lookup, returns and the Lumen Rewards pages. These notes are written for
everyone in the company, not only engineering. When a release changes a policy that customers
see, that change is listed here first and the policy document is updated afterwards; if the two
disagree, these notes are the newer record. Versions are listed newest first.

## 4.3 — October 15, 2026

### Highlights

Free standard shipping now starts at $60, down from $75. The threshold is applied to the order
subtotal before shipping and tax, the same way the $75 threshold was. The shipping page and the
cart both show the new amount, and the cart shows how much more a customer needs to add to
qualify. We expect the change to move a good share of the $60–$75 orders that used to stall at
the cart.

Gift cards are on sale for the first time. They come in $25, $50, $100 and $200 amounts, are
delivered by email within an hour of purchase, and can be redeemed online or at either
showroom. Gift cards are final sale and do not earn Lumen Rewards points when bought, though
purchases paid with them do.

Lumen Rewards points now appear at checkout. A member sees the points the order will earn next
to the order total, and any reward they have available is offered as a payment line before the
card step.

### Changes

- Free shipping threshold: $60 (was $75). The old threshold was in place since the store
  launched; this is the first change to it.
- Gift card purchase, delivery and redemption, online and in-store.
- Points preview and reward redemption at checkout for signed-in Lumen Rewards members.
- The order confirmation email now lists the delivery estimate as a date range rather than
  "3–6 business days".
- Signature-required orders (over $400) now say so on the checkout page, not only in the
  confirmation email.

### Fixes

- The Canada shipping option no longer appears for carts that contain fuel. Fuel does not ship
  to Canada and the cart said so only at the final step.
- Saved addresses with an apartment number were losing the apartment line when edited.
- The compare page listed the Sentinel 1000 Pro's weight as 1.4 kg; it is 1.9 kg.

### Known issues

- A gift card bought in-store cannot yet be checked for balance online; call the showroom.
- Points preview does not show for guest checkouts, by design, but the empty space it leaves
  looks like a bug. Layout fix planned for 4.3.1.

## 4.2 — August 11, 2026

### Highlights

Wishlists. A signed-in customer can save products to a wishlist and share it by link. Wishlists
are the most requested feature in the suggestion box since the store launched, mostly from
customers buying for scout troops and from gift givers.

Shipping to Canada. The store now ships to Canadian addresses at a flat $19.95, 5–10 business
days, with duties and taxes paid by the recipient on delivery. Fuel and oil do not ship to
Canada. This is the first time the store has shipped outside the United States.

Product compare. Up to three products can be compared side by side on one page: lumens,
runtime, weight, power source, rating and price.

### Changes

- Wishlists, with sharing by link.
- Canada as a shipping destination; address forms accept provinces and postal codes.
- Product compare for up to three products.
- The product page shows the model number under the product name, since customers ordering
  parts kept asking for it.

### Fixes

- The Firefly 220R product page showed the Firefly 220's runtime (42 hours on low) instead of
  its own (48 hours on low). The two products share a page template and the runtime field was
  pointing at the wrong product record. Customers who bought a 220R between May 19 and August
  11 and asked about the difference were offered a 40-day return by Customer Service.
- Order lookup rejected order numbers typed in lower case.
- The holiday return extension banner was showing in July.

### Known issues

- Compare does not include discontinued products, so a Beacon 400 owner cannot compare it to
  the Beacon 600.

## 4.1 — May 19, 2026

### Highlights

Start a return online. A customer can begin a return from the order page, choose the items and
the reason, and get a return authorization number (RA-, six digits) at once instead of calling.
The prepaid return label at $8.50 is offered as an option and the amount is shown as a deduction
from the refund before the customer confirms.

The return window is now counted from the delivery date instead of the ship date. The window is
still 40 days, but the clock starts when the carrier records delivery, not when the box leaves
Hagerstown. This came out of the winter returns review: a box that sat with the carrier for
nine days was costing the customer nine days of their window. Orders shipped before May 19 had
their windows recalculated from the delivery date too.

Order lookup without an account. The order number and the email address on the order are enough
to see the status, tracking and the return option.

### Changes

- Start a return online; RA numbers issued automatically and emailed with the instructions.
- Return window counted from the delivery date (was the ship date).
- Order lookup by order number and email, no account needed.
- Returns on orders delivered to a showroom for pickup can be started online too, for return
  in store.

### Fixes

- The tracking link in the shipping confirmation email went to the carrier's home page rather
  than the shipment.
- Lumen Rewards member numbers were shown with a space after "LR-".

### Known issues

- A return started online for an order with two shipments cannot select items from both
  shipments at once; start two returns.

## 4.0 — March 3, 2026

### Highlights

A new checkout, rebuilt from the cart to the confirmation page. It is one page instead of four,
remembers the shipping method, and shows the delivery estimate before the payment step. Apple
Pay is accepted, and customers with an account can save addresses.

This release replaced the checkout that had run since 2019. The old one is gone; there is no
switch to bring it back.

### Changes

- One-page checkout.
- Apple Pay.
- Saved addresses for account holders, up to five.
- The delivery estimate is shown before payment.
- The cart warns when fuel is in the cart and the address is a PO box.

### Fixes

- Expedited shipping was offered on fuel orders; fuel ships ground only.
- The cart allowed a quantity of zero.

### Known issues

- Apple Pay does not work in some older browsers; the card form is always available.

## 3.9 — November 4, 2025

The last release of the 3.x line, mostly holiday preparation. The holiday return extension
(orders delivered November 1 – December 24 returnable until January 31) is now shown as a
banner on the returns page and in the order confirmation email during that period. Curbside
pickup at the Frederick showroom now sends a text message when the order is ready, within the
2-hour window. Fixed: the Base Camp Bundle was showing as out of stock whenever one colour of
Firefly 220 ran out.

## 3.8 — July 22, 2025

Second Light, the refurbished shelf, moved from a static page to the main catalogue with its
own filter. Each Second Light listing shows the grade (A or B) and the 1-year warranty. Fixed:
the warranty claim form accepted a photo of any size and timed out on large ones; it now resizes
on the customer's side.

## 3.7 — April 15, 2025

The Beacon 400 (LS-400) was marked discontinued in the catalogue, with its parts pages kept
live and a note that parts are stocked until March 2028. Price Promise requests (price match
within 14 days of purchase) can be submitted from the order page. Fixed: the fuel safety guide
was linked from the Northstar page but not from the Hagerstown Kerosene Lantern page.

## Planned: 4.4 — December 2026

Fuel subscriptions. A customer will be able to set up a recurring order of Clearburn white gas
or lamp oil every one, two or three months, ground shipping, with the free shipping threshold
applied to each delivery on its own. The subscription can be paused or cancelled from the
account page at any time. Also planned: balance check for gift cards bought in-store, and the
compare page fix for discontinued products. Dates in this section are intentions, not
promises; if 4.4 slips into January the notes will say so.

## How releases happen

Hearth is deployed on Tuesday mornings before the showrooms open, by Ana Lindqvist or the
engineer on rotation. Customer Service gets the notes the Friday before. A release that changes
a price, a threshold or a policy also gets a line in the Customer Service playbook's "what
changed" list the same day, and the policy document is updated within the week. If you find a
policy page that still shows the old value, say so in the #hearth channel rather than editing
it yourself.
