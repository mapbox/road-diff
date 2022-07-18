var linematch = require("linematch");
var lineclip = require("lineclip");
var tilebelt = require("@mapbox/tilebelt");
var turfHelpers = require("@turf/helpers");
var turfDistance = require("@turf/distance");
const Fuse = require("fuse.js");

const min_diff_px = 15;
const min_line_length_px = 30;

module.exports = function (data, tile, writeData, done) {
  if (
    typeof data.geosadak.geosadak_road !== "undefined" &&
    data.geosadak.geosadak_road.length &&
    data.osm_qa_tiles.osm.length
  ) {
    // filter and normalize input geometry
    var compare_road_lines = toLines(data.geosadak.geosadak_road);
    var osm_road_lines = toLines(data.osm_qa_tiles.osm);

    // Find compare_road_lines parts that are not covered by streets within 10 pixels;
    // filter out chunks that are too short.

    var diff = [];

    if (
      typeof compare_road_lines !== "undefined" &&
      compare_road_lines.length &&
      typeof osm_road_lines !== "undefined" &&
      osm_road_lines.length
    )
      diff = linematch(compare_road_lines, osm_road_lines, min_diff_px).filter(
        filterShort
      );
    else diff = compare_road_lines;

    //
    // Generate place diff
    //

    var place_features = [];
    var place_match_lines = [];
    var osm_habitation_count = 0;

    // Parse OSM features
    if (data.osm_qa_tiles.osm.length) {
      for (var i = 0; i < data.osm_qa_tiles.osm.length; i++) {
        var f = data.osm_qa_tiles.osm.feature(i);
        if (
          f.properties.hasOwnProperty("place") &&
          f.properties.hasOwnProperty("name") &&
          (f.properties.place == "village" || f.properties.place == "hamlet")
        ) {
          osm_habitation_count++;

          // Remove unwanted properties
          f.properties = {
            "place" : f.properties["place"],
            "name" : f.properties["name"],
            "name:en" : f.properties["name:en"],
            "alt_name" : f.properties["alt_name"],
            "@uid" : f.properties["@uid"],
          }
          place_features.push(f.toGeoJSON(tile[0], tile[1], tile[2]));
        }
      }
    }

    // Compare features

    const options = {
      includeScore: true,
      keys: ["properties.name", "properties.name:en", "properties.alt_name"],
    };

    const fuse = new Fuse(place_features, options);

    if (
      typeof data.geosadak.geosadak_place !== "undefined" &&
      data.geosadak.geosadak_place.length
    ) {
      for (var i = 0; i < data.geosadak.geosadak_place.length; i++) {
        var f = data.geosadak.geosadak_place.feature(i);

        // Add OSM matching
        if (f.properties.hasOwnProperty("HAB_NAME")) {
          const result = fuse.search(f.properties["HAB_NAME"]);

          var feature = f.toGeoJSON(tile[0], tile[1], tile[2]);
          if (result.length && result[0].score < 0.3) {
            feature.properties["match_osm_id"] =
              result[0].item.properties["@uid"];
            feature.properties["match_osm_name"] =
              result[0].item.properties["name"];
            feature.properties["match_osm_score"] = result[0].score;
            // feature.properties["match_osm_distance"] = turfDistance(feature.geometry.coordinates, result[0].item.geometry.coordinates);

            writeData(JSON.stringify(turfHelpers.lineString([feature.geometry.coordinates, result[0].item.geometry.coordinates], {name: 'line 1'})) + "\n")
          }
        }

        place_features.push(feature);

      }
    }

    // Write
    place_features.forEach((feature) =>
      {
        // Clip result features within the tile since the tile buffer includes features in the overlapping tiles
        // which will be duplicated if not clipped
        if( feature && JSON.stringify(tilebelt.pointToTile(feature.geometry.coordinates[0], feature.geometry.coordinates[1], 12)) == JSON.stringify(tile) )
          writeData(JSON.stringify(feature) + "\n")
      }
    );

    //
    // Generate tilestats
    //

    const streets_length = osm_road_lines.reduce(
      (previousValue, currentValue) => previousValue + dist(currentValue),
      0
    );

    const diff_length = diff.reduce(
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
        geosadak_habitation_match_count: place_features.length ? place_features.filter((f) =>
          f && f.properties.hasOwnProperty("match_osm_score")
        ).length :0,
        geosadak_facility_count: data.geosadak.hasOwnProperty("geosadak_poi")
          ? data.geosadak.geosadak_poi.length
          : 0,
      },
      geometry: tilebelt.tileToGeoJSON(tile),
    };

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
        (100 *
          (tile_geojson.properties.geosadak_habitation_count -
            tile_geojson.properties.osm_habitation_count)) /
          tile_geojson.properties.geosadak_habitation_count +
        tile_geojson.properties.osm_habitation_count
      ).toFixed(2)
    );

    writeData(JSON.stringify(tile_geojson) + "\n");

    //
    // Generate road diff
    //

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
