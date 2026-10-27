document.querySelectorAll(".navbar").forEach((navbar) => {
    const navList = navbar.querySelector(".nav-links");
    const indicator = navbar.querySelector(".nav-indicator");
    const links = navbar.querySelectorAll(".nav-link");

    if (!navList || !indicator || !links.length) return;

    function moveIndicator(link) {
        const listRect = navList.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();

        indicator.style.width = `${linkRect.width}px`;
        indicator.style.height = `${linkRect.height}px`;

        indicator.style.transform =
            `translate(${linkRect.left - listRect.left}px, ` +
            `${linkRect.top - listRect.top}px)`;

        indicator.style.opacity = "1";
    }

    const activeLink = navList.querySelector(".nav-link.active");

    if (activeLink) {
        moveIndicator(activeLink);
    }

    links.forEach((link) => {
        link.addEventListener("mouseenter", () => {
            moveIndicator(link);
        });

        link.addEventListener("focus", () => {
            moveIndicator(link);
        });

        link.addEventListener("click", () => {
            links.forEach((item) => item.classList.remove("active"));

            link.classList.add("active");
            moveIndicator(link);
        });
    });

    navList.addEventListener("mouseleave", () => {
        const currentActive = navList.querySelector(".nav-link.active");

        if (currentActive) {
            moveIndicator(currentActive);
        }
    });

    window.addEventListener("resize", () => {
        const currentActive = navList.querySelector(".nav-link.active");

        if (currentActive) {
            moveIndicator(currentActive);
        }
    });
});

/* =========================
   NAVIGATION PAGE TRANSITION
========================= */

document.querySelectorAll(".nav-link, .logo").forEach((link) => {
    link.addEventListener("click", function (event) {
        const url = new URL(this.href, window.location.href);

        // Allow normal browser behaviour for external links,
        // new tabs, and modifier-clicks.
        if (
            url.origin !== window.location.origin ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0 ||
            this.target === "_blank"
        ) {
            return;
        }

        // Don't animate if clicking the current page.
        if (url.href === window.location.href) {
            return;
        }

        event.preventDefault();

        document.body.classList.add("page-leaving");

        setTimeout(() => {
            window.location.href = url.href;
        }, 150);
    });
});
/* =========================
   FEATURE SECTION (Myself page)
========================= */

/* Scroll reveal */
(function () {
    const reveals = document.querySelectorAll(".reveal");
    if (!reveals.length) return;

    if (!("IntersectionObserver" in window)) {
        reveals.forEach((el) => el.classList.add("visible"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05 });

    reveals.forEach((el) => observer.observe(el));
})();

/* Car animation (tap / Enter / Space) */
(function () {
    const carScene = document.getElementById("carScene");
    if (!carScene) return;

    const toggleCar = () => carScene.classList.toggle("active");

    carScene.addEventListener("click", toggleCar);
    carScene.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleCar();
        }
    });
})();


/* =========================
   MUSIC CARD
========================= */

