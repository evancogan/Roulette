# Russian Roulette

The game of Russian Roulette- a game of chance with a dark twist. Players take turns pulling the trigger of a revolver with one bullet in the chamber, hoping to avoid being the one who fires the fatal shot.

<img width="410" height="430" alt="Russian Roulette game screen" src="https://github.com/user-attachments/assets/af59f46c-6cda-40dc-86c0-8f89919f0f6e" />

## Download

Download `Russian Roulette <version>.exe` from the [latest release](https://github.com/evancogan/Roulette/releases/latest) and run it. It's a portable app for Windows: there's nothing to install.

Windows may show a SmartScreen warning because the app isn't code-signed. Click **More info**, then **Run anyway**.

## How to Play

The game is a one button game. The player who goes first is chosen at random. On your turn, the only option is to pull the trigger. If you survive, the turn passes to the other player. If you lose, the game ends and you can start a new game. A counter keeps track of who has won the most games.

### Controls

| Button | What it does |
| --- | --- |
| **Pull the Trigger** | Fire the next chamber on your turn |
| **Hand Over the Gun** | Start a game where the computer goes first |
| **Reset Game** | Start a new game after someone loses |

## Features

- A dynamic background
- Flavor text for each turn
- Sound effects for pulling the trigger and revolver spin
- A counter for wins and losses
- A probability indicator for the next chamber

## Challenges

Having to figure out probability was surprisingly complex, I first took a naive approach of just counting the number of chambers left and dividing it by six, but that was inaccurate. I had to use conditional probability to get the correct answer. After each safe pull, the bullet is known to be among the remaining chambers, so the probability of the next chamber being the bullet is 1 divided by the number of remaining chambers. The probability indicator is updated after each turn. 1/(6 − k)

## Running from Source

Requires [Node.js](https://nodejs.org/).

```bash
npm install
npm start
```

## Building

Builds a portable Windows `.exe` into `dist_build/`.

```bash
npm run dist
```

## Built With

- HTML, CSS and JavaScript
- [Electron](https://www.electronjs.org/) 33
- [electron-builder](https://www.electron.build/)

## Credits

Sound effects are from free online sound libraries.

## License

[MIT](LICENSE)
