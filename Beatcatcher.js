
/* =========================================
   GAME 02 — BEAT CATCHER
   Standalone rhythm arcade engine
========================================= */

(() => {
    "use strict";

    const canvas = document.getElementById("beat-canvas");
    const screen = document.getElementById("beat-screen");
    const machine = document.querySelector(".beat-machine");

    if (!canvas || !screen || !machine) return;

    const ctx = canvas.getContext("2d");

    const overlay = document.getElementById("beat-overlay");
    const overline = document.getElementById("beat-overline");
    const message = document.getElementById("beat-message");
    const description = document.getElementById("beat-description");
    const actionButton = document.getElementById("beat-action");

    const scoreDisplay = document.getElementById("beat-score");
    const comboDisplay = document.getElementById("beat-combo");
    const missedDisplay = document.getElementById("beat-missed");
    const bestDisplay = document.getElementById("beat-best");

    const pauseButton = document.getElementById("beat-pause");
    const restartButton = document.getElementById("beat-restart");
    const expandButton = document.getElementById("beat-expand");

    const laneButtons = [
        ...document.querySelectorAll(".beat-lane-button")
    ];

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const LANE_COUNT = 4;
    const LANE_WIDTH = WIDTH / LANE_COUNT;
    const HIT_LINE = 500;
    const HIT_WINDOW = 42;
    const MAX_MISSES = 20;

    const laneColors = [
        "#b78aff",
        "#73e8ff",
        "#ff82e8",
        "#8bfff0"
    ];

    const keys = {
        d: 0,
        f: 1,
        j: 2,
        k: 3
    };

    let notes = [];
    let particles = [];

    let score = 0;
    let combo = 0;
    let missed = 0;
    let best = loadBest();

    let running = false;
    let paused = false;
    let gameOver = false;

    let spawnTimer = 0;
    let lastTime = 0;
    let animationId = null;
    let lastLane = -1;

    let feedbackText = "";
    let feedbackColor = "#ffffff";
    let feedbackTimer = 0;

    const random = (min, max) =>
        Math.random() * (max - min) + min;

    function loadBest() {
        try {
            return Number(localStorage.getItem("beatCatcherBest")) || 0;
        } catch {
            return 0;
        }
    }

    function saveBest() {
        try {
            localStorage.setItem("beatCatcherBest", String(best));
        } catch {
            // The game still works if browser storage is unavailable.
        }
    }

    function formatScore(value) {
        return String(value).padStart(6, "0");
    }

    function updateHUD() {
        scoreDisplay.textContent = formatScore(score);
        comboDisplay.textContent = `${combo}x`;
        missedDisplay.textContent = String(missed).padStart(2, "0");
        bestDisplay.textContent = formatScore(best);
    }

    function showOverlay(title, heading, text, buttonText) {
        overline.textContent = title;
        message.innerHTML = heading;
        description.innerHTML = text;
        actionButton.textContent = buttonText;
        overlay.hidden = false;
    }

    function hideOverlay() {
        overlay.hidden = true;
    }

    function setFeedback(text, color) {
        feedbackText = text;
        feedbackColor = color;
        feedbackTimer = 0.45;
    }

    function createNote() {
        let lane = Math.floor(Math.random() * LANE_COUNT);

        // Avoid too many identical consecutive lanes.
        if (lane === lastLane && Math.random() < 0.7) {
            lane = (lane + 1 + Math.floor(Math.random() * 3)) % LANE_COUNT;
        }

        lastLane = lane;

        notes.push({
            lane,
            y: -24,
            speed: random(185, 225),
            caught: false
        });
    }

    function createParticles(x, y, color) {
        for (let i = 0; i < 12; i++) {
            particles.push({
                x,
                y,
                vx: random(-110, 110),
                vy: random(-150, 30),
                life: random(0.25, 0.55),
                maxLife: 0.55,
                color
            });
        }
    }

    function drawBackground() {
        const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, "#100923");
        gradient.addColorStop(0.55, "#0a1029");
        gradient.addColorStop(1, "#130923");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Subtle horizontal neon grid.
        ctx.strokeStyle = "rgba(140, 105, 255, 0.09)";
        ctx.lineWidth = 1;

        for (let y = 0; y < HEIGHT; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(WIDTH, y);
            ctx.stroke();
        }

        // Lane backgrounds and dividers.
        for (let lane = 0; lane < LANE_COUNT; lane++) {
            const x = lane * LANE_WIDTH;

            ctx.fillStyle = lane % 2 === 0
                ? "rgba(157, 100, 255, 0.045)"
                : "rgba(77, 220, 255, 0.035)";

            ctx.fillRect(x, 0, LANE_WIDTH, HEIGHT);

            if (lane > 0) {
                ctx.strokeStyle = "rgba(160, 130, 255, 0.24)";
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, HEIGHT);
                ctx.stroke();
            }
        }

        // Lane key labels at the top.
        const labels = ["D", "F", "J", "K"];

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 18px monospace";

        labels.forEach((label, lane) => {
            const x = lane * LANE_WIDTH + LANE_WIDTH / 2;

            ctx.fillStyle = laneColors[lane];
            ctx.shadowColor = laneColors[lane];
            ctx.shadowBlur = 12;
            ctx.fillText(label, x, 32);
        });

        ctx.shadowBlur = 0;
    }

    function drawTargetLine() {
        // Target line glow.
        ctx.save();
        ctx.shadowColor = "#72f8ff";
        ctx.shadowBlur = 14;
        ctx.strokeStyle = "#72f8ff";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(8, HIT_LINE);
        ctx.lineTo(WIDTH - 8, HIT_LINE);
        ctx.stroke();
        ctx.restore();

        // Four target rings.
        for (let lane = 0; lane < LANE_COUNT; lane++) {
            const x = lane * LANE_WIDTH + LANE_WIDTH / 2;

            ctx.beginPath();
            ctx.arc(x, HIT_LINE, 23, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(105, 232, 255, 0.08)";
            ctx.fill();

            ctx.strokeStyle = laneColors[lane];
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    function drawNote(note) {
        const x = note.lane * LANE_WIDTH + LANE_WIDTH / 2;
        const y = note.y;
        const color = laneColors[note.lane];

        ctx.save();

        ctx.shadowColor = color;
        ctx.shadowBlur = 18;

        // Glowing note body.
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x - 20, y - 11, 40, 22, 7);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#151029";
        ctx.fillRect(x - 12, y - 3, 24, 6);

        // Small note symbol.
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♪", x, y - 1);

        ctx.restore();
    }

    function drawParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 180 * dt;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 4, 4);
        }

        ctx.globalAlpha = 1;
    }

    function drawFeedback(dt) {
        if (feedbackTimer <= 0) return;

        feedbackTimer -= dt;

        ctx.save();
        ctx.globalAlpha = Math.min(1, feedbackTimer * 3);
        ctx.textAlign = "center";
        ctx.font = "bold 22px monospace";
        ctx.fillStyle = feedbackColor;
        ctx.shadowColor = feedbackColor;
        ctx.shadowBlur = 12;
        ctx.fillText(feedbackText, WIDTH / 2, HIT_LINE - 48);
        ctx.restore();
    }

    function draw(dt = 0) {
        drawBackground();

        notes.forEach(drawNote);
        drawTargetLine();
        drawParticles(dt);
        drawFeedback(dt);
    }

    function hitLane(lane) {
        if (!running || paused || gameOver) return;

        const possibleNotes = notes
            .filter(note => note.lane === lane)
            .sort((a, b) => Math.abs(a.y - HIT_LINE) - Math.abs(b.y - HIT_LINE));

        const note = possibleNotes[0];

        if (!note || Math.abs(note.y - HIT_LINE) > HIT_WINDOW) {
            combo = 0;
            setFeedback("MISS!", "#ff83b7");
            updateHUD();
            flashLane(lane, false);
            return;
        }

        const distance = Math.abs(note.y - HIT_LINE);

        let points = 100;
        let result = "GOOD!";
        let resultColor = laneColors[lane];

        if (distance <= 14) {
            points = 150;
            result = "PERFECT!";
            resultColor = "#8bfff0";
        } else if (distance <= 28) {
            points = 125;
            result = "GREAT!";
            resultColor = "#9deaff";
        }

        notes.splice(notes.indexOf(note), 1);

        combo++;
        score += points + Math.min(combo - 1, 50) * 2;

        if (score > best) {
            best = score;
            saveBest();
        }

        const x = lane * LANE_WIDTH + LANE_WIDTH / 2;
        createParticles(x, HIT_LINE, resultColor);
        setFeedback(result, resultColor);
        flashLane(lane, true);
        updateHUD();
    }

    function flashLane(lane, successful) {
        const button = laneButtons[lane];
        if (!button) return;

        button.classList.toggle("hit", successful);

        if (successful) {
            setTimeout(() => button.classList.remove("hit"), 100);
        }
    }

    function finishGame() {
        running = false;
        paused = false;
        gameOver = true;

 if (typeof window.submitArcadeScore === "function") {
        window.submitArcadeScore("Beat Catcher", score);
    }

        showOverlay(
            "SESSION COMPLETE",
            "GAME<br>OVER",
            `Final score: <strong>${score}</strong><br>
             Best score: <strong>${best}</strong><br>
             Missed notes: <strong>${missed}</strong>`,
            "PLAY AGAIN"
        );

        draw(0);
    }

    function update(dt) {
        if (!running || paused || gameOver) return;

        spawnTimer += dt;

        // The rhythm gradually becomes a little quicker.
        const spawnInterval = Math.max(0.43, 0.72 - score / 40000);

        if (spawnTimer >= spawnInterval) {
            spawnTimer = 0;
            createNote();
        }

        for (let i = notes.length - 1; i >= 0; i--) {
            const note = notes[i];
            note.y += note.speed * dt;

            if (note.y > HIT_LINE + HIT_WINDOW) {
                notes.splice(i, 1);
                missed++;
                combo = 0;
                setFeedback("TOO LATE!", "#ff83b7");
                updateHUD();

                if (missed >= MAX_MISSES) {
                    finishGame();
                    return;
                }
            }
        }
    }

    function loop(timestamp) {
        animationId = null;

        const dt = lastTime
            ? Math.min((timestamp - lastTime) / 1000, 0.04)
            : 0;

        lastTime = timestamp;

        update(dt);
        draw(dt);

        if (running && !paused && !gameOver) {
            animationId = requestAnimationFrame(loop);
        }
    }

    function startLoop() {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        lastTime = 0;
        animationId = requestAnimationFrame(loop);
    }

    function startGame() {
        if (gameOver) resetGame();

        running = true;
        paused = false;
        gameOver = false;

        hideOverlay();
        pauseButton.disabled = false;
        pauseButton.textContent = "PAUSE";

        canvas.focus({ preventScroll: true });
        startLoop();
    }

    function pauseGame() {
        if (!running || gameOver) return;

        paused = !paused;

        if (paused) {
            if (animationId !== null) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }

            pauseButton.textContent = "RESUME";

            showOverlay(
                "SESSION PAUSED",
                "TAKE A<br>BREATHER",
                "Your score is safe.<br>Ready to catch the next beat?",
                "RESUME GAME"
            );

            draw(0);
        } else {
            hideOverlay();
            pauseButton.textContent = "PAUSE";
            startLoop();
        }
    }

    function resetGame() {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        notes = [];
        particles = [];
        score = 0;
        combo = 0;
        missed = 0;
        spawnTimer = 0;
        lastTime = 0;
        lastLane = -1;
        feedbackTimer = 0;

        running = false;
        paused = false;
        gameOver = false;

        pauseButton.disabled = true;
        pauseButton.textContent = "PAUSE";

        updateHUD();

        showOverlay(
            "READY PLAYER 02",
            "FEEL<br>THE BEAT",
            "Catch notes at the neon line.<br>Use D, F, J and K.<br>Stay in rhythm!",
            "START BEAT"
        );

        draw(0);
    }

 
    // Keyboard controls.
    document.addEventListener("keydown", event => {

        // Ignore keyboard input when the game is inactive or paused.
        if (!running || paused || gameOver) return;

        const key = event.key.toLowerCase();

        if (key === "escape" && document.fullscreenElement === machine) {
            return; // Let the browser handle Escape.
        }

        if (keys[key] !== undefined) {
            event.preventDefault();

            if (!event.repeat) {
                hitLane(keys[key]);
            }
        }

        if (key === " " && document.activeElement !== actionButton) {
            if (document.activeElement === pauseButton) return;
            if (running && !gameOver) {
                event.preventDefault();
                pauseGame();
            }
        }
    });


    // On-screen lane controls.
    laneButtons.forEach(button => {
        const lane = Number(button.dataset.lane);

        button.addEventListener("pointerdown", event => {
            event.preventDefault();
            hitLane(lane);
        });
    });

    // Start / resume button.
    actionButton.addEventListener("click", () => {
        if (paused) {
            pauseGame();
        } else {
            startGame();
        }
    });

    // Pause button.
    pauseButton.addEventListener("click", pauseGame);

    // Restart returns to the welcome screen.
    restartButton.addEventListener("click", resetGame);

    // Fullscreen expand / exit.
    expandButton.addEventListener("click", async () => {
        try {
            if (document.fullscreenElement === machine) {
                await document.exitFullscreen();
            } else if (!document.fullscreenElement) {
                await machine.requestFullscreen();
            }
        } catch (error) {
            console.error("Beat Catcher fullscreen error:", error);
        }
    });

    document.addEventListener("fullscreenchange", () => {
        const isFullscreen = document.fullscreenElement === machine;

        expandButton.textContent = isFullscreen
            ? "⛶ EXIT FULLSCREEN"
            : "⛶ EXPAND GAME";
    });

    // Initial screen.
    updateHUD();
    draw(0);
})();

    // =====================================
    // THREE-TRACK MUSIC PLAYER
    // =====================================

    const audio = document.getElementById("beat-audio");
    const trackStatus = document.getElementById("beat-track-status");
    const musicToggle = document.getElementById("beat-music-toggle");
    const volumeSlider = document.getElementById("beat-volume");
    const trackButtons = [
        ...document.querySelectorAll(".beat-track")
    ];

    // Change these titles and file paths to your own tracks.
    const musicTracks = [
        {
            title: "Track One",
            src: "music/track1.mp3"
        },
        {
            title: "Track Two",
            src: "music/track2.mp3"
        },
        {
            title: "Track Three",
            src: "music/track3.mp3"
        }
    ];

    let selectedTrack = 0;

    audio.volume = Number(volumeSlider.value) / 100;

    function updateTrackButtons() {
        trackButtons.forEach((button, index) => {
            const selected = index === selectedTrack;
            button.classList.toggle("active", selected);

            const icon = button.querySelector(".beat-track-icon");
            if (icon) {
                icon.textContent =
                    selected && !audio.paused ? "♫" : "▶";
            }

            button.setAttribute("aria-pressed", String(selected));
        });
    }

    function selectTrack(index) {
        if (index < 0 || index >= musicTracks.length) return;

        selectedTrack = index;

        audio.pause();
        audio.src = musicTracks[index].src;
        audio.load();

        trackStatus.textContent = musicTracks[index].title;
        musicToggle.textContent = "▶ PLAY MUSIC";

        updateTrackButtons();
    }

    async function playSelectedTrack() {
        try {
            if (!audio.src) {
                selectTrack(selectedTrack);
            }

            await audio.play();
            musicToggle.textContent = "Ⅱ PAUSE MUSIC";
            trackStatus.textContent =
                "Playing: " + musicTracks[selectedTrack].title;

            updateTrackButtons();
        } catch (error) {
            trackStatus.textContent =
                "Couldn't play this file — check its path and format.";
            musicToggle.textContent = "▶ TRY AGAIN";
            console.error("Beat Catcher audio error:", error);
        }
    }

    trackButtons.forEach((button, index) => {
        button.addEventListener("click", async () => {
            selectTrack(index);
            await playSelectedTrack();
        });
    });

    musicToggle.addEventListener("click", async () => {
        if (!audio.src) {
            await playSelectedTrack();
        } else if (audio.paused) {
            await playSelectedTrack();
        } else {
            audio.pause();
            musicToggle.textContent = "▶ PLAY MUSIC";
            trackStatus.textContent =
                "Paused: " + musicTracks[selectedTrack].title;
            updateTrackButtons();
        }
    });

    volumeSlider.addEventListener("input", () => {
        audio.volume = Number(volumeSlider.value) / 100;
    });

    audio.addEventListener("ended", () => {
        musicToggle.textContent = "▶ PLAY MUSIC";
        trackStatus.textContent =
            "Finished: " + musicTracks[selectedTrack].title;
        updateTrackButtons();
    });

    audio.addEventListener("error", () => {
        if (audio.src) {
            trackStatus.textContent =
                "Audio unavailable — check your music file.";
        }
    });

    // Load the first track without autoplaying.
    selectTrack(0);
