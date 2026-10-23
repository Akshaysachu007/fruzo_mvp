# Fruzo Loyalty MVP

A mobile-first, **frontend-only** React demo of a restaurant loyalty and customer comeback system, branded for Fruzo.

## Run locally

Prerequisites: Node.js 20+ and npm with internet access for dependency installation.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

To build for deployment:

```bash
npm run build
npm run preview
```

Deploy the generated `dist/` folder to a static hosting service. For deep URLs, configure an SPA rewrite if additional routes are added later.

## What's included

**Customer experience:** branded home page, browsable searchable menu, offers, points wallet, transaction history, rewards and redemption, notifications, profile and demo customer selector. On mobile, navigation is fixed to the bottom.

**Admin experience:** overview of members, repeat visitors, recorded spend and inactive customers; 6-week activity visualization; customer search and filters; staff bill entry; editable products, rewards and offers; opt-in comeback coupon simulation; message history; demo settings and reset.

**Working shared demo logic:** recording a purchase updates points, visits, tracked spend, activity and notifications; reward redemption reduces points and appears in admin history; admin menu/reward/offer edits appear in the customer experience. The state persists with `localStorage` on the same browser origin.

## Give a convincing 3-minute pitch

1. Open the customer view and show the food menu, points and rewards.
2. Use the **Customer / Admin** floating toggle and go to **Record Purchase**.
3. Select *Rahul Kumar* and record a ₹500 bill.
4. Switch back to **Points** to show the new 50 points and transaction.
5. Return to admin **Customers** and filter **Inactive**.
6. Go to **Offers & Campaigns**, simulate a comeback offer to an opted-in customer, and show the notification/coupon in their customer profile.
7. Demonstrate a reward redemption and see the updated points and redemptions in Admin.

## Important limitations

- Demonstration only. There is **no backend**, authentication, payment collection, POS integration, real WhatsApp delivery, real SMS/OTP, or cross-device synchronization.
- Admin access is intentionally open for easy pitches and **must not** be used for live customer data.
- Product photography uses public Unsplash image URLs and requires an internet connection. The page shows an emoji fallback if an image fails.
- The logo in `public/fruzo-logo.png` is the screenshot provided by the user; the primary header uses a stylized wordmark for legibility.
- The earning rate is currently `₹10 = 1 point`, configurable in Settings for subsequent recorded bills. Historic points remain unchanged.
- Promotions are presented and coupons can be simulated, but points multipliers are **display-only** in this MVP to avoid representing them as implemented checkout pricing logic.
- Rewards are redeemed instantly as a demo; real production should use staff verification and server-side transaction locking.
- All demo numbers are fictional and should never be presented as Fruzo's actual performance.

## Development environment verification

This source project was assembled in a runtime where the npm dependency registry could not be accessed. The dependencies therefore could not be installed in that runtime, and the `npm run build` command could **not be verified there**. Install dependencies and run the build on an internet-connected development computer.
