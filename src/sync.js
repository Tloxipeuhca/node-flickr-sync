var             _ = require('lodash'),
         appToken = require('../app.json'),
            async = require('async'),
             conf = require('./helpers/confHelper'),
       fileHelper = require('./helpers/fileHelper'),
           Flickr = require("flickrapi"), 
               fs = require('fs'),
         getToken = require('./lib/getToken'),
             path = require('path'),
  uploadDirectory = require('./lib/uploadDirectory'),
          winston = require('winston');

// How to execute
// arguments
//   optional argv2, argv3, argv4
//   argv2 path to photos conf json file
//   argv3 path to token json file
// scripts
//   node src/sync.js
//   node src/sync.js argConf.json
//   node src/sync.js argConf.json argToken.json

// Init winston for log
if (conf.winston) {
  winston.remove(winston.transports.Console);
  if (conf.winston.console) {
    winston.add(winston.transports.Console, conf.winston.console);
  }
  if (conf.winston.file) {
    winston.add(winston.transports.File, conf.winston.file);
  }
}     

var _Flickr = null;
async.waterfall([
  function(next) {
    // load token
    var token = require('./helpers/tokenHelper');
    if(token) {
      return next(null, token);
    }
    else {
      getToken(appToken, "delete", process.argv[3] || './token.json', function(error, token, tokenPath) {
        if (error) {
          return next(error);
        }
        delete require.cache[require.resolve('./helpers/tokenHelper')];
        return next(null, token);
      });
    }
  },
  function(token, next) {
    // Get flickrToken
    Flickr.authenticate(token, function(error, flickr) {
      next(error, flickr, token);
    });
  },
  function(flickr, token, next) {
    // Get all photosets
    _Flickr = flickr;
    _Flickr.photosets.getList({"user_id": token.user_id, "perpage": 100000}, function(error, result) {
      if (error) {
        return next(error);
      }
      next(null, result.photosets);
    })
  },
  function(photosets, next) {
    // Get directories to sync
    winston.debug('Photosets', JSON.stringify(photosets));
    winston.debug('Directory path to sync', conf.photos.path);
    if (!fs.existsSync(conf.photos.path)) {
      return next('Dircectory paht to sync doesn\'t exist: '+conf.photos.path)
    }
    var directories = fileHelper.getDirectories(conf.photos.path);
    // Function to exclude directories to sync
    directories = fileHelper.applyExclusionRules(directories);
    winston.debug(directories.length + ' directories to sync', JSON.stringify(directories));
    var tasks = [];
    _.each(directories, function(directory, parallelCallback) {
      tasks.push(
        function(parallelCallback) {
          uploadDirectory(_Flickr, directory, photosets, parallelCallback);
        }
      );
    });
    async.parallelLimit(tasks, conf.photos.parallelUploadDirectories, next); 
  }
], function(error, result) {
  if (error) {
    return winston.error(error.toString());
  }
  winston.info("Good job");
});

function requireUncached(module){
  delete require.cache[require.resolve(module)]
  return require(module)
}

/**
 * Removes a module from the cache
 */
require.uncache = function (moduleName) {
    // Run over the cache looking for the files
    // loaded by the specified module name
    require.searchCache(moduleName, function (mod) {
        delete require.cache[mod.id];
    });

    // Remove cached paths to the module.
    // Thanks to @bentael for pointing this out.
    Object.keys(module.constructor._pathCache).forEach(function(cacheKey) {
        if (cacheKey.indexOf(moduleName)>0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
};

/**
 * Runs over the cache to search for all the cached
 * files
 */
require.searchCache = function (moduleName, callback) {
    // Resolve the module identified by the specified name
    var mod = require.resolve(moduleName);

    // Check if the module has been resolved and found within
    // the cache
    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        // Recursively go over the results
        (function run(mod) {
            // Go over each of the module's children and
            // run over it
            mod.children.forEach(function (child) {
                run(child);
            });

            // Call the specified callback providing the
            // found module
            callback(mod);
        })(mod);
    }
};