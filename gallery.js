/* ─── Constants ─────────────────────────────────────────────────────────── */
const RW = 24;          // room width  (x)
const RH = 5.2;         // room height (y)
const RD = 20;          // room depth  (z)
const FLOOR_STEP = 6.0; // vertical spacing floor-to-floor
const WT = 0.28;        // wall thickness
const DOOR_W = 3.2;     // staircase opening width
const DOOR_H = 4.0;     // staircase opening height
const PW = 3.0;         // painting width
const PH = 2.1;         // painting height
const PY = 2.55;        // painting center height (eye level ~1.7 + a bit)
const FT = 0.13;        // frame border thickness
const STAIR_RADIUS = 4; // proximity radius for stair trigger

/* ─── UI refs ───────────────────────────────────────────────────────────── */
const $loading = document.getElementById( 'loading' );
const $fill = document.getElementById( 'loading-fill' );
const $xhair = document.getElementById( 'xhair' );
const $label = document.getElementById( 'floor-label' );
const $prompt = document.getElementById( 'prompt' );
const $arrow = document.getElementById( 'stair-arrow' );
const $viewer = document.getElementById( 'viewer' );
const $vContent = document.getElementById( 'viewer-content' );
const $vName = document.getElementById( 'viewer-name' );
const $jump = document.getElementById( 'jump-panel' );
const $jumpList = document.getElementById( 'jump-list' );
const $roomName = document.getElementById( 'room-name' );

let _camera = null; // set after camera creation so closeViewer can access it

function setProgress ( p ) { $fill.style.width = p + '%'; }
function showPrompt ( t ) { $prompt.textContent = t; $prompt.classList.add( 'show' ); }
function hidePrompt () { $prompt.classList.remove( 'show' ); }

let jumpOpen = false;
// onSelect(targetFloor, currentFloor) is injected by the caller to avoid scope issues
function openJumpPanel ( rooms, camera, onSelect ) {
  jumpOpen = true;
  document.exitPointerLock();
  const curFloor = Math.max( 0, Math.min( rooms.length - 1,
    Math.round( ( camera.position.y - WT - 1.7 ) / FLOOR_STEP ) ) );
  $jumpList.innerHTML = '';
  rooms.forEach( ( room, fi ) => {
    const item = document.createElement( 'div' );
    item.className = 'jump-item' + ( fi === curFloor ? ' current' : '' );
    const count = room.artworks.length;
    item.innerHTML =
      `<span class="jump-num">${ String( fi + 1 ).padStart( 2, '0' ) }</span>` +
      `<span class="jump-name">${ room.name }</span>` +
      `<span class="jump-count">${ count } work${ count !== 1 ? 's' : '' }</span>`;
    item.addEventListener( 'click', () => {
      closeJumpPanel();
      onSelect( fi, curFloor );
    } );
    $jumpList.appendChild( item );
  } );
  $jump.style.display = 'flex';
  requestAnimationFrame( () => $jump.classList.add( 'open' ) );
}
function closeJumpPanel () {
  jumpOpen = false;
  $jump.classList.remove( 'open' );
  setTimeout( () => { $jump.style.display = 'none'; }, 220 );
}

/* ─── Video frame extractor ─────────────────────────────────────────────── */
function extractFrame ( url ) {
  return new Promise( resolve => {
    const v = document.createElement( 'video' );
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.preload = 'metadata';

    const fallback = () => {
      const c = document.createElement( 'canvas' );
      c.width = 640; c.height = 360;
      const ctx = c.getContext( '2d' );
      ctx.fillStyle = '#1a0d05';
      ctx.fillRect( 0, 0, 640, 360 );
      ctx.fillStyle = '#c8a458';
      ctx.font = '18px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText( '▶  video', 320, 185 );
      resolve( c.toDataURL( 'image/jpeg', 0.8 ) );
    };

    v.addEventListener( 'loadedmetadata', () => {
      v.currentTime = Math.max( 0.5, v.duration * ( 0.2 + Math.random() * 0.6 ) );
    } );
    v.addEventListener( 'seeked', () => {
      const c = document.createElement( 'canvas' );
      c.width = v.videoWidth || 640;
      c.height = v.videoHeight || 360;
      c.getContext( '2d' ).drawImage( v, 0, 0, c.width, c.height );
      v.src = '';
      resolve( c.toDataURL( 'image/jpeg', 0.82 ) );
    } );
    v.addEventListener( 'error', fallback );
    setTimeout( fallback, 8000 ); // hard timeout
    v.src = url;
    v.load();
  } );
}

