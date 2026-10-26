// Neon Rush - Core Game Logic
import * as THREE from 'three';
import { Engine } from './engine.js';
import { Player } from './player.js';
import { Track } from './track.js';
import { Opponents } from './opponents.js';
import { Particles } from './particles.js';

export class Game {
  constructor(settings, audio, input, ui) {
    this.settings = settings;
    this.audio = audio;
    this.input = input;
    this.ui = ui;
    
    // Game state
    this.state = 'menu'; // menu, countdown, racing, paused, finished
    this.previousState = 'menu';
    
    // Race data
    this.lapCount = 0;
    this.totalLaps = 3;
    this.lapTimes = [];
    this.currentLapStartTime = 0;
    this.raceStartTime = 0;
    this.bestLapTime = Infinity;
    this.topSpeed = 0;
    this.currentPosition = 1;
    this.totalOpponents = 7;
    
    // Game objects
    this.engine = null;
    this.player = null;
    this.track = null;
    this.opponents = null;
    this.particles = null;
    
    // Timing
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedTimeStep = 1 / 60;
    this.maxSubSteps = 3;
    
    // Countdown
    this.countdownValue = 3;
    this.countdownTimer = 0;
    
    // Checkpoints
    this.checkpoints = [];
    this.playerCheckpointIndex = 0;
    this.opponentCheckpoints = new Array(this.totalOpponents).fill(0);
    
    // Bind methods
    this.update = this.update.bind(this);
    this.onCheckpointReached = this.onCheckpointReached.bind(this);
    this.onLapComplete = this.onLapComplete.bind(this);
    this.onRaceComplete = this.onRaceComplete.bind(this);
  }
  
  init() {
    // Initialize engine (renderer, scene, camera)
    this.engine = new Engine(this.settings);
    this.engine.init();
    
    // Create track
    this.track = new Track(this.engine.scene, this.engine);
    this.track.generate();
    this.checkpoints = this.track.checkpoints;
    
    // Create player
    this.player = new Player(this.engine, this.track, this.audio, this.settings, this.input);
    this.player.onCheckpoint = this.onCheckpointReached;
    this.player.onLapComplete = this.onLapComplete;
    
    // Create opponents
    this.opponents = new Opponents(this.engine, this.track, this.totalOpponents, this.audio);
    this.opponents.onCheckpoint = (index, opponentIndex) => {
      this.opponentCheckpoints[opponentIndex] = index;
      this.updatePositions();
    };
    
    // Create particle system
    this.particles = new Particles(this.engine);
    
    // Setup lighting
    this.setupLighting();
    
    // Add track to scene
    this.engine.scene.add(this.track.group);
    
    // Start render loop
    this.engine.renderer.setAnimationLoop(this.update);
  }
  
  setupLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0x222244, 0.5);
    this.engine.scene.add(ambient);
    
    // Main directional light (moon/sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 50);
    dirLight.castShadow = this.settings.get('quality') !== 'low';
    if (dirLight.castShadow) {
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 400;
      dirLight.shadow.camera.left = -150;
      dirLight.shadow.camera.right = 150;
      dirLight.shadow.camera.top = 150;
      dirLight.shadow.camera.bottom = -150;
      dirLight.shadow.bias = -0.001;
    }
    this.engine.scene.add(dirLight);
    this.dirLight = dirLight;
    
    // Neon accent lights around track
    this.createNeonLights();
    
    // Fog
    this.engine.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.0035);
  }
  
  createNeonLights() {
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0xff4400];
    const checkpoints = this.track.checkpoints;
    
    for (let i = 0; i < checkpoints.length; i += 2) {
      const cp = checkpoints[i];
      const color = colors[i % colors.length];
      
      const light = new THREE.PointLight(color, 2, 60);
      light.position.set(cp.x, 8, cp.z);
      light.castShadow = false;
      this.engine.scene.add(light);
      
      // Add pulsing animation
      light.userData = { baseIntensity: 2, phase: Math.random() * Math.PI * 2, color };
    }
  }
  
  startRace() {
    this.state = 'countdown';
    this.countdownValue = 3;
    this.countdownTimer = 0;
    this.ui.showCountdown(this.countdownValue);
    
    // Reset race data
    this.lapCount = 0;
    this.lapTimes = [];
    this.currentLapStartTime = 0;
    this.raceStartTime = 0;
    this.bestLapTime = Infinity;
    this.topSpeed = 0;
    this.currentPosition = 1;
    this.playerCheckpointIndex = 0;
    this.opponentCheckpoints.fill(0);
    
    // Reset player
    this.player.reset();
    this.player.enabled = false;
    
    // Reset opponents
    this.opponents.reset();
    
    // Reset particles
    this.particles.clear();
    
    // Start music
    this.audio.playMusic();
    
    // Show HUD
    this.ui.showHUD();
  }
  
  stopRace() {
    this.state = 'menu';
    this.engine.renderer.setAnimationLoop(null);
    this.audio.stopMusic();
    this.ui.hideHUD();
    this.ui.hideCountdown();
  }
  
  pause() {
    if (this.state === 'racing') {
      this.previousState = 'racing';
      this.state = 'paused';
      this.audio.pauseMusic();
      this.ui.showPauseMenu();
    }
  }
  
  resume() {
    if (this.state === 'paused') {
      this.state = this.previousState;
      this.audio.resumeMusic();
      this.ui.hidePauseMenu();
    }
  }
  
  update(time) {
    if (!this.lastTime) this.lastTime = time;
    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    
    // Update FPS counter
    if (this.settings.get('showFPS')) {
      this.ui.updateFPS(1 / deltaTime);
    }
    
    switch (this.state) {
      case 'countdown':
        this.updateCountdown(deltaTime);
        break;
      case 'racing':
        this.updateRace(deltaTime);
        break;
      case 'paused':
        // Still render but don't update physics
        this.engine.render();
        break;
      case 'finished':
        // Render final frame
        this.engine.render();
        break;
    }
  }
  
  updateCountdown(dt) {
    this.countdownTimer += dt;
    
    if (this.countdownTimer >= 1) {
      this.countdownValue--;
      this.countdownTimer = 0;
      
      if (this.countdownValue > 0) {
        this.ui.showCountdown(this.countdownValue);
        this.audio.playSFX('countdown');
      } else {
        this.ui.showCountdown('GO!');
        this.audio.playSFX('go');
        
        setTimeout(() => {
          this.ui.hideCountdown();
          this.beginRace();
        }, 500);
      }
    }
    
    // Still render during countdown
    this.engine.render();
  }
  
  beginRace() {
    this.state = 'racing';
    this.raceStartTime = performance.now();
    this.currentLapStartTime = this.raceStartTime;
    this.player.enabled = true;
    this.opponents.enabled = true;
  }
  
  updateRace(dt) {
    // Fixed timestep physics
    this.accumulator += dt;
    let steps = 0;
    
    while (this.accumulator >= this.fixedTimeStep && steps < this.maxSubSteps) {
      this.fixedUpdate(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
      steps++;
    }
    
    // Interpolation factor for smooth rendering
    const alpha = this.accumulator / this.fixedTimeStep;
    
    // Update player (with interpolation)
    this.player.update(dt, alpha);
    
    // Update opponents
    this.opponents.update(dt, this.player);
    
    // Update particles
    this.particles.update(dt, this.player);
    
    // Update neon lights
    this.updateNeonLights(dt);
    
    // Update camera
    this.engine.updateCamera(this.player);
    
    // Update UI
    this.updateUI();
    
    // Check race completion
    if (this.lapCount >= this.totalLaps) {
      this.finishRace();
    }
    
    // Render
    this.engine.render();
  }
  
  fixedUpdate(dt) {
    this.player.fixedUpdate(dt);
    this.opponents.fixedUpdate(dt);
  }
  
  updateNeonLights(dt) {
    this.engine.scene.traverse((obj) => {
      if (obj.isPointLight && obj.userData.baseIntensity !== undefined) {
        obj.userData.phase += dt * 3;
        obj.intensity = obj.userData.baseIntensity + Math.sin(obj.userData.phase) * 0.5;
      }
    });
  }
  
  updateUI() {
    const speed = Math.round(this.player.speed * 3.6); // m/s to km/h
    this.ui.updateSpeed(speed);
    this.ui.updateGear(this.player.gear);
    this.ui.updateLapTime(this.getCurrentLapTime());
    this.ui.updateBestLap(this.bestLapTime);
    this.ui.updateLapCounter(this.lapCount + 1, this.totalLaps);
    this.ui.updatePosition(this.currentPosition, this.totalOpponents + 1);
    this.ui.updateMinimap(this.player, this.opponents, this.track);
    
    // Update top speed
    if (speed > this.topSpeed) this.topSpeed = speed;
  }
  
  getCurrentLapTime() {
    if (this.state !== 'racing') return 0;
    return (performance.now() - this.currentLapStartTime) / 1000;
  }
  
  onCheckpointReached(index) {
    this.playerCheckpointIndex = index;
    this.updatePositions();
  }
  
  onLapComplete(lapTime) {
    this.lapTimes.push(lapTime);
    if (lapTime < this.bestLapTime) this.bestLapTime = lapTime;
    this.lapCount++;
    this.currentLapStartTime = performance.now();
    
    this.audio.playSFX('checkpoint');
    this.ui.flashLapTime();
    
    if (this.lapCount >= this.totalLaps) {
      this.finishRace();
    }
  }
  
  updatePositions() {
    // Simple position calculation based on checkpoints and distance
    const playerProgress = this.playerCheckpointIndex + this.player.getCheckpointProgress();
    let position = 1;
    
    for (let i = 0; i < this.totalOpponents; i++) {
      const opp = this.opponents.vehicles[i];
      if (opp) {
        const oppProgress = this.opponentCheckpoints[i] + opp.getCheckpointProgress();
        if (oppProgress > playerProgress) position++;
      }
    }
    
    this.currentPosition = position;
  }
  
  finishRace() {
    this.state = 'finished';
    this.player.enabled = false;
    this.opponents.enabled = false;
    this.audio.stopMusic();
    this.audio.playSFX('victory');
    
    const totalTime = (performance.now() - this.raceStartTime) / 1000;
    
    // Save best time
    const trackBest = this.settings.get('bestTime') || Infinity;
    if (totalTime < trackBest) {
      this.settings.set('bestTime', totalTime);
      this.settings.save();
    }
    
    setTimeout(() => {
      this.ui.showResults({
        position: this.currentPosition,
        totalTime,
        bestLap: this.bestLapTime,
        topSpeed: this.topSpeed
      });
    }, 1500);
  }
  
  onRaceComplete() {
    // Called from UI when user clicks "Race Again"
    this.startRace();
  }
  
  applySettings(settings) {
    // Update quality settings
    const quality = settings.get('quality');
    this.engine.setQuality(quality);
    
    // Update fog density based on quality
    if (quality === 'low') {
      this.engine.scene.fog.density = 0.005;
      this.dirLight.castShadow = false;
    } else if (quality === 'medium') {
      this.engine.scene.fog.density = 0.0035;
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
    } else {
      this.engine.scene.fog.density = 0.0025;
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 2048;
      this.dirLight.shadow.mapSize.height = 2048;
    }
  }
  
  dispose() {
    this.engine.renderer.setAnimationLoop(null);
    this.engine.dispose();
    this.track.dispose();
    this.player.dispose();
    this.opponents.dispose();
    this.particles.dispose();
  }
}