#!/usr/bin/env node --harmony
/**
 * Created by stephen on 20/01/2017.
 */
var fs = require('fs');
var program = require('commander');
var util = require('util');
var zip = require('zip-local');
var path = require('path');
var chalk = require('chalk');

var info = true;
var debug = false;
var zipFile, defFile, confFile;

program
  .version('1.0.2')
  .arguments('<zipFile>')
  .option('-d, --debug', 'Debug level output')
  .option('-i, --info', 'Suppress info level output')
  .action(function (zipFile)
  {
    debug = !!program.debug;
    info = !program.info;

    var zipFileName = zipFile.endsWith('.zip') ? zipFile : zipFile + '.zip';

    if (!fs.existsSync(zipFileName))
    {
      console.log('File %s not found', zipFileName);
      process.exit(1);
    }

    logger('INFO', 'Validating zip: ' + zipFileName);
    validate(zipFileName);
  })
  .parse(process.argv);

if (typeof zipFile === 'undefined')
{
  console.log('No zip filename provided.');
  process.exit(1);
}

function validate(zipFileName)
{
  var dirName = './' + zipFileName.replace('.zip', '');
  logger('INFO', 'Reading file ' + zipFileName);
  if (!fs.existsSync(dirName))
  {
    fs.mkdirSync(dirName);
  }
  zip.sync.unzip(zipFileName).save(dirName);
  logger('INFO', 'File unzipped to ' + dirName);

  // validations
  validateDirStructure(dirName);

  process.exit(0);
}


/**
 *
 * @param arch
 */
