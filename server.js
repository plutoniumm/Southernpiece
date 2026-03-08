const express = require( 'express' );
const fs = require( 'fs' );
const path = require( 'path' );

const app = express();
const PORT = process.env.PORT || 3000;
const ART_DIR = path.join( __dirname, 'art' );

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|avif|bmp|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|avi|mkv)$/i;

app.use( express.static( __dirname ) );
app.use( '/art', express.static( ART_DIR ) );

app.get( '/api/rooms', ( req, res ) => {
  try {
    if ( !fs.existsSync( ART_DIR ) ) { return res.json( [] ); }
    const rooms = fs.readdirSync( ART_DIR, { withFileTypes: true } )
      .filter( d => d.isDirectory() )
      .map( d => d.name )
      .sort();
    res.json( rooms );
  } catch ( e ) { res.json( [] ); }
} );

app.get( '/api/rooms/:room', ( req, res ) => {
  try {
    const roomDir = path.join( ART_DIR, req.params.room );
    const files = fs.readdirSync( roomDir )
      .filter( f => IMAGE_EXT.test( f ) || VIDEO_EXT.test( f ) )
      .map( f => ( {
        name: path.basename( f, path.extname( f ) ).replace( /[-_]/g, ' ' ),
        file: f,
        type: VIDEO_EXT.test( f ) ? 'video' : 'image',
        url: `/art/${ encodeURIComponent( req.params.room ) }/${ encodeURIComponent( f ) }`
      } ) );
    res.json( files );
  } catch ( e ) { res.json( [] ); }
} );

app.listen( PORT, () => {
  console.log( `\n🎨  Art Gallery → http://localhost:${ PORT }\n` );
} );