/* ─── Viewer ────────────────────────────────────────────────────────────── */
/* ─── Image preloader ────────────────────────────────────────────────────── */
async function preloadDataUrl ( url ) {
  try {
    const resp = await fetch( url );
    const blob = await resp.blob();
    const dataUrl = await new Promise( res => {
      const r = new FileReader();
      r.onload = () => res( r.result );
      r.onerror = () => res( null );
      r.readAsDataURL( blob );
    } );
    if ( !dataUrl ) return null;
    const { w, h } = await new Promise( res => {
      const img = new Image();
      img.onload = () => res( { w: img.naturalWidth, h: img.naturalHeight } );
      img.onerror = () => res( { w: 4, h: 3 } );
      img.src = dataUrl;
    } );
    return { dataUrl, w, h };
  } catch ( _ ) { return null; }
}

let viewerOpen = false;

function openViewer ( art ) {
  viewerOpen = true;
  $vContent.innerHTML = '';
  $vName.textContent = art.name;

  if ( art.type === 'image' ) {
    const img = document.createElement( 'img' );
    img.src = art.url;
    $vContent.appendChild( img );
  } else {
    const vid = document.createElement( 'video' );
    vid.src = art.url;
    vid.autoplay = true;
    vid.loop = true;
    vid.muted = true;
    vid.controls = false;
    vid.playsInline = true;
    $vContent.appendChild( vid );
  }
  $viewer.classList.add( 'open' );
  document.exitPointerLock();
}

function closeViewer () {
  viewerOpen = false;
  $viewer.classList.remove( 'open' );
  const vid = $vContent.querySelector( 'video' );
  if ( vid ) { vid.pause(); vid.src = ''; }
  $vContent.innerHTML = '';
  // Step back so we don't immediately re-hover the same painting
  if ( _camera ) {
    const fwd = _camera.getForwardRay( 1 ).direction;
    _camera.position.x -= fwd.x * 1.8;
    _camera.position.z -= fwd.z * 1.8;
  }
}

$viewer.addEventListener( 'click', closeViewer );
document.getElementById( 'viewer-close' ).addEventListener( 'click', e => {
  e.stopPropagation(); closeViewer();
} );

/* ─── Painting slot layouts ──────────────────────────────────────────────── */
// Returns array of { pos: Vector3, rotY: number } relative to floor baseY
function getSlots ( baseY ) {
  const slots = [];
  const y = baseY + PY;
  const wallOff = WT / 2 + 0.04; // flush against wall face

  // North wall (z = -RD/2), face south (+z dir → rotY = 0)
  const nz = -RD / 2 + wallOff;
  for ( const x of [ -8.5, -4, 0.5, 5, 9.5 ] ) {
    slots.push( { pos: new BABYLON.Vector3( x, y, nz ), rotY: 0 } );
  }

  // South wall (z = +RD/2), face north (rotY = π)
  const sz = RD / 2 - wallOff;
  for ( const x of [ -9, -4.5, 0, 4.5, 9 ] ) {
    slots.push( { pos: new BABYLON.Vector3( x, y, sz ), rotY: Math.PI } );
  }

  // West wall (x = -RW/2), face east (rotY = π/2)
  const wx = -RW / 2 + wallOff;
  for ( const z of [ -7, -2, 3, 7.5 ] ) {
    slots.push( { pos: new BABYLON.Vector3( wx, y, z ), rotY: Math.PI / 2 } );
  }

  // East wall (x = +RW/2), face west (rotY = -π/2)
  // Doorway is at z = 0 ± DOOR_W/2, so avoid that strip
  const ex = RW / 2 - wallOff;
  for ( const z of [ -8, -5, 5, 8 ] ) {
    if ( Math.abs( z ) > DOOR_W / 2 + 1.2 ) {
      slots.push( { pos: new BABYLON.Vector3( ex, y, z ), rotY: -Math.PI / 2 } );
    }
  }

  return slots;
}

