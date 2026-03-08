#!/usr/bin/env bun
// build.js — generates rooms.json from the art/ directory.
// Images are embedded as base64 data URLs with dimensions.
// Videos are referenced by relative URL (frame extracted at runtime in browser).
// Output is suitable for static hosting (GitHub Pages etc.) without a server.
//
// Usage:  bun build.js        (or ./build.js after chmod +x)

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

const ART_DIR = './art';
const OUT = './rooms.json';

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|avif|bmp|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|avi|mkv)$/i;

/* ─── MIME type map ─────────────────────────────────────────────────────── */
const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif',
  '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
};

/* ─── Dimension parsers (no external deps) ──────────────────────────────── */
function pngDims ( buf ) {
  // PNG: signature 8 bytes, then IHDR chunk. Width @ 16, height @ 20 (big-endian uint32)
  if ( buf[ 0 ] !== 0x89 || buf[ 1 ] !== 0x50 ) return null;
  return { w: buf.readUInt32BE( 16 ), h: buf.readUInt32BE( 20 ) };
}

function jpegDims ( buf ) {
  // Walk JPEG segments looking for SOF marker (0xC0–0xCF except C4/C8/CC)
  let i = 2;
  while ( i < buf.length - 9 ) {
    if ( buf[ i ] !== 0xFF ) break;
    const m = buf[ i + 1 ];
    const len = buf.readUInt16BE( i + 2 );
    if ( m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC ) {
      return { h: buf.readUInt16BE( i + 5 ), w: buf.readUInt16BE( i + 7 ) };
    }
    i += 2 + len;
  }
  return null;
}

function gifDims ( buf ) {
  // GIF: signature 6 bytes, then logical screen descriptor: width @ 6, height @ 8 (LE uint16)
  if ( buf[ 0 ] !== 0x47 || buf[ 1 ] !== 0x49 ) return null;
  return { w: buf.readUInt16LE( 6 ), h: buf.readUInt16LE( 8 ) };
}

function webpDims ( buf ) {
  // RIFF....WEBPVP8  or RIFF....WEBPVP8L
  if ( buf.toString( 'ascii', 0, 4 ) !== 'RIFF' ) return null;
  if ( buf.toString( 'ascii', 8, 12 ) !== 'WEBP' ) return null;
  const type = buf.toString( 'ascii', 12, 16 );
  if ( type === 'VP8 ' ) {
    // VP8 bitstream: skip 10 bytes, then width/height as 14-bit LE
    const w = ( buf.readUInt16LE( 26 ) & 0x3FFF ) + 1;
    const h = ( buf.readUInt16LE( 28 ) & 0x3FFF ) + 1;
    return { w, h };
  }
  if ( type === 'VP8L' ) {
    const bits = buf.readUInt32LE( 21 );
    return { w: ( bits & 0x3FFF ) + 1, h: ( ( bits >> 14 ) & 0x3FFF ) + 1 };
  }
  return null;
}

function getDims ( buf, ext ) {
  try {
    if ( /\.(png)$/i.test( ext ) ) return pngDims( buf );
    if ( /\.(jpg|jpeg)$/i.test( ext ) ) return jpegDims( buf );
    if ( /\.(gif)$/i.test( ext ) ) return gifDims( buf );
    if ( /\.(webp)$/i.test( ext ) ) return webpDims( buf );
  } catch ( _ ) { }
  return null;
}

/* ─── Main ──────────────────────────────────────────────────────────────── */
if ( !existsSync( ART_DIR ) ) {
  console.error( `art/ directory not found at ${ ART_DIR }` );
  process.exit( 1 );
}

const roomDirs = readdirSync( ART_DIR, { withFileTypes: true } )
  .filter( e => e.isDirectory() )
  .map( e => e.name )
  .sort();

const rooms = [];
let totalBytes = 0;

for ( const roomName of roomDirs ) {
  const roomDir = join( ART_DIR, roomName );
  const files = readdirSync( roomDir )
    .filter( f => IMAGE_EXT.test( f ) || VIDEO_EXT.test( f ) )
    .sort();

  const artworks = [];

  for ( const file of files ) {
    const ext = extname( file );
    const name = basename( file, ext ).replace( /[-_]/g, ' ' );
    const relUrl = `art/${ roomName }/${ encodeURIComponent( file ) }`;

    if ( VIDEO_EXT.test( file ) ) {
      // Videos: URL only — frame extracted at runtime in the browser
      artworks.push( { name, type: 'video', url: relUrl } );
      process.stdout.write( `  ▶  ${ roomName }/${ file }\n` );
    } else {
      // Images: embed as base64 data URL + extract dimensions
      const buf = readFileSync( join( roomDir, file ) );
      const mime = MIME[ ext.toLowerCase() ] ?? 'application/octet-stream';
      const b64 = buf.toString( 'base64' );
      const dataUrl = `data:${ mime };base64,${ b64 }`;
      const dims = getDims( buf, ext ) ?? { w: 0, h: 0 };
      totalBytes += buf.length;

      artworks.push( { name, type: 'image', url: relUrl, dataUrl, imgW: dims.w, imgH: dims.h } );
      process.stdout.write( `  ✓  ${ roomName }/${ file }  ${ dims.w }×${ dims.h }  (${ ( buf.length / 1024 ).toFixed( 0 ) } KB)\n` );
    }
  }

  rooms.push( { name: roomName, artworks } );
  console.log();
}

const json = JSON.stringify( rooms );
writeFileSync( OUT, json );
const kb = ( json.length / 1024 ).toFixed( 1 );
const mb = ( json.length / 1024 / 1024 ).toFixed( 2 );
console.log( `Wrote ${ OUT }  —  ${ mb } MB  (${ totalBytes / 1024 | 0 } KB raw images → ${ kb } KB JSON)\n` );
