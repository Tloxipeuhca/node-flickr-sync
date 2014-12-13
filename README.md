# node-flickr-sync

A node.js app to sync local photos with flickr.
You can check the result on [my flickr](https://www.flickr.com/photos/129434165@N03).

## Features

  1. Create token if needed ;
  2. Start, stop, restart the sync ;
  3. Your localy folder name would be an album on flickr ;
  4. All your folders or subfolders name would be a collection of tags on flickr ; 
  5. Each folder name would be split by the char '-' to get a collection of tags ;
  6. You can configure the access rules to your photos ;
  7. You can exclude directories to sync ;
  8. A default conf to try the app, you will upload the attached photos (directory ./photos) to your flick ;
  9. Continue upload process after an upload error occur ;
  10. Add an application launcher for windows, double click on the sync.bat; 
  11. Update photo permissions if config file change ;
  12. Update photo tags if needed (creating or updating subfolders) ;
  13. Update photo description if needed ;
  14. Remove duplicated photos from same photoset ;
  15. Each photo who is duplicate is copied in an album named "DuplicatedTrash" ; 
  16. You can add to each folder a specific conf to manage permissions and tags. Add a directory '.sync' and put inside a conf file named 'flickr.json' ;
  17. New function to remove a photoset, all photos are linked to the trash photoset ;
  18. New function to delete each photos inside a trash photoset ;
  19. Download non-existing flickr photos stored in photoset, create locally folders and sub-folders to store it ;
  20. Download non-existing flickr photoset photos, create folders and sub-folders to store it.

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

### Scope: all project

  * photos.path: the path to photos directory ;
  * photos.extensions: the files which you can upload to flickr ;
  * photos.isPublic: boolean to set the photo permission to public ;
  * photos.isFriend: boolean to set the photo permission to friend ;
  * photos.isFamily: boolean to set the photo permission to family ;
  * photos.mode: 
    * download : download flickr photos to local file system ;
    * mirror : upload local photos to flickr and remove flickr photos who arne't local ;
    * sync : download and upload photos ;
    * upload : upload local photos to flickr ;
  * photos.parallelUpdateInfos: number of photos who are parallely updated ;
  * photos.parallelUpdatePerms: number of photos who are parallely updated ;
  * photos.parallelUploadDirectories: number of directories who are parallely uploaded ;
  * photos.parallelUploadPhotos: number of photos who are parallely uploaded (from the same directory) ;
  * photos.excluded.after: string to exclude all directories who the directory name is after this param (alphabetically) ;
  * photos.excluded.before: string to exclude all directories who the directory name is before this param (alphabetically) ; 
  * photos.excluded.forceExcludedDirectories: array of excluded directories ;
  * photos.excluded.forceIncludedDirectories: array of included directories ;
  * photos.excluded.forceToUseOnlyIncludedDirectories: boolean to only use the included directories ;
  * photos.remove duplicated : boolean to remove duplicated photos from same photoset ;
  * photos.tags : array of string with all tags to add to each photo in folder and subolders ;
  * photos.trash : array of trash objects. Each object has two parameters 'type' and 'name' ;
  * photos.updateTags: boolean to update tags.

### Scope: current folder

  * isPublic: boolean to set the photo permission to public ;
  * isFriend: boolean to set the photo permission to friend ;
  * isFamily: boolean to set the photo permission to family ;
  * tags: array of string with all tags to add to each photo in folder and subolders.