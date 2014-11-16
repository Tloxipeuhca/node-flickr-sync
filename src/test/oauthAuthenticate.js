var      _ = require('lodash'),
    Flickr = require("flickrapi"),
        fs = require('fs');

var flickrOptions = {
  api_key: "9c9515c8996226d490da361705fe50ad",
  secret: "87e765b550d062d0",
  permissions: "delete"
};

//permissions: "read" will give the app read-only access (default)
//permissions: "write" will give it read + write access
//permissions: "delete" will give it read, write and delete access

Flickr.authenticate(flickrOptions, function(error, flickr) {
  console.log(flickr.options)
});