// Neon Rush - Settings Management
export class Settings {
  constructor() {
    this.defaults = {
      masterVolume: 70,
      sfxVolume: 80,
      musicVolume: 50,
      quality: 'medium',
      touchSensitivity: 100,
      invertLook: false,
      showFPS: false,
      bestTime: null
    };
    
    this.data = { ...this.defaults };
  }
  
  load() {
    try {
      const saved = localStorage.getItem('neon-rush-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = { ...this.defaults, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }
  
  save() {
    try {
      localStorage.setItem('neon-rush-settings', JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }
  
  get(key) {
    return this.data[key];
  }
  
  set(key, value) {
    this.data[key] = value;
    this.save();
    
    // Dispatch event for other systems
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { key, value } }));
  }
  
  reset() {
    this.data = { ...this.defaults };
    this.save();
  }
}