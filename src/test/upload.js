var        async = require('async'),
            conf = require('../helpers/confHelper'),
          Flickr = require("flickrapi"), 
            path = require('path'),
     tokenHelper = require('../helpers/tokenHelper');

var uploadOptions = {
  photos: [{
    title: "Photo 1",
    tags: "tag1 tag2 \"tag 3\"",
    photo: path.join(conf.photos.path, "a3.jpg"),
    is_public:0, 
    is_friend: 1, 
    is_family: 1 
  }]
};

async.waterfall([
  function(next) {
    tokenHelper.init(next);
  },
  function(token, next) {
    Flickr.authenticate(token, next);
  },
  function(flickr, next) {
    console.log("Upload photo", JSON.stringify(uploadOptions.photos));
    Flickr.upload(uploadOptions, token, next);
  }
], function(error, result) {
  if (error) {
    return console.log(error);
  }
  console.log(result);
  console.log("end good job");
});