# Nightfall Protocol - Zombie Shooter

A web-based top-down 2D zombie shooter where you command a special operations fire team to eliminate zombies and rescue civilians.

## 🎮 Play Now

**[Play on GitHub Pages](https://123TomFord.github.io/Nightfall-Protocol/)**

## 🎯 Mission Objective

**Secure the Area**: Eliminate all zombies and rescue civilians before they get infected or your team is overrun.

## 🕹️ Controls

- **Mouse Click**: Move your fire team to the clicked location
- **S Key**: Toggle Sprint mode (faster movement but no firing)
- **H Key**: Hold Position mode
- **F Key**: Follow mode (default)
- **O Key**: Overwatch mode
- **Spacebar**: Pause/Unpause game

## 🎖️ Fire Team

Command a 3-person special operations team:
- **Alpha**: Point man
- **Bravo**: Support
- **Charlie**: Rear guard

Each soldier:
- ✅ Auto-fires at zombies within range
- ✅ Automatically reloads when empty
- ✅ Has realistic movement and formation behavior
- ✅ Can move over barriers (slowly)

## 🧟 Zombie Types

- **Basic Zombies** (Brown): Standard undead, moderate health and speed
- **Fast Zombies** (Red): Quick but fragile, harder to hit
- **Tank Zombies** (Teal): Slow but heavily armored
- **Spitter Zombies** (Purple): Ranged acid attacks

## 👥 Civilians

- Blue dots that move around the map
- Can be rescued by getting soldiers close to them
- Will panic and flee from zombies
- Can be infected by zombie attacks and turn into zombies

## 🎮 Game Features

- **Real-time tactical combat** with auto-firing weapons
- **Formation movement** - soldiers maintain tactical spacing
- **Multiple zombie types** with different behaviors and spawn rates
- **Civilian AI** with panic and infection mechanics
- **Clean modern UI** with team status and mission objectives
- **Progressive difficulty** - zombie spawn rate increases over time
- **Visual effects** for combat, infections, and abilities

## 🏆 Victory Conditions

**Win**: Eliminate all zombies and rescue all remaining civilians
**Lose**: All soldiers are killed

## 🛠️ Technical Details

- Pure HTML5/CSS3/JavaScript - no frameworks
- Canvas-based 2D rendering
- Real-time game loop with delta time
- Entity-component system architecture
- Responsive design for different screen sizes

## 🚀 Development

The game is built using:
- HTML5 Canvas for rendering
- Vanilla JavaScript for game logic
- CSS3 for UI styling
- No external dependencies

To run locally:
```bash
# Start a local web server
python3 -m http.server 8000
# Or use any other static file server
```

Then open `http://localhost:8000` in your browser.

---

*Secure the area, soldier. The fate of the civilians depends on you.*
