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

/*
 * This file defines MNIObj object.
 * Given a url, the constructor will fetch the file specified which should be an
 * MNI .obj file. It will then pars this file and return an object with the properties
 * needed to display the file.
 *
 */
function MNIObject(string) {

  var stack;



  this.parse = function (string) {
    this.num_hemispheres = 1; //setting it to one here by default,
                              //it will be set to two later if there are two hemispheres
    //replacing all new lines with spaces (obj files can be structure with or without them)
    //get all the fields as seperate strings.
    string = string.replace(/\s+$/, '');
    string = string.replace(/^\s+/, '');
    stack = string.split(/\s+/).reverse();
    this.objectClass = stack.pop();
    if( this.objectClass === 'P') {
      this.parse_polygon_class();
    }else {
      throw new Error("This object class is not supported currently");
    }

    //If there is two hemispheres, might need to be a better test one day
    if(this.positionArray.length > 80000*3){
      this.split_hemispheres();
    }



  };


  this.parse_polygon_class = function() {
    //surface properties of the polygons
    this.surfaceProperties = {
      ambient: parseFloat(stack.pop()),
      diffuse: parseFloat(stack.pop()),
      specular_reflectance: parseFloat(stack.pop()),
      specular_scattering: parseFloat(stack.pop()),
      transparency: parseFloat(stack.pop())
    };
    //number of vertices
    this.numberVertices = parseFloat(stack.pop());
    //vertices
    //alert("Number of vertices: " + this.numberVertices);
    this.positionArray = new Array();
    for(var v=0; v < this.numberVertices; v++) {
      for(var i=0; i<3;i++) {
	this.positionArray.push(parseFloat(stack.pop()));
      }
    }
    //alert("Position Array length: "+this.positionArray.length + " First vertex: " + this.positionArray[0] + " Last vertex: " + this.positionArray[this.positionArray.length - 1]);


    //Normals for each vertex
    this.normalArray = new Array();
    for(var n=0; n < this.numberVertices; n++){
      for(var i=0; i<3; i++) {
        this.normalArray.push(parseFloat(stack.pop()));
      }
    }
    //alert("normal Array length: "+this.normalArray.length + " first normal: " + this.normalArray[0] + " Last normal: " + this.normalArray[this.positionArray.length - 1]);
    this.numberPolygons = parseInt(stack.pop());
    //alert("Number of polygons: "+  this.numberPolygons);
    //alert(this.positionArray.length);
    this.colorFlag = parseInt(stack.pop());
    //alert('ColorFlag: ' + this.colorFlag);
    this.colorArray = new Array();
    if(this.colorFlag === 0) {
      for(var i=0; i<4; i++){
	      this.colorArray.push(parseFloat(stack.pop()));
      }
    }else if(this.colorFlag === 1) {
      for(var c=0;c < this.numberPolygons; c++){
	      for(var i=0; i<4; i++){
	        this.colorArray.push(parseFloat(stack.pop()));
	      }
      }
    }else if(this.colorFlag === 2) {
      for(var c=0;c < this.numberVertices; c++){
	      for(var i=0; i<4; i++){
	        this.colorArray.push(parseFloat(stack.pop()));
	      }
      }
    }else {
      throw new Error("colorFlag not valid in this file");
    }
    //alert("ColorArray: " + this.colorArray);
    //Polygons end indices
    var endIndicesArray = new Array();
    for(var p=0;p<this.numberPolygons;p++){
      endIndicesArray.push(parseInt(stack.pop()));
    }

    //alert(endIndicesArray[endIndicesArray.length-1]);
    //Polygon indices
    this.indexArray = new Array();
    var numberIndex = stack.length;
    //alert("Stack length " + stack.length + " END: " + stack[0] + "END-1 : " + stack[1]);
    for(var i=0; i<numberIndex;i++) {
      this.indexArray.push(parseInt(stack.pop()));
    }
    //alert("index Array length: "+this.indexArray.length + " first index: " + this.indexArray[0] + " Last index: " + this.indexArray[this.indexArray.length - 1]);
  };


  /*
   * Splits the model into two hemispheres
   * Making it easier to move the parts around (rotate the hemispheres 90 degrees,...)
   *
   */
  this.split_hemispheres = function() {

    this.left = {};
    this.right = {};

    var num_vertices = this.positionArray.length;
    this.left.positionArray = this.positionArray.slice(0,num_vertices/2);			this.right.positionArray = this.positionArray.slice(num_vertices/2, num_vertices);

    var num_indices = this.indexArray.length;
    this.left.indexArray = this.indexArray.slice(0,num_indices/2);
    this.right.indexArray = this.indexArray.slice(num_indices/2, num_indices);

    for(var i = 0; i < this.right.indexArray.length; i++) {
      this.right.indexArray[i] = this.right.indexArray[i]- 2 - num_indices/3/2/2;
    }
    var num_normals = this.normalArray.length;
    this.left.normalArray = this.normalArray.slice(0,num_normals/2);
    this.right.normalArray = this.normalArray.slice(num_normals/2, num_normals);


    this.left.colorFlag = this.colorFlag;
    this.right.colorFlag = this.colorFlag;


    if(this.colorFlag == 0 || this.colorFlag == 1) {

      this.left.colorArray = this.colorArray;
      this.right.colorArray = this.colorArray;

    }else {
      var num_colors = this.colorArray.length;
      this.left.colorArray = this.colorArray.slice(0,num_colors/2);
      this.right.colorArray = this.colorArray.slice(num_colors/2+1,-1);
    };

    this.left.numberVertices = this.numberVertices/2;
    this.right.numberVertices = this.numberVertices/2;

    this.left.numberPolygons = this.numberPolygons/2;
    this.right.numberPolygons = this.numberPolygons/2;

    this.num_hemispheres = 2;

  };


  this.get_vertex = function(index,position,hemisphere) {

    if(this.num_hemispheres > 1 ) {
      var model = this[hemisphere];
      var offset = 0;
      if(hemisphere == "right") {
	      offset = 2 + model.indexArray.length/3/2; //Since the index is offset when splitting the hemispheres, we have to make it right again to find the correct one.
      }

    }else {
      var model = this;
      var offset = 0;
    }




    var triangle = new Array();
    var start_index = index*3;
    for(var i=0; i<3; i++) {
      triangle.push(model.indexArray[start_index+i]);
    }
    var vertices = new Array();
    for(var i=0; i<3; i++) {
      var start_pos = triangle[i]*3;
      vertices[i] = new Array();
      for(var k=0;k<3;k++){
	vertices[i][k] = model.positionArray[start_pos+k];
      }
    }
    var distances = new Array();
    for(var i=0; i<3; i++) {
      distances.push(o3djs.math.distance(position,vertices[i]));
    }
    var closest = 0;
    if(distances[1] < distances[0]) {
      closest = 1;
    }
    if(distances[2] < distances[closest]) {
      closest = 2;
    }
    var vertex = triangle[closest] + offset;
    var position_vector = vertices[closest];
    return {vertex: vertex, position_vector: position_vector};


  };

  if(string){
    this.parse(string);
  };


};function Spectrum(data) {
  var that = this;


  /*
   * Creates an canvas with the spectrum of colors
   * from low(left) to high(right) values
   */
  that.createSpectrumCanvas = function(colors)  {
    if(colors == null ) {
      colors = that.colors;
    }
    that.canvas = document.createElement("canvas");

    jQuery(that.canvas).attr("width",colors.length);
    jQuery(that.canvas).attr("height",20);

    var context = that.canvas.getContext("2d");
    for(var i = 0; i < colors.length; i++) {
      context.fillStyle = "rgb("+parseInt(parseFloat(colors[i][0])*255)+','+parseInt(parseFloat(colors[i][1])*255)+','+parseInt(parseFloat(colors[i][2])*255)+')';
      context.fillRect(i,0,1,50);
    };


    return that.canvas;
  };



  /*
   * Parse the spectrum data from a string
   */
  function parseSpectrum(data) {
    data = data.replace(/\s+$/, '');
    data = data.replace(/^\s+/, '');
    var tmp = data.split(/\n/);
    var colors = new Array();
    for(var i=0;i<tmp.length;  i++) {
      var tmp_color = tmp[i].split(/\s+/);
      for(var k=0; k<3; k++) {
	tmp_color[k]=parseFloat(tmp_color[k]);
      }
      tmp_color.push(1.0000);
      colors.push(tmp_color);
    }
    that.colors = colors;
    return colors;
  }

  if(data) {
    parseSpectrum(data);
  }

}
function MNIData(data) {
  var that = this;
  that.parse = function(string) {
    string = string.replace(/\s+$/, '');
    string = string.replace(/^\s+/, '');
    that.values = string.split(/\s+/);
    for(var i = 0; i < that.values.length; i++) {
      that.values[i] = parseFloat(that.values[i]);
    }
    that.min = that.values.min();
    that.max = that.values.max();

  };

  that.createColorArray = function(min,max,spectrum) {
    var spectrum = spectrum.colors;
    var colorArray = [];

    //calculate a slice of the data per color
    var increment = ((max-min)+(max-min)/spectrum.length)/spectrum.length;

    //for each value, assign a color
    for(var i=0; i<that.values.length; i++) {
      if(that.values[i]<= min ) {
	var color_index = 0;
      }else if(that.values[i]> max){
	var color_index = spectrum.length-1;
      }else {
	var color_index = parseInt((that.values[i]-min)/increment);
      }

      //This inserts the RGBA values (R,G,B,A) independently
      colorArray.push.apply(colorArray,spectrum[color_index]);
    }

    return colorArray;
  };

  if(data) {
    that.parse(data);
  }



}/* BrainBrowser.js
 * This file defines the brainbrowser object used to initialize an O3D client and display a brain
 * model.
 *
 * This object requires that a div with o3d is defined in the page
 * This file currently depends on mniobj.js
 */

