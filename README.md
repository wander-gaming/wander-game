# wander-game

A work-in-progress TTRPG creation engine and virtual tabletop, built for the web first.

## What it is

Wander Game lets you build and run tabletop RPG sessions entirely in the browser. You get a tile-based map editor, a no-code character sheet builder, a visual story flowchart, and real-time multiplayer — all in one place.

The goal is to support any game system, not just D&D, so everything from character attributes to map layouts is customizable from scratch.

## Stack

- **React + TypeScript** — UI and component layer
- **PixiJS** — canvas rendering for the map and tokens
- **Zustand** — client state management
- **WebSockets** — real-time session sync
- **Vitest + fast-check** — unit and property-based tests
- **Tauri** — desktop packaging (planned)
- **Capacitor** — mobile packaging (planned)

## Status

Early stage. The spec and architecture are defined; implementation is in progress.

## Getting started

```bash
npm install
npm run dev
```

## Project structure

```
src/
  components/   # React UI components
  renderer/     # PixiJS canvas modules
  store/        # Zustand slices
  sync/         # WebSocket client
  utils/        # Pure utilities (grid, dice, graph, serialization)
  workers/      # Procedural generation Web Workers
server/
  session/      # Session and participant management
  delta/        # State delta routing
  state/        # Campaign persistence
  triggers/     # Event trigger execution
```

## Running tests

```bash
npm run test
```
