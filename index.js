'use strict';

var tileReduce = require('../../src');
var path = require('path');

tileReduce({
  zoom: 12,
  map: path.join(__dirname, 'diff.js'),
  sources: [
    {name: 'osm',   mbtiles: path.join(__dirname, 'osm.mbtiles'), raw: true},
    {name: 'tiger', mbtiles: path.join(__dirname, 'tiger.mbtiles'), raw: true}
  ]
})
.on('start', function() {
  // null feature is a hack to be able to write each feature starting with a comma
  process.stdout.write('{"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": null, "properties": null}');
})
.on('end', function() {
  process.stdout.write(']}');
});
