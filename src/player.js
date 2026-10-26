// Neon Rush - Player Vehicle
import * as THREE from 'three';

export class Player {
  constructor(engine, track, audio, settings, input) {
    this.engine = engine;
    this.track = track;
    this.audio = audio;
    this.settings = settings;
    this.input = input;
    
    // Vehicle physics constants
    this.maxSpeed = 45; // m/s (~162 km/h)
    this.boostSpeed = 65; // m/s (~234 km/h)
    this.acceleration = 25;
    this.boostAcceleration = 40;
    this.brakeForce = 35;
    this.dragCoefficient = 0.02;
    this.downforceCoefficient = 0.5;
    
    this.steerSpeed = 3.5;
    this.maxSteerAngle = Math.PI / 4;
    this.steerReturnSpeed = 5;
    
    this.grip = 1.0;
    this.driftThreshold = 0.4;
    this.driftFactor = 0.6;
    
    // Gear system (visual only)
    this.gear = 1;
    this.gearRatios = [0, 3.5, 2.2, 1.5, 1.1, 0.8];
    this.maxEngineRPM = 8000;
    this.engineRPM = 0;
    
    // State
    this.enabled = false;
    this.speed = 0;
    this.velocity = new THREE.Vector3();
    this.angularVelocity = 0;
    this.steerAngle = 0;
    this.targetSteerAngle = 0;
    this.isBoosting = false;
    this.isBraking = false;
    this.isDrifting = false;
    this.boostMeter = 100;
    this.boostRegenRate = 15;
    this.boostDrainRate = 30;
    
    // Position tracking
    this.lapProgress = 0;
    this.lastCheckpointIndex = -1;
    this.checkpointProgress = 0;
    
    // Visual
    this.chassis = null;
    this.wheels = [];
    this.wheelMeshes = [];
    this.bodyMesh = null;
    this.neonTrails = [];
    this.boostParticles = null;
    
    // Audio
    this.engineSound = null;
    this.boostSound = null;
    this.tireSound = null;
    
    // Callbacks
    this.onCheckpoint = null;
    this.onLapComplete = null;
    
    // Lateral acceleration for camera
    this.lateralAcceleration = 0;
    
    // Temp vectors
    this._tempVec = new THREE.Vector3();
    this._tempQuat = new THREE.Quaternion();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
  }
  
  async init() {
    this.createVehicle();
    this.createSounds();
    this.reset();
  }
  
  createVehicle() {
    // Create vehicle group
    this.chassis = new THREE.Group();
    this.chassis.name = 'player-chassis';
    
    // Car body - low poly futuristic
    const bodyGeo = new THREE.BoxGeometry(2.2, 0.6, 4.5);
    // Bevel the shape
    const positions = bodyGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Taper front and back
      if (z > 1.5) {
        positions.setX(i, x * (1 - (z - 1.5) / 3 * 0.6));
        positions.setY(i, y * (1 - (z - 1.5) / 3 * 0.3));
      } else if (z < -1.5) {
        positions.setX(i, x * (1 - (-z - 1.5) / 3 * 0.4));
        positions.setY(i, y * (1 - (-z - 1.5) / 3 * 0.2));
      }
      // Lower the bottom
      if (y < 0) positions.setY(i, y * 0.5);
    }
    bodyGeo.computeVertexNormals();
    
