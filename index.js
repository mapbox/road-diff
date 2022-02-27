var tileReduce = require('tile-reduce');
var path = require('path');
var fs = require('fs');

var osm = process.argv[2];
var other_for_diff = process.argv[3];

if (!osm || !other_for_diff) return console.log('must specify osm and other_for_diff tilesets:', process.argv[0], process.argv[1], '<osm.mbtiles>', '<other_for_diff.mbtiles>');

// The `sourceCover: 'other_for_diff'` flag tells tileReduce to limit the area
// it's diffing to the smaller region of other_for_diff.
tileReduce({
  maxWorkers: 1,
  zoom: 10,
  map: path.join(__dirname, 'diff.js'),
  tiles: [
		[739,446,10]
	],
  sources: [
    {name: 'osm',   mbtiles: osm, raw: true},
    {name: 'other_for_diff', mbtiles: other_for_diff, raw: true}
  ],
  output: fs.createWriteStream('osm_to_other_mbtiles_diff1.ldjson')
})
.on('start', function() {
    console.log('start');
})
.on('map', function (tile, workerId) {
	console.log('about to process ' + JSON.stringify(tile) +' on worker '+workerId);
})
.on('reduce', function(result, tile){
 console.log('tlo')
})
.on('end', function() {
    console.log('end');
});
