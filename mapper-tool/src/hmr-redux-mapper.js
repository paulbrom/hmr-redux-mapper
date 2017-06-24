// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
//
//  hmrReduxMapper - the automatic hmr component loader for redux
//  (c)2017 PureCars / Raycom Media
//  https://github.com/paulbrom/hmr-redux-mapper
//
//    main contributors:
//      Paul Broman (p.broman@yahoo.com)
//      Chris Kittredge
//
//  Released to the community under the MIT license.
//
//  This is the main module for the node.js script which searches for redux usage underneath the project folders
//  indicated by the configuration.   This module outputs the reducerMap and other files which are consumed by the
//  hmrReduxIntegrator in your project.
//
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //

"use strict";
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const beautify = require('js-beautify').js_beautify;
const cliArgs = require('command-line-args');
const cliUsage = require('command-line-usage');

const fixupPathForOS = (filePath) => {
  return filePath.replace(/\//g, path.sep);
}

const INDEX_JS = "index.js";
const CONFIG_JSON = "redux-mapper.json";
const IGNORE_EXTENSIONS = "jpg,jpeg,png,gif";

// regular expressions
const REGEX_REDUCER_DEFINITION = /PRM_REDUCER_NAME\s+=\s+['"]([^'"]*)['"]/; // used to find a reducer definition file
const REGEX_ACTION_DEFINITION = /PRM_ACTION_FILE_FOR_REDUCER\s+=\s+['"]([^'"]*)['"]/; // used to find an action file related to a reducer
const REGEX_SAGA_DEFINITION = /PRM_SAGA_FILE_FOR_REDUCER\s+=\s+['"]([^'"]*)['"]/; // used to find an action file related to a reducer
const REGEX_ALL_IMPORTS = /import [^;]* from ['"][^'"]*['"];/gm;            // used to find all imports in a given file
const REGEX_DECONSTRUCT_IMPORT = /import ([^;]*) from ['"]([^'"]*)['"];/m;  // used to deconstruct a single import
const REGEX_IMPORT_MODULES = /[^{]*{([^}]*)}/m;                             // used to deconstruct an import brace block { } into individual requested modules
const REGEX_ALL_REQUIRES = /require\(([^)]*)\)/gm;                          // used to find all requires in a given file
const REGEX_DECONSTRUCT_REQUIRE = /require\(([^)]*)\)/m;                    // used to find all requires in a given file
const REGEX_REQUIRE_MODULES = /require\(\s*\[([^\]]*)/m;                    // used to deconstruct an import brace block { } into individual requested modules
const REGEX_EXTRACT_PATH = /['"]([^'"]*)['"]/;                              // used to extract a path from a string in single or double quotes
const REGEX_IGNORE_PATHS = /(.ds_store)/gi;
const REGEX_IS_TEST = /\.test\./g;

// options for JS-beautify when writing JSON
const BEAUTIFY_OPTS = {
  "indent_size": 2,
  "wrap_line_length": 40,
  "brace_style": "expand"
};

// command line arguments, in format understood by command-line-args and command-line-usage
const COMMAND_LINE_ARGS = [
  {
    name: 'mainAppPath',
    alias: 'a',
    type: String,
    typeLabel: '[underline]{path}',
    description: 'the path to the app\'s main JS/JSX file.  Any reducers used by this JS/JSX file will be considered "global".',
    mandatory: true,
  },
  {
    name: 'basePath',
    alias: 'b',
    type: String,
    typeLabel: '[underline]{path}',
    description: 'the path to the root of the project\'s client-side script JS/JSX files.',
    mandatory: true,
  },
  {
    name: 'containerPaths',
    alias: 'c',
    type: String,
    typeLabel: '[underline]{path1},[underline]{path2},...',
    description: 'the root path to a folder containing JS/JSX files which can be a route destination.',
    mandatory: true,
  },
  {
    name: 'actionFilenames',
    alias: 'f',
    type: String,
    typeLabel: '[underline]{filename1.js},[underline]{filename2.js},...',
    description: '(optional) if any of these comma-delimited filenames are imported from a folder containing a reducer, then the reducer will be considered to be in use.  If this is not specified, then any action file must contain a [italic]PRM_ACTION_FILE_FOR_REDUCER definition to be found.',
  },
  {
    name: 'disableCache',
    alias: 'd',
    type: Boolean,
    defaultValue: false,
    description: '(optional) whether to disable the cache, which is useful for debugging.',
  },
  {
    name: 'globalReducersOutputPath',
    alias: 'g',
    type: String,
    typeLabel: '[underline]{path}',
    description: 'the output path for the globalReducers.js file.',
    mandatory: true,
  },
  {
    name: 'showHelp',
    alias: 'h',
    type: Boolean,
    defaultValue: false,
    description: '(optional) show this help message.'
  },
  {
    name: 'ignorePaths',
    alias: 'i',
    type: String,
    typeLabel: '[underline]{path_regex}',
    description: '(optional) regular expression pattern of paths/filenames to ignore (e.g. /-spec/)',
  },
  {
    name: 'reducerMapOutputPath',
    alias: 'm',
    type: String,
    typeLabel: '[underline]{path}',
    description: 'the output path for the reducerMap.js file',
    mandatory: true,
  },
  {
    name: 'reduxPaths',
    alias: 'r',
    type: String,
    typeLabel: '[underline]{path1},[underline]{path2},...',
    description: 'the root path or paths under which all the redux reducers can be found - this may be the same as container path(s)',
    mandatory: true,
  },
  {
    name: 'sagaFilename',
    alias: 's',
    type: String,
    typeLabel: '[underline]{filename}',
    description: '(optional) if you use sagas, this is the filename where all sagas will be contained (e.g., sagas.js).  If you don\'t use sagas, specify empty string for better performance',
  },
  {
    name: 'verboseLogging',
    alias: 'v', type: Boolean,
    defaultValue: false,
    description: '(optional) turns on verbose logging (for debugging purposes)',
  },
];

// error codes and details
const ERROR_NO_REDUCERS_FOUND = -1;
const ERROR_NO_REDUCER_REFERENCES_FOUND = -2;
const ERROR_NO_MAIN_APP_FILE_FOUND = -3;
const ERROR_INVALID_CONFIG_FILE = -4;
const ERROR_REQUIRED_PARAM_NOT_SPECIFIED = -5;
const ERROR_NOT_EXECUTED_IN_NODE_PATH = -6;
const ERROR_BAD_REGEXP = -7;
const ERROR_DETAILS = {
  [ERROR_NO_REDUCERS_FOUND]: {
    errorName: 'NO REDUCERS FOUND',
    troubleShootingTips: [
      'Make sure the base path parameter (-b) is set to the subfolder where your application script files begin (from where package.json is found)',
      'If you place all your reducers in folder tree separate from your UI components, be sure to specify that folder path with the -r parameter',
      'Be sure all reducer definition files (files which call createReducer, etc.) export a PRM_REDUCER_NAME constant which specifies the name of the reducer state member\r\n(e.g., export PRM_REDUCER_NAME = "myReducer"; if you reference the store using state.myReducer)',
    ],
  },
  [ERROR_NO_REDUCER_REFERENCES_FOUND]: {
    errorName: 'NO REDUCER REFERENCES FOUND',
    troubleShootingTips: [
      'Make sure you specify the subfolder(s) (from base path) where UI container script files (a container is defined as a UI script file which handles a route URL) using the -c parameter',
      'Make sure you specify all filenames in a folder containing a reducer that, if imported, mean that your container uses the reducer\r\n(e.g., if your reducer actions are defined in an actions.js file, and your reducer state can be read using a fetcher.js file, then specify actions.js,fetcher.js as the -f parameter',
    ],
  },
  [ERROR_NO_MAIN_APP_FILE_FOUND]: {
    errorName: 'NO MAIN APPLICATION CONTAINER FOUND',
    troubleShootingTips: [
      'Make sure you specify the subpath (from base path) to the main UI file for your single-page application using the -a parameter',
    ],
  },
  [ERROR_INVALID_CONFIG_FILE]: {
    errorName: `INVALID CONFIGURATION FILE (${CONFIG_JSON})`,
    troubleShootingTips: [
      'The configuration file could not be parsed.  Please check that it is formatted correctly',
    ],
  },
  [ERROR_REQUIRED_PARAM_NOT_SPECIFIED]: {
    errorName: 'REQUIRED PARAMETER NOT SPECIFIED',
  },
  [ERROR_NOT_EXECUTED_IN_NODE_PATH]: {
    errorName: 'NOT EXECUTED UNDER NODE PATH',
    troubleShootingTips: [
      'The redux mapper must be executed inside a node path (a package.json file must be found in the execution folder or on of its ancestors)',
    ],
  },
  [ERROR_BAD_REGEXP]: {
    errorName: 'BAD REGULAR EXPRESSION',
    troubleShootingTips: [
      'The regular expression provided as the -ignorePaths parameter is invalid.',
    ],
  },
};


//
// the HMR_ReduxMapper class
//
class HMR_ReduxMapper {
  constructor() {
    this._opts = cliArgs(COMMAND_LINE_ARGS).parse();
    this._reducers = [];
    this._sagaFilenames = {};
    this._cache = {};
    this._totalReducerUsagesFound = 0;
    this._totalFilesScanned = 0;
  }

  //
  // configuration / validation functions
  //

  // this method attempts to parse the 'ignorePaths' option into this._ignoreRegex
  _parseIgnoreRegex() {
    this._ignoreRegex = null;
    const ignorePaths = this._opts.ignorePaths;
    if (ignorePaths) {
      try {
        this._ignoreRegex = new RegExp(ignorePaths);
      } catch (e) {
        this._exitWithError(ERROR_BAD_REGEXP);
      }
    }
  }

  // this method loads the config file from redux-mapper.js (same path as package.json)
  _loadConfigFile() {
    if (this._existsAndNotAFolder(CONFIG_JSON)) {
      const fileContents = fs.readFileSync(CONFIG_JSON, 'utf8');
      try {
        const data = JSON.parse(fileContents);
        _.each(data.config, (valueCur, configCur) => {
          if (typeof(this._opts[configCur]) === 'undefined') {
            this._opts[configCur] = ((configCur.indexOf('Path') > -1) ? fixupPathForOS(valueCur) : valueCur);
          }
        });
      } catch (e) {
        this._exitWithError(ERROR_INVALID_CONFIG_FILE);
      }
    }
  }

  // this method ensures all required parameters have been specified either on command line or in redux-mapper.json
  _validateParameters() {
    _.each(COMMAND_LINE_ARGS, argCur => {
      if (argCur.mandatory && (typeof(this._opts[argCur.name]) === 'undefined')) {
        this._exitWithError(ERROR_REQUIRED_PARAM_NOT_SPECIFIED, `-${argCur.name}`, [`Specify a value for argument -${argCur.name} either on the command line or in redux-mapper.json`]);
      }
    });
  }

  // this method exits the tool with the given error code, and shows troubleshooting tips on the console
  _exitWithError(errorCode, extraText = '', additionalTips = []) {
    if (extraText.length) {
      extraText = `: ${extraText}`;
    }
    console.log(`\r\n*** ERROR: ${ERROR_DETAILS[errorCode].errorName}${extraText} ***\r\n\r\nTroubleshooting tips:\r\n`);
    _.each(_.union(ERROR_DETAILS[errorCode].troubleShootingTips || [], additionalTips), (tipCur, tipIdx) => {
      console.log(`${tipIdx + 1}. ${tipCur}`);
    });
    process.exit(1);
  }

  //
  // logging utility functions
  //

  _logWithDepth(depth, log) {
    let logStr = '';
    for (let blank = 0; blank < (depth.length - 1) * 3; blank++) {
      logStr += ' ';
    }
    console.log(logStr + log);
  }

  //
  // file utility functions
  //

  // this method returns a given path with the base path prepended
  _getBasePath(subPath) {
    return path.join(this._opts.basePath, subPath);
  }

  // this method executes function fn on all files in given folder or its subfolders
  _execOnAllFilesRecursive(folder, fn) {
    const files = fs.readdirSync(folder);
    _.each(files, fileCur => {
      fileCur = path.join(folder, fileCur);
      if (this._opts.verboseLogging && this._ignoreRegex) {
        this._logWithDepth(0, `file: ${fileCur}, matches: ${fileCur.match(this._ignoreRegex)}`);
      }
      if (!this._ignoreRegex || !fileCur.match(this._ignoreRegex)) {
        if (fs.statSync(fileCur).isDirectory()) {
          this._execOnAllFilesRecursive(fileCur, fn)
        } else {
          fn(fileCur);
        }
      }
    });
  }

  // this method returns true if given path exists and is not a folder
  _existsAndNotAFolder(filePath) {
    return fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory();
  }

  // this method returns true if the given path exists and is a folder containing index.js
  _existsAndIsFolderWithIndex(filePath) {
    return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory() && fs.existsSync(path.join(filePath, INDEX_JS));
  }

  // given a source file from an import, find the true filename to import, which may involve finding the right file
  // extension or index.js if the import references a folder which contains index.js
  _findTrueImportFilePath(sourceFile) {
    return (this._existsAndNotAFolder(sourceFile) ? sourceFile :
      (this._existsAndNotAFolder(`${sourceFile}.jsx`) ? `${sourceFile}.jsx` :
        (this._existsAndNotAFolder(`${sourceFile}.js`) ? `${sourceFile}.js` :
          (this._existsAndIsFolderWithIndex(sourceFile) ? path.join(sourceFile, INDEX_JS) : null))));
  }

  // removes the extension from the given file path
  _trimExtension(filePath) {
    const ext = path.extname(filePath);
    if (ext.length) {
      filePath = filePath.substr(0, filePath.lastIndexOf(ext));
    }
    return filePath;
  }

  // chdirs down to the root project folder - we need to execute from there when in a build scenario
  _moveToProjectRootFolder() {
    while (!fs.existsSync('package.json')) {
      const oldPath = process.cwd();
      process.chdir('..');
      if (oldPath === process.cwd()) {
        this._exitWithError(ERROR_NOT_EXECUTED_IN_NODE_PATH);
      }
    }
  }

  _forceUnixPath(pathStr) {
    return pathStr.replace(/\\/g, '/');
  }

  //
  // cache utility functions
  //

  _addToCache(sourceFile, importMatchPrev, reducers) {
    if (!this._opts.disableCache) {
      this._cache[importMatchPrev ? `${sourceFile}_${importMatchPrev[0]}` : sourceFile] = _.cloneDeep(reducers);
    }
    return reducers;
  }

  _getCache(sourceFile, importMatchPrev) {
    return this._cache[importMatchPrev ? `${sourceFile}_${importMatchPrev[0]}` : sourceFile];
  }

  //
  // reducer finding methods
  //

  // this method finds all reducer definitions in the given folder
  _findReducerDefinitions(folder) {
    const reducers = [];

    // must prescan for saga filenames if not predefined
    if (!this._opts.sagaFilename && (this._opts.sagaFilename !== '')) {
      this._execOnAllFilesRecursive(folder, fileCur => {
        const fileContents = fs.readFileSync(fileCur, 'utf8');
        const sagaMatch = fileContents.match(REGEX_SAGA_DEFINITION);
        if (sagaMatch) {
          this._sagaFilenames[sagaMatch[1]] = path.basename(fileCur);
        }
      });
    }

    this._execOnAllFilesRecursive(folder, fileCur => {
      const fileContents = fs.readFileSync(fileCur, 'utf8');
      const nameMatch = fileContents.match(REGEX_REDUCER_DEFINITION);
      if (nameMatch && nameMatch.length > 1) {
        const reducerName = nameMatch[1];
        const reducerPathMunged = fileCur.replace(this._getBasePath(path.dirname(this._opts.reducerMapOutputPath)), '.');
        const sagaFilename = (this._opts.sagaFilename || this._sagaFilenames[reducerName]);
        const sagaPath = sagaFilename && fileCur.replace(/\/[^\/]*$/, `/${sagaFilename}`);
        const hasSagas = sagaFilename && fs.existsSync(sagaPath);
        const sagaPathMunged = sagaFilename &&
          sagaPath.replace(this._getBasePath(path.dirname(this._opts.reducerMapOutputPath)), '.');
        reducers.push({
          reducerName,
          reducerRootPath: path.dirname(fileCur),
          reducerPath: reducerPathMunged,
          importFunc: `$$function() { return System.import('${this._forceUnixPath(this._trimExtension(reducerPathMunged))}'); }$$`,
          sagaImportFunc: hasSagas ? `$$function() { return System.import('${this._forceUnixPath(this._trimExtension(sagaPathMunged))}'); }$$` : undefined,
        });
      }
    });
    return reducers;
  }

  // this method returns true if the given filepath is in the reducer folder ends with any core reducer filenames or
  // contains an action definition for the given reducerInfo
  _isACoreReducerFile(filePath, fileContents, reducerInfo) {
    if (this._opts.actionFilenames) {
      if ((filePath.indexOf(reducerInfo.reducerRootPath) === 0) &&
          (filePath.lastIndexOf(path.sep) === reducerInfo.reducerRootPath.length)) {
        const reducerFilenames = this._opts.actionFilenames.split(',');
        return _.reduce(reducerFilenames, (endsWith, filenameCur) => {
          return endsWith || _.endsWith(filePath, filenameCur);
        }, false);
      }
    } else {
      const nameMatch = fileContents.match(REGEX_ACTION_DEFINITION);
      if (nameMatch && nameMatch.length > 1) {
        return nameMatch[1] === reducerInfo.reducerName;
      }
    }
    return false;
  }

  // this method returns a list of files we should NOT import if we are looking at an index.js and the previous
  // import (which targets this file) specified a subset of files to import
  _getModuleRestrictionsFromImport(sourceFile, importMatchPrev) {
    if (importMatchPrev && _.endsWith(sourceFile, INDEX_JS)) {
      const restrictImports = importMatchPrev[1].match(REGEX_IMPORT_MODULES);
      if (restrictImports && (restrictImports.length > 1)) {
        return _.map(restrictImports[1].split(','), restrictCur => _.trim(restrictCur.replace(/\n/g, "")));
      }
    }
    return null;
  }

  // this method determines if the given import should be restricted.  If it should not be restricted, the
  // filename to import is returned, otherwise null.   See _getRestrictionsFromImport for more detail on these
  // restrictions
  _shouldRestrictThisImport(restrictImports, importMatch, logDepth) {
    const matchAry = _.map(importMatch[1].split(','), matchCur => _.trim(matchCur.replace(/\n/g, "")));
    return (restrictImports && _.reduce(matchAry, (shouldSkip, matchCur) => {
      if (!restrictImports.includes(matchCur)) {
        // skip this one
        if (this._opts.verboseLogging) {
          this._logWithDepth(logDepth, ' +++++++++++++++++++++++++++++++++++++++>>');
          this._logWithDepth(logDepth, ' ++++ ignoring import not in module list: ' + importMatch[2]);
          this._logWithDepth(logDepth, ' +++++++++++++++++++++++++++++++++++++++>>');
        }
        shouldSkip = true;
      }
      return shouldSkip;
    }, false)) ? null : importMatch[2];
  }

  // converts a reducer set to a map and sorts it by reducerName
  _sortAndMapReducers(reducers) {
    return _.sortBy(_.map(reducers, reducerCur => reducerCur), 'reducerName');
  }

  // this method scans the given file and all files which it imports to find all reducers used by this file
  // or any imports
  _scanForReducerUsageInFile(sourceFile, depth, importMatchPrev) {
    const newDepth = _.isArray(depth) ? _.clone(depth) : [];
    newDepth.push(sourceFile);

    if (this._opts.verboseLogging) {
      this._logWithDepth(newDepth, '_scanForReducerUsageInFile: ' + sourceFile);
    }

    // fixup the provided source file from the import
    sourceFile = this._findTrueImportFilePath(sourceFile);
    if (sourceFile) {
      // see if the known reducers for this file already exists in our cache
      const cached = this._getCache(sourceFile, importMatchPrev);
      if (cached) {
        return cached;
      }

      let fileContents;
      try {
        // attempt to read the file
        fileContents = fs.readFileSync(sourceFile, 'utf8');
      } catch (e) {
        // absorb ENOTDIR exceptions (usually caused by imports from node_modules), rethrow all others
        if ((e.message.indexOf('ENOTDIR') === -1) &&
          (e.message.indexOf('ENOENT') === -1)) {
          throw(e);
        } else {
          // file doesn't exist.  No reducers here.
          return this._addToCache(sourceFile, importMatchPrev, {});
        }
      }

      this._totalFilesScanned++;

      // attempt to find all the reducers used in this file
      const reducersUsed = _.reduce(this._reducers, (reducersUsed, reducerCur) => {
        if (this._isACoreReducerFile(sourceFile, fileContents, reducerCur) &&
            (!this._globalReducers || !this._globalReducers[reducerCur.reducerName])) {
          if (this._opts.verboseLogging) {
            this._logWithDepth(newDepth, ' +++++++++++++++++++++++++>>');
            this._logWithDepth(newDepth, ' ++++ found reducer usage: ' + reducerCur.reducerName);
            this._logWithDepth(newDepth, ' +++++++++++++++++++++++++>>');
          }
          reducersUsed[reducerCur.reducerName] = reducerCur;
          this._totalReducerUsagesFound++;
        }
        return reducersUsed;
      }, {});

      // determine if we should restrict any of the imports from index.js based on the set of files to import
      // e.g., if index.js exports a, b, and c, but the file which imported it asked to import { a, b }, we only want
      // to scan files a and b, and we want to add c to the 'restrict' list
      const restrictImports = this._getModuleRestrictionsFromImport(sourceFile, importMatchPrev);

      // this function is invoked to recursively search imported or required files for reducer references
      const scanForReducersInMatch = (importPath, importMatch, reducersUsed) => {
        // try scanning the file as if it were a relative path
        const filePathRelative = path.join(path.dirname(sourceFile), importPath);
        const relativeReducers = (newDepth.includes(filePathRelative) ? {} :
          this._scanForReducerUsageInFile(path.join(path.dirname(sourceFile), importPath), newDepth, importMatch));

        // also try scanning the file as if it were an absolute path off the root (we really don't know)
        const filePathRoot = this._getBasePath(importPath);
        const rootReducers = (newDepth.includes(filePathRoot) ? {} :
          this._scanForReducerUsageInFile(this._getBasePath(importPath), newDepth, importMatch));

        // unite any reducers returned from relative & root paths
        return Object.assign({}, relativeReducers, rootReducers, reducersUsed);
      };

      // loop over all the imports and requires recursively, then add results to cache when done
      const imports = fileContents.match(REGEX_ALL_IMPORTS);
      const requires = fileContents.match(REGEX_ALL_REQUIRES);
      return this._addToCache(sourceFile, importMatchPrev, _.reduce(_.union(imports || [], requires || []), (reducersUsed, importCur) => {
        // is this an import or a require?
        const importMatch = importCur.match(REGEX_DECONSTRUCT_IMPORT);
        if (importMatch) {
          // get the import match & import path.  Path will be returned if this is not a restricted import, if so scan it
          const importPath = this._shouldRestrictThisImport(restrictImports, importMatch, newDepth);
          if (importPath) {
            return scanForReducersInMatch(importPath, importMatch, reducersUsed);
          }
        } else {
          // it's a require.  Is this a multi-file require (e.g., require(['foo.js', 'bar.js', 'baz.js']))?
          const modules = importCur.match(REGEX_REQUIRE_MODULES);
          if (modules && (modules.length > 1)) {
            // multi-file require.  Scan all files in require
            const moduleAry = modules[1].split(',');
            return _.reduce(moduleAry, (reducersUsed, moduleCur) => {
              const pathMatch = moduleCur.match(REGEX_EXTRACT_PATH);
              if (pathMatch && (pathMatch.length > 1)) {
                return scanForReducersInMatch(pathMatch[1], importMatch, reducersUsed);
              }
            }, reducersUsed);
          }

          // single file require.  Scan the file
          const requireMatch = importCur.match(REGEX_DECONSTRUCT_REQUIRE);
          if (requireMatch && (requireMatch.length > 1)) {
            return scanForReducersInMatch(requireMatch[1], importMatch, reducersUsed);
          }
        }

        // we're not importing this.  Return current reducer set
        return reducersUsed;
      }, reducersUsed));
    }
    return {};
  }

  // this method scans the given folder and all subfolders for reducer usage
  _scanForReducerUsageInFolder(folder) {
    const reducersUsed = {};
    this._execOnAllFilesRecursive(folder, fileCur => {
      const fileCurMunged = fileCur.replace(this._opts.basePath, '.');
      const ignorePath = fileCurMunged.match(REGEX_IGNORE_PATHS);
      const isTestFilename = fileCurMunged.match(REGEX_IS_TEST);
      const ignoreExtension = _.reduce(IGNORE_EXTENSIONS, (shouldIgnore, extCur) =>
        shouldIgnore || fileCurMunged.match(`${extCur}$`), false);
      if (!ignorePath && !isTestFilename && !ignoreExtension) {
        reducersUsed[fileCurMunged] = {
          importFunc: `$$function() { return System.import('${this._forceUnixPath(this._trimExtension(fileCurMunged))}'); }$$`,
          reducers: this._sortAndMapReducers(this._scanForReducerUsageInFile(fileCur)),
        };
      }
    });
    return reducersUsed;
  }

  //
  // export file writing methods
  //

  _stripReducersForOutput(reducers) {
    return _.map(reducers, reducerCur => {
      return {
        reducerName: reducerCur.reducerName,
        importFunc: reducerCur.importFunc,
        sagaImportFunc: reducerCur.sagaImportFunc,
      };
    })
  }

  // this method exports the reducer data file
  _exportReducerDataFile() {
    let containerReducers = {};
    _.each(this._containerReducers, (containerCur, containerPath) => {
      containerPath = this._forceUnixPath(containerPath);
      containerReducers[containerPath] = {
        importFunc: containerCur.importFunc,
        reducers: this._stripReducersForOutput(containerCur.reducers),
      };
    });

    const reducerFileData = {
      global: this._stripReducersForOutput(this._sortAndMapReducers(this._globalReducers)),
      containerSpecific: containerReducers,
    };

    fs.writeFileSync(this._getBasePath(this._opts.reducerMapOutputPath),
      '/* AUTOGENERATED FILE - DO NOT MODIFY */\r\n' +
      '/* generated by HMR_ReduxMapper */\r\n' +
      '/* https://github.com/paulbrom/hmr-redux-mapper */\r\n' +
      'module.exports = \r\n' + beautify(JSON.stringify(reducerFileData).replace(/"\$\$/g, "").replace(/\$\$"/g, ""), BEAUTIFY_OPTS) + ';');
  }

  // this method exports the global modules file
  _exportGlobalModulesFile() {
    const outputFolder = path.dirname(this._opts.globalReducersOutputPath) + path.sep;
    const imports = _.reduce(this._globalReducers, (fileContents, reducerCur) => {
      return fileContents + `import ${reducerCur.reducerName} from "${this._forceUnixPath(reducerCur.reducerPath.replace(outputFolder, ''))}"\r\n`;
    }, "");
    const exports = _.reduce(this._globalReducers, (fileContents, reducerCur) => {
      return fileContents + `  ${reducerCur.reducerName},\r\n`;
    }, "");

    fs.writeFileSync(this._getBasePath(this._opts.globalReducersOutputPath),
      '/* AUTOGENERATED FILE - DO NOT MODIFY */\r\n' +
      '/* generated by HMR_ReduxMapper */\r\n' +
      '/* https://github.com/paulbrom/hmr-redux-mapper */\r\n' +
      imports + "\r\nexport default {\r\n" + exports + "};\r\n");
  }

  //
  // main execution methods
  //

  // thid method shows the help for this tool
  _showHelp() {
    const sections = [
      {
        header: 'HMR_ReduxMapper',
        content: 'This is a module which generates a [italic]{global} and [italic]{component specific} mapping file ' +
          'which should eliminate the need to manually list all reducers needed to render a given route when using ' +
          'hot-module-reloading.   To use this, each redux reducer file should contain a [bold]{PRM_REDUCER_NAME} ' +
          'constant which this tool will look for.  See https://github.com/paulbrom/hmr-redux-mapper for more information.',
      },
      {
        header: 'Options',
        optionList: COMMAND_LINE_ARGS,
      }
    ];
    const usage = cliUsage(sections)
    console.log(usage);
  }

  // the core method to execute this tool
  execute() {
    if (this._opts.showHelp) {
      return this._showHelp();
    }

    const timeStart = new Date().getTime();

    console.log('HMR_ReduxMapper');
    console.log('(c)2017 PureCars/Raycom Media - distributed under MIT license');
    console.log('Use -h argument for a full list of command line options');

    this._moveToProjectRootFolder();
    this._loadConfigFile();
    this._parseIgnoreRegex();
    this._validateParameters();

    const containerPathAry = this._opts.containerPaths.split(',');
    const reduxPathAry = this._opts.reduxPaths.split(',');

    // first, find all the reducers
    console.log('');
    _.each(reduxPathAry, reduxPathCur => {
      reduxPathCur = this._getBasePath(_.trim(reduxPathCur));
      console.log(`Finding reducers in ${reduxPathCur} ...`);
      this._reducers = _.union(this._findReducerDefinitions(reduxPathCur), this._reducers);
    });
    if (this._opts.verboseLogging) {
      console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
      console.log('reducers found:', this._reducers);
      console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
    }

    if (!this._reducers.length) {
      this._exitWithError(ERROR_NO_REDUCERS_FOUND);
    }

    // then, check the main app file to find the global reducers
    if (!this._existsAndNotAFolder(this._getBasePath(this._opts.mainAppPath))) {
      this._exitWithError(ERROR_NO_MAIN_APP_FILE_FOUND, this._getBasePath(this._opts.mainAppPath));
    }

    console.log(`Finding global reducers in ${this._getBasePath(this._opts.mainAppPath)} ...`);
    this._globalReducers = this._scanForReducerUsageInFile(this._getBasePath(this._opts.mainAppPath));
    if (this._opts.verboseLogging) {
      console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
      console.log('global reducers:', this._globalReducers);
      console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
    }

    this._cache = {}; // reset the cache because we want to ignore global reducers in the containers, and the cache will contain them
    this._containerReducers = {};

    // then, check the container folder to find all reducer usage
    _.each(containerPathAry, containerPathCur => {
      containerPathCur = this._getBasePath(_.trim(containerPathCur));
      console.log(`Scanning reducer usage in ${containerPathCur} ...`);
      this._containerReducers = Object.assign({},
        this._containerReducers,
        this._scanForReducerUsageInFolder(containerPathCur));
    });

    if (!this._totalReducerUsagesFound) {
      this._exitWithError(ERROR_NO_REDUCER_REFERENCES_FOUND);
    }

    this._exportGlobalModulesFile();
    this._exportReducerDataFile();

    const timeEnd = new Date().getTime();
    console.log(`\r\nSUCCESS!  Found ${this._totalReducerUsagesFound} reducers used in ${this._totalFilesScanned} files.  Elapsed time: ${timeEnd - timeStart}ms`);
  }
}

//
// begin mapping
//
let mapper = new HMR_ReduxMapper();
mapper.execute();
