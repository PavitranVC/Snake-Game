# Master Architecture Blueprint & Codebase Audit: Neon Snake V1

> **Note for AI Coding Assistants**: This document serves as the complete specification and architectural context for refactoring **Neon Snake V1**. Use the project vision, mechanics spec, error audit, and refactoring guidelines in this file to guide all future code changes.

---

## 0. Project Overview & AI-to-AI Architectural Brief

### 0.1 What This Project Is Trying To Be
**Neon Snake V1** is a high-octane 2D web arcade game built with **Vite, React, and Phaser 3**. 

* **Visual Identity**: A 1980s synthwave / cyberpunk neon arcade aesthetic (*Tron* meets *Geometry Wars*). Dark grid backgrounds (`#050a0f`), vibrant glowing HSL/hex palettes (neon green `#39ff14`, hot pink `#ff2d78`, cyber yellow `#ffe600`, cyan `#00f0ff`), particle bursts on kills, custom monospace typography (*Orbitron*), and dynamic camera tracking.
* **Core Gameplay Identity**: A hybrid of **Slither.io / Snake.io** (360-degree vector steering, eating orb food to grow, boosting with trail particles, head-to-body cutting collisions) combined with a **Single-Player Stage Progression Campaign**.
* **Level Structure**:
  1. **Level 1: "The Nursery"** — 8 passive AI snakes, sparse terrain, target: 5 kills.
  2. **Level 2: "The Arena"** — 12 balanced AI snakes, obstacle terrain, target: 10 kills.
  3. **Level 3: "The Pit"** — 15 aggressive AI snakes targeting the player, dense terrain, target: 15 kills.
* **Control Scheme**: Mouse steering / WASD / Arrow Keys + Spacebar / Right-click boost.

---

### 0.2 File Map & Component Responsibilities

```
c:\Users\vcpav\Desktop\SNAKE\Snake3 V1
├── index.html                 # Main HTML entry with Orbitron Google Font link
├── vite.config.js             # Vite configuration with @vitejs/plugin-react
├── package.json               # Dependencies: phaser (^3.60.0), react (^18.2.0), react-dom
├── src/
│   ├── main.jsx               # React DOM root renderer
│   ├── App.jsx                # App component (Needs GameCanvas wrapper)
│   ├── index.css / App.css    # Core layout and styling
│   └── game/
│       ├── constants.js       # Global game values, speeds, colors, food tiers, world sizes
│       ├── SnakeBase.js       # Shared parent class for player & AI snakes (body history, rendering)
│       ├── Snake.js           # Player snake logic (input processing, boost tank management)
│       ├── EnemySnake.js      # AI enemy snake logic (wander, flee, hunt, target states)
│       ├── EnemyManager.js    # Spawns, tracks, and cleans up AI enemies
│       ├── FoodManager.js     # Shared pulse tween, baked food textures, orb spawning
│       ├── PowerupManager.js  # Powerup spawning (refill, regen, capacity), collision handling
│       ├── ParticleManager.js # Reusable particle emitter pools (eat burst, kill explosion, death)
│       ├── WorldGenerator.js  # Chunk system, Perlin noise terrain obstacles, border kill-walls
│       ├── PerlinNoise.js     # Seeded 2D Perlin noise implementation for procedural terrain
│       ├── Leaderboard.js     # LocalStorage persistence service for high scores & player names
│       ├── LevelConfig.js     # Level configurations (world size, AI params, kill targets)
│       ├── MenuScene.js       # Level selection cards, name entry input, leaderboard button
│       ├── SnakeScene.js      # Main gameplay scene (physics bounds, combat loop, camera, win/loss)
│       ├── UIScene.js         # HUD overlay scene (score, length, kill bar, minimap, live rank, pause)
│       ├── LeaderboardScene.js # High scores table scene
│       ├── LevelCompleteScene.js # Stage victory celebration screen
│       └── WorldLeaderboard.js # 3D/In-world physical scoreboard rendered inside the game map
```

---

