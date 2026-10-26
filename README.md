# Neon Rush

A fast-paced neon arcade racing game playable in the browser. Built with Three.js and Vite, deployed on GitHub Pages.

## Features

- **Procedural Track Generation** - Unique figure-8 circuit with elevation changes
- **8 AI Opponents** - Each with distinct personalities and driving styles
- **Neon Visual Style** - Cyberpunk aesthetic with glowing accents, particles, and dynamic lighting
- **Full Desktop & Mobile Support** - Keyboard/mouse and touch controls
- **Procedural Audio** - Synthwave soundtrack and sound effects generated at runtime (zero audio assets)
- **Adaptive Quality** - Low/Medium/High graphics settings for all devices
- **Tiny Footprint** - Under 1MB initial download, no external assets

## Play Now

🎮 **[Play Neon Rush](https://scottpendlebury.github.io/neon-rush/)**

## Controls

### Desktop
| Key | Action |
|-----|--------|
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake/Reverse |
| `A` / `←` | Steer Left |
| `D` / `→` | Steer Right |
| `Shift` | Boost (when meter full) |
| `Space` | Hard Brake |
| `Esc` | Pause |

### Mobile
- **Left Zone** - Virtual joystick (steer + throttle/brake)
- **Right Buttons** - Boost & Brake
- Supports simultaneous multi-touch

## Development

### Prerequisites
- Node.js 18+
- npm

### Install
```bash
npm install
```

### Dev Server
```bash
npm run dev
```
Opens at `http://localhost:3000`

### Production Build
```bash
npm run build
```
Outputs to `dist/`

### Preview Production Build
```bash
npm run preview
```

### Budget Check
```bash
npm run budget
```
Verifies size limits are met.

## Architecture

```
src/
├── main.js          # Entry point, initialization
├── game.js          # Core game loop, state management
├── engine.js        # Three.js renderer, camera, post-processing
├── player.js        # Player vehicle physics & visuals
├── track.js         # Procedural track generation
├── opponents.js     # AI opponent vehicles
├── particles.js     # Particle systems (smoke, sparks, boost)
├── input.js         # Unified keyboard/mouse/touch input
├── ui.js            # Menus, HUD, minimap
├── audio.js         # Procedural audio synthesis
└── settings.js      # Settings persistence (localStorage)
```

## Tech Stack

- **Three.js r165** - 3D rendering
- **Vite 5** - Build tool & dev server
- **Web Audio API** - Procedural sound synthesis
- **Pointer Events** - Unified input handling
- **GitHub Pages** - Static hosting

## Performance Targets

| Platform | Target FPS | Resolution |
|----------|-----------|------------|
| Desktop  | 60        | Up to 2x DPR |
| Mobile   | 30+       | Capped at 1.5x DPR |

## Deployment

The game is automatically deployed to GitHub Pages via GitHub Actions on every push to `main`.

### Manual Deploy
```bash
# Enable Pages (first time only)
gh api --method POST repos/OWNER/REPO/pages -f source[branch]=main -f source[path]=/

# Trigger rebuild (legacy build type)
gh api --method POST repos/OWNER/REPO/pages/builds
```

## License

MIT - Feel free to use for learning or your own projects!

## Credits

Built with ❤️ using:
- [Three.js](https://threejs.org/)
- [Vite](https://vitejs.dev/)
- Fonts: [Orbitron](https://fonts.google.com/specimen/Orbitron), [Rajdhani](https://fonts.google.com/specimen/Rajdhani) 
