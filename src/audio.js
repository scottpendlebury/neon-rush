// Neon Rush - Audio System
export class Audio {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.unlocked = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    
    // Audio buffers
    this.buffers = {};
    this.sources = {};
    
    // Music
    this.musicSource = null;
    this.musicPlaying = false;
    
    // Engine sounds
    this.engineSounds = new Map();
    
    this.init();
  }
  
  init() {
    // Create audio context
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Gain nodes
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    
    this.masterGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    
    // Set initial volumes
    this.applySettings(this.settings);
    
    // Generate procedural sounds
    this.generateSounds();
  }
  
  unlock() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.unlocked = true;
  }
  
  applySettings(settings) {
    const master = (settings.get('masterVolume') || 70) / 100;
    const sfx = (settings.get('sfxVolume') || 80) / 100;
    const music = (settings.get('musicVolume') || 50) / 100;
    
    this.masterGain.gain.value = master;
    this.sfxGain.gain.value = sfx;
    this.musicGain.gain.value = music;
  }
  
  generateSounds() {
    // Click sound
    this.buffers.click = this.createClickSound();
    
    // Countdown sounds
    this.buffers.countdown = this.createCountdownSound();
    this.buffers.go = this.createGoSound();
    
    // Checkpoint
    this.buffers.checkpoint = this.createCheckpointSound();
    
    // Victory
    this.buffers.victory = this.createVictorySound();
    
    // Engine base sound (will be played continuously)
    this.buffers.engine = this.createEngineSound();
    
    // Boost
    this.buffers.boost = this.createBoostSound();
    
    // Tire screech
    this.buffers.tire = this.createTireSound();
  }
  
  createClickSound() {
    const duration = 0.1;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 50);
      data[i] = Math.sin(t * 2000 * 2 * Math.PI) * env * 0.3;
    }
    return buffer;
  }
  
  createCountdownSound() {
    const duration = 0.3;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 10);
      const freq = 400 + 400 * (1 - t / duration);
      data[i] = Math.sin(freq * t * 2 * Math.PI) * env * 0.4;
    }
    return buffer;
  }
  
  createGoSound() {
    const duration = 0.5;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 5);
      const freq = 200 + 600 * Math.exp(-t * 3);
      data[i] = (Math.sin(freq * t * 2 * Math.PI) + 0.5 * Math.sin(freq * 2 * t * 2 * Math.PI)) * env * 0.5;
    }
    return buffer;
  }
  
  createCheckpointSound() {
    const duration = 0.4;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 8);
      const freq = 800 + 400 * Math.sin(t * 20);
      data[i] = Math.sin(freq * t * 2 * Math.PI) * env * 0.3;
    }
    return buffer;
  }
  
  createVictorySound() {
    const duration = 2;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const noteDuration = duration / notes.length;
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noteIndex = Math.floor(t / noteDuration);
      if (noteIndex >= notes.length) continue;
      
      const noteT = t - noteIndex * noteDuration;
      const env = Math.exp(-noteT * 3);
      const freq = notes[noteIndex];
      data[i] = (Math.sin(freq * noteT * 2 * Math.PI) + 0.3 * Math.sin(freq * 2 * noteT * 2 * Math.PI)) * env * 0.3;
    }
    return buffer;
  }
  
  createEngineSound() {
    // Create a looping engine drone
    const duration = 2;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Base frequency
      const baseFreq = 60;
      // Harmonics for electric motor whine
      let sample = 0;
      sample += Math.sin(baseFreq * t * 2 * Math.PI) * 0.5;
      sample += Math.sin(baseFreq * 2 * t * 2 * Math.PI) * 0.3;
      sample += Math.sin(baseFreq * 3 * t * 2 * Math.PI) * 0.2;
      sample += Math.sin(baseFreq * 4 * t * 2 * Math.PI) * 0.1;
      // Add some noise for texture
      sample += (Math.random() - 0.5) * 0.05;
      data[i] = sample * 0.3;
    }
    return buffer;
  }
  
  createBoostSound() {
    const duration = 1;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Rising pitch with noise
      const freq = 200 + 800 * t;
      const noise = (Math.random() - 0.5) * 2;
      const tone = Math.sin(freq * t * 2 * Math.PI) * 0.3;
      data[i] = (tone + noise * 0.2) * (1 - t) * 0.5;
    }
    return buffer;
  }
  
  createTireSound() {
    const duration = 0.5;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 5);
      // Band-limited noise for tire screech
      let sample = 0;
      for (let h = 1; h < 8; h++) {
        sample += Math.sin(h * 800 * t * 2 * Math.PI + Math.random()) * (1 / h);
      }
      data[i] = sample * env * 0.2;
    }
    return buffer;
  }
  
  playSFX(name) {
    if (!this.unlocked || !this.buffers[name]) return;
    
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers[name];
    source.connect(this.sfxGain);
    source.start(0);
    return source;
  }
  
  playMusic() {
    if (!this.unlocked || this.musicPlaying) return;
    
    // Create procedural music loop
    this.musicSource = this.createMusicLoop();
    this.musicSource.connect(this.musicGain);
    this.musicSource.start(0);
    this.musicPlaying = true;
  }
  
  createMusicLoop() {
    // Create a longer procedural ambient track
    const duration = 30; // 30 second loop
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, sampleRate); // Stereo
    
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    
    // Dark synthwave style
    const bpm = 128;
    const beatInterval = 60 / bpm;
    const notes = [55, 61.74, 73.42, 82.41]; // A2, B2, D3, E3
    const chordNotes = [55, 73.42, 82.41, 98]; // A2, D3, E3, G3
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const beat = t / beatInterval;
      const beatPhase = beat % 1;
      const bar = Math.floor(beat / 4) % 8;
      
      let leftSample = 0, rightSample = 0;
      
      // Kick drum
      if (beatPhase < 0.02) {
        const kickEnv = Math.exp(-beatPhase * 100);
        leftSample += Math.sin(60 * beatPhase * 2 * Math.PI) * kickEnv * 0.5;
        rightSample += Math.sin(60 * beatPhase * 2 * Math.PI) * kickEnv * 0.5;
      }
      
      // Snare on 2 and 4
      const beatInBar = Math.floor(beat) % 4;
      if ((beatInBar === 1 || beatInBar === 3) && beatPhase < 0.03) {
        const snareEnv = Math.exp(-beatPhase * 80);
        const noise = (Math.random() - 0.5) * 2;
        leftSample += noise * snareEnv * 0.3;
        rightSample += noise * snareEnv * 0.3;
      }
      
      // Bass line
      const bassNote = notes[bar % notes.length];
      const bassEnv = 0.3 + 0.2 * Math.sin(t * 4);
      leftSample += Math.sin(bassNote * t * 2 * Math.PI) * bassEnv * 0.2;
      rightSample += Math.sin(bassNote * t * 2 * Math.PI) * bassEnv * 0.2;
      
      // Pad chords
      if (bar % 2 === 0) {
        for (const note of chordNotes) {
          const padEnv = 0.1 * (1 + Math.sin(t * 0.5)) * Math.exp(-beatPhase * 0.5);
          leftSample += Math.sin(note * t * 2 * Math.PI) * padEnv;
          rightSample += Math.sin(note * 1.01 * t * 2 * Math.PI) * padEnv; // Slight detune for width
        }
      }
      
      // Arpeggio
      const arpNote = notes[Math.floor(t * 8) % notes.length];
      const arpEnv = 0.15 * Math.exp(-(beatPhase % 0.5) * 10);
      leftSample += Math.sin(arpNote * 2 * t * 2 * Math.PI) * arpEnv;
      rightSample += Math.sin(arpNote * 2 * 1.01 * t * 2 * Math.PI) * arpEnv;
      
      // Ambient noise
      leftSample += (Math.random() - 0.5) * 0.01;
      rightSample += (Math.random() - 0.5) * 0.01;
      
      // Master envelope - fade in/out at loop points
      const loopFade = 2;
      let masterEnv = 1;
      if (t < loopFade) masterEnv = t / loopFade;
      if (t > duration - loopFade) masterEnv = (duration - t) / loopFade;
      
      left[i] = leftSample * masterEnv * 0.5;
      right[i] = rightSample * masterEnv * 0.5;
    }
    
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }
  
  stopMusic() {
    if (this.musicSource) {
      this.musicSource.stop();
      this.musicSource.disconnect();
      this.musicSource = null;
      this.musicPlaying = false;
    }
  }
  
  pauseMusic() {
    if (this.musicSource && this.musicPlaying) {
      this.musicGain.gain.value = 0;
    }
  }
  
  resumeMusic() {
    if (this.musicSource && this.musicPlaying) {
      const musicVol = (this.settings.get('musicVolume') || 50) / 100;
      this.musicGain.gain.value = musicVol;
    }
  }
  
  createEngineSound() {
    // Create a looping engine sound source
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers.engine;
    source.loop = true;
    
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    source.start(0);
    
    return { source, gainNode: gain, filterNode: filter };
  }
  
  createBoostSound() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers.boost;
    source.loop = true;
    
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 2;
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    source.start(0);
    
    return { source, gainNode: gain, filterNode: filter };
  }
  
  createTireSound() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers.tire;
    source.loop = true;
    
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 500;
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    source.start(0);
    
    return { source, gainNode: gain, filterNode: filter };
  }
  
  stopSound(sound) {
    if (sound && sound.source) {
      sound.source.stop();
      sound.source.disconnect();
      if (sound.gainNode) sound.gainNode.disconnect();
      if (sound.filterNode) sound.filterNode.disconnect();
    }
  }
}