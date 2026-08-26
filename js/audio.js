// js/audio.js - Ambient Romantic Music Player & Synthesizer
class RomanticAudioPlayer {
  constructor() {
    this.isPlaying = false;
    this.audioCtx = null;
    this.customAudio = new Audio();
    this.isCustom = false;
    this.synthInterval = null;
    this.noteIndex = 0;
    this.gainNode = null;
    this.initCustomAudio();
  }

  initCustomAudio() {
    this.customAudio.loop = true;
    this.customAudio.addEventListener('ended', () => {
      if (this.isPlaying) this.customAudio.play();
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

  // Play a soft bell/kalimba/piano chime
  playNote(freq, duration = 1.2) {
    if (!this.audioCtx || !this.isPlaying || this.isCustom) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const noteGain = this.audioCtx.createGain();

      osc.type = 'sine'; // Soft gentle tone
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      // Soft attack, gentle exponential decay
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
    // Beautiful romantic arpeggio notes (Frequencies in Hz: C4, E4, G4, B4, C5, D5, E5, G5, etc.)
    const melody = [
      // Verse 1 (Cmaj7 - Am7 - Fmaj7 - G)
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
      if (!this.isPlaying || this.isCustom) return;
      const note = melody[this.noteIndex % melody.length];
      this.playNote(note.f, note.d);
      
      // Also occasionally play a soft bass harmony
      if (this.noteIndex % 8 === 0) {
        this.playNote(note.f / 2, 2.5);
      }

      this.noteIndex++;
      this.synthTimeout = setTimeout(tick, 480);
    };

    tick();
  }

  toggle() {
    this.ensureContext();
    this.isPlaying = !this.isPlaying;

    const vinyl = document.getElementById('music-vinyl');
    const playIcon = document.getElementById('music-play-icon');
    const soundWaves = document.getElementById('sound-waves');

    if (this.isPlaying) {
      if (vinyl) vinyl.classList.add('playing');
      if (soundWaves) soundWaves.classList.add('active');
      if (playIcon) playIcon.innerHTML = '⏸️';

      if (this.isCustom && this.customAudio.src) {
        this.customAudio.play().catch(e => console.log('Audio playback error:', e));
      } else {
        this.startRomanticMelody();
      }
    } else {
      if (vinyl) vinyl.classList.remove('playing');
      if (soundWaves) soundWaves.classList.remove('active');
      if (playIcon) playIcon.innerHTML = '🎵';

      if (this.synthTimeout) clearTimeout(this.synthTimeout);
      if (this.customAudio) this.customAudio.pause();
    }

    return this.isPlaying;
  }

  loadCustomFile(file) {
    const url = URL.createObjectURL(file);
    this.customAudio.src = url;
    this.isCustom = true;
    if (this.isPlaying) {
      if (this.synthTimeout) clearTimeout(this.synthTimeout);
      this.customAudio.play();
    }
  }

  resetToSynth() {
    this.isCustom = false;
    this.customAudio.pause();
    this.customAudio.src = '';
    if (this.isPlaying) {
      this.startRomanticMelody();
    }
  }
}

window.romanticAudio = new RomanticAudioPlayer();
