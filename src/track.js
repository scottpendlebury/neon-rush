// Neon Rush - Track Generation
import * as THREE from 'three';

export class Track {
  constructor(scene, engine) {
    this.scene = scene;
    this.engine = engine;
    this.group = new THREE.Group();
    this.group.name = 'track';
    
    // Track parameters
    this.trackWidth = 16;
    this.trackSegments = 120;
    this.checkpoints = [];
    
    // Generated geometry
    this.groundMesh = null;
    this.barriers = [];
    this.decorations = [];
    
    // Materials
    this.materials = {};
  }
  
  generate() {
    this.createMaterials();
    this.generateTrackPath();
    this.createTrackGeometry();
    this.createBarriers();
    this.createDecorations();
    this.createStartLine();
  }
  
  createMaterials() {
    // Track surface - dark asphalt with neon lines
    this.materials.track = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a2e,
      metalness: 0.1,
      roughness: 0.9,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4
    });
    
    // Neon edge lines
    this.materials.neonEdge = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    this.materials.neonEdgeAlt = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    // Barrier material
    this.materials.barrier = new THREE.MeshPhysicalMaterial({
      color: 0x0a0a1a,
      metalness: 0.7,
      roughness: 0.3,
      clearcoat: 0.5,
      emissive: 0x001133,
      emissiveIntensity: 0.2
    });
    
    this.materials.barrierNeon = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    // Ground outside track
    this.materials.ground = new THREE.MeshPhysicalMaterial({
      color: 0x050510,
      metalness: 0,
      roughness: 1
    });
  }
  
  generateTrackPath() {
    // Create a smooth racing circuit using spline
    const points = [];
    const numPoints = 16;
    
    // Generate control points for a figure-8 / complex oval
    for (let i = 0; i < numPoints; i++) {
      const t = i / numPoints * Math.PI * 2;
      
      // Base shape - modified figure 8 with varying radius
      const radius = 80 + Math.sin(t * 2) * 25 + Math.sin(t * 4) * 10;
      const x = Math.cos(t) * radius;
      const z = Math.sin(t) * radius * 0.7;
      
      // Add some vertical variation
      const y = Math.sin(t * 3) * 3;
      
      points.push(new THREE.Vector3(x, y, z));
    }
    
    // Create smooth spline
    this.spline = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    
    // Sample points for track construction
    this.trackPoints = this.spline.getPoints(this.trackSegments);
    
    // Compute tangents, normals, binormals
    this.tangents = [];
    this.normals = [];
    this.binormals = [];
    
    for (let i = 0; i < this.trackPoints.length; i++) {
      const tangent = this.spline.getTangent(i / this.trackSegments);
      this.tangents.push(new THREE.Vector3().copy(tangent));
      
      // Normal (up)
      const normal = new THREE.Vector3(0, 1, 0);
      this.normals.push(normal);
      
      // Binormal (right)
      const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      this.binormals.push(binormal);
    }
    
    // Generate checkpoints every N segments
    const cpInterval = Math.floor(this.trackSegments / 12);
    for (let i = 0; i < this.trackSegments; i += cpInterval) {
      const p = this.trackPoints[i];
      this.checkpoints.push({ x: p.x, y: p.y, z: p.z, index: i });
    }
  }
  
  createTrackGeometry() {
    // Create track mesh using extruded geometry
    const shape = new THREE.Shape();
    const halfWidth = this.trackWidth / 2;
    
    // Main track rectangle with rounded ends
    shape.moveTo(-halfWidth, -2);
    shape.lineTo(halfWidth, -2);
    shape.lineTo(halfWidth, 2);
    shape.lineTo(-halfWidth, 2);
    shape.closePath();
    
    // Extrude along path
    const extrudeSettings = {
      steps: this.trackSegments,
      curveSegments: 4,
      bevelEnabled: false,
      extrudePath: this.spline
    };
    
    const trackGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    trackGeo.computeVertexNormals();
    trackGeo.computeBoundingBox();
    
    this.groundMesh = new THREE.Mesh(trackGeo, this.materials.track);
    this.groundMesh.receiveShadow = true;
    this.groundMesh.name = 'track-surface';
    this.group.add(this.groundMesh);
    
    // Create edge lines (neon strips)
    this.createEdgeLines();
    
    // Create center line
    this.createCenterLine();
  }
  
  createEdgeLines() {
    const lineWidth = 0.3;
    const lineHeight = 0.1;
    
    for (let side = -1; side <= 1; side += 2) {
      const points = [];
      const neonPoints = [];
      
      for (let i = 0; i < this.trackPoints.length; i++) {
        const p = this.trackPoints[i];
        const binormal = this.binormals[i];
        
        // Edge position
        const edgePos = p.clone().add(binormal.clone().multiplyScalar(side * this.trackWidth / 2));
        edgePos.y += lineHeight;
        points.push(edgePos);
        
        // Neon strip slightly inside
        const neonPos = p.clone().add(binormal.clone().multiplyScalar(side * (this.trackWidth / 2 - 0.5)));
        neonPos.y += lineHeight + 0.02;
        neonPoints.push(neonPos);
      }
      
      // Physical edge barrier base
      const edgeGeo = new THREE.BufferGeometry().setFromPoints(points);
      const edgeMat = new THREE.MeshPhysicalMaterial({
        color: 0x001122,
        metalness: 0.8,
        roughness: 0.2,
        emissive: side === -1 ? 0x001133 : 0x330033,
        emissiveIntensity: 0.3
      });
      
      // Create ribbon geometry
      const ribbonGeo = new THREE.BufferGeometry();
      const ribbonPositions = [];
      const ribbonIndices = [];
      const ribbonUVs = [];
      
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const tangent = this.tangents[i];
        const binormal = this.binormals[i];
        
        const offset = binormal.clone().multiplyScalar(side * lineWidth / 2);
        const up = new THREE.Vector3(0, lineHeight, 0);
        
        // Quad for this segment
        const baseIdx = i * 4;
        ribbonPositions.push(
          p1.x - offset.x, p1.y, p1.z - offset.z,
          p1.x + offset.x, p1.y, p1.z + offset.z,
          p2.x - offset.x, p2.y, p2.z - offset.z,
          p2.x + offset.x, p2.y, p2.z + offset.z
        );
        
        ribbonIndices.push(baseIdx, baseIdx + 2, baseIdx + 1, baseIdx + 1, baseIdx + 2, baseIdx + 3);
        ribbonUVs.push(0, 0, 1, 0, 0, 1, 1, 1);
      }
      
      // Close the loop
      const p1 = points[points.length - 1];
      const p2 = points[0];
      const tangent = this.tangents[0];
      const binormal = this.binormals[0];
      const offset = binormal.clone().multiplyScalar(side * lineWidth / 2);
      
      const baseIdx = (points.length - 1) * 4;
      ribbonPositions.push(
        p1.x - offset.x, p1.y, p1.z - offset.z,
        p1.x + offset.x, p1.y, p1.z + offset.z,
        p2.x - offset.x, p2.y, p2.z - offset.z,
        p2.x + offset.x, p2.y, p2.z + offset.z
      );
      ribbonIndices.push(baseIdx, baseIdx + 2, baseIdx + 1, baseIdx + 1, baseIdx + 2, baseIdx + 3);
      ribbonUVs.push(0, 0, 1, 0, 0, 1, 1, 1);
      
      ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
      ribbonGeo.setIndex(ribbonIndices);
      ribbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ribbonUVs, 2));
      ribbonGeo.computeVertexNormals();
      
      const edgeMesh = new THREE.Mesh(ribbonGeo, edgeMat);
      edgeMesh.castShadow = true;
      edgeMesh.receiveShadow = true;
      this.group.add(edgeMesh);
      this.barriers.push(edgeMesh);
      
      // Neon line
      const neonGeo = new THREE.BufferGeometry().setFromPoints(neonPoints);
      const neonMat = side === -1 ? this.materials.neonEdge : this.materials.neonEdgeAlt;
      const neonLine = new THREE.Line(neonGeo, neonMat);
      neonLine.computeLineDistances();
      this.group.add(neonLine);
      
      // Store for animation
      neonLine.userData = { side, phase: Math.random() * Math.PI * 2 };
      this.decorations.push(neonLine);
    }
  }
  
  createCenterLine() {
    // Dashed center line
    const points = [];
    const dashLength = 3;
    const gapLength = 3;
    let dashAccum = 0;
    let inDash = true;
    
    for (let i = 0; i < this.trackPoints.length - 1; i++) {
      const p1 = this.trackPoints[i];
      const p2 = this.trackPoints[i + 1];
      const segmentLen = p1.distanceTo(p2);
      
      let remaining = segmentLen;
      let t = 0;
      
      while (remaining > 0) {
        const step = Math.min(remaining, inDash ? dashLength - dashAccum : gapLength - dashAccum);
        dashAccum += step;
        remaining -= step;
        t += step / segmentLen;
        
        if (inDash) {
          const pt = p1.clone().lerp(p2, Math.min(t, 1));
          pt.y += 0.06;
          points.push(pt);
        }
        
        if ((inDash && dashAccum >= dashLength) || (!inDash && dashAccum >= gapLength)) {
          inDash = !inDash;
          dashAccum = 0;
        }
      }
    }
    
    const centerGeo = new THREE.BufferGeometry().setFromPoints(points);
    const centerMat = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const centerLine = new THREE.Line(centerGeo, centerMat);
    this.group.add(centerLine);
    this.decorations.push(centerLine);
  }
  
  createBarriers() {
    // Outer barriers with neon tops
    const barrierHeight = 1.5;
    const barrierWidth = 0.5;
    
    for (let side = -1; side <= 1; side += 2) {
      const positions = [];
      const indices = [];
      const uvs = [];
      
      for (let i = 0; i < this.trackPoints.length; i++) {
        const p = this.trackPoints[i];
        const binormal = this.binormals[i];
        
        const offset = binormal.clone().multiplyScalar(side * (this.trackWidth / 2 + barrierWidth / 2));
        
        // Four corners of barrier segment
        const baseIdx = i * 4;
        positions.push(
          p.x - offset.x, p.y, p.z - offset.z,
          p.x + offset.x, p.y, p.z + offset.z,
          p.x - offset.x, p.y + barrierHeight, p.z - offset.z,
          p.x + offset.x, p.y + barrierHeight, p.z + offset.z
        );
        
        uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
        
        if (i > 0) {
          const prevBase = (i - 1) * 4;
          // Side faces
          indices.push(prevBase, baseIdx, prevBase + 2);
          indices.push(baseIdx, baseIdx + 2, prevBase + 2);
          indices.push(prevBase + 1, prevBase + 3, baseIdx + 1);
          indices.push(baseIdx + 1, prevBase + 3, baseIdx + 3);
          // Top face
          indices.push(prevBase + 2, baseIdx + 2, prevBase + 3);
          indices.push(baseIdx + 2, baseIdx + 3, prevBase + 3);
        }
      }
      
      // Close loop
      const p1 = this.trackPoints[this.trackPoints.length - 1];
      const p2 = this.trackPoints[0];
      const binormal = this.binormals[0];
      const offset = binormal.clone().multiplyScalar(side * (this.trackWidth / 2 + barrierWidth / 2));
      
      // Indices for closing
      const lastBase = (this.trackPoints.length - 1) * 4;
      indices.push(lastBase, 0, lastBase + 2);
      indices.push(0, 2, lastBase + 2);
      indices.push(lastBase + 1, 3, lastBase + 3);
      indices.push(3, 1, lastBase + 3);
      indices.push(lastBase + 2, 2, lastBase + 3);
      indices.push(2, 3, lastBase + 3);
      
      const barrierGeo = new THREE.BufferGeometry();
      barrierGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      barrierGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      barrierGeo.setIndex(indices);
      barrierGeo.computeVertexNormals();
      
      const barrierMesh = new THREE.Mesh(barrierGeo, this.materials.barrier);
      barrierMesh.castShadow = true;
      barrierMesh.receiveShadow = true;
      this.group.add(barrierMesh);
      this.barriers.push(barrierMesh);
      
      // Neon top strip
      const neonPositions = [];
      for (let i = 0; i < this.trackPoints.length; i++) {
        const p = this.trackPoints[i];
        const b = this.binormals[i];
        const o = b.clone().multiplyScalar(side * (this.trackWidth / 2 + barrierWidth / 2));
        neonPositions.push(p.x + o.x, p.y + barrierHeight + 0.02, p.z + o.z);
      }
      
      const neonGeo = new THREE.BufferGeometry().setFromPoints(
        neonPositions.map((v, i, arr) => i % 3 === 0 ? new THREE.Vector3(arr[i], arr[i+1], arr[i+2]) : null).filter(v => v)
      );
      const neonLine = new THREE.Line(neonGeo, this.materials.barrierNeon.clone());
      this.group.add(neonLine);
      neonLine.userData = { side, phase: Math.random() * Math.PI * 2 };
      this.decorations.push(neonLine);
    }
  }
  
  createDecorations() {
    // Add decorative elements: neon arches, floating particles, etc.
    this.createNeonArches();
    this.createAmbientParticles();
    this.createDistantGeometry();
  }
  
  createNeonArches() {
    // Neon arches at checkpoints
    const archGeo = new THREE.TorusGeometry(this.trackWidth / 2 + 2, 0.15, 8, 32, Math.PI);
    const archMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    for (let i = 0; i < this.checkpoints.length; i++) {
      if (i % 3 === 0) { // Every 3rd checkpoint
        const cp = this.checkpoints[i];
        const idx = cp.index;
        const tangent = this.tangents[idx];
        const binormal = this.binormals[idx];
        
        const arch = new THREE.Mesh(archGeo, archMat.clone());
        arch.position.set(cp.x, 6, cp.z);
        
        // Orient to track
        arch.lookAt(cp.x + tangent.x, 6, cp.z + tangent.z);
        arch.rotateX(Math.PI / 2);
        
        arch.userData = { type: 'arch', phase: Math.random() * Math.PI * 2, baseColor: arch.material.color.clone() };
        this.group.add(arch);
        this.decorations.push(arch);
      }
    }
  }
  
  createAmbientParticles() {
    // Floating neon particles around track
    const count = 500;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    
    const neonColors = [
      new THREE.Color(0x00ffff),
      new THREE.Color(0xff00ff),
      new THREE.Color(0xffff00),
      new THREE.Color(0xff4400)
    ];
    
    for (let i = 0; i < count; i++) {
      // Random position near track
      const trackIdx = Math.floor(Math.random() * this.trackPoints.length);
      const p = this.trackPoints[trackIdx];
      const binormal = this.binormals[trackIdx];
      
      const offset = (Math.random() - 0.5) * this.trackWidth * 1.5;
      const height = Math.random() * 10 + 2;
      
      positions[i * 3] = p.x + binormal.x * offset;
      positions[i * 3 + 1] = p.y + height;
      positions[i * 3 + 2] = p.z + binormal.z * offset;
      
      const color = neonColors[Math.floor(Math.random() * neonColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = Math.random() * 0.3 + 0.1;
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      
      phases[i] = Math.random() * Math.PI * 2;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    
    const mat = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.ambientParticles = new THREE.Points(geo, mat);
    this.group.add(this.ambientParticles);
    this.decorations.push(this.ambientParticles);
  }
  
  createDistantGeometry() {
    // Distant cityscape / mountains
    const buildingCount = 30;
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    
    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2 + Math.random() * 0.2;
      const distance = 200 + Math.random() * 100;
      const height = 20 + Math.random() * 60;
      const width = 5 + Math.random() * 15;
      const depth = 5 + Math.random() * 15;
      
      const geo = new THREE.BoxGeometry(width, height, depth);
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x0a0a1a,
        metalness: 0.5,
        roughness: 0.5,
        emissive: new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.5, 0.1),
        emissiveIntensity: 0.3
      });
      
      const building = new THREE.Mesh(geo, mat);
      building.position.set(
        Math.cos(angle) * distance,
        height / 2 - 5,
        Math.sin(angle) * distance
      );
      building.rotation.y = angle + Math.PI / 2;
      building.castShadow = true;
      building.receiveShadow = true;
      this.group.add(building);
      this.decorations.push(building);
      
      // Add neon windows
      this.addNeonWindows(building, angle, distance, height, width, depth);
    }
  }
  
  addNeonWindows(building, angle, distance, height, width, depth) {
    const windowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 1, 0.5),
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    const rows = Math.floor(height / 4);
    const cols = Math.floor(width / 3);
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.7) continue; // Some windows off
        
        const winGeo = new THREE.PlaneGeometry(1.5, 2);
        const win = new THREE.Mesh(winGeo, windowMat.clone());
        
        const x = (c - cols / 2 + 0.5) * 3;
        const y = (r - rows / 2 + 0.5) * 4;
        
        win.position.set(x, y, depth / 2 + 0.01);
        building.add(win);
        win.userData = { type: 'window', phase: Math.random() * Math.PI * 2 };
      }
    }
  }
  
  createStartLine() {
    // Start/finish line
    const lineGeo = new THREE.BoxGeometry(this.trackWidth, 0.1, 0.5);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    this.startLine = new THREE.Mesh(lineGeo, lineMat);
    this.startLine.position.copy(this.trackPoints[0]);
    this.startLine.position.y = 0.06;
    this.startLine.rotation.y = this.tangents[0].angleTo(new THREE.Vector3(1, 0, 0)) * (this.tangents[0].z > 0 ? -1 : 1);
    this.group.add(this.startLine);
    
    // Start line lights
    for (let side = -1; side <= 1; side += 2) {
      const lightGeo = new THREE.BoxGeometry(0.2, 2, 0.2);
      const lightMat = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      const light = new THREE.Mesh(lightGeo, lightMat);
      const binormal = this.binormals[0];
      light.position.set(
        this.trackPoints[0].x + binormal.x * side * this.trackWidth / 2,
        1,
        this.trackPoints[0].z + binormal.z * side * this.trackWidth / 2
      );
      light.userData = { type: 'startLight', phase: side === -1 ? 0 : Math.PI };
      this.group.add(light);
      this.decorations.push(light);
    }
  }
  
  getStartPosition() {
    return this.trackPoints[0].clone().add(new THREE.Vector3(0, 0.5, 0));
  }
  
  getStartRotation() {
    return this.tangents[0].angleTo(new THREE.Vector3(1, 0, 0)) * (this.tangents[0].z > 0 ? -1 : 1);
  }
  
  update(dt) {
    // Animate decorations
    for (const deco of this.decorations) {
      if (deco.userData.phase !== undefined) {
        deco.userData.phase += dt * 2;
        
        if (deco.userData.type === 'arch') {
          const intensity = 0.4 + Math.sin(deco.userData.phase) * 0.3;
          deco.material.opacity = intensity;
          deco.material.color.setHSL(0.55, 1, 0.5 + intensity * 0.3);
        } else if (deco.userData.type === 'window') {
          deco.material.opacity = 0.4 + Math.sin(deco.userData.phase * 0.5) * 0.3;
        } else if (deco.userData.type === 'startLight') {
          deco.material.opacity = 0.5 + Math.sin(deco.userData.phase * 3) * 0.4;
        } else if (deco.isLine) {
          // Neon edge lines pulse
          deco.material.opacity = 0.5 + Math.sin(deco.userData.phase) * 0.2;
        }
      }
    }
    
    // Animate ambient particles
    if (this.ambientParticles) {
      const positions = this.ambientParticles.geometry.attributes.position.array;
      const velocities = this.ambientParticles.geometry.attributes.velocity.array;
      const phases = this.ambientParticles.geometry.attributes.phase.array;
      
      for (let i = 0; i < positions.length / 3; i++) {
        phases[i] += dt;
        positions[i * 3] += velocities[i * 3] * dt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt + Math.sin(phases[i]) * 0.1 * dt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
        
        // Wrap around track
        // Simplified - just bounce
        if (positions[i * 3 + 1] < 1) velocities[i * 3 + 1] = Math.abs(velocities[i * 3 + 1]);
        if (positions[i * 3 + 1] > 20) velocities[i * 3 + 1] = -Math.abs(velocities[i * 3 + 1]);
      }
      
      this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
  
  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}