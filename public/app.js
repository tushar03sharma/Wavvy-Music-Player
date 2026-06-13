const audio = document.getElementById('audioEl');
let tracks = [], queue = [], qIdx = -1, shuffle = false, repeat = false;
let availableSources = [];

// ─── Initialize: Get available sources ─────────────────────────────────────────
async function initSources() {
  try {
    const res = await fetch('/sources');
    const data = await res.json();
    availableSources = data.sources || [];
    console.log('Available music sources:', availableSources);
  } catch (err) {
    console.warn('Could not load available sources', err);
    availableSources = [];
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmt(s) {
  s = Math.floor(s || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

function setFill(el) {
  const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty('--pct', pct + '%');
}

// ─── Search ───────────────────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;

  document.getElementById('resultsArea').innerHTML = '<div class="loading">⏳ Searching…</div>';

  try {
    const sourceOrder = availableSources.length 
      ? availableSources.join(',')
      : 'deezer,spotify,local';
    
    const res = await fetch(`/search?q=${encodeURIComponent(q)}&source=${sourceOrder}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);
    tracks = data.results || [];
    renderResults();
  } catch (err) {
    document.getElementById('resultsArea').innerHTML =
      `<div class="err-msg">⚠️ ${err.message}<br><small>Try a different search or enable Spotify in settings</small></div>`;
  }
}

function renderResults() {
  const el = document.getElementById('resultsArea');
  if (!tracks.length) { el.innerHTML = '<div class="err-msg">No results found.</div>'; return; }

  const curId = queue[qIdx]?.id;
  el.innerHTML = `<div class="results-label">${tracks.length} results</div>`;

  tracks.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'track-row' + (t.id === curId ? ' active' : '');
    
    const sourceBadge = t.source ? `<span class="source-badge">${t.source}</span>` : '';
    const previewNote = ['spotify', 'deezer'].includes(t.source) 
      ? '<span class="preview-note">30s preview</span>' 
      : '';
    
    row.innerHTML = `
      <img class="tr-thumb" src="${t.thumbnail}" alt="" onerror="this.style.opacity=0" />
      <div class="tr-info">
        <div class="tr-title">${t.title}</div>
        <div class="tr-artist">${t.artist}</div>
        <div style="font-size: 10px; color: var(--muted); margin-top: 3px;">
          ${sourceBadge}${previewNote}
        </div>
      </div>
      <span class="tr-dur">${fmt(t.duration)}</span>
      <button class="add-q" title="Add to queue" onclick="addToQueue(${i});event.stopPropagation()">+</button>
    `;
    row.addEventListener('click', () => playNow(i));
    el.appendChild(row);
  });
}

// ─── Playback ─────────────────────────────────────────────────────────────────
function playNow(idx) {
  const t = tracks[idx];
  queue.unshift(t);
  qIdx = 0;
  loadAndPlay();
}

function addToQueue(idx) {
  const t = tracks[idx];
  if (queue.find(q => q.id === t.id)) { toast('Already in queue'); return; }
  queue.push(t);
  if (qIdx === -1) { qIdx = 0; loadAndPlay(); }
  else { renderQueue(); toast(`Added: ${t.title.slice(0, 28)}…`); }
}

function loadAndPlay() {
  const t = queue[qIdx];
  if (!t) return;

  if (t.preview) {
    audio.src = t.preview;
  } else {
    audio.src = `/stream?id=${t.id}&source=${t.source || 'deezer'}`;
  }
  
  audio.volume = parseFloat(document.getElementById('volBar').value);
  audio.play();

  updateNowPlaying(t);
  renderQueue();
  renderResults();
}

function updateNowPlaying(t) {
  document.getElementById('nowTitle').textContent = t.title;
  document.getElementById('nowArtist').textContent = t.artist;
  document.getElementById('pbTitle').textContent = t.title;
  document.getElementById('pbArtist').textContent = t.artist;

  const artWrap = document.getElementById('nowArtWrap');
  if (t.thumbnail) {
    const img = document.createElement('img');
    img.className = 'now-art spinning playing';
    img.id = 'nowArtWrap';
    img.src = t.thumbnail;
    img.alt = '';
    artWrap.replaceWith(img);

    const pbWrap = document.getElementById('pbThumbWrap');
    pbWrap.outerHTML = `<img id="pbThumbWrap" class="pb-thumb" src="${t.thumbnail}" alt="" />`;
  }

  document.title = `▶ ${t.title} — Wavvy`;
}

function togglePlay() {
  if (!queue.length) return;
  audio.paused ? audio.play() : audio.pause();
}

function nextTrack() {
  if (!queue.length) return;
  qIdx = shuffle
    ? Math.floor(Math.random() * queue.length)
    : (qIdx + 1) % queue.length;
  loadAndPlay();
}

function prevTrack() {
  if (!queue.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  qIdx = (qIdx - 1 + queue.length) % queue.length;
  loadAndPlay();
}

function seekTo(v) { audio.currentTime = parseFloat(v); }
function setVol(v) { audio.volume = parseFloat(v); setFill(document.getElementById('volBar')); }
function toggleShuffle() { shuffle = !shuffle; document.getElementById('shuffleBtn').classList.toggle('on', shuffle); }
function toggleRepeat() { repeat = !repeat; document.getElementById('repeatBtn').classList.toggle('on', repeat); }

function clearQueue() {
  queue = []; qIdx = -1;
  audio.pause(); audio.src = '';
  document.getElementById('nowTitle').textContent = 'Nothing playing yet';
  document.getElementById('nowArtist').textContent = 'Search a song to start';
  document.getElementById('pbTitle').textContent = '—';
  document.getElementById('pbArtist').textContent = '—';
  document.getElementById('progBar').value = 0;
  document.getElementById('tEl').textContent = '0:00';
  document.title = 'Wavvy';
  renderQueue();
}

function renderQueue() {
  document.getElementById('qCount').textContent = queue.length;
  const el = document.getElementById('queueList');
  if (!queue.length) { el.innerHTML = '<div class="q-empty">Queue is empty.</div>'; return; }
  el.innerHTML = '';
  queue.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'q-item' + (i === qIdx ? ' cur' : '');
    d.innerHTML = `
      <img src="${t.thumbnail}" alt="" onerror="this.style.opacity=0" />
      <div class="qi-info">
        <div class="qi-n">${t.title}</div>
        <div class="qi-a">${t.artist}</div>
      </div>
      <span class="q-idx">${i === qIdx ? '▶' : i + 1}</span>
    `;
    d.onclick = () => { qIdx = i; loadAndPlay(); };
    el.appendChild(d);
  });
}

// ─── Audio event listeners ────────────────────────────────────────────────────
audio.addEventListener('timeupdate', () => {
  const c = audio.currentTime, d = audio.duration || 0;
  if (d > 0) {
    const bar = document.getElementById('progBar');
    bar.max = d;
    bar.value = c;
    setFill(bar);
    document.getElementById('tEl').textContent = fmt(c);
    document.getElementById('tDur').textContent = fmt(d);
  }
  document.getElementById('playBtn').textContent = audio.paused ? '▶' : '⏸';
  const art = document.getElementById('nowArtWrap');
  if (art?.classList) {
    audio.paused ? art.classList.remove('playing') : art.classList.add('playing');
  }
});

audio.addEventListener('ended', () => {
  if (repeat) { audio.currentTime = 0; audio.play(); return; }
  if (qIdx < queue.length - 1) nextTrack();
  else document.getElementById('playBtn').textContent = '▶';
});

audio.addEventListener('pause', () => { document.getElementById('playBtn').textContent = '▶'; });
audio.addEventListener('play', () => { document.getElementById('playBtn').textContent = '⏸'; });

// Init volume fill and load sources
setFill(document.getElementById('volBar'));
initSources();
