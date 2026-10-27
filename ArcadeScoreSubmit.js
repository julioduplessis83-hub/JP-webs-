
/* =========================================
   ARCADE SCORE SUBMISSION
   Shared by all five games
========================================= */

window.submitArcadeScore = async function (gameName, score) {
    const SUPABASE_URL = "https://pchnomunqfcwqeitciqz.supabase.co";
    const SUPABASE_KEY = "sb_publishable_alng8Ic4ZsgfSvAPwo7W6w_L--gqpY-";

    const playerTag = (
        localStorage.getItem("julioArcadePlayerTag") || ""
    ).trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(playerTag)) {
        console.warn("No valid arcade player tag found.");
        return false;
    }

    const allowedGames = [
        "Ibiza Night Drive",
        "Beat Catcher",
        "Packet Panic",
        "Neon Survivor",
        "Cyber Maze"
    ];

    if (!allowedGames.includes(gameName)) {
        console.error("Unknown arcade game:", gameName);
        return false;
    }

    const finalScore = Math.floor(Number(score));

    if (!Number.isFinite(finalScore) || finalScore < 0) {
        console.error("Invalid arcade score.");
        return false;
    }

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/arcade_scores`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify({
                    player_tag: playerTag,
                    game_name: gameName,
                    score: finalScore
                })
            }
        );

        if (!response.ok) {
            const details = await response.text();
            throw new Error(
                `HTTP ${response.status}: ${details}`
            );
        }

        console.log(
            `Score saved: ${playerTag} — ${gameName} — ${finalScore}`
        );

        return true;
    } catch (error) {
        console.error("Could not save arcade score:", error);
        return false;
    }
};
