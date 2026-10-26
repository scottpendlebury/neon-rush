// Neon Rush - UI System
export class UI {
  constructor(settings, audio, input) {
    this.settings = settings;
    this.audio = audio;
    this.input = input;
    
    // Elements
    this.titleScreen = document.getElementById('title-screen');
    this.hud = document.getElementById('hud');
    this.pauseMenu = document.getElementById('pause-menu');
    this.settingsMenu = document.getElementById('settings-menu');
    this.resultsScreen = document.getElementById('results-screen');
    this.countdownEl = document.getElementById('countdown');
    this.touchControls = document.getElementById('touch-controls');
    
    // HUD elements
    this.speedValue = document.getElementById('speed-value');
    this.gearDisplay = document.getElementById('gear-display');
    this.currentLapTime = document.getElementById('current-lap-time');
    this.bestLapTime = document.getElementById('best-lap-time');
    this.lapCounter = document.getElementById('lap-counter');
    this.positionDisplay = document.getElementById('position-display');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    
    // Buttons
    this.btnStart = document.getElementById('btn-start');
    this.btnSettings = document.getElementById('btn-settings');
    this.btnResume = document.getElementById('btn-resume');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnSettingsPause = document.getElementById('btn-settings-pause');
    this.btnQuit = document.getElementById('btn-quit');
    this.btnSettingsBack = document.getElementById('btn-settings-back');
    this.btnRaceAgain = document.getElementById('btn-race-again');
    this.btnMainMenu = document.getElementById('btn-main-menu');
    
    // Settings controls
    this.setupSettingsControls();
    
    // Callbacks
    this.onStartGame = null;
    this.onRestartRace = null;
    this.onMainMenu = null;
    this.onResume = null;
    this.onPause = null;
    this.onSettingsChange = null;
    
    // FPS counter
    this.fpsElement = null;
    this.lastFpsUpdate = 0;
    
    // Minimap
    this.minimapSize = 180;
    
    this.init();
  }
  
  init() {
    // Button events
    this.btnStart.addEventListener('click', () => {
      this.audio.playSFX('click');
      if (this.onStartGame) this.onStartGame();
    });
    
    this.btnSettings.addEventListener('click', () => {
      this.audio.playSFX('click');
      this.showSettingsMenu(true);
    });
    
    this.btnResume.addEventListener('click', () => {
      this.audio.playSFX('click');
      if (this.onResume) this.onResume();
    });
    
    this.btnRestart.addEventListener('click', () => {
      this.audio.playSFX('click');
      if (this.onRestartRace) this.onRestartRace();
    });
    
    this.btnSettingsPause.addEventListener('click', () => {
      this.audio.playSFX('click');
      this.showSettingsMenu(true);
    });
    
    this.btnQuit.addEventListener('click', () => {
      this.audio.playSFX('click');
      if (this.onMainMenu) this.onMainMenu();
    });
    
    this.btnSettingsBack.addEventListener('click', () => {
      this.audio.playSFX('click');
      this.showSettingsMenu(false);
    });
    
    this.btnRaceAgain.addEventListener('click', () => {
      this.audio.playSFX('click');
      if (this.onRestartRace) this.onRestartRace();
    });
    
    this.btnMainMenu.addEventListener('click', () => {
      this.audio.playSFX('click');
      if (this.onMainMenu) this.onMainMenu();
    });
    
    // Keyboard pause
    this.input.onPause = () => {
      if (this.onPause) this.onPause();
    };
    
    // Initialize minimap canvas
    this.resizeMinimap();
    window.addEventListener('resize', () => this.resizeMinimap());
  }
  
  setupSettingsControls() {
    const sliders = [
      { id: 'setting-master-vol', valueId: 'master-vol-value', key: 'masterVolume', suffix: '%' },
      { id: 'setting-sfx-vol', valueId: 'sfx-vol-value', key: 'sfxVolume', suffix: '%' },
      { id: 'setting-music-vol', valueId: 'music-vol-value', key: 'musicVolume', suffix: '%' },
      { id: 'setting-touch-sens', valueId: 'touch-sens-value', key: 'touchSensitivity', suffix: '%' }
    ];
    
    sliders.forEach(s => {
      const el = document.getElementById(s.id);
      const valEl = document.getElementById(s.valueId);
      el.value = this.settings.get(s.key) || (s.key === 'touchSensitivity' ? 100 : 70);
      valEl.textContent = el.value + s.suffix;
      
      el.addEventListener('input', () => {
        valEl.textContent = el.value + s.suffix;
        if (this.onSettingsChange) this.onSettingsChange(s.key, parseInt(el.value));
      });
      
      el.addEventListener('change', () => {
        this.audio.playSFX('click');
      });
    });
    
    // Quality select
    const qualitySelect = document.getElementById('setting-quality');
    qualitySelect.value = this.settings.get('quality') || 'medium';
    qualitySelect.addEventListener('change', () => {
      this.audio.playSFX('click');
      if (this.onSettingsChange) this.onSettingsChange('quality', qualitySelect.value);
    });
    
    // Toggles
    const toggles = [
      { id: 'setting-invert-look', key: 'invertLook' },
      { id: 'setting-show-fps', key: 'showFPS' }
    ];
    
    toggles.forEach(t => {
      const el = document.getElementById(t.id);
      el.classList.toggle('active', this.settings.get(t.key) || false);
      el.addEventListener('click', () => {
        const active = !el.classList.contains('active');
        el.classList.toggle('active', active);
        this.audio.playSFX('click');
        if (this.onSettingsChange) this.onSettingsChange(t.key, active);
      });
    });
  }
  
