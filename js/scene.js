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

function box ( name, opts, pos, scene ) {
  const m = BABYLON.MeshBuilder.CreateBox( name, opts, scene );
  m.position.copyFrom( pos );

  return m;
}

function getSlots ( baseY ) {
  const slots = [];
  const y = baseY + PY;
  const wOff = WT / 2 + 0.04;

  // North wall — face south (rotY = 0, plane normal = +Z)
  // Door opening is ±DOOR_W/2 = ±1.6 wide at x=0;
  const nz = -RD / 2 + wOff;
  for ( const x of [ -9, -5.5, 5.5, 9 ] )
    slots.push( {
      pos: new BABYLON.Vector3( x, y, nz ),
      rotY: 0
    } );

  // South wall — face north (rotY = π)
  const sz = RD / 2 - wOff;
  for ( const x of [ -9, -4.5, 0, 4.5, 9 ] )
    slots.push( {
      pos: new BABYLON.Vector3( x, y, sz ),
      rotY: Math.PI
    } );

  // West wall — face east (rotY = π/2)
  const wx = -RW / 2 + wOff;
  for ( const z of [ -7, -2, 3, 7.5 ] )
    slots.push( {
      pos: new BABYLON.Vector3( wx, y, z ),
      rotY: Math.PI / 2
    } );

  // East wall — face west (rotY = -π/2), skip doorway zone
  // THE GOD DAMN FUCKING DOOR.
  const ex = RW / 2 - wOff;
  for ( const z of [ -8, -5, 5, 8 ] )
    if ( Math.abs( z ) > DOOR_W / 2 + 1.2 )
      slots.push( {
        pos: new BABYLON.Vector3( ex, y, z ),
        rotY: -Math.PI / 2
      } );

  return slots;
}

function buildRoom ( scene, fi, baseY, M ) {
  const p = `r${ fi }`;
  const midY = baseY + RH / 2;
  const isTop = fi === scene._galleryRoomCount - 1;

  const fl = box(
    `${ p }_fl`,
    {
      width: RW + WT * 2,
      height: WT,
      depth: RD + WT * 2
    },
    new BABYLON.Vector3( 0, baseY + WT / 2, 0 ), scene
  );
  fl.material = M.floor;
  fl.checkCollisions = true;

  const ce = box(
    `${ p }_ce`,
    {
      width: RW + WT * 2,
      height: WT,
      depth: RD + WT * 2
    },
    new BABYLON.Vector3( 0, baseY + RH - WT / 2, 0 ),
    scene
  );
  ce.material = M.ceil;
  ce.checkCollisions = true;

  // South wall (full)
  const sw = box(
    `${ p }_sw`,
    {
      width: RW,
      height: RH,
      depth: WT
    },
    new BABYLON.Vector3( 0, midY, RD / 2 ),
    scene
  );
  sw.material = M.wall;
  sw.checkCollisions = true;

  // West wall (full)
  const ww = box(
    `${ p }_ww`,
    {
      width: WT,
      height: RH,
      depth: RD
    },
    new BABYLON.Vector3( -RW / 2, midY, 0 ),
    scene
  );
  ww.material = M.wall;
  ww.checkCollisions = true;

  // East wall (full)
  const ew = box(
    `${ p }_ew`,
    {
      width: WT,
      height: RH,
      depth: RD
    },
    new BABYLON.Vector3( RW / 2, midY, 0 ),
    scene
  );
  ew.material = M.wall;
  ew.checkCollisions = true;

  // North wall — left + right segments around staircase opening
  const lintH = RH - DOOR_H;
  const segW = ( RW - DOOR_W ) / 2;

  const nwL = box(
    `${ p }_nwL`,
    {
      width: segW,
      height: RH,
      depth: WT
    },
    new BABYLON.Vector3( -RW / 2 + segW / 2, midY, -RD / 2 ),
    scene
  );
  nwL.material = M.wall;
  nwL.checkCollisions = true;

  const nwR = box(
    `${ p }_nwR`,
    {
      width: segW,
      height: RH,
      depth: WT
    },
    new BABYLON.Vector3( RW / 2 - segW / 2, midY, -RD / 2 ),
    scene
  );
  nwR.material = M.wall;
  nwR.checkCollisions = true;

  if ( lintH > 0 ) {
    const nwT = box(
      `${ p }_nwT`,
      {
        width: DOOR_W,
        height: lintH,
        depth: WT
      },
      new BABYLON.Vector3( 0, baseY + DOOR_H + lintH / 2, -RD / 2 ), scene
    );
    nwT.material = M.wall;
    nwT.checkCollisions = true;
  }

  // there are people who are physically disturbed by what the absolute shit ive done here
  for ( const [ wx, wz, bw, bd ] of [
    [ 0, RD / 2, RW, 0 ],
    [ -RW / 2, 0, 0, RD ],
    [ 0, -RD / 2, RW, 0 ],
  ] ) {
    const bb = box(
      `${ p }_bb_${ wx }_${ wz }`,
      {
        width: bw + 0.1,
        height: 0.18,
        depth: bd + 0.1
      },
      new BABYLON.Vector3( wx, baseY + 0.09, wz ),
      scene
    );
    bb.material = M.baseboard;
  }

  // cant stop, wont stop
  for ( const [ mx, mz, mw, md ] of [
    [ 0, RD / 2, RW, 0 ],
    [ -RW / 2, 0, 0, RD ],
    [ 0, -RD / 2, RW, 0 ],
  ] ) {
    const cm = box(
      `${ p }_cm_${ mx }_${ mz }`,
      {
        width: mw + 0.1,
        height: 0.14,
        depth: md + 0.1
      },
      new BABYLON.Vector3( mx, baseY + RH - WT - 0.07, mz ),
      scene );
    cm.material = M.baseboard;
  }

  buildStairVisual( scene, fi, baseY, M, isTop );
}

