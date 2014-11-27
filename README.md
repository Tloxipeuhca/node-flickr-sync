# node-flickr-sync

A node.js app to sync local photos with flickr.
You can check the result on [my flickr](https://www.flickr.com/photos/129434165@N03).

## Features

  1. If you haven't a token, you will be asked to create it ;
  2. You can abort and restart the sync, the app bypass the uploaded photos ;
  3. Your localy folder name would be an album on flickr ;
  4. All your folders or subfolders name would be a collection of tags on flickr ; 
  5. Each folder name would be split by the char '-' to get a collection of tags ;
  6. You can configure the access rules to your photos ;
  7. You can exclude directories to sync ;
  8. A default conf to try the app, you will upload the current photos (from directory ./photos) to your flick ;
  9. Continue upload process after an upload error occur ;
  10. Add an application launcher for windows, double click on the sync.bat; 
  11. Update photo permissions if config file change ;
  12. Update photo tags if needed (creating or updating subfolders).

## Donation

Do you appreciate this application we provide ?
If you do, why not support us by donating a small amount via Paypal.

[![Donate](https://cms.paypal.com/en_US/i/logo/paypal_logo.gif)](https://www.googledrive.com/host/0B0SxcWkfE1JrTHEycWYzXzNtNGs)

## Installation

### First step 

Install [NodeJS](http://nodejs.org/download) on your operating system. Go to [NodeJS](http://nodejs.org) project home page and download the installer. 

### Last step

  * Download latest source ;
  * Update conf.json file to use your preferences ;
  * Start the sync.

```javascript
node src/sync.js
```

## Useful options for scripting

  * Start sync using one argument. This argument is a path to a json config file. You will overload the default photos configuration ; 

```javascript
node src/sync.js argConf.json
```

  * Start sync using an second argument. This argument is a path to a json token file. You can use an existing token from an other path.

```javascript
node src/sync.js argConf.json argToken.json
```

## Configuration

  * photos.path: the path to photos directory ;
  * photos.extensions: the files which you can upload to flickr ;
  * photos.isPublic: boolean to set the photo permission to public ;
  * photos.isFriend: boolean to set the photo permission to friend ;
  * photos.isFamily: boolean to set the photo permission to family ;
  * photos.parallelUpdatePerms: number of photos who are parallely updated ;
  * photos.parallelUploadDirectories: number of directories who are parallely uploaded ;
  * photos.parallelUploadPhotos: number of photos who are parallely uploaded (from the same directory) ;
  * photos.excluded.after: string to exclude all directories who the directory name is after this param (alphabetically) ;
  * photos.excluded.before: string to exclude all directories who the directory name is before this param (alphabetically) ; 
  * photos.excluded.forceExcludedDirectories: array of excluded directories ;
  * photos.excluded.forceIncludedDirectories: array of included directories ;
  * photos.excluded.forceToUseOnlyIncludedDirectories: boolean to only use the included directories.  