A [Tile Reduce](https://github.com/mapbox/tile-reduce)-based script for comparing road networks of two OSM [vector tile](https://github.com/mapbox/vector-tile-spec) sources.

Generates a line delimited json file of road segments that are only present in the second source and within a certain threshold. It may then be turned into vector tiles with tools like [tippecanoe](https://github.com/mapbox/tippecanoe).

#### To Run:
* `npm install`
* `node index.js <path_to_osm_planet.mbtiles> <path_to_osm_other_for_diff.mbtiles>`

Output will be found in `osm_to_other_mbtiles_diff.ldjson` which is a line delimited json file of features.
To produce mbtiles file:
* Use [tippecanoe](https://github.com/mapbox/tippecanoe)
* `cat osm_to_other_mbtiles_diff.ldjson | tippecanoe -l LineString -o osm_to_other_mbtiles_diff.mbtiles -P -f -ab`

#### Change Diff Criteria:
If you are interested in getting back different diff results than just roads, you only need to update one line. Locate `if (feature.type === 2 && feature.properties.highway) {` in diff.js and update the feature type/properties as desired to diff the appropriate details.

#### Potential Errors:

```road-diff/diff.js:58
  for (var i = 0; i < layer.length; i++) {
                           ^

TypeError: Cannot read property 'length' of undefined
    at toLines (/Users/miles/dev/road-diff/diff.js:58:28)
    at module.exports (/Users/miles/dev/road-diff/diff.js:7:24)
    at gotData (/Users/miles/dev/road-diff/node_modules/tile-reduce/src/worker.js:67:5)
    at notify (/Users/miles/dev/road-diff/node_modules/tile-reduce/node_modules/queue-async/build/queue.js:62:29)
    at /Users/miles/dev/road-diff/node_modules/tile-reduce/node_modules/queue-async/build/queue.js:49:29
    at tileUnzipped (/Users/miles/dev/road-diff/node_modules/tile-reduce/src/mbtiles.js:38:7)
    at Unzip.onEnd (zlib.js:227:5)
    at emitNone (events.js:72:20)
    at Unzip.emit (events.js:166:7)
```
If you hit the above error when running your script, this is likely due to the line `var other_for_diff = toLines(data.other_for_diff.osm);` in diff.js using the wrong `id` field value. To identify the correct value:
* In your terminal, run `sqlite3 south_sudan.mbtiles`
* In the sqlite3 prompt, run: `select * from metadata limit 15;`
* Look for this line in the output `json|{"vector_layers":[{"id":"osm","description":"","minzoom":12,"maxzoom":12,"fields":{}}]}` and use the value of the id field (in this case `osm`).
* Take that value, and update the line in diff.js to be `var other_for_diff = toLines(data.other_for_diff.<id_value_from_sqlit3>);`
