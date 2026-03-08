/* ─── Materials ─────────────────────────────────────────────────────────── */
function makeMaterials ( scene ) {
  const M = {};

  M.floor = new BABYLON.StandardMaterial( 'mFloor', scene );
  M.floor.diffuseColor = new BABYLON.Color3( 0.26, 0.16, 0.09 );
  M.floor.specularColor = new BABYLON.Color3( 0.08, 0.05, 0.02 );
  M.floor.specularPower = 40;

  M.wall = new BABYLON.StandardMaterial( 'mWall', scene );
  M.wall.diffuseColor = new BABYLON.Color3( 0.93, 0.89, 0.80 );
  M.wall.specularColor = new BABYLON.Color3( 0.03, 0.03, 0.03 );

  M.ceil = new BABYLON.StandardMaterial( 'mCeil', scene );
  M.ceil.diffuseColor = new BABYLON.Color3( 0.87, 0.82, 0.70 );
  M.ceil.specularColor = new BABYLON.Color3( 0.02, 0.02, 0.02 );

  M.frame = new BABYLON.StandardMaterial( 'mFrame', scene );
  M.frame.diffuseColor = new BABYLON.Color3( 0.10, 0.07, 0.03 );
  M.frame.specularColor = new BABYLON.Color3( 0.35, 0.25, 0.10 );
  M.frame.specularPower = 80;

  M.baseboard = new BABYLON.StandardMaterial( 'mBase', scene );
  M.baseboard.diffuseColor = new BABYLON.Color3( 0.18, 0.11, 0.05 );
  M.baseboard.specularColor = new BABYLON.Color3( 0.2, 0.12, 0.05 );
  M.baseboard.specularPower = 60;

  M.stair = new BABYLON.StandardMaterial( 'mStair', scene );
  M.stair.diffuseColor = new BABYLON.Color3( 0.20, 0.13, 0.07 );

  return M;
}

/* ─── Box helper ────────────────────────────────────────────────────────── */
function box ( name, opts, pos, scene ) {
  const m = BABYLON.MeshBuilder.CreateBox( name, opts, scene );
  m.position.copyFrom( pos );
  return m;
}

/* ─── Painting slot positions per floor ─────────────────────────────────── */
function getSlots ( baseY ) {
  const slots = [];
  const y = baseY + PY;
  const wOff = WT / 2 + 0.04;

  // North wall — face south (rotY = 0, plane normal = +Z)
  const nz = -RD / 2 + wOff;
  for ( const x of [ -8.5, -4, 0.5, 5, 9.5 ] )
    slots.push( { pos: new BABYLON.Vector3( x, y, nz ), rotY: 0 } );

  // South wall — face north (rotY = π)
  const sz = RD / 2 - wOff;
  for ( const x of [ -9, -4.5, 0, 4.5, 9 ] )
    slots.push( { pos: new BABYLON.Vector3( x, y, sz ), rotY: Math.PI } );

  // West wall — face east (rotY = π/2)
  const wx = -RW / 2 + wOff;
  for ( const z of [ -7, -2, 3, 7.5 ] )
    slots.push( { pos: new BABYLON.Vector3( wx, y, z ), rotY: Math.PI / 2 } );

  // East wall — face west (rotY = -π/2), skip doorway zone
  const ex = RW / 2 - wOff;
  for ( const z of [ -8, -5, 5, 8 ] )
    if ( Math.abs( z ) > DOOR_W / 2 + 1.2 )
      slots.push( { pos: new BABYLON.Vector3( ex, y, z ), rotY: -Math.PI / 2 } );

  return slots;
}