function validateDirStructure(arch)
{
  var files = [];
  var found = {};
  var lambotName;

  logger('INFO', 'Validating directory structure for ' + arch);
  if (!fs.existsSync(arch + '/integration'))
  {
    logger('ERROR', 'No integration directory');
  } else
  {
    if (fs.existsSync(arch + '/integration/documentation'))
    {
      files = fs.readdirSync(arch + '/integration/documentation');
      files.forEach(function (file)
      {
        if (file.endsWith('.html'))
        {
          found.html = true;
          logger('INFO', '.html documentation file found ' + file);
        }
      });
    } else
    {
      logger('WARN', 'No documentation directory');
    }
    files = fs.readdirSync(arch + '/integration');
    files.forEach(function (file)
    {
      if (file.endsWith('.def'))
      {
        found.def = true;
        found.defFileName = file;
        logger('INFO', '.def file found ' + file);
        defFile = validateJSONfile(arch + '/integration/' + file);
      }
      if (file.endsWith('64.png'))
      {
        found.png64 = true;
        logger('INFO', '64.png file found ' + file);
      }
      if (file.endsWith('32.png'))
      {
        found.png32 = true;
        logger('INFO', '32.png file found ' + file);
      }
    });
    files = fs.readdirSync(arch + '/lam');
    files.forEach(function (file)
    {
      if (file.endsWith('.conf'))
      {
        found.conf = true;
        found.confFileName = file;
        logger('INFO', '.conf file found ' + file);
        confFile = validateJSONfile(arch + '/lam/' + file);
      }
      if (file.endsWith('_lam'))
      {
        found.lam = true;
        found.lamFileName = file;
        logger('INFO', '_lam file found ' + file);
      }
      if (file.endsWith('lamd'))
      {
        found.lamd = true;
        found.lamdFileName = file;
        logger('INFO', 'lamd file found ' + file);
      }
    });
    files = fs.readdirSync(arch + '/lambots');
    files.forEach(function (file)
    {
      if (file.endsWith('.js'))
      {
        found.lambot = true;
        found.lambotFileName = file;
        logger('INFO', 'lambot .js file found ' + file);
      }
    });
    if (!found.html)
    {
      logger('WARN', 'No document .html file found.');
    }
    if (!found.def)
    {
      logger('ERROR', 'No integration .def file found.');
    }
    if (!found.png32)
    {
      logger('WARN', 'No integration 32x32 png icon file found.');
    }
    if (!found.png64)
    {
      logger('WARN', 'No integration 64x64 png icon file found.');
    }
    if (!found.conf)
    {
      logger('WARN', 'No lam .conf file found.');
    }
    if (!found.lamd)
    {
      logger('WARN', 'No lam init.d service file found.');
    }
    if (!found.lam)
    {
      logger('ERROR', 'No lam executable file found.');
    }
    if (!found.lambot)
    {
      logger('ERROR', 'No lambot .js file found.');
    }
    if (defFile)
    {
      var reVer = /([\d.]+)(\.zip|$)/g;
      chkPath(defFile, 'type', found.defFileName, false);
      var version = chkPath(defFile, 'version', found.defFileName, false);
      chkPath(defFile, 'category', found.defFileName, false);
      chkPath(defFile, 'display_name', found.defFileName, true);
      chkPath(defFile, 'description', found.defFileName, true);
      chkPath(defFile, 'users', found.defFileName, true);
      var scope = chkPath(defFile, 'users.scope', found.defFileName, true);
      if (scope && scope !== 'type' && scope !== 'instance') {
        logger('ERROR', 'users.scope can only be "type" or "instance" ');
      } else {
        logger('INFO', 'users.scope correctly defined as "' + scope+'"');
      }
      chkPath(defFile, 'LAMs', found.defFileName, false);
      chkPath(defFile, 'moolets', found.defFileName, false);
      chkPath(defFile, 'moolets.name', found.defFileName, false);
      chkPath(defFile, 'moolets.description', found.defFileName, true);
      chkPath(defFile, 'inputs', found.defFileName, true);

      if (version !== String(arch.match(reVer))) {
        logger('ERROR', 'Archive file name doesn\'t match version. ' + version + ' <> ' + String(arch.match(reVer)));
      } else {
        logger('INFO', 'Archive file name and version match: ' + arch + ' = '+version);
      }
    }
    if (found.lambot && defFile) {
      lambotName = chkPath(defFile, 'LAMs.filter.presend', found.defFileName);
      if (lambotName !== found.lambotFileName) {
        logger('ERROR', found.defFileName + ' presend "'+lambotName + '" not the same as the lambot file name '+found.lambotFileName);
      } else {
        logger('INFO', found.defFileName + ' referenced Lambot '+lambotName+' found and correct');
      }
    }
    if (found.lamd && defFile) {
      if (chkPath(defFile, 'LAMs.service', found.defFileName) !== found.lamdFileName) {
        logger('ERROR', found.lamdFileName + ' not the same as the LAMS.service file name '+chkPath(defFile, 'LAMs.service', found.defFileName));
      } else {
        logger('INFO', found.lamdFileName + ' referenced in def LAMs.service found and correct');
      }
    }
    if (found.lam && defFile) {
      if (chkPath(defFile, 'LAMs.process', found.defFileName) !== found.lamFileName) {
        logger('ERROR', found.lamFileName + ' not the same as the LAMS.process file name '+chkPath(defFile, 'LAMs.process', found.defFileName));
      } else {
        logger('INFO', found.lamFileName + ' referenced in def LAMs.process found and correct');
      }
    }
    if (found.lambot && confFile) {
      lambotName = chkPath(confFile, 'config.filter.presend', found.confFileName);
      if (lambotName !== found.lambotFileName) {
        logger('ERROR', found.confFileName + ' presend "'+lambotName + '" Not the same as the lambot file name '+found.lambotFileName);
      } else {
        logger('INFO', found.confFileName +' referenced Lambot '+lambotName+' found and correct');
      }
    }
    if (found.lam && found.conf)
    {
      if (found.confFileName.startsWith(found.lamFileName))
      {
        logger('INFO', 'lam and lam conf filenames match.');
      } else
      {
        logger('ERROR', 'lam and lam conf filenames don\'t match. ' + found.lamFileName + ' <> ' + found.confFileName);
      }
    }

    if (defFile && confFile)
    {
      // Compare the files and content
      chkEqu(defFile, confFile, found.defFileName, found.confFileName, 'LAMs.monitor.name', 'config.monitor.name');
      chkEqu(defFile, confFile, found.defFileName, found.confFileName, 'LAMs.monitor.class', 'config.monitor.class');
      chkEqu(defFile, confFile, found.defFileName, found.confFileName, 'LAMs.agent.name', 'config.agent.name');
      chkEqu(defFile, confFile, found.defFileName, found.confFileName, 'LAMs.filter.presend', 'config.filter.presend');
    }
  }
}

function validateJSONfile(fileName)
{
  var start = 0;
  logger('INFO', 'Validating JSON file ' + fileName);
  var moojson = fs.readFileSync(fileName);
  var json = cleanMjson(moojson);
  try
  {
    var fileObj = JSON.parse(json);
  } catch (e)
  {
    logger('ERROR', 'Invalid JSON in ' + fileName + ' - ' + e);
    var rePos = /position (\d+)$/gm;
    var pos = parseInt(rePos.exec(String(e))[1]);
    if (pos)
    {
      start = pos - 20 < 0 ? 0 : pos - 20;
      logger('ERROR', json.substring(start, pos) + chalk.bgMagenta(json.charAt(pos)) + json.substr(pos + 1, 20));
    }
    return;
  }

  logger('DEBUG', util.inspect(fileObj));

  return fileObj;
}