  resizeMinimap() {
    const size = Math.min(180, window.innerWidth * 0.25);
    this.minimapSize = size;
    this.minimapCanvas.width = size * window.devicePixelRatio;
    this.minimapCanvas.height = size * window.devicePixelRatio;
    this.minimapCanvas.style.width = size + 'px';
    this.minimapCanvas.style.height = size + 'px';
    this.minimapCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  
  showTitleScreen() {
    this.hideAllOverlays();
    this.titleScreen.classList.add('active');
    this.hud.classList.add('hidden');
  }
  
  showHUD() {
    this.titleScreen.classList.remove('active');
    this.hud.classList.remove('hidden');
    this.touchControls.style.display = 'flex';
  }
  
  hideHUD() {
    this.hud.classList.add('hidden');
    this.touchControls.style.display = 'none';
  }
  
  showPauseMenu() {
    this.hideAllOverlays();
    this.pauseMenu.classList.add('active');
  }
  
  hidePauseMenu() {
    this.pauseMenu.classList.remove('active');
  }
  
  showSettingsMenu(fromPause) {
    this.hideAllOverlays();
    this.settingsMenu.classList.add('active');
    this.settingsMenu.dataset.fromPause = fromPause;
  }
  
  hideSettingsMenu() {
    this.settingsMenu.classList.remove('active');
    const fromPause = this.settingsMenu.dataset.fromPause === 'true';
    if (fromPause) {
      this.showPauseMenu();
    } else {
      this.showTitleScreen();
    }
  }
  
  showCountdown(value) {
    this.countdownEl.textContent = value;
    this.countdownEl.classList.add('show');
  }
  
  hideCountdown() {
    this.countdownEl.classList.remove('show');
  }
  
  showResults(data) {
    this.hideAllOverlays();
    this.resultsScreen.classList.add('active');
    
    const title = document.getElementById('result-title');
    if (data.position === 1) {
      title.textContent = 'VICTORY!';
      title.className = 'result-title victory';
    } else {
      title.textContent = `FINISHED ${this.ordinal(data.position)}`;
      title.className = 'result-title defeat';
    }
    
    document.getElementById('stat-position').textContent = this.ordinal(data.position);
    document.getElementById('stat-total-time').textContent = this.formatTime(data.totalTime);
    document.getElementById('stat-best-lap').textContent = this.formatTime(data.bestLap);
    document.getElementById('stat-top-speed').textContent = `${data.topSpeed} KM/H`;
  }
  
  hideAllOverlays() {
    this.titleScreen.classList.remove('active');
    this.pauseMenu.classList.remove('active');
    this.settingsMenu.classList.remove('active');
    this.resultsScreen.classList.remove('active');
  }
  
  updateSpeed(speed) {
    this.speedValue.textContent = speed;
  }
  
  updateGear(gear) {
    this.gearDisplay.textContent = gear === 0 ? 'N' : gear;
  }
  
  updateLapTime(time) {
    this.currentLapTime.textContent = this.formatTime(time);
  }
  
  updateBestLap(time) {
    if (time === Infinity) {
      this.bestLapTime.textContent = '--:--.---';
    } else {
      this.bestLapTime.textContent = this.formatTime(time);
    }
  }
  
  updateLapCounter(current, total) {
    this.lapCounter.textContent = `${current} / ${total}`;
  }
  
  updatePosition(position, total) {
    this.positionDisplay.textContent = `${this.ordinal(position)} / ${total}`;
  }
  
  flashLapTime() {
    this.currentLapTime.style.animation = 'none';
    this.currentLapTime.offsetHeight; // Trigger reflow
    this.currentLapTime.style.animation = 'flash 0.3s ease-out';
  }
  
  updateMinimap(player, opponents, track) {
    const ctx = this.minimapCtx;
    const size = this.minimapSize;
    const center = size / 2;
    const scale = size / 400; // Track fits in minimap
    
    // Clear
    ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
    ctx.fillRect(0, 0, size, size);
    
    // Draw track outline
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const points = track.trackPoints;
    if (points && points.length > 0) {
      const first = points[0];
      ctx.moveTo(center + first.x * scale, center - first.z * scale);
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        ctx.lineTo(center + p.x * scale, center - p.z * scale);
      }
      ctx.closePath();
      ctx.stroke();
    }
    
    // Draw opponents
    if (opponents && opponents.vehicles) {
      for (const v of opponents.vehicles) {
        const pos = v.group.position;
        const x = center + pos.x * scale;
        const y = center - pos.z * scale;
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Draw player
    if (player && player.chassis) {
      const pos = player.chassis.position;
      const x = center + pos.x * scale;
      const y = center - pos.z * scale;
      const angle = player.chassis.rotation.y;
      
      ctx.fillStyle = '#00ffff';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-angle);
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(-3, 3);
      ctx.lineTo(3, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    
    // Draw checkpoints
    if (track && track.checkpoints) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
      for (const cp of track.checkpoints) {
        const x = center + cp.x * scale;
        const y = center - cp.z * scale;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  updateFPS(fps) {
    if (!this.fpsElement) {
      this.fpsElement = document.createElement('div');
      this.fpsElement.style.cssText = 'position:fixed;top:10px;right:10px;color:#0ff;font-family:Orbitron;font-size:0.8rem;z-index:100;pointer-events:none;';
      document.body.appendChild(this.fpsElement);
    }
    
    const now = performance.now();
    if (now - this.lastFpsUpdate > 200) {
      this.fpsElement.textContent = `${Math.round(fps)} FPS`;
      this.lastFpsUpdate = now;
    }
  }
  
  formatTime(ms) {
    if (ms === undefined || ms === null || ms === Infinity) return '--:--.---';
    const totalMs = Math.floor(ms * 1000);
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}