/* ─── Room geometry ─────────────────────────────────────────────────────── */
function buildRoom ( scene, fi, baseY, M ) {
  const p = `r${ fi }`;
  const midY = baseY + RH / 2;
  const isTop = fi === scene._galleryRoomCount - 1;

  // Floor + ceiling slabs
  const fl = box( `${ p }_fl`, { width: RW + WT * 2, height: WT, depth: RD + WT * 2 },
    new BABYLON.Vector3( 0, baseY + WT / 2, 0 ), scene );
  fl.material = M.floor; fl.checkCollisions = true;

  const ce = box( `${ p }_ce`, { width: RW + WT * 2, height: WT, depth: RD + WT * 2 },
    new BABYLON.Vector3( 0, baseY + RH - WT / 2, 0 ), scene );
  ce.material = M.ceil; ce.checkCollisions = true;

  // South wall (full)
  const sw = box( `${ p }_sw`, { width: RW, height: RH, depth: WT },
    new BABYLON.Vector3( 0, midY, RD / 2 ), scene );
  sw.material = M.wall; sw.checkCollisions = true;

  // West wall (full)
  const ww = box( `${ p }_ww`, { width: WT, height: RH, depth: RD },
    new BABYLON.Vector3( -RW / 2, midY, 0 ), scene );
  ww.material = M.wall; ww.checkCollisions = true;

  // East wall (full)
  const ew = box( `${ p }_ew`, { width: WT, height: RH, depth: RD },
    new BABYLON.Vector3( RW / 2, midY, 0 ), scene );
  ew.material = M.wall; ew.checkCollisions = true;

  // North wall — left + right segments around staircase opening
  const lintH = RH - DOOR_H;
  const segW = ( RW - DOOR_W ) / 2;

  const nwL = box( `${ p }_nwL`, { width: segW, height: RH, depth: WT },
    new BABYLON.Vector3( -RW / 2 + segW / 2, midY, -RD / 2 ), scene );
  nwL.material = M.wall; nwL.checkCollisions = true;

  const nwR = box( `${ p }_nwR`, { width: segW, height: RH, depth: WT },
    new BABYLON.Vector3( RW / 2 - segW / 2, midY, -RD / 2 ), scene );
  nwR.material = M.wall; nwR.checkCollisions = true;

  if ( lintH > 0 ) {
    const nwT = box( `${ p }_nwT`, { width: DOOR_W, height: lintH, depth: WT },
      new BABYLON.Vector3( 0, baseY + DOOR_H + lintH / 2, -RD / 2 ), scene );
    nwT.material = M.wall; nwT.checkCollisions = true;
  }

  // Baseboards
  for ( const [ wx, wz, bw, bd ] of [
    [ 0, RD / 2, RW, 0 ], [ -RW / 2, 0, 0, RD ], [ 0, -RD / 2, RW, 0 ],
  ] ) {
    const bb = box( `${ p }_bb_${ wx }_${ wz }`,
      { width: bw + 0.1, height: 0.18, depth: bd + 0.1 },
      new BABYLON.Vector3( wx, baseY + 0.09, wz ), scene );
    bb.material = M.baseboard;
  }

  // Crown molding
  for ( const [ mx, mz, mw, md ] of [
    [ 0, RD / 2, RW, 0 ], [ -RW / 2, 0, 0, RD ], [ 0, -RD / 2, RW, 0 ],
  ] ) {
    const cm = box( `${ p }_cm_${ mx }_${ mz }`,
      { width: mw + 0.1, height: 0.14, depth: md + 0.1 },
      new BABYLON.Vector3( mx, baseY + RH - WT - 0.07, mz ), scene );
    cm.material = M.baseboard;
  }

  buildStairVisual( scene, fi, baseY, M, isTop );
}

/* ─── Staircase ─────────────────────────────────────────────────────────── */
function buildStairVisual ( scene, fi, baseY, M, isTop ) {
  const corrW = DOOR_W + 0.4;
  const corrD = 3.5;
  const corrZ = -RD / 2 - corrD / 2;

  // Corridor floor, walls, ceiling
  const cf = box( `r${ fi }_scf`, { width: corrW, height: WT, depth: corrD },
    new BABYLON.Vector3( 0, baseY + WT / 2, corrZ ), scene );
  cf.material = M.floor; cf.checkCollisions = true;

  for ( const [ sx, name ] of [ [ -corrW / 2, 'L' ], [ corrW / 2, 'R' ] ] ) {
    const cw = box( `r${ fi }_scW${ name }`, { width: WT, height: RH, depth: corrD },
      new BABYLON.Vector3( sx, baseY + RH / 2, corrZ ), scene );
    cw.material = M.wall; cw.checkCollisions = true;
  }

  const cc = box( `r${ fi }_scc`, { width: corrW, height: WT, depth: corrD },
    new BABYLON.Vector3( 0, baseY + RH - WT / 2, corrZ ), scene );
  cc.material = M.ceil; cc.checkCollisions = true;

  if ( !isTop ) {
    const rise = FLOOR_STEP;
    const run = 9;
    const rampAngle = Math.atan2( rise, run );
    const rampLen = Math.sqrt( rise * rise + run * run );
    const rampZ = -RD / 2 - corrD - run / 2;

    // Invisible collision ramp
    const ramp = box( `r${ fi }_ramp`, { width: corrW - 0.1, height: WT, depth: rampLen },
      new BABYLON.Vector3( 0, baseY + rise / 2, rampZ ), scene );
    ramp.rotation.x = rampAngle;
    ramp.checkCollisions = true;
    ramp.isVisible = false;

    // Visual steps
    const steps = 10;
    const stepH = rise / steps;
    const stepD = run / steps;
    for ( let s = 0;s < steps;s++ ) {
      const sh = box( `r${ fi }_step${ s }`,
        { width: corrW - 0.2, height: stepH * ( s + 1 ), depth: stepD - 0.02 },
        new BABYLON.Vector3( 0,
          baseY + stepH * s / 2 + stepH * ( s + 1 ) / 2,
          -RD / 2 - corrD - s * stepD - stepD / 2 ), scene );
      sh.material = M.stair;
    }

    // Side walls flanking staircase
    for ( const sx of [ -corrW / 2 - WT / 2, corrW / 2 + WT / 2 ] ) {
      const sw = box( `r${ fi }_stW${ sx > 0 ? 'R' : 'L' }`,
        { width: WT, height: rise + RH, depth: run + corrD + 1 },
        new BABYLON.Vector3( sx, baseY + ( rise + RH ) / 2,
          -RD / 2 - ( run + corrD ) / 2 - 0.5 ), scene );
      sw.material = M.wall; sw.checkCollisions = true;
    }
  }
}

