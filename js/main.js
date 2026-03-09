( async () => {
  setProgress( 5 );
  let rooms = [];

  try {
    const ctrl = new AbortController();
    const tid = setTimeout( () => ctrl.abort(), 3000 );
    const r = await fetch( '/api/rooms', { signal: ctrl.signal } );

    clearTimeout( tid );
    if ( !r.ok )
      throw new Error( 'non-ok' );

    const names = await r.json();
    rooms = await Promise.all( names.map( async name => {
      const artworks = await fetch( `/api/rooms/${ encodeURIComponent( name ) }` )
        .then( r => r.json() );

      return { name, artworks };
    } ) );

  } catch ( _ ) {
    // Fall back to pre-built rooms.json
    //  (for GitHub Pages / static hosting)
    try {
      rooms = await fetch( 'rooms.json' ).then( r => r.json() );
      console.info( 'Loaded rooms.json (static mode)' );
    } catch ( _ ) {
      rooms = [
        { name: 'Gallery', artworks: [] }
      ];
    }
  }

  if ( rooms.length === 0 )
    rooms = [
      { name: 'Gallery', artworks: [] }
    ];
  setProgress( 20 );

  const allArt = rooms.flatMap( r => r.artworks );
  for ( let i = 0;i < allArt.length;i++ ) {
    const art = allArt[ i ];

    if ( art.dataUrl && art.imgW ) {
    } else if ( art.dataUrl && !art.imgW ) {
      const d = await dimsFromDataUrl( art.dataUrl );
      art.imgW = d.w;
      art.imgH = d.h;
    } else if ( art.type === 'video' ) {
      const dataUrl = await extractFrame( art.url );
      art.dataUrl = dataUrl;

      if ( dataUrl ) {
        const d = await dimsFromDataUrl( dataUrl );
        art.imgW = d.w;
        art.imgH = d.h;
      }
    } else {
      const result = await preloadDataUrl( art.url );

      if ( result ) {
        art.dataUrl = result.dataUrl;
        art.imgW = result.w;
        art.imgH = result.h;
      }
    }

    setProgress(
      20 + 32 *
      ( ( i + 1 ) / Math.max( allArt.length, 1 ) )
    );
  }
  setProgress( 52 );

  const cvs = document.getElementById( 'canvas' );
  const engine = new BABYLON.Engine( cvs, true, {
    antialias: true,
    preserveDrawingBuffer: true
  } );
  const scene = new BABYLON.Scene( engine );

  scene.gravity = new BABYLON.Vector3( 0, -18, 0 );
  scene.collisionsEnabled = true;
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
  scene.fogDensity = 0.008;

  scene.fogColor = new BABYLON.Color3( 0.10, 0.06, 0.03 );
  scene.clearColor = new BABYLON.Color4( 0.05, 0.03, 0.01, 1 );
  scene.ambientColor = new BABYLON.Color3( 0.06, 0.04, 0.02 );

  const hemi = new BABYLON.HemisphericLight(
    'hemi', new BABYLON.Vector3( 0, 1, 0 ), scene
  );
  hemi.intensity = 0.15;
  hemi.diffuse = new BABYLON.Color3( 1.0, 0.85, 0.6 );
  hemi.groundColor = new BABYLON.Color3( 0.2, 0.12, 0.05 );
  hemi.specular = new BABYLON.Color3( 0, 0, 0 );

  const startY = WT + 1.7;
  const camera = new BABYLON.UniversalCamera(
    'cam', new BABYLON.Vector3( 0, startY, RD / 2 - 2 ), scene
  );

  camera.setTarget( new BABYLON.Vector3( 0, startY, 0 ) );
  camera.minZ = 0.05;
  camera.maxZ = 180;
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

  const M = makeMaterials( scene );
  scene._galleryMaterials = M;
  scene._galleryRoomCount = rooms.length;
  setProgress( 60 );

  const stairZones = [];

  for ( let fi = 0;fi < rooms.length;fi++ ) {
    const room = rooms[ fi ];
    const baseY = fi * FLOOR_STEP;

    buildRoom( scene, fi, baseY, M );
    addCeilingLights( scene, fi, baseY );

    const slots = getSlots( baseY );
    const arts = room.artworks;
    for ( let i = 0;i < Math.min( slots.length, arts.length );i++ )
      createPainting( scene, slots[ i ], arts[ i ], M );

    const northZ = -RD / 2 - 2;

    if ( fi < rooms.length - 1 )
      stairZones.push( {
        pos: new BABYLON.Vector3( 0, baseY + 1.7, northZ ),
        targetFloor: fi + 1, dir: 'up'
      } );

    if ( fi > 0 )
      stairZones.push( {
        pos: new BABYLON.Vector3( 0, baseY + 1.7, northZ ),
        targetFloor: fi - 1, dir: 'down'
      } );

    setProgress( 60 + ( ( fi + 1 ) / rooms.length ) * 30 );
  }

  setProgress( 95 );

  const $capture = document.getElementById( 'capture-hint' );

  const requestLock = () => {
    if ( !viewerOpen && !jumpOpen )
      cvs.requestPointerLock();
  };
  cvs.addEventListener( 'click', requestLock );

  document.addEventListener( 'pointerlockchange', () => {
    const locked = document.pointerLockElement === cvs;

    $xhair.style.display = locked ? 'block' : 'none';
    $capture.style.display = locked ? 'none' : 'flex';
  } );

  let hoveredArt = null;
  let nearZone = null;
  let transitioning = false;

  document.addEventListener( 'keydown', e => {
    if ( e.code === 'KeyE' && nearZone && !transitioning && !jumpOpen )
      doTransition( nearZone );

    // I take no responsibility for this code. Its some AI generated spaghetti to allow quick keyboard access to the jump panel
    if ( e.code === 'KeyF' && !viewerOpen )
      jumpOpen
        ? closeJumpPanel()
        : openJumpPanel( rooms, camera, ( fi, curFloor ) => {
          if ( fi !== curFloor )
            doTransition( {
              targetFloor: fi,
              dir: fi > curFloor ? 'up' : 'down'
            } );
        } );

    if ( e.code === 'Escape' ) {
      if ( viewerOpen )
        closeViewer();
      else if ( jumpOpen )
        closeJumpPanel();
    }
  } );

  scene.onPointerObservable.add( ev => {
    if ( ev.type !== BABYLON.PointerEventTypes.POINTERTAP )
      return;

    if ( viewerOpen )
      return;

    if ( hoveredArt )
      openViewer( hoveredArt );
  } );

  scene.onBeforeRenderObservable.add( () => {
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();

    const ray = scene.createPickingRay(
      w / 2, h / 2, BABYLON.Matrix.Identity(), camera );
    const hit = scene.pickWithRay( ray, m => m.metadata?.isArt );

    if (
      hit?.hit
      && hit.distance < 7
      && hit.pickedMesh?.metadata?.artwork
    ) {
      hoveredArt = hit.pickedMesh.metadata.artwork;
      $xhair.classList.add( 'hot' );

      if ( !viewerOpen )
        showPrompt( `Click to view  ·  "${ hoveredArt.name }"` );
    } else {
      hoveredArt = null;
      $xhair.classList.remove( 'hot' );
    }

    nearZone = null;
    for ( const zone of stairZones ) {
      const dx = camera.position.x - zone.pos.x;
      const dz = camera.position.z - zone.pos.z;
      const dy = camera.position.y - zone.pos.y;
      if (
        Math.sqrt( dx * dx + dz * dz ) < STAIR_RADIUS
        && Math.abs( dy ) < 3.5
      ) {
        nearZone = zone; break;
      }
    }

    if ( nearZone && !hoveredArt && !viewerOpen ) {
      const t = rooms[ nearZone.targetFloor ];
      const arrow = nearZone.dir === 'up' ? '↑' : '↓';

      showPrompt( `E  ·  ${ arrow }  ${ t?.name?.toUpperCase() || '' }` );

      $arrow.textContent = arrow;
      $arrow.classList.add( 'show' );
    } else {
      if ( !hoveredArt )
        hidePrompt();
      $arrow.classList.remove( 'show' );
    }

    const fi = Math.max( 0, Math.min(
      rooms.length - 1,
      Math.round( ( camera.position.y - WT - 1.7 ) / FLOOR_STEP )
    ) );

    $label.textContent = `Floor ${ fi + 1 }`;
    $roomName.textContent = rooms[ fi ]?.name?.toUpperCase() || '';
  } );

  function doTransition ( zone ) {
    transitioning = true;
    hidePrompt();

    const targetY = zone.targetFloor * FLOOR_STEP + WT + 1.7;
    const startY = camera.position.y;
    const startZ = camera.position.z;

    const endZ = RD / 2 - 2;
    const t0 = performance.now();
    const dur = 800;

    // we are 5 functions deep here. I am really brining the 2010s back
    ( function step () {
      const t = Math.min( 1, ( performance.now() - t0 ) / dur );

      const ease = t < 0.5 ? 2 * t * t : -1 + ( 4 - 2 * t ) * t;

      camera.position.y = startY + ( targetY - startY ) * ease;
      camera.position.z = startZ + ( endZ - startZ ) * ease;

      if ( t < 1 )
        requestAnimationFrame( step );
      else {
        camera.position.y = targetY;
        camera.position.z = endZ; transitioning = false;
      }
    } )();
  }

  engine.runRenderLoop( () => {
    if ( !viewerOpen )
      scene.render();
  } );

  window.addEventListener( 'resize', () => engine.resize() );
  setProgress( 100 );

  await new Promise( r => setTimeout( r, 400 ) );
  $loading.style.opacity = '0';
  setTimeout( () => {
    $loading.style.display = 'none';
  }, 1300 );
} )();
