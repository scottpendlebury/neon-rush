// Neon Rush - Particle System
import * as THREE from 'three';

export class Particles {
  constructor(engine) {
    this.engine = engine;
    this.systems = [];
    this.maxParticles = 2000;
    this.particlePool = [];
    this.poolIndex = 0;
    
    this.initPool();
  }
  
  initPool() {
    // Pre-allocate particle geometries
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const velocities = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);
    const life = new Float32Array(this.maxParticles);
    const maxLife = new Float32Array(this.maxParticles);
    const types = new Float32Array(this.maxParticles); // 0=tire smoke, 1=sparks, 2=boost, 3=explosion
    
    for (let i = 0; i < this.maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -1000;
      positions[i * 3 + 2] = 0;
      life[i] = 0;
      maxLife[i] = 1;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('life', new THREE.BufferAttribute(life, 1));
    geo.setAttribute('maxLife', new THREE.BufferAttribute(maxLife, 1));
    geo.setAttribute('type', new THREE.BufferAttribute(types, 1));
    geo.setDrawRange(0, 0);
    
    // Material for different particle types
    const mat = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.particleSystem = new THREE.Points(geo, mat);
    this.particleSystem.frustumCulled = false;
    this.engine.scene.add(this.particleSystem);
    
    this.geo = geo;
    this.positions = positions;
    this.velocities = velocities;
    this.colors = colors;
    this.sizes = sizes;
    this.life = life;
    this.maxLife = maxLife;
    this.types = types;
    this.activeCount = 0;
  }
  
  emitTireSmoke(position, velocity, intensity = 1) {
    const count = Math.floor(3 * intensity);
    for (let i = 0; i < count; i++) {
      this.spawnParticle(
        position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          0.1,
          (Math.random() - 0.5) * 0.5
        )),
        new THREE.Vector3(
          velocity.x * 0.1 + (Math.random() - 0.5) * 2,
          Math.random() * 1 + 0.5,
          velocity.z * 0.1 + (Math.random() - 0.5) * 2
        ),
        new THREE.Color(0x444455),
        0.3 + Math.random() * 0.2,
        0.5 + Math.random() * 0.5,
        0 // tire smoke
      );
    }
  }
  
  emitSparks(position, velocity, intensity = 1) {
    const count = Math.floor(8 * intensity);
    for (let i = 0; i < count; i++) {
      this.spawnParticle(
        position.clone(),
        new THREE.Vector3(
          velocity.x * 0.3 + (Math.random() - 0.5) * 10,
          Math.random() * 5 + 2,
          velocity.z * 0.3 + (Math.random() - 0.5) * 10
        ),
        new THREE.Color().setHSL(0.1, 1, 0.6 + Math.random() * 0.4),
        0.1 + Math.random() * 0.1,
        0.3 + Math.random() * 0.4,
        1 // sparks
      );
    }
  }
  
  emitBoostTrail(position, velocity, color) {
    const count = 2;
    for (let i = 0; i < count; i++) {
      this.spawnParticle(
        position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          Math.random() * 0.3 + 0.2,
          (Math.random() - 0.5) * 0.8
        )),
        new THREE.Vector3(
          velocity.x * 0.05 + (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 0.5,
          velocity.z * 0.05 + (Math.random() - 0.5) * 1
        ),
        color,
        0.2 + Math.random() * 0.2,
        0.4 + Math.random() * 0.3,
        2 // boost
      );
    }
  }
  
  emitExplosion(position, color, intensity = 1) {
    const count = Math.floor(30 * intensity);
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.5 + 0.3,
        Math.random() - 0.5
      ).normalize();
      
      const speed = 10 + Math.random() * 20 * intensity;
      
      this.spawnParticle(
        position.clone(),
        dir.multiplyScalar(speed),
        color.clone().multiplyScalar(0.5 + Math.random() * 0.5),
        0.2 + Math.random() * 0.4,
        0.5 + Math.random() * 1,
        3 // explosion
      );
    }
  }
  
  spawnParticle(position, velocity, color, size, life, type) {
    const idx = this.poolIndex % this.maxParticles;
    this.poolIndex++;
    if (this.activeCount < this.maxParticles) this.activeCount++;
    
    this.positions[idx * 3] = position.x;
    this.positions[idx * 3 + 1] = position.y;
    this.positions[idx * 3 + 2] = position.z;
    
    this.velocities[idx * 3] = velocity.x;
    this.velocities[idx * 3 + 1] = velocity.y;
    this.velocities[idx * 3 + 2] = velocity.z;
    
    this.colors[idx * 3] = color.r;
    this.colors[idx * 3 + 1] = color.g;
    this.colors[idx * 3 + 2] = color.b;
    
    this.sizes[idx] = size;
    this.life[idx] = life;
    this.maxLife[idx] = life;
    this.types[idx] = type;
  }
  
  update(dt, player) {
    let aliveCount = 0;
    
    for (let i = 0; i < this.activeCount; i++) {
      if (this.life[i] <= 0) continue;
      
      // Update life
      this.life[i] -= dt;
      if (this.life[i] <= 0) continue;
      
      const lifeRatio = this.life[i] / this.maxLife[i];
      const type = this.types[i];
      
      // Physics based on type
      if (type === 0) { // Tire smoke
        // Rise and disperse
        this.velocities[i * 3 + 1] += dt * 0.5;
        this.velocities[i * 3] *= 0.98;
        this.velocities[i * 3 + 2] *= 0.98;
      } else if (type === 1) { // Sparks
        // Gravity
        this.velocities[i * 3 + 1] -= dt * 15;
        this.velocities[i * 3] *= 0.99;
        this.velocities[i * 3 + 2] *= 0.99;
      } else if (type === 2) { // Boost trail
        // Fade quickly, minimal movement
        this.velocities[i * 3] *= 0.95;
        this.velocities[i * 3 + 1] -= dt * 0.5;
        this.velocities[i * 3 + 2] *= 0.95;
      } else if (type === 3) { // Explosion
        // Gravity and drag
        this.velocities[i * 3 + 1] -= dt * 10;
        this.velocities[i * 3] *= 0.98;
        this.velocities[i * 3 + 2] *= 0.98;
      }
      
      // Update position
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      
      // Size fade
      this.sizes[i] = this.sizes[i] * (0.5 + 0.5 * lifeRatio);
      
      // Color fade for smoke
      if (type === 0) {
        const fade = lifeRatio;
        this.colors[i * 3] *= fade;
        this.colors[i * 3 + 1] *= fade;
        this.colors[i * 3 + 2] *= fade;
      }
      
      aliveCount++;
    }
    
    this.geo.setDrawRange(0, aliveCount);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
    this.geo.attributes.life.needsUpdate = true;
  }
  
  clear() {
    for (let i = 0; i < this.activeCount; i++) {
      this.life[i] = 0;
      this.positions[i * 3 + 1] = -1000;
    }
    this.activeCount = 0;
    this.geo.setDrawRange(0, 0);
    this.geo.attributes.position.needsUpdate = true;
  }
  
  dispose() {
    this.engine.scene.remove(this.particleSystem);
    this.geo.dispose();
    this.particleSystem.material.dispose();
  }
}