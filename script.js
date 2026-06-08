const revealItems = Array.from(document.querySelectorAll(".reveal"));
const sceneItems = Array.from(document.querySelectorAll("[data-scene]"));
const letterCard = document.getElementById("letterCard");
const letterLines = Array.from(document.querySelectorAll(".letter-line"));
const galleryTrack = document.getElementById("galleryTrack");
const galleryDots = Array.from(document.querySelectorAll(".gallery-dot"));
const soundToggle = document.getElementById("soundToggle");
const soundState = document.getElementById("soundState");
const heroScene = document.querySelector(".scene--hero");
const heroCollage = document.querySelector(".hero-collage");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const makeVisible = (element) => {
  element.classList.add("is-visible");
};

if (prefersReducedMotion.matches) {
  revealItems.forEach(makeVisible);
  letterLines.forEach(makeVisible);
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        makeVisible(entry.target);
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -12% 0px"
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

const revealLetterLines = () => {
  if (!letterCard || letterCard.dataset.linesRevealed === "true") {
    return;
  }

  letterCard.dataset.linesRevealed = "true";

  letterLines.forEach((line, index) => {
    line.style.transitionDelay = `${index * 140}ms`;

    if (prefersReducedMotion.matches) {
      makeVisible(line);
      return;
    }

    requestAnimationFrame(() => makeVisible(line));
  });
};

const sceneObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      if (entry.target === letterCard?.closest("[data-scene]")) {
        revealLetterLines();
      }

      if (entry.target.classList.contains("scene--final")) {
        entry.target.classList.add("is-celebrating");
      }
    });
  },
  {
    threshold: 0.38
  }
);

sceneItems.forEach((scene) => sceneObserver.observe(scene));

const syncGalleryDots = () => {
  if (!galleryTrack || galleryDots.length === 0) {
    return;
  }

  const cards = Array.from(galleryTrack.querySelectorAll(".gallery-card"));
  const viewportCenter = galleryTrack.scrollLeft + galleryTrack.clientWidth / 2;

  let activeIndex = 0;
  let shortestDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card, index) => {
    const cardCenter = card.offsetLeft + card.clientWidth / 2;
    const distance = Math.abs(cardCenter - viewportCenter);

    if (distance < shortestDistance) {
      shortestDistance = distance;
      activeIndex = index;
    }
  });

  galleryDots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === activeIndex);
  });
};

let galleryTicking = false;

if (galleryTrack) {
  galleryTrack.addEventListener(
    "scroll",
    () => {
      if (galleryTicking) {
        return;
      }

      galleryTicking = true;
      requestAnimationFrame(() => {
        syncGalleryDots();
        galleryTicking = false;
      });
    },
    { passive: true }
  );

  window.addEventListener("resize", syncGalleryDots, { passive: true });
  syncGalleryDots();
}

const updateHeroMotion = () => {
  if (!heroScene || !heroCollage || prefersReducedMotion.matches) {
    return;
  }

  const rect = heroScene.getBoundingClientRect();
  const progress = Math.min(Math.max((0 - rect.top) / (rect.height * 0.92), 0), 1);

  heroScene.style.setProperty("--hero-lift", `${progress * -8}px`);
  heroCollage.style.transform = `translate3d(0, ${progress * -10}px, 0)`;
};

let heroTicking = false;

document.addEventListener(
  "scroll",
  () => {
    if (heroTicking) {
      return;
    }

    heroTicking = true;
    requestAnimationFrame(() => {
      updateHeroMotion();
      heroTicking = false;
    });
  },
  { passive: true }
);

updateHeroMotion();

let audioContext;
let masterGain;
let melodyTimer;
let soundEnabled = true;
let autoStartArmed = false;

const happyBirthdayMelody = [
  { note: 67, beats: 0.75 },
  { note: 67, beats: 0.25 },
  { note: 69, beats: 1 },
  { note: 67, beats: 1 },
  { note: 72, beats: 1 },
  { note: 71, beats: 2 },
  { note: 67, beats: 0.75 },
  { note: 67, beats: 0.25 },
  { note: 69, beats: 1 },
  { note: 67, beats: 1 },
  { note: 74, beats: 1 },
  { note: 72, beats: 2 },
  { note: 67, beats: 0.75 },
  { note: 67, beats: 0.25 },
  { note: 79, beats: 1 },
  { note: 76, beats: 1 },
  { note: 72, beats: 1 },
  { note: 71, beats: 1 },
  { note: 69, beats: 2 },
  { note: 77, beats: 0.75 },
  { note: 77, beats: 0.25 },
  { note: 76, beats: 1 },
  { note: 72, beats: 1 },
  { note: 74, beats: 1 },
  { note: 72, beats: 2 }
];

