
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("player-form");
    const input = document.getElementById("player-tag");
    const message = document.getElementById("player-message");
    const activePlayer = document.getElementById("active-player");
    const activeTag = document.getElementById("active-player-tag");
    const changeButton = document.getElementById("change-player");

    if (!form || !input || !message) return;

    const STORAGE_KEY = "julioArcadePlayerTag";

    function showMessage(text, type = "") {
        message.textContent = text;
        message.className = "player-message";

        if (type) {
            message.classList.add(type);
        }
    }

    function getPlayerTag() {
        return localStorage.getItem(STORAGE_KEY) || "";
    }

    function updatePlayerDisplay() {
        const tag = getPlayerTag();
        const hasPlayer = /^[A-Z]{3}$/.test(tag);

        activePlayer.hidden = !hasPlayer;

        if (hasPlayer) {
            activeTag.textContent = tag;
            input.value = tag;
            showMessage("Player tag saved for this browser.", "success");
        } else {
            input.value = "";
            showMessage("Enter exactly three letters, such as JDP.");
        }

        updateGameLinks(hasPlayer);
    }

    function updateGameLinks(hasPlayer) {
        document.querySelectorAll(".game-launch").forEach(link => {
            link.setAttribute("aria-disabled", String(!hasPlayer));
            link.classList.toggle("game-launch-locked", !hasPlayer);
            link.title = hasPlayer
                ? "Play as " + getPlayerTag()
                : "Enter your player tag before playing";
        });
    }

    form.addEventListener("submit", event => {
        event.preventDefault();

        const tag = input.value.trim().toUpperCase();

        if (!/^[A-Z]{3}$/.test(tag)) {
            showMessage(
                "Please enter exactly three letters, A to Z.",
                "error"
            );
            input.focus();
            return;
        }

        localStorage.setItem(STORAGE_KEY, tag);
        input.value = tag;

        updatePlayerDisplay();
        showMessage("Welcome, " + tag + "! You're ready to play.", "success");
    });

    input.addEventListener("input", () => {
        input.value = input.value
            .replace(/[^a-z]/gi, "")
            .toUpperCase()
            .slice(0, 3);
    });

    changeButton?.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        updatePlayerDisplay();
        input.focus();
    });

    // Stop players opening a game until a valid tag is saved.
    document.querySelectorAll(".game-launch").forEach(link => {
        link.addEventListener("click", event => {
            if (!/^[A-Z]{3}$/.test(getPlayerTag())) {
                event.preventDefault();
                showMessage(
                    "Enter your three-letter player tag before starting a game.",
                    "error"
                );
                input.focus();
                document.getElementById("player-form")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    });

    updatePlayerDisplay();
});