/* ─── Ceiling lights ────────────────────────────────────────────────────── */
function addCeilingLights ( scene, fi, baseY ) {
  const y = baseY + RH - 0.4;
  for ( const [ x, , z, i ] of [ [ -6, 0, -6, 0 ], [ 6, 0, -6, 1 ], [ -6, 0, 5, 2 ], [ 6, 0, 5, 3 ], [ 0, 0, -1, 4 ] ] ) {
    const light = new BABYLON.PointLight( `l${ fi }_${ i }`, new BABYLON.Vector3( x, y, z ), scene );
    light.diffuse = new BABYLON.Color3( 1.0, 0.82, 0.50 );
    light.specular = new BABYLON.Color3( 0.8, 0.6, 0.3 );
    light.intensity = 1.2;
    light.range = 18;

    const bulb = BABYLON.MeshBuilder.CreateSphere( `bulb${ fi }_${ i }`, { diameter: 0.18 }, scene );
    bulb.position.set( x, y - 0.05, z );
    const bm = new BABYLON.StandardMaterial( `bm${ fi }_${ i }`, scene );
    bm.diffuseColor = new BABYLON.Color3( 1, 0.9, 0.6 );
    bm.emissiveColor = new BABYLON.Color3( 1.0, 0.78, 0.4 );
    bulb.material = bm;

    const wire = BABYLON.MeshBuilder.CreateCylinder( `wire${ fi }_${ i }`, { height: 0.5, diameter: 0.02 }, scene );
    wire.position.set( x, y + 0.25, z );
    wire.material = scene._galleryMaterials.baseboard;
  }
}

/* ─── Painting ──────────────────────────────────────────────────────────── */
function createPainting ( scene, slot, artwork, M ) {
  const { pos, rotY } = slot;
  const id = _paintIdx++;

  // Width driven by image aspect ratio; height is fixed
  const aspect = ( artwork.imgW && artwork.imgH ) ? artwork.imgW / artwork.imgH : 4 / 3;
  const paintH = PH;
  const paintW = Math.max( 1.0, Math.min( 6.0, paintH * aspect ) );

  // Frame
  const frame = BABYLON.MeshBuilder.CreateBox( `frame_${ id }`, {
    width: paintW + FT * 2, height: paintH + FT * 2, depth: 0.06
  }, scene );
  frame.position.copyFrom( pos );
  frame.rotation.y = rotY;
  frame.material = M.frame;

  // Canvas plane pushed 0.05 units forward off the wall
  const fwdX = Math.sin( rotY ), fwdZ = Math.cos( rotY );
  const plane = BABYLON.MeshBuilder.CreatePlane( `painting_${ id }`, {
    width: paintW, height: paintH,
    sideOrientation: BABYLON.Mesh.DOUBLESIDE
  }, scene );
  plane.position.set( pos.x + fwdX * 0.05, pos.y, pos.z + fwdZ * 0.05 );
  plane.rotation.y = rotY;
  plane.metadata = { isArt: true, artwork };

  // Self-illuminated material — texture assigned directly, no callbacks
  const mat = new BABYLON.StandardMaterial( `artMat_${ id }`, scene );
  mat.specularColor = new BABYLON.Color3( 0, 0, 0 );
  mat.backFaceCulling = false;
  plane.material = mat;

  if ( artwork.dataUrl ) {
    const tex = new BABYLON.Texture( artwork.dataUrl, scene,
      true  /* noMipMaps */,
      true  /* invertY — fixes WebGL upside-down */ );
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.emissiveColor = new BABYLON.Color3( 1, 1, 1 );
  } else {
    mat.emissiveColor = new BABYLON.Color3( 0.15, 0.10, 0.05 );
  }

  return plane;
}
