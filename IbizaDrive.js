
/* =========================================
   IBIZA NIGHT DRIVE
   Arcade Build 01
========================================= */

(() => {
    "use strict";

    const canvas = document.getElementById("drive-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const overlay = document.getElementById("drive-overlay");
    const actionBtn = document.getElementById("drive-action");
    const pauseBtn = document.getElementById("drive-pause");

    const scoreEl = document.getElementById("drive-score");
    const notesEl = document.getElementById("drive-notes");
    const bestEl = document.getElementById("drive-best");

    const launchBtn = document.getElementById("launch-drive");

    const W = canvas.width;
    const H = canvas.height;

    const LANES = 3;
    const ROAD_X = 60;
    const ROAD_W = W - ROAD_X * 2;
    const LANE_W = ROAD_W / LANES;

    const PLAYER_Y = H - 115;
    const PLAYER_W = 42;
    const PLAYER_H = 66;

    const keys = new Set();

    let state = "ready";
    let playerLane = 1;

    let obstacles = [];
    let notes = [];

    let score = 0;
    let collected = 0;

    let elapsed = 0;
    let spawnTimer = 0;
    let noteTimer = 0;

    let roadOffset = 0;
    let lastTime = 0;
    let animationId = null;

    let best = 0;

    try {
        best = Number(
            localStorage.getItem("ibizaDriveBest") || 0
        );

        if (!Number.isFinite(best) || best < 0) best = 0;
    } catch {
        best = 0;
    }

    bestEl.textContent = formatScore(best);

    function formatScore(value) {
        return String(Math.floor(value)).padStart(6, "0");
    }

    function updateHUD() {
        scoreEl.textContent = formatScore(score);
        notesEl.textContent = String(collected).padStart(2, "0");
        bestEl.textContent = formatScore(best);
    }

    function playerX() {
        return ROAD_X + playerLane * LANE_W
            + (LANE_W - PLAYER_W) / 2;
    }

    function showOverlay(overline, title, description, button) {
        overlay.hidden = false;

        document.getElementById("drive-overline").textContent =
            overline;

        document.getElementById("drive-message").innerHTML =
            title;

        document.getElementById("drive-description").innerHTML =
            description;

        actionBtn.textContent = button;
    }

    function hideOverlay() {
        overlay.hidden = true;
    }

    /* -------------------------------------
       BACKGROUND
    ------------------------------------- */

    function drawBackground() {
        ctx.fillStyle = "#090711";
        ctx.fillRect(0, 0, W, H);

        // Night sky glow
        const glow = ctx.createLinearGradient(0, 0, 0, H);

        glow.addColorStop(0, "#211139");
        glow.addColorStop(0.42, "#100D20");
        glow.addColorStop(1, "#080810");

        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        // Pixel city silhouettes
        drawCity();

        // Road
        ctx.fillStyle = "#171522";
        ctx.fillRect(ROAD_X, 0, ROAD_W, H);

        // Road edges
        ctx.fillStyle = "#AA80FF";
        ctx.fillRect(ROAD_X - 3, 0, 3, H);
        ctx.fillRect(ROAD_X + ROAD_W, 0, 3, H);

        // Neon roadside lights
        for (let y = -20; y < H + 30; y += 70) {
            const offset = (roadOffset * 0.6) % 70;
            const lightY = y + offset;

            ctx.fillStyle = "#A27AFF";
            ctx.fillRect(ROAD_X - 12, lightY, 5, 14);
            ctx.fillRect(ROAD_X + ROAD_W + 7, lightY, 5, 14);
        }

        // Lane dividers
        ctx.fillStyle = "#62537A";

        for (let lane = 1; lane < LANES; lane++) {
            const x = ROAD_X + lane * LANE_W - 2;

            for (let y = -70; y < H + 70; y += 100) {
                const offset = roadOffset % 100;

                ctx.fillRect(x, y + offset, 4, 48);
            }
        }
    }

    function drawCity() {
        // Buildings on both sides
        for (let i = 0; i < 10; i++) {
            const y = i * 75 - (roadOffset * 0.25 % 75);
            const height = 35 + (i % 3) * 15;

            ctx.fillStyle = i % 2 === 0
                ? "#191329"
                : "#211633";

            ctx.fillRect(0, y, ROAD_X - 8, height);
            ctx.fillRect(
                ROAD_X + ROAD_W + 8,
                y,
                ROAD_X - 8,
                height
            );

            // Pixel windows
            ctx.fillStyle = i % 2 === 0
                ? "#8F6BCB"
                : "#36C7DB";

            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 2; col++) {
                    const wx = 8 + col * 20;
                    const wy = y + 8 + row * 15;

                    ctx.fillRect(wx, wy, 5, 5);

                    ctx.fillRect(
                        ROAD_X + ROAD_W + 16 + col * 20,
                        wy,
                        5,
                        5
                    );
                }
            }
        }
    }

    /* -------------------------------------
       PIXEL PLAYER CAR
    ------------------------------------- */

    function drawPlayer() {
        const x = playerX();
        const y = PLAYER_Y;

        // Car shadow
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(x - 3, y + 5, PLAYER_W + 6, PLAYER_H);

        // Wheels
        ctx.fillStyle = "#08080D";
        ctx.fillRect(x - 4, y + 12, 8, 17);
        ctx.fillRect(x + PLAYER_W - 4, y + 12, 8, 17);
        ctx.fillRect(x - 4, y + 40, 8, 17);
        ctx.fillRect(x + PLAYER_W - 4, y + 40, 8, 17);

        // Body
        ctx.fillStyle = "#A91536";
        ctx.fillRect(x + 4, y + 3, PLAYER_W - 8, PLAYER_H - 5);

        ctx.fillStyle = "#F0445C";
        ctx.fillRect(x + 7, y + 5, PLAYER_W - 14, PLAYER_H - 13);

        // Bonnet
        ctx.fillStyle = "#FF667A";
        ctx.fillRect(x + 10, y + 8, PLAYER_W - 20, 13);

        // Windscreen
        ctx.fillStyle = "#8AEFFF";
        ctx.fillRect(x + 10, y + 25, PLAYER_W - 20, 13);

        ctx.fillStyle = "#29435A";
        ctx.fillRect(x + 13, y + 27, PLAYER_W - 26, 8);

        // Rear window
        ctx.fillStyle = "#365269";
        ctx.fillRect(x + 10, y + 44, PLAYER_W - 20, 9);

        // Roof highlight
        ctx.fillStyle = "#FF8B9B";
        ctx.fillRect(x + 14, y + 41, PLAYER_W - 28, 2);

        // Rear lights
        ctx.fillStyle = "#FF304F";
        ctx.fillRect(x + 7, y + PLAYER_H - 8, 7, 4);
        ctx.fillRect(x + PLAYER_W - 14, y + PLAYER_H - 8, 7, 4);

        // Headlights
        ctx.fillStyle = "#FFE6A0";
        ctx.fillRect(x + 7, y + 4, 6, 4);
        ctx.fillRect(x + PLAYER_W - 13, y + 4, 6, 4);
    }

    /* -------------------------------------
       OBSTACLES
    ------------------------------------- */

    function spawnObstacle() {
        const lane = Math.floor(Math.random() * LANES);

        obstacles.push({
            lane,
            x: ROAD_X + lane * LANE_W + 14,
            y: -70,
            w: LANE_W - 28,
            h: 42,
            speed: 0
        });
    }

    function drawObstacle(obstacle) {
        const x = obstacle.x;
        const y = obstacle.y;

        // Purple barrier
        ctx.fillStyle = "#2D1745";
        ctx.fillRect(x, y, obstacle.w, obstacle.h);

        ctx.fillStyle = "#A989EC";
        ctx.fillRect(x, y + 5, obstacle.w, 8);

        ctx.fillStyle = "#E7D7FF";
        ctx.fillRect(x + 5, y + 19, obstacle.w - 10, 5);

        ctx.fillStyle = "#6E44A5";
        ctx.fillRect(x, y + obstacle.h - 7, obstacle.w, 7);
    }

    /* -------------------------------------
       MUSIC NOTES
    ------------------------------------- */

    function spawnNote() {
        const lane = Math.floor(Math.random() * LANES);

        notes.push({
            lane,
            x: ROAD_X + lane * LANE_W + LANE_W / 2,
            y: -20,
            size: 18
        });
    }

    function drawNote(note) {
        const x = Math.round(note.x);
        const y = Math.round(note.y);

        // Pixel music note
        ctx.fillStyle = "#C5A3FF";

        ctx.fillRect(x, y, 5, 22);
        ctx.fillRect(x + 5, y, 13, 5);
        ctx.fillRect(x + 13, y, 5, 12);
        ctx.fillRect(x - 4, y + 16, 9, 6);
        ctx.fillRect(x + 8, y + 11, 9, 6);

        // Tiny glow pixels
        ctx.fillStyle = "#75E8FF";
        ctx.fillRect(x - 6, y + 4, 3, 3);
    }

    /* -------------------------------------
       GAME MOVEMENT
    ------------------------------------- */

    function moveLeft() {
        if (state !== "playing") return;
        playerLane = Math.max(0, playerLane - 1);
    }

    function moveRight() {
        if (state !== "playing") return;
        playerLane = Math.min(LANES - 1, playerLane + 1);
    }

    function handleKeyDown(event) {
        const key = event.key.toLowerCase();

        if (
            ["arrowleft", "arrowright", " ", "a", "d"]
                .includes(key)
        ) {
            event.preventDefault();
        }

        if (keys.has(key)) return;
        keys.add(key);

        if (key === "arrowleft" || key === "a") {
            moveLeft();
        }

        if (key === "arrowright" || key === "d") {
            moveRight();
        }

        if (key === "escape" && state === "playing") {
            pauseGame();
        }
    }

    function handleKeyUp(event) {
        keys.delete(event.key.toLowerCase());
    }

    /* -------------------------------------
       COLLISIONS
    ------------------------------------- */

    function overlaps(a, b) {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    function checkCollisions() {
        const player = {
            x: playerX() + 7,
            y: PLAYER_Y + 8,
            w: PLAYER_W - 14,
            h: PLAYER_H - 16
        };

        for (const obstacle of obstacles) {
            const hitbox = {
                x: obstacle.x + 3,
                y: obstacle.y + 3,
                w: obstacle.w - 6,
                h: obstacle.h - 6
            };

            if (overlaps(player, hitbox)) {
                endGame();
                return;
            }
        }

        notes = notes.filter(note => {
            const hitbox = {
                x: note.x - 4,
                y: note.y,
                w: 24,
                h: 25
            };

            if (overlaps(player, hitbox)) {
                collected++;
                score += 100;
                return false;
            }

            return true;
        });
    }

    /* -------------------------------------
       UPDATE
    ------------------------------------- */

    function update(dt) {
        elapsed += dt;

        const difficulty = Math.min(elapsed * 1.5, 180);

        const speed = 230 + difficulty;

        roadOffset += speed * dt;

        // Time survived gives points
        score += dt * 10;

        spawnTimer -= dt;
        noteTimer -= dt;

        const obstacleInterval = Math.max(
            0.65,
            1.15 - elapsed * 0.002
        );

        if (spawnTimer <= 0) {
            spawnObstacle();
            spawnTimer = obstacleInterval;
        }

        if (noteTimer <= 0) {
            spawnNote();
            noteTimer = 1.7 + Math.random() * 1.3;
        }

        obstacles.forEach(obstacle => {
            obstacle.speed = speed;
            obstacle.y += obstacle.speed * dt;
        });

        notes.forEach(note => {
            note.y += speed * dt;
        });

        obstacles = obstacles.filter(
            obstacle => obstacle.y < H + 80
        );

        notes = notes.filter(note => note.y < H + 40);

        checkCollisions();

        updateHUD();
    }

    /* -------------------------------------
       DRAW
    ------------------------------------- */

    function draw() {
        drawBackground();

        notes.forEach(drawNote);
        obstacles.forEach(drawObstacle);

        drawPlayer();
    }

    /* -------------------------------------
       GAME LOOP
    ------------------------------------- */

    function loop(timestamp) {
        if (state !== "playing") {
            animationId = null;
            return;
        }

        const dt = Math.min(
            (timestamp - lastTime) / 1000,
            0.033
        );

        lastTime = timestamp;

        update(dt);
        draw();

        if (state === "playing") {
            animationId = requestAnimationFrame(loop);
        }
    }

    /* -------------------------------------
       START / PAUSE / RESTART
    ------------------------------------- */

    function startGame() {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        keys.clear();

        playerLane = 1;
        obstacles = [];
        notes = [];

        score = 0;
        collected = 0;

        elapsed = 0;
        spawnTimer = 0.8;
        noteTimer = 1.3;

        roadOffset = 0;
        lastTime = performance.now();

        state = "playing";

        pauseBtn.disabled = false;
        pauseBtn.textContent = "PAUSE";

        hideOverlay();
        updateHUD();
        draw();

        canvas.focus({ preventScroll: true });

        animationId = requestAnimationFrame(loop);
    }

    function pauseGame() {
        if (state !== "playing") return;

        state = "paused";
        keys.clear();

        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        pauseBtn.textContent = "RESUME";

        showOverlay(
            "PAUSED",
            "PIT STOP",
            "Take a break.<br>Your drive is waiting.",
            "RESUME DRIVE"
        );
    }

    function resumeGame() {
        if (state !== "paused") return;

        state = "playing";
        keys.clear();

        hideOverlay();

        pauseBtn.textContent = "PAUSE";

        lastTime = performance.now();
        animationId = requestAnimationFrame(loop);
    }

    function endGame() {
        if (state !== "playing") return;

        state = "over";
        keys.clear();

        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        pauseBtn.textContent = "PAUSE";
        pauseBtn.disabled = true;

        score = Math.floor(score);
        if (typeof window.submitArcadeScore === "function") {
    window.submitArcadeScore("Ibiza Night Drive", score);
}

        if (score > best) {
            best = score;

            try {
                localStorage.setItem(
                    "ibizaDriveBest",
                    String(best)
                );
            } catch {
                // Game remains playable without saved records.
            }
        }

        updateHUD();

        showOverlay(
            "DRIVE COMPLETE",
            "GAME<br>OVER",
            `SCORE: ${formatScore(score)}<br>
             NOTES: ${collected}<br>
             BEST: ${formatScore(best)}`,
            "DRIVE AGAIN"
        );
    }

    /* -------------------------------------
       BUTTONS
    ------------------------------------- */

    actionBtn.addEventListener("click", () => {
        if (state === "paused") {
            resumeGame();
        } else {
            startGame();
        }
    });

    pauseBtn.addEventListener("click", () => {
        if (state === "playing") {
            pauseGame();
        } else if (state === "paused") {
            resumeGame();
        }
    });

    launchBtn?.addEventListener("click", () => {
        document.getElementById("ibiza-game").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        if (state === "ready" || state === "over") {
            showOverlay(
                "WELCOME PLAYER 01",
                "NIGHT<br>DRIVE",
                "Dodge obstacles.<br>Collect music notes.<br>Own the highway.",
                "START ENGINE"
            );
        }
    });

    /* Keyboard controls */

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    /* Mobile steering */

    function bindSteering(id, action) {
        const button = document.getElementById(id);

        button.addEventListener("pointerdown", event => {
            event.preventDefault();
            action();
        });
    }

    bindSteering("drive-left", moveLeft);
    bindSteering("drive-right", moveRight);

    /* Prevent stuck keys if window loses focus */

    window.addEventListener("blur", () => {
        keys.clear();
    });

    /* Handle switching tabs */

    document.addEventListener("visibilitychange", () => {
        if (document.hidden && state === "playing") {
            pauseGame();
        }
    });

    /* If the game is running and player scrolls away,
       don't automatically interrupt their game. */

    /* Initial screen */

    draw();
    updateHUD();

    pauseBtn.disabled = true;

})();

/* =========================================
   EXPAND / EXIT FULLSCREEN
========================================= */

const expandButton = document.getElementById("drive-expand");
const gameMachine = document.querySelector(".drive-machine");

if (expandButton && gameMachine) {
    expandButton.addEventListener("click", async () => {
        try {
            if (!document.fullscreenElement) {
                await gameMachine.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error("Fullscreen could not be opened:", error);
        }
    });

    document.addEventListener("fullscreenchange", () => {
        const isFullscreen = document.fullscreenElement === gameMachine;

        expandButton.textContent = isFullscreen
            ? "⛶ EXIT FULLSCREEN"
            : "⛶ EXPAND GAME";
    });
}