//Required o3d librairies

o3djs.base.o3d = o3d;
o3djs.require('o3djs.webgl');
o3djs.require('o3djs.math');
o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.pack');
o3djs.require('o3djs.picking');
o3djs.require('o3djs.arcball');
o3djs.require('o3djs.quaternions');
o3djs.require('o3djs.scene');



// //Some quick utilities (should be move to a special js file) BEHOLD THEIR AWESOMENESS
Array.prototype.min = function() {
  var increment = 50000;
  if(this.length > increment){
    var reduced_array = [];
    for(var i=0;i<this.length;i+=increment) {
      reduced_array.push(Math.min.apply(Math, this.slice(i,i+increment-1)));
    }
  }else {
    return Math.min.apply(Math, this);
  }
  return reduced_array.min();
};

//spacing between function for more awesome look. (I agree - Tarek)

Array.prototype.max = function(array) {
  var increment = 50000;
  if(this.length > increment){
    var reduced_array = [];
    for(var i=0;i<this.length;i+=increment) {
      reduced_array.push(Math.max.apply(Math, this.slice(i,i+increment-1)));
    }
  }else {
    return Math.max.apply(Math, this);
  }
  return reduced_array.max();
};


// Array.prototype.min = function(array) {
//   return Math.min.apply(Math, this);
// };
// Array.prototype.max = function(array) {
//   return Math.max.apply(Math, this);
// };