function cleanMjson(mjson)
{
  mjson = String(mjson);
  var reCom = /#.*$/gm;
  var reBlnk = /^\s*[\r\n]/gm;
  var reKey = /\b[^"]\w+[^"]\s*:/gm;
  var json = mjson.replace(reCom, '').replace(reBlnk, '');
  var keys = json.match(reKey);
  var reRep;
  for (let k = 0; k < keys.length; k++)
  {
    //console.log(keys[k]);
    //reRep = new RegExp('[^"$]'+keys[k],'');
    reRep = new RegExp('\\\\"|"(?:\\\\"|[^"])*"|(\\b' + keys[k] + ')', 'g');
    //console.log(reRep);
    json = json.replace(reRep, function (m, g)
    {
      if (!g)
      {
        return m;
      }
      else
      {
        return '"' + keys[k].match(/\w+/) + '":';
      }
    });
  }
  //console.log(json);
  return json;
}

function logger(level, message)
{
  switch (level)
  {
    case 'DEBUG':
      if (!debug)
      {
        return;
      }
      break;
    case 'WARN':
      level = chalk.yellow(level);
      break;
    case 'ERROR':
      level = chalk.red(level);
      break;
    case 'INFO':
      if (!info)
      {
        return;
      }
      level = chalk.green(level);
      break
  }
  console.log('[%s] - %s', level, message);
}

//
// Tests for the existence of a value or sub-object included in the object tree to access the object/value.
// @param {object} obj Core object to test
// @param {string} path The full path to the node required
// @param {boolean} allowEmpty Produce error or warning for empty elements
// @returns {*} undefined or the value of the node
//
function chkPath(obj, path, objName, allowEmpty)
{
  'use strict';

  allowEmpty = !!allowEmpty;
  // Split the keys into an array
  //
  var keys = path.split('.');

  // Copy the object reference
  //
  var cur = obj;
  var prev = {};
  var key = 0;

  // Check the object exists
  //
  if (!cur || cur === null || typeof(cur) === 'undefined')
  {
    logger('WARN', "No object '+objName+' passed for path " + path);
    return;
  }

  // Start from 0 because we don't expect the base object name to be index 0
  // traverse the key chain to the leaf
  //
  for (var i = 0; i < keys.length; i += 1)
  {

    key = keys[i];
    prev = cur;
    //console.log('FILE '+objName+' '+key+' Array '+(cur[key] instanceof Array));
    if ((cur[key] instanceof Array))
    {
      cur = cur[key][0];
    } else
    {
      cur = cur[key];
    }

    // If we can't find a path to the leaf return undefined
    //
    //console.log(util.inspect(keys) + ' '+key);

    if (!cur)
    {
      if (typeof(cur) !== 'undefined')
      {
        if (allowEmpty)
        {
          logger('WARN', 'Element "' + path + '" found but is empty in ' + objName);
        } else
        {
          logger('ERROR', 'Element "' + path + '" found but is empty in ' + objName);
        }
      } else
      {
        logger('ERROR', 'No element "' + path + '" found in ' + objName);
      }
      //logger('ERROR', util.inspect(obj));
      return;
    }
  }

  logger('INFO', 'Found ' + path + ' in ' + objName);
  // We found the leaf, return the value
  //
  return cur;
}
//
// End function chkPath

/**
 *
 * @param obj1
 * @param obj2
 * @param name1
 * @param name2
 * @param path1
 * @param path2
 * @returns {boolean}
 */
function chkEqu(obj1, obj2, name1, name2, path1, path2)
{
  if (!obj1 || !obj2 || !name1 || !name2 || !path1)
  {
    logger('WARN', 'Missing parameter in chkEqu');
    return false;
  }
  if (!path2)
  {
    path2 = path1;
  }
  if (chkPath(obj1, path1, name1) === chkPath(obj2, path2, name2))
  {
    logger('INFO', 'Matching elements for ' + path1 + ' :' + chkPath(obj1, path1, name1));
    return true;
  } else
  {
    logger('WARN', 'NON Matching elements for ' + path1 + ' ("' + chkPath(obj1, path1, name1) + '" != "' + chkPath(obj2, path2, name2) + '")');
    return false;
  }
}