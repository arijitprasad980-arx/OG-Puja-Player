const page = document.querySelector("#page");
const themeKey = "pujafy-art-theme";
const countdownTargets = {
  sasthi: new Date("2026-10-16T00:00:00+05:30").getTime(),
  kali: new Date("2026-11-08T00:00:00+05:30").getTime()
};
const mahalayaNoticeSchedule = {
  reminder: {
    id: "reminder",
    at: new Date("2026-10-10T03:30:00+05:30").getTime(),
    title: "Mahalaya begins soon",
    message: "May Maa Durga’s arrival fill your home with hope, peace, and joy. Join us again at 4:00 AM for a special Mahalaya wish."
  },
  wish: {
    id: "wish",
    at: new Date("2026-10-10T04:00:00+05:30").getTime(),
    title: "Subho Mahalaya!",
    message: "May Maa Durga bless you and your family with happiness, peace, and prosperity."
  },
  endsAt: new Date("2026-10-11T00:00:00+05:30").getTime()
};
const mahalayaAlarms = [
  {
    id: "before",
    at: new Date("2026-10-09T04:00:00+05:30").getTime(),
    title: "Maa aschen!",
    message: "The wait is over—Maa Durga is coming home. May her arrival bring light, courage, and blessings to every heart. Shubho Mahalaya!"
  },
  {
    id: "mahalaya",
    at: new Date("2026-10-10T04:00:00+05:30").getTime(),
    title: "Maa aschen! Shubho Mahalaya!",
    message: "Maa Durga is here. May her strength fill your heart with courage, her love bring peace to your home, and her blessings light your path."
  }
];
const festivalAlarmTimeStorageKey = "pujafy-festival-alarm-times";

function readFestivalAlarmTimes() {
  const defaults = { durga: "04:00", kali: "04:00" };
  const saved = localStorage.getItem(festivalAlarmTimeStorageKey);
  if (!saved) return defaults;

  try {
    const times = JSON.parse(saved);
    const validTime = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (validTime(times.durga) && validTime(times.kali)) return times;
    console.error("Saved festival alarm times are invalid; using the default times.");
  } catch (error) {
    console.error("Could not read saved festival alarm times; using the default times.", error);
  }
  return defaults;
}

const festivalAlarmTimes = readFestivalAlarmTimes();
const festivalAlarmDefinitions = [
  { id: "durga-before", festival: "durga", name: "Durga Sasthi", eventDate: "2026-10-16", alarmDay: "before", title: "Maa aschen! Durga Sasthi is near.", message: "Tomorrow Maa Durga’s worship begins. May her arrival bring courage, joy, and blessings to your home." },
  { id: "durga-day", festival: "durga", name: "Durga Sasthi", eventDate: "2026-10-16", alarmDay: "day", title: "Shubho Durga Sasthi!", message: "Maa Durga is here. May her strength and blessings fill your day with hope, courage, and happiness." },
  { id: "kali-before", festival: "kali", name: "Kali Puja", eventDate: "2026-11-08", alarmDay: "before", title: "Kali Puja is near.", message: "Tomorrow we celebrate Kali Puja. May Maa Kali protect you and fill your home with strength and light." },
  { id: "kali-day", festival: "kali", name: "Kali Puja", eventDate: "2026-11-08", alarmDay: "day", title: "Shubho Kali Puja!", message: "May Maa Kali remove darkness, protect your loved ones, and bless you with courage and peace." }
];
const mahalayaNotice = document.querySelector("#mahalaya-notice");
const mahalayaNoticeTitle = document.querySelector("#mahalaya-notice-title");
const mahalayaNoticeMessage = document.querySelector("#mahalaya-notice-message");
const mahalayaNoticeStorageKey = "pujafy-mahalaya-2026-notice";
const mahalayaAlarmSettings = document.querySelector("#mahalaya-alarm-settings");
const mahalayaAlarmStatus = document.querySelector("#mahalaya-alarm-status");
const durgaAlarmTimeInput = document.querySelector("#durga-alarm-time");
const kaliAlarmTimeInput = document.querySelector("#kali-alarm-time");
const saveFestivalAlarmTimesButton = document.querySelector("#mahalaya-alarm-save-times");
const shareMenu = document.querySelector("#share-menu");
const shareMenuStatus = document.querySelector("#share-menu-status");
durgaAlarmTimeInput.value = festivalAlarmTimes.durga;
kaliAlarmTimeInput.value = festivalAlarmTimes.kali;
const pageState = { name: "home", album: "durga", durgaSearch: "", kaliSearch: "", djSearch: "", durgaLibraryCollapsed: false, kaliLibraryCollapsed: false, djLibraryCollapsed: false, djLightsOn: false };
const songStorage = window.pujafySongStorage;
const audio = new Audio();
audio.preload = "auto";
const playerState = { playlistKey: null, playlist: [], index: -1, shuffle: false, repeatOne: false, error: "", pickerLifted: { mahalaya: false, durga: false, kali: false, dj: false }, pickerLiftAnimationPending: { mahalaya: false, durga: false, kali: false, dj: false } };
let scrubbingPointerId = null;
let theme = localStorage.getItem(themeKey) || "day";
let pageThemeOverride = null;
let countdownInterval;
let mahalayaNoticeTimeout;

function currentTheme() {
  if (pageState.name === "dj" || (pageState.name === "playlist" && pageState.album === "kali")) {
    return pageThemeOverride || "night";
  }
  return theme || "day";
}

function screenImage() {
  const activeTheme = currentTheme();
  const images = {
    home: activeTheme === "day" ? "HOMED.png" : "HOMEN.png",
    songs: activeTheme === "day" ? "songday-no-arrow.png" : "songnight-no-arrow.png",
    countdown: activeTheme === "day" ? "countlight.png" : "countdark.png",
    dj: activeTheme === "day" ? "dj day.png" : "djnight.png",
    mahalaya: activeTheme === "day" ? "mahalday.png" : "mahalnight.png",
    durga: activeTheme === "day" ? "durgaday.png" : "durganight.png",
    playlist: pageState.album === "kali"
      ? (activeTheme === "day" ? "kalin.png" : "kalid.png")
      : (activeTheme === "day" ? "DURGAPLAY-L.png" : "DURGAPLAY-D.png")
  };
  return images[pageState.name];
}

