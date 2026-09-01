# Stampede

You're the car now. A reverse Crossy Road: hop your car across roads full of stampeding
chickens, pigs, cows, deer, zebras, giraffes and elephants, ride logs across rivers, and
never idle under open sky or the eagle takes you.

Built with Vite + Three.js. Every car and animal is a procedurally built voxel model merged
into a single vertex-coloured mesh, so the whole world draws in a couple hundred calls.

## Play

```bash
npm install
npm run dev
```

Open http://localhost:4500. Arrows / WASD / space to hop, or swipe and tap on a phone.

## What's in it

- 20 unlockable cars in the Garage: buy directly with coins or open a 100-coin mystery crate.
- Hall of Hops: local top-10 with driver name, car and date, plus lifetime stats.
- Four lane types: grass with obstacles, animal roads, rivers with floating logs, and
  buffalo stampede tracks with warning lamps.
- Difficulty ramps with distance: faster herds, tighter gaps, longer highways.
- Eagle for idling or lagging behind the camera. Squash-and-stretch hops, dust, coin
  sparkles, camera shake, and a flattened-car death.
- Soundtrack and effects composed with the ElevenLabs Music and Sound Effects APIs
  (`npm run audio` regenerates them with `ELEVENLABS_API_KEY` in `.env`). Falls back to tiny
  synthesized blips if a file is missing.
- Progress persists in localStorage.

## Build

```bash
npm run build
```

Static output lands in `dist/` with relative asset paths, so it deploys to GitHub Pages,
Vercel, Netlify or any static host as-is.
