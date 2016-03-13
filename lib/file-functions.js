var fs = require('fs')
  , path = require('path')
  , _ = require('lodash')
;

function onlyOptions(opts, allowed) {
  if (!_.isArray(allowed)) return opts;

  Object.keys(opts).forEach(function(opt) {
    if (allowed.indexOf(opt) === -1)
      throw new Error("Unknown option '"+opt+"'");
  });

  return opts;
}

function wantOptions(opts, allowed) {
  return onlyOptions(_.isObject(opts) ? opts : {}, allowed);
}


/** Test if a given file path exists */
function fileExists(name) {
  try {
    if (fs.statSync(name))
      return true;
  } catch (e) {
    // continue
  }

  return false;
}
module.exports.fileExists = fileExists;


/** Tests if a given path is a regular file */
function isFile(name) {
  try {
    return fs.statSync(name).isFile();
  } catch (e) {
    // continue
  }

  return false;
}
module.exports.isFile = isFile;


/** Tests if a given path is a directory */
function isDir(name) {
  try {
    return fs.statSync(name).isDirectory();
  } catch (e) {
    // continue
  }

  return false;
}
module.exports.isDir = isDir;


/** Read the entire contents of a file */
function readFile(name) {
  return fs.readFileSync(name, {encoding: 'utf8'});
}
module.exports.readFile = readFile;


/** Write the entire contents of a file */
function writeFile(name, content) {
  fs.writeFileSync(name, content);
}
module.exports.writeFile = writeFile;


/** List the contents of a directory */
function listDir(name, options) {
  options = wantOptions(options, ['all']);

  return fs.readdirSync(name).filter(function(entry) {
    return options.all || (! /^\./.test(entry));
  });
}
module.exports.listDir = listDir;