function makeButton(label, className, action, position, title = label, content = "", attributes = "") {
  const [left, top, width, height] = position;
  return `<button class="screen-hotspot ${className}" type="button" data-action="${action}" ${attributes} aria-label="${label}" title="${title}" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%">${content}</button>`;
}

function themeToggle() {
  const activeTheme = currentTheme();
  const nextTheme = activeTheme === "day" ? "night" : "day";
  const icon = activeTheme === "day" ? "☾" : "☀";
  return `<button class="theme-toggle" type="button" data-action="theme" aria-label="Switch to ${nextTheme} mode" title="Switch to ${nextTheme} mode">${icon}</button>`;
}

function shareButton() {
  return `<button class="share-toggle" type="button" data-action="open-share-menu" aria-label="Share this website" title="Share this website"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/></svg></button>`;
}

async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    shareMenuStatus.textContent = "Link copied.";
    return true;
  } catch (error) {
    console.error("Could not copy the current website URL.", error);
    shareMenuStatus.textContent = "Could not copy link. You can still share using an option below.";
    return false;
  }
}

shareMenu.addEventListener("click", async event => {
  const option = event.target.closest("[data-share-target]");
  if (!option) return;

  const url = window.location.href;
  const target = option.dataset.shareTarget;
  if (target === "copy") {
    if (await copyShareUrl()) shareMenuStatus.textContent = "Link copied.";
    return;
  }

  if (target === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
    shareMenuStatus.textContent = await copyShareUrl()
      ? "WhatsApp opened. The link is copied too."
      : "WhatsApp opened, but the link could not be copied.";
    return;
  }

  if (target === "facebook") {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
    shareMenuStatus.textContent = await copyShareUrl()
      ? "Facebook opened. The link is copied too."
      : "Facebook opened, but the link could not be copied.";
    return;
  }

  if (target === "instagram") {
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    shareMenuStatus.textContent = await copyShareUrl()
      ? "Instagram opened. Paste the copied link into your post or bio."
      : "Instagram opened, but the link could not be copied.";
  }
});

document.addEventListener("click", event => {
  if (!shareMenu.open || shareMenu.contains(event.target)) return;
  if (event.target.closest('[data-action="open-share-menu"]')) return;
  shareMenu.close();
});

