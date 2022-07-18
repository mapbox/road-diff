> Forked from https://github.com/mapbox/road-diff/tree/osm_to_osm_diff

Produces a diff of [PMGSY Geosadak road segments](https://github.com/datameet/pmgsy-geosadak) that is not present in the latest India OSM road network.


### Instructions

#### Installation

```
git clone https://github.com/mapbox/road-diff.git
cd road-diff
git checkout geosadak-diff
git pull
nvm use v8 # To use node v8
npm install
```

#### Step 1: Generate Geosadak mbtiles

* Convert data from [PMGSY Geosadak road segments](https://github.com/datameet/pmgsy-geosadak/tree/master/data/Road_DRRP) into a line delimited `geosadak_road.geojsonl` `geosadak_proposed_road.geojsonl`
* Generate `geosadak.mbtiles` using [tippecanoe](https://github.com/mapbox/tippecanoe)

```
cat "geosadak_road.geojsonl" "geosadak_proposed_road.geojsonl" | tippecanoe --force -o "geosadak.mbtiles" -l geosadak_road -n "PMGSY Geosadak Roads" -z12 -Z10 -d14 --drop-smallest-as-needed
```


#### Step 2: Generate diff with latest OSM India extract

```
# Download latest OSM mbtiles extract from https://osmlab.github.io/osm-qa-tiles/
curl https://hot-qa-tiles.s3.amazonaws.com/latest.country/india.mbtiles.gz --output india.mbtiles.gz
gunzip india.mbtiles.gz --force

echo "Computing Geosadak OpenStreetMap diff using tile-reduce."
node index.js  diff "india.mbtiles" "geosadak.mbtiles" "geosadak_diff.geojsonl"

echo "Exporting geosadak_diff_tilestats.mbtiles"
sed -n -e '/Polygon/p' "geosadak_diff.geojsonl" | tippecanoe --force -o "geosadak_diff_tilestats.mbtiles" --coalesce-densest-as-needed --extend-zooms-if-still-dropping -z12

echo "Exporting geosadak_diff_road.mbtiles"
sed -n -e '/tile.*LineString/p' "geosadak_diff.geojsonl" | tippecanoe --force -o "geosadak_diff_road.mbtiles" -l geosadak_road_diff -n "PMGSY Geosadak Roads" -z12 -Z10 -d14
```

* Mapbox tileset: https://studio.mapbox.com/tilesets/planemad.geosadak/
* Map: http://projects.datameet.org/pmgsy-geosadak/map.html


