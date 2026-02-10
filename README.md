# Andrew's Taxi Lebanon - Website

A modern, high-conversion web application for Andrew's Taxi, a premium transportation service in Lebanon. This site is designed to drive bookings via WhatsApp and provide users with transparent fare estimates.

## 🚀 Features

- **Interactive Fare Estimator**: Real-time pricing estimates using Google Maps Distance Matrix and Places API.
- **WhatsApp Integration**: One-click booking with pre-filled messages for seamless user experience.
- **Conversion Focused Design**: High-impact Hero section, professional services overview, and trust signals (Google Reviews).
- **Responsive Branding**: Fully themed with Andrew's Taxi signature **Navy & Gold** color palette.
- **Optimized for Performance**: Built with React 19, Tailwind CSS, and Lucide icons.

## 🛠️ Tech Stack

- **Framework**: React 19 (ES Modules)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Maps API**: Google Maps (Distance Matrix, Places Autocomplete)
- **Fonts**: Inter (via Google Fonts)

## 📁 Project Structure

```text
├── components/          # React components (Hero, Header, Estimator, etc.)
├── public/              # Brand assets (Favicon, Logos) - MUST BE CREATED MANUALLY
├── constants.ts         # Centralized configuration (API keys, Pricing, Contact info)
├── types.ts             # TypeScript interfaces
├── App.tsx              # Main application entry point
├── index.html           # HTML template and Tailwind config
└── index.tsx            # DOM mounting
```

## ⚙️ Setup & Configuration

### 1. Google Maps API
The **Fare Estimator** requires a valid Google Maps API Key with the following APIs enabled:
- Places API
- Distance Matrix API
- Maps JavaScript API

Update the key in `constants.ts`:
```typescript
export const GOOGLE_MAPS_API_KEY = "YOUR_API_KEY_HERE";
```

### 2. Pricing Logic
Pricing rules are managed in `constants.ts` under `PRICING_CONFIG`. You can adjust base fares, per-km rates, and minimum fares to match current Lebanese market rates.

### 3. WhatsApp Integration
Update `PHONE_NUMBER_CLEAN` in `constants.ts` with the target phone number (international format without `+`).

## 🎨 Asset Management (IMPORTANT)

To ensure the branding displays correctly, create a `public/` folder in the root directory and add these files:

- `logo.png`: The primary brand logo (Navy text) for the sticky header.
- `logo-white.png`: The inverted brand logo (White text) for the dark footer.
- `favicon.png`: The "A" mark for the browser tab.

*If these files are missing, the app will automatically fall back to a high-quality SVG vector logo.*

## 🌐 Deployment

The Google Maps API key is configured with **Referrer Restrictions**. Ensure your production domain (`andrewstaxilb.com`) is added to the allowed referrers in your Google Cloud Console to prevent `RefererNotAllowedMapError`.

---
*Developed by Andrew's Taxi Tech Team.*