function buildStairVisual ( scene, fi, baseY, M, isTop ) {
  const corrW = DOOR_W + 0.4;
  const corrD = 3.5;
  const corrZ = -RD / 2 - corrD / 2;

  const cf = box(
    `r${ fi }_scf`,
    {
      width: corrW,
      height: WT,
      depth: corrD
    },
    new BABYLON.Vector3( 0, baseY + WT / 2, corrZ ),
    scene
  );
  cf.material = M.floor; cf.checkCollisions = true;

  for ( const [ sx, name ] of [
    [ -corrW / 2, 'L' ],
    [ corrW / 2, 'R' ]
  ] ) {
    const cw = box(
      `r${ fi }_scW${ name }`,
      {
        width: WT,
        height: RH,
        depth: corrD
      },
      new BABYLON.Vector3( sx, baseY + RH / 2, corrZ ),
      scene
    );
    cw.material = M.wall;
    cw.checkCollisions = true;
  }

  const cc = box(
    `r${ fi }_scc`,
    {
      width: corrW,
      height: WT,
      depth: corrD
    },
    new BABYLON.Vector3( 0, baseY + RH - WT / 2, corrZ ),
    scene
  );
  cc.material = M.ceil;
  cc.checkCollisions = true;

  if ( !isTop ) {
    const rise = FLOOR_STEP;
    const run = 9;
    const rampAngle = Math.atan2( rise, run );
    const rampLen = Math.sqrt( rise * rise + run * run );
    const rampZ = -RD / 2 - corrD - run / 2;

    const ramp = box( `r${ fi }_ramp`, {
      width: corrW - 0.1,
      height: WT,
      depth: rampLen
    },
      new BABYLON.Vector3( 0, baseY + rise / 2, rampZ ), scene );
    ramp.rotation.x = rampAngle;
    ramp.checkCollisions = true;
    ramp.isVisible = false;

    const steps = 10;
    const stepH = rise / steps;
    const stepD = run / steps;
    for ( let s = 0;s < steps;s++ ) {
      const sh = box(
        `r${ fi }_step${ s }`,
        {
          width: corrW - 0.2,
          height: stepH * ( s + 1 ),
          depth: stepD - 0.02
        },
        new BABYLON.Vector3(
          0,
          baseY + stepH * s / 2 + stepH * ( s + 1 ) / 2,
          -RD / 2 - corrD - s * stepD - stepD / 2
        ),
        scene
      );
      sh.material = M.stair;
    }

    for ( const sx of [ -corrW / 2 - WT / 2, corrW / 2 + WT / 2 ] ) {
      const sw = box( `r${ fi }_stW${ sx > 0 ? 'R' : 'L' }`,
        {
          width: WT,
          height: rise + RH,
          depth: run + corrD + 1
        },
        new BABYLON.Vector3(
          sx,
          baseY + ( rise + RH ) / 2,
          -RD / 2 - ( run + corrD ) / 2 - 0.5
        ),
        scene
      );
      sw.material = M.wall;
      sw.checkCollisions = true;
    }
  }
}

