// js/audio.js - Advanced Romantic Playlist Player & Synthesizer
class RomanticAudioPlayer {
  constructor() {
    this.isPlaying = false;
    this.audioCtx = null;
    this.customAudio = new Audio();
    this.gainNode = null;
    this.synthTimeout = null;
    this.noteIndex = 0;
    
    // Default track (Piano Synth)
    this.defaultTrack = {
      id: 'default',
      title: 'Melodi Piano Romantis (Default)',
      artist: 'Our Love Story',
      url: null,
      isDefault: true
    };

    this.playlist = [this.defaultTrack];
    this.currentIndex = 0;
    this.onTrackChangeCallback = null;

    this.initCustomAudio();
  }

  initCustomAudio() {
    this.customAudio.addEventListener('ended', () => {
      // Auto play next track in playlist
      this.next();
    });

    this.customAudio.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
      // If custom audio fails to load, gracefully fall back to next track or default synth
      if (this.isPlaying) {
        this.startRomanticMelody();
      }
    });
  }

  ensureContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playNote(freq, duration = 1.2) {
    if (!this.audioCtx || !this.isPlaying || !this.isCurrentTrackDefault()) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const noteGain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      const now = this.audioCtx.currentTime;
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(noteGain);
      noteGain.connect(this.gainNode);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Audio synthesis error:', e);
    }
  }

  startRomanticMelody() {
    const melody = [
      { f: 261.63, d: 0.8 }, { f: 329.63, d: 0.8 }, { f: 392.00, d: 0.8 }, { f: 493.88, d: 1.2 },
      { f: 523.25, d: 1.6 }, { f: 392.00, d: 0.8 }, { f: 329.63, d: 0.8 }, { f: 261.63, d: 1.2 },
      { f: 220.00, d: 0.8 }, { f: 261.63, d: 0.8 }, { f: 329.63, d: 0.8 }, { f: 392.00, d: 1.2 },
      { f: 440.00, d: 1.6 }, { f: 329.63, d: 0.8 }, { f: 261.63, d: 0.8 }, { f: 220.00, d: 1.2 },
      { f: 174.61, d: 0.8 }, { f: 220.00, d: 0.8 }, { f: 261.63, d: 0.8 }, { f: 329.63, d: 1.2 },
      { f: 349.23, d: 1.6 }, { f: 261.63, d: 0.8 }, { f: 220.00, d: 0.8 }, { f: 174.61, d: 1.2 },
      { f: 196.00, d: 0.8 }, { f: 246.94, d: 0.8 }, { f: 293.66, d: 0.8 }, { f: 392.00, d: 1.2 },
      { f: 493.88, d: 1.6 }, { f: 392.00, d: 0.8 }, { f: 293.66, d: 0.8 }, { f: 246.94, d: 1.2 }
    ];

    this.noteIndex = 0;
    const tick = () => {
      if (!this.isPlaying || !this.isCurrentTrackDefault()) return;
      const note = melody[this.noteIndex % melody.length];
      this.playNote(note.f, note.d);
      
      if (this.noteIndex % 8 === 0) {
        this.playNote(note.f / 2, 2.5);
      }

      this.noteIndex++;
      this.synthTimeout = setTimeout(tick, 480);
    };

    tick();
  }

  isCurrentTrackDefault() {
    const current = this.playlist[this.currentIndex];
    return current && (current.isDefault || !current.url);
  }

  getCurrentTrack() {
    return this.playlist[this.currentIndex] || this.defaultTrack;
  }

  setPlaylist(customTracks = []) {
    this.playlist = [this.defaultTrack, ...customTracks];
    if (this.currentIndex >= this.playlist.length) {
      this.currentIndex = 0;
    }
    this.updateUI();
  }

  selectTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    
    // Stop previous audio
    if (this.synthTimeout) clearTimeout(this.synthTimeout);
    this.customAudio.pause();

    const track = this.playlist[this.currentIndex];

    if (this.isPlaying) {
      if (track.isDefault || !track.url) {
        this.ensureContext();
        this.startRomanticMelody();
      } else {
        this.customAudio.src = track.url;
        this.customAudio.play().catch(e => console.log('Audio playback error:', e));
      }
    } else {
      if (!track.isDefault && track.url) {
        this.customAudio.src = track.url;
      }
    }

    this.updateUI();
    if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback(track, this.currentIndex);
    }
  }

  next() {
    const nextIndex = (this.currentIndex + 1) % this.playlist.length;
    this.selectTrack(nextIndex);
    if (!this.isPlaying) this.toggle();
  }

  prev() {
    const prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.selectTrack(prevIndex);
    if (!this.isPlaying) this.toggle();
  }

  toggle() {
    this.ensureContext();
    this.isPlaying = !this.isPlaying;
    const track = this.getCurrentTrack();

    if (this.isPlaying) {
      if (track.isDefault || !track.url) {
        this.startRomanticMelody();
      } else {
        if (this.customAudio.src !== track.url) {
          this.customAudio.src = track.url;
        }
        this.customAudio.play().catch(e => console.log('Audio playback error:', e));
      }
    } else {
      if (this.synthTimeout) clearTimeout(this.synthTimeout);
      this.customAudio.pause();
    }

    this.updateUI();
    return this.isPlaying;
  }

  updateUI() {
    const vinyl = document.getElementById('music-vinyl');
    const playIcon = document.getElementById('music-play-icon');
    const soundWaves = document.getElementById('sound-waves');
    const titleEl = document.getElementById('music-current-title');

    const track = this.getCurrentTrack();

    if (titleEl) {
      titleEl.textContent = track ? track.title : 'Melodi Cinta';
    }

    const fabBtn = document.getElementById('music-fab-btn');
    if (fabBtn) {
      if (this.isPlaying) {
        fabBtn.classList.add('playing');
      } else {
        fabBtn.classList.remove('playing');
      }
    }

    if (this.isPlaying) {
      if (vinyl) vinyl.classList.add('playing');
      if (soundWaves) soundWaves.classList.add('active');
      if (playIcon) playIcon.innerHTML = '⏸️';
    } else {
      if (vinyl) vinyl.classList.remove('playing');
      if (soundWaves) soundWaves.classList.remove('active');
      if (playIcon) playIcon.innerHTML = '▶️';
    }

    // Highlight active item in playlist dropdown
    document.querySelectorAll('.playlist-item').forEach((el, idx) => {
      if (idx === this.currentIndex) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }
}

window.romanticAudio = new RomanticAudioPlayer();
