# node-flickr-sync

A node.js app to sync local photos with flickr.

## Donation

Do you appreciate this application to sync photos to flickr we provide ?
If you do, why not support us by donating a small amount via Paypal.

[![Donate](https://cms.paypal.com/en_US/i/logo/paypal_logo.gif)](https://www.googledrive.com/host/0B0SxcWkfE1JrTHEycWYzXzNtNGs)

## Features

  1 If you haven't a token, you will be asked to create it ;
  2 You can abort and restart the sync, the app bypass the uploaded photos ;
  3 Your localy folder name would be an album on flickr ;
  4 All your folders or subfolders name would be a collection of tags on flickr ; 
  5 Each folder name would be split by the char '-' to get a collection of tags.

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