function addCeilingLights ( scene, fi, baseY ) {
  const y = baseY + RH - 0.4;
  for ( const [ x, , z, i ] of [
    [ -6, 0, -6, 0 ],
    [ 6, 0, -6, 1 ],
    [ -6, 0, 5, 2 ],
    [ 6, 0, 5, 3 ],
    [ 0, 0, -1, 4 ]
  ] ) {
    const light = new BABYLON.PointLight(
      `l${ fi }_${ i }`,
      new BABYLON.Vector3( x, y, z ),
      scene
    );
    light.diffuse = new BABYLON.Color3( 1.0, 0.82, 0.50 );
    light.specular = new BABYLON.Color3( 0.8, 0.6, 0.3 );
    light.intensity = 1.2;
    light.range = 18;

    const bulb = BABYLON.MeshBuilder.CreateSphere(
      `bulb${ fi }_${ i }`, { diameter: 0.18 }, scene
    );
    bulb.position.set( x, y - 0.05, z );
    const bm = new BABYLON.StandardMaterial( `bm${ fi }_${ i }`, scene );

    bm.diffuseColor = new BABYLON.Color3( 1, 0.9, 0.6 );
    bm.emissiveColor = new BABYLON.Color3( 1.0, 0.78, 0.4 );
    bulb.material = bm;

    const wire = BABYLON.MeshBuilder.CreateCylinder(
      `wire${ fi }_${ i }`, { height: 0.5, diameter: 0.02 }, scene
    );
    wire.position.set( x, y + 0.25, z );
    wire.material = scene._galleryMaterials.baseboard;
  }
}

// Emissive levels: resting vs. bloomed-up-close (driven by proximity in main.js).
const ART_DIM = 0.34;
const ART_LIT = 1.18;

function createPainting ( scene, slot, artwork, M ) {
  const { pos, rotY } = slot;
  const id = _paintIdx++;

  const aspect = ( artwork.imgW && artwork.imgH )
    ? artwork.imgW / artwork.imgH : 4 / 3;
  const paintH = PH;
  const paintW = Math.max( 1.0, Math.min( 6.0, paintH * aspect ) );

  const frame = BABYLON.MeshBuilder.CreateBox( `frame_${ id }`, {
    width: paintW + FT * 2,
    height: paintH + FT * 2,
    depth: 0.06
  }, scene );
  frame.position.copyFrom( pos );
  frame.rotation.y = rotY;
  frame.material = M.frame;

  const fwdX = Math.sin( rotY ), fwdZ = Math.cos( rotY );
  const plane = BABYLON.MeshBuilder.CreatePlane( `painting_${ id }`, {
    width: paintW,
    height: paintH
  }, scene );
  plane.position.set( pos.x + fwdX * 0.05, pos.y, pos.z + fwdZ * 0.05 );
  plane.rotation.y = rotY;

  const mat = new BABYLON.StandardMaterial( `artMat_${ id }`, scene );
  mat.specularColor = new BABYLON.Color3( 0, 0, 0 );
  mat.backFaceCulling = false;
  plane.material = mat;

  // Images texture from their URL; only videos populate dataUrl (a poster frame).
  const src = artwork.dataUrl || artwork.url;
  const hasImg = !!src;
  if ( hasImg ) {
    const tex = new BABYLON.Texture(
      src, scene, true, true
    );
    tex.uScale = -1;
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.emissiveColor = new BABYLON.Color3( ART_DIM, ART_DIM, ART_DIM );
  } else {
    mat.emissiveColor = new BABYLON.Color3( 0.12, 0.08, 0.04 );
  }

  // reactive: handles main.js's render loop uses each frame to drive the bloom.
  const reactive = hasImg
    ? { mat, glow: ART_DIM, baseW: paintW, baseH: paintH, plane }
    : null;
  plane.metadata = { isArt: true, artwork, reactive };

  makePlaque( scene, artwork.name, rotY, pos, paintH, paintW );

  return { plane, pos: plane.position, reactive };
}

