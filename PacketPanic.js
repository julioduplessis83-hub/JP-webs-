
/* =========================================
   GAME 03 — PACKET PANIC
   Network puzzle arcade
========================================= */

(() => {
    "use strict";

    const machine = document.querySelector(".packet-machine");
    const board = document.getElementById("packet-board");

    if (!machine || !board) return;

    const wireSvg = document.getElementById("packet-wires");
    const linksContainer = document.getElementById("packet-links");
    const nodesContainer = document.getElementById("packet-nodes");

    const scoreDisplay = document.getElementById("packet-score");
    const livesDisplay = document.getElementById("packet-lives");
    const timeDisplay = document.getElementById("packet-time");
    const streakDisplay = document.getElementById("packet-streak");
    const levelDisplay = document.getElementById("packet-level");

    const titleDisplay = document.getElementById("packet-mission-title");
    const instructionsDisplay = document.getElementById("packet-instructions");
    const feedback = document.getElementById("packet-feedback");

    const testButton = document.getElementById("packet-test");
    const resetButton = document.getElementById("packet-reset");
    const pauseButton = document.getElementById("packet-pause");
    const expandButton = document.getElementById("packet-expand");

    const overlay = document.getElementById("packet-overlay");
    const overline = document.getElementById("packet-overline");
    const message = document.getElementById("packet-message");
    const description = document.getElementById("packet-description");
    const actionButton = document.getElementById("packet-action");

    const timeLimit = 60;
    const maxLives = 3;

    // Node positions use a 600 x 320 design grid.
    // x/y determine where each node appears.

    const levels = [
        {
            title: "The First Connection",
            nodes: [
                { id: "S", name: "SOURCE", icon: "💻", x: 65, y: 160, type: "source" },
                { id: "R1", name: "ROUTER 1", icon: "◈", x: 220, y: 75 },
                { id: "R2", name: "ROUTER 2", icon: "◈", x: 220, y: 245 },
                { id: "R3", name: "ROUTER 3", icon: "◈", x: 390, y: 75 },
                { id: "D", name: "SERVER", icon: "▤", x: 535, y: 160, type: "server" }
            ],
            edges: [
                ["S", "R1"],
                ["S", "R2"],
                ["R1", "R3"],
                ["R2", "R3"],
                ["R3", "D"],
                ["R1", "D"]
            ],
            solution: [0, 2, 4]
        },
        {
            title: "The Detour",
            nodes: [
                { id: "S", name: "SOURCE", icon: "💻", x: 55, y: 160, type: "source" },
                { id: "R1", name: "ROUTER 1", icon: "◈", x: 180, y: 65 },
                { id: "R2", name: "ROUTER 2", icon: "◈", x: 180, y: 255 },
                { id: "R3", name: "ROUTER 3", icon: "◈", x: 340, y: 65 },
                { id: "R4", name: "ROUTER 4", icon: "◈", x: 340, y: 255 },
                { id: "D", name: "SERVER", icon: "▤", x: 540, y: 160, type: "server" }
            ],
            edges: [
                ["S", "R1"],
                ["S", "R2"],
                ["R1", "R3"],
                ["R2", "R4"],
                ["R3", "R4"],
                ["R3", "D"],
                ["R4", "D"],
                ["R1", "R4"]
            ],
            solution: [1, 3, 6]
        },
        {
            title: "Core Network",
            nodes: [
                { id: "S", name: "SOURCE", icon: "💻", x: 55, y: 160, type: "source" },
                { id: "R1", name: "ROUTER 1", icon: "◈", x: 175, y: 55 },
                { id: "R2", name: "ROUTER 2", icon: "◈", x: 175, y: 265 },
                { id: "R3", name: "ROUTER 3", icon: "◈", x: 325, y: 55 },
                { id: "R4", name: "ROUTER 4", icon: "◈", x: 325, y: 265 },
                { id: "R5", name: "ROUTER 5", icon: "◈", x: 450, y: 160 },
                { id: "D", name: "SERVER", icon: "▤", x: 550, y: 160, type: "server" }
            ],
            edges: [
                ["S", "R1"],
                ["S", "R2"],
                ["R1", "R3"],
                ["R2", "R4"],
                ["R3", "R5"],
                ["R4", "R5"],
                ["R3", "R4"],
                ["R5", "D"],
                ["R1", "R4"],
                ["R2", "R3"]
            ],
            solution: [0, 2, 4, 7]
        }
    ];

    let levelIndex = 0;
    let selectedEdges = new Set();
    let score = 0;
    let lives = maxLives;
    let streak = 0;
    let timeLeft = timeLimit;

    let running = false;
    let paused = false;
    let gameOver = false;
    let levelComplete = false;

    let timerId = null;
    let lastResult = "";

    // -------------------------------------
    // Helpers
    // -------------------------------------

    function formatScore(value) {
        return String(value).padStart(6, "0");
    }

    function currentLevel() {
        return levels[levelIndex];
    }

    function setFeedback(text, type = "") {
        feedback.textContent = text;
        feedback.className = "packet-feedback";

        if (type) feedback.classList.add(type);
    }

    function updateHUD() {
        scoreDisplay.textContent = formatScore(score);
        livesDisplay.textContent =
            Array.from({ length: maxLives }, (_, i) =>
                i < lives ? "♥" : "♡"
            ).join(" ");

        timeDisplay.textContent = Math.max(0, Math.ceil(timeLeft));
        streakDisplay.textContent = streak + "x";

        levelDisplay.textContent =
            "LEVEL " + String(levelIndex + 1).padStart(2, "0");
    }

    function clearTimer() {
        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }
    }

    function showOverlay(label, heading, text, buttonText) {
        overline.textContent = label;
        message.textContent = heading;
        description.textContent = text;
        actionButton.textContent = buttonText;
        overlay.hidden = false;
    }

    function hideOverlay() {
        overlay.hidden = true;
    }

    function canPlay() {
        return running && !paused && !gameOver && !levelComplete;
    }

    // -------------------------------------
    // Build network map
    // -------------------------------------

    function nodeById(id) {
        return currentLevel().nodes.find(node => node.id === id);
    }

    function buildNetwork() {
        const level = currentLevel();

        titleDisplay.textContent = level.title;
        instructionsDisplay.textContent =
            "Activate the correct links between SOURCE and SERVER.";

        linksContainer.replaceChildren();
        nodesContainer.replaceChildren();
        wireSvg.replaceChildren();

        const ns = "http://www.w3.org/2000/svg";

        level.edges.forEach((edge, index) => {
            const [fromId, toId] = edge;
            const from = nodeById(fromId);
            const to = nodeById(toId);

            const x1 = from.x;
            const y1 = from.y;
            const x2 = to.x;
            const y2 = to.y;

            const line = document.createElementNS(ns, "line");
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            line.setAttribute("class", "packet-wire");
            line.dataset.edge = index;

            wireSvg.appendChild(line);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "packet-link";
            button.textContent = "OFF";
            button.setAttribute(
                "aria-label",
                "Link " + (index + 1) + ": " +
                from.name + " to " + to.name + ", off"
            );

            button.style.left = ((x1 + x2) / 2 / 600 * 100) + "%";
            button.style.top = ((y1 + y2) / 2 / 320 * 100) + "%";

            button.addEventListener("click", () => {
                if (!canPlay()) return;

                if (selectedEdges.has(index)) {
                    selectedEdges.delete(index);
                } else {
                    selectedEdges.add(index);
                }

                updateNetwork();
            });

            linksContainer.appendChild(button);
        });

        level.nodes.forEach(node => {
            const element = document.createElement("div");

            element.className =
                "packet-node " + (node.type || "");

            element.style.left = (node.x / 600 * 100) + "%";
            element.style.top = (node.y / 320 * 100) + "%";

            const icon = document.createElement("span");
            icon.className = "packet-node-icon";
            icon.textContent = node.icon;

            const label = document.createElement("span");
            label.textContent = node.name;

            element.append(icon, label);
            nodesContainer.appendChild(element);
        });

        updateNetwork();
    }

    function updateNetwork() {
        const lines = wireSvg.querySelectorAll(".packet-wire");
        const buttons = linksContainer.querySelectorAll(".packet-link");

        lines.forEach((line, index) => {
            const active = selectedEdges.has(index);

            line.classList.toggle("active", active);
            line.classList.remove("route");
        });

        buttons.forEach((button, index) => {
            const active = selectedEdges.has(index);
            button.classList.toggle("active", active);
            button.textContent = active ? "ON" : "OFF";

            const edge = currentLevel().edges[index];
            const from = nodeById(edge[0]);
            const to = nodeById(edge[1]);

            button.setAttribute(
                "aria-label",
                "Link " + (index + 1) + ": " +
                from.name + " to " + to.name +
                ", " + (active ? "on" : "off")
            );
        });
    }

    // -------------------------------------
    // Check if SOURCE can reach SERVER
    // -------------------------------------

    function findRoute() {
        const level = currentLevel();
        const graph = new Map();

        level.nodes.forEach(node => {
            graph.set(node.id, []);
        });

        level.edges.forEach((edge, index) => {
            if (!selectedEdges.has(index)) return;

            const [a, b] = edge;
            graph.get(a).push({ node: b, edge: index });
            graph.get(b).push({ node: a, edge: index });
        });

        const queue = ["S"];
        const previous = new Map();
        const visited = new Set(["S"]);

        while (queue.length > 0) {
            const current = queue.shift();

            if (current === "D") break;

            for (const connection of graph.get(current)) {
                if (visited.has(connection.node)) continue;

                visited.add(connection.node);
                previous.set(connection.node, {
                    node: current,
                    edge: connection.edge
                });

                queue.push(connection.node);
            }
        }

        if (!visited.has("D")) return null;

        const route = [];
        let current = "D";

        while (current !== "S") {
            const step = previous.get(current);

            if (!step) return null;

            route.push(step.edge);
            current = step.node;
        }

        return route.reverse();
    }

    function isCorrectRoute(route) {
        if (!route) return false;

        const solution = currentLevel().solution;

        // The player must activate precisely the solution links.
        if (selectedEdges.size !== solution.length) return false;

        return solution.every(edge => selectedEdges.has(edge));
    }

    function showRoute(route) {
        if (!route) return;

        route.forEach(index => {
            const line = wireSvg.querySelector(
                '[data-edge="' + index + '"]'
            );

            if (line) line.classList.add("route");
        });
    }

    // -------------------------------------
    // Gameplay
    // -------------------------------------

    function startTimer() {
        clearTimer();

        timerId = setInterval(() => {
            if (!canPlay()) return;

            timeLeft = Math.max(0, timeLeft - 1);
            updateHUD();

            if (timeLeft <= 0) {
                finishGame("TIME EXPIRED", "The network timed out.");
            }
        }, 1000);
    }

    function startGame() {
        clearTimer();

        levelIndex = 0;
        selectedEdges.clear();
        score = 0;
        lives = maxLives;
        streak = 0;
        timeLeft = timeLimit;

        running = true;
        paused = false;
        gameOver = false;
        levelComplete = false;
        lastResult = "";

        pauseButton.textContent = "PAUSE";
        pauseButton.disabled = false;
        testButton.disabled = false;
        resetButton.disabled = false;

        buildNetwork();
        updateHUD();
        setFeedback("Network online. Build your route.");
        hideOverlay();
        startTimer();
    }

    function testConnection() {
        if (!canPlay()) return;

        const route = findRoute();

        if (isCorrectRoute(route)) {
            showRoute(route);

            const bonus = Math.max(0, Math.ceil(timeLeft) * 5);
            const points = 500 + bonus + streak * 50;

            score += points;
            streak++;

            updateHUD();
            setFeedback(
                "CONNECTION SUCCESSFUL! +" + points + " points.",
                "success"
            );

            if (levelIndex === levels.length - 1) {
                finishGame("NETWORK RESTORED", "All missions complete!");
                return;
            }

            levelComplete = true;
            clearTimer();

            showOverlay(
                "CONNECTION VERIFIED",
                "ROUTE SECURED!",
                "Great work, technician. You earned " +
                points + " points. Ready for the next network?",
                "NEXT LEVEL"
            );

        } else {
            lives--;
            streak = 0;

            updateHUD();

            setFeedback(
                route
                    ? "Connection detected, but the route is not correct. Check your links."
                    : "No complete connection. Find a route to the server.",
                "error"
            );

            if (lives <= 0) {
                finishGame("NETWORK FAILURE", "No lives remaining.");
            }
        }
    }

    function nextLevel() {
        if (!levelComplete || gameOver) return;

        levelIndex++;
        selectedEdges.clear();
        levelComplete = false;

        buildNetwork();
        updateHUD();
        setFeedback("New topology loaded. Find your route.");
        hideOverlay();
        startTimer();
    }

    function resetRoute() {
        if (!canPlay()) return;

        selectedEdges.clear();
        updateNetwork();
        setFeedback("Route reset. Try another path.");
    }

    function pauseGame() {
        if (!running || gameOver || levelComplete) return;

        paused = !paused;
        pauseButton.textContent = paused ? "RESUME" : "PAUSE";

        if (paused) {
            showOverlay(
                "SESSION PAUSED",
                "TAKE A BREATHER",
                "Your progress is safe. Resume when you're ready.",
                "RESUME GAME"
            );
        } else {
            hideOverlay();
        }
    }

    function finishGame(label, text) {
        clearTimer();

        running = false;
        paused = false;
        gameOver = true;
        levelComplete = false;
        if (typeof window.submitArcadeScore === "function") {
    window.submitArcadeScore("Packet Panic", score);
}

        pauseButton.disabled = true;
        testButton.disabled = true;
        resetButton.disabled = true;

        lastResult = text;

        pauseButton.textContent = "PAUSE";

        showOverlay(
            label,
            label === "NETWORK RESTORED" ? "MISSION COMPLETE!" : "GAME OVER",
            text + " Final score: " + score + ".",
            "PLAY AGAIN"
        );

        updateHUD();
    }

    // -------------------------------------
    // Controls
    // -------------------------------------

    testButton.addEventListener("click", testConnection);
    resetButton.addEventListener("click", resetRoute);
    pauseButton.addEventListener("click", pauseGame);

    actionButton.addEventListener("click", () => {
        if (paused) {
            pauseGame();
        } else if (levelComplete) {
            nextLevel();
        } else {
            startGame();
        }
    });

    expandButton.addEventListener("click", async () => {
        try {
            if (document.fullscreenElement === machine) {
                await document.exitFullscreen();
            } else if (!document.fullscreenElement) {
                await machine.requestFullscreen();
            }
        } catch (error) {
            console.error("Packet Panic fullscreen error:", error);
            setFeedback("Fullscreen is not available in this browser.", "error");
        }
    });

    document.addEventListener("fullscreenchange", () => {
        expandButton.textContent =
            document.fullscreenElement === machine
                ? "⛶ EXIT FULLSCREEN"
                : "⛶ EXPAND GAME";
    });

    // Initial screen
    buildNetwork();
    updateHUD();

    testButton.disabled = true;
    resetButton.disabled = true;
    pauseButton.disabled = true;

    showOverlay(
        "READY, TECHNICIAN?",
        "PACKET PANIC",
        "Restore the network. Activate the correct links and connect SOURCE to SERVER.",
        "START MISSION"
    );
})();
