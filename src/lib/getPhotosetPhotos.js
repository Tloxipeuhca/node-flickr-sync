var                _ = require('lodash'),
               async = require('async'),     
             winston = require('winston');

module.exports = function(flickrApi, photosetId, callback) {
  //winston.info("Get photoset " + photosetId + " photos");
  flickrApi.photosets.getPhotos({"photoset_id": photosetId}, function(error, firstResults) {
    if (error) {
      return callback(error);
    }
    if (firstResults.photoset.total <= 500) {
      return callback(null, firstResults.photoset.photo); 
    }

    //winston.info("Get photoset photos using parallel method");
    var taskIndexes = [];
    var tasks = [];

    for (var i=2; i<=firstResults.photoset.pages;i++) {
      taskIndexes[i-2] = i;
    }

    _.each(taskIndexes, function(index) {  
      tasks.push(
        function(parallelCallback) {
          flickrApi.photosets.getPhotos({"photoset_id": photosetId, "page": index}, function(error, results) {
            if (error) {
              return parallelCallback(error);
            }
            return parallelCallback(null, results.photoset.photo);
          });
        }
      );
    });
    async.parallel(tasks, function(error, results) {
      if (error) {
        return callback(error);
      }
      results.push(firstResults.photoset.photo);
      return callback(null, _.flatten(results));
    });     
  });
};