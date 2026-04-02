## ADDED Requirements

### Requirement: Landing page renders as a Next.js App Router page
The landing page SHALL be implemented as a Next.js 15 App Router page at the root route (`/`). The page layout SHALL use a Server Component for static content (hero, features, footer) and a Client Component only for the interactive email form.

#### Scenario: Root route serves the landing page
- **WHEN** a user navigates to `/`
- **THEN** the server returns a fully rendered HTML page with the Yardie AI landing page content

#### Scenario: Static content renders without client-side JavaScript
- **WHEN** the page loads with JavaScript disabled
- **THEN** the hero section, features grid, and all static text content SHALL be visible (only the form submission behavior requires JS)

### Requirement: Hero section displays brand and tagline
The hero section SHALL display the brand name "Yardie" in a gradient text (indigo to purple) followed by "AI" in white. Below it, a tagline paragraph SHALL read: "Intelligent AI solutions crafted for the Jamaican community. Empowering Caribbean innovation with cutting-edge technology."

#### Scenario: Hero section renders correctly
- **WHEN** the landing page loads
- **THEN** the hero section displays at the top with the brand name in gradient text and the tagline below it

### Requirement: Features grid displays 6 feature cards
The features section SHALL display a responsive grid of 6 feature cards with the heading "Powerful Capabilities" and subtext. Each card SHALL have an icon, title, and description. The grid SHALL be 1 column on mobile, 2 columns on tablet (md), and 3 columns on desktop (lg).

The 6 features are:
1. Natural Language Processing (language icon)
2. Real-time Responses (bolt icon)
3. Multi-bot Collaboration (robot icon)
4. Behavioral Analytics (chart icon)
5. Seamless Integrations (plug icon)
6. Enterprise Security (shield icon)

#### Scenario: Features grid renders responsively
- **WHEN** the page is viewed on a desktop screen (≥1024px)
- **THEN** the features grid displays in 3 columns

#### Scenario: Features grid renders on mobile
- **WHEN** the page is viewed on a mobile screen (<768px)
- **THEN** the features grid displays in 1 column

### Requirement: Visual design matches the current site
The landing page SHALL use the following design tokens:
- Background: `#0a0a0a` (dark-900), cards: `rgba(40, 40, 40, 0.9)` with backdrop blur
- Primary: `#6366f1` (indigo), Accent: `#8b5cf6` (purple)
- Fonts: Inter (body), Fira Code (monospace) loaded via `next/font/google`
- Card hover effect: `translateY(-5px)` with enhanced shadow
- Gradient buttons: linear-gradient from primary to accent
- Feature icons: 60×60px rounded-2xl containers with gradient background

#### Scenario: Custom colors are applied
- **WHEN** the page renders
- **THEN** the body background is `#0a0a0a`, primary buttons use the indigo-to-purple gradient, and cards have the semi-transparent dark background with border

### Requirement: Scroll animations on feature cards
Feature cards and the CTA section SHALL animate in when they enter the viewport using an IntersectionObserver. Cards SHALL have staggered animation delays (100ms, 200ms, 300ms per row).

#### Scenario: Cards animate on scroll
- **WHEN** a feature card enters the viewport
- **THEN** the card fades in and slides up (opacity 0→1, translateY 20px→0) with its assigned delay

### Requirement: TailwindCSS 4 configured with custom theme
TailwindCSS 4 SHALL be installed as a build dependency (not CDN). Custom colors (dark-900, dark-800, dark-700, primary, primary-light, primary-dark, accent, accent-light) and font families (Inter, Fira Code) SHALL be defined using the `@theme` directive in the global CSS file.

#### Scenario: TailwindCSS compiles at build time
- **WHEN** `npm run build` is executed
- **THEN** TailwindCSS processes all utility classes and custom theme values into optimized CSS output
