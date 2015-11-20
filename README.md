A [Tile Reduce](https://github.com/mapbox/tile-reduce)-based script for comparing road networks of two [vector tile](https://github.com/mapbox/vector-tile-spec) sources (e.g. OSM and Tiger).

Generates a GeoJSON of road segments that present in one source but not the other within a certain threshold. It may then be turned into vector tiles with tools like [tippecanoe](https://github.com/mapbox/tippecanoe).
