// Neon Rush - Main Entry Point
import { Game } from './game.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { Settings } from './settings.js';

// Global instances
let game, input, ui, audio, settings;

async function init() {
  // Initialize settings first
  settings = new Settings();
  settings.load();
  
  // Initialize audio
  audio = new Audio(settings);
  
  // Initialize input
  input = new Input(settings);
  
  // Initialize UI
  ui = new UI(settings, audio, input);
  
  // Initialize game
  game = new Game(settings, audio, input, ui);
  
  // Connect UI callbacks
  ui.onStartGame = () => {
    audio.unlock();
    game.startRace();
  };
  ui.onRestartRace = () => {
    game.startRace();
  };
  ui.onMainMenu = () => {
    game.stopRace();
    ui.showTitleScreen();
  };
  ui.onResume = () => {
    game.resume();
  };
  ui.onPause = () => {
    game.pause();
  };
  ui.onSettingsChange = (key, value) => {
    settings.set(key, value);
    game.applySettings(settings);
    audio.applySettings(settings);
  };
  
  // Start the game loop
  game.init();
  
  // Hide loading screen
  const loading = document.getElementById('loading');
  loading.classList.add('hidden');
  
  // Show title screen
  ui.showTitleScreen();
  
  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'racing') {
      game.pause();
      ui.showPauseMenu();
    }
  });
  
  // Global error handler
  window.addEventListener('error', (e) => {
    console.error('Game error:', e.error);
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
  });
}

init();