function makePlaque ( scene, name, rotY, pos, paintH, paintW ) {
  const w = Math.min( 1.7, Math.max( 0.9, paintW ) );
  const h = 0.2;

  const tex = new BABYLON.DynamicTexture(
    `plaque_${ _paintIdx }`, { width: 512, height: 64 }, scene, true
  );
  const ctx = tex.getContext();
  ctx.fillStyle = '#100a04';
  ctx.fillRect( 0, 0, 512, 64 );
  ctx.strokeStyle = 'rgba(200,164,88,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect( 3, 3, 506, 58 );

  let label = ( name || '' ).toUpperCase();
  ctx.font = '28px Georgia';
  ctx.fillStyle = '#c8a458';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Trim overly long titles so they stay on the plate.
  while ( ctx.measureText( label ).width > 480 && label.length > 3 )
    label = label.slice( 0, -2 );
  ctx.fillText( label, 256, 34 );
  tex.update();

  const mat = new BABYLON.StandardMaterial( `plaqueMat_${ _paintIdx }`, scene );
  mat.specularColor = new BABYLON.Color3( 0, 0, 0 );
  mat.emissiveTexture = tex;
  mat.emissiveColor = new BABYLON.Color3( 1, 1, 1 );
  mat.diffuseTexture = tex;
  mat.backFaceCulling = false;
  mat.emissiveTexture.uScale = -1;
  mat.diffuseTexture.uScale = -1;

  const fwdX = Math.sin( rotY ), fwdZ = Math.cos( rotY );
  const plate = BABYLON.MeshBuilder.CreatePlane(
    `plaque_m_${ _paintIdx }`, { width: w, height: h }, scene
  );
  plate.position.set(
    pos.x + fwdX * 0.06,
    pos.y - paintH / 2 - FT - 0.22,
    pos.z + fwdZ * 0.06
  );
  plate.rotation.y = rotY;
  plate.material = mat;

  return plate;
}

function moteTexture ( scene ) {
  if ( scene._moteTex )
    return scene._moteTex;

  const t = new BABYLON.DynamicTexture(
    'mote', { width: 64, height: 64 }, scene, false
  );
  const c = t.getContext();
  const g = c.createRadialGradient( 32, 32, 0, 32, 32, 32 );
  g.addColorStop( 0, 'rgba(255,236,196,1)' );
  g.addColorStop( 1, 'rgba(255,236,196,0)' );
  c.fillStyle = g;
  c.fillRect( 0, 0, 64, 64 );
  t.update();
  t.hasAlpha = true;

  scene._moteTex = t;
  return t;
}

