var tileReduce = require('tile-reduce');
var path = require('path');
var fs = require('fs');

var osm = process.argv[2];
var tiger = process.argv[3];

if (!osm || !tiger) return console.log('must specify osm and tiger tilesets:', process.argv[0], process.argv[1], '<osm.mbtiles>', '<tiger.mbtiles>');

tileReduce({
  zoom: 12,
  map: path.join(__dirname, 'diff.js'),
  sources: [
    {name: 'osm',   mbtiles: path.join(__dirname, osm), raw: true},
    {name: 'tiger', mbtiles: path.join(__dirname, tiger), raw: true}
  ],
  output: fs.createWriteStream('tiger2015-diff.ldjson')
})
.on('start', function() {
    console.log('start');
})
.on('end', function() {
    console.log('end');
});
