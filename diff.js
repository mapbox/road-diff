var linematch = require("linematch");
var lineclip = require("lineclip");
var tilebelt = require("@mapbox/tilebelt");

const min_diff_px = 15;
const min_line_length_px = 30;

module.exports = function (data, tile, writeData, done) {

  if (typeof data.geosadak.geosadak_road !== 'undefined' && data.geosadak.geosadak_road.length && data.osm_qa_tiles.osm.length) {
    // filter and normalize input geometry
    var other_for_diff = toLines(data.geosadak.geosadak_road);
    var streets = toLines(data.osm_qa_tiles.osm);

    // Find other_for_diff parts that are not covered by streets within 10 pixels;
    // filter out chunks that are too short.

    var diff = [];

    if (
      typeof other_for_diff !== "undefined" &&
      other_for_diff.length &&
      typeof streets !== "undefined" &&
      streets.length
    )
      diff = linematch(other_for_diff, streets, min_diff_px).filter(
        filterShort
      );
    else diff = other_for_diff;

    var streets_length = streets.reduce(
      (previousValue, currentValue) => previousValue + dist(currentValue),
      0
    );
    var diff_length = diff.reduce(
      (previousValue, currentValue) => previousValue + dist(currentValue),
      0
    );

    tile_geojson = {
      type: "Feature",
      properties: {
        tile: tile.join(","),
        osm_road_km: parseFloat(((streets_length * 2.18) / 1000).toFixed(3)),
        geosadak_diff_km: parseFloat(((diff_length * 2.18) / 1000).toFixed(3)),
        geosadak_habitation_count: data.geosadak.hasOwnProperty(
          "geosadak_place"
        )
          ? data.geosadak.geosadak_place.length
          : 0,
        geosadak_facility_count: data.geosadak.hasOwnProperty("geosadak_poi")
          ? data.geosadak.geosadak_poi.length
          : 0,
      },
      geometry: tilebelt.tileToGeoJSON(tile),
    };

    var osm_habitation_count = 0;
    if (data.osm_qa_tiles.osm.length) {
      for (var i = 0; i < data.osm_qa_tiles.osm.length; i++) {
        var f = data.osm_qa_tiles.osm.feature(i);
        if (
          f.properties.hasOwnProperty("place") && f.properties.hasOwnProperty("name") &&
          (f.properties.place == "village" || f.properties.place == "hamlet")
        )
          osm_habitation_count++;
      }
    }

    tile_geojson.properties["road_diff_pct"] = parseFloat(
      (
        (100 * tile_geojson.properties.geosadak_diff_km) /
        (tile_geojson.properties.osm_road_km +
          tile_geojson.properties.geosadak_diff_km)
      ).toFixed(2)
    );
    tile_geojson.properties["osm_habitation_count"] = osm_habitation_count;
    tile_geojson.properties["habitation_diff_pct"] = parseFloat(
      (  
        100 * (tile_geojson.properties.geosadak_habitation_count - tile_geojson.properties.osm_habitation_count) /
        tile_geojson.properties.geosadak_habitation_count + tile_geojson.properties.osm_habitation_count
      ).toFixed(2)
    );

    console.log(JSON.stringify(tile_geojson));

    if (diff.length) {
      // write each feature as a linestring
      var feature = {
        type: "Feature",
        properties: {
          tile: tile.join(","),
        },
        geometry: {
          type: "LineString",
        },
      };

      // Write GeoJSON feature
      toGeoJSON(diff, tile).forEach(function (line) {
        feature.geometry.coordinates = line;
        writeData(JSON.stringify(feature) + "\n");
      });
    }
  }

  done(null, null);
};

function toGeoJSON(diff, tile) {
  var size = 4096 * Math.pow(2, tile[2]);
  var x0 = 4096 * tile[0];
  var y0 = 4096 * tile[1];

  for (var i = 0; i < diff.length; i++) {
    for (var j = 0; j < diff[i].length; j++) {
      var p = diff[i][j];
      var y2 = 180 - ((p[1] + y0) * 360) / size;
      diff[i][j] = [
        round(((p[0] + x0) * 360) / size - 180),
        round((360 / Math.PI) * Math.atan(Math.exp((y2 * Math.PI) / 180)) - 90),
      ];
    }
  }
  return diff;
}

function round(num) {
  return Math.round(num * 1e6) / 1e6;
}

function toLines(layer) {
  var lines = [];
  var bbox = [0, 0, 4096, 4096];

  for (var i = 0; i < layer.length; i++) {
    var feature = layer.feature(i);

    // Only consider polygon features with OSM highway tag and of correct type.
    // This will remove undesired differences (buildings, walls, etc.).
    // console.log(feature)
    if (
      feature.type === 2 &&
      (feature.properties.highway || feature.properties.ER_ID)
    ) {
      var geom = feature.loadGeometry();

      for (var k = 0; k < geom.length; k++) {
        lineclip(normalizeLine(geom[k], layer.extent), bbox, lines); // clip to tile bbox and add to result
      }
    }
  }
  return lines;
}

function normalizeLine(line, extent) {
  var newLine = [];
  for (var i = 0; i < line.length; i++) {
    newLine.push([(line[i].x * 4096) / extent, (line[i].y * 4096) / extent]);
  }
  return newLine;
}

function filterShort(line) {
  return dist(line) >= min_line_length_px; // line length is at least 30 pixels
}

function dist(line) {
  // approximate distance
  var d = 0;
  for (var i = 1; i < line.length; i++) {
    var dx = line[i][0] - line[i - 1][0];
    var dy = line[i][1] - line[i - 1][1];
    d += Math.sqrt(dx * dx + dy * dy);
  }
  return d;
}