function BrainBrowser(url) {
  var that = this;

  this.setup = function(url) {
    that.preload_model(url);
  };

  this.init = function() {

    o3djs.webgl.makeClients(that.initStep2);
  };



  /*
   * Initialize the global variables of BrainBrowser,
   * the brain model, apply material & shader
   */
   that.initStep2 = function(clientElements) {
    // Initializes global variables and libraries.
    var o3dElement = clientElements[0];
    that.o3dElement = o3dElement;
    that.client = o3dElement.client;
    that.o3d = o3dElement.o3d;
    that.math = o3djs.math;
    that.dragging = false;
    that.o3dWidth = -1;
    that.o3dHeight = -1;
    that.quaternions = o3djs.quaternions;
    that.lastRot = that.math.matrix4.identity();
    that.thatRot = that.math.matrix4.identity();
    that.zoomFactor = 1.10;
    that.keyPressDelta = 0.1;
    that.clock = 0;
    that.timeMult = 1;
    that.camera = {
      farPlane: 5000,
      nearPlane:0.1
    };



    that.loading = jQuery("#o3d_loading");

    // Initialize O3D sample libraries. o3dElement is the o3d div in the page
    o3djs.base.init(o3dElement);
    // Create a pack to manage the objects created.
    that.pack = that.client.createPack();

    // Create the render graph for a view.
    var viewInfo = o3djs.rendergraph.createBasicView(
      that.pack,
      that.client.root,
      that.client.renderGraphRoot,
      [0.5,0.5,0.5,1]);
    that.viewInfo = viewInfo;
    // Set up a simple orthographic view.
    viewInfo.drawContext.projection = that.math.matrix4.perspective(
      that.math.degToRad(30), // 30 degree fov.
      that.client.width / that.client.height,
      1,                  // Near plane.
      5000);              // Far plane.

    // Set up our view transformation to look towards the world origin
    // where the brain is located.
    that.eyeView = [0,0,500];
    viewInfo.drawContext.view = that.math.matrix4.lookAt(
      that.eyeView, // eye
      [0, 0, 0],  // target
      [0, 1, 0]); // up

    that.aball = o3djs.arcball.create(100, 100);

    that.client.setRenderCallback(that.renderCallback);

    //Add event handlers
    jQuery("body").keydown(that.keyPressedCallback);
    o3djs.event.addEventListener(o3dElement, 'wheel', that.scrollMe);

     that.loadSpectrumFromUrl('/assets/spectral_spectrum.txt');


     //This allows a programmer to define a function that runs after initialization
     if(that.afterInit) {
       that.afterInit(that);
     }
     that.updateInfo();

     jQuery('#screenshot').click(function(event) {jQuery(this).attr("href",bb.client.toDataURL());});
  };



  this.uninit = function() {
    if (this.client) {
      this.client.cleanup();
    }
  };


  /*
   * This function is ran on every render.
   */
  this.renderCallback = function(renderEvent) {
    that.setClientSize();
  };

  this.createBrain = function(model_data) {
    that.model_data= model_data;
    // Create an Effect object and initialize it using the shaders
    // from a file on the server through an ajax request.
    var effect = that.pack.createObject('Effect');
    var shaderString;
    jQuery.ajax({ type: 'GET',
      url: '/webgl/shaders/blinnphong.txt',
      dataType: 'text',
      success: function(data) {
	shaderString = data;
      },
      error: function(request,textStatus,e) {
	alert("Failure in createBrain: " +  textStatus);
      },
      data: {},
      async: false,
      timeout: 10000
    });


    effect.loadFromFXString(shaderString);

    // Create a material for the mesh.
    var myMaterial = that.pack.createObject('Material');



    // Set the material's drawList.
    myMaterial.drawList = that.viewInfo.performanceDrawList;

    // Apply our effect to that myMaterial. The effect tells the 3D
    // hardware which shaders to use.
    myMaterial.effect = effect;

    effect.createUniformParameters(myMaterial);

    /*
     * Create the Shape for the brain mesh and assign its material.
     * two shapes will be created if the brain model has two hemispheres
     */
     if(model_data.num_hemispheres == 2) {

       var brainShape= {
	 left: that.createHemisphere(myMaterial,model_data.left, "left"),
	 right: that.createHemisphere(myMaterial, model_data.right, "right"),
	 num_hemisphere: 2
       };

     } else {
       var brainShape = that.createHemisphere(myMaterial, model_data);
       brainShape.num_hemisphere= 1;
     }



    // Create a new transform and parent the Shape under it.
    if(that.brainTransform == null) {

      that.brainTransform = that.pack.createObject('Transform');
      if(model_data.num_hemispheres == 2) {
	that.brainHemisphereTransforms = {};
	that.brainHemisphereTransforms.left = that.pack.createObject('Transform');
	that.brainHemisphereTransforms.right = that.pack.createObject('Transform');
      }
    }else {
      that.brainTransform.removeShape(that.brainTransform.shapes[0]);

      if(that.brainTransform.children[0] != null) {
	that.brainTransform.children[0].removeShape(that.brainTransform.children[0].shapes[0]);
      }

      if(that.brainTransform.children[1] !=null ) {
	that.brainTransform.children[1].removeShape(
	  that.brainTransform.children[1].shapes[0]);
      }
    };

    if(model_data.num_hemispheres != 2) {
      that.brainTransform.removeParam(that.brainTransform.children[0]);
      that.brainTransform.removeParam(that.brainTransform.children[1]);
    }

    if(model_data.num_hemispheres == 2 && that.brainHemisphereTransforms == null) {
    	that.brainHemisphereTransforms = {};
	that.brainHemisphereTransforms.left = that.pack.createObject('Transform');
	that.brainHemisphereTransforms.right = that.pack.createObject('Transform');
    }





    // Light position
    var light_pos_param = myMaterial.getParam('lightWorldPos');
    light_pos_param.value = that.eyeView;

    // Phong components of the light source
    var light_ambient_param = myMaterial.getParam('ambient');
    var light_ambientIntensity_param = myMaterial.getParam('ambientIntensity');
    var light_lightIntensity_param = myMaterial.getParam('lightIntensity');
    var light_specular_param = myMaterial.getParam('specular');
    var light_emissive_param = myMaterial.getParam('emissive');
    var light_colorMult_param = myMaterial.getParam('colorMult');

    // White ambient light
    light_ambient_param.value = [0.04, 0.04, 0.04, 1];
    light_ambientIntensity_param.value = [1, 1, 1, 1];
    light_lightIntensity_param.value = [0.8, 0.8, 0.8, 1];

    // White specular light
    light_specular_param.value = [0.5, 0.5, 0.5, 1];
    light_emissive_param.value = [0, 0, 0, 1];
    light_colorMult_param.value = [1, 1, 1, 1];

    // Shininess of the myMaterial (for specular lighting)
    var shininess_param = myMaterial.getParam('shininess');
    shininess_param.value = 30.0;


    // Parent the brain's transform to the client root.
     that.brainTransform.parent = that.client.root;

    if(brainShape.num_hemisphere == 1 ) {

      that.brainTransform.addShape(brainShape);
      brainShape.createDrawElements(that.pack, null);
    }else {
      that.brainHemisphereTransforms.left.parent = that.brainTransform;
      that.brainHemisphereTransforms.right.parent = that.brainTransform;
      that.brainHemisphereTransforms.left.addShape(brainShape.left);
      that.brainHemisphereTransforms.right.addShape(brainShape.right);
      brainShape.left.createDrawElements(that.pack, null);
      brainShape.right.createDrawElements(that.pack, null);

    }
    that.model_data = model_data;
  };

  /*
   * Creates the hemisphere shape with the material provide.
   */
  that.createHemisphere = function(material,model,name) {
    //model = unIndexModel(model);
    var hemShape = that.pack.createObject('Shape');
    var hemPrimitive = that.pack.createObject('Primitive');
    var streamBank = that.pack.createObject('StreamBank');

    hemPrimitive.material = material;
    hemPrimitive.owner = hemShape;
    hemPrimitive.streamBank = streamBank;
    hemShape.name = name;

    hemPrimitive.primitiveType = that.o3d.Primitive.TRIANGLE_LIST;

    var state = that.pack.createObject('State');

    //create Position buffer (vertices) and set the number of vertices global variable
    var positionsBuffer = that.pack.createObject('VertexBuffer');
    var positionsField = positionsBuffer.createField('FloatField', 3);
    if(!model.positionArray) {
      alert("PositionArray nil");
      return false;
    }
    positionsBuffer.set(model.positionArray);
    //positionsBuffer.set(newPositionArray);
    that.numberVertices = model.numberVertices;
    var numberVertices = (model.positionArray.length/3);
    hemPrimitive.numberVertices = that.numberVertices;

    //create indexBuffer and make sure number of primitive is set
    if(!model.indexArray) {
      alert("Index Array nil");
      return false;
    }
    hemPrimitive.numberPrimitives = model.indexArray.length/3;
    var indexBuffer = that.pack.createObject('IndexBuffer');
    indexBuffer.set(model.indexArray);
    hemPrimitive.indexBuffer = indexBuffer;


    //Create normal buffer
    var normalBuffer = that.pack.createObject('VertexBuffer');
    var normalField = normalBuffer.createField('FloatField', 3);
    normalBuffer.set(model.normalArray);
    //normalBuffer.set(newNormalArray);



    //Create colorBuffer from base color of model

    var colorArray=[];
    if(model.colorArray.length == 4) {
      for(var i=0;i<numberVertices;i++) {
	colorArray.push.apply(colorArray,[0.5,0.5,0.7,1]);
      }
    }
    if(colorArray.length < model.positionArray.length) {
      alert('Problem with the colors: ' + colorArray.length);
    }
    var colorBuffer = that.pack.createObject('VertexBuffer');
    var colorField = colorBuffer.createField('FloatField', 4);
    colorBuffer.set(colorArray);
    colorArray = [];

    if(that.loading){
      jQuery(that.loading).html("Buffers Loaded");
    }


    streamBank.setVertexStream(
      that.o3d.Stream.POSITION, //  That stream stores vertex positions
      0,                     // First (and only) position stream
      positionsField,        // field: the field that stream uses.
      0);                    // start_index:

    streamBank.setVertexStream(
      that.o3d.Stream.NORMAL,
      0,
      normalField,
      0);


    streamBank.setVertexStream(
      that.o3d.Stream.COLOR,
      0,
      colorField,
      0);

    return hemShape;

  };






  /**
   * Resets the view of the scene by resetting its local matrix to the identity
   * matrix.
   */
  that.resetView = function() {
    that.brainTransform.children[0].visible=true;
    that.brainTransform.children[1].visible=true;
    that.brainTransform.identity();
    that.brainTransform.children[0].identity();
    that.brainTransform.children[1].identity();

  };




  this.setupView = function(e) {
    that.resetView();
    var params=that.getViewParams(); //Must be defined by calling app
    switch(params.view) {
      case 'superior':
	that.superiorView();
	break;
      case 'medial':
	that.medialView();
	break;
      case 'anterior':
	that.anteriorView();
	break;
      case 'inferior':
	that.inferiorView();
	break;
      case 'lateral':
	that.lateralView();
	break;
      case 'posterior':
	that.posteriorView();
	break;
      default:
	that.superiorView();
	break;

    }

    /*
     * Decides if the hemispheres need to be shown
     */
    if(params.left  == true) {
      that.leftHemisphereVisible(true);
    }else {
      that.leftHemisphereVisible(false);
    }
    if(params.right == true ) {
      that.rightHemisphereVisible(true);
    }else {
      that.rightHemisphereVisible(false);
    }
    that.thatRot = that.math.matrix4.mul(that.brainTransform.localMatrix, that.math.matrix4.identity());
  };

  this.leftHemisphereVisible = function(state)  {
    that.brainTransform.children[0].visible = state;
  };

  this.rightHemisphereVisible = function(state)  {
    that.brainTransform.children[1].visible = state;
  };



  /*
   * The following functions handle to preset views of the system.
   */
  this.medialView = function(e) {

    if(that.model_data.num_hemispheres == 2 ) {

      that.brainTransform.children[0].translate([-100,0,0]);
      that.brainTransform.children[1].translate([100,0,0]);
      that.brainTransform.children[0].rotateZ(that.math.degToRad(-90));
      that.brainTransform.children[1].rotateZ(that.math.degToRad(90));
      that.brainTransform.rotateX(that.math.degToRad(-90));
    }
  };

  this.lateralView = function(e) {

    if(that.model_data.num_hemispheres == 2 ) {

      that.brainTransform.children[0].translate([-100,0,0]);
      that.brainTransform.children[1].translate([100,0,0]);
      that.brainTransform.children[0].rotateZ(that.math.degToRad(-90));
      that.brainTransform.children[1].rotateZ(that.math.degToRad(90));
      that.brainTransform.rotateX(that.math.degToRad(90));
      that.brainTransform.rotateY(that.math.degToRad(180));

    }
  };

  this.superiorView = function() {
    //nothing should be already done with reset view, placeholder
  };

  this.inferiorView = function() {
    that.brainTransform.rotateY(that.math.degToRad(180));
  };

  this.anteriorView = function(e) {
    that.resetView();
    that.brainTransform.rotateX(that.math.degToRad(-90));
    that.brainTransform.rotateZ(that.math.degToRad(180));
  };

  this.posteriorView = function(e) {
    that.resetView();
    that.brainTransform.rotateX(that.math.degToRad(-90));
  };


  /*
   * Adds space between the hemispheres
   */
  this.separateHemispheres = function(e) {
    if(that.model_data.num_hemispheres == 2 ) {
      this.brainTransform.children[0].translate([-1,0,0]);
      this.brainTransform.children[1].translate([1,0,0]);
    }
  };


  /*
   * Creates the client area.
   */
  this.setClientSize= function() {

    var newWidth  = parseInt(that.client.width);
    var newHeight = parseInt(that.client.height);

    if (newWidth != that.o3dWidth || newHeight != that.o3dHeight) {

      that.o3dWidth = newWidth;
      that.o3dHeight = newHeight;

      that.updateProjection();

      // Sets a new area size for arcball.
      that.aball.setAreaSize(that.o3dWidth, that.o3dHeight);
    }
  };


  /*
   * The following methods implement the zoom in and out
   */
  that.ZoomInOut = function(zoom) {
    for (var i = 0; i < that.eyeView.length; i += 1) {
      that.eyeView[i] = that.eyeView[i] / zoom;
    }

    that.viewInfo.drawContext.view = that.math.matrix4.lookAt(
      that.eyeView, // eye
      [0, 0, 0],   // target
      [0, 1, 0]);  // up
  };

  /**
   * Using the mouse wheel zoom in and out of the model.
   */
  that.scrollMe = function(e) {
    var zoom = (e.deltaY < 0) ? 1 / that.zoomFactor : that.zoomFactor ;
    that.ZoomInOut(zoom);
    that.client.render();
  };

  function select(pickInfo) {

    unSelectAll();
    if (pickInfo) {

      that.selectedInfo = pickInfo;

    }
  }

  this.updateInfo = function() {
    if (!that.treeInfo) {
      that.treeInfo = o3djs.picking.createPickManager(that.client.root);
    }
    that.treeInfo.update();
  };

  function unSelectAll() {

    if (that.selectedInfo) {


      that.highlightShape = null;
      that.selectedInfo = null;
    }
  }


  /*
   * This method can be used to detect where the user clicked
   * it takes a callback method which will receive the event and
   * and info object containing the following:
   *
   * primitiveIndex: the index of the polygon clicked on the object
   * positionVector: the x,y,z of the click
   * element: the element (whitin the shape) that was clicked
   * hemisphere: the name of the hemisphere clicked right or left or
   *             undefined if not a hemisphere
   *
   *
   *
   */
  this.click = function(e,click_callback) {

    var worldRay = o3djs.picking.clientPositionToWorldRay(
      e.x,
      e.y,
      that.viewInfo.drawContext,
      that.client.width,
      that.client.height);
    unSelectAll();

    // Update the entire tree in case anything moved.
    // NOTE: This function is very SLOW!
    // If you really want to use picking you should manually update only those
    // transforms and shapes that moved, were added, or deleted by writing your
    // own picking library. You should also make sure that you are only
    // considering things that are pickable. By that I mean if you have a scene of
    // a meadow with trees, grass, bushes, and animals and the only thing the user
    // can pick is the animals then put the animals on their own sub branch of the
    // transform graph and only pick against that subgraph.
    // Even better, make a separate transform graph with only cubes on it to
    // represent the animals and use that instead of the actual animals.
    that.treeInfo.update();

    var pickInfo = that.treeInfo.pick(worldRay);
    if (pickInfo) {

      select(pickInfo);
      var primitive_index = pickInfo.rayIntersectionInfo.primitiveIndex;
      var position = pickInfo.rayIntersectionInfo.position;
      var hemisphere      = pickInfo.element.owner.name;
      var vertex_info = that.model_data.get_vertex(primitive_index,position,hemisphere);
      var info = {
	primitive_index: primitive_index,
	position_vector: vertex_info.position_vector,
	element: pickInfo.element,
	hemisphere: hemisphere,
	vertex: vertex_info.vertex
      };
	return click_callback(e,info);
    } else {

      //that.debugLine.setVisible(false);
      jQuery(that.pickInfoElem).html('--nothing--');
    }


  };

  that.startDragging = function(e) {
    if(e.shiftKey && e.ctrlKey && that.model_data.num_hemispheres == 2) {
      that.drag_hemisphere = click(e, function(event,info) {
				     if(info.hemisphere == "left") {
				       return 0;
				     }else if(info.hemisphere == "right") {
				       return 1;
				     }else {
				       return false;
				     }
				   });
    }
    that.lastRot = that.thatRot;
    that.aball.click([e.x, e.y]);
    that.dragging = true;
  };

  that.drag = function(e) {

    if (that.dragging && e.button == that.o3d.Event.BUTTON_LEFT ) {

      var rotationQuat = that.aball.drag([e.x, e.y]);
      var rot_mat = that.quaternions.quaternionToRotation(rotationQuat);
      that.thatRot = that.math.matrix4.mul(that.lastRot, rot_mat);


      if(that.drag_hemisphere === 0 || that.drag_hemisphere === 1) {

	var m = that.brainTransform.children[that.drag_hemisphere].localMatrix;
	that.math.matrix4.setUpper3x3(m, that.thatRot);
	that.brainTransform.children[that.drag_hemisphere].localMatrix = m;

      } else {
	var m = that.brainTransform.localMatrix;
	that.math.matrix4.setUpper3x3(m, that.thatRot);
	that.brainTransform.localMatrix = m;

      }

    }else if(that.dragging) {
      that.stopDragging(e);
    }
  };



  that.stopDragging = function(e) {
    that.drag_hemisphere = false;
    that.dragging = false;
  };






  that.updateCamera = function() {

    var up = [0, 1, 0];
    that.viewInfo.drawContext.view = that.math.matrix4.lookAt(that.camera.eye,
							      that.camera.target,
							      up);
    that.lightPosParam.value = that.camera.eye;
  };

  that.updateProjection = function() {

    // Create a perspective projection matrix.
    that.viewInfo.drawContext.projection = that.math.matrix4.perspective(
      that.math.degToRad(45), that.o3dWidth / that.o3dHeight, that.camera.nearPlane,
      that.camera.farPlane);

  };


  /**
   * Function performing the rotate action in response to a key-press.
   * Rotates the scene based on key pressed. (w ,s, a, d). Note that the x and
   * y-axis referenced here are relative to the current view of the scene.
   * @param {keyPressed} The letter pressed, in lower case.
   * @param {delta} The angle by which the scene should be rotated.
   * @return true if an action was taken.
   */
  that.keyPressedAction = function(keyPressed, delta) {
    var actionTaken = false;
    switch(keyPressed) {
    case '&':
      that.ZoomInOut(that.zoomFactor);
      actionTaken = 'zoom_in';
      break;
    case '(':
      that.ZoomInOut(1/that.zoomFactor);
      actionTaken = 'zoom_out';
      break;

    case ' ':
      that.separateHemispheres();
      actionTaken = 'separate';
      break;
    }

    return actionTaken;
  };

  /**
   * Callback for the keypress event.
   * Invokes the action to be performed for the key pressed.
   * @param {event} keyPress event passed to us by javascript.
   */
   that.keyPressedCallback = function(event) {

   var action_taken = false;
   switch(event.which) {
    case 38:
     that.ZoomInOut(that.zoomFactor);
     action_taken = "ZoomIn";
     break;
    case 40:
     that.ZoomInOut(1/that.zoomFactor);
     action_taken = "ZoomOut";
     break;

    case 32:
     that.separateHemispheres();
     action_taken = "Seperate";
     break;
    };
     if(action_taken){
       return false;
     }else {
       return true;
     }

   };




  /*
   * Sets the fillmode of the brain to wireframe or filled
   */
  that.set_fill_mode_wireframe= function() {
    if(that.model_data.num_hemispheres == 2){

      var brainMaterial = that.brainTransform.children[0].shapes[0].elements[0].material;
      that.state = that.pack.createObject('State');
      brainMaterial.state = that.state;
      that.state.getStateParam('FillMode').value = that.o3d.State.WIREFRAME;

      brainMaterial = that.brainTransform.children[1].shapes[0].elements[0].material;
      that.state = that.pack.createObject('State');
      brainMaterial.state = that.state;
      that.state.getStateParam('FillMode').value = that.o3d.State.WIREFRAME;
    } else {
      var brainMaterial = that.brainTransform.shapes[0].elements[0].material;
      that.state = that.pack.createObject('State');
      brainMaterial.state = that.state;
      that.state.getStateParam('FillMode').value = that.o3d.State.WIREFRAME;
    }

  };

  that.set_fill_mode_solid = function() {
    if(that.model_data.num_hemispheres == 2){

      var brainMaterial = that.brainTransform.children[0].shapes[0].elements[0].material;
      that.state = that.pack.createObject('State');
      brainMaterial.state = that.state;
      that.state.getStateParam('FillMode').value = that.o3d.State.SOLID;

      brainMaterial = that.brainTransform.children[1].shapes[0].elements[0].material;
      that.state = that.pack.createObject('State');
      brainMaterial.state = that.state;
      that.state.getStateParam('FillMode').value = that.o3d.State.SOLID;
    } else {
      var brainMaterial = that.brainTransform.shapes[0].elements[0].material;
      that.state = that.pack.createObject('State');
      brainMaterial.state = that.state;
      that.state.getStateParam('FillMode').value = that.o3d.State.SOLID;
    }

  };

  that.loadObjFromUrl = function(url) {
    jQuery.ajax({ type: 'GET',
      url: url ,
      dataType: 'text',
      success: function(data) {
	that.createBrain(new MNIObject(data));
      },
      error: function(request,textStatus,e) {
	alert("Failure in loadObjFromUrl: " +  textStatus);
      },
      data: {},
      async: true,
      timeout: 100000
    });
  };


  that.loadObjFromFile = function(file_input) {
    var reader = new FileReader();
    var files = file_input.files;
    reader.file = files[0];

    reader.onloadend = function(e) {
      that.createBrain(new MNIObject(e.target.result));
    };

    reader.readAsText(files[0]);

  };

  that.loadSpectrumFromUrl  = function(url) {
    //get the spectrum of colors
    jQuery.ajax({
		  type: 'GET',
		  url: url,
		  dataType: 'text',
		  success: function (data) {
		    var spectrum = new Spectrum(data);
		    that.spectrum = spectrum;


		    if(that.afterLoadSpectrum != null) {
		      that.afterLoadSpectrum(spectrum);
		    }

		    if(that.data) {
		      that.updateColors(that.data,that.rangeMin, that.rangeMax,that.spectrum);
		    }

		  }
		});

  };


  that.loadSpectrumFromFile = function(file_input){
    var reader = new FileReader();
    var files = file_input.files;
    reader.file = files[0];

    reader.onloadend = function(e) {
      that.spectrum = new Spectrum(e.target.result);
      if(that.data) {
	that.updateColors(that.data,that.rangeMin, that.rangeMax,that.spectrum);
      }
      if(that.afterLoadSpectrum != null) {
	that.afterLoadSpectrum(that.spectrum);
      }
    };
    reader.readAsText(files[0]);
  };

  that.loadDataFromFile = function(file_input) {
    var reader = new FileReader();
    var files = file_input.files;
    reader.file = files[0];

    reader.onloadend = function(e) {
      that.data = new MNIData(e.target.result);
      if(that.fixRange == false || that.fixRange == null) {
	that.rangeMin = that.data.min;
	that.rangeMax = that.data.max;
	if(that.afterLoadData !=null) {
	  that.afterLoadData(that.rangeMin,that.rangeMax,that.data);
	}
      }


      that.updateColors(that.data,that.rangeMin, that.rangeMax,that.spectrum);
    };
    reader.readAsText(files[0]);
  };

  /*
   * This updates the colors of the brain model
   */
  that.updateColors = function(data,min,max,spectrum) {
    if(that.data == null) {
      return 0;
    }


    var color_array = data.createColorArray(min,max,spectrum);
    if(that.model_data.num_hemispheres == 1) {
      var color_buffer = that.pack.createObject('VertexBuffer');
      var color_field = color_buffer.createField('FloatField', 4);
      color_buffer.set(color_array);
      var brain_shape = that.brainTransform.shapes[0];
      var stream_bank = brain_shape.elements[0].streamBank;
      stream_bank.setVertexStream(
	that.o3d.Stream.COLOR, //  This stream stores vertex positions
	0,                     // First (and only) position stream
	color_field,        // field: the field this stream uses.
	0);                    // start_index:


    } else {
      var left_color_array = color_array.slice(0, color_array.length/2);
      var right_color_array = color_array.slice(color_array.length/2, color_array.length);

      var left_color_buffer = that.pack.createObject('VertexBuffer');
      var left_color_field = left_color_buffer.createField('FloatField', 4);
      left_color_buffer.set(left_color_array);
      var left_brain_shape = that.brainTransform.children[0].shapes[0];
      var left_stream_bank = left_brain_shape.elements[0].streamBank;
      left_stream_bank.setVertexStream(
	that.o3d.Stream.COLOR, //  This stream stores vertex positions
	0,                     // First (and only) position stream
	left_color_field,        // field: the field this stream uses.
	0);                    // start_index:



      var right_color_buffer = that.pack.createObject('VertexBuffer');
      var right_color_field = right_color_buffer.createField('FloatField', 4);
      right_color_buffer.set(right_color_array);
      var right_brain_shape = that.brainTransform.children[1].shapes[0];
      var right_stream_bank = right_brain_shape.elements[0].streamBank;
      right_stream_bank.setVertexStream(
	that.o3d.Stream.COLOR, //  This stream stores vertex positions
	0,                     // First (and only) position stream
	right_color_field,        // field: the field this stream uses.
	0);                    // start_index:
	that.client.render();
    };
    if(that.afterUpdateColors !=null ) {
      that.afterUpdateColors(data,min,max,spectrum);
    }

    return 1;
  };


  that.rangeChange = function(min,max) {
    that.rangeMin = min;
    that.rangeMax = max;

    that.updateColors(that.data,that.rangeMin, that.rangeMax, that.spectrum);

    /*
     * This callback allows users to
     * do things like update ui elemets
     * when brainbrowser change it internally
     *
     */

    if(that.afterRangeChange != null) {
      that.afterRangeChange(min,max);
    }


  };

  that.init();


}function SurfView() {
  var brainbrowser = new BrainBrowser();
  brainbrowser.getViewParams = function() {
    return {
      view: jQuery('[name=hem_view]:checked').val(),
      left: jQuery('#left_hem_visible').attr("checked"),
      right: jQuery('#right_hem_visible').attr("checked")
    };

  };
  brainbrowser.afterInit = function(bb) {

    //Add event handlers
    jQuery("body").keydown(bb.keyPressedCallback);

    o3djs.event.addEventListener(bb.o3dElement, 'mousedown', function (e) {
	bb.startDragging(e);
    });

    o3djs.event.addEventListener(bb.o3dElement, 'mousemove', function (e) {
      bb.drag(e);
    });

    o3djs.event.addEventListener(bb.o3dElement, 'mouseup', function (e) {
      if(!e.shiftKey || e.button == bb.o3d.Event.BUTTON_RIGHT){
	bb.stopDragging(e);
      }
    });

    jQuery("#objfile").change(function() {
      bb.loadObjFromFile(document.getElementById("objfile"));
    });

    jQuery("#datafile").change(function() {
    bb.loadDataFromFile(document.getElementById("datafile"));
    });


    /********************************************************
     * This section implements the range change events
     * It takes care of updating the UI elements related to
     * the threshold range
     * It also defines the BrainBrowser::afterRangeChange
     * callback which is called in the BrainBrowser::rangeChange
     * Method.
     ********************************************************/

     //Create a range slider for the thresholds
    jQuery("#range-slider").slider({
      range: true,
      min: -50,
      max: 50,
      value: [-10, 10],
      slide: function(event, ui) {
	var min = parseFloat(ui.values[0]);
	var max = parseFloat(ui.values[1]);
	bb.rangeChange(min,max);
      },
      step: 0.1
    });

    bb.afterRangeChange = function(min,max) {
      jQuery("#data-range-min").val(min);
      jQuery("#data-range-max").val(max);
    };

    bb.afterLoadData = function(min,max,data) {
      bb.afterRangeChange(min,max);
      jQuery("#range-slider").slider('values', 0, parseFloat(min));
      jQuery("#range-slider").slider('values', 1, parseFloat(max));
    };

    jQuery("#fix_range").click(function(event,ui) {

      bb.fixRange= jQuery("#fix_range").attr("checked");
	alert("fixRange " + bb.fixRange);
    });

    jQuery(".range-box").keypress(function(e) {
      if(e.keyCode == '13'){
	bb.rangeChange(parseFloat(jQuery("#data-range-min").val()),parseFloat(jQuery("#data-range-max").val()));
      }
    });

    jQuery("#data-range-min").change(function(e) {
      jQuery("#range-slider").slider('values', 0, parseFloat(jQuery(this).val()));
    });

    jQuery("#data-range-max").change(function(e) {
      jQuery("#range-slider").slider('values', 1, parseFloat(jQuery(this).val()));
    });

  };

};
$(function() {
    jQuery(".button").button();
    var surfview = new SurfView();
  }
);