(function () {
    const card = document.getElementById("musicCard");
    if (!card) return;

    // ALBUM INFORMATION
    const albums = [
        {
            title: "Album One",
            artist: "Artist One",
            image: "images/album1.jpg",
            song: "audio/Champagne Poetry.mp3"
        },
        {
            title: "Album Two",
            artist: "Artist Two",
            image: "images/album2.jpg",
            song: "audio/Jimmy Cooks.mp3"
        },
        {
            title: "Album Three",
            artist: "Artist Three",
            image: "images/album3.jpg",
            song: "audio/Hours In Silence.mp3"
        }
    ];

    // HTML ELEMENTS
    const stage = document.getElementById("vinylStage");
    const record = document.getElementById("vinylRecord");
    const artwork = document.getElementById("albumArtwork");
    const title = document.getElementById("albumTitle");
    const artist = document.getElementById("albumArtist");
    const dots = document.querySelectorAll(".album-dot");
    const audio = document.getElementById("musicAudio");
    const playBtn = document.getElementById("playMusic");
    const muteBtn = document.getElementById("muteMusic");
    const status = document.getElementById("musicStatus");

    // Check that the required elements exist
    if (!stage || !record || !artwork || !title ||
        !artist || !audio || !playBtn || !muteBtn || !status) {
        console.warn("Music card: Some HTML elements are missing.");
        return;
    }

    let current = 0;
    let wasPlaying = false;

    // CHANGE ALBUM
    function showAlbum(index) {
        current = (index + albums.length) % albums.length;

        const album = albums[current];

        // Update album artwork and information
        artwork.src = album.image;
        artwork.alt = "Album artwork: " + album.title;

        title.textContent = album.title;
        artist.textContent = album.artist;

        // Update active album dot
        dots.forEach((dot, i) => {
            const isActive = i === current;

            dot.classList.toggle("active", isActive);
            dot.setAttribute("aria-pressed", String(isActive));
        });

        // Stop the previous song
        audio.pause();
        audio.currentTime = 0;

        // Load the selected album's song
        audio.src = album.song;
        audio.load();

        // Update playback state
        if (wasPlaying) {
            audio.play()
                .then(() => {
                    status.textContent = audio.muted
                        ? "Playing muted. Press Unmute sound to listen."
                        : "Now playing.";
                })
                .catch(() => {
                    wasPlaying = false;
                    setPlaying(false);
                    status.textContent =
                        "Couldn't play this song. Check its file path.";
                });
        } else {
            setPlaying(false);
            status.textContent = "Album selected. Press Play preview.";
        }
    }

    // ALBUM DOTS
    dots.forEach((dot) => {
        dot.addEventListener("click", () => {
            showAlbum(Number(dot.dataset.album));
        });
    });

    // CLICK VINYL TO CHANGE ALBUM
    stage.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        showAlbum(current + 1);
    });

    // KEYBOARD SUPPORT
    stage.addEventListener("keydown", (event) => {
        if (event.target !== stage) return;

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            showAlbum(current + 1);
        }
    });

    // PLAY / PAUSE
    function setPlaying(isPlaying) {
        record.classList.toggle("spinning", isPlaying);
        card.classList.toggle("playing", isPlaying);

        playBtn.textContent = isPlaying
            ? "❚❚ Pause"
            : "▶ Play preview";
    }

    playBtn.addEventListener("click", async () => {
        if (!audio.paused) {
            wasPlaying = false;
            audio.pause();
            return;
        }

        try {
            await audio.play();
            wasPlaying = true;

            status.textContent = audio.muted
                ? "Playing muted. Press Unmute sound to listen."
                : "Now playing.";
        } catch (error) {
            wasPlaying = false;
            setPlaying(false);

            status.textContent =
                "Couldn't play audio. Check the selected song file.";
        }
    });

    // PLAYBACK EVENTS
    audio.addEventListener("play", () => setPlaying(true));

    audio.addEventListener("pause", () => setPlaying(false));

    audio.addEventListener("ended", () => {
        wasPlaying = false;
        setPlaying(false);
        status.textContent = "Preview finished. Press Play to listen again.";
    });

    // MUTE / UNMUTE
    muteBtn.addEventListener("click", () => {
        audio.muted = !audio.muted;

        muteBtn.textContent = audio.muted
            ? "Unmute sound"
            : "Mute sound";

        muteBtn.setAttribute(
            "aria-pressed",
            String(audio.muted)
        );

        status.textContent = !audio.paused
            ? (audio.muted
                ? "Playing muted."
                : "Now playing.")
            : (audio.muted
                ? "Sound is muted."
                : "Sound is on. Press Play preview.");
    });

    // INITIAL ALBUM
    audio.muted = true;

    muteBtn.textContent = "Unmute sound";
    muteBtn.setAttribute("aria-pressed", "true");

    showAlbum(0);

})();
