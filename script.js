const CHAMBER_COUNT = 6;
const CHAMBER_ANGLE = 360 / CHAMBER_COUNT;
const TURN_MS = 7000;        // total time from trigger pull to result
const SPIN_MS = 3000;        // the one long cylinder spin per game
const STEP_MS = 350;         // indexing forward a single chamber

class RouletteGame {
            constructor() {
                this.initializeElements();
                this.initializeAudio();
                this.initializeGameState();
                this.setupEventListeners();
                this.resetGame();
            }

            initializeElements() {
                this.elements = {
                    spinButton: document.getElementById('spinButton'),
                    resetButton: document.getElementById('resetButton'),
                    result: document.getElementById('result'),
                    waiting: document.getElementById('waiting'),
                    odds: document.getElementById('odds'),
                    humanScore: document.getElementById('humanScore'),
                    computerScore: document.getElementById('computerScore'),
                    revolver: document.querySelector('.revolver__cylinder')
                };
            }

            initializeAudio() {
                this.sounds = {
                    spin: new Audio('spin.mp3'),
                    gunshot: new Audio('gunshot.mp3'),
                    take: new Audio('take.mp3'),
                    heartbeat: new Audio('heartbeat.mp3'),
                    click: new Audio('click.mp3')
                };
                // Decode during page load instead of at the first trigger pull,
                // otherwise short clips like click.mp3 get clipped at the start.
                Object.values(this.sounds).forEach(sound => {
                    sound.preload = 'auto';
                    sound.load();
                });
            }

            playSound(name) {
                const sound = this.sounds[name];
                sound.currentTime = 0;
                sound.play();
            }

            initializeGameState() {
                this.state = {
                    chamber: 1, // Always 1-6, chamber to be fired next
                    bulletChamber: 1,
                    rotation: 0,
                    hasSpun: false, // the long spin happens once per game
                    cylinderReady: false, // true once that spin has settled
                    gameOver: false,
                    scores: {
                        human: 0,
                        computer: 0
                    }
                };

                // Both pools are keyed by how many chambers are still unfired:
                // fewer chambers left means a worse chance, so the tone escalates.
                this.messages = {
                    calm: [
                        "Lucky escape!",
                        "Barely worth flinching.",
                        "The chamber was empty",
                        "Still breathing..."
                    ],
                    uneasy: [
                        "That one felt close.",
                        "My hands aren't steady anymore.",
                        "Close call!",
                        "You survive... for now"
                    ],
                    scared: [
                        "I can't keep doing this.",
                        "My heart is going to give out first.",
                        "That was a coin flip. A COIN FLIP."
                    ],
                    dread: [
                        "It's the last one. It has to be the last one.",
                        "There's nowhere left for it to hide."
                    ]
                };

                this.waitingMessages = {
                    calm: [
                        "Feeling lucky...",
                        "Is it my turn?",
                        "What will happen next?"
                    ],
                    uneasy: [
                        "Waiting for the bullet...",
                        "The tension is real...",
                        "Sweating bullets..."
                    ],
                    scared: [
                        "Holding my breath...",
                        "Please, not this one.",
                        "I don't want to look."
                    ],
                    dread: [
                        "This is it. This is how it ends.",
                        "No luck left to borrow."
                    ]
                };
            }

            setupEventListeners() {
                this.elements.spinButton.addEventListener('click', () => this.takeTurn(true));
                this.elements.resetButton.addEventListener('click', () => this.resetGame());
            }

            // Chambers still unfired, including the one about to fire.
            remainingChambers() {
                return CHAMBER_COUNT + 1 - this.state.chamber;
            }

            pickMessage(pool) {
                const remaining = this.remainingChambers();
                let tier;
                if (remaining >= 5) {
                    tier = pool.calm;
                } else if (remaining >= 3) {
                    tier = pool.uneasy;
                } else if (remaining === 2) {
                    tier = pool.scared;
                } else {
                    tier = pool.dread;
                }
                return tier[Math.floor(Math.random() * tier.length)];
            }

            updateOdds() {
                if (this.state.gameOver) {
                    this.elements.odds.textContent =
                        `The bullet was in chamber ${this.state.bulletChamber}`;
                    return;
                }
                // Exactly one live round hides among the chambers nobody has fired yet,
                // so surviving this pull is (remaining - 1) / remaining.
                const remaining = this.remainingChambers();
                const survive = remaining - 1;
                const pct = Math.round((survive / remaining) * 100);
                const noun = remaining === 1 ? 'chamber' : 'chambers';
                this.elements.odds.textContent =
                    `1 live round · ${remaining} ${noun} left · Survival: ${survive}/${remaining} (${pct}%)`;
            }

            async takeTurn(isPlayer) {
                if (this.state.gameOver) return;

                this.elements.spinButton.disabled = true;
                this.elements.spinButton.textContent = "Wait...";
                this.elements.waiting.textContent = this.pickMessage(this.waitingMessages);
                this.elements.waiting.style.display = "block";
                this.elements.result.textContent = isPlayer ? "" : "Computer's turn...";
                document.body.classList.remove("bg-success", "bg-danger");

                if (!isPlayer) {
                    this.playSound('take');
                }

                // Only play heartbeat for suspense
                this.playSound('heartbeat');

                // The cylinder is spun once at the start of the game; every pull after
                // that just indexes it forward by a single chamber. The rotation plays
                // out inside the turn, so the suspense fills whatever time is left.
                if (this.state.hasSpun) {
                    this.advanceCylinder();
                } else {
                    this.initialSpin();
                }

                await new Promise(resolve => setTimeout(resolve, TURN_MS));

                this.sounds.heartbeat.pause();
                this.sounds.heartbeat.currentTime = 0;

                this.elements.waiting.style.display = "none";

                if (this.state.chamber === this.state.bulletChamber) {
                    this.handleLoss(isPlayer);
                } else {
                    this.handleSurvival(isPlayer);
                }
            }

