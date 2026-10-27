/* =========================================
   GAME 05 — CYBER MAZE
   ========================================= */

(() => {
    "use strict";

    const canvas = document.getElementById("maze-canvas");
    const overlay = document.getElementById("maze-overlay");

    // Stop safely if the game HTML has not been added.
    if (!canvas || !overlay) return;

    const ctx = canvas.getContext("2d");

    const scoreEl = document.getElementById("maze-score");
    const energyEl = document.getElementById("maze-energy");
    const timeEl = document.getElementById("maze-time");
    const overlineEl = document.getElementById("maze-overline");
    const messageEl = document.getElementById("maze-message");
    const descriptionEl = document.getElementById("maze-description");
    const actionButton = document.getElementById("maze-action");
    const pauseButton = document.getElementById("maze-pause");

    const TILE = 32;
    const COLS = 15;
    const ROWS = 17;

    const MAZE = [
        "###############",
        "#P....#.......#",
        "#.##..#.#.###.#",
        "#....##.#.....#",
        "###.#....#.##.#",
        "#...#....#....#",
        "#.#.#.##.#.#..#",
        "#.#...#....#..#",
        "#.##..#..##...#",
        "#....#....#...#",
        "#.##.#.##.#.###",
        "#....#....#...#",
        "###.##.##.##.##",
        "#.....K.......#",
        "#.##..#..##...#",
        "#...#.....#..E#",
        "###############"
    ];

    const BEST_KEY = "cyberMazeBestScoreV1";

    let grid = [];
    let player = { x: 1, y: 1 };
    let drone = { x: 13, y: 11 };
    let exit = { x: 13, y: 15 };
    let keyCollected = false;
    let score = 0;
    let energy = 0;
    let elapsed = 0;
    let startedAt = 0;
    let pausedAt = 0;
    let state = "menu";
    let bestScore = readBestScore();
    let lastTime = 0;
    let droneTimer = 0;
    let animationId = 0;
    let moveQueue = null;
    let lastPlayerMove = 0;
    let lastClockUpdate = -1;

    const stars = Array.from({ length: 65 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.3,
        phase: Math.random() * Math.PI * 2
    }));

    function readBestScore() {
        try {
            return Number(localStorage.getItem(BEST_KEY)) || 0;
        } catch {
            return 0;
        }
    }

    function saveBestScore() {
        try {
            localStorage.setItem(BEST_KEY, String(bestScore));
        } catch {
            // The game still works if browser storage is unavailable.
        }
    }

    function formatScore(value) {
        return String(Math.max(0, Math.floor(value))).padStart(6, "0");
    }

    function formatTime(seconds) {
        const total = Math.floor(seconds);
        const minutes = Math.floor(total / 60);
        const remaining = total % 60;
        return String(minutes).padStart(2, "0") + ":" +
            String(remaining).padStart(2, "0");
    }

    function updateHUD() {
        scoreEl.textContent = formatScore(score);
        energyEl.textContent = String(energy).padStart(2, "0");
        timeEl.textContent = formatTime(elapsed);
    }

    function buildMaze() {
        grid = MAZE.map(row => row.split(""));

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[y][x] === "P") {
                    player = { x, y };
                    grid[y][x] = " ";
                } else if (grid[y][x] === "K") {
                    grid[y][x] = "K";
                } else if (grid[y][x] === "E") {
                    exit = { x, y };
                }
            }
        }

        // Place the security drone in an open corridor.
        drone = { x: 13, y: 11 };
        keyCollected = false;
    }

    function showOverlay(overline, title, description, buttonText) {
        overlineEl.textContent = overline;
        messageEl.innerHTML = title;
        descriptionEl.innerHTML = description;
        actionButton.textContent = buttonText;
        overlay.hidden = false;
    }

    function hideOverlay() {
        overlay.hidden = true;
    }

    function startGame() {
        cancelAnimationFrame(animationId);

        buildMaze();
        score = 0;
        energy = 0;
        elapsed = 0;
        startedAt = performance.now();
        pausedAt = 0;
        droneTimer = 0;
        lastPlayerMove = 0;
        lastClockUpdate = -1;
        moveQueue = null;
        lastTime = performance.now();
        state = "playing";

        pauseButton.disabled = false;
        pauseButton.textContent = "PAUSE";

        updateHUD();
        hideOverlay();
        canvas.focus();
        draw(0);
        animationId = requestAnimationFrame(gameLoop);
    }

    function pauseGame() {
        if (state !== "playing") return;

        state = "paused";
        pausedAt = performance.now();
        pauseButton.textContent = "RESUME";

        showOverlay(
            "MISSION PAUSED",
            "SYSTEM<br>PAUSED",
            "Take a breather.<br>Your progress is safe.",
            "RESUME MISSION"
        );
    }

    function resumeGame() {
        if (state !== "paused") return;

        const now = performance.now();
        startedAt += now - pausedAt;
        lastTime = now;
        state = "playing";
        pauseButton.textContent = "PAUSE";

        hideOverlay();
        canvas.focus();
        animationId = requestAnimationFrame(gameLoop);
    }

    function finishGame(won) {
        if (state !== "playing") return;

        state = won ? "won" : "gameover";
        pauseButton.disabled = true;
        if (typeof window.submitArcadeScore === "function") {
        window.submitArcadeScore("Cyber Maze", Math.floor(score));
        }

        if (score > bestScore) {
            bestScore = score;
            saveBestScore();
        }

        updateHUD();

        if (won) {
            showOverlay(
                "MISSION COMPLETE",
                "MAZE<br>ESCAPED",
                `You escaped the system!<br>Final score: <strong>${formatScore(score)}</strong><br>Time: ${formatTime(elapsed)}`,
                "PLAY AGAIN"
            );
        } else {
            showOverlay(
                "SECURITY ALERT",
                "DRONE<br>DETECTED",
                `The drone caught you!<br>Final score: <strong>${formatScore(score)}</strong><br>Give it another try.`,
                "TRY AGAIN"
            );
        }

        draw(performance.now());
    }

    function isWall(x, y) {
        return (
            x < 0 || x >= COLS ||
            y < 0 || y >= ROWS ||
            grid[y][x] === "#"
        );
    }

    function movePlayer(dx, dy) {
        if (state !== "playing") return;

        const now = performance.now();

        // Prevent keys or touch buttons from moving too rapidly.
        if (now - lastPlayerMove < 105) return;
        lastPlayerMove = now;

        const nx = player.x + dx;
        const ny = player.y + dy;

        if (isWall(nx, ny)) return;

        player.x = nx;
        player.y = ny;

        const tile = grid[ny][nx];

        if (tile === ".") {
            grid[ny][nx] = " ";
            energy++;
            score += 10;
        } else if (tile === "K") {
            grid[ny][nx] = " ";
            keyCollected = true;
            score += 100;
        }

        if (player.x === exit.x && player.y === exit.y) {
            if (keyCollected) {
                score += 250;
                finishGame(true);
            }
        }

        if (
            state === "playing" &&
            player.x === drone.x &&
            player.y === drone.y
        ) {
            finishGame(false);
        }

        updateHUD();
    }

    function validDroneMoves() {
        const options = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ];

        return options.filter(move => {
            const nx = drone.x + move.x;
            const ny = drone.y + move.y;
            return !isWall(nx, ny);
        });
    }

    function moveDrone() {
        const options = validDroneMoves();
        if (!options.length) return;

        // Prefer moves that bring the drone closer to the player,
        // but sometimes patrol another corridor instead.
        options.sort((a, b) => {
            const distA =
                Math.abs(drone.x + a.x - player.x) +
                Math.abs(drone.y + a.y - player.y);
            const distB =
                Math.abs(drone.x + b.x - player.x) +
                Math.abs(drone.y + b.y - player.y);
            return distA - distB;
        });

        let chosen;

        if (Math.random() < 0.7) {
            chosen = options[0];
        } else {
            chosen = options[Math.floor(Math.random() * options.length)];
        }

        drone.x += chosen.x;
        drone.y += chosen.y;

        if (drone.x === player.x && drone.y === player.y) {
            finishGame(false);
        }
    }

    function drawBackground(time) {
        ctx.fillStyle = "#050712";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (const star of stars) {
            const glow = 0.25 +
                (Math.sin(time * 0.0015 + star.phase) + 1) * 0.3;

            ctx.globalAlpha = glow;
            ctx.fillStyle = "#a5f3fc";
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        ctx.globalAlpha = 1;
    }

    function drawMaze(time) {
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const px = x * TILE;
                const py = y * TILE;
                const tile = grid[y][x];

                if (tile === "#") {
                    ctx.fillStyle = "#15142f";
                    ctx.fillRect(px, py, TILE, TILE);

                    ctx.strokeStyle = "rgba(139, 92, 246, 0.55)";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);

                    ctx.fillStyle = "rgba(34, 211, 238, 0.08)";
                    ctx.fillRect(px + 4, py + 4, TILE - 8, 2);
                    continue;
                }

                if (tile === ".") {
                    const pulse = 0.65 +
                        Math.sin(time * 0.004 + x + y) * 0.25;

                    ctx.save();
                    ctx.globalAlpha = pulse;
                    ctx.shadowColor = "#22d3ee";
                    ctx.shadowBlur = 9;
                    ctx.fillStyle = "#67e8f9";
                    ctx.beginPath();
                    ctx.arc(
                        px + TILE / 2,
                        py + TILE / 2,
                        2.6,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                    ctx.restore();
                }

                if (tile === "K") {
                    ctx.save();
                    ctx.translate(px + TILE / 2, py + TILE / 2);
                    ctx.rotate(Math.sin(time * 0.002) * 0.18);
                    ctx.shadowColor = "#facc15";
                    ctx.shadowBlur = 15;
                    ctx.strokeStyle = "#fde047";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(-4, -4, 5, 0, Math.PI * 2);
                    ctx.moveTo(0, 0);
                    ctx.lineTo(8, 8);
                    ctx.lineTo(5, 11);
                    ctx.moveTo(5, 5);
                    ctx.lineTo(2, 8);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        // Exit tile
        const ex = exit.x * TILE;
        const ey = exit.y * TILE;

        ctx.save();
        ctx.strokeStyle = keyCollected ? "#34d399" : "#f472b6";
        ctx.lineWidth = 2;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.strokeRect(ex + 6, ey + 6, TILE - 12, TILE - 12);
        ctx.beginPath();
        ctx.moveTo(ex + 6, ey + 16);
        ctx.lineTo(ex + TILE - 6, ey + 16);
        ctx.stroke();

        ctx.fillStyle = keyCollected ? "#34d399" : "#f472b6";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("EXIT", ex + TILE / 2, ey + 28);
        ctx.restore();
    }

    function drawPlayer(time) {
        const cx = player.x * TILE + TILE / 2;
        const cy = player.y * TILE + TILE / 2;
        const pulse = 1 + Math.sin(time * 0.008) * 0.08;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);
        ctx.shadowColor = "#22d3ee";
        ctx.shadowBlur = 17;
        ctx.fillStyle = "#67e8f9";
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#083344";
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawDrone(time) {
        const cx = drone.x * TILE + TILE / 2;
        const cy = drone.y * TILE + TILE / 2;
        const pulse = 1 + Math.sin(time * 0.009) * 0.08;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);
        ctx.shadowColor = "#fb7185";
        ctx.shadowBlur = 15;
        ctx.fillStyle = "#fb7185";
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#450a0a";
        ctx.fillRect(-4, -2, 3, 3);
        ctx.fillRect(2, -2, 3, 3);
        ctx.restore();
    }

    function draw(time = 0) {
        drawBackground(time);
        drawMaze(time);

        // Only draw the drone during an active or paused game.
        if (state !== "menu") drawDrone(time);

        drawPlayer(time);
    }

    function gameLoop(now) {
        if (state !== "playing") return;

        const delta = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        elapsed = (now - startedAt) / 1000;
        droneTimer += delta;

        // Drone patrol speed: one move every 0.75 seconds.
        if (droneTimer >= 0.75) {
            droneTimer = 0;
            moveDrone();
        }

        if (Math.floor(elapsed) !== lastClockUpdate) {
            lastClockUpdate = Math.floor(elapsed);
            updateHUD();
        }

        draw(now);

        if (state === "playing") {
            animationId = requestAnimationFrame(gameLoop);
        }
    }

    function queueMove(dx, dy) {
        if (state === "menu" || state === "gameover" || state === "won") {
            return;
        }

        if (state === "paused") return;

        moveQueue = { dx, dy };
        movePlayer(dx, dy);
    }

    // Keyboard controls
    document.addEventListener("keydown", event => {
        const key = event.key.toLowerCase();

        const controls = {
            arrowup: [0, -1],
            w: [0, -1],
            arrowdown: [0, 1],
            s: [0, 1],
            arrowleft: [-1, 0],
            a: [-1, 0],
            arrowright: [1, 0],
            d: [1, 0]
        };

        if (controls[key]) {
            if (state === "playing") {
                event.preventDefault();
                queueMove(...controls[key]);
            }
        }

        if (key === " " || key === "escape") {
            if (state === "playing" || state === "paused") {
                event.preventDefault();
                state === "playing" ? pauseGame() : resumeGame();
            }
        }
    });

    // Buttons for touchscreens and mouse users
    const movementButtons = [
        ["maze-up", 0, -1],
        ["maze-down", 0, 1],
        ["maze-left", -1, 0],
        ["maze-right", 1, 0]
    ];

    movementButtons.forEach(([id, dx, dy]) => {
        const button = document.getElementById(id);

        button.addEventListener("pointerdown", event => {
            event.preventDefault();
            queueMove(dx, dy);
        });
    });

    actionButton.addEventListener("click", () => {
        if (state === "paused") {
            resumeGame();
        } else {
            startGame();
        }
    });

    pauseButton.addEventListener("click", () => {
        state === "playing" ? pauseGame() : resumeGame();
    });

    document.getElementById("maze-restart").addEventListener("click", startGame);

    document.getElementById("maze-expand").addEventListener("click", async () => {
        const machine = document.querySelector(".cyber-maze-machine");

        try {
            if (!document.fullscreenElement) {
                await machine.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch {
            // Fullscreen may be unavailable in some browsers or local previews.
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden && state === "playing") {
            pauseGame();
        }
    });

    // Initial screen
    buildMaze();
    updateHUD();
    draw(0);
})();