/* ─── Scene builders ─────────────────────────────────────────────────────── */
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

  M.black = new BABYLON.StandardMaterial( 'mBlack', scene );
  M.black.diffuseColor = new BABYLON.Color3( 0.05, 0.03, 0.01 );
  M.black.emissiveColor = new BABYLON.Color3( 0.04, 0.02, 0.01 );

  return M;
}

function box ( name, opts, pos, scene ) {
  const m = BABYLON.MeshBuilder.CreateBox( name, opts, scene );
  m.position.copyFrom( pos );
  return m;
}

function buildRoom ( scene, fi, baseY, M ) {
  const p = `r${ fi }`;
  const midY = baseY + RH / 2;
  const isTop = fi === scene._galleryRoomCount - 1;

  // Floor slab
  const fl = box( `${ p }_fl`, { width: RW + WT * 2, height: WT, depth: RD + WT * 2 },
    new BABYLON.Vector3( 0, baseY + WT / 2, 0 ), scene );
  fl.material = M.floor; fl.checkCollisions = true; fl.receiveShadows = true;

  // Ceiling
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

  // North wall — left segment
  const nwL = box( `${ p }_nwL`, { width: ( RW - DOOR_W ) / 2, height: RH, depth: WT },
    new BABYLON.Vector3( -( RW / 2 ) + ( RW - DOOR_W ) / 4, midY, -RD / 2 ), scene );
  nwL.material = M.wall; nwL.checkCollisions = true;

  // North wall — right segment
  const nwR = box( `${ p }_nwR`, { width: ( RW - DOOR_W ) / 2, height: RH, depth: WT },
    new BABYLON.Vector3( ( RW / 2 ) - ( RW - DOOR_W ) / 4, midY, -RD / 2 ), scene );
  nwR.material = M.wall; nwR.checkCollisions = true;

  // North wall — lintel above door
  const lintH = RH - DOOR_H;
  if ( lintH > 0 ) {
    const nwTop = box( `${ p }_nwT`, { width: DOOR_W, height: lintH, depth: WT },
      new BABYLON.Vector3( 0, baseY + DOOR_H + lintH / 2, -RD / 2 ), scene );
    nwTop.material = M.wall; nwTop.checkCollisions = true;
  }

  // East wall (full — staircase is on north side, not east)
  const ew = box( `${ p }_ew`, { width: WT, height: RH, depth: RD },
    new BABYLON.Vector3( RW / 2, midY, 0 ), scene );
  ew.material = M.wall; ew.checkCollisions = true;

  // Baseboard strips (decorative, thin)
  for ( const [ wx, wz, bw, bd ] of [
    [ 0, RD / 2, RW, WT * 0.01 ],   // south
    [ -RW / 2, 0, WT * 0.01, RD ],  // west
    [ 0, -RD / 2, RW, WT * 0.01 ],  // north (approx, decorative)
  ] ) {
    const bb = box( `${ p }_bb_${ wx }`, { width: bw + 0.1, height: 0.18, depth: bd + 0.1 },
      new BABYLON.Vector3( wx, baseY + 0.09, wz ), scene );
    bb.material = M.baseboard;
  }

  // Ceiling molding strips (decorative crown)
  for ( const [ mx, mz, mw, md ] of [
    [ 0, RD / 2, RW, WT * 0.01 ],
    [ -RW / 2, 0, WT * 0.01, RD ],
    [ 0, -RD / 2, RW, WT * 0.01 ],
  ] ) {
    const cm = box( `${ p }_cm_${ mx }`, { width: mw + 0.1, height: 0.14, depth: md + 0.1 },
      new BABYLON.Vector3( mx, baseY + RH - WT - 0.07, mz ), scene );
    cm.material = M.baseboard;
  }

  // Staircase visual (between rooms) — only if not top floor handled above
  buildStairVisual( scene, fi, baseY, M, isTop );
}

