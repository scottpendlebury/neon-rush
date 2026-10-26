// Neon Rush - Rendering Engine
import * as THREE from 'three';

export class Engine {
  constructor(settings) {
    this.settings = settings;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.composer = null;
    this.clock = new THREE.Clock();
    
    // Camera settings
    this.cameraOffset = new THREE.Vector3(0, 2.5, 6);
    this.cameraLookAt = new THREE.Vector3(0, 1, -10);
    this.currentCameraOffset = new THREE.Vector3();
    this.currentCameraLookAt = new THREE.Vector3();
    this.cameraLerp = 0.1;
    
    // Screen shake
    this.shakeIntensity = 0;
    this.shakeTime = 0;
    
    // Quality settings
    this.quality = 'medium';
    this.pixelRatio = 1;
  }
  
  init() {
    // Create renderer
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.quality !== 'low',
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.getMaxPixelRatio()));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = this.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = true;
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 8);
    
    // Handle resize
    window.addEventListener('resize', () => this.onResize());
    
    // Initialize post-processing (optional, for high quality)
    if (this.quality === 'high') {
      this.initPostProcessing();
    }
  }
  
  getMaxPixelRatio() {
    switch (this.quality) {
      case 'low': return 1.0;
      case 'medium': return 1.5;
      case 'high': return 2.0;
      default: return 1.5;
    }
  }
  
  initPostProcessing() {
    // Simplified - would use EffectComposer in full implementation
    // For now, we'll rely on renderer settings
  }
  
  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.getMaxPixelRatio()));
    
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }
  
  setQuality(quality) {
    this.quality = quality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.getMaxPixelRatio()));
    this.renderer.antialias = quality !== 'low';
    this.renderer.shadowMap.enabled = quality !== 'low';
    
    if (this.dirLight) {
      this.dirLight.castShadow = quality !== 'low';
    }
  }
  
  updateCamera(player) {
    if (!player || !player.chassis) return;
    
    const chassis = player.chassis;
    const velocity = player.velocity;
    const speed = player.speed;
    
    // Calculate ideal camera position behind car
    const forward = new THREE.Vector3();
    chassis.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
    
    // Base offset
    let targetOffset = this.cameraOffset.clone();
    
    // Speed-based FOV and distance adjustment
    const speedFactor = Math.min(speed / 40, 1);
    targetOffset.z += speedFactor * 3;
    targetOffset.y += speedFactor * 0.5;
    
    // Lean into turns
    const lateralAccel = player.lateralAcceleration || 0;
    targetOffset.x += lateralAccel * 0.5;
    
    // Screen shake
    if (this.shakeIntensity > 0) {
      this.shakeTime += 0.016;
      targetOffset.x += (Math.random() - 0.5) * this.shakeIntensity;
      targetOffset.y += (Math.random() - 0.5) * this.shakeIntensity * 0.5;
      targetOffset.z += (Math.random() - 0.5) * this.shakeIntensity * 0.3;
      this.shakeIntensity *= 0.95;
      if (this.shakeIntensity < 0.01) this.shakeIntensity = 0;
    }
    
    // Smooth camera movement
    this.currentCameraOffset.lerp(targetOffset, this.cameraLerp);
    
    // Apply offset relative to car
    const targetPos = new THREE.Vector3().copy(chassis.position);
    targetPos.add(forward.clone().multiplyScalar(-this.currentCameraOffset.z));
    targetPos.add(new THREE.Vector3(0, 1, 0).multiplyScalar(this.currentCameraOffset.y));
    targetPos.add(right.clone().multiplyScalar(this.currentCameraOffset.x));
    
    // Look at point ahead of car
    const lookAtPos = new THREE.Vector3().copy(chassis.position);
    lookAtPos.add(forward.clone().multiplyScalar(-10));
    lookAtPos.y += 1;
    lookAtPos.add(right.clone().multiplyScalar(this.currentCameraOffset.x * 0.3));
    
    this.currentCameraLookAt.lerp(lookAtPos, this.cameraLerp * 2);
    
    this.camera.position.lerp(targetPos, 0.15);
    this.camera.lookAt(this.currentCameraLookAt);
    
    // Dynamic FOV based on speed
    const baseFov = 70;
    const maxFov = 85;
    this.camera.fov = THREE.MathUtils.lerp(baseFov, maxFov, speedFactor * 0.5);
    this.camera.updateProjectionMatrix();
  }
  
  addScreenShake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }
  
  render() {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  dispose() {
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}