    // Neon body material
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x001133,
      metalness: 0.8,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: 0x003366,
      emissiveIntensity: 0.3
    });
    
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = 0.5;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.chassis.add(this.bodyMesh);
    
    // Cockpit
    const cockpitGeo = new THREE.BoxGeometry(1.2, 0.5, 1.8);
    const cockpitMat = new THREE.MeshPhysicalMaterial({
      color: 0x000818,
      metalness: 0.9,
      roughness: 0.1,
      transmission: 0.8,
      thickness: 0.1,
      ior: 1.5
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 1.0, -0.3);
    cockpit.castShadow = true;
    this.chassis.add(cockpit);
    
    // Neon accent lines
    this.createNeonAccents();
    
    // Wheels
    this.createWheels();
    
    // Boost trail effect
    this.createBoostEffect();
    
    this.engine.scene.add(this.chassis);
  }
  
  createNeonAccents() {
    const neonColor = 0x00ffff;
    const neonMat = new THREE.MeshBasicMaterial({
      color: neonColor,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    // Side lines
    const lineGeo = new THREE.BoxGeometry(0.05, 0.1, 3.5);
    const leftLine = new THREE.Mesh(lineGeo, neonMat.clone());
    leftLine.position.set(-1.15, 0.4, -0.2);
    this.chassis.add(leftLine);
    
    const rightLine = new THREE.Mesh(lineGeo, neonMat.clone());
    rightLine.position.set(1.15, 0.4, -0.2);
    this.chassis.add(rightLine);
    
    // Rear light bar
    const rearGeo = new THREE.BoxGeometry(1.8, 0.08, 0.08);
    const rearLight = new THREE.Mesh(rearGeo, neonMat.clone());
    rearLight.position.set(0, 0.5, -2.3);
    this.chassis.add(rearLight);
    this.rearLight = rearLight;
    
    // Front lights
    const frontGeo = new THREE.BoxGeometry(0.4, 0.08, 0.08);
    const frontLeft = new THREE.Mesh(frontGeo, neonMat.clone());
    frontLeft.position.set(-0.7, 0.4, 2.1);
    this.chassis.add(frontLeft);
    
    const frontRight = new THREE.Mesh(frontGeo, neonMat.clone());
    frontRight.position.set(0.7, 0.4, 2.1);
    this.chassis.add(frontRight);
    
    // Underglow
    const underGlowGeo = new THREE.PlaneGeometry(2.5, 4.5);
    const underGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.underGlow = new THREE.Mesh(underGlowGeo, underGlowMat);
    this.underGlow.rotation.x = -Math.PI / 2;
    this.underGlow.position.y = 0.15;
    this.chassis.add(this.underGlow);
    
    // Store neon elements for animation
    this.neonElements = [leftLine, rightLine, rearLight, frontLeft, frontRight];
    this.baseNeonOpacity = 0.8;
  }
  
  createWheels() {
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.25, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    
    const wheelMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a0a0a,
      metalness: 0.3,
      roughness: 0.8,
      clearcoat: 0.5
    });
    
    const rimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.27, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshPhysicalMaterial({
      color: 0x222233,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const positions = [
      [-1.15, 0.45, 1.5],   // FL
      [1.15, 0.45, 1.5],    // FR
      [-1.15, 0.45, -1.5],  // RL
      [1.15, 0.45, -1.5]    // RR
    ];
    
    for (let i = 0; i < 4; i++) {
      const wheelGroup = new THREE.Group();
      
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      wheelGroup.add(tire);
      
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelGroup.add(rim);
      
      // Brake caliper
      const caliperGeo = new THREE.BoxGeometry(0.15, 0.2, 0.1);
      const caliperMat = new THREE.MeshPhysicalMaterial({ color: 0xff3300, metalness: 0.8 });
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(0, 0, 0.18);
      wheelGroup.add(caliper);
      
      wheelGroup.position.set(...positions[i]);
      this.chassis.add(wheelGroup);
      
      this.wheels.push({ group: wheelGroup, tire, rim, caliper, rotation: 0, steerable: i < 2 });
      this.wheelMeshes.push(wheelGroup);
    }
  }
  
  createBoostEffect() {
    // Particle system for boost
    const particleCount = 100;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
      alphas[i] = 0;
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const mat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.boostParticles = new THREE.Points(geo, mat);
    this.chassis.add(this.boostParticles);
    this.boostParticleData = { positions, sizes, alphas, colors, count: particleCount, index: 0 };
  }
  
  createSounds() {
    this.engineSound = this.audio.createEngineSound();
    this.boostSound = this.audio.createBoostSound();
    this.tireSound = this.audio.createTireSound();
  }
  
  reset() {
    // Find start position
    const startPos = this.track.getStartPosition();
    const startRot = this.track.getStartRotation();
    
    this.chassis.position.copy(startPos);
    this.chassis.rotation.y = startRot;
    
    this.velocity.set(0, 0, 0);
    this.angularVelocity = 0;
    this.speed = 0;
    this.steerAngle = 0;
    this.targetSteerAngle = 0;
    this.isBoosting = false;
    this.isBraking = false;
    this.isDrifting = false;
    this.boostMeter = 100;
    this.gear = 1;
    this.engineRPM = 800;
    
    this.lapProgress = 0;
    this.lastCheckpointIndex = -1;
    this.checkpointProgress = 0;
    
    // Reset visual
    this.underGlow.material.opacity = 0.15;
    this.neonElements.forEach(el => el.material.opacity = this.baseNeonOpacity);
    this.rearLight.material.color.setHex(0x00ffff);
    
    // Reset audio
    if (this.engineSound) this.audio.playEngineSound(this.engineSound);
  }
  
  update(dt, alpha) {
    if (!this.enabled) return;
    
    this.handleInput(dt);
    this.updatePhysics(dt);
    this.updateVisuals(dt);
    this.updateAudio(dt);
    this.checkCheckpoints();
  }
  
  fixedUpdate(dt) {
    // Physics runs at fixed timestep
    // Already handled in updatePhysics with dt
  }
  
  handleInput(dt) {
    const move = this.input.getMove();
    const actions = this.input.held;
    
    // Steering
    this.targetSteerAngle = -move.x * this.maxSteerAngle;
    
    // Smooth steering return
    if (Math.abs(move.x) < 0.1) {
      this.targetSteerAngle *= 0.9;
    }
    
    // Boost
    this.isBoosting = actions.boost && this.boostMeter > 0 && this.speed > 5;
    
    // Brake
    this.isBraking = actions.brake;
    
    // Drift detection
    this.isDrifting = Math.abs(this.steerAngle) > this.driftThreshold && this.speed > 15 && !this.isBraking;
  }
  
  updatePhysics(dt) {
    // Get forward and right vectors
    this.chassis.getWorldDirection(this._forward);
    this._forward.y = 0;
    this._forward.normalize();
    this._right.crossVectors(this._up, this._forward).normalize();
    
    // Current speed
    this.speed = this.velocity.length();
    
    // Engine force
    let engineForce = 0;
    const currentMaxSpeed = this.isBoosting ? this.boostSpeed : this.maxSpeed;
    const currentAccel = this.isBoosting ? this.boostAcceleration : this.acceleration;
    
    if (this.speed < currentMaxSpeed) {
      engineForce = currentAccel * (1 - this.speed / currentMaxSpeed);
    }
    
    // Drag
    const dragForce = -this.velocity.clone().multiplyScalar(this.dragCoefficient * this.speed);
    
    // Downforce (increases grip at speed)
    const downforce = this.speed * this.speed * this.downforceCoefficient;
    this.grip = Math.min(1.0 + downforce * 0.001, 1.5);
    
    // Steering
    const steerDiff = this.targetSteerAngle - this.steerAngle;
    this.steerAngle += steerDiff * this.steerReturnSpeed * dt;
    
    // Angular velocity from steering
    if (this.speed > 0.5) {
      const steerEffectiveness = Math.min(this.speed / 20, 1);
      const targetAngularVel = (this.speed / 3.5) * Math.tan(this.steerAngle) * steerEffectiveness;
      
      if (this.isDrifting) {
        // Drift physics - oversteer
        this.angularVelocity = THREE.MathUtils.lerp(this.angularVelocity, targetAngularVel * 1.8, dt * 5);
        this.lateralAcceleration = this.speed * this.angularVelocity * 1.5;
      } else {
        this.angularVelocity = THREE.MathUtils.lerp(this.angularVelocity, targetAngularVel, dt * 8);
        this.lateralAcceleration = this.speed * this.angularVelocity;
      }
    } else {
      this.angularVelocity *= 0.95;
      this.lateralAcceleration = 0;
    }
    
    // Apply rotation
    this.chassis.rotation.y += this.angularVelocity * dt;
    
    // Calculate forces
    const forwardForce = this._forward.clone().multiplyScalar(engineForce);
    const brakeForce = this.isBraking ? this._forward.clone().multiplyScalar(-this.brakeForce * Math.sign(this._forward.dot(this.velocity))) : new THREE.Vector3();
    const lateralForce = this._right.clone().multiplyScalar(-this.velocity.dot(this._right) * this.grip * 8);
    
    // Total acceleration
    const acceleration = new THREE.Vector3()
      .add(forwardForce)
      .add(brakeForce)
      .add(lateralForce)
      .add(dragForce);
    
    // Apply
    this.velocity.addScaledVector(acceleration, dt);
    
    // Limit top speed
    if (this.velocity.length() > currentMaxSpeed) {
      this.velocity.setLength(currentMaxSpeed);
    }
    
    // Update position
    this.chassis.position.addScaledVector(this.velocity, dt);
    
    // Keep on ground (raycast)
    this.updateGroundContact();
    
    // Boost meter
    if (this.isBoosting) {
      this.boostMeter = Math.max(0, this.boostMeter - this.boostDrainRate * dt);
      if (this.boostMeter <= 0) this.isBoosting = false;
    } else {
      this.boostMeter = Math.min(100, this.boostMeter + this.boostRegenRate * dt);
    }
    
    // Gear calculation (visual)
    this.updateGear();
    
    // Engine RPM
    this.engineRPM = 800 + (this.speed / this.maxSpeed) * 7000 + Math.sin(Date.now() * 0.005) * 200;
  }
  
  updateGroundContact() {
    // Simple raycast to ground
    const raycaster = new THREE.Raycaster();
    raycaster.set(this.chassis.position.clone().add(new THREE.Vector3(0, 2, 0)), new THREE.Vector3(0, -1, 0));
    
    const intersects = raycaster.intersectObject(this.track.groundMesh, true);
    if (intersects.length > 0) {
      const groundY = intersects[0].point.y;
      this.chassis.position.y = groundY + 0.45;
    }
  }
  
  updateGear() {
    const ratios = this.gearRatios;
    for (let i = ratios.length - 1; i > 0; i--) {
      if (this.speed > 5 * i) {
        this.gear = i;
        break;
      }
    }
    this.gear = Math.max(1, Math.min(this.gear, ratios.length - 1));
  }
  
  updateVisuals(dt) {
    // Wheel rotation
    for (const wheel of this.wheels) {
      wheel.rotation += (this.speed / 0.45) * dt;
      wheel.group.rotation.x = wheel.rotation;
      
      // Steering rotation for front wheels
      if (wheel.steerable) {
        wheel.group.rotation.y = this.steerAngle;
      }
    }
    
    // Neon pulse based on speed
    const pulseIntensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.005 + this.speed * 0.1);
    const boostPulse = this.isBoosting ? 1 + Math.sin(Date.now() * 0.02) * 0.5 : 1;
    
    this.neonElements.forEach((el, i) => {
      const baseOpacity = this.baseNeonOpacity * (i === 2 ? 1 : 0.8); // Rear light brighter
      el.material.opacity = baseOpacity * pulseIntensity * boostPulse;
      
      if (this.isBoosting) {
        el.material.color.setHex(0xff00ff);
      } else {
        el.material.color.setHex(0x00ffff);
      }
    });
    
    // Rear light intensity when braking
    if (this.isBraking) {
      this.rearLight.material.color.setHex(0xff0000);
      this.rearLight.material.opacity = 1;
    }
    
    // Underglow
    this.underGlow.material.opacity = 0.15 * (this.isBoosting ? 2 : 1) * pulseIntensity;
    if (this.isBoosting) {
      this.underGlow.material.color.setHex(0xff00ff);
    } else {
      this.underGlow.material.color.setHex(0x00ffff);
    }
    
    // Body emissive
    this.bodyMesh.material.emissiveIntensity = 0.3 + this.speed / this.maxSpeed * 0.4;
    if (this.isBoosting) {
      this.bodyMesh.material.emissive.setHex(0x330066);
    } else {
      this.bodyMesh.material.emissive.setHex(0x003366);
    }
    
    // Boost particles
    this.updateBoostParticles(dt);
    
    // Chassis lean
    const targetLean = -this.lateralAcceleration * 0.02;
    this.chassis.rotation.z = THREE.MathUtils.lerp(this.chassis.rotation.z, targetLean, dt * 5);
  }
  
  updateBoostParticles(dt) {
    if (!this.isBoosting) {
      // Fade out
      const alphas = this.boostParticleData.alphas;
      for (let i = 0; i < alphas.length; i++) {
        alphas[i] *= 0.95;
      }
      this.boostParticles.geometry.attributes.alpha.needsUpdate = true;
      return;
    }
    
    const data = this.boostParticleData;
    const positions = data.positions;
    const sizes = data.sizes;
    const alphas = data.alphas;
    const colors = data.colors;
    
    // Spawn new particles
    const spawnCount = 3;
    for (let i = 0; i < spawnCount; i++) {
      const idx = data.index % data.count;
      
      // Spawn behind car
      const spread = (Math.random() - 0.5) * 1.5;
      const height = Math.random() * 0.5 + 0.2;
      
      positions[idx * 3] = spread;
      positions[idx * 3 + 1] = height;
      positions[idx * 3 + 2] = 2.5;
      
      sizes[idx] = Math.random() * 0.4 + 0.2;
      alphas[idx] = 1;
      
      // Cyan to magenta gradient
      const t = Math.random();
      colors[idx * 3] = t;      // R
      colors[idx * 3 + 1] = 1 - t * 0.5; // G
      colors[idx * 3 + 2] = 1;  // B
      
      data.index++;
    }
    
    // Update existing particles
    for (let i = 0; i < data.count; i++) {
      if (alphas[i] > 0) {
        // Move backward relative to car
        positions[i * 3 + 2] += this.speed * dt * 1.5;
        positions[i * 3 + 1] -= dt * 0.5; // Fall down
        
        alphas[i] -= dt * 1.5;
        sizes[i] *= 0.98;
        
        if (alphas[i] <= 0) {
          alphas[i] = 0;
          positions[i * 3 + 1] = -100;
        }
      }
    }
    
    this.boostParticles.geometry.attributes.position.needsUpdate = true;
    this.boostParticles.geometry.attributes.size.needsUpdate = true;
    this.boostParticles.geometry.attributes.alpha.needsUpdate = true;
    this.boostParticles.geometry.attributes.color.needsUpdate = true;
  }
  
  updateAudio(dt) {
    if (!this.engineSound) return;
    
    // Engine pitch based on RPM
    const rpmRatio = this.engineRPM / this.maxEngineRPM;
    this.engineSound.playbackRate = 0.5 + rpmRatio * 1.5;
    
    // Volume based on speed and throttle
    const throttle = this.enabled && !this.isBraking ? 1 : 0;
    this.engineSound.gainNode.gain.value = 0.3 + throttle * 0.4 * Math.min(this.speed / this.maxSpeed, 1);
    
    // Boost sound
    if (this.boostSound) {
      if (this.isBoosting && this.boostSound.gainNode.gain.value < 0.5) {
        this.boostSound.gainNode.gain.value = Math.min(0.5, this.boostSound.gainNode.gain.value + dt * 2);
      } else if (!this.isBoosting && this.boostSound.gainNode.gain.value > 0) {
        this.boostSound.gainNode.gain.value = Math.max(0, this.boostSound.gainNode.gain.value - dt * 3);
      }
    }
    
    // Tire screech
    if (this.tireSound && this.isDrifting && this.speed > 15) {
      this.tireSound.gainNode.gain.value = Math.min(0.4, this.tireSound.gainNode.gain.value + dt * 3);
    } else if (this.tireSound) {
      this.tireSound.gainNode.gain.value = Math.max(0, this.tireSound.gainNode.gain.value - dt * 5);
    }
  }
  
  checkCheckpoints() {
    const checkpoints = this.track.checkpoints;
    const nextIndex = (this.lastCheckpointIndex + 1) % checkpoints.length;
    const nextCP = checkpoints[nextIndex];
    
    const dist = this.chassis.position.distanceTo(new THREE.Vector3(nextCP.x, 0, nextCP.z));
    
    if (dist < 8) {
      // Passed checkpoint
      if (nextIndex === 0 && this.lastCheckpointIndex === checkpoints.length - 1) {
        // Lap complete
        const lapTime = (performance.now() - this.lapStartTime) / 1000;
        if (this.onLapComplete) this.onLapComplete(lapTime);
        this.lapStartTime = performance.now();
      }
      
      this.lastCheckpointIndex = nextIndex;
      this.checkpointProgress = 0;
      
      if (this.onCheckpoint) this.onCheckpoint(nextIndex);
    } else {
      // Progress towards next checkpoint
      const prevCP = checkpoints[this.lastCheckpointIndex >= 0 ? this.lastCheckpointIndex : checkpoints.length - 1];
      const totalDist = new THREE.Vector3(prevCP.x, 0, prevCP.z).distanceTo(new THREE.Vector3(nextCP.x, 0, nextCP.z));
      const currentDist = this.chassis.position.distanceTo(new THREE.Vector3(prevCP.x, 0, prevCP.z));
      this.checkpointProgress = Math.min(currentDist / totalDist, 1);
    }
  }
  
  getCheckpointProgress() {
    return this.checkpointProgress;
  }
  
  dispose() {
    this.engine.scene.remove(this.chassis);
    this.chassis.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    
    if (this.engineSound) this.audio.stopSound(this.engineSound);
    if (this.boostSound) this.audio.stopSound(this.boostSound);
    if (this.tireSound) this.audio.stopSound(this.tireSound);
  }
}