function buildStairVisual ( scene, fi, baseY, M, isTop ) {
  // Staircase corridor north of room, then going up
  const corrW = DOOR_W + 0.4;
  const corrD = 3.5;
  const corrZ = -RD / 2 - corrD / 2;

  // Corridor floor
  const cf = box( `r${ fi }_scf`, { width: corrW, height: WT, depth: corrD },
    new BABYLON.Vector3( 0, baseY + WT / 2, corrZ ), scene );
  cf.material = M.floor; cf.checkCollisions = true;

  // Corridor side walls
  const csW = box( `r${ fi }_scWL`, { width: WT, height: RH, depth: corrD },
    new BABYLON.Vector3( -corrW / 2, baseY + RH / 2, corrZ ), scene );
  csW.material = M.wall; csW.checkCollisions = true;
  const csE = box( `r${ fi }_scWR`, { width: WT, height: RH, depth: corrD },
    new BABYLON.Vector3( corrW / 2, baseY + RH / 2, corrZ ), scene );
  csE.material = M.wall; csE.checkCollisions = true;

  // Corridor ceiling
  const cc = box( `r${ fi }_scc`, { width: corrW, height: WT, depth: corrD },
    new BABYLON.Vector3( 0, baseY + RH - WT / 2, corrZ ), scene );
  cc.material = M.ceil; cc.checkCollisions = true;

  if ( !isTop ) {
    // Stair ramp (invisible, for walking)
    const rise = FLOOR_STEP;
    const run = 9;
    const rampAngle = Math.atan2( rise, run );
    const rampLen = Math.sqrt( rise * rise + run * run );
    const rampZ = -RD / 2 - corrD - run / 2;

    const ramp = box( `r${ fi }_ramp`, { width: corrW - 0.1, height: WT, depth: rampLen },
      new BABYLON.Vector3( 0, baseY + rise / 2, rampZ ), scene );
    ramp.rotation.x = rampAngle;
    ramp.checkCollisions = true;
    ramp.isVisible = false;

    // Visual stair steps (10 steps)
    const steps = 10;
    const stepH = rise / steps;
    const stepD = run / steps;
    for ( let s = 0;s < steps;s++ ) {
      const sh = box( `r${ fi }_step${ s }`,
        { width: corrW - 0.2, height: stepH * ( s + 1 ), depth: stepD - 0.02 },
        new BABYLON.Vector3( 0, baseY + stepH * s / 2 + stepH * ( s + 1 ) / 2,
          -RD / 2 - corrD - s * stepD - stepD / 2 ), scene );
      sh.material = M.stair;
    }

    // Stair side walls
    for ( const sx of [ -corrW / 2 - WT / 2, corrW / 2 + WT / 2 ] ) {
      const sw = box( `r${ fi }_stWall_${ sx > 0 ? 'R' : 'L' }`,
        { width: WT, height: rise + RH, depth: run + corrD + 1 },
        new BABYLON.Vector3( sx, baseY + ( rise + RH ) / 2,
          -RD / 2 - ( run + corrD ) / 2 - 0.5 ), scene );
      sw.material = M.wall; sw.checkCollisions = true;
    }
  }
}

function addCeilingLights ( scene, fi, baseY ) {
  const y = baseY + RH - 0.4;
  const positions = [
    [ -6, 0, -6 ], [ 6, 0, -6 ],
    [ -6, 0, 5 ], [ 6, 0, 5 ],
    [ 0, 0, -1 ],
  ];
  positions.forEach( ( [ x, , z ], i ) => {
    const light = new BABYLON.PointLight( `l${ fi }_${ i }`,
      new BABYLON.Vector3( x, y, z ), scene );
    light.diffuse = new BABYLON.Color3( 1.0, 0.82, 0.50 );
    light.specular = new BABYLON.Color3( 0.8, 0.6, 0.3 );
    light.intensity = 1.2;
    light.range = 18;

    // Bulb mesh
    const bulb = BABYLON.MeshBuilder.CreateSphere( `bulb${ fi }_${ i }`,
      { diameter: 0.18 }, scene );
    bulb.position.set( x, y - 0.05, z );
    const bm = new BABYLON.StandardMaterial( `bm${ fi }_${ i }`, scene );
    bm.diffuseColor = new BABYLON.Color3( 1, 0.9, 0.6 );
    bm.emissiveColor = new BABYLON.Color3( 1.0, 0.78, 0.4 );
    bulb.material = bm;

    // Pendant wire
    const wire = BABYLON.MeshBuilder.CreateCylinder( `wire${ fi }_${ i }`,
      { height: 0.5, diameter: 0.02 }, scene );
    wire.position.set( x, y + 0.25, z );
    wire.material = scene._galleryMaterials.baseboard;
  } );
}