function playerControls() {
  const controls = [
    ["Shuffle", "shuffle", '<path d="m16 3 5 0 0 5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'],
    ["Previous song", "previous", '<path d="M19 5 9 12l10 7V5ZM5 5v14"/>'],
    ["Seek backward 30 seconds", "seek-backward", '<path d="M3 11a9 9 0 1 1 2.2 6M3 4v7h7"/><text x="12" y="14.5">30</text><path d="m12.5 9-1.5 1.2"/>'],
    ["Play or pause", "play-pause", '<path class="play-icon" d="m9 5 10 7-10 7V5Z"/><path class="pause-icon" d="M9 5v14M15 5v14"/>'],
    ["Seek forward 30 seconds", "seek-forward", '<path d="M21 11a9 9 0 1 0-2.2 6M21 4v7h-7"/><text x="12" y="14.5">30</text><path d="m11.5 9 1.5 1.2"/>'],
    ["Next song", "next", '<path d="m5 5 10 7-10 7V5ZM19 5v14"/>'],
    ["Repeat current song", "repeat", '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>']
  ];
  return `<div class="audio-controls" role="group" aria-label="Audio player controls">
    ${controls.map(([label, action, icon]) => `<button class="audio-control-button" type="button" data-player-control="${action}" aria-label="${label}" title="${label}"><svg class="audio-control-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg></button>`).join("")}
  </div>`;
}

function playerTrackPicker(playlistKey) {
  const tracks = songStorage[playlistKey];
  const playlistName = playlistKey === "dj" ? "DJ" : playlistKey[0].toUpperCase() + playlistKey.slice(1);
  return `<div class="audio-track-picker" role="group" aria-label="${playlistName} songs">
    ${tracks.length ? tracks.map((track, index) => `<button class="audio-track-option" type="button" data-playlist="${playlistKey}" data-play-track="${index}">
      <span class="audio-track-option-title">${track.title}</span>
      <span class="audio-track-option-creator">${track.creator}</span>
    </button>`).join("") : `<p class="audio-track-empty">Add ${playlistName} songs in <code>song-storage.js</code>.</p>`}
    ${["durga", "kali", "dj"].includes(playlistKey) && tracks.length ? '<p class="audio-track-empty audio-track-no-results" hidden>No songs match your search.</p>' : ""}
  </div>`;
}

function playerTrackDisplay() {
  return `<div class="audio-track-info" data-player-track-info hidden aria-live="polite">
    <div class="audio-track-marquee">
      <span class="audio-track-copy">
        <span class="audio-track-title" data-player-title></span>
        <span class="audio-track-separator" aria-hidden="true"> — </span>
        <span class="audio-track-creator" data-player-creator></span>
      </span>
      <span class="audio-track-copy" aria-hidden="true">
        <span class="audio-track-title" data-player-title></span>
        <span class="audio-track-separator" aria-hidden="true"> — </span>
        <span class="audio-track-creator" data-player-creator></span>
      </span>
    </div>
    <span class="audio-player-status" data-player-status hidden role="status"></span>
  </div>
  <div class="audio-timeline" data-player-timeline hidden>
    <span class="audio-time" data-player-current-time>0:00</span>
    <div class="audio-progress" data-player-progress role="slider" aria-label="Song position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
      <span class="audio-progress-fill" data-player-progress-fill></span>
    </div>
    <span class="audio-time" data-player-duration>0:00</span>
  </div>`;
}

function playerSurface() {
  const isKaliPlaylist = pageState.name === "playlist" && pageState.album === "kali";
  const isPlaylistScreen = pageState.name === "mahalaya" || pageState.name === "durga" || pageState.name === "dj" || isKaliPlaylist;
  if (isPlaylistScreen) {
    const playlistKey = isKaliPlaylist ? "kali" : pageState.name;
    const selectedTrack = currentTrack();
    const playerPopup = selectedTrack
      ? `<div class="audio-player-popup">
          ${playerTrackDisplay()}
          ${playerControls()}
        </div>`
      : "";
    const pickerIsLifted = playlistKey === "dj" || playerState.pickerLifted[playlistKey] || Boolean(selectedTrack);
    const pickerClasses = pickerIsLifted
      ? ` audio-surface-picker-lifted${playlistKey !== "dj" && playerState.pickerLiftAnimationPending[playlistKey] ? " audio-surface-picker-lifting" : ""}`
      : "";
    const hasCollapsibleLibrary = ["durga", "kali", "dj"].includes(playlistKey);
    const libraryCollapsed = hasCollapsibleLibrary && pageState[`${playlistKey}LibraryCollapsed`];
    const libraryClasses = hasCollapsibleLibrary ? ` audio-surface-picker-collapsible${libraryCollapsed ? " audio-library-collapsed" : ""}` : "";
    playerState.pickerLiftAnimationPending[playlistKey] = false;
    return `<div class="audio-player-stack">
      <div class="audio-surface-overlay audio-surface-picker audio-surface-picker-${playlistKey}${pickerClasses}${libraryClasses}">
        ${hasCollapsibleLibrary ? `<button class="kali-library-toggle" type="button" data-library-playlist="${playlistKey}" aria-label="${libraryCollapsed ? "Open" : "Hide"} song library" aria-expanded="${!libraryCollapsed}" title="${libraryCollapsed ? "Open" : "Hide"} song library"><svg class="kali-library-arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg><span class="kali-library-toggle-label"><span class="kali-library-marquee"><span>Open song library</span><span aria-hidden="true">Open song library</span></span></span></button>` : ""}
        ${["durga", "kali", "dj"].includes(playlistKey) ? `<input class="playlist-song-search" type="search" data-search-playlist="${playlistKey}" aria-label="Search ${playlistKey === "durga" ? "Durga" : playlistKey === "kali" ? "Kali" : "DJ"} songs" placeholder="Search songs or artists">` : ""}
        <div class="audio-library-content" aria-hidden="${libraryCollapsed}" ${libraryCollapsed ? "inert" : ""}>
          ${playerTrackPicker(playlistKey)}
        </div>
      </div>
        ${playerPopup}
      </div>`;
  }
  if (currentTrack()) {
    return `<div class="audio-surface-overlay">
      ${playerTrackDisplay()}
      ${playerControls()}
    </div>`;
  }
  return "";
}

function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function seekToProgressPosition(progress, clientX) {
  const duration = audio.duration;
  if (!currentTrack() || !Number.isFinite(duration) || duration <= 0) return;
  const bounds = progress.getBoundingClientRect();
  if (!bounds.width) return;
  const fraction = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
  audio.currentTime = duration * fraction;
  updatePlayerUi();
}

function currentTrack() {
  return playerState.playlist[playerState.index] || null;
}

function updatePlaylistSongSearch(playlistKey) {
  const search = page.querySelector(`[data-search-playlist="${playlistKey}"]`);
  const picker = page.querySelector(`.audio-surface-picker-${playlistKey} .audio-track-picker`);
  if (!search || !picker) return;
  const searchValue = pageState[`${playlistKey}Search`];
  search.value = searchValue;
  const query = searchValue.trim().toLocaleLowerCase();
  let visibleTracks = 0;
  picker.querySelectorAll(".audio-track-option").forEach(option => {
    const matches = option.textContent.toLocaleLowerCase().includes(query);
    option.hidden = !matches;
    if (matches) visibleTracks += 1;
  });
  const noResults = picker.querySelector(".audio-track-no-results");
  if (noResults) noResults.hidden = visibleTracks > 0;
}

function updatePlayerUi() {
  page.classList.toggle("dj-playing", pageState.name === "dj" && !audio.paused && !audio.ended);
  const track = currentTrack();
  const trackInfo = page.querySelector("[data-player-track-info]");
  const timeline = page.querySelector("[data-player-timeline]");
  const progress = page.querySelector("[data-player-progress]");
  if (!trackInfo || !timeline || !progress) return;

  const titles = page.querySelectorAll("[data-player-title]");
  const creators = page.querySelectorAll("[data-player-creator]");
  const status = page.querySelector("[data-player-status]");
  const playButton = page.querySelector('[data-player-control="play-pause"]');
  const progressFill = page.querySelector("[data-player-progress-fill]");
  const currentTime = page.querySelector("[data-player-current-time]");
  const durationTime = page.querySelector("[data-player-duration]");
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  const percent = duration > 0 ? Math.min(100, (audio.currentTime / duration) * 100) : 0;

  trackInfo.hidden = !track;
  timeline.hidden = !track;
  if (track) {
    titles.forEach(title => { title.textContent = track.title; });
    creators.forEach(creator => { creator.textContent = track.creator; });
  }
  progress.setAttribute("aria-valuenow", String(Math.round(percent)));
  progress.setAttribute("aria-valuetext", `${Math.floor(audio.currentTime)} of ${Math.floor(duration)} seconds`);
  progressFill.style.width = `${percent}%`;
  currentTime.textContent = formatAudioTime(audio.currentTime);
  durationTime.textContent = formatAudioTime(duration);

  const noTrack = !track;
  page.querySelectorAll("[data-player-control]").forEach(button => {
    button.disabled = noTrack;
  });
  if (playButton) {
    const isPlaying = !audio.paused && !audio.ended;
    playButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    playButton.title = isPlaying ? "Pause" : "Play";
  }

  const shuffleButton = page.querySelector('[data-player-control="shuffle"]');
  const repeatButton = page.querySelector('[data-player-control="repeat"]');
  shuffleButton?.setAttribute("aria-pressed", String(playerState.shuffle));
  repeatButton?.setAttribute("aria-pressed", String(playerState.repeatOne));
  if (status) {
    status.textContent = playerState.error;
    status.hidden = !playerState.error;
  }
}

function selectTrack(key, index) {
  const pickerScrollTop = page.querySelector(".audio-track-picker")?.scrollTop;
  playerState.playlistKey = key;
  playerState.playlist = songStorage[key] || [];
  playerState.index = index;
  playerState.error = "";
  const hasTrackPicker = pageState.name === "mahalaya" || pageState.name === "durga" || pageState.name === "dj" || (pageState.name === "playlist" && pageState.album === "kali");
  if (hasTrackPicker && !playerState.pickerLifted[key]) {
    playerState.pickerLifted[key] = true;
    playerState.pickerLiftAnimationPending[key] = true;
  }
  audio.pause();
  const track = currentTrack();
  if (!track) return;
  audio.src = track.src;
  audio.load();
  render();
  if (pickerScrollTop !== undefined) {
    page.querySelector(".audio-track-picker").scrollTop = pickerScrollTop;
  }
  playCurrentTrack();
}

function playCurrentTrack() {
  const track = currentTrack();
  if (!track) return;
  playerState.error = "";
  updatePlayerUi();
  audio.play().catch(error => {
    console.error("Unable to play the selected track.", error);
    playerState.error = "Unable to play this track";
    updatePlayerUi();
  });
}

function moveTrack(direction) {
  const length = playerState.playlist.length;
  if (!length) return;
  if (playerState.shuffle && length > 1) {
    selectTrack(playerState.playlistKey, randomTrackIndex());
    return;
  } else {
    playerState.index = (playerState.index + direction + length) % length;
  }
  const track = currentTrack();
  audio.src = track.src;
  audio.load();
  playCurrentTrack();
  updatePlayerUi();
}

function randomTrackIndex() {
  const length = playerState.playlist.length;
  if (length < 2) return playerState.index;
  let nextIndex = playerState.index;
  while (nextIndex === playerState.index) {
    nextIndex = Math.floor(Math.random() * length);
  }
  return nextIndex;
}

function handlePlayerControl(action) {
  if (!currentTrack()) return;
  if (action === "play-pause") {
    if (audio.paused) playCurrentTrack();
    else audio.pause();
  } else if (action === "seek-backward") {
    audio.currentTime = Math.max(0, audio.currentTime - 30);
  } else if (action === "seek-forward") {
    const end = Number.isFinite(audio.duration) ? audio.duration : Infinity;
    audio.currentTime = Math.min(end, audio.currentTime + 30);
  } else if (action === "previous") {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
    } else {
      moveTrack(-1);
    }
  } else if (action === "next") {
    moveTrack(1);
  } else if (action === "shuffle") {
    playerState.shuffle = !playerState.shuffle;
    updatePlayerUi();
  } else if (action === "repeat") {
    playerState.repeatOne = !playerState.repeatOne;
    updatePlayerUi();
  }
}

audio.addEventListener("timeupdate", updatePlayerUi);
audio.addEventListener("durationchange", updatePlayerUi);
audio.addEventListener("play", () => {
  if (pageState.name === "dj") {
    pageState.djLightsOn = true;
    page.classList.add("dj-lights-on");
    const lightToggle = page.querySelector('[data-action="dj-lights-toggle"]');
    lightToggle?.classList.add("is-on");
    lightToggle?.setAttribute("aria-pressed", "true");
    lightToggle?.setAttribute("aria-label", "Turn disco lights off");
    if (lightToggle) lightToggle.title = "Turn disco lights off";
  }
  updatePlayerUi();
});
audio.addEventListener("pause", updatePlayerUi);
audio.addEventListener("ended", () => {
  if (playerState.repeatOne) {
    audio.currentTime = 0;
    playCurrentTrack();
  } else {
    moveTrack(1);
  }
});
audio.addEventListener("error", () => {
  playerState.error = "Unable to load this track";
  updatePlayerUi();
});

function navigation() {
  const activeSection = pageState.name === "home"
    ? "home"
    : pageState.name === "countdown" ? "countdown" : "songs";
  const button = (label, action, position) => makeButton(
    label,
    `nav-${action}${activeSection === action ? " nav-active" : ""}`,
    action,
    position,
    label,
    "",
    activeSection === action ? 'aria-current="page"' : ""
  );
  return `${playerSurface()}
  <nav class="asset-bottom-nav" aria-label="Main navigation">
    <img src="bottom%20bar.png" alt="" draggable="false" />
    ${button("Home", "home", [0, 0, 33.34, 100])}
    ${button("Songs", "songs", [33.33, 0, 33.34, 100])}
    ${button("Countdown", "countdown", [66.66, 0, 33.34, 100])}
  </nav>`;
}

function eventCountdown(event, name) {
  return `<section class="event-countdown ${event}-countdown" data-event="${event}" aria-label="Countdown to ${name}">
    <h2>${name} <span>2026</span></h2>
    <div class="countdown-units" role="timer" aria-live="off">
      <div><span data-countdown-days>--</span><small>Days</small></div>
      <div><span data-countdown-hours>--</span><small>Hours</small></div>
      <div><span data-countdown-minutes>--</span><small>Minutes</small></div>
      <div><span data-countdown-seconds>--</span><small>Seconds</small></div>
    </div>
  </section>`;
}

function durgaSasthiReminderButton() {
  return `<button class="countdown-reminder sasthi-countdown-reminder" type="button" data-calendar-reminder="durga"><span class="reminder-label">SET REMINDER</span>${reminderBellIcon()}<span class="reminder-action-status" role="status" aria-live="polite"></span></button>`;
}

function kaliPujaReminderButton() {
  return `<button class="countdown-reminder kali-countdown-reminder" type="button" data-calendar-reminder="kali"><span class="reminder-label">SET REMINDER</span>${reminderBellIcon()}<span class="reminder-action-status" role="status" aria-live="polite"></span></button>`;
}

function mahalayaReminderButton() {
  return `<div class="mahalaya-reminder-controls"><button class="mahalaya-countdown-reminder" type="button" data-calendar-reminder="mahalaya"><span class="reminder-label">SET REMINDER</span>${reminderBellIcon()}<span class="reminder-action-status" role="status" aria-live="polite"></span></button><button class="mahalaya-guide-button" type="button" data-action="open-mahalaya-guide" aria-label="Guide for reminder" title="Guide for reminder">Guide for reminder</button></div>`;
}

function reminderBellIcon() {
  return `<svg class="reminder-bell" viewBox="0 0 24 24" aria-hidden="true"><path class="bell-outline" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/><path class="bell-filled" d="M12 2a6 6 0 0 0-6 6v3.3c0 1.3-.5 2.5-1.4 3.4L3 16.3V18h18v-1.7l-1.6-1.6a4.8 4.8 0 0 1-1.4-3.4V8a6 6 0 0 0-6-6Zm-2 18a2 2 0 0 0 4 0h-4Z"/></svg>`;
}

function updateCountdown() {
  const countdowns = page.querySelectorAll(".event-countdown");
  const now = Date.now();
  countdowns.forEach(countdown => {
    const timer = countdown.querySelector('[role="timer"]');
    const remaining = countdownTargets[countdown.dataset.event] - now;
    if (remaining <= 0) {
      timer.innerHTML = `<p class="countdown-arrived">${countdown.dataset.event === "kali" ? "Kali Puja is here" : "Maha Sasthi is here"}</p>`;
      return;
    }

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timer.querySelector("[data-countdown-days]").textContent = String(days);
    timer.querySelector("[data-countdown-hours]").textContent = String(hours).padStart(2, "0");
    timer.querySelector("[data-countdown-minutes]").textContent = String(minutes).padStart(2, "0");
    timer.querySelector("[data-countdown-seconds]").textContent = String(seconds).padStart(2, "0");
  });
  if ([...countdowns].every(countdown => countdownTargets[countdown.dataset.event] <= now)) {
    clearInterval(countdownInterval);
  }
}

function scheduledFestivalAlarms() {
  return festivalAlarmDefinitions.map(alarm => {
    const eventDate = new Date(`${alarm.eventDate}T12:00:00Z`);
    if (alarm.alarmDay === "before") eventDate.setUTCDate(eventDate.getUTCDate() - 1);
    const date = eventDate.toISOString().slice(0, 10);
    const time = festivalAlarmTimes[alarm.festival];
    return { ...alarm, time, at: new Date(`${date}T${time}:00+05:30`).getTime() };
  });
}

function scheduledAlarms() {
  return [...mahalayaAlarms, ...scheduledFestivalAlarms()];
}

function updateMahalayaNotice() {
  clearTimeout(mahalayaNoticeTimeout);
  const now = Date.now();
  const notice = now >= mahalayaNoticeSchedule.wish.at && now < mahalayaNoticeSchedule.endsAt
    ? mahalayaNoticeSchedule.wish
    : now >= mahalayaNoticeSchedule.reminder.at && now < mahalayaNoticeSchedule.wish.at
      ? mahalayaNoticeSchedule.reminder
      : null;

  if (notice && localStorage.getItem(mahalayaNoticeStorageKey) !== notice.id) {
    mahalayaNotice.dataset.noticeId = notice.id;
    mahalayaNoticeTitle.textContent = notice.title;
    mahalayaNoticeMessage.textContent = notice.message;
    if (!mahalayaNotice.open) mahalayaNotice.showModal();
  } else if (mahalayaNotice.open) {
    mahalayaNotice.close();
  }

  const nextTransition = [
    mahalayaNoticeSchedule.reminder.at,
    mahalayaNoticeSchedule.wish.at,
    mahalayaNoticeSchedule.endsAt
  ].filter(transition => transition > now).sort((first, second) => first - second)[0];
  if (nextTransition !== undefined) {
    mahalayaNoticeTimeout = setTimeout(updateMahalayaNotice, nextTransition - now);
  }
}

mahalayaNotice.addEventListener("close", () => {
  const noticeId = mahalayaNotice.dataset.noticeId;
  if (!noticeId.startsWith("alarm:")) {
    localStorage.setItem(mahalayaNoticeStorageKey, noticeId);
  }
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateMahalayaNotice();
});

function setAlarmStatus(message, trigger = null) {
  mahalayaAlarmStatus.textContent = message;
  const actionStatus = trigger?.querySelector(".reminder-action-status");
  if (actionStatus) actionStatus.textContent = message;
}

const calendarReminderFestivals = [
  {
    id: "mahalaya",
    name: "Mahalaya",
    eveId: "before",
    dayId: "mahalaya",
    eveWish: "⚔️One Day to Go — The Divine Encounter Against Ashuric Shakti Begins Tomorrow! Are you ready?",
    dayWish: "🔱Goddess Has Arrived - Listen to Mahalaya Chandipath and Witness the Beginning of the Battle Against Mahishasura"
  },
  {
    id: "durga",
    name: "Durga Sasthi",
    eveId: "durga-before",
    dayId: "durga-day",
    eveWish: festivalAlarmDefinitions.find(alarm => alarm.id === "durga-before").message,
    dayWish: festivalAlarmDefinitions.find(alarm => alarm.id === "durga-day").message
  },
  {
    id: "kali",
    name: "Kali Puja",
    eveId: "kali-before",
    dayId: "kali-day",
    eveWish: festivalAlarmDefinitions.find(alarm => alarm.id === "kali-before").message,
    dayWish: festivalAlarmDefinitions.find(alarm => alarm.id === "kali-day").message
  }
];

const calendarSaveInProgress = new Set();

function updateGoogleCalendarLinks() {
  const alarms = scheduledAlarms();
  const dateOptions = { day: "numeric", month: "short", timeZone: "Asia/Kolkata" };
  const timeOptions = { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" };
  document.querySelectorAll("[data-calendar-festival]").forEach(link => {
    const festival = calendarReminderFestivals.find(item => item.id === link.dataset.calendarFestival);
    if (!festival) return;
    const eveAlarm = alarms.find(item => item.id === festival.eveId);
    const dayAlarm = alarms.find(item => item.id === festival.dayId);
    if (!eveAlarm || !dayAlarm) return;
    const eveDate = new Intl.DateTimeFormat("en-IN", dateOptions).format(eveAlarm.at);
    const dayDate = new Intl.DateTimeFormat("en-IN", dateOptions).format(dayAlarm.at);
    const time = new Intl.DateTimeFormat("en-IN", timeOptions).format(eveAlarm.at);
    link.textContent = `${festival.name} · ${eveDate} & ${dayDate} · ${time}`;
    link.href = "#";
  });
}

updateGoogleCalendarLinks();

function requestGoogleCalendarAccess() {
  return new Promise((resolve, reject) => {
    const clientId = window.PUJAFY_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error("Google Calendar setup is pending."));
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google sign-in is unavailable."));
      return;
    }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/calendar.events",
      callback: response => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || "Google Calendar authorization failed."));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: error => reject(new Error(error.message || "Google sign-in was closed or blocked."))
    });
    tokenClient.requestAccessToken();
  });
}

async function saveGoogleCalendarEvent(accessToken, event) {
  const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`;
  const request = (method, url) => fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(event)
  });
  let response = await request("POST", "https://www.googleapis.com/calendar/v3/calendars/primary/events");
  if (response.status === 409) response = await request("PUT", apiUrl);
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || `Google Calendar returned ${response.status}.`);
  }
}

