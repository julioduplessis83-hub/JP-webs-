function insertCoinThenEnterArcade(onComplete) {
    const coinEntry = document.getElementById("coin-entry");

    if (!coinEntry) {
        onComplete();
        return;
    }

    coinEntry.classList.remove("is-inserting");

    // Restart the animation if the player tries again.
    void coinEntry.offsetWidth;

    coinEntry.classList.add("is-inserting");
    window.setTimeout(onComplete, 1500);
}