const accompaniment = [
  { note: 48, beats: 2 },
  { note: 50, beats: 2 },
  { note: 52, beats: 2 },
  { note: 48, beats: 2 },
  { note: 53, beats: 2 },
  { note: 52, beats: 2 },
  { note: 48, beats: 2 },
  { note: 55, beats: 2 },
  { note: 52, beats: 2 },
  { note: 48, beats: 2 },
  { note: 53, beats: 2 },
  { note: 52, beats: 2 }
];

const beatSeconds = 0.52;
const melodyLoopDuration = happyBirthdayMelody.reduce(
  (total, item) => total + item.beats * beatSeconds,
  0
);

const midiToFrequency = (midiNote) => 440 * 2 ** ((midiNote - 69) / 12);

const createAudioEngine = async () => {
  if (!audioContext) {
    audioContext = new window.AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.0001;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
};

const strikeNote = ({
  frequency,
  startTime,
  duration,
  volume,
  type,
  shimmerGain,
  filterFrequency
}) => {
  const fundamental = audioContext.createOscillator();
  const shimmer = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const envelope = audioContext.createGain();
  const shimmerEnvelope = audioContext.createGain();

  fundamental.type = type;
  shimmer.type = "sine";
  filter.type = "lowpass";

  fundamental.frequency.setValueAtTime(frequency, startTime);
  shimmer.frequency.setValueAtTime(frequency * 2, startTime);
  filter.frequency.setValueAtTime(filterFrequency, startTime);
  filter.Q.setValueAtTime(0.8, startTime);

  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.exponentialRampToValueAtTime(volume, startTime + 0.025);
  envelope.gain.exponentialRampToValueAtTime(Math.max(volume * 0.28, 0.0002), startTime + 0.24);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  shimmerEnvelope.gain.setValueAtTime(0.0001, startTime);
  shimmerEnvelope.gain.exponentialRampToValueAtTime(shimmerGain, startTime + 0.02);
  shimmerEnvelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  fundamental.connect(filter);
  shimmer.connect(shimmerEnvelope);
  shimmerEnvelope.connect(filter);
  filter.connect(envelope);
  envelope.connect(masterGain);

  fundamental.start(startTime);
  shimmer.start(startTime);
  fundamental.stop(startTime + duration);
  shimmer.stop(startTime + duration);
};

const scheduleHappyBirthday = (startTime) => {
  let melodyCursor = startTime;
  happyBirthdayMelody.forEach(({ note, beats }) => {
    strikeNote({
      frequency: midiToFrequency(note),
      startTime: melodyCursor,
      duration: beats * beatSeconds * 0.92,
      volume: 0.05,
      type: "triangle",
      shimmerGain: 0.006,
      filterFrequency: 2100
    });

    melodyCursor += beats * beatSeconds;
  });

  let bassCursor = startTime;
  accompaniment.forEach(({ note, beats }) => {
    strikeNote({
      frequency: midiToFrequency(note),
      startTime: bassCursor,
      duration: beats * beatSeconds * 0.96,
      volume: 0.012,
      type: "sine",
      shimmerGain: 0.0016,
      filterFrequency: 980
    });

    bassCursor += beats * beatSeconds;
  });
};

const startBirthdayTheme = async () => {
  await createAudioEngine();

  if (melodyTimer) {
    clearInterval(melodyTimer);
  }

  const now = audioContext.currentTime + 0.08;

  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, audioContext.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.7, audioContext.currentTime + 0.45);

  scheduleHappyBirthday(now);

  melodyTimer = window.setInterval(() => {
    scheduleHappyBirthday(audioContext.currentTime + 0.08);
  }, melodyLoopDuration * 1000);
};

const stopBirthdayTheme = () => {
  if (!audioContext || !masterGain) {
    return;
  }

  if (melodyTimer) {
    clearInterval(melodyTimer);
    melodyTimer = undefined;
  }

  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, audioContext.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);
};

