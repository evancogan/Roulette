const CHAMBER_COUNT = 6;
const CHAMBER_ANGLE = 360 / CHAMBER_COUNT;
const TURN_MS = 7000;        // total time from trigger pull to result
const SPIN_MS = 3000;        // the one long cylinder spin per game
const STEP_MS = 350;         // indexing forward a single chamber
const DIM_PER_SHOT = 6.5;    // how much lightness the room loses per chamber fired
const DIM_FLOOR = 56;        // and how dark it is ever allowed to get
const BLACKOUT_MS = 5000;    // how long the screen stays black after the player dies

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
                    revolver: document.querySelector('.revolver__cylinder'),
                    blackout: document.getElementById('blackout')
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
                    playerTurn: true, // who fires next; decided by a coin toss each game
                    hasSpun: false, // the long spin happens once per game
                    cylinderReady: false, // true once that spin has settled
                    gameOver: false,
                    scores: {
                        human: 0,
                        computer: 0
                    }
                };

                // My turns are narrated from the inside, my opponent's from the outside.
                // `suspense` plays during the wait, `payoff` when the hammer falls on an
                // empty chamber. Both are keyed by chambers still unfired, so the tone
                // tracks the odds: 6 is bravado, 1 is a certainty.
                //
                // Three deliberate shapes here. There is nothing written for a death - the
                // gunshot carries that alone. `payoff` stops at 2, because surviving with
                // one chamber left is impossible: the bullet has to be in it, so that
                // hopeless beat lives in `suspense` at 1, before the trigger is pulled.
                // And surviving at 2 is not relief but victory - it hands the last chamber
                // to the other player - so those lines turn cruel.
                this.flavor = {
                    player: {
                        suspense: {
                            6: [
                                "Six chambers. One bullet.",
                                "I've had worse odds.",
                                "First one's the easy one. That's what they say.",
                                "Here goes..."
                            ],
                            5: [
                                "Five left. Still more empty than not.",
                                "I try not to do the math. I do the math.",
                                "The gun is heavier than it was.",
                                "Second time. It doesn't get easier."
                            ],
                            4: [
                                "Four chambers. One of them is the one.",
                                "Three-quarters. That used to sound like a good number.",
                                "Four left, and I can feel every one of them.",
                                "I stop pretending this is a game."
                            ],
                            3: [
                                "Three left. One in three.",
                                "This is where people stop.",
                                "I should stop. I know I should stop.",
                                "My pulse is loud enough to drown out the room."
                            ],
                            2: [
                                "Two chambers. A coin flip decides the rest of it.",
                                "Fifty-fifty. That's all the luck I have left.",
                                "I can't make my finger move.",
                                "Half. It comes down to half."
                            ],
                            1: [
                                "One chamber. This is the one that kills me.",
                                "No luck left to borrow. I know exactly where it is.",
                                "Nothing in there but the bullet. I pull anyway.",
                                "So that's it, then."
                            ]
                        },
                        payoff: {
                            6: [
                                "Empty. Obviously.",
                                "Click. I let the breath out like I meant to hold it.",
                                "Nothing. I almost laugh.",
                                "Still breathing."
                            ],
                            5: [
                                "Empty. Steadier than I have any right to be.",
                                "Click. Two down. I don't like how that sounds.",
                                "Nothing. I put it down before anyone sees me shake.",
                                "The easy ones are running out."
                            ],
                            4: [
                                "Empty. I can't feel my hands.",
                                "Click. Something behind my ribs comes loose.",
                                "Nothing, and the relief is worse than the fear was.",
                                "I'm running out of chambers to be lucky in."
                            ],
                            3: [
                                "Empty. It takes both hands to set it down.",
                                "Click. Still shaking.",
                                "Nothing. I nearly dropped it.",
                                "Closer than the number makes it sound."
                            ],
                            2: [
                                "Empty. The last chamber is theirs, and we both know what's in it.",
                                "Click. I win. I'm smiling and I can't stop.",
                                "Nothing - and just like that it's over. I slide the gun across, gently.",
                                "Empty. I should feel relief. What I feel is so much better than that."
                            ]
                        }
                    },
                    computer: {
                        suspense: {
                            6: [
                                "My opponent takes the gun without looking at it.",
                                "Six chambers. They seem almost bored.",
                                "No hesitation. There's nothing to hesitate about yet.",
                                "They don't even check the cylinder."
                            ],
                            5: [
                                "They check the cylinder twice.",
                                "Five chambers. The motion is a fraction slower.",
                                "My opponent pauses. Barely, but they pause.",
                                "Same motions. Something in them has changed."
                            ],
                            4: [
                                "Four chambers. Their hand isn't quite steady.",
                                "They stall, long enough for both of us to notice.",
                                "My opponent is doing the math again.",
                                "They lift the gun slowly, as if slowly helps."
                            ],
                            3: [
                                "Three chambers. My opponent has stopped pretending.",
                                "They hold the gun a long moment before they move.",
                                "Their hand is shaking. They don't seem to know.",
                                "They hesitate so long I almost say something."
                            ],
                            2: [
                                "Two chambers. My opponent can't bring the gun up.",
                                "They know the odds better than I do, and it's worse for knowing.",
                                "They're begging, in whatever way they have to beg.",
                                "Two left. Nothing left to hide behind."
                            ],
                            1: [
                                "One chamber. They know. They've known for a while.",
                                "My opponent doesn't move. There's nothing left to try.",
                                "They lift the gun anyway. That's the worst part.",
                                "Nothing in there but the bullet. They know it too."
                            ]
                        },
                        payoff: {
                            6: [
                                "Click. They set the gun down, unbothered.",
                                "Empty. Slid back across the table without a word.",
                                "Nothing. If they felt that, they didn't show it.",
                                "Click. Like a formality."
                            ],
                            5: [
                                "Empty. They exhale, which they have never needed to do.",
                                "Click. Set down more carefully this time.",
                                "Nothing. They look at the gun a beat too long.",
                                "Empty. They don't hand it over right away."
                            ],
                            4: [
                                "Click. Relieved, and they hate that it shows.",
                                "Empty. They put it down harder than they meant to.",
                                "Nothing. They won't look at me.",
                                "Click. They've stopped trying to look calm."
                            ],
                            3: [
                                "Empty. They set it down and don't let go.",
                                "Click. My opponent makes a sound I haven't heard before.",
                                "Nothing. They stare at the cylinder like they've been cheated.",
                                "Empty. It takes them three tries to pass the gun back."
                            ],
                            2: [
                                "Click. They smile. The last chamber is mine.",
                                "Empty. They slide the gun over almost tenderly. They're enjoying this.",
                                "Nothing. They're pleased with themselves, and they want me to see it.",
                                "Empty. Whatever was breaking in them has healed. They know I'm finished."
                            ]
                        }
                    }
                };

                this.lastLine = null; // so the same line never lands twice running
            }

            setupEventListeners() {
                this.elements.spinButton.addEventListener('click', () => this.takeTurn(this.state.playerTurn));
                this.elements.resetButton.addEventListener('click', () => this.resetGame());
            }

            // Darkens one step per chamber fired, brightening only on reset. Green marks a
            // player survival; the computer's turns stay on the neutral grey ramp.
            setBackground(mood) {
                const fired = this.state.gameOver
                    ? this.state.chamber
                    : this.state.chamber - 1;
                const light = Math.max(DIM_FLOOR, 100 - fired * DIM_PER_SHOT);
                const tinted = Math.max(DIM_FLOOR, light - 14);

                let color;
                if (mood === 'safe') {
                    color = `hsl(122, 46%, ${tinted}%)`;
                } else if (mood === 'dead') {
                    color = `hsl(2, 62%, ${tinted}%)`;
                } else {
                    color = `hsl(0, 0%, ${light}%)`;
                }
                document.body.style.backgroundColor = color;
            }

            // Chambers still unfired, including the one about to fire.
            remainingChambers() {
                return CHAMBER_COUNT + 1 - this.state.chamber;
            }

            pickLine(isPlayer, moment) {
                const pool = this.flavor[isPlayer ? 'player' : 'computer'][moment];
                // `payoff` has no entry for one chamber left - nobody survives that - so
                // fall back to the tensest pool that does exist rather than blowing up.
                const lines = pool[this.remainingChambers()] || pool[2];
                // Never land the same line twice running.
                const choices = lines.length > 1
                    ? lines.filter(line => line !== this.lastLine)
                    : lines;
                this.lastLine = choices[Math.floor(Math.random() * choices.length)];
                return this.lastLine;
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
                this.elements.waiting.textContent = this.pickLine(isPlayer, 'suspense');
                this.elements.waiting.style.display = "block";
                // The suspense line already says whose turn it is, in whose voice.
                this.elements.result.textContent = "";
                this.setBackground('neutral');

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
                this.elements.result.textContent = "";
                this.playSound('gunshot');

                if (isPlayer) {
                    this.state.scores.computer++;
                    this.elements.computerScore.textContent = this.state.scores.computer;
                } else {
                    this.state.scores.human++;
                    this.elements.humanScore.textContent = this.state.scores.human;
                }

                this.endGame();
                this.setBackground('dead');

                if (isPlayer) {
                    this.elements.blackout.classList.add('on');
                    setTimeout(() => this.elements.blackout.classList.remove('on'), BLACKOUT_MS);
                }
            }

            handleSurvival(isPlayer) {
                this.playSound('click');
                this.elements.result.textContent = this.pickLine(isPlayer, 'payoff');

                // Advance to the chamber the next pull will fire.
                this.state.chamber = this.nextChamber(this.state.chamber);
                this.setBackground(isPlayer ? 'safe' : 'neutral');
                this.updateChamberVisuals();
                this.updateOdds();

                // The gun goes to whoever didn't just fire.
                this.state.playerTurn = !isPlayer;
                if (this.state.playerTurn) {
                    this.elements.spinButton.textContent = "Pull the Trigger";
                    this.elements.spinButton.disabled = false;
                } else {
                    setTimeout(() => this.takeTurn(false), 2000);
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
                this.state.playerTurn = Math.random() < 0.5;

                this.elements.result.textContent = "";
                this.elements.waiting.style.display = "none";
                this.elements.blackout.classList.remove('on');
                this.setBackground('neutral');
                this.elements.spinButton.style.display = "inline-block";
                this.elements.resetButton.style.display = "none";
                this.elements.spinButton.disabled = false;
                // Even when they go first the player has to press something: browsers mute
                // audio until a gesture, and the opening spin needs its sound.
                this.elements.spinButton.textContent = this.state.playerTurn
                    ? "Pull the Trigger"
                    : "Hand Over the Gun";

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