/* ─── Painting creation ──────────────────────────────────────────────────── */
let _paintIdx = 0;
function createPainting ( scene, slot, artwork, M ) {
  const { pos, rotY } = slot;
  const id = _paintIdx++;

  // Compute width from image aspect ratio; height is fixed
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

  // Canvas plane — push 0.05 units out from wall in local forward direction
  const fwdX = Math.sin( rotY ), fwdZ = Math.cos( rotY );
  const plane = BABYLON.MeshBuilder.CreatePlane( `painting_${ id }`, {
    width: paintW, height: paintH,
    sideOrientation: BABYLON.Mesh.DOUBLESIDE
  }, scene );
  plane.position.set( pos.x + fwdX * 0.05, pos.y, pos.z + fwdZ * 0.05 );
  plane.rotation.y = rotY;
  plane.metadata = { isArt: true, artwork };

  // Self-illuminated material — no callbacks, direct assignment
  const mat = new BABYLON.StandardMaterial( `artMat_${ id }`, scene );
  mat.specularColor = new BABYLON.Color3( 0, 0, 0 );
  mat.backFaceCulling = false;
  plane.material = mat;

  if ( artwork.dataUrl ) {
    // invertY=true: correct WebGL bottom-left vs image top-left orientation
    const tex = new BABYLON.Texture( artwork.dataUrl, scene, true /* noMipMaps */, true /* invertY */ );
    mat.diffuseTexture = tex;
    mat.emissiveTexture = tex;
    mat.emissiveColor = new BABYLON.Color3( 1, 1, 1 );
  } else {
    mat.emissiveColor = new BABYLON.Color3( 0.15, 0.10, 0.05 );
  }

  return plane;
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
( async () => {
  setProgress( 5 );

  // 1. Fetch room manifest
  let rooms = [];
  try {
    const names = await fetch( '/api/rooms' ).then( r => r.json() );
    rooms = await Promise.all( names.map( async name => {
      const artworks = await fetch( `/api/rooms/${ encodeURIComponent( name ) }` ).then( r => r.json() );
      return { name, artworks };
    } ) );
  } catch ( e ) {
    console.warn( 'API unavailable, using empty gallery', e );
    rooms = [ { name: 'Gallery', artworks: [] } ];
  }
  if ( rooms.length === 0 ) rooms = [ { name: 'Gallery', artworks: [] } ];
  setProgress( 20 );

  // 2. Preload all art to data URLs (avoids BabylonJS texture callback issues)
  const allArt = rooms.flatMap( r => r.artworks );
  for ( let i = 0;i < allArt.length;i++ ) {
    const art = allArt[ i ];
    if ( art.type === 'video' ) {
      const dataUrl = await extractFrame( art.url );
      art.dataUrl = dataUrl;
      // get dims from the thumbnail
      if ( dataUrl ) {
        const { w, h } = await new Promise( res => {
          const img = new Image();
          img.onload = () => res( { w: img.naturalWidth, h: img.naturalHeight } );
          img.onerror = () => res( { w: 16, h: 9 } );
          img.src = dataUrl;
        } );
        art.imgW = w; art.imgH = h;
      }
    } else {
      const result = await preloadDataUrl( art.url );
      if ( result ) { art.dataUrl = result.dataUrl; art.imgW = result.w; art.imgH = result.h; }
    }
    setProgress( 20 + ( ( i + 1 ) / Math.max( allArt.length, 1 ) ) * 32 );
  }
  setProgress( 52 );

  // 3. BabylonJS engine
  const cvs = document.getElementById( 'canvas' );
  const engine = new BABYLON.Engine( cvs, true, { antialias: true, preserveDrawingBuffer: true } );
  const scene = new BABYLON.Scene( engine );

  scene.gravity = new BABYLON.Vector3( 0, -18, 0 );
  scene.collisionsEnabled = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
  scene.fogDensity = 0.008;
  scene.fogColor = new BABYLON.Color3( 0.10, 0.06, 0.03 );
  scene.clearColor = new BABYLON.Color4( 0.05, 0.03, 0.01, 1 );
  scene.ambientColor = new BABYLON.Color3( 0.06, 0.04, 0.02 );

  // Global dim ambient
  const hemi = new BABYLON.HemisphericLight( 'hemi', new BABYLON.Vector3( 0, 1, 0 ), scene );
  hemi.intensity = 0.15;
  hemi.diffuse = new BABYLON.Color3( 1.0, 0.85, 0.6 );
  hemi.groundColor = new BABYLON.Color3( 0.2, 0.12, 0.05 );
  hemi.specular = new BABYLON.Color3( 0, 0, 0 );

  // Camera — first person
  const startY = WT + 1.7;
  const camera = new BABYLON.UniversalCamera( 'cam', new BABYLON.Vector3( 0, startY, RD / 2 - 2 ), scene );
  camera.setTarget( new BABYLON.Vector3( 0, startY, 0 ) );
  camera.minZ = 0.05; camera.maxZ = 180;
  camera.speed = 0.32;
  camera.angularSensibility = 2800;
  camera.checkCollisions = true;
  camera.applyGravity = true;
  camera.ellipsoid = new BABYLON.Vector3( 0.35, 0.88, 0.35 );
  camera.ellipsoidOffset = new BABYLON.Vector3( 0, 0.88, 0 );
  camera.keysUp = [ 87, 38 ];
  camera.keysDown = [ 83, 40 ];
  camera.keysLeft = [ 65, 37 ];
  camera.keysRight = [ 68, 39 ];
  camera.attachControl( cvs, true );
  _camera = camera;

  // 4. Materials + rooms
  const M = makeMaterials( scene );
  scene._galleryMaterials = M;
  scene._galleryRoomCount = rooms.length;

  setProgress( 60 );

  const artMeshes = []; // clickable planes
  const stairZones = []; // { position, radius, targetFloor, dir }

  for ( let fi = 0;fi < rooms.length;fi++ ) {
    const room = rooms[ fi ];
    const baseY = fi * FLOOR_STEP;

    buildRoom( scene, fi, baseY, M );
    addCeilingLights( scene, fi, baseY );

    // Artwork paintings
    const slots = getSlots( baseY );
    const arts = room.artworks;
    for ( let i = 0;i < Math.min( slots.length, arts.length );i++ ) {
      const mesh = createPainting( scene, slots[ i ], arts[ i ], M );
      artMeshes.push( mesh );
    }

    // Stair transition zones
    const northZ = -RD / 2 - 2;
    if ( fi < rooms.length - 1 ) {
      stairZones.push( { pos: new BABYLON.Vector3( 0, baseY + 1.7, northZ ), targetFloor: fi + 1, dir: 'up' } );
    }
    if ( fi > 0 ) {
      stairZones.push( { pos: new BABYLON.Vector3( 0, baseY + 1.7, northZ ), targetFloor: fi - 1, dir: 'down' } );
    }

    setProgress( 60 + ( ( fi + 1 ) / rooms.length ) * 30 );
  }

  setProgress( 95 );

  // 5. Pointer lock
  cvs.addEventListener( 'click', () => {
    if ( !viewerOpen ) cvs.requestPointerLock();
  } );

  // 6. Interaction state
  let hoveredArt = null;
  let nearZone = null;
  let transitioning = false;

  // Keyboard shortcuts
  document.addEventListener( 'keydown', e => {
    if ( e.code === 'KeyE' && nearZone && !transitioning && !jumpOpen ) {
      doTransition( nearZone, camera, rooms );
    }
    if ( e.code === 'KeyJ' && !viewerOpen ) {
      jumpOpen ? closeJumpPanel() : openJumpPanel( rooms, camera, ( fi, curFloor ) => {
        if ( fi !== curFloor ) doTransition( { targetFloor: fi, dir: fi > curFloor ? 'up' : 'down' }, camera, rooms );
      } );
    }
    if ( e.code === 'Escape' ) {
      if ( viewerOpen ) { closeViewer(); _reLockPointer = true; }
      else if ( jumpOpen ) { closeJumpPanel(); _reLockPointer = true; }
      // otherwise let the browser naturally release pointer lock
    }
  } );

  // Re-lock pointer after closing a modal with Escape
  // (browser always releases on Escape — we reclaim it if a modal was just closed)
  let _reLockPointer = false;
  document.addEventListener( 'pointerlockchange', () => {
    if ( !document.pointerLockElement && _reLockPointer ) {
      _reLockPointer = false;
      cvs.requestPointerLock();
    }
  } );

  // Click on artwork
  scene.onPointerObservable.add( ev => {
    if ( ev.type !== BABYLON.PointerEventTypes.POINTERTAP ) return;
    if ( viewerOpen ) return;
    if ( hoveredArt ) openViewer( hoveredArt );
  } );

  // 7. Per-frame logic
  const halfW = engine.getRenderWidth() / 2;
  const halfH = engine.getRenderHeight() / 2;
  let lastResize = 0;

  scene.onBeforeRenderObservable.add( () => {
    const now = performance.now();

    // Responsive pick center
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();

    // Raycast center screen for art
    const ray = scene.createPickingRay( w / 2, h / 2, BABYLON.Matrix.Identity(), camera );
    const hit = scene.pickWithRay( ray, m => m.metadata?.isArt );

    if ( hit?.hit && hit.distance < 7 && hit.pickedMesh?.metadata?.artwork ) {
      hoveredArt = hit.pickedMesh.metadata.artwork;
      $xhair.classList.add( 'hot' );
      if ( !viewerOpen ) showPrompt( `Click to view  ·  "${ hoveredArt.name }"` );
    } else {
      hoveredArt = null;
      $xhair.classList.remove( 'hot' );
    }

    // Stair zone proximity
    nearZone = null;
    for ( const zone of stairZones ) {
      const dx = camera.position.x - zone.pos.x;
      const dz = camera.position.z - zone.pos.z;
      const dy = camera.position.y - zone.pos.y;
      if ( Math.sqrt( dx * dx + dz * dz ) < STAIR_RADIUS && Math.abs( dy ) < 3.5 ) {
        nearZone = zone;
        break;
      }
    }

    if ( nearZone && !hoveredArt && !viewerOpen ) {
      const target = rooms[ nearZone.targetFloor ];
      showPrompt( `E  ·  ${ nearZone.dir === 'up' ? '↑' : '↓' }  ${ target?.name?.toUpperCase() || 'next floor' }` );
      $arrow.textContent = nearZone.dir === 'up' ? '↑' : '↓';
      $arrow.classList.add( 'show' );
    } else {
      if ( !hoveredArt ) hidePrompt();
      $arrow.classList.remove( 'show' );
    }

    // Floor label + room name overlay
    const fi = Math.max( 0, Math.min( rooms.length - 1,
      Math.round( ( camera.position.y - WT - 1.7 ) / FLOOR_STEP ) ) );
    $label.textContent = `Floor ${ fi + 1 }`;
    $roomName.textContent = rooms[ fi ]?.name?.toUpperCase() || '';
  } );

  // 8. Floor transition
  function doTransition ( zone, cam, rms ) {
    transitioning = true;
    hidePrompt();
    const targetY = zone.targetFloor * FLOOR_STEP + WT + 1.7;
    const duration = 800;
    const startY = cam.position.y;
    const startZ = cam.position.z;
    const endZ = RD / 2 - 2; // back of target room
    const t0 = performance.now();

    const animate = () => {
      const t = Math.min( 1, ( performance.now() - t0 ) / duration );
      const ease = t < 0.5 ? 2 * t * t : -1 + ( 4 - 2 * t ) * t;
      cam.position.y = startY + ( targetY - startY ) * ease;
      cam.position.z = startZ + ( endZ - startZ ) * ease;
      if ( t < 1 ) requestAnimationFrame( animate );
      else { cam.position.y = targetY; cam.position.z = endZ; transitioning = false; }
    };
    requestAnimationFrame( animate );
  }

  // 9. Render loop
  engine.runRenderLoop( () => { if ( !viewerOpen ) scene.render(); } );
  window.addEventListener( 'resize', () => engine.resize() );

  // 10. Hide loading
  setProgress( 100 );
  await new Promise( r => setTimeout( r, 400 ) );
  $loading.style.opacity = '0';
  setTimeout( () => { $loading.style.display = 'none'; }, 1300 );

  cvs.focus();
  cvs.requestPointerLock();
} )();
