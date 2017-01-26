var tileReduce = require('tile-reduce');
var path = require('path');
var fs = require('fs');

var osm = process.argv[2];
var other_for_diff = process.argv[3];

if (!osm || !other_for_diff) return console.log('must specify osm and other_for_diff tilesets:', process.argv[0], process.argv[1], '<osm.mbtiles>', '<other_for_diff.mbtiles>');

// The `sourceCover: 'other_for_diff'` flag tells tileReduce to limit the area
// it's diffing to the smaller region of other_for_diff.
tileReduce({
  zoom: 12,
  map: path.join(__dirname, 'diff.js'),
  sourceCover: 'other_for_diff',
  sources: [
    {name: 'osm',   mbtiles: osm, raw: true},
    {name: 'other_for_diff', mbtiles: other_for_diff, raw: true}
  ],
  output: fs.createWriteStream('osm_to_other_mbtiles_diff.ldjson')
})
.on('start', function() {
    console.log('start');
})
.on('end', function() {
    console.log('end');
});
