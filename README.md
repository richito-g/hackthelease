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

## 90-second judge walkthrough

- **0:00–0:20.** Open **Try the demo**. The student has a $1,350 housing cap and expects to spend four days on Central Campus. Their lease is due before the class schedule is final.
- **0:20–0:50.** Move one visit from Central to North. The Monroe gives way to Riverbend Flats. Use the paired bars to show where the change came from and the monthly time-adjusted figures to explain the ranking.
- **0:50–1:15.** Reveal the least downside. Market House wins none of the five individual schedules but has the smallest worst-case gap, $344 per month against the best lease in each week.
- **1:15–1:30.** Return to Discover and show how the same commute model personalizes the 24-listing swipe deck. Open the methodology for assumptions.

The demo has its own sample routine and can be opened directly at `/#demo`. It uses the same calculation functions as the rest of Homebase. The format follows Devpost's guidance to show the working product and tie the technical result to a concrete user decision. [Devpost demo guidance](https://info.devpost.com/blog/how-to-present-a-successful-hackathon-demo)
