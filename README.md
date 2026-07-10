# 🎲 wander-game

A highly customizable, web-first TTRPG creation engine and virtual tabletop sandbox.

## What it is

Wander Game lets you build, script, and run tabletop RPG sessions entirely in the browser. Instead of being locked into a single system, the goal is total customizability from scratch. 

Creators get a tile-based map editor, a no-code character sheet builder, and a visual story flowchart—all integrated into a single real-time multiplayer ecosystem.

## Key Subsystems

- **The World Designer:** A high-performance tilemap canvas with layered visibility, Fog of War, and background procedural generation.
- **The Blueprinter:** A dynamic, schema-driven character sheet creator supporting custom stats, attributes, and automated roll logic.
- **The Story Architect:** A node-based flowchart editor to visually script branching campaign plots and map-based event triggers.

## Tech Stack

- **React + TypeScript** — UI layer, sidebars, and configuration panels
- **PixiJS** — Fast WebGL canvas rendering for grids and interactive tokens
- **Zustand** — Highly decoupled client-side state management
- **WebSockets** — Low-latency session state synchronization
- **Vitest + fast-check** — Unit testing and property-based verification for critical game logic
- **Tauri / Capacitor** — Target runtimes for native desktop and mobile packaging (Planned)

## Project Structure

```text
src/
  components/   # React UI components (sheets, chat, flowcharts)
  renderer/     # PixiJS canvas layout, viewpoint controllers, and token rendering
  store/        # Zustand state slices (session, UI, map layers)
  sync/         # WebSocket client connection layer
  utils/        # Pure logic (dice math, grid layouts, graph evaluation, serialization)
  workers/      # Off-thread Web Workers for procedural terrain generation
server/
  session/      # Room management and active participant sockets
  delta/        # State delta routing (broadcasting atomic changes)
  state/        # Campaign state persistence and storage
  triggers/     # Event trigger execution engine (evaluating story nodes)

```

## Status

Early stage. The core specifications and architecture are defined; foundational implementation is currently in progress.

## Getting Started

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run unit and property-based test suites
npm run test

```

## ⚖️ Legal & System Compatibility

Wander Game is an engine, not a rulebook. Systems built or hosted using this platform that leverage third-party rulesets (such as the 5e System Reference Document) must adhere to their respective Open RPG Creative (ORC) or Creative Commons (CC-BY-4.0) licenses. No protected product identity, trademarked lore, or restricted imagery is packaged natively within this codebase.