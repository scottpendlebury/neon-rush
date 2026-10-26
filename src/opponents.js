// Neon Rush - AI Opponents
import * as THREE from 'three';

export class Opponents {
  constructor(engine, track, count, audio) {
    this.engine = engine;
    this.track = track;
    this.count = count;
    this.audio = audio;
    
    this.vehicles = [];
    this.enabled = false;
    
    // Opponent personalities
    this.personalities = [
      { name: 'RAZOR', aggression: 0.9, skill: 0.95, color: 0xff0044, boostFreq: 0.3 },
      { name: 'PHANTOM', aggression: 0.6, skill: 0.9, color: 0x8800ff, boostFreq: 0.4 },
      { name: 'VOLT', aggression: 0.8, skill: 0.85, color: 0x00ffff, boostFreq: 0.35 },
      { name: 'NEON', aggression: 0.5, skill: 0.8, color: 0xffaa00, boostFreq: 0.25 },
      { name: 'DRIFT', aggression: 0.7, skill: 0.88, color: 0x00ff88, boostFreq: 0.4 },
      { name: 'SPECTRE', aggression: 0.4, skill: 0.92, color: 0xaa00ff, boostFreq: 0.3 },
      { name: 'BLAZE', aggression: 0.95, skill: 0.8, color: 0xff4400, boostFreq: 0.5 }
    ];
    
    this.onCheckpoint = null;
  }
  
  async init() {
    for (let i = 0; i < this.count; i++) {
      const personality = this.personalities[i % this.personalities.length];
      const vehicle = this.createVehicle(i, personality);
      this.vehicles.push(vehicle);
    }
  }
  