### 0.3 Target Architecture Model

To refactor this codebase cleanly, follow the **Decoupled React-Phaser Architecture**:

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                       React Application                         │
 │   - App.jsx                                                     │
 │   - components/GameCanvas.jsx  (Phaser Lifecycle Container)      │
 │   - components/HUD.jsx         (Score, Boost Bar, Minimap)      │
 │   - components/Menu.jsx        (Level Select, Name Input)       │
 │   - components/Leaderboard.jsx (High Scores Table)              │
 └────────────────────────────────┬────────────────────────────────┘
                                  │
                       Global Event Bus / Store
                    (src/game/EventBus.js or Zustand)
                                  │
 ┌────────────────────────────────┴────────────────────────────────┐
 │                         Phaser Engine                           │
 │   - SnakeScene.js   (World Physics, Entities, Combat Loop)     │
 │   - Entity Managers (EnemyManager, FoodManager, WorldGenerator) │
 └────────────────────────────────┬────────────────────────────────┘
                                  │
                     Repository Service Layer
                                  │
 ┌────────────────────────────────┴────────────────────────────────┐
 │                       Data & Storage                            │
 │   - LocalStorageService (Current) ──► Cloud Database (Future)   │
 └─────────────────────────────────────────────────────────────────┘
```

---

## 1. Codebase Audit & Technical Errors

### 1.1 Fatal Build & Compile Blockers

#### 🔴 Unresolved Component Import in `App.jsx`
* **File**: [`src/App.jsx:L1`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/App.jsx#L1)
* **Issue**: `App.jsx` imports `./components/GameCanvas` which does not exist on disk.
* **Fix**: Create `src/components/GameCanvas.jsx` to mount and unmount the Phaser `Game` instance properly inside React `useEffect`.

---

### 1.2 Critical Runtime Crash Bugs

#### 🔴 Invoking Boolean Property as a Function
* **File**: [`src/game/Snake.js:L88`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/Snake.js#L88)
* **Issue**: `pointer.rightButtonDown` is a boolean in Phaser 3. Calling `pointer.rightButtonDown()` throws `TypeError: pointer.rightButtonDown is not a function` when right-clicking.
* **Fix**: Change to `Boolean(pointer.rightButtonDown)`.

#### 🔴 Uninitialized Array Access During Scene Construction
* **File**: [`src/game/WorldLeaderboard.js:L33`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/WorldLeaderboard.js#L33) & [`L120`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/WorldLeaderboard.js#L120)
* **Issue**: Constructor calls `this._refresh()` on line 33 before `this._rowObjs = []` is initialized on line 120, throwing `TypeError: Cannot read properties of undefined (reading 'forEach')`.
* **Fix**: Move `this._rowObjs = []` initialization to top of constructor before calling `_build()` or `_refresh()`.

#### 🟠 Deprecated Particle Emitter Tint Method
* **File**: [`src/game/ParticleManager.js:L96`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/ParticleManager.js#L96), [`L105-L106`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/ParticleManager.js#L105-L106), [`L114`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/ParticleManager.js#L114)
* **Issue**: Calling `emitter.setParticleTint(color)` on Phaser 3.60+ `ParticleEmitter` objects.
* **Fix**: Replace `emitter.setParticleTint(color)` with `emitter.setTint(color)`.

---

### 1.3 State Management & Data Pipeline Bugs

#### 🟠 Mismatched Property Key in Boost Cooldown HUD
* **File**: [`src/game/UIScene.js:L140-L144`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/UIScene.js#L140-L144) vs [`src/game/SnakeScene.js:L290-L292`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/SnakeScene.js#L290-L292)
* **Issue**: `SnakeScene` passes `cooldownPct` and `onCooldown` to `UIScene.setStats()`, but `UIScene` checks `this.stats.cooldown`. `cooldown` evaluates to `undefined`, so boost cooldown UI elements never display.
* **Fix**: Update `UIScene.js` to read `this.stats.cooldownPct` and `this.stats.onCooldown`.

#### 🟡 Flawed Rank Lookup in Leaderboard Persistence
* **File**: [`src/game/Leaderboard.js:L39-L43`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/Leaderboard.js#L39-L43)
* **Issue**: `saveScore()` compares `e.date === trimmed[0]?.date` (1st place date) instead of comparing against saved entry timestamp.
* **Fix**: Use a unique `id` or timestamp for exact match comparison.

---

### 1.4 Memory Leaks & DOM Pollution

#### 🟠 Uncleaned HTML Input Elements in `MenuScene.js`
* **File**: [`src/game/MenuScene.js:L264-L297`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/MenuScene.js#L264-L297)
* **Issue**: HTML `<input>` appended directly to `document.body` without attaching scene `shutdown` cleanup listener (`this.events.once('shutdown', ...)`).
* **Fix**: Attach a cleanup listener to scene lifecycle `shutdown` and `destroy` events.

#### 🟠 Accumulating Scene Event Listeners
* **File**: [`src/game/SnakeScene.js:L91-L93`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/SnakeScene.js#L91-L93)
* **Issue**: `this.events.on("powerupCollected", ...)` registers listeners on every scene creation without removing them on scene shutdown.
* **Fix**: Unbind listeners in `shutdown` event handler.

---

### 1.5 Performance & Algorithmic Flaws

#### 🟡 Object Allocation Inside Ring-Buffer Getter
* **File**: [`src/game/SnakeBase.js:L89-L95`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/SnakeBase.js#L89-L95)
* **Issue**: `_historyAt(n)` returns `{ x, y }` newly instantiated heap objects every frame for every snake segment, defeating the zero-allocation purpose of `Float32Array`.
* **Fix**: Mutate an in-place result object or return coordinates directly.

#### 🟡 Misaligned Static Physics Circle Bodies
* **File**: [`src/game/WorldGenerator.js:L237-L241`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/WorldGenerator.js#L237-L241)
* **Issue**: Static circle shapes created via `scene.add.circle(cx, cy, physR)` default to origin `(0.5, 0.5)`. `setCircle(physR)` without origin offsets misaligns Arcade Physics bodies.
* **Fix**: Calculate and pass center offset `physR` into `setCircle(physR, offset, offset)`.

---

## 2. Refactoring Blueprint for AI Assistant

When refactoring this project, complete the tasks in the following sequence:

### Phase 1: Fix Fatal Crashes & Compile Blockers
1. Create `src/components/GameCanvas.jsx` to wrap Phaser properly inside React.
2. Fix boolean function call in [`src/game/Snake.js:L88`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/Snake.js#L88).
3. Fix constructor ordering in [`src/game/WorldLeaderboard.js:L33`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/WorldLeaderboard.js#L33).
4. Update particle tint calls in [`src/game/ParticleManager.js`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/ParticleManager.js).
5. Fix key mismatch in [`src/game/UIScene.js:L140`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/UIScene.js#L140).

### Phase 2: Decouple UI & State (Event Bus Migration)
1. Create `src/game/EventBus.js` using Phaser's `Events.EventEmitter`.
2. Move HUD overlays (score, boost gauge, minimap, live leaderboard) from `UIScene.js` into React components under `src/components/`.
3. Emit gameplay events from `SnakeScene.js` over the Event Bus (`GAME_STATS_UPDATE`, `PLAYER_DIED`, `LEVEL_COMPLETE`).
4. Attach DOM cleanup listeners to `MenuScene.js` shutdown events.

### Phase 3: Abstract Storage & Prepare for Cloud Backend
1. Refactor [`src/game/Leaderboard.js`](file:///c:/Users/vcpav/Desktop/SNAKE/Snake3%20V1/src/game/Leaderboard.js) into `src/services/LeaderboardRepository.js`.
2. Implement `LocalLeaderboardService` (backed by LocalStorage/IndexedDB).
3. Expose interface methods (`getScores()`, `saveScore()`) so a Firebase or Supabase cloud service can be plugged in without touching game scenes.
