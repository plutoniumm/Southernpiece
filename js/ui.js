/* ─── DOM refs ──────────────────────────────────────────────────────────── */
const $loading = document.getElementById( 'loading' );
const $fill = document.getElementById( 'loading-fill' );
const $xhair = document.getElementById( 'xhair' );
const $label = document.getElementById( 'floor-label' );
const $roomName = document.getElementById( 'room-name' );
const $prompt = document.getElementById( 'prompt' );
const $arrow = document.getElementById( 'stair-arrow' );
const $viewer = document.getElementById( 'viewer' );
const $vContent = document.getElementById( 'viewer-content' );
const $vName = document.getElementById( 'viewer-name' );
const $jump = document.getElementById( 'jump-panel' );
const $jumpList = document.getElementById( 'jump-list' );

/* ─── Loading bar ───────────────────────────────────────────────────────── */
function setProgress ( p ) { $fill.style.width = p + '%'; }

/* ─── Prompt ────────────────────────────────────────────────────────────── */
function showPrompt ( t ) { $prompt.textContent = t; $prompt.classList.add( 'show' ); }
function hidePrompt () { $prompt.classList.remove( 'show' ); }

/* ─── Floor jump panel ──────────────────────────────────────────────────── */
let jumpOpen = false;

// onSelect(targetFloor, currentFloor) injected by caller (avoids cross-scope issues)
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
    item.addEventListener( 'click', () => { closeJumpPanel(); onSelect( fi, curFloor ); } );
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

/* ─── Artwork viewer ────────────────────────────────────────────────────── */
let viewerOpen = false;

function openViewer ( art ) {
  viewerOpen = true;
  document.exitPointerLock();
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
}

function closeViewer () {
  viewerOpen = false;
  $viewer.classList.remove( 'open' );
  const vid = $vContent.querySelector( 'video' );
  if ( vid ) { vid.pause(); vid.src = ''; }
  $vContent.innerHTML = '';
  // Step back so the same painting isn't immediately re-hovered
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
