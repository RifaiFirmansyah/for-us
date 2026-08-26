// js/app.js - Main Interactive Application Logic

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Database
  await window.memoryDB.init();

  // 2. Application State
  const state = {
    myName: await window.memoryDB.getSetting('myName', 'Rama'),
    herName: await window.memoryDB.getSetting('herName', 'Sasa'),
    startDate: await window.memoryDB.getSetting('startDate', getPresetStartDate()),
    birthdayDate: await window.memoryDB.getSetting('bdayDate', getPresetBdayDate()),
    currentFilter: 'all',
    selectedCalDate: null,
    calViewDate: new Date(),
    memories: [],
    uploadedFileBlob: null,
    uploadedFileUrl: null,
    uploadedFileType: 'photo',
    activeObjectUrls: []
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

  // Pre-seed sample memories if empty
  await seedInitialMemories();

  // 3. Setup UI Elements & Listeners
  initBackgroundCanvas();
  updateProfileDisplays();
  initTogetherCounter();
  initBirthdayCountdown();
  initMusicPlayer();
  await refreshMemories();
  renderCalendar();
  initModals();
  initUploadForm();
  initOpenWhenLetters();
  initBirthdayCelebration();

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

  // --- Music Player Controller ---
  function initMusicPlayer() {
    const toggleBtn = document.getElementById('music-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        window.romanticAudio.toggle();
      });
    }

    const customAudioInput = document.getElementById('custom-audio-input');
    if (customAudioInput) {
      customAudioInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          window.romanticAudio.loadCustomFile(file);
        }
      });
    }
  }

  // --- Seed Initial Samples ---
  async function seedInitialMemories() {
    const existing = await window.memoryDB.getAllMemories();
    if (existing.length === 0) {
      const defaultSamples = [
        {
          title: 'Kencan Pertama Kita di Kedai Kopi',
          date: '2025-02-14',
          type: 'photo',
          category: 'date',
          mediaUrl: createSvgPlaceholder('☕ Kencan Pertama', '#ffccd5', 'Secangkir kopi hangat dan senyuman manismu'),
          note: 'Hari di mana kita pertama kali ngobrol berjam-jam tanpa terasa waktu berlalu. Matamu begitu berbinar saat menceritakan impianmu.'
        },
        {
          title: 'Piknik Senja di Tepi Pantai',
          date: '2025-06-20',
          type: 'photo',
          category: 'favorite',
          mediaUrl: createSvgPlaceholder('🌅 Sunset Pantai', '#ffd166', 'Momen matahari terbenam bersama kamu'),
          note: 'Angin sepoi-sepoi, deburan ombak, dan tanganmu yang menggenggam erat tanganku. Salah satu momen paling damai bersamamu.'
        },
        {
          title: 'Kompilasi Momen Random & Lucu',
          date: '2025-10-05',
          type: 'photo',
          category: 'funny',
          mediaUrl: createSvgPlaceholder('😂 Momen Lucu Berdua', '#a18cd1', 'Ketawa lepas bareng tanpa jaim'),
          note: 'Saat kita nyoba bikin kue tapi gosong dan malah ketawa bareng sampai sakit perut. Selalu bahagia saat di dekatmu!'
        }
      ];

      for (const sample of defaultSamples) {
        await window.memoryDB.addMemory(sample);
      }
    }
  }

  function createSvgPlaceholder(title, bgColor, subtitle) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${bgColor}" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#ff758c" stop-opacity="0.95"/>
          </linearGradient>
        </defs>
        <rect width="600" height="450" fill="url(#g)"/>
        <circle cx="300" cy="180" r="70" fill="rgba(255,255,255,0.3)"/>
        <text x="300" y="195" font-family="'Plus Jakarta Sans', sans-serif" font-size="45" text-anchor="middle" fill="#ffffff">💖</text>
        <text x="300" y="290" font-family="'Playfair Display', serif" font-size="28" font-weight="bold" text-anchor="middle" fill="#ffffff">${title}</text>
        <text x="300" y="325" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" text-anchor="middle" fill="rgba(255,255,255,0.9)">${subtitle}</text>
      </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // --- Render Memories Grid ---
  async function refreshMemories() {
    const rawMemories = await window.memoryDB.getAllMemories();
    
    // Revoke old object URLs to prevent memory leaks
    state.activeObjectUrls.forEach(url => {
      try { URL.revokeObjectURL(url); } catch (e) {}
    });
    state.activeObjectUrls = [];

    // Process Blobs into playable URLs with auto-migration for legacy base64
    state.memories = rawMemories.map(m => {
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
          <div class="empty-icon">📸</div>
          <h3>Belum Ada Memori di Kategori Ini</h3>
          <p style="margin-top: 6px;">Klik tombol <strong>+ Tambah Memori</strong> di atas untuk mengabadikan momen berharga kalian!</p>
        </div>
      `;
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
            }).catch(() => {});
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
  }
});
