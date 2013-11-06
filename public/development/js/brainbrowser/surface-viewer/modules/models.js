/*
 * Copyright (C) 2011 McGill University
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

BrainBrowser.SurfaceViewer.core.models = function(viewer) {
  "use strict";

  //////////////////////////////
  // INTERFACE
  /////////////////////////////

  // Display an object file.
  // Handles polygon-based and line-based models. Polygon models that have exactly
  // 81924 vertices are assumed to be brain models and are handled separately so the
  // hemispheres can be separated.
  //
  // @param {Object} obj object representing the model to be displayed
  // @param {String} filename name of the original file
  viewer.displayObjectFile = function(obj, filename, options) {
    options = options || {};
    var renderDepth = options.renderDepth;
    var afterDisplay = options.afterDisplay;

    if (obj.objectClass === 'P' && obj.numberVertices === 81924) {
      addBrain(obj, renderDepth);
    } else if(obj.objectClass === 'P') {
      addPolygonObject(obj,filename, renderDepth);
    } else if(obj.objectClass === 'L') {
      addLineObject(obj, filename, renderDepth);
    } else {
      alert("Object file not supported");
    }

    viewer.triggerEvent("displayobject", viewer.model);

    if (afterDisplay) afterDisplay();
  };

  //////////////////////////////
  // PRIVATE FUNCTIONS
  /////////////////////////////


  // Add a brain model to the scene.
  function addBrain(obj) {
    var model = viewer.model;
    var left, right;

    viewer.model_data = obj;
    left = createHemisphere(obj.left);
    left.name = "left";
    left.model_num = 0;
    right = createHemisphere(obj.right);
    right.name = "right";
    right.model_num = 1;
    model.add(left);
    model.add(right);
  }

  // Add an individual brain hemisphere to the scene.
  function createHemisphere(obj) {
    var verts = obj.positionArray;
    var indices = obj.indexArray;
    var norms = obj.normalArray;
    var bounding_box = {};
    var centroid = {};
    var i, count;
    var geometry = new THREE.BufferGeometry();
    var material, hemisphere;

    var num_vertices = indices.length; // number of unindexed vertices.
    var num_coords = num_vertices * 3;
    var num_color_coords = num_vertices * 4;

    var position_attribute_array, normal_attribute_array, color_attribute_array;

    //Calculate center so positions of objects relative to each other can
    // defined (mainly for transparency).
    for(i = 0, count = verts.length; i + 2 < count; i += 3) {
      boundingBoxUpdate(bounding_box, verts[i], verts[i+1], verts[i+2]);
    }
    centroid.x = bounding_box.minX + 0.5 * (bounding_box.maxX - bounding_box.minX);
    centroid.y = bounding_box.minY + 0.5 * (bounding_box.maxY - bounding_box.minY);
    centroid.z = bounding_box.minY + 0.5 * (bounding_box.maxZ - bounding_box.minZ);

    geometry.dynamic = true;

    geometry.attributes.position = {
      itemSize: 3,
      array: new Float32Array(num_coords),
      numItems: num_coords
    };

    geometry.attributes.normal = {
      itemSize: 3,
      array: new Float32Array(num_coords),
      numItems: num_coords
    };

    geometry.attributes.color = {
      itemSize: 4,
      array: new Float32Array(num_color_coords),
      numItems: num_color_coords
    };

    geometry.original_data = {
      vertices: verts,
      indices: indices,
      norms: norms,
      colors: null
    };

    position_attribute_array = geometry.attributes.position.array;
    normal_attribute_array = geometry.attributes.normal.array;
    color_attribute_array = geometry.attributes.color.array;

    for (i = 0, count = geometry.attributes.color.array.length; i < count; i++) {
      geometry.attributes.color.array[i] = 1.0;
    }

    // "Unravel" the vertex and normal arrays so we don't have to use indices
    // (Avoids WebGL's 16 bit limit on indices)
    for (i = 0, count = num_vertices; i < count; i++) {
      position_attribute_array[i*3] = verts[indices[i] * 3] - centroid.x;
      position_attribute_array[i*3 + 1] = verts[indices[i] * 3 + 1] - centroid.y;
      position_attribute_array[i*3 + 2] = verts[indices[i] * 3 + 2] - centroid.z;
      normal_attribute_array[i*3] = norms[indices[i] * 3];
      normal_attribute_array[i*3 + 1] = norms[indices[i] * 3 + 1];
      normal_attribute_array[i*3 + 2] = norms[indices[i] * 3 + 2];
    }

    material = new THREE.MeshPhongMaterial({color: 0xFFFFFF, ambient: 0x0A0A0A, specular: 0xFFFFFF, shininess: 100, vertexColors: THREE.VertexColors});
    hemisphere = new THREE.Mesh(geometry, material);

    hemisphere.centroid = centroid;
    hemisphere.position.set(centroid.x, centroid.y, centroid.z);

    return hemisphere;
  }

  //Add a line model to the scene.
  function addLineObject(obj, filename, renderDepth) {
    var model = viewer.model;
    var lineObject = createLineObject(obj);
    lineObject.name = filename;
    if (renderDepth) {
      lineObject.renderDepth = renderDepth;
    }

    model.add(lineObject);
  }

  //Create a line model.
  function createLineObject(obj) {
    var model_data = obj;
    var indices = [];
    var verts = model_data.positionArray;
    var colors = model_data.colorArray;
    var bounding_box = {};
    var centroid = {};
    var i, j, k, count;
    var nitems = model_data.nitems;
    var geometry = new THREE.BufferGeometry();
    var start;
    var indexArray;
    var endIndex;
    var material, lineObject;

    var position_attribute_array, color_attribute_array;
    var num_vertices, num_coords, num_color_coords;


    for (i = 0; i < nitems; i++){
      if (i === 0){
        start = 0;
      } else {
        start = model_data.endIndicesArray[i-1];
      }
      indices.push(model_data.indexArray[start]);
      indexArray = model_data.indexArray;
      endIndex = model_data.endIndicesArray[i];
      for (k = start + 1; k < endIndex - 1; k++) {
        indices.push(indexArray[k]);
        indices.push(indexArray[k]);
      }
      indices.push(indexArray[endIndex-1]);
    }

    num_vertices = indices.length;  // number of unindexed vertices.
    num_coords = num_vertices * 3;
    num_color_coords = num_vertices * 4;

    //Calculate center so positions of objects relative to each other can be determined.
    //Mainly for transparency.
    for (j = 0, count = num_vertices; j < count; j++) {
      boundingBoxUpdate(bounding_box, verts[indices[j]*3], verts[indices[j]*3+1], verts[indices[j]*3+2]);
    }

    centroid.x = bounding_box.minX + 0.5 * (bounding_box.maxX - bounding_box.minX);
    centroid.y = bounding_box.minY + 0.5 * (bounding_box.maxY - bounding_box.minY);
    centroid.z = bounding_box.minY + 0.5 * (bounding_box.maxZ - bounding_box.minZ);



    geometry.dynamic = true;

    geometry.attributes.position = {
      itemSize: 3,
      array: new Float32Array(num_coords),
      numItems: num_coords
    };

    geometry.attributes.color = {
      itemSize: 4,
      array: new Float32Array(num_color_coords),
      numItems: num_color_coords
    };

    geometry.original_data = {
      vertices: verts,
      indices: indices,
      norms: null,
      colors: colors
    };

    position_attribute_array = geometry.attributes.position.array;
    color_attribute_array = geometry.attributes.color.array;

    // "Unravel" the vertex and normal arrays so we don't have to use indices
    // (Avoids WebGL's 16 bit limit on indices)
    for (i = 0, count = num_vertices; i < count; i++) {
      position_attribute_array[i*3] = verts[indices[i] * 3] - centroid.x;
      position_attribute_array[i*3 + 1] = verts[indices[i] * 3 + 1] - centroid.y;
      position_attribute_array[i*3 + 2] = verts[indices[i] * 3 + 2] - centroid.z;
      color_attribute_array[i*4] = colors[indices[i] * 4];
      color_attribute_array[i*4 + 1] = colors[indices[i] * 4 + 1];
      color_attribute_array[i*4 + 2] = colors[indices[i] * 4 + 2];
      color_attribute_array[i*4 + 3] = 1.0;
    }

    material = new THREE.LineBasicMaterial({vertexColors: THREE.VertexColors});
    lineObject = new THREE.Line(geometry, material, THREE.LinePieces);
    lineObject.position.set(centroid.x, centroid.y, centroid.z);
    lineObject.centroid = centroid;

    return lineObject;
  }

  // Add a polygon object to the scene.
  function addPolygonObject(obj, filename){
    var model = viewer.model;
    var shape;
    var i, count;
    var model_data = obj;
    var shapes = model_data.shapes;

    viewer.model_data = model_data;
    if (shapes){
      for (i = 0, count = shapes.length; i < count; i++){
        shape = createPolygonShape(viewer.model_data.shapes[i]);
        shape.name = viewer.model_data.shapes[i].name || (filename.split(".")[0] + "_" + i);
        model.add(shape);
      }
    }else {
      shape = createPolygonShape(viewer.model_data);
      shape.name = filename;
      model.add(shape);
    }
  }

  // Create a polygon object.
  function createPolygonShape(model_data) {
    var verts = model_data.positionArray;
    var indices  = model_data.indexArray;
    var colors = model_data.colorArray;
    var norms = model_data.normalArray;
    var normals_given = (norms.length > 0);
    var all_gray = false;
    var geometry = new THREE.BufferGeometry();
    var material, polygonShape;
    var data_color_0, data_color_1, data_color_2;

    var position_attribute_array, normal_attribute_array, color_attribute_array;
    var num_vertices = indices.length; // number of unindexed vertices.
    var num_coords = num_vertices * 3;
    var num_color_coords = num_vertices * 4;

    var i, count;


    if(colors.length === 4) {
      all_gray = true;
      data_color_0 = colors[0];
      data_color_1 = colors[1];
      data_color_2 = colors[2];
    }

    geometry.dynamic = true;

    geometry.attributes.position = {
      itemSize: 3,
      array: new Float32Array(num_coords),
      numItems: num_coords
    };


    if (normals_given) {
      geometry.attributes.normal = {
        itemSize: 3,
        array: new Float32Array(num_coords),
        numItems: num_coords
      };
    }

    geometry.attributes.color = {
      itemSize: 4,
      array: new Float32Array(num_color_coords),
      numItems: num_color_coords
    };

    geometry.original_data = {
      vertices: verts,
      indices: indices,
      norms: norms || null,
      colors: colors
    };

    position_attribute_array = geometry.attributes.position.array;
    if (normals_given) {
      normal_attribute_array = geometry.attributes.normal.array;
    }
    color_attribute_array = geometry.attributes.color.array;

    for (i = 0, count = geometry.attributes.color.array.length; i < count; i++) {
      geometry.attributes.color.array[i] = 1.0;
    }

    // "Unravel" the vertex, normal and color arrays so we don't have to use indices
    // (Avoids WebGL's 16 bit limit on indices)
    for (i = 0, count = indices.length; i < count; i++) {
      position_attribute_array[i*3] = verts[indices[i] * 3];
      position_attribute_array[i*3 + 1] = verts[indices[i] * 3 + 1];
      position_attribute_array[i*3 + 2] = verts[indices[i] * 3 + 2];
      if (normals_given) {
        normal_attribute_array[i*3] = norms[indices[i] * 3];
        normal_attribute_array[i*3 + 1] = norms[indices[i] * 3 + 1];
        normal_attribute_array[i*3 + 2] = norms[indices[i] * 3 + 2];
      }

      if (all_gray) {
        color_attribute_array[i*4] = data_color_0;
        color_attribute_array[i*4 + 1] = data_color_1;
        color_attribute_array[i*4 + 2] = data_color_2;
      } else {
        color_attribute_array[i*4] = colors[indices[i] * 4];
        color_attribute_array[i*4 + 1] = colors[indices[i] * 4 + 1];
        color_attribute_array[i*4 + 2] = colors[indices[i] * 4 + 2];
      }
      color_attribute_array[i*4 + 3] = 1.0;
    }

    if (!normals_given) {
      geometry.computeVertexNormals();
    }

    material = new THREE.MeshPhongMaterial({color: 0xFFFFFF, ambient: 0x0A0A0A, specular: 0xFFFFFF, shininess: 100, vertexColors: THREE.VertexColors});

    polygonShape = new THREE.Mesh(geometry, material);

    return polygonShape;
  }

  // Update current values of the bounding box of
  // an object.
  function boundingBoxUpdate(box, x, y, z) {
    if (!box.minX || box.minX > x) {
      box.minX = x;
    }
    if (!box.maxX || box.maxX < x) {
      box.maxX = x;
    }
    if (!box.minY || box.minY > y) {
      box.minY = y;
    }
    if (!box.maxY || box.maxY < y) {
      box.maxY = y;
    }
    if (!box.minZ || box.minZ > z) {
      box.minZ = z;
    }
    if (!box.maxZ || box.maxZ < z) {
      box.maxZ = z;
    }
  }

};