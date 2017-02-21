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
var zipFile;

program
  .version('1.0.1')
  .arguments('<zipFile>')
  .option('-d, --debug', 'Debug level output')
  .option('-i, --info', 'Suppress info level output')
  .action(function (zipFile)
  {
    debug = !!program.debug;
    info = !program.info;

    var fileName = zipFile.endsWith('.zip') ? zipFile : zipFile + '.zip';

    if (!fs.existsSync(fileName))
    {
      console.log('File %s not found', fileName);
      process.exit(1);
    }

    logger('INFO', 'Validating zip: ' + fileName);
    validate(fileName);
  })
  .parse(process.argv);

if (typeof zipFile === 'undefined')
{
  console.log('No zip filename provided.');
  process.exit(1);
}

function validate(fileName)
{
  var dirName = './' + fileName.replace('.zip', '');
  logger('INFO', 'Reading file ' + fileName);
  if (!fs.existsSync(dirName))
  {
    fs.mkdirSync(dirName);
  }
  zip.sync.unzip(fileName).save(dirName);
  logger('INFO', 'File unzipped to ' + dirName);

  // validations
  validateDirStructure(dirName);

  process.exit(0);
}

function validateDirStructure(arch)
{
  var files = [];
  var found = {};

  logger('INFO', 'Validating directory structure');
  if (!fs.existsSync(arch + '/integration'))
  {
    logger('ERROR', 'No integration directory');
  } else
  {
    if (fs.existsSync(arch + '/integration/documentation'))
    {
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
        logger('INFO', '.def file found ' + file);
        validateJSONfile(arch + '/integration/' + file, 'DEF');
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
        logger('INFO', '.conf file found ' + file);
        validateJSONfile(arch + '/lam/' + file, 'CONF');
      }
      if (file.endsWith('_lam'))
      {
        found.lam = true;
        logger('INFO', '_lam file found ' + file);
      }
      if (file.endsWith('lamd'))
      {
        found.lamd = true;
        logger('INFO', 'lamd file found ' + file);
      }
    });
    files = fs.readdirSync(arch + '/lambots');
    files.forEach(function (file)
    {
      if (file.endsWith('.js'))
      {
        found.lambot = true;
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
      logger('ERROR', 'No lam .conf file found.');
    }
    if (!found.lamd)
    {
      logger('ERROR', 'No lam init.d service file found.');
    }
    if (!found.lam)
    {
      logger('ERROR', 'No lam executable file found.');
    }
    if (!found.lambot)
    {
      logger('ERROR', 'No lambot .js file found.');
    }
  }
}

function validateJSONfile(fileName, type)
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

  switch (type)
  {
    case 'DEF' :
      // Test key items in the .def
      if (!fileObj.inputs)
      {
        logger('ERROR', 'No inputs declaration in ' + fileName);
      }
      break;
    case 'CONF':
      if (!fileObj.config)
      {
        logger('ERROR', 'No config declarion in ' + fileName);
        return;
      }
      if (!fileObj.config.mapping)
      {
        logger('ERROR', 'No Mapping declarion in ' + fileName);
        return;
      }
  }

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
    reRep = new RegExp('\\\\"|"(?:\\\\"|[^"])*"|(' + keys[k] + ')', 'g');
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