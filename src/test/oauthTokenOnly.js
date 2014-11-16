var Flickr = require("flickrapi");
    
var flickrOptions = {
  api_key: "9c9515c8996226d490da361705fe50ad",
  secret: "87e765b550d062d0"
};

Flickr.tokenOnly(flickrOptions, function(error, flickr) {
  console.log(flickr.options);
});