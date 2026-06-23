# CodeFlex AI

AI-powered fitness platform that generates personalized workout and diet plans through voice conversations.

## Tech Stack

- **Framework:** Next.js 16 (Turbopack)
- **Auth:** Clerk
- **Database:** Convex
- **Voice AI:** Vapi
- **Styling:** Tailwind CSS 4

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CONVEX_DEPLOY_KEY=
NEXT_PUBLIC_VAPI_ASSISTANT_ID=
VAPI_API_KEY=
```

## Deployment

### Render

1. Push to GitHub
2. Connect repo on [render.com](https://render.com)
3. Use the included `render.yaml` blueprint or configure manually:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add environment variables in Render dashboard
