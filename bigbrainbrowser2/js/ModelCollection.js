/*
  Author: Jonathan Lurie (https://github.com/jonathanlurie)
  Project: BrainBrowser https://github.com/aces/brainbrowser
  Date: September 2016
  Institution: MCIN - Neuro - McGill University
  Licence: MIT

  ModelCollection handles the loading of model files.
  It's a collection because we can load multiple models.
*/
var ModelCollection = function(BrainBrowserViewer){

  this.extensions = [
    {
      ext: ".json",
      type: "json"
    },
    {
      ext: ".obj",
      type: "mniobj"
    },
    {
      ext: ".asc",
      type: "freesurferasc"
    }
  ];
  // we also have wavefrontobj and unknown

  this.viewer = BrainBrowserViewer;

  // callback on the open button
  this.openButton = document.getElementById("modelOpener");
  this.openButton.addEventListener('change', this.newModelToLoad.bind(this), false);
}


/*
  Load a new model file and display it in the viewer (if compatible)
*/
ModelCollection.prototype.newModelToLoad = function(evt){
  var that = this;

  var file = evt.target.files[0];
  console.log(file.name);
  var type = this.getFileType(file.name);
  console.log(type + " file loading...");

  // The type is known
  if(type){
    document.getElementById("modelFormatSelector").value = type;

    this.viewer.loadModelFromFile(evt.target, {
      format: type,
      complete: function(){

        console.log("loading done");
      }
    });
  }else{
    document.getElementById("modelFormatSelector").value = "unknown";
  }

}




/*
  Load a new model file and display it in the viewer (if compatible)
  from a URL
*/
ModelCollection.prototype.newModelToLoadURL = function(url){
  var that = this;
  var type = this.getFileType(url);
  console.log(type + " file loading...");

  // The type is known
  if(type){
    document.getElementById("modelFormatSelector").value = type;

      this.viewer.loadModelFromURL(url, {
        format: type,
        complete: function(){
          console.log("loading done");
        }
      });
  }else{
    document.getElementById("modelFormatSelector").value = "unknown";
  }

}



/*
  given the file basename, returns the type
*/
ModelCollection.prototype.getFileType = function(basename){
  var type = null;

  this.extensions.forEach(function(elem){
    if(basename.indexOf(elem.ext) != -1 ){
      type = elem.type;
    }
  });

  return type;
}
