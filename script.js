class RouletteGame {
            constructor() {
                this.hasStarted = false;
                this.initializeElements();
                this.initializeAudio();
                this.initializeGameState();
                this.setupEventListeners();
                this.resetGame(false); // Don't play spin sound on initial load
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
            }

            initializeGameState() {
                this.state = {
                    chamber: 1, // Always 1-6, chamber to be fired next
                    bulletChamber: 1,
                    gameOver: false,
                    scores: {
                        human: 0,
                        computer: 0
                    }
                };

                this.messages = [
                    "Lucky escape!",
                    "Still breathing...",
                    "Close call!",
                    "You survive... for now",
                    "The chamber was empty",
                    "Living on the edge"
                ];
                
                this.waitingMessages = [
                    "Waiting for the bullet...",
                    "Holding my breath...",
                    "Is it my turn?",
                    "Feeling lucky...",
                    "The tension is real...",
                    "What will happen next?",
                    "Sweating Bullets..."
                ];
            }

            setupEventListeners() {
                this.elements.spinButton.addEventListener('click', () => {
                    if (!this.hasStarted) {
                        this.hasStarted = true;
                        this.sounds.spin.currentTime = 0;
                        this.sounds.spin.play();
                    }
                    this.spin();
                });
                this.elements.resetButton.addEventListener('click', () => this.resetGame(true));
            }

            updateOdds() {
                const remainingChambers = 6 - this.state.chamber;
                this.elements.odds.textContent = 
                    `Probability of survival: ${remainingChambers}/6`;
            }

            async spin() {
                if (this.state.gameOver) return;

                this.elements.spinButton.disabled = true;
                this.elements.waiting.textContent = this.waitingMessages[Math.floor(Math.random() * this.waitingMessages.length)];
                this.elements.waiting.style.display = "block";
                this.elements.result.textContent = "";
                document.body.classList.remove("bg-success", "bg-danger");

                // Only play heartbeat for suspense
                this.sounds.heartbeat.play();

                await this.animateSpinAndWait();

                await new Promise(resolve => setTimeout(resolve, 4000));

                this.sounds.heartbeat.pause();
                this.sounds.heartbeat.currentTime = 0;

                if (this.state.chamber === this.state.bulletChamber) {
                    this.handleLoss();
                } else {
                    this.handleSurvival();
                }
            }

            async animateSpinAndWait() {
                const targetRotation = -60 * (this.state.chamber - 1);
                this.elements.revolver.style.setProperty('--rotation', `${targetRotation}deg`);
                // No need for a long delay here anymore
                return new Promise(resolve => setTimeout(resolve, 600));
            }

            handleLoss() {
                this.elements.result.textContent = "BANG! Game Over!";
                this.sounds.gunshot.play();
                document.body.classList.add("bg-danger");
                this.state.scores.computer++;
                this.elements.computerScore.textContent = this.state.scores.computer;
                this.endGame();
            }

            handleSurvival() {
                this.sounds.click.play();
                this.elements.result.textContent = 
                    this.messages[Math.floor(Math.random() * this.messages.length)];
                document.body.classList.add("bg-success");
                this.elements.spinButton.textContent = "Wait...";
                setTimeout(() => this.computerTurn(), 2000);
            }

            async computerTurn() {
                if (this.state.gameOver) return;

                // Optional: play take sound at the start of computer's turn
                this.sounds.take.play();

                this.elements.spinButton.disabled = true;
                this.elements.spinButton.textContent = "Wait...";
                this.elements.waiting.textContent = this.waitingMessages[Math.floor(Math.random() * this.waitingMessages.length)];
                this.elements.waiting.style.display = "block";
                this.elements.result.textContent = "Computer's turn...";
                document.body.classList.remove("bg-success", "bg-danger");

                // Only play heartbeat for suspense
                this.sounds.heartbeat.play();

                this.state.chamber = this.nextChamber(this.state.chamber);

                await this.animateSpinAndWait();

                await new Promise(resolve => setTimeout(resolve, 4000));

                this.sounds.heartbeat.pause();
                this.sounds.heartbeat.currentTime = 0;

                if (this.state.chamber === this.state.bulletChamber) {
                    this.handleComputerLoss();
                } else {
                    this.handleComputerSurvival();
                }
            }

            handleComputerLoss() {
                this.elements.result.textContent = "BANG! Computer loses!";
                this.sounds.gunshot.play();
                document.body.classList.add("bg-danger");
                this.state.scores.human++;
                this.elements.humanScore.textContent = this.state.scores.human;
                this.endGame();
            }

            handleComputerSurvival() {
                this.sounds.click.play(); // <-- Play click when computer survives
                this.updateChamberVisuals();
                this.elements.result.textContent = 
                    this.messages[Math.floor(Math.random() * this.messages.length)];
                document.body.classList.add("bg-success");
                this.elements.spinButton.textContent = "Pull the Trigger";
                this.elements.spinButton.disabled = false;
                // Advance to next chamber for player's turn
                this.state.chamber = this.nextChamber(this.state.chamber);
                this.updateOdds();
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
                // Mark the current chamber as active
                const bulletChamber = document.querySelector(`.chamber[data-chamber="${this.state.chamber}"]`);
                if (bulletChamber) {
                    bulletChamber.classList.add('active');
                }
            }

            nextChamber(current) {
                // 1-6, wraps around
                return current % 6 + 1;
            }

            endGame() {
                this.state.gameOver = true;
                this.elements.spinButton.style.display = "none";
                this.elements.resetButton.style.display = "inline-block";
            }

            resetGame(playSpin = true) {
                this.state.chamber = 1;
                this.state.bulletChamber = Math.floor(Math.random() * 6) + 1;
                this.state.gameOver = false;

                this.elements.result.textContent = "";
                document.body.classList.remove("bg-success", "bg-danger");
                this.elements.spinButton.style.display = "inline-block";
                this.elements.resetButton.style.display = "none";
                this.elements.spinButton.disabled = false;
                this.elements.spinButton.textContent = "Pull the Trigger";

                // Only play spin sound if not the very first load
                if (playSpin) {
                    this.sounds.spin.currentTime = 0;
                    this.sounds.spin.play();
                }

                this.elements.revolver.style.setProperty('--rotation', '0deg');
                this.updateChamberVisuals();
                this.updateOdds();
            }
        }

        // Initialize the game
        const game = new RouletteGame();