function googleCalendarEvent(alarm, festival, occasion, wish) {
  let festivalHash = 2166136261;
  for (const character of festival.id) {
    festivalHash = Math.imul(festivalHash ^ character.charCodeAt(0), 16777619);
  }
  return {
    id: `pujaf${(festivalHash >>> 0).toString(16).padStart(8, "0")}${occasion === "eve" ? "e" : "d"}`,
    summary: `${festival.name} reminder`,
    description: wish,
    start: {
      dateTime: new Date(alarm.at).toISOString(),
      timeZone: "Asia/Kolkata"
    },
    end: {
      dateTime: new Date(alarm.at + 15 * 60000).toISOString(),
      timeZone: "Asia/Kolkata"
    },
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 30 }]
    }
  };
}

async function saveFestivalRemindersToGoogleCalendar(festival, trigger = null) {
  if (calendarSaveInProgress.has(festival.id)) return;
  calendarSaveInProgress.add(festival.id);
  const link = trigger || document.querySelector(`[data-calendar-festival="${festival.id}"]`);
  if (link) {
    link.setAttribute("aria-busy", "true");
    if ("disabled" in link) link.disabled = true;
  }
  let savedCount = 0;
  try {
    setAlarmStatus("Connecting to Google Calendar…", link);
    const accessToken = await requestGoogleCalendarAccess();
    const alarms = scheduledAlarms();
    const eveAlarm = alarms.find(alarm => alarm.id === festival.eveId);
    const dayAlarm = alarms.find(alarm => alarm.id === festival.dayId);
    if (!eveAlarm || !dayAlarm) throw new Error(`Could not find both ${festival.name} reminders.`);
    const events = [
      googleCalendarEvent(eveAlarm, festival, "eve", festival.eveWish),
      googleCalendarEvent(dayAlarm, festival, "festival day", festival.dayWish)
    ];
    for (const calendarEvent of events) {
      await saveGoogleCalendarEvent(accessToken, calendarEvent);
      savedCount += 1;
    }
    setAlarmStatus("Both reminders saved.", link);
  } catch (error) {
    const partialSave = savedCount === 1 ? "One reminder saved. " : "";
    setAlarmStatus(`${partialSave}${error.message}`, link);
  } finally {
    calendarSaveInProgress.delete(festival.id);
    if (link) {
      link.removeAttribute("aria-busy");
      if ("disabled" in link) link.disabled = false;
    }
  }
}