  createVehicle(index, personality) {
    const group = new THREE.Group();
    group.name = `opponent-${index}`;
    
    // Body
    const bodyGeo = new THREE.BoxGeometry(2.2, 0.6, 4.5);
    const positions = bodyGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      if (z > 1.5) {
        positions.setX(i, x * (1 - (z - 1.5) / 3 * 0.6));
        positions.setY(i, y * (1 - (z - 1.5) / 3 * 0.3));
      } else if (z < -1.5) {
        positions.setX(i, x * (1 - (-z - 1.5) / 3 * 0.4));
        positions.setY(i, y * (1 - (-z - 1.5) / 3 * 0.2));
      }
      if (y < 0) positions.setY(i, y * 0.5);
    }
    bodyGeo.computeVertexNormals();
    
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: personality.color,
      metalness: 0.7,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: personality.color,
      emissiveIntensity: 0.4
    });
    
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    
    // Cockpit
    const cockpitGeo = new THREE.BoxGeometry(1.2, 0.5, 1.8);
    const cockpitMat = new THREE.MeshPhysicalMaterial({
      color: 0x000818,
      metalness: 0.9,
      roughness: 0.1,
      transmission: 0.8,
      thickness: 0.1
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 1.0, -0.3);
    cockpit.castShadow = true;
    group.add(cockpit);
    
    // Neon accents
    this.addNeonAccents(group, personality.color);
    
    // Wheels
    const wheels = this.createWheels(group, personality.color);
    
    // Boost particles
    const boostParticles = this.createBoostParticles(group, personality.color);
    
    // Name tag
    const nameTag = this.createNameTag(personality.name);
    nameTag.position.y = 3.5;
    group.add(nameTag);
    
    // Physics state
    const startPos = this.getStartPosition(index);
    const startRot = this.track.getStartRotation();
    group.position.copy(startPos);
    group.rotation.y = startRot + (Math.random() - 0.5) * 0.1;
    
    return {
      group,
      body,
      wheels,
      boostParticles,
      nameTag,
      personality,
      // Physics
      velocity: new THREE.Vector3(),
      speed: 0,
      angularVelocity: 0,
      steerAngle: 0,
      targetSteerAngle: 0,
      isBoosting: false,
      boostMeter: 100,
      boostCooldown: 0,
      // AI
      targetCheckpoint: 1,
      checkpointProgress: 0,
      reactionDelay: 0.1 + Math.random() * 0.2,
      reactionTimer: 0,
      errorFactor: (1 - personality.skill) * 0.3,
      // State
      lapCount: 0,
      lastCheckpointIndex: 0
    };
  }
  
  addNeonAccents(group, color) {
    const neonMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    // Side lines
    const lineGeo = new THREE.BoxGeometry(0.05, 0.1, 3.5);
    const leftLine = new THREE.Mesh(lineGeo, neonMat.clone());
    leftLine.position.set(-1.15, 0.4, -0.2);
    group.add(leftLine);
    
    const rightLine = new THREE.Mesh(lineGeo, neonMat.clone());
    rightLine.position.set(1.15, 0.4, -0.2);
    group.add(rightLine);
    
    // Rear light
    const rearGeo = new THREE.BoxGeometry(1.8, 0.08, 0.08);
    const rearLight = new THREE.Mesh(rearGeo, neonMat.clone());
    rearLight.position.set(0, 0.5, -2.3);
    group.add(rearLight);
    
    // Underglow
    const underGlowGeo = new THREE.PlaneGeometry(2.5, 4.5);
    const underGlowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const underGlow = new THREE.Mesh(underGlowGeo, underGlowMat);
    underGlow.rotation.x = -Math.PI / 2;
    underGlow.position.y = 0.15;
    group.add(underGlow);
    
    group.userData.neonElements = [leftLine, rightLine, rearLight, underGlow];
    group.userData.baseColor = color;
  }
  
  createWheels(group, color) {
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.25, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, metalness: 0.3, roughness: 0.8 });
    
    const rimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.27, 10);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshPhysicalMaterial({ color, metalness: 0.8, roughness: 0.2, emissive: color, emissiveIntensity: 0.3 });
    
    const wheels = [];
    const positions = [
      [-1.15, 0.45, 1.5], [1.15, 0.45, 1.5],
      [-1.15, 0.45, -1.5], [1.15, 0.45, -1.5]
    ];
    
    for (let i = 0; i < 4; i++) {
      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelGroup.add(tire);
      wheelGroup.add(rim);
      wheelGroup.position.set(...positions[i]);
      group.add(wheelGroup);
      wheels.push({ group: wheelGroup, tire, rim, rotation: 0, steerable: i < 2 });
    }
    
    return wheels;
  }
  
  createBoostParticles(group, color) {
    const count = 50;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    const c = new THREE.Color(color);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
      alphas[i] = 0;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const mat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    const particles = new THREE.Points(geo, mat);
    group.add(particles);
    
    return { particles, positions, sizes, alphas, count, index: 0 };
  }
  
  createNameTag(name) {
    // Create canvas texture for name
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 32px Orbitron, sans-serif';
    ctx.fillStyle = '#00ffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText(name, 128, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const geo = new THREE.PlaneGeometry(4, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false
    });
    
    const tag = new THREE.Mesh(geo, mat);
    tag.renderOrder = 1000;
    return tag;
  }
  
  getStartPosition(index) {
    const startPos = this.track.trackPoints[0].clone();
    const binormal = this.track.binormals[0];
    const tangent = this.track.tangents[0];
    
    // Stagger starting positions
    const row = Math.floor(index / 2);
    const col = index % 2;
    const sideOffset = (col === 0 ? -1 : 1) * 4;
    const backOffset = -row * 6;
    
    startPos.add(binormal.clone().multiplyScalar(sideOffset));
    startPos.add(tangent.clone().multiplyScalar(backOffset));
    startPos.y = 0.5;
    
    return startPos;
  }
  
  reset() {
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const startPos = this.getStartPosition(i);
      const startRot = this.track.getStartRotation();
      
      v.group.position.copy(startPos);
      v.group.rotation.y = startRot + (Math.random() - 0.5) * 0.1;
      v.velocity.set(0, 0, 0);
      v.speed = 0;
      v.angularVelocity = 0;
      v.steerAngle = 0;
      v.targetSteerAngle = 0;
      v.isBoosting = false;
      v.boostMeter = 100;
      v.boostCooldown = 0;
      v.targetCheckpoint = 1;
      v.checkpointProgress = 0;
      v.reactionTimer = 0;
      v.lapCount = 0;
      v.lastCheckpointIndex = 0;
      
      // Reset visual
      v.group.userData.neonElements.forEach(el => el.material.opacity = 0.7);
      v.group.userData.underGlow.material.opacity = 0.1;
    }
    this.enabled = true;
  }
  
  update(dt, player) {
    if (!this.enabled) return;
    
    for (let i = 0; i < this.vehicles.length; i++) {
      this.updateVehicle(this.vehicles[i], dt, player, i);
    }
  }
  
  fixedUpdate(dt) {
    // Physics handled in updateVehicle
  }
  
  updateVehicle(v, dt, player, index) {
    // AI decision making
    v.reactionTimer += dt;
    if (v.reactionTimer < v.reactionDelay) return;
    v.reactionTimer = 0;
    
    // Get next checkpoint target
    const checkpoints = this.track.checkpoints;
    const targetCP = checkpoints[v.targetCheckpoint % checkpoints.length];
    
    // Vector to target
    const toTarget = new THREE.Vector3(targetCP.x, 0, targetCP.z).sub(
      new THREE.Vector3(v.group.position.x, 0, v.group.position.z)
    );
    const distToTarget = toTarget.length();
    
    // Check if reached checkpoint
    if (distToTarget < 10) {
      v.targetCheckpoint++;
      v.lastCheckpointIndex = (v.targetCheckpoint - 1) % checkpoints.length;
      
      if (this.onCheckpoint) {
        this.onCheckpoint(v.targetCheckpoint % checkpoints.length, index);
      }
      
      // Lap complete
      if (v.targetCheckpoint % checkpoints.length === 0) {
        v.lapCount++;
      }
    }
    
    // Calculate steering
    v.group.getWorldDirection(this._tempVec());
    this._tempVec().y = 0;
    this._tempVec().normalize();
    
    const forward = this._tempVec();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
    
    const targetDir = toTarget.clone().normalize();
    const dot = forward.dot(targetDir);
    const cross = forward.clone().cross(targetDir).y;
    
    // Steer towards target with personality
    let steerInput = -cross * v.personality.skill;
    
    // Add some error
    steerInput += (Math.random() - 0.5) * v.errorFactor;
    
    // Avoid other vehicles
    for (let j = 0; j < this.vehicles.length; j++) {
      if (j === index) continue;
      const other = this.vehicles[j];
      const toOther = other.group.position.clone().sub(v.group.position);
      toOther.y = 0;
      const otherDist = toOther.length();
      
      if (otherDist < 8 && otherDist > 0.5) {
        const avoidDir = toOther.clone().normalize().multiplyScalar(-1);
        const avoidStrength = (8 - otherDist) / 8 * v.personality.aggression;
        steerInput += avoidDir.dot(right) * avoidStrength * 2;
      }
    }
    
    // Avoid player
    if (player && player.chassis) {
      const toPlayer = player.chassis.position.clone().sub(v.group.position);
      toPlayer.y = 0;
      const playerDist = toPlayer.length();
      
      if (playerDist < 10 && playerDist > 0.5) {
        const avoidDir = toPlayer.clone().normalize().multiplyScalar(-1);
        const avoidStrength = (10 - playerDist) / 10 * v.personality.aggression * 0.5;
        steerInput += avoidDir.dot(right) * avoidStrength;
      }
    }
    
    v.targetSteerAngle = THREE.MathUtils.clamp(steerInput, -Math.PI / 3, Math.PI / 3);
    
    // Boost logic
    v.boostCooldown -= dt;
    if (v.boostMeter > 30 && v.boostCooldown <= 0 && v.speed > 20) {
      if (Math.random() < v.personality.boostFreq * dt) {
        v.isBoosting = true;
        v.boostCooldown = 2 + Math.random() * 3;
      }
    }
    
    if (v.isBoosting) {
      v.boostMeter = Math.max(0, v.boostMeter - 30 * dt);
      if (v.boostMeter <= 0) v.isBoosting = false;
    } else {
      v.boostMeter = Math.min(100, v.boostMeter + 15 * dt);
    }
    
    // Physics update
    this.updatePhysics(v, dt);
    this.updateVisuals(v, dt);
  }
  
  _tempVec() {
    if (!this._tempVector) this._tempVector = new THREE.Vector3();
    return this._tempVector;
  }
  
  updatePhysics(v, dt) {
    // Similar to player but simplified
    v.group.getWorldDirection(this._forward() || (this._forwardVec = new THREE.Vector3()));
    this._forwardVec.y = 0;
    this._forwardVec.normalize();
    
    this._rightVec().crossVectors(new THREE.Vector3(0, 1, 0), this._forwardVec).normalize();
    
    v.speed = v.velocity.length();
    
    // Engine force
    const maxSpeed = v.isBoosting ? 65 : 42;
    const accel = v.isBoosting ? 38 : 22;
    let engineForce = 0;
    if (v.speed < maxSpeed) {
      engineForce = accel * (1 - v.speed / maxSpeed);
    }
    
    // Drag
    const drag = v.velocity.clone().multiplyScalar(-0.02 * v.speed);
    
    // Steering
    const steerDiff = v.targetSteerAngle - v.steerAngle;
    v.steerAngle += steerDiff * 4 * dt;
    
    // Angular velocity
    if (v.speed > 0.5) {
      const targetAngular = (v.speed / 3.5) * Math.tan(v.steerAngle) * Math.min(v.speed / 15, 1);
      v.angularVelocity = THREE.MathUtils.lerp(v.angularVelocity, targetAngular, dt * 6);
    } else {
      v.angularVelocity *= 0.9;
    }
    
    v.group.rotation.y += v.angularVelocity * dt;
    
    // Forces
    const forwardForce = this._forwardVec.clone().multiplyScalar(engineForce);
    const lateralForce = this._rightVec().clone().multiplyScalar(-v.velocity.dot(this._rightVec()) * 1.2 * 8);
    
    const acceleration = new THREE.Vector3().add(forwardForce).add(lateralForce).add(drag);
    v.velocity.addScaledVector(acceleration, dt);
    
    // Limit speed
    if (v.velocity.length() > maxSpeed) v.velocity.setLength(maxSpeed);
    
    // Position
    v.group.position.addScaledVector(v.velocity, dt);
    
    // Ground contact
    this.updateGroundContact(v);
  }
  
  _forwardVec = new THREE.Vector3();
  _forward() { return this._forwardVec; }
  
  _rightVec = new THREE.Vector3();
  _rightVec() { return this._rightVec; }
  
  updateGroundContact(v) {
    const raycaster = new THREE.Raycaster();
    raycaster.set(v.group.position.clone().add(new THREE.Vector3(0, 2, 0)), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObject(this.track.groundMesh, true);
    if (intersects.length > 0) {
      v.group.position.y = intersects[0].point.y + 0.45;
    }
  }
  
  updateVisuals(v, dt) {
    // Wheel rotation
    for (const wheel of v.wheels) {
      wheel.rotation += (v.speed / 0.45) * dt;
      wheel.group.rotation.x = wheel.rotation;
      if (wheel.steerable) {
        wheel.group.rotation.y = v.steerAngle;
      }
    }
    
    // Neon pulse
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005 + v.speed * 0.1);
    const boostPulse = v.isBoosting ? 1.5 : 1;
    
    if (v.group.userData.neonElements) {
      v.group.userData.neonElements.forEach(el => {
        el.material.opacity = 0.7 * pulse * boostPulse;
        if (v.isBoosting) {
          el.material.color.setHex(0xffffff);
        } else {
          el.material.color.setHex(v.personality.color);
        }
      });
    }
    
    // Boost particles
    if (v.boostParticles && v.isBoosting) {
      this.updateBoostParticles(v.boostParticles, v.speed, dt);
    } else if (v.boostParticles) {
      // Fade out
      const alphas = v.boostParticles.alphas;
      for (let i = 0; i < alphas.length; i++) alphas[i] *= 0.95;
      v.boostParticles.particles.geometry.attributes.alpha.needsUpdate = true;
    }
    
    // Name tag always face camera
    if (v.nameTag) {
      v.nameTag.lookAt(this.engine.camera.position);
      v.nameTag.rotation.y += Math.PI;
    }
  }
  
  updateBoostParticles(bp, speed, dt) {
    const positions = bp.positions;
    const sizes = bp.sizes;
    const alphas = bp.alphas;
    
    const spawnCount = 2;
    for (let i = 0; i < spawnCount; i++) {
      const idx = bp.index % bp.count;
      const spread = (Math.random() - 0.5) * 1.2;
      const height = Math.random() * 0.4 + 0.2;
      
      positions[idx * 3] = spread;
      positions[idx * 3 + 1] = height;
      positions[idx * 3 + 2] = 2.5;
      sizes[idx] = Math.random() * 0.3 + 0.15;
      alphas[idx] = 1;
      bp.index++;
    }
    
    for (let i = 0; i < bp.count; i++) {
      if (alphas[i] > 0) {
        positions[i * 3 + 2] += speed * dt * 1.5;
        positions[i * 3 + 1] -= dt * 0.3;
        alphas[i] -= dt * 2;
        sizes[i] *= 0.97;
        if (alphas[i] <= 0) {
          alphas[i] = 0;
          positions[i * 3 + 1] = -100;
        }
      }
    }
    
    bp.particles.geometry.attributes.position.needsUpdate = true;
    bp.particles.geometry.attributes.size.needsUpdate = true;
    bp.particles.geometry.attributes.alpha.needsUpdate = true;
  }
  
  getCheckpointProgress(index) {
    const v = this.vehicles[index];
    if (!v) return 0;
    return v.checkpointProgress;
  }
  
  dispose() {
    for (const v of this.vehicles) {
      this.engine.scene.remove(v.group);
      v.group.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    this.vehicles = [];
  }
}