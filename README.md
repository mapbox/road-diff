A [Tile Reduce](https://github.com/mapbox/tile-reduce)-based script for comparing road networks of two OSM [vector tile](https://github.com/mapbox/vector-tile-spec) sources.

Generates a line delimited json file of road segments that are only present in the second source and within a certain threshold. It may then be turned into vector tiles with tools like [tippecanoe](https://github.com/mapbox/tippecanoe).

#### To Run:
* `npm install`
* `node index.js <path_to_osm_planet.mbtiles> <path_to_osm_other_for_diff.mbtiles>`

Output will be found in `osm_to_other_mbtiles_diff.ldjson` which is a line delimited json file of features.
To produce mbtiles file:
* Use [tippecanoe](https://github.com/mapbox/tippecanoe)
* `cat osm_to_other_mbtiles_diff.ldjson | tippecanoe -l LineString -o osm_to_other_mbtiles_diff.mbtiles -P -f -ab`
