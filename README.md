# Homebase

Homebase helps University of Michigan students compare Ann Arbor housing against their actual budget, campus routine, and commute. The 24 sample listings and travel estimates are illustrative.

## Run locally

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Run `npm run build` to produce the deployable site in `dist/`, and `npm run preview` to preview that build locally.

## Demo

1. In Discover, set a budget and change your Central Campus, North Campus, and Kerrytown visits. Try walking, typical bus waits, and longer waits.
2. Swipe right to save or left to pass. You can also use the buttons or focus a listing and use the arrow keys. The Saved view compares up to three homes and keeps notes in your browser.
3. In Semester Lab, load the demo week and move the North Campus slider. For an undecided schedule, compare the worst-case cost gaps across possible weeks.
4. In Day Replay, move the lab four minutes earlier and see which homes still leave room for a 30-minute lunch.

The React screens share a routine and use the original commute and ranking model in `model.js`. No backend or API key is required.

## Deploy to Vercel

Import the GitHub repo with the project root set to the repository root. The included `vercel.json` uses Vite, runs `npm run build`, and serves `dist/`. If this repo was previously configured as a no-build static site, clear any conflicting project overrides.
