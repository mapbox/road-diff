var tileReduce = require("tile-reduce");
var path = require("path");
var fs = require("fs");

var osm = process.argv[3];
var geosadak = process.argv[4];
var diff_output = process.argv[5];

const accessToken =
  "pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ";

if (!osm || !geosadak)
  return console.log(
    "must specify osm and other_for_diff tilesets:",
    process.argv[0],
    process.argv[1],
    "<osm.mbtiles>",
    "<other_for_diff.mbtiles>"
  );

var geojson = {
  type: "Polygon",
  coordinates: [
    [
      [75.640869140625, 7.798078531355303],
      [78.695068359375, 7.798078531355303],
      [78.695068359375, 10.293301000109102],
      [75.640869140625, 10.293301000109102],
      [75.640869140625, 7.798078531355303],
    ],
  ],
};

// The `sourceCover: 'other_for_diff'` flag tells tileReduce to limit the area
// it's diffing to the smaller region of other_for_diff.
tileReduce({
  // geojson: geojson,
  maxWorkers: 20,
  zoom: 12,
  map: path.join(__dirname, "reducer.js"),
  sources: [
    // {
    //   name: 'osm',
    //   url: `https://b.tiles.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.vector.pbf?access_token=${accessToken}`,
    //   layers: ['road'],
    //   raw: true,
    //   maxrate: 10
    // },
    // {
    //   name: 'other_for_diff',
    //   url: `https://b.tiles.mapbox.com/v4/planemad.india-rural-connectivity/{z}/{x}/{y}.vector.pbf?access_token=${accessToken}`,
    //   layers: ['roads'],
    //   raw: true,
    //   maxrate: 10
    // }
    { name: "osm_qa_tiles", mbtiles: osm, raw: true },
    { name: "geosadak", mbtiles: geosadak, raw: true },
  ],
  output: fs.createWriteStream(diff_output),
})
  .on("start", function () {
    console.log("start");
  })
  .on("map", function (tile, workerId) {
    console.log(
      "about to process " + JSON.stringify(tile) + " on worker " + workerId
    );
  })
  .on("end", function () {
    console.log("end");
  });
