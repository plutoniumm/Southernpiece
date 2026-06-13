function extractFrame ( url ) {
  return new Promise( resolve => {
    const v = document.createElement( 'video' );
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.preload = 'metadata';

    const fallback = () => {
      const c = document.createElement( 'canvas' );
      c.width = 640;
      c.height = 360;

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
      v.currentTime = Math.max(
        0.5,
        v.duration * ( 0.2 + Math.random() * 0.6 )
      );
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
    setTimeout( fallback, 8000 );
    v.src = url;
    v.load();
  } );
}

// Pixel size from a URL via Image decode (no base64). Only used when imgW/imgH
// weren't baked in (live API path); the browser caches the decode for the texture.
function dimsFromUrl ( url ) {
  return new Promise( res => {
    const img = new Image();
    img.onload = () => res( {
      w: img.naturalWidth,
      h: img.naturalHeight
    } );
    img.onerror = () => res( { w: 4, h: 3 } );

    img.src = url;
  } );
}

function dimsFromDataUrl ( dataUrl ) {
  return new Promise( res => {
    const img = new Image();

    img.onload = () => res( {
      w: img.naturalWidth,
      h: img.naturalHeight
    } );
    img.onerror = () => res( { w: 16, h: 9 } );

    img.src = dataUrl;
  } );
}
