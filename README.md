# Premium Streetwear Next.js App

A modern Next.js application for a premium streetwear e-commerce site, converted from React/Vite.

## Features

- **Next.js 14** with App Router
- Modern React components structure
- Server-side rendering (SSR) and static site generation (SSG)
- Responsive design
- Premium styling with custom fonts (Playfair Display & Inter)
- Product grid with filtering capability
- Dropdown navigation menu
- Hero section with call-to-action
- Footer with multiple columns
- **Shopping Cart** - Add/remove items, quantity management
- **Product Detail Pages** - Clickable products with full details
- **Checkout Flow** - Complete checkout with shipping address form
- **Stripe Integration** - Secure payment processing
- **Cart Persistence** - Cart saved to localStorage

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your Stripe publishable key
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

The built files will be optimized for production.

## Project Structure

```
app/
├── components/
│   ├── Header.jsx          # Navigation header with dropdown & cart count
│   ├── Header.css
│   ├── Hero.jsx            # Hero section with CTA
│   ├── Hero.css
│   ├── ProductSection.jsx  # Product grid with quick add to cart
│   ├── ProductSection.css
│   ├── ProductDetail.jsx   # Individual product detail page
│   ├── ProductDetail.css
│   ├── Cart.jsx            # Shopping cart page
│   ├── Cart.css
│   ├── Checkout.jsx         # Checkout with Stripe integration
│   ├── Checkout.css
│   ├── Success.jsx          # Order confirmation page
│   ├── Success.css
│   ├── Footer.jsx           # Footer component
│   └── Footer.css
├── context/
│   └── CartContext.jsx     # Cart state management
├── data/
│   └── products.js         # Product data
├── product/
│   └── [id]/
│       └── page.jsx        # Dynamic product route
├── cart/
│   └── page.jsx            # Cart page route
├── checkout/
│   └── page.jsx            # Checkout page route
├── success/
│   └── page.jsx            # Success page route
├── layout.jsx               # Root layout with providers
├── page.jsx                # Home page
└── globals.css             # Global styles
```

## Customization

### Products

Edit the `products` array in `app/data/products.js` to add, remove, or modify products. This centralizes product data for use across components.

### Cart & Checkout

- Cart items are automatically saved to localStorage
- Cart persists across page refreshes
- Full checkout flow with shipping address collection
- Stripe payment integration (see STRIPE_SETUP.md for configuration)

### Styling

Each component has its own CSS file for easy customization:
- `Header.css` - Navigation styles
- `Hero.css` - Hero section styles
- `ProductSection.css` - Product grid styles
- `ProductDetail.css` - Product detail styles
- `Cart.css` - Cart page styles
- `Checkout.css` - Checkout styles
- `Success.css` - Success page styles
- `Footer.css` - Footer styles

### Brand Name

Change "Your Brand" in `app/components/Header.jsx` (line with className="logo") to your brand name.

## Next.js Features

- **App Router**: Uses Next.js 14 App Router for file-based routing
- **Server Components**: Default server-side rendering for better performance
- **Client Components**: Marked with 'use client' for interactivity
- **Metadata API**: SEO-friendly metadata in layout.jsx
- **Optimized Builds**: Automatic code splitting and optimization

## Technologies Used

- Next.js 14 - React framework with SSR/SSG
- React 18
- Stripe - Payment processing
- CSS3

## Payment Integration

This app includes Stripe payment integration. To set it up:

1. Get your Stripe API keys from https://stripe.com
2. Create a `.env` file with your publishable key (use `NEXT_PUBLIC_` prefix)
3. Set up a backend server to create payment intents (see `STRIPE_SETUP.md`)

**Important:** The checkout requires a backend server for security. See `STRIPE_SETUP.md` for detailed setup instructions and example backend code.

## Migration from React/Vite

This project was converted from React/Vite to Next.js. Key changes:
- File-based routing instead of React Router
- Server components by default
- Client components marked with 'use client'
- Environment variables use `NEXT_PUBLIC_` prefix
- Layout and page files in `app/` directory

## License

Same as the original template.
