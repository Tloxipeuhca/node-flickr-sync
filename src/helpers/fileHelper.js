var    _ = require('lodash'),
    conf = require('./confHelper'),
      fs = require('fs'),
    path = require('path'),
 winston = require('winston');

module.exports.getFiles = function(dirPath) {
  var files = [];
  var datas = fs.readdirSync(dirPath);
  _.each(datas, function(file) {
    if (fs.statSync(path.join(dirPath, file)).isFile())
      files.push(path.join(dirPath, file));
  });
  return files;
}

module.exports.getDirectories = function(dirPath) {
  var directories = [];
  var files = fs.readdirSync(dirPath);
  _.each(files, function(file) {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      directories.push(path.join(dirPath, file));
    }
  });
  return directories;
}

module.exports.getPhotosRecursively = function(dirPath, done) {
  var photos = [];
  var files = walk(dirPath, function(error, files) { 
    if (error) {
      return done(error);
    }
    _.each(files, function(file) {
      if (_.contains(conf.photos.extensions, path.extname(file).toLowerCase())) {
        photos.push(file);
      }
    });
    return done(null, photos);
  });
};

var walk = module.exports.walk = function(dirPath, done) {
  var results = [];
  fs.readdir(dirPath, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.join(dirPath, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

module.exports.getFileInfos = function(dirPath, filePath) {
  var directories = filePath
                      .replace(path.join(dirPath, '..')+path.sep, '')
                      .replace(path.sep+path.basename(filePath), '')
                      .split(path.sep);
  var tags = [];
  _.each(directories, function(directory) {
    tags.push(formatArray(directory.split(' - ')));
  });

  var specificConf = getRecursivelyConf(dirPath, filePath);
  if (conf.photos.tags) {
    tags.push(conf.photos.tags);
  }
  if (specificConf.tags) {
    tags.push(specificConf.tags);
  }
  tags = _.flatten(tags);

  var dirName = tags.length > 0 ? tags[0] : '.'+path.sep;
  var relativePath = path.join(filePath, '..').replace(dirPath, '.');
  var description = {"dirName": dirName, "relativePath": relativePath, "separator": path.sep};
  return {
    _description: description,
    _tags: tags,
    path: filePath,
    relativePath: relativePath,
    fileName: path.basename(filePath),
    fileNameWithoutExt: path.basename(filePath, path.extname(filePath)),
    dirName: dirName,
    description: JSON.stringify(description),
    tags: formatTags(_.clone(tags)),
    isPublic: specificConf.hasOwnProperty("isPublic") ? specificConf.isPublic : conf.photos.isPublic, 
    isFriend: specificConf.hasOwnProperty("isFriend") ? specificConf.isFriend : conf.photos.isFriend, 
    isFamily: specificConf.hasOwnProperty("isFamily") ? specificConf.isFamily : conf.photos.isFamily 
  };
};

var getRecursivelyConf = module.exports.getRecursivelyConf = function(dirPath, filePath) {
  var currentPath = path.resolve(filePath, '..').toLowerCase();
  var loop = true;
  while(loop) {
    var confPath = path.resolve(currentPath, '.sync', 'flickr.json');
    if (fs.existsSync(confPath)) {
      try {
        return require(confPath);
      }
      catch(e) {
        winston.error('Can\'t load conf file '+confPath, e.toString());
      }
    }
    loop = dirPath.toLowerCase() !== currentPath;
    currentPath = path.resolve(currentPath, '..').toLowerCase();
  }
  return {};
};

/*module.exports.applyDirectoriesExclusionRules = function(directories) {

};*/


module.exports.applyExclusionRules = function(directories) {
  var directoriesByRules = [], 
      forceExcludedDirectoriesLowerCase = [],
      forceIncludedDirectoriesLowerCase = [],
      rules = conf.photos.excluded;

  _.each(rules.forceExcludedDirectories, function(dirName) {
    forceExcludedDirectoriesLowerCase.push(dirName.toLowerCase());
  });

  _.each(rules.forceIncludedDirectories, function(dirName) {
    forceIncludedDirectoriesLowerCase.push(dirName.toLowerCase());
  });

  _.each(directories, function(directory) {
    var directoryName = path.basename(directory).toLowerCase();

    if (_.contains(forceExcludedDirectoriesLowerCase, directoryName))
      return;
    if (_.contains(forceIncludedDirectoriesLowerCase, directoryName))
      return directoriesByRules.push(directory);
    if (rules.forceToUseOnlyIncludedDirectories)
      return;

    if (rules.before && rules.after) {
      if (directoryName >= rules.before && directoryName <= rules.after) {
        directoriesByRules.push(directory);
      }
    } 
    else if (rules.before) {
      if (directoryName >= rules.before) {
        directoriesByRules.push(directory);
      }
    }
    else if (rules.after) {
      if (directoryName <= rules.after) {
        directoriesByRules.push(directory);
      }
    }
    else {
      directoriesByRules.push(directory);
    }
  });
  return directoriesByRules.sort();
};

function formatArray(datas) {
  var outputDatas = [];
  _.each(datas, function(data) {
    outputDatas.push(trim(data));
  });
  return outputDatas;
}

function trim(myString) {
  return myString.replace(/^\s+/g,'').replace(/\s+$/g,'')
} 

function formatTags(tags) {
  for (var i=0; i<tags.length; i++) {
    tags[i] = '"'+tags[i]+'"';
  }
  return tags;
}