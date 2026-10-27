
/* =========================================
   GAME 04 — NEON SURVIVOR
   Relaxed space survival arcade
========================================= */

(() => {
    "use strict";

    const canvas = document.getElementById("survivor-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const screen = document.getElementById("survivor-screen");
    const overlay = document.getElementById("survivor-overlay");

    const scoreEl = document.getElementById("survivor-score");
    const energyEl = document.getElementById("survivor-energy");
    const bestEl = document.getElementById("survivor-best");

    const overlineEl = document.getElementById("survivor-overline");
    const messageEl = document.getElementById("survivor-message");
    const descriptionEl = document.getElementById("survivor-description");
    const actionBtn = document.getElementById("survivor-action");
    const pauseBtn = document.getElementById("survivor-pause");

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    let state = "menu";
    let score = 0;
    let energy = 0;
    let best = 0;
    let elapsed = 0;
    let spawnTimer = 0;
    let orbTimer = 0;
    let lastTime = 0;

    let asteroids = [];
    let orbs = [];
    let particles = [];
    let stars = [];

    const keys = { left: false, right: false };

    const ship = {
        x: WIDTH / 2,
        y: HEIGHT - 75,
        radius: 14,
        speed: 245
    };

    // Load the saved best score safely.
    try {
        best = Number(localStorage.getItem("neonSurvivorBest")) || 0;
    } catch (_) {
        best = 0;
    }

    bestEl.textContent = formatScore(best);

    // Background stars.
    for (let i = 0; i < 85; i++) {
        stars.push({
            x: Math.random() * WIDTH,
            y: Math.random() * HEIGHT,
            size: Math.random() * 1.7 + 0.4,
            speed: Math.random() * 25 + 10,
            alpha: Math.random() * 0.6 + 0.2
        });
    }

    function formatScore(value) {
        return String(Math.floor(value)).padStart(6, "0");
    }

    function updateHUD() {
        scoreEl.textContent = formatScore(score);
        energyEl.textContent = String(energy).padStart(2, "0");
        bestEl.textContent = formatScore(best);
    }

    function saveBest() {
        if (score > best) {
            best = score;

            try {
                localStorage.setItem("neonSurvivorBest", String(best));
            } catch (_) {
                // The game still works if storage is unavailable.
            }
        }

        updateHUD();
    }

    function showMenu(overline, title, description, buttonText) {
        overlineEl.textContent = overline;
        messageEl.innerHTML = title;
        descriptionEl.innerHTML = description;
        actionBtn.textContent = buttonText;
        overlay.style.display = "flex";
    }

    function resetGame() {
        score = 0;
        energy = 0;
        elapsed = 0;
        spawnTimer = 0.8;
        orbTimer = 2.5;

        asteroids = [];
        orbs = [];
        particles = [];

        ship.x = WIDTH / 2;
        ship.y = HEIGHT - 75;

        keys.left = false;
        keys.right = false;

        updateHUD();
    }

    function startGame() {
        resetGame();
        state = "running";
        overlay.style.display = "none";
        pauseBtn.disabled = false;
        pauseBtn.textContent = "PAUSE";
        canvas.focus();
    }

    function pauseGame() {
        if (state === "running") {
            state = "paused";
            keys.left = false;
            keys.right = false;
            pauseBtn.textContent = "RESUME";

            showMenu(
                "SYSTEM PAUSED",
                "TAKE A<br>BREATHER",
                "Your mission is paused.<br>Ready when you are.",
                "RESUME GAME"
            );
        } else if (state === "paused") {
            state = "running";
            overlay.style.display = "none";
            pauseBtn.textContent = "PAUSE";
            canvas.focus();
        }
    }

    function endGame() {
        if (state !== "running") return;

        state = "gameover";
        keys.left = false;
        keys.right = false;
        pauseBtn.disabled = true;
        if (typeof window.submitArcadeScore === "function") {
    window.submitArcadeScore("Neon Survivor", Math.floor(score));
}

        saveBest();

        showMenu(
            "MISSION COMPLETE",
            "NICE<br>FLYING",
            `Final score: <strong>${formatScore(score)}</strong><br>` +
            `Energy collected: <strong>${energy}</strong><br>` +
            "Ready for another flight?",
            "PLAY AGAIN"
        );
    }

    function spawnAsteroid() {
        const radius = 11 + Math.random() * 11;

        asteroids.push({
            x: radius + Math.random() * (WIDTH - radius * 2),
            y: -radius - 5,
            radius,
            speed: 85 + Math.random() * 45 + Math.min(elapsed * 1.1, 35),
            drift: (Math.random() - 0.5) * 32,
            rotation: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 1.4,
            shape: Array.from(
                { length: 9 },
                () => 0.78 + Math.random() * 0.38
            )
        });
    }

    function spawnOrb() {
        orbs.push({
            x: 20 + Math.random() * (WIDTH - 40),
            y: -20,
            radius: 8,
            speed: 75 + Math.random() * 25,
            phase: Math.random() * Math.PI * 2
        });
    }

    function burst(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 25 + Math.random() * 100;

            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.5,
                maxLife: 0.8,
                color,
                size: 1.5 + Math.random() * 3
            });
        }
    }

    function distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function update(dt) {
        // Stars drift even while waiting at the start menu.
        for (const star of stars) {
            star.y += star.speed * dt;

            if (star.y > HEIGHT) {
                star.y = -3;
                star.x = Math.random() * WIDTH;
            }
        }

        for (const particle of particles) {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.life -= dt;
        }

        particles = particles.filter(p => p.life > 0);

        if (state !== "running") return;

        elapsed += dt;

        // Relaxed, gradual scoring.
        score += dt * 10;

        // Keyboard and touch movement.
        if (keys.left) ship.x -= ship.speed * dt;
        if (keys.right) ship.x += ship.speed * dt;

        ship.x = Math.max(
            ship.radius + 3,
            Math.min(WIDTH - ship.radius - 3, ship.x)
        );

        // Spawn obstacles slowly at first.
        spawnTimer -= dt;

        if (spawnTimer <= 0) {
            spawnAsteroid();

            // Difficulty increases gradually, with a gentle limit.
            spawnTimer = Math.max(0.65, 1.35 - elapsed * 0.006);
        }

        // Energy orbs appear regularly.
        orbTimer -= dt;

        if (orbTimer <= 0) {
            spawnOrb();
            orbTimer = 2.7 + Math.random() * 1.6;
        }

        for (const rock of asteroids) {
            rock.y += rock.speed * dt;
            rock.x += rock.drift * dt;
            rock.rotation += rock.spin * dt;

            if (rock.x < rock.radius || rock.x > WIDTH - rock.radius) {
                rock.drift *= -1;
            }

            if (distance(ship, rock) < ship.radius + rock.radius * 0.75) {
                burst(ship.x, ship.y, "#a78bfa", 22);
                endGame();
                break;
            }
        }

        asteroids = asteroids.filter(
            rock => rock.y < HEIGHT + rock.radius + 10
        );

        for (const orb of orbs) {
            orb.y += orb.speed * dt;
            orb.phase += dt * 3;

            if (distance(ship, orb) < ship.radius + orb.radius + 3) {
                orb.collected = true;
                energy += 1;
                score += 100;
                burst(orb.x, orb.y, "#77edff", 12);
            }
        }

        orbs = orbs.filter(
            orb => !orb.collected && orb.y < HEIGHT + 25
        );

        updateHUD();
    }

    function drawBackground() {
        ctx.fillStyle = "#050713";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Subtle neon grid.
        ctx.strokeStyle = "rgba(121, 91, 255, 0.08)";
        ctx.lineWidth = 1;

        for (let x = 0; x < WIDTH; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, HEIGHT);
            ctx.stroke();
        }

        for (let y = 0; y < HEIGHT; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(WIDTH, y);
            ctx.stroke();
        }

        // Stars.
        for (const star of stars) {
            ctx.globalAlpha = star.alpha;
            ctx.fillStyle = "#c6cfff";
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        ctx.globalAlpha = 1;
    }

    function drawShip() {
        ctx.save();
        ctx.translate(ship.x, ship.y);

        // Engine glow.
        ctx.shadowColor = "#77edff";
        ctx.shadowBlur = 18;

        ctx.fillStyle = "#77edff";
        ctx.beginPath();
        ctx.moveTo(-6, 10);
        ctx.lineTo(0, 23 + Math.random() * 5);
        ctx.lineTo(6, 10);
        ctx.closePath();
        ctx.fill();

        // Ship body.
        ctx.shadowColor = "#a78bfa";
        ctx.shadowBlur = 16;

        ctx.fillStyle = "#a78bfa";
        ctx.strokeStyle = "#dcd5ff";
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(0, -19);
        ctx.lineTo(15, 13);
        ctx.lineTo(5, 9);
        ctx.lineTo(0, 14);
        ctx.lineTo(-5, 9);
        ctx.lineTo(-15, 13);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // Cockpit.
        ctx.shadowColor = "#77edff";
        ctx.fillStyle = "#77edff";
        ctx.beginPath();
        ctx.ellipse(0, 1, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawAsteroid(rock) {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        ctx.rotate(rock.rotation);

        ctx.shadowColor = "#a78bfa";
        ctx.shadowBlur = 8;

        ctx.fillStyle = "#24223f";
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 1.5;

        ctx.beginPath();

        for (let i = 0; i < rock.shape.length; i++) {
            const angle = (i / rock.shape.length) * Math.PI * 2;
            const radius = rock.radius * rock.shape[i];
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    function drawOrb(orb) {
        const pulse = 1 + Math.sin(orb.phase) * 0.15;

        ctx.save();
        ctx.translate(orb.x, orb.y);
        ctx.scale(pulse, pulse);

        ctx.shadowColor = "#77edff";
        ctx.shadowBlur = 20;

        ctx.fillStyle = "#77edff";
        ctx.beginPath();
        ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawParticles() {
        for (const particle of particles) {
            ctx.globalAlpha = Math.max(
                0,
                particle.life / particle.maxLife
            );

            ctx.fillStyle = particle.color;
            ctx.fillRect(
                particle.x,
                particle.y,
                particle.size,
                particle.size
            );
        }

        ctx.globalAlpha = 1;
    }

    function draw() {
        drawBackground();

        for (const orb of orbs) drawOrb(orb);
        for (const rock of asteroids) drawAsteroid(rock);

        drawParticles();

        if (state !== "gameover") {
            drawShip();
        }
    }

    function loop(timestamp) {
        if (!lastTime) lastTime = timestamp;

        // Prevent a large time jump after changing tabs.
        const dt = Math.min((timestamp - lastTime) / 1000, 0.04);
        lastTime = timestamp;

        update(dt);
        draw();

        requestAnimationFrame(loop);
    }

    // Start / resume button.
    actionBtn.addEventListener("click", () => {
        if (state === "paused") {
            pauseGame();
        } else {
            startGame();
        }
    });

    pauseBtn.addEventListener("click", pauseGame);

    document.getElementById("survivor-restart")
        .addEventListener("click", startGame);

    // Keyboard steering.
    window.addEventListener("keydown", event => {
        const key = event.key.toLowerCase();

        if (
            ["arrowleft", "arrowright", " "].includes(key) &&
            document.activeElement === canvas
        ) {
            event.preventDefault();
        }

        if (key === "arrowleft" || key === "a") {
            keys.left = true;
        }

        if (key === "arrowright" || key === "d") {
            keys.right = true;
        }

        if (
            key === " " &&
            state !== "menu" &&
            state !== "gameover"
        ) {
            event.preventDefault();
            pauseGame();
        }
    });

    window.addEventListener("keyup", event => {
        const key = event.key.toLowerCase();

        if (key === "arrowleft" || key === "a") {
            keys.left = false;
        }

        if (key === "arrowright" || key === "d") {
            keys.right = false;
        }
    });

    // Release controls when the window loses focus.
    window.addEventListener("blur", () => {
        keys.left = false;
        keys.right = false;
    });

    // Mobile steering: press and hold.
    function bindHoldButton(id, direction) {
        const button = document.getElementById(id);

        const release = event => {
            keys[direction] = false;

            if (event && button.hasPointerCapture?.(event.pointerId)) {
                button.releasePointerCapture(event.pointerId);
            }
        };

        button.addEventListener("pointerdown", event => {
            event.preventDefault();
            keys[direction] = true;

            if (button.setPointerCapture) {
                button.setPointerCapture(event.pointerId);
            }
        });

        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", () => {
            keys[direction] = false;
        });
    }

    bindHoldButton("survivor-left", "left");
    bindHoldButton("survivor-right", "right");

    // Fullscreen toggle.
    document.getElementById("survivor-expand")
        .addEventListener("click", async () => {
            try {
                if (!document.fullscreenElement) {
                    await document.getElementById("neon-survivor")
                        .querySelector(".survivor-machine")
                        .requestFullscreen();
                } else {
                    await document.exitFullscreen();
                }
            } catch (error) {
                console.warn("Fullscreen is unavailable in this browser.", error);
            }
        });

    // Pause automatically when the page is hidden.
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && state === "running") {
            pauseGame();
        }
    });

    // Initial state.
    updateHUD();
    overlay.style.display = "flex";
    pauseBtn.disabled = true;

    requestAnimationFrame(loop);
})();