            initialSpin() {
                // Randomizing spin: several full turns, landing aligned to the chamber
                // that is about to fire.
                const fullSpins = 4;
                const targetOffset = (-CHAMBER_ANGLE * (this.state.chamber - 1) + 360) % 360;
                const currentOffset = ((this.state.rotation % 360) + 360) % 360;
                const forwardOffset = (targetOffset - currentOffset + 360) % 360;
                this.state.rotation += (360 * fullSpins) + forwardOffset;

                this.elements.revolver.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`;
                this.elements.revolver.style.setProperty('--rotation', `${this.state.rotation}deg`);

                this.playSound('spin');
                this.state.hasSpun = true;

                // The live chamber stays dark until the cylinder stops moving - lighting
                // it up mid-spin would give the position away before it is settled.
                setTimeout(() => {
                    if (!this.state.hasSpun) return; // a reset cancelled this spin
                    this.state.cylinderReady = true;
                    this.updateChamberVisuals();
                }, SPIN_MS);
            }

            advanceCylinder() {
                // One notch, so the next chamber lines up under the hammer.
                this.state.rotation -= CHAMBER_ANGLE;

                this.elements.revolver.style.transition = `transform ${STEP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
                this.elements.revolver.style.setProperty('--rotation', `${this.state.rotation}deg`);
            }

            handleLoss(isPlayer) {
                this.elements.result.textContent = isPlayer
                    ? "BANG! Game Over!"
                    : "BANG! Computer loses!";
                this.playSound('gunshot');
                document.body.classList.add("bg-danger");

                if (isPlayer) {
                    this.state.scores.computer++;
                    this.elements.computerScore.textContent = this.state.scores.computer;
                } else {
                    this.state.scores.human++;
                    this.elements.humanScore.textContent = this.state.scores.human;
                }

                this.endGame();
            }

            handleSurvival(isPlayer) {
                this.playSound('click');
                this.elements.result.textContent = this.pickMessage(this.messages);
                document.body.classList.add("bg-success");

                // Advance to the chamber the next pull will fire.
                this.state.chamber = this.nextChamber(this.state.chamber);
                this.updateChamberVisuals();
                this.updateOdds();

                if (isPlayer) {
                    setTimeout(() => this.takeTurn(false), 2000);
                } else {
                    this.elements.spinButton.textContent = "Pull the Trigger";
                    this.elements.spinButton.disabled = false;
                }
            }

            updateChamberVisuals() {
                // Clear all chambers
                document.querySelectorAll('.chamber').forEach(chamber => {
                    chamber.classList.remove('active', 'empty');
                });
                // If game over, mark all chambers up to and including the bullet chamber as empty
                let last = this.state.gameOver ? this.state.bulletChamber : this.state.chamber - 1;
                for (let i = 1; i <= last; i++) {
                    const firedChamber = document.querySelector(`.chamber[data-chamber="${i}"]`);
                    if (firedChamber) {
                        firedChamber.classList.add('empty');
                    }
                }
                // Mark the chamber under the hammer, but only once the opening spin
                // has settled - before that the cylinder position is meant to be unknown.
                if (!this.state.cylinderReady) return;
                const activeChamber = document.querySelector(`.chamber[data-chamber="${this.state.chamber}"]`);
                if (activeChamber) {
                    activeChamber.classList.add('active');
                }
            }

            nextChamber(current) {
                // 1-6, wraps around
                return current % CHAMBER_COUNT + 1;
            }

            endGame() {
                this.state.gameOver = true;
                this.elements.spinButton.style.display = "none";
                this.elements.resetButton.style.display = "inline-block";
                this.updateChamberVisuals();
                this.updateOdds();
            }

            resetGame() {
                this.state.chamber = 1;
                this.state.bulletChamber = Math.floor(Math.random() * CHAMBER_COUNT) + 1;
                this.state.rotation = 0;
                this.state.hasSpun = false;
                this.state.cylinderReady = false;
                this.state.gameOver = false;

                this.elements.result.textContent = "";
                this.elements.waiting.style.display = "none";
                document.body.classList.remove("bg-success", "bg-danger");
                this.elements.spinButton.style.display = "inline-block";
                this.elements.resetButton.style.display = "none";
                this.elements.spinButton.disabled = false;
                this.elements.spinButton.textContent = "Pull the Trigger";

                // Snap back to zero without animating the cylinder backwards.
                this.elements.revolver.style.transition = 'none';
                this.elements.revolver.style.setProperty('--rotation', '0deg');
                void this.elements.revolver.offsetWidth;
                this.elements.revolver.style.transition = '';

                this.updateChamberVisuals();
                this.updateOdds();
            }
        }

        // Initialize the game
        const game = new RouletteGame();