document.querySelectorAll("[data-calendar-festival]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    const festival = calendarReminderFestivals.find(item => item.id === link.dataset.calendarFestival);
    if (festival) saveFestivalRemindersToGoogleCalendar(festival, link);
  });
});

saveFestivalAlarmTimesButton.addEventListener("click", () => {
  if (!durgaAlarmTimeInput.reportValidity() || !kaliAlarmTimeInput.reportValidity()) return;
  festivalAlarmTimes.durga = durgaAlarmTimeInput.value;
  festivalAlarmTimes.kali = kaliAlarmTimeInput.value;
  localStorage.setItem(festivalAlarmTimeStorageKey, JSON.stringify(festivalAlarmTimes));
  updateGoogleCalendarLinks();
  updateMahalayaNotice();
  setAlarmStatus("Reminder times saved.");
});

function hotspots(includeNavigation = true, includeThemeToggle = true, includeBackButton = true) {
  const items = includeThemeToggle ? [themeToggle()] : [];
  if (includeThemeToggle) items.push(shareButton());
  if (pageState.name === "countdown") {
    items.push('<button class="mahalaya-guide-button countdown-guide-button" type="button" data-action="open-mahalaya-guide" aria-label="Guide for reminder" title="Guide for reminder">Guide for reminder</button>');
  }
  if (pageState.name === "home") {
    items.push(makeButton("Enter Durga songs", "home-durga", "open-durga", [6, 40.5, 42.5, 39.5]));
    items.push(makeButton("Enter Kali songs", "home-kali", "open-kali", [51.2, 40.5, 42.8, 39.5]));
  }
  if (pageState.name === "songs") {
    if (includeBackButton) items.push(makeButton("Back to home", "back-button", "home", [2, 1, 11, 6]));
    items.push(makeButton("Open Durga playlist", "song-card durga-card", "open-durga", [3, 13, 94, 23.5]));
    items.push(makeButton("Open Kali playlist", "song-card kali-card", "open-kali-playlist", [3, 37.6, 94, 24.2]));
    items.push(makeButton("Open OG Bhashan DJ", "song-card dj-card", "open-dj", [3, 62.8, 94, 22]));
  }
  if (pageState.name === "dj") {
    items.push(makeButton("Back to songs", "back-button kali-back-button", "songs", [3, 1, 10, 6], "Back to songs", '<span aria-hidden="true">←</span>'));
  }
  if (pageState.name === "mahalaya") {
    items.push(makeButton("Back to Durga playlist", "back-button kali-back-button", "back-playlist", [3, 1, 10, 6], "Back to Durga playlist", '<span aria-hidden="true">←</span>'));
  }
  if (pageState.name === "durga") {
    items.push(makeButton("Back to Durga playlist", "back-button kali-back-button", "back-playlist", [3, 1, 10, 6], "Back to Durga playlist", '<span aria-hidden="true">←</span>'));
  }
  if (pageState.name === "playlist") {
    const isKaliPlaylist = pageState.album === "kali";
    items.push(makeButton(
      "Back to songs",
      isKaliPlaylist ? "back-button kali-back-button" : "back-button",
      "songs",
      [3, 1, 10, 6],
      "Back to songs",
      isKaliPlaylist ? '<span aria-hidden="true">←</span>' : ""
    ));
    if (pageState.album === "durga") {
      items.push(makeButton("Open Mahalaya", "disc-button mahayala-button", "open-mahalaya", [4.5, 46.1, 44.5, 22.3]));
      items.push(makeButton("Open Durga songs", "disc-button durga-play-button", "open-durga-songs", [50.8, 46.1, 44.5, 22.3]));
    }
  }
  if (includeNavigation) items.push(navigation());
  return items.join("");
}