function addDustMotes ( scene, fi, baseY ) {
  const ps = new BABYLON.ParticleSystem( `motes${ fi }`, 90, scene );
  ps.particleTexture = moteTexture( scene );
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

  ps.minEmitBox = new BABYLON.Vector3( -RW / 2 + 1, baseY + 0.3, -RD / 2 + 1 );
  ps.maxEmitBox = new BABYLON.Vector3( RW / 2 - 1, baseY + RH - 0.5, RD / 2 - 1 );
  ps.emitter = new BABYLON.Vector3( 0, baseY + RH / 2, 0 );

  ps.color1 = new BABYLON.Color4( 1.0, 0.86, 0.6, 0.18 );
  ps.color2 = new BABYLON.Color4( 1.0, 0.78, 0.5, 0.10 );
  ps.colorDead = new BABYLON.Color4( 1.0, 0.8, 0.5, 0 );

  ps.minSize = 0.02;
  ps.maxSize = 0.07;
  ps.minLifeTime = 8;
  ps.maxLifeTime = 16;
  ps.emitRate = 12;

  ps.direction1 = new BABYLON.Vector3( -0.05, 0.08, -0.05 );
  ps.direction2 = new BABYLON.Vector3( 0.05, 0.16, 0.05 );
  ps.minEmitPower = 0.02;
  ps.maxEmitPower = 0.08;
  ps.gravity = new BABYLON.Vector3( 0, 0.01, 0 );
  ps.updateSpeed = 0.012;

  ps.preWarmCycles = 120;
  ps.start();
  return ps;
}

function createCenterpiece ( scene, fi, baseY, artwork, M ) {
  const src = artwork && ( artwork.dataUrl || artwork.url );
  if ( !src )
    return null;

  const cx = 0, cz = 1.5;            // slightly south of dead-centre
  const floorY = baseY + WT;

  const plinth = BABYLON.MeshBuilder.CreateCylinder(
    `plinth${ fi }`,
    { height: 1.0, diameterTop: 0.95, diameterBottom: 1.15, tessellation: 8 },
    scene
  );
  plinth.position.set( cx, floorY + 0.5, cz );
  plinth.material = M.stair;
  plinth.checkCollisions = true;

  const pool = BABYLON.MeshBuilder.CreateDisc(
    `pool${ fi }`, { radius: 2.4, tessellation: 40 }, scene
  );
  pool.rotation.x = Math.PI / 2;
  pool.position.set( cx, floorY + 0.02, cz );
  const poolMat = new BABYLON.StandardMaterial( `poolMat${ fi }`, scene );
  poolMat.emissiveColor = new BABYLON.Color3( 0.55, 0.4, 0.18 );
  poolMat.diffuseColor = new BABYLON.Color3( 0, 0, 0 );
  poolMat.specularColor = new BABYLON.Color3( 0, 0, 0 );
  poolMat.alpha = 0.32;
  poolMat.disableLighting = true;
  pool.material = poolMat;

  const aspect = ( artwork.imgW && artwork.imgH )
    ? artwork.imgW / artwork.imgH : 4 / 3;
  const panelH = 1.7;
  const panelW = Math.max( 1.0, Math.min( 3.2, panelH * aspect ) );

  const panel = BABYLON.MeshBuilder.CreatePlane(
    `feature${ fi }`, { width: panelW, height: panelH }, scene
  );
  panel.position.set( cx, floorY + 1.0 + 0.15 + panelH / 2, cz );

  const pmat = new BABYLON.StandardMaterial( `featureMat${ fi }`, scene );
  pmat.specularColor = new BABYLON.Color3( 0, 0, 0 );
  pmat.backFaceCulling = false;
  const tex = new BABYLON.Texture( src, scene, true, true );
  tex.uScale = -1;
  pmat.diffuseTexture = tex;
  pmat.emissiveTexture = tex;
  pmat.emissiveColor = new BABYLON.Color3( ART_DIM, ART_DIM, ART_DIM );
  panel.material = pmat;
  panel.metadata = { isArt: true, artwork };

  return {
    panel, pool, poolMat, mat: pmat,
    pos: new BABYLON.Vector3( cx, floorY + 1.7, cz ),
    spin: 0.15, glow: ART_DIM
  };
}