const updateSoundButton = () => {
  if (!soundToggle || !soundState) {
    return;
  }

  soundToggle.classList.toggle("is-playing", soundEnabled);
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundState.textContent = soundEnabled ? "Playing" : "Paused";
};

const autoStartHandlers = [];

const clearAutoStartHandlers = () => {
  while (autoStartHandlers.length > 0) {
    const [eventName, handler] = autoStartHandlers.pop();
    window.removeEventListener(eventName, handler);
  }
};

const armAutoStart = () => {
  if (autoStartArmed || !soundEnabled) {
    return;
  }

  autoStartArmed = true;

  const bootstrap = async () => {
    clearAutoStartHandlers();
    autoStartArmed = false;

    if (!soundEnabled) {
      return;
    }

    try {
      await startBirthdayTheme();
    } catch (error) {
      console.error("Unable to auto-start birthday theme.", error);
    }

    updateSoundButton();
  };

  ["pointerdown", "touchstart", "keydown", "scroll"].forEach((eventName) => {
    const handler = () => {
      bootstrap();
    };

    autoStartHandlers.push([eventName, handler]);
    window.addEventListener(eventName, handler, { passive: true, once: true });
  });
};

const ensureBirthdayTheme = async () => {
  if (!soundEnabled) {
    return;
  }

  try {
    await startBirthdayTheme();
  } catch (error) {
    armAutoStart();
  }

  updateSoundButton();
};

soundToggle?.addEventListener("click", async () => {
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    await ensureBirthdayTheme();
  } else {
    clearAutoStartHandlers();
    autoStartArmed = false;
    stopBirthdayTheme();
    updateSoundButton();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopBirthdayTheme();
  } else if (soundEnabled) {
    ensureBirthdayTheme();
  }
});

window.addEventListener(
  "load",
  () => {
    updateSoundButton();
    ensureBirthdayTheme();
  },
  { once: true }
);

updateSoundButton();

const startOverlay = document.getElementById("startOverlay");
if (startOverlay) {
  startOverlay.addEventListener("click", async () => {
    startOverlay.classList.add("is-hidden");
    if (soundEnabled) {
      try {
        await startBirthdayTheme();
        updateSoundButton();
      } catch (error) {
        console.error("Audio blocked after interaction", error);
      }
    }
  });
}

// Canvas Chroma Key for the bird video (perfectly removes blue background)
const birdVideo = document.querySelector(".bird-video");
if (birdVideo) {
  const canvas = document.createElement("canvas");
  canvas.className = "bird-canvas reveal";
  canvas.style.setProperty("--delay", "0.2s");
  birdVideo.parentNode.insertBefore(canvas, birdVideo.nextSibling);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let w, h;
  birdVideo.addEventListener("loadedmetadata", () => {
    w = birdVideo.videoWidth || 640;
    h = birdVideo.videoHeight || 360;
    canvas.width = w;
    canvas.height = h;
  });

  const processFrame = () => {
    if (birdVideo.paused || birdVideo.ended || !w) {
      requestAnimationFrame(processFrame);
      return;
    }
    ctx.drawImage(birdVideo, 0, 0, w, h);
    let frame = ctx.getImageData(0, 0, w, h);
    let data = frame.data;
    let l = data.length / 4;
    for (let i = 0; i < l; i++) {
      let r = data[i * 4 + 0];
      let g = data[i * 4 + 1];
      let b = data[i * 4 + 2];
      
      // If blue channel is significantly higher than red and green, it's the blue background. Make it transparent.
      if (b > r * 1.2 && b > g * 1.1) {
         data[i * 4 + 3] = 0; // Alpha = 0
      }
    }
    ctx.putImageData(frame, 0, 0);
    requestAnimationFrame(processFrame);
  };
  
  birdVideo.addEventListener("play", () => {
    if (!w) {
      w = birdVideo.videoWidth || 640;
      h = birdVideo.videoHeight || 360;
      canvas.width = w;
      canvas.height = h;
    }
    requestAnimationFrame(processFrame);
  });

  birdVideo.addEventListener("timeupdate", () => {
    // Loop the RGB part (first 5 seconds) so the alpha matte never plays
    if (birdVideo.currentTime >= 5.0) {
      birdVideo.currentTime = 0;
    }
  });
}