function render() {
  const image = screenImage();
  const alt = {
    home: "Pujo Radio home screen",
    songs: "Pujo Radio songs screen",
    countdown: "Pujo Radio countdown screen",
    dj: "OG Bhashan DJ",
    mahalaya: "Mahalaya",
    durga: "Durga songs",
    playlist: pageState.album === "kali" ? "Kali playlist" : "Durga Puja playlist screen"
  }[pageState.name];
  page.dataset.page = pageState.name;
  document.body.dataset.page = pageState.name;
  clearInterval(countdownInterval);
  const countdowns = pageState.name === "countdown"
    ? `${eventCountdown("sasthi", "Durga Sasthi")}${durgaSasthiReminderButton()}${eventCountdown("kali", "Kali Puja")}${kaliPujaReminderButton()}`
    : "";
  const screenContent = pageState.name === "songs"
    ? `<div class="songs-scroll-area" aria-label="Song playlists"><div class="songs-scroll-content"><img class="screen-art" src="${encodeURI(image)}" alt="${alt}" draggable="false" />${hotspots(false, false, false)}</div></div>${themeToggle()}${shareButton()}${navigation()}`
    : `<img class="screen-art" src="${encodeURI(image)}" alt="${alt}" draggable="false" />${pageState.name === "home" ? '<img class="home-logo" src="og%20logo.png" alt="OG Pujo Player" draggable="false" /><img class="home-center-logo" src="fontbig.png" alt="OG Pujo Player" draggable="false" />' : ""}${pageState.name === "dj" ? `<div class="dj-light-effects" aria-hidden="true"><span class="dj-stage-light dj-stage-light-1"></span><span class="dj-stage-light dj-stage-light-2"></span><span class="dj-stage-light dj-stage-light-3"></span><span class="dj-stage-light dj-stage-light-4"></span><span class="dj-stage-light dj-stage-light-5"></span><span class="dj-stage-light dj-stage-light-6"></span></div><button class="dj-light-toggle${pageState.djLightsOn ? " is-on" : ""}" type="button" data-action="dj-lights-toggle" aria-label="Turn disco lights ${pageState.djLightsOn ? "off" : "on"}" aria-pressed="${pageState.djLightsOn}" title="Turn disco lights ${pageState.djLightsOn ? "off" : "on"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6m-5 3h4m-2-20a7 7 0 0 0-4.4 12.45c.9.74 1.4 1.52 1.4 2.55h6c0-1.03.5-1.81 1.4-2.55A7 7 0 0 0 12 1Z"/></svg></button>` : ""}${pageState.name === "mahalaya" ? mahalayaReminderButton() : ""}${countdowns}${hotspots()}`;
  page.innerHTML = screenContent;
  page.classList.toggle("dj-lights-on", pageState.name === "dj" && pageState.djLightsOn);
  updatePlaylistSongSearch("durga");
  updatePlaylistSongSearch("kali");
  updatePlaylistSongSearch("dj");
  updatePlayerUi();
  if (pageState.name === "countdown") {
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }
  const title = pageState.name === "playlist"
    ? `${pageState.album === "kali" ? "Kali" : "Durga"} playlist`
    : pageState.name === "dj" ? "OG Bhashan DJ"
    : pageState.name === "durga" ? "Durga songs"
    : pageState.name[0].toUpperCase() + pageState.name.slice(1);
  document.title = `${title} | Pujo Radio`;
}

