var        async = require('async'),
            conf = require('../helpers/confHelper'),
          Flickr = require("flickrapi"), 
            path = require('path'),
     tokenHelper = require('../helpers/tokenHelper');

var uploadOptions = {
  photos: [{
    title: "Photo 1",
    tags: "tag1 tag2 \'tag three\'",
    photo: path.join(conf.photos.path, "a3.jpg"),
    is_public:0, 
    is_friend: 1, 
    is_family: 1 
  },
  {
    title: "Photo 2",
    tags: "tag2 tag3 ",
    photo: path.join(conf.photos.path, "a3.jpg"),
    is_public:0, 
    is_friend: 1, 
    is_family: 1 
  }]
};

var _Flickr = null;
async.waterfall([
  function(next) {
    tokenHelper.init(next);
  },
  function(token, next) {
    Flickr.authenticate(token, next);
  },
  function(flickr, next) {
    _Flickr = flickr;
    Flickr.upload(uploadOptions, token, next);
  },
  function(resultIds, next) {
    console.log('resultIds: '+resultIds);
    _Flickr.photosets.create({'title': 'Isabelle LANG 3', 'primary_photo_id': resultIds[0]}, function(error, photosets) {
      next(error, photosets.photoset, resultIds);
    });
  },
  function(photoset, resultIds, next) {
    console.log('photoset: '+photoset);
    console.log('resultIds: '+resultIds);
    _Flickr.photosets.addPhoto({'photoset_id': photoset.id, 'photo_id': resultIds[1]}, function(error, result) {
      next(error, result);
    });
  }
], function(error, result) {
  if (error) {
    return console.log(error);
  }
  console.log(result);
  console.log("end good job");
});
