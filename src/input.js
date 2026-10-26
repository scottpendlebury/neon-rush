// Neon Rush - Input Handling
export class Input {
  constructor(settings) {
    this.settings = settings;
    
    // Keyboard state
    this.keys = new Set();
    this.keyMap = {
      'KeyW': 'forward', 'ArrowUp': 'forward',
      'KeyS': 'backward', 'ArrowDown': 'backward',
      'KeyA': 'left', 'ArrowLeft': 'left',
      'KeyD': 'right', 'ArrowRight': 'right',
      'ShiftLeft': 'boost', 'ShiftRight': 'boost',
      'Space': 'brake',
      'Escape': 'pause'
    };
    
    // Mouse/Pointer state
    this.pointerLocked = false;
    this.mouseDelta = { x: 0, y: 0 };
    this.mouseSensitivity = 0.002;
    
    // Touch state
    this.touchMoveId = null;
    this.touchLookId = null;
    this.touchMoveOrigin = { x: 0, y: 0 };
    this.touchLookOrigin = { x: 0, y: 0 };
    this.touchMoveCurrent = { x: 0, y: 0 };
    this.touchLookCurrent = { x: 0, y: 0 };
    this.touchButtons = new Set();
    
    // Unified input state
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.held = {
      forward: false, backward: false, left: false, right: false,
      boost: false, brake: false, pause: false
    };
    this.actions = {
      boost: false, brake: false, pause: false
    };
    
    // Callbacks
    this.onPause = null;
    
    // Elements
    this.canvas = document.getElementById('game-canvas');
    this.steeringZone = document.getElementById('steering-zone');
    this.steeringKnob = document.getElementById('steering-knob');
    this.boostBtn = document.getElementById('btn-boost');
    this.brakeBtn = document.getElementById('btn-brake');
    
    this.init();
  }
  
  init() {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Pointer lock
    this.canvas.addEventListener('click', this.requestPointerLock.bind(this));
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Prevent context menu
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    
    // Touch events for mobile
    this.initTouchControls();
    
    // Settings change listener
    window.addEventListener('settingsChanged', (e) => {
      if (e.detail.key === 'mouseSensitivity') {
        this.mouseSensitivity = e.detail.value * 0.002;
      } else if (e.detail.key === 'touchSensitivity') {
        this.touchSensitivity = e.detail.value / 100;
      } else if (e.detail.key === 'invertLook') {
        this.invertLook = e.detail.value;
      }
    });
    
    // Default sensitivity
    this.touchSensitivity = this.settings.get('touchSensitivity') / 100 || 1;
    this.invertLook = this.settings.get('invertLook') || false;
  }
  
  onKeyDown(e) {
    if (this.isInputBlocked()) return;
    
    const action = this.keyMap[e.code];
    if (action) {
      this.keys.add(e.code);
      this.held[action] = true;
      if (action === 'pause' && !this.actions.pause) {
        this.actions.pause = true;
        if (this.onPause) this.onPause();
      }
      e.preventDefault();
    }
  }
  
  onKeyUp(e) {
    const action = this.keyMap[e.code];
    if (action) {
      this.keys.delete(e.code);
      this.held[action] = false;
      if (action === 'pause') this.actions.pause = false;
    }
  }
  
  onMouseMove(e) {
    if (!this.pointerLocked) return;
    
    this.mouseDelta.x += e.movementX;
    this.mouseDelta.y += e.movementY;
  }
  
  requestPointerLock() {
    if (document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock({ unadjustedMovement: true }).catch(() => {
        console.log('Pointer lock failed');
      });
    }
  }
  
  onPointerLockChange() {
    this.pointerLocked = document.pointerLockElement === this.canvas;
    this.canvas.style.cursor = this.pointerLocked ? 'none' : 'default';
  }
  
  initTouchControls() {
    // Steering zone (left side)
    this.steeringZone.addEventListener('pointerdown', this.onTouchSteeringStart.bind(this));
    this.steeringZone.addEventListener('pointermove', this.onTouchSteeringMove.bind(this));
    this.steeringZone.addEventListener('pointerup', this.onTouchSteeringEnd.bind(this));
    this.steeringZone.addEventListener('pointercancel', this.onTouchSteeringEnd.bind(this));
    this.steeringZone.addEventListener('pointerleave', this.onTouchSteeringEnd.bind(this));
    
    // Buttons
    const setupButton = (btn, action) => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.touchButtons.add(action);
        this.held[action] = true;
        btn.classList.add('active');
      });
      btn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        this.touchButtons.delete(action);
        this.held[action] = false;
        btn.classList.remove('active');
      });
      btn.addEventListener('pointercancel', (e) => {
        e.preventDefault();
        this.touchButtons.delete(action);
        this.held[action] = false;
        btn.classList.remove('active');
      });
      btn.addEventListener('pointerleave', (e) => {
        e.preventDefault();
        this.touchButtons.delete(action);
        this.held[action] = false;
        btn.classList.remove('active');
      });
    };
    
    setupButton(this.boostBtn, 'boost');
    setupButton(this.brakeBtn, 'brake');
    
    // Prevent scrolling on game container
    document.getElementById('game-container').addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  }
  
  onTouchSteeringStart(e) {
    if (this.touchMoveId !== null) return;
    
    this.touchMoveId = e.pointerId;
    this.touchMoveOrigin.x = e.clientX;
    this.touchMoveOrigin.y = e.clientY;
    this.touchMoveCurrent.x = e.clientX;
    this.touchMoveCurrent.y = e.clientY;
    this.steeringZone.classList.add('active');
    e.preventDefault();
  }
  
  onTouchSteeringMove(e) {
    if (e.pointerId !== this.touchMoveId) return;
    
    this.touchMoveCurrent.x = e.clientX;
    this.touchMoveCurrent.y = e.clientY;
    e.preventDefault();
  }
  
  onTouchSteeringEnd(e) {
    if (e.pointerId !== this.touchMoveId) return;
    
    this.touchMoveId = null;
    this.steeringZone.classList.remove('active');
    this.steeringKnob.style.transform = 'translate(-50%, -50%)';
    e.preventDefault();
  }
  
  update() {
    // Reset frame actions
    this.actions.boost = false;
    this.actions.brake = false;
    this.actions.pause = false;
    
    // Process keyboard movement
    this.move.x = 0;
    this.move.y = 0;
    
    if (this.held.forward) this.move.y = 1;
    if (this.held.backward) this.move.y = -1;
    if (this.held.left) this.move.x = -1;
    if (this.held.right) this.move.x = 1;
    
    // Normalize diagonal
    if (this.move.x !== 0 && this.move.y !== 0) {
      const len = Math.sqrt(this.move.x ** 2 + this.move.y ** 2);
      this.move.x /= len;
      this.move.y /= len;
    }
    
    // Process touch steering
    if (this.touchMoveId !== null) {
      const dx = this.touchMoveCurrent.x - this.touchMoveOrigin.x;
      const dy = this.touchMoveCurrent.y - this.touchMoveOrigin.y;
      const maxRadius = 50 * this.touchSensitivity;
      
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxRadius) {
        const angle = Math.atan2(dy, dx);
        this.touchMoveCurrent.x = this.touchMoveOrigin.x + Math.cos(angle) * maxRadius;
        this.touchMoveCurrent.y = this.touchMoveOrigin.y + Math.sin(angle) * maxRadius;
      }
      
      // Update knob position
      const knobX = this.touchMoveCurrent.x - this.touchMoveOrigin.x;
      const knobY = this.touchMoveCurrent.y - this.touchMoveOrigin.y;
      this.steeringKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
      
      // Map to move input (x = steer, y = throttle/brake)
      this.move.x = -knobX / maxRadius;
      this.move.y = -knobY / maxRadius;
    }
    
    // Touch buttons
    if (this.touchButtons.has('boost')) {
      this.held.boost = true;
      this.actions.boost = true;
    }
    if (this.touchButtons.has('brake')) {
      this.held.brake = true;
      this.actions.brake = true;
    }
    
    // Keyboard boost/brake
    if (this.held.boost) this.actions.boost = true;
    if (this.held.brake) this.actions.brake = true;
    
    // Mouse look
    this.look.x = this.mouseDelta.x * this.mouseSensitivity;
    this.look.y = this.mouseDelta.y * this.mouseSensitivity;
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    
    // Invert look if setting enabled
    if (this.invertLook) this.look.y *= -1;
  }
  
  getMove() {
    return { ...this.move };
  }
  
  consumeLook() {
    const look = { ...this.look };
    this.look.x = 0;
    this.look.y = 0;
    return look;
  }
  
  consumeActions() {
    const actions = { ...this.actions };
    this.actions.boost = false;
    this.actions.brake = false;
    this.actions.pause = false;
    return actions;
  }
  
  isInputBlocked() {
    // Block input when menus are open
    const titleScreen = document.getElementById('title-screen');
    const pauseMenu = document.getElementById('pause-menu');
    const settingsMenu = document.getElementById('settings-menu');
    const resultsScreen = document.getElementById('results-screen');
    
    return titleScreen.classList.contains('active') ||
           pauseMenu.classList.contains('active') ||
           settingsMenu.classList.contains('active') ||
           resultsScreen.classList.contains('active');
  }
  
  setButton(name, down) {
    this.held[name] = down;
    if (down) this.actions[name] = true;
  }
}