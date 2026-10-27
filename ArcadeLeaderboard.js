
document.addEventListener("DOMContentLoaded", async () => {
    const leaderboardBody = document.getElementById("leaderboard-body");
    const leaderboardStatus = document.getElementById("leaderboard-status");

    if (!leaderboardBody || !leaderboardStatus) return;

    // Replace these with your own Supabase project details.
    const SUPABASE_URL = "https://pchnomunqfcwqeitciqz.supabase.co";
    const SUPABASE_KEY = "sb_publishable_alng8Ic4ZsgfSvAPwo7W6w_L--gqpY-";

    function showStatus(message) {
        leaderboardStatus.textContent = message;
    }

    function formatScore(score) {
        return Number(score).toLocaleString();
    }

    function makeCell(text) {
        const cell = document.createElement("td");
        cell.textContent = text;
        return cell;
    }

    async function loadLeaderboard() {
        showStatus("CONNECTING TO ARCADE DATABASE...");

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/arcade_scores?select=player_tag,game_name,score,created_at&order=score.desc&limit=10`,
                {
                    method: "GET",
                    headers: {
                        "apikey": SUPABASE_KEY,
                        "Authorization": `Bearer ${SUPABASE_KEY}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Supabase returned HTTP ${response.status}`);
            }

            const scores = await response.json();
            leaderboardBody.replaceChildren();

            if (scores.length === 0) {
                const row = document.createElement("tr");
                const cell = makeCell("No scores yet. Be the first to play!");
                cell.colSpan = 4;
                row.appendChild(cell);
                leaderboardBody.appendChild(row);
            } else {
                scores.forEach((score, index) => {
                    const row = document.createElement("tr");

                    row.appendChild(makeCell(`#${String(index + 1).padStart(2, "0")}`));

                    const playerCell = document.createElement("td");
                    const tag = document.createElement("span");
                    tag.className = "leaderboard-tag";
                    tag.textContent = score.player_tag;
                    playerCell.appendChild(tag);
                    row.appendChild(playerCell);

                    row.appendChild(makeCell(score.game_name));
                    row.appendChild(makeCell(formatScore(score.score)));

                    leaderboardBody.appendChild(row);
                });
            }

            showStatus("ONLINE // DATABASE CONNECTED");
        } catch (error) {
            console.error("Leaderboard error:", error);

            leaderboardBody.replaceChildren();

            const row = document.createElement("tr");
            const cell = makeCell("Could not load scores. Check your Supabase settings.");
            cell.colSpan = 4;
            row.appendChild(cell);
            leaderboardBody.appendChild(row);

            showStatus("CONNECTION ERROR");
        }
    }

    await loadLeaderboard();
});