function navigate(name) {
  pageState.name = name;
  pageThemeOverride = null;
  if (name === "dj") pageState.djLightsOn = false;
  render();
  updateMahalayaNotice();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function setTheme() {
  const activeTheme = currentTheme();
  const nextTheme = activeTheme === "day" ? "night" : "day";
  const isNightDefaultPage = pageState.name === "dj" || (pageState.name === "playlist" && pageState.album === "kali");
  if (isNightDefaultPage) {
    pageThemeOverride = nextTheme;
  } else {
    theme = nextTheme;
    localStorage.setItem(themeKey, theme);
  }
  const screenArt = page.querySelector(".screen-art");
  if (screenArt) screenArt.src = encodeURI(screenImage());
  const toggle = page.querySelector('[data-action="theme"]');
  if (toggle) {
    const displayedTheme = currentTheme();
    const switchToTheme = displayedTheme === "day" ? "night" : "day";
    toggle.textContent = displayedTheme === "day" ? "☾" : "☀";
    toggle.setAttribute("aria-label", `Switch to ${switchToTheme} mode`);
    toggle.title = `Switch to ${switchToTheme} mode`;
  }
}

page.addEventListener("click", event => {
  const guideButton = event.target.closest('[data-action="open-mahalaya-guide"]');
  if (guideButton) {
    document.querySelector("#mahalaya-guide").showModal();
    return;
  }
  const calendarReminderButton = event.target.closest("[data-calendar-reminder]");
  if (calendarReminderButton) {
    const festival = calendarReminderFestivals.find(item => item.id === calendarReminderButton.dataset.calendarReminder);
    if (festival) saveFestivalRemindersToGoogleCalendar(festival, calendarReminderButton);
    return;
  }
  const trackOption = event.target.closest("[data-play-track]");
  if (trackOption) {
    selectTrack(trackOption.dataset.playlist, Number(trackOption.dataset.playTrack));
    return;
  }
  const libraryToggle = event.target.closest("[data-library-playlist]");
  if (libraryToggle) {
    const playlistKey = libraryToggle.dataset.libraryPlaylist;
    pageState[`${playlistKey}LibraryCollapsed`] = !pageState[`${playlistKey}LibraryCollapsed`];
    const libraryCollapsed = pageState[`${playlistKey}LibraryCollapsed`];
    const picker = page.querySelector(`.audio-surface-picker-${playlistKey}`);
    const toggle = page.querySelector(`[data-library-playlist="${playlistKey}"]`);
    const content = picker.querySelector(".audio-library-content");
    picker.classList.toggle("audio-library-collapsed", libraryCollapsed);
    content.setAttribute("aria-hidden", String(libraryCollapsed));
    content.inert = libraryCollapsed;
    toggle.setAttribute("aria-label", libraryCollapsed ? "Open song library" : "Hide song library");
    toggle.setAttribute("aria-expanded", String(!libraryCollapsed));
    toggle.title = libraryCollapsed ? "Open song library" : "Hide song library";
    return;
  }
  const playerButton = event.target.closest("[data-player-control]");
  if (playerButton) {
    handlePlayerControl(playerButton.dataset.playerControl);
    return;
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (["home", "songs", "countdown"].includes(action)) return navigate(action);
  if (action === "dj-lights-toggle") {
    pageState.djLightsOn = !pageState.djLightsOn;
    const lightsEnabled = pageState.djLightsOn;
    page.classList.toggle("dj-lights-on", lightsEnabled);
    button.classList.toggle("is-on", lightsEnabled);
    button.setAttribute("aria-pressed", String(lightsEnabled));
    button.setAttribute("aria-label", `Turn disco lights ${lightsEnabled ? "off" : "on"}`);
    button.title = `Turn disco lights ${lightsEnabled ? "off" : "on"}`;
    return;
  }
  if (action === "theme") return setTheme();
  if (action === "open-share-menu") {
    if (shareMenu.open) {
      shareMenu.close();
      return;
    }
    const bounds = button.getBoundingClientRect();
    shareMenu.style.top = `${bounds.bottom + 8}px`;
    shareMenu.style.right = `${Math.max(16, window.innerWidth - bounds.right)}px`;
    shareMenu.show();
    void copyShareUrl();
    return;
  }
  if (action === "back-playlist") return navigate("playlist");
  if (action === "open-durga-songs") return navigate("durga");
  if (action === "open-durga") {
    pageState.album = "durga";
    return navigate("playlist");
  }
  if (action === "open-kali") {
    pageState.album = "kali";
    return navigate("playlist");
  }
  if (action === "open-kali-playlist") {
    pageState.album = "kali";
    return navigate("playlist");
  }
  if (action === "open-dj") return navigate("dj");
  if (action === "open-mahalaya") return navigate("mahalaya");
});

page.addEventListener("input", event => {
  const playlistKey = event.target.dataset.searchPlaylist;
  if (!["durga", "kali", "dj"].includes(playlistKey)) return;
  pageState[`${playlistKey}Search`] = event.target.value;
  updatePlaylistSongSearch(playlistKey);
});

page.addEventListener("pointerdown", event => {
  const progress = event.target.closest("[data-player-progress]");
  if (!progress || !currentTrack() || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
  event.preventDefault();
  scrubbingPointerId = event.pointerId;
  progress.setPointerCapture(event.pointerId);
  seekToProgressPosition(progress, event.clientX);
});

page.addEventListener("pointermove", event => {
  if (event.pointerId !== scrubbingPointerId) return;
  const progress = page.querySelector("[data-player-progress]");
  if (progress) seekToProgressPosition(progress, event.clientX);
});

function finishScrubbing(event) {
  if (event.pointerId !== scrubbingPointerId) return;
  scrubbingPointerId = null;
}

page.addEventListener("pointerup", finishScrubbing);
page.addEventListener("pointercancel", finishScrubbing);
page.addEventListener("keydown", event => {
  const progress = event.target.closest("[data-player-progress]");
  if (!progress || !currentTrack() || !Number.isFinite(audio.duration)) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -5 : 5;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta));
    updatePlayerUi();
  } else if (event.key === "Home") {
    event.preventDefault();
    audio.currentTime = 0;
    updatePlayerUi();
  } else if (event.key === "End") {
    event.preventDefault();
    audio.currentTime = audio.duration;
    updatePlayerUi();
  }
});

render();