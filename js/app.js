// js/app.js - Main Interactive Application Logic

// =========================================================================
// 💖 PENGATURAN PROFIL PASANGAN KITA 💖
// Kamu bisa mengubah nama, tanggal jadian, dan ulang tahun langsung di sini:
// =========================================================================
const COUPLE_CONFIG = {
  myName: 'Rifai Ganteng',            // Nama kamu
  herName: 'Anggunly',             // Nama pacar
  startDate: '2026-01-10',     // Tanggal jadian (Format: TTTT-BB-HH)
  birthdayDate: '2006-08-27',   // Tanggal ulang tahun pacar (Format: TTTT-BB-HH)
  herPasscode: '1001',          // Sandi untuk Anggunly (1001 / 10012026 / anggun)
  adminPasscode: 'rifai123'     // Sandi untuk Rifai Admin (rifai123 / rifai)
};

// 🎟️ Love Coupons List
const AVAILABLE_COUPONS = [
  { id: 'c1', title: 'Free Pijat & Manja', desc: 'Berlaku kapan saja saat kamu capek', icon: '💆‍♀️' },
  { id: 'c2', title: 'Dinner Romantis Favorit Kamu', desc: 'Bebas pilih menu & tempat makan favorit', icon: '🍽️' },
  { id: 'c3', title: 'Movie Date & Popcorn', desc: 'Bebas pilih film apapun yang ingin ditonton bareng', icon: '🍿' },
  { id: 'c4', title: 'Peluk & Dengerin Curhat Sepuasnya', desc: 'Tanpa interupsi & batas waktu untukmu', icon: '🤗' },
  { id: 'c5', title: 'Ice Cream & Sweet Treats', desc: 'Bebas jajan es krim & dessert manis sepuasnya', icon: '🍦' },
  { id: 'c6', title: 'Wishlist Shopping Day', desc: 'Wujudkan 1 keinginan belanja spesial dari Rifai', icon: '🛍️' }
];

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Synchronous Application State (Initialized from COUPLE_CONFIG)
  const state = {
    myName: COUPLE_CONFIG.myName,
    herName: COUPLE_CONFIG.herName,
    startDate: COUPLE_CONFIG.startDate,
    birthdayDate: COUPLE_CONFIG.birthdayDate,
    currentFilter: 'all',
    selectedCalDate: null,
    calViewDate: new Date(),
    memories: [],
    uploadedFileBlob: null,
    uploadedFileUrl: null,
    uploadedFileType: 'photo',
    activeObjectUrls: [],
    customTracks: [],
    currentUserRole: sessionStorage.getItem('mv_auth_role') || null,
    claimedCoupons: []
  };

  // Helper default dates
  function getPresetStartDate() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().split('T')[0];
  }

  function getPresetBdayDate() {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 14 days from now as default
    return d.toISOString().split('T')[0];
  }

  // Helper: Convert Base64 data string to Native Blob for legacy videos
  function base64ToBlob(base64Data) {
    try {
      if (!base64Data || !base64Data.includes(';base64,')) return null;
      const parts = base64Data.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'video/mp4';
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      return new Blob([uInt8Array], { type: contentType });
    } catch (e) {
      console.warn('Base64 to Blob conversion error:', e);
      return null;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 2. Setup ALL UI Elements & Listeners IMMEDIATELY (Zero Milliseconds Latency)
  initBackgroundCanvas();
  initRomanticLogin();
  updateProfileDisplays();
  initTogetherCounter();
  initBirthdayCountdown();
  initMusicPlayer();
  initModals();
  initUploadForm();
  initOpenWhenLetters();
  initBirthdayCelebration();

  // Expose as globals so they can always be called from outside
  window.renderCalendar = () => renderCalendar();
  window.renderGallery = () => renderGallery();

  // Render calendar and gallery immediately with current state
  renderCalendar();
  renderGallery();

  // 3. Initialize Database & Sync Data in Background
  try {
    await window.memoryDB.init();

    // Prioritize COUPLE_CONFIG defined directly in code
    state.myName = COUPLE_CONFIG.myName;
    state.herName = COUPLE_CONFIG.herName;
    state.startDate = COUPLE_CONFIG.startDate;
    state.birthdayDate = COUPLE_CONFIG.birthdayDate;
    state.customTracks = (await window.memoryDB.getSetting('playlist', [])) || [];
    state.claimedCoupons = (await window.memoryDB.getSetting('claimed_coupons', [])) || [];

    // Save active couple config to database
    await window.memoryDB.setSetting('myName', state.myName);
    await window.memoryDB.setSetting('herName', state.herName);
    await window.memoryDB.setSetting('startDate', state.startDate);
    await window.memoryDB.setSetting('bdayDate', state.birthdayDate);

    window.romanticAudio.setPlaylist(state.customTracks);
    renderPlaylistUI();
    renderCouponsGrid();
    renderAdminCouponsList();
    updateProfileDisplays();
    initTogetherCounter();
    initBirthdayCountdown();

    await cleanLegacyDummyMemories();
    await refreshMemories();
    renderCalendar();
  } catch (err) {
    console.warn('Database initialization warning:', err);
    await refreshMemories();
    renderCalendar();
  }

  // --- Profile & Names Update ---
  function updateProfileDisplays() {
    const displayNames = document.getElementById('display-couple-names');
    const brandText = document.getElementById('nav-brand-text');
    const celebrantName = document.getElementById('bday-celebrant-name');
    const cloudBadge = document.getElementById('cloud-status-badge');

    if (displayNames) displayNames.innerHTML = `${state.myName} &amp; ${state.herName}`;
    if (brandText) brandText.textContent = `${state.myName} & ${state.herName}'s Vault`;
    if (celebrantName) celebrantName.textContent = state.herName;

    // Fill settings inputs
    const myNameInput = document.getElementById('setting-my-name');
    const herNameInput = document.getElementById('setting-her-name');
    const startDateInput = document.getElementById('setting-start-date');
    const bdayDateInput = document.getElementById('setting-bday-date');
    const supabaseUrlInput = document.getElementById('setting-supabase-url');
    const supabaseKeyInput = document.getElementById('setting-supabase-key');

    if (myNameInput) myNameInput.value = state.myName;
    if (herNameInput) herNameInput.value = state.herName;
    if (startDateInput) startDateInput.value = state.startDate;
    if (bdayDateInput) bdayDateInput.value = state.birthdayDate;
    if (supabaseUrlInput) supabaseUrlInput.value = window.memoryDB.supabaseUrl || '';
    if (supabaseKeyInput) supabaseKeyInput.value = window.memoryDB.supabaseKey || '';

    if (cloudBadge) {
      if (window.memoryDB.isCloudEnabled) {
        cloudBadge.textContent = '🟢 Terhubung ke Supabase Cloud';
        cloudBadge.style.background = '#e6fcf5';
        cloudBadge.style.color = '#0ca678';
      } else {
        cloudBadge.textContent = '⚪ Offline / Penyimpanan Lokal';
        cloudBadge.style.background = '#f1f3f5';
        cloudBadge.style.color = '#868e96';
      }
    }
  }

  // --- Background Particle Canvas (Floating Hearts & Stars) ---
  function initBackgroundCanvas() {
    const canvas = document.getElementById('particles-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 35;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 8 + 6,
        speedY: Math.random() * 0.4 + 0.2,
        speedX: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * 0.02 + 0.01,
        type: Math.random() > 0.4 ? 'heart' : 'sparkle'
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.y -= p.speedY;
        p.x += p.speedX;
        p.alpha += Math.sin(Date.now() * 0.002) * 0.005;

        if (p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(0.65, p.alpha));

        if (p.type === 'heart') {
          ctx.fillStyle = '#ff8e9e';
          ctx.translate(p.x, p.y);
          ctx.beginPath();
          const top = p.size * 0.3;
          ctx.moveTo(0, top);
          ctx.bezierCurveTo(0, 0, -p.size / 2, 0, -p.size / 2, top);
          ctx.bezierCurveTo(-p.size / 2, (p.size + top) / 2, 0, p.size, 0, p.size);
          ctx.bezierCurveTo(0, p.size, p.size / 2, (p.size + top) / 2, p.size / 2, top);
          ctx.bezierCurveTo(p.size / 2, 0, 0, 0, 0, top);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      requestAnimationFrame(render);
    }

    render();
  }

  // --- Live Relationship Counter ---
  function initTogetherCounter() {
    function updateCounter() {
      if (!state.startDate) return;
      const start = new Date(state.startDate + 'T00:00:00');
      const now = new Date();
      const diffMs = now - start;

      if (diffMs < 0) {
        document.getElementById('cnt-days').textContent = '0';
        document.getElementById('cnt-hours').textContent = '0';
        document.getElementById('cnt-mins').textContent = '0';
        document.getElementById('cnt-secs').textContent = '0';
        return;
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSecs / (3600 * 24));
      const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      document.getElementById('cnt-days').textContent = days;
      document.getElementById('cnt-hours').textContent = hours;
      document.getElementById('cnt-mins').textContent = mins;
      document.getElementById('cnt-secs').textContent = secs;
    }

    updateCounter();
    setInterval(updateCounter, 1000);
  }

  // --- Birthday Countdown & Special Event Banner ---
  function initBirthdayCountdown() {
    function updateBday() {
      if (!state.birthdayDate) return;
      const now = new Date();
      const bdayInput = new Date(state.birthdayDate);

      // Calculate next birthday date this year or next year
      let nextBday = new Date(now.getFullYear(), bdayInput.getMonth(), bdayInput.getDate(), 0, 0, 0);
      if (nextBday < now && (now - nextBday) > 24 * 3600 * 1000) {
        nextBday.setFullYear(now.getFullYear() + 1);
      }

      const diffMs = nextBday - now;
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isToday = now.getMonth() === bdayInput.getMonth() && now.getDate() === bdayInput.getDate();

      const bannerTitle = document.getElementById('bday-banner-title');
      const bannerSubtitle = document.getElementById('bday-banner-subtitle');
      const countdownBadgeText = document.getElementById('bday-countdown-text');
      const bannerBox = document.getElementById('birthday-banner-box');

      if (isToday) {
        if (bannerTitle) bannerTitle.innerHTML = `🎉 HARI INI ULANG TAHUN ${state.herName.toUpperCase()}! 🎂`;
        if (bannerSubtitle) bannerSubtitle.textContent = 'Klik untuk membuka pesta kejutan & tiup lilin spesial!';
        if (countdownBadgeText) countdownBadgeText.textContent = '🎁 BUKA KEJUTAN SEKARANG!';
        if (bannerBox) bannerBox.style.borderColor = '#ff477e';
      } else if (daysLeft > 0) {
        if (bannerTitle) bannerTitle.innerHTML = `Hitung Mundur Ulang Tahun ${state.herName} Tercinta 🎉`;
        if (bannerSubtitle) bannerSubtitle.textContent = `Menghitung hari menuju perayaan spesial tanggal ${bdayInput.getDate()} ${bdayInput.toLocaleString('id-ID', { month: 'long' })}`;
        if (countdownBadgeText) countdownBadgeText.textContent = `🎁 ${daysLeft} Hari Lagi`;
      }
    }

    updateBday();
    setInterval(updateBday, 60000);
  }

  // --- Advanced Floating Music Player & Playlist Controller (Bottom-Left) ---
  async function initMusicPlayer() {
    const musicFabBtn = document.getElementById('music-fab-btn');
    const floatingPlaylistCard = document.getElementById('floating-playlist-card');
    const closePlaylistBtn = document.getElementById('close-floating-playlist');
    const playPauseBtn = document.getElementById('music-play-pause-btn');
    const quickAddBtn = document.getElementById('playlist-add-quick-btn');

    // Initialize playlist in audio player
    window.romanticAudio.setPlaylist(state.customTracks);

    // Render Playlist UI in dropdown and settings
    renderPlaylistUI();

    // Global function for instant toggle
    window.togglePlaylistCard = function (e) {
      if (e) e.stopPropagation();
      const card = document.getElementById('floating-playlist-card');
      if (card) {
        card.classList.toggle('active');
      }
    };

    // Toggle Floating Playlist Drawer on Click FAB
    if (musicFabBtn && floatingPlaylistCard) {
      musicFabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.togglePlaylistCard(e);
      });
    }

    // Close Playlist Drawer
    if (closePlaylistBtn && floatingPlaylistCard) {
      closePlaylistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        floatingPlaylistCard.classList.remove('active');
      });
    }

    // Play/Pause button inside the playlist card header
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.romanticAudio.toggle();
        renderPlaylistUI();
      });
    }

    // Toggle Add Song Box inside Playlist Card
    const toggleAddBoxBtn = document.getElementById('toggle-add-song-box-btn');
    const addSongBox = document.getElementById('add-song-collapsible-box');
    if (toggleAddBoxBtn && addSongBox) {
      toggleAddBoxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = addSongBox.style.display === 'none';
        addSongBox.style.display = isHidden ? 'block' : 'none';
        toggleAddBoxBtn.innerHTML = isHidden ? '<span>✕</span> Tutup Form' : '<span>+</span> Tambah Lagu Baru';
      });
    }

    // Close playlist drawer when clicking outside
    document.addEventListener('click', (e) => {
      if (floatingPlaylistCard && floatingPlaylistCard.classList.contains('active')) {
        if (!floatingPlaylistCard.contains(e.target) && !musicFabBtn.contains(e.target)) {
          floatingPlaylistCard.classList.remove('active');
        }
      }
    });

    // Handle Adding New Song in Playlist Card
    const addSongBtn = document.getElementById('add-song-to-playlist-btn');
    const songTitleInput = document.getElementById('new-song-title');
    const songFileInput = document.getElementById('new-song-file');
    const uploadMusicIndicator = document.getElementById('upload-music-indicator');

    if (addSongBtn && songFileInput) {
      addSongBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const file = songFileInput.files[0];
        if (!file) {
          alert('Silakan pilih file musik (MP3) terlebih dahulu!');
          return;
        }

        const songTitle = (songTitleInput ? songTitleInput.value.trim() : '') || file.name.replace(/\.[^/.]+$/, '');

        if (uploadMusicIndicator) {
          uploadMusicIndicator.style.display = 'block';
          uploadMusicIndicator.textContent = window.memoryDB.isCloudEnabled ? '⏳ Mengunggah ke Supabase Cloud...' : '⏳ Menyimpan lagu...';
        }
        addSongBtn.disabled = true;

        try {
          let songUrl = null;
          if (window.memoryDB.isCloudEnabled) {
            songUrl = await window.memoryDB.uploadFileToStorage(file);
          }

          if (!songUrl) {
            songUrl = URL.createObjectURL(file);
          }

          const newTrack = {
            id: Date.now().toString(),
            title: songTitle,
            artist: state.myName || 'Kita Berdua',
            url: songUrl
          };

          state.customTracks.push(newTrack);
          await window.memoryDB.setSetting('playlist', state.customTracks);

          window.romanticAudio.setPlaylist(state.customTracks);
          renderPlaylistUI();

          // Reset inputs and hide form
          if (songTitleInput) songTitleInput.value = '';
          songFileInput.value = '';
          if (addSongBox) addSongBox.style.display = 'none';
          if (toggleAddBoxBtn) toggleAddBoxBtn.innerHTML = '<span>+</span> Tambah Lagu Baru';

          window.confetti.burst({ count: 30 });
        } catch (err) {
          console.error('Error adding song to playlist:', err);
          alert('Gagal menambahkan lagu: ' + err.message);
        } finally {
          if (uploadMusicIndicator) uploadMusicIndicator.style.display = 'none';
          addSongBtn.disabled = false;
        }
      });
    }
  }

  // Render Playlist UI in dropdown and settings modal
  function renderPlaylistUI() {
    const dropdownList = document.getElementById('playlist-items-list');
    const countLabel = document.getElementById('playlist-count-label');

    const allTracks = window.romanticAudio.playlist || [];

    if (countLabel) {
      countLabel.textContent = `${allTracks.length} Lagu`;
    }

    // 1. Render in Floating Playlist Card
    if (dropdownList) {
      dropdownList.innerHTML = '';
      allTracks.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'playlist-item' + (index === window.romanticAudio.currentIndex ? ' active' : '');
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1;">
            <span style="font-size: 1rem;">${track.isDefault ? '🎹' : '🎵'}</span>
            <div class="playlist-item-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="playlist-item-status">${index === window.romanticAudio.currentIndex ? '▶️' : ''}</span>
            ${!track.isDefault ? `<button type="button" class="btn-icon" data-delete-song="${track.id}" title="Hapus Lagu" style="width: 22px; height: 22px; font-size: 0.72rem; color: #e63946; background: #fff0f3; padding: 0;">🗑️</button>` : ''}
          </div>
        `;

        // Click to play song
        item.addEventListener('click', (e) => {
          if (e.target.closest('[data-delete-song]')) return;
          e.stopPropagation();
          window.romanticAudio.selectTrack(index);
          if (!window.romanticAudio.isPlaying) {
            window.romanticAudio.toggle();
          }
          renderPlaylistUI();
        });

        // Delete custom song handler
        const delBtn = item.querySelector(`[data-delete-song="${track.id}"]`);
        if (delBtn) {
          delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Hapus lagu "${track.title}" dari playlist?`)) {
              state.customTracks = state.customTracks.filter(t => t.id !== track.id);
              await window.memoryDB.setSetting('playlist', state.customTracks);
              window.romanticAudio.setPlaylist(state.customTracks);
              renderPlaylistUI();
            }
          });
        }

        dropdownList.appendChild(item);
      });
    }
  }

  // --- Clean Up Legacy Dummy / Sample Data ---
  async function cleanLegacyDummyMemories() {
    try {
      const existing = await window.memoryDB.getAllMemories();
      const dummyTitles = [
        'Kencan Pertama Kita di Kedai Kopi',
        'Piknik Senja di Tepi Pantai',
        'Kompilasi Momen Random & Lucu'
      ];
      for (const m of existing) {
        if (dummyTitles.includes(m.title) || (typeof m.mediaUrl === 'string' && m.mediaUrl.startsWith('data:image/svg+xml'))) {
          await window.memoryDB.deleteMemory(m.id);
        }
      }
    } catch (e) {
      console.warn('Dummy cleanup notice:', e);
    }
  }

  // --- Render Memories Grid ---
  async function refreshMemories() {
    const rawMemories = await window.memoryDB.getAllMemories();

    const dummyTitles = [
      'Kencan Pertama Kita di Kedai Kopi',
      'Piknik Senja di Tepi Pantai',
      'Kompilasi Momen Random & Lucu'
    ];

    // Instant filter out any legacy dummy samples
    const realMemories = rawMemories.filter(m => {
      if (dummyTitles.includes(m.title)) return false;
      if (typeof m.mediaUrl === 'string' && m.mediaUrl.startsWith('data:image/svg+xml')) return false;
      return true;
    });

    // Revoke old object URLs to prevent memory leaks
    state.activeObjectUrls.forEach(url => {
      try { URL.revokeObjectURL(url); } catch (e) { }
    });
    state.activeObjectUrls = [];

    // Process Blobs into playable URLs with auto-migration for legacy base64
    state.memories = realMemories.map(m => {
      let resolvedUrl = m.mediaUrl;

      if (m.mediaBlob instanceof Blob) {
        resolvedUrl = URL.createObjectURL(m.mediaBlob);
        state.activeObjectUrls.push(resolvedUrl);
      } else if (typeof m.mediaUrl === 'string' && m.mediaUrl.startsWith('data:video/')) {
        // Convert existing Base64 video data to native Blob Object URL
        const blob = base64ToBlob(m.mediaUrl);
        if (blob) {
          resolvedUrl = URL.createObjectURL(blob);
          state.activeObjectUrls.push(resolvedUrl);
        }
      }

      return {
        ...m,
        mediaUrl: resolvedUrl
      };
    });

    renderGallery();
    renderCalendar();
  }

  function renderGallery() {
    const container = document.getElementById('memory-grid-container');
    if (!container) return;

    let filtered = state.memories;

    if (state.currentFilter === 'photo') {
      filtered = filtered.filter(m => m.type === 'photo');
    } else if (state.currentFilter === 'video') {
      filtered = filtered.filter(m => m.type === 'video');
    } else if (state.currentFilter === 'favorite') {
      filtered = filtered.filter(m => m.category === 'favorite');
    }

    if (state.selectedCalDate) {
      filtered = filtered.filter(m => m.date === state.selectedCalDate);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-memory-state">
          <div class="empty-icon">📸✨</div>
          <h3 style="font-family: var(--font-serif); color: var(--deep-wine); font-size: 1.35rem; margin-bottom: 8px;">Belum Ada Memori yang Diunggah</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 420px; margin: 0 auto 18px; line-height: 1.5;">
            Mulai abadikan momen-momen indah bersama <strong>${escapeHtml(state.herName)}</strong>! Klik tombol di bawah untuk mengunggah foto atau video kenangan pertama kalian.
          </p>
          <button type="button" class="btn-primary" id="empty-add-memory-btn" style="margin: 0 auto; padding: 10px 22px;">
            <span>+</span> Upload Memori Pertama
          </button>
        </div>
      `;

      const emptyBtn = document.getElementById('empty-add-memory-btn');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          const navAddBtn = document.getElementById('add-memory-nav-btn');
          if (navAddBtn) navAddBtn.click();
        });
      }
      return;
    }

    container.innerHTML = '';
    filtered.forEach(memory => {
      const card = document.createElement('div');
      card.className = 'polaroid-card';

      const tagLabels = {
        favorite: '⭐ Favorit',
        date: '☕ Kencan',
        trip: '✈️ Liburan',
        funny: '😂 Lucu',
        bday: '🎂 Ultah'
      };

      const tagText = tagLabels[memory.category] || '💖 Memori';
      const formattedDate = formatDateIndo(memory.date);

      let mediaHtml = '';
      if (memory.type === 'video') {
        mediaHtml = `
          <video class="polaroid-video" src="${memory.mediaUrl}" muted playsinline loop preload="metadata"></video>
          <div class="video-play-indicator" title="Klik untuk memutar video">▶️</div>
        `;
      } else {
        mediaHtml = `<img class="polaroid-img" src="${memory.mediaUrl}" alt="${escapeHtml(memory.title)}" loading="lazy">`;
      }

      card.innerHTML = `
        <div class="polaroid-media-wrap">
          ${mediaHtml}
          <div class="media-tag-badge">${tagText}</div>
        </div>
        <div class="polaroid-content">
          <div class="polaroid-date">
            <span>📅</span> ${formattedDate}
          </div>
          <h3 class="polaroid-title">${escapeHtml(memory.title)}</h3>
          <p class="polaroid-note">${escapeHtml(memory.note || '')}</p>
        </div>
      `;

      // Live Video Preview on Hover in Polaroid Card
      if (memory.type === 'video') {
        const videoEl = card.querySelector('.polaroid-video');
        const playBadge = card.querySelector('.video-play-indicator');
        if (videoEl) {
          card.addEventListener('mouseenter', () => {
            videoEl.play().then(() => {
              if (playBadge) playBadge.style.opacity = '0.25';
            }).catch(() => { });
          });
          card.addEventListener('mouseleave', () => {
            videoEl.pause();
            videoEl.currentTime = 0;
            if (playBadge) playBadge.style.opacity = '1';
          });
        }
      }

      card.addEventListener('click', () => openViewMemoryModal(memory));
      container.appendChild(card);
    });
  }

  // Helper date formatting
  function formatDateIndo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Filter Tabs ---
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.filter;
      state.selectedCalDate = null; // Reset date filter when switching tabs
      renderGallery();
    });
  });

  // --- Interactive Mini Calendar ---
  function renderCalendar() {
    const monthYearEl = document.getElementById('cal-month-year');
    const daysGrid = document.getElementById('cal-days-container');
    if (!monthYearEl || !daysGrid) return;

    const currentYear = state.calViewDate.getFullYear();
    const currentMonth = state.calViewDate.getMonth();

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    monthYearEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Map memory dates for fast check
    const memoryDateMap = new Set(state.memories.map(m => m.date));

    // First day of month (0 = Sun, 1 = Mon...)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const lastDayDate = new Date(currentYear, currentMonth + 1, 0).getDate();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    daysGrid.innerHTML = '';

    // Empty spaces before first day
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cal-day empty';
      daysGrid.appendChild(emptyCell);
    }

    // Month days
    for (let day = 1; day <= lastDayDate; day++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = day;

      const dayMonth = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const formattedIso = `${currentYear}-${dayMonth}-${dayStr}`;

      if (formattedIso === todayStr) {
        cell.classList.add('today');
      }

      if (memoryDateMap.has(formattedIso)) {
        cell.classList.add('has-memory');
      }

      if (state.selectedCalDate === formattedIso) {
        cell.classList.add('selected');
      }

      cell.addEventListener('click', () => {
        if (state.selectedCalDate === formattedIso) {
          state.selectedCalDate = null; // toggle off
        } else {
          state.selectedCalDate = formattedIso;
        }
        renderCalendar();
        renderGallery();
      });

      daysGrid.appendChild(cell);
    }
  }

  // Calendar Navigation
  document.getElementById('cal-prev-btn')?.addEventListener('click', () => {
    state.calViewDate.setMonth(state.calViewDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('cal-next-btn')?.addEventListener('click', () => {
    state.calViewDate.setMonth(state.calViewDate.getMonth() + 1);
    renderCalendar();
  });

  // --- Modals Management ---
  function initModals() {
    // Add Memory Modal
    const uploadModal = document.getElementById('upload-modal');
    const openAddBtn = document.getElementById('add-memory-nav-btn');
    const fabUploadBtn = document.getElementById('fab-upload-btn');
    const closeUploadBtn = document.getElementById('close-upload-modal');

    const openUpload = () => {
      document.getElementById('memory-date-input').value = new Date().toISOString().split('T')[0];
      uploadModal.classList.add('active');
    };

    if (openAddBtn) openAddBtn.addEventListener('click', openUpload);
    if (fabUploadBtn) fabUploadBtn.addEventListener('click', openUpload);
    if (closeUploadBtn) closeUploadBtn.addEventListener('click', () => uploadModal.classList.remove('active'));

    // View Memory Modal
    const viewModal = document.getElementById('view-memory-modal');
    const closeViewBtn = document.getElementById('close-view-modal');

    const closeViewModal = () => {
      const mediaContainer = document.getElementById('view-media-container');
      if (mediaContainer) {
        const videoEl = mediaContainer.querySelector('video');
        if (videoEl) {
          videoEl.pause();
          videoEl.removeAttribute('src');
          videoEl.load();
        }
        mediaContainer.innerHTML = '';
      }
      viewModal.classList.remove('active');
    };

    if (closeViewBtn) closeViewBtn.addEventListener('click', closeViewModal);

    // Settings Modal
    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-modal');

    if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => {
      updateProfileDisplays();
      settingsModal.classList.add('active');
    });
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

    // Settings Form Submit
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        state.myName = document.getElementById('setting-my-name').value.trim() || 'Rama';
        state.herName = document.getElementById('setting-her-name').value.trim() || 'Sasa';
        state.startDate = document.getElementById('setting-start-date').value;
        state.birthdayDate = document.getElementById('setting-bday-date').value;

        const supabaseUrl = document.getElementById('setting-supabase-url').value.trim();
        const supabaseKey = document.getElementById('setting-supabase-key').value.trim();

        // Update Cloud Database Config
        window.memoryDB.setCloudConfig(supabaseUrl, supabaseKey);

        await window.memoryDB.setSetting('myName', state.myName);
        await window.memoryDB.setSetting('herName', state.herName);
        await window.memoryDB.setSetting('startDate', state.startDate);
        await window.memoryDB.setSetting('bdayDate', state.birthdayDate);

        updateProfileDisplays();
        initTogetherCounter();
        initBirthdayCountdown();
        await refreshMemories();

        settingsModal.classList.remove('active');
        window.confetti.burst({ count: 40 });
      });
    }

    // Birthday Modal
    const bdayModal = document.getElementById('birthday-celebration-modal');
    const openBdayBtn = document.getElementById('open-birthday-modal-btn');
    const closeBdayBtn = document.getElementById('close-birthday-modal');

    if (openBdayBtn) {
      openBdayBtn.addEventListener('click', () => {
        bdayModal.classList.add('active');
        window.confetti.celebrate();
      });
    }
    if (closeBdayBtn) closeBdayBtn.addEventListener('click', () => bdayModal.classList.remove('active'));

    // Letter Modal
    const letterModal = document.getElementById('letter-modal');
    const closeLetterBtn = document.getElementById('close-letter-modal');
    if (closeLetterBtn) closeLetterBtn.addEventListener('click', () => letterModal.classList.remove('active'));

    // Close on background overlay click
    [uploadModal, viewModal, settingsModal, bdayModal, letterModal].forEach(modal => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (modal === viewModal) {
            closeViewModal();
          } else {
            modal.classList.remove('active');
          }
        }
      });
    });
  }

  // --- Upload Form Handling (Photos / Videos with Native Blob & Cloud Support) ---
  function initUploadForm() {
    const fileInput = document.getElementById('media-file-input');
    const dropzone = document.getElementById('file-dropzone');
    const previewBox = document.getElementById('file-preview-box');
    const placeholder = document.getElementById('dropzone-placeholder');
    const form = document.getElementById('memory-form');
    const statusIndicator = document.getElementById('upload-status-indicator');
    const submitBtn = document.getElementById('save-memory-submit-btn');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|ogg)$/i.test(file.name);
        state.uploadedFileType = isVideo ? 'video' : 'photo';
        state.uploadedFileBlob = file;

        if (state.uploadedFileUrl) {
          URL.revokeObjectURL(state.uploadedFileUrl);
        }
        state.uploadedFileUrl = URL.createObjectURL(file);

        previewBox.style.display = 'block';
        placeholder.style.display = 'none';

        if (isVideo) {
          previewBox.innerHTML = `
            <video src="${state.uploadedFileUrl}" controls playsinline preload="auto" style="max-height: 200px; width: 100%; border-radius: 8px; background: #000;"></video>
            <div style="font-size: 0.82rem; color: var(--primary-pink); font-weight: 600; margin-top: 6px;">🎥 Video terpilih: ${escapeHtml(file.name)} (${(file.size / (1024 * 1024)).toFixed(1)} MB)</div>
          `;
        } else {
          previewBox.innerHTML = `
            <img src="${state.uploadedFileUrl}" alt="Preview" style="max-height: 200px; width: 100%; object-fit: cover; border-radius: 8px;">
            <div style="font-size: 0.82rem; color: var(--primary-pink); font-weight: 600; margin-top: 6px;">📸 Foto terpilih: ${escapeHtml(file.name)}</div>
          `;
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('memory-title-input').value.trim();
        const date = document.getElementById('memory-date-input').value;
        const category = document.getElementById('memory-tag-select').value;
        const note = document.getElementById('memory-note-input').value.trim();

        if (statusIndicator) {
          statusIndicator.style.display = 'block';
          statusIndicator.textContent = window.memoryDB.isCloudEnabled ? '⏳ Mengunggah media ke Supabase Cloud...' : '⏳ Menyimpan memori...';
        }
        if (submitBtn) submitBtn.disabled = true;

        try {
          let mediaUrl = null;
          let mediaBlob = null;

          if (state.uploadedFileBlob) {
            if (window.memoryDB.isCloudEnabled) {
              // Upload to Supabase Storage
              mediaUrl = await window.memoryDB.uploadFileToStorage(state.uploadedFileBlob);
            }

            // If cloud upload wasn't used or failed, fallback to local Blob
            if (!mediaUrl) {
              mediaBlob = state.uploadedFileBlob;
            }
          } else {
            mediaUrl = createSvgPlaceholder(title, '#ff758c', note || 'Kenangan manis berdua');
          }

          const newMemory = {
            title,
            date,
            category,
            note,
            type: state.uploadedFileType,
            mediaBlob,
            mediaUrl
          };

          await window.memoryDB.addMemory(newMemory);
          await refreshMemories();

          // Reset Form
          form.reset();
          state.uploadedFileBlob = null;
          if (state.uploadedFileUrl) {
            URL.revokeObjectURL(state.uploadedFileUrl);
            state.uploadedFileUrl = null;
          }
          if (previewBox) {
            previewBox.style.display = 'none';
            previewBox.innerHTML = '';
          }
          if (placeholder) placeholder.style.display = 'block';

          document.getElementById('upload-modal').classList.remove('active');
          window.confetti.burst({ count: 60 });
        } catch (err) {
          console.error('Error saving memory:', err);
          alert('Terjadi kendala saat menyimpan: ' + err.message);
        } finally {
          if (statusIndicator) statusIndicator.style.display = 'none';
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  }

  // --- View Memory Modal Detail ---
  function openViewMemoryModal(memory) {
    const modal = document.getElementById('view-memory-modal');
    const mediaContainer = document.getElementById('view-media-container');
    const titleEl = document.getElementById('view-memory-title');
    const dateEl = document.getElementById('view-memory-date');
    const tagEl = document.getElementById('view-memory-tag');
    const noteEl = document.getElementById('view-memory-note');
    const deleteBtn = document.getElementById('delete-memory-btn');

    if (!modal || !mediaContainer) return;

    if (memory.type === 'video') {
      mediaContainer.innerHTML = `
        <video id="active-modal-video" src="${memory.mediaUrl}" controls playsinline preload="auto" style="max-height: 400px; width: 100%; max-width: 100%; border-radius: 8px; background: #000;"></video>
      `;
      const videoEl = document.getElementById('active-modal-video');
      if (videoEl) {
        videoEl.load();
        videoEl.play().catch(() => {
          // Normal: user can tap the native play button on the video player
        });

        videoEl.onerror = () => {
          console.warn('Video failed to load:', videoEl.error);
          const errorMsg = document.createElement('div');
          errorMsg.style.cssText = 'color: #ff6b8b; padding: 12px; font-size: 0.85rem; text-align: center; background: rgba(0,0,0,0.8); border-radius: 8px; margin-top: 6px;';
          errorMsg.innerHTML = '⚠️ Video dari unggahan sebelumnya memerlukan upload ulang dengan sistem baru atau format MP4 standar.';
          mediaContainer.appendChild(errorMsg);
        };
      }
    } else {
      mediaContainer.innerHTML = `<img src="${memory.mediaUrl}" alt="${escapeHtml(memory.title)}" style="max-height: 400px; max-width: 100%; object-fit: contain; border-radius: 8px;">`;
    }

    titleEl.textContent = memory.title;
    dateEl.textContent = '📅 ' + formatDateIndo(memory.date);
    tagEl.textContent = memory.category ? memory.category.toUpperCase() : 'MEMORI';
    noteEl.textContent = memory.note || 'Tidak ada catatan kenangan.';

    deleteBtn.onclick = async () => {
      if (confirm('Yakin ingin menghapus kenangan ini?')) {
        await window.memoryDB.deleteMemory(memory.id);
        const mediaCont = document.getElementById('view-media-container');
        if (mediaCont) mediaCont.innerHTML = '';
        modal.classList.remove('active');
        await refreshMemories();
      }
    };

    modal.classList.add('active');
  }

  // --- "Open When..." Virtual Envelopes ---
  function initOpenWhenLetters() {
    const lettersData = {
      1: {
        icon: '🥺',
        title: 'Buka Saat Kamu Lagi Kangen...',
        content: `Hai sayangku,\n\nKalau kamu lagi baca surat ini dan ngerasa kangen, ketahuilah bahwa di sini aku juga selalu mikirin kamu setiap detiknya.\n\nJarak atau kesibukan mungkin kadang bikin kita nggak bisa ketemu langsung, tapi rasa sayangku ke kamu nggak pernah berkurang sedikit pun. Ingat-ingat foto-foto lucu kita di galeri ya, dan kabari aku saat kamu senggang. Peluk hangat buat kamu dari jauh! ❤️`
      },
      2: {
        icon: '🌧️',
        title: 'Buka Saat Lagi Bad Mood atau Capek...',
        content: `Sayang,\n\nAku tahu hari ini mungkin terasa berat buat kamu. Nggak apa-apa ya kalau mau istirahat, kamu udah berjuang hebat banget hari ini!\n\nJangan dipendam sendirian ya. Nanti kalau kamu udah siap cerita, aku selalu siap mendengarkan semua keluh kesahmu tanpa menghakimi. Tarik napas panjang, minum air hangat, dan ingat ada aku yang selalu bangga sama kamu. Semangat bidadariku! ✨`
      },
      3: {
        icon: '✨',
        title: 'Buka Saat Kamu Merasa Insecure...',
        content: `Untuk perempuan paling istimewa,\n\nKadang pikiran kita suka jahat dan bikin kita meragukan diri sendiri. Tapi tolong ingat, di mataku kamu adalah sosok yang luar biasa cantik, baik hati, dan penuh kehangatan.\n\nKamu nggak perlu jadi sempurna untuk dicintai. Kamu apa adanya sudah lebih dari cukup untuk membuat hidupku begitu indah. Jangan pernah ragukan betapa berharganya dirimu ya! 💖`
      },
      4: {
        icon: '🎂',
        title: 'Buka Tepat di Hari Ulang Tahunmu 🎉',
        content: `HAPPY BIRTHDAY SAYANGKU! 🎂🎉✨\n\nSelamat bertambah usia untuk orang yang paling aku sayangi di dunia ini. Terima kasih sudah lahir dan membawa begitu banyak kebahagiaan dalam hidupku.\n\nSemoga semua cita-cita dan harapanmu terkabul di usia yang baru ini. Aku berdoa semoga kita bisa terus bersama merayakan ulang tahunmu di tahun-tahun berikutnya. I love you so much! ❤️`
      }
    };

    document.querySelectorAll('.envelope-item[data-letter-id]').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.letterId;
        const letter = lettersData[id];
        if (!letter) return;

        const modal = document.getElementById('letter-modal');
        document.getElementById('letter-modal-icon').textContent = letter.icon;
        document.getElementById('letter-modal-title').textContent = letter.title;
        document.getElementById('letter-modal-content').textContent = letter.content;
        document.getElementById('letter-modal-sender').textContent = `With all my love, ${state.myName} ❤️`;

        modal.classList.add('active');
        window.confetti.burst({ count: 50 });
      });
    });
  }

  // --- Interactive Birthday Celebration (Candle Blowing & Confetti) ---
  function initBirthdayCelebration() {
    const blowBtn = document.getElementById('blow-candles-btn');
    const flames = document.querySelectorAll('.candle-flame');

    if (blowBtn) {
      blowBtn.addEventListener('click', () => {
        flames.forEach(flame => flame.classList.add('blown'));
        blowBtn.innerHTML = '🎉 Lilin Berhasil Ditiup! Horeee!';
        blowBtn.disabled = true;
        blowBtn.style.background = '#06d6a0';

        // Play celebration fanfare confetti!
        window.confetti.celebrate();
        setTimeout(() => window.confetti.celebrate(), 800);
      });
    }

    // Click individual flame to extinguish
    flames.forEach(flame => {
      flame.addEventListener('click', () => {
        flame.classList.add('blown');
        window.confetti.burst({ count: 30 });
      });
    });

    initCouponsSystem();
  }

  // =========================================================
  // 🔐 ROMANTIC LOGIN / PASSCODE GATE SYSTEM 🔐
  // =========================================================
  function initRomanticLogin() {
    const loginOverlay = document.getElementById('romantic-login-overlay');
    const loginForm = document.getElementById('login-passcode-form');
    const passcodeInput = document.getElementById('love-passcode-input');
    const errorMsg = document.getElementById('login-error-msg');
    const lockBtn = document.getElementById('lock-vault-btn');

    // Check if already authenticated in this session
    const savedRole = sessionStorage.getItem('mv_auth_role');
    if (savedRole) {
      applyUserRole(savedRole);
      if (loginOverlay) loginOverlay.classList.add('unlocked');
    }

    if (loginForm && passcodeInput) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = passcodeInput.value.trim().toLowerCase();
        
        const herValidCodes = [
          String(COUPLE_CONFIG.herPasscode).toLowerCase(),
          '1001', '10012026', '10-01-2026', 'anggun', 'anggunly', '2708', '27082006'
        ];

        const adminValidCodes = [
          String(COUPLE_CONFIG.adminPasscode).toLowerCase(),
          'rifai', 'rifai123', 'admin', 'admin123', 'rfa'
        ];

        if (adminValidCodes.includes(code)) {
          // Logged in as Admin Rifai
          applyUserRole('admin');
          sessionStorage.setItem('mv_auth_role', 'admin');
          if (loginOverlay) loginOverlay.classList.add('unlocked');
          if (errorMsg) errorMsg.style.display = 'none';
          passcodeInput.value = '';
          window.confetti.burst({ count: 50 });
        } else if (herValidCodes.includes(code)) {
          // Logged in as Anggunly (Queen)
          applyUserRole('anggunly');
          sessionStorage.setItem('mv_auth_role', 'anggunly');
          if (loginOverlay) loginOverlay.classList.add('unlocked');
          if (errorMsg) errorMsg.style.display = 'none';
          passcodeInput.value = '';
          
          // Sweet romantic fanfare!
          window.confetti.celebrate();
          if (!window.romanticAudio.isPlaying) {
            window.romanticAudio.toggle();
          }
        } else {
          // Wrong passcode
          if (errorMsg) {
            errorMsg.style.display = 'block';
            errorMsg.classList.remove('shakeError');
            void errorMsg.offsetWidth; // trigger reflow
            errorMsg.classList.add('shakeError');
          }
        }
      });
    }

    if (lockBtn) {
      lockBtn.addEventListener('click', () => {
        sessionStorage.removeItem('mv_auth_role');
        if (loginOverlay) {
          loginOverlay.classList.remove('unlocked');
          if (passcodeInput) passcodeInput.focus();
        }
      });
    }
  }

  function applyUserRole(role) {
    state.currentUserRole = role;
    const adminBtn = document.getElementById('admin-coupon-btn');
    const roleLabel = document.getElementById('user-role-label');

    if (role === 'admin') {
      if (adminBtn) adminBtn.style.display = 'flex';
      if (roleLabel) roleLabel.innerHTML = `👑 Admin ${state.myName}`;
    } else {
      if (adminBtn) adminBtn.style.display = 'none';
      if (roleLabel) roleLabel.innerHTML = `👑 ${state.herName} 💖`;
    }

    renderAdminCouponsList();
  }

  // =========================================================
  // 🎟️ LOVE COUPONS SYSTEM & ADMIN SYNC 🎟️
  // =========================================================
  function initCouponsSystem() {
    renderCouponsGrid();
    initAdminCouponsModal();
  }

  // Render Coupons in Birthday Celebration Modal
  function renderCouponsGrid() {
    const container = document.getElementById('coupons-grid-container');
    if (!container) return;

    container.innerHTML = '';
    const claimedMap = new Map((state.claimedCoupons || []).map(c => [c.id, c]));

    AVAILABLE_COUPONS.forEach(coupon => {
      const isClaimed = claimedMap.has(coupon.id);
      const claimedData = claimedMap.get(coupon.id);

      const card = document.createElement('div');
      card.className = 'coupon-card' + (isClaimed ? ' claimed' : '');
      
      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
          <span style="font-size: 1.6rem; flex-shrink: 0;">${coupon.icon}</span>
          <div style="flex: 1; min-width: 0; text-align: left;">
            <strong style="font-size: 0.88rem; color: var(--deep-wine); display: block; line-height: 1.3;">${escapeHtml(coupon.title)}</strong>
            <span style="font-size: 0.74rem; color: var(--text-muted); display: block; margin-top: 2px; line-height: 1.3;">${escapeHtml(coupon.desc)}</span>
            ${isClaimed ? `<span style="display: inline-block; font-size: 0.72rem; color: #20c997; font-weight: 700; margin-top: 4px;">✅ Sudah Diklaim (${formatDateIndo(claimedData.claimedAt ? claimedData.claimedAt.split('T')[0] : '')})</span>` : ''}
          </div>
        </div>
        <div style="flex-shrink: 0; margin-left: 6px;">
          <span class="claim-badge">${isClaimed ? 'TERKLAIM ✅' : 'KLAIM 💌'}</span>
        </div>
      `;

      if (!isClaimed) {
        card.addEventListener('click', async () => {
          if (confirm(`Klaim kupon "${coupon.title}" sekarang?\nPermintaan ini akan otomatis masuk ke akun Rifai 💌`)) {
            const newClaim = {
              id: coupon.id,
              title: coupon.title,
              icon: coupon.icon,
              desc: coupon.desc,
              claimedBy: state.herName,
              claimedAt: new Date().toISOString(),
              status: 'pending'
            };

            state.claimedCoupons.push(newClaim);
            await window.memoryDB.setSetting('claimed_coupons', state.claimedCoupons);
            
            renderCouponsGrid();
            renderAdminCouponsList();
            window.confetti.celebrate();
            alert(`🎉 Horeee! Kupon "${coupon.title}" berhasil kamu klaim!\nPermintaanmu sudah otomatis terkirim ke Rifai ❤️`);
          }
        });
      }

      container.appendChild(card);
    });
  }

  // Admin Coupons Modal Controller
  function initAdminCouponsModal() {
    const adminBtn = document.getElementById('admin-coupon-btn');
    const adminModal = document.getElementById('admin-coupons-modal');
    const closeModalBtn = document.getElementById('close-admin-coupons-modal');

    if (adminBtn && adminModal) {
      adminBtn.addEventListener('click', () => {
        renderAdminCouponsList();
        adminModal.classList.add('active');
      });
    }

    if (closeModalBtn && adminModal) {
      closeModalBtn.addEventListener('click', () => {
        adminModal.classList.remove('active');
      });
    }
  }

  // Render claimed coupons list for Admin Rifai
  function renderAdminCouponsList() {
    const listEl = document.getElementById('admin-coupons-list');
    const badgeEl = document.getElementById('admin-coupon-count-badge');
    const coupons = state.claimedCoupons || [];

    const pendingCoupons = coupons.filter(c => c.status !== 'completed');

    if (badgeEl) {
      badgeEl.textContent = `${pendingCoupons.length} Kupon`;
      badgeEl.style.color = pendingCoupons.length > 0 ? '#e63946' : '#20c997';
    }

    if (!listEl) return;

    if (coupons.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
          <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">💌</span>
          <p style="font-size: 0.9rem;">Belum ada kupon yang diklaim oleh Anggunly.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    coupons.forEach(c => {
      const item = document.createElement('div');
      const isCompleted = c.status === 'completed';
      
      item.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: ${isCompleted ? '#f8f9fa' : '#fff0f3'}; border: 1.5px solid ${isCompleted ? '#dee2e6' : '#ffccd5'}; border-radius: 10px; transition: all 0.2s ease;`;
      
      const claimedDate = c.claimedAt ? new Date(c.claimedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.8rem;">${c.icon || '🎟️'}</span>
          <div>
            <strong style="font-size: 0.92rem; color: var(--deep-wine); text-decoration: ${isCompleted ? 'line-through' : 'none'};">${escapeHtml(c.title)}</strong>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
              Diklaim oleh: <strong>${escapeHtml(c.claimedBy || 'Anggunly')}</strong> • ${claimedDate}
            </div>
            <span style="display: inline-block; font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; margin-top: 4px; font-weight: 700; background: ${isCompleted ? '#e9ecef' : '#ffe3e8'}; color: ${isCompleted ? '#6c757d' : '#d6336c'};">
              ${isCompleted ? 'Sudah Ditunaikan' : '⏳ Perlu Ditepati'}
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button type="button" class="btn-primary" data-toggle-coupon="${c.id}" style="font-size: 0.75rem; padding: 6px 12px; background: ${isCompleted ? '#adb5bd' : 'linear-gradient(135deg, #20c997, #0ca678)'};">
            ${isCompleted ? 'Batal' : '✅ Tunaikan'}
          </button>
          <button type="button" class="btn-icon" data-delete-coupon="${c.id}" title="Hapus Catatan Kupon" style="width: 28px; height: 28px; font-size: 0.75rem; color: #e63946;">🗑️</button>
        </div>
      `;

      // Toggle status button
      const toggleBtn = item.querySelector(`[data-toggle-coupon="${c.id}"]`);
      if (toggleBtn) {
        toggleBtn.addEventListener('click', async () => {
          c.status = c.status === 'completed' ? 'pending' : 'completed';
          await window.memoryDB.setSetting('claimed_coupons', state.claimedCoupons);
          renderAdminCouponsList();
          renderCouponsGrid();
          if (c.status === 'completed') window.confetti.burst({ count: 40 });
        });
      }

      // Delete coupon record
      const delBtn = item.querySelector(`[data-delete-coupon="${c.id}"]`);
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          if (confirm(`Hapus catatan klaim kupon "${c.title}"?`)) {
            state.claimedCoupons = state.claimedCoupons.filter(item => item.id !== c.id);
            await window.memoryDB.setSetting('claimed_coupons', state.claimedCoupons);
            renderAdminCouponsList();
            renderCouponsGrid();
          }
        });
      }

      listEl.appendChild(item);
    });
  }
});
