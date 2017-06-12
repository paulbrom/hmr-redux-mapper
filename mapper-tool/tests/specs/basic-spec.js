var execSync = require('child_process').execSync;
var fs = require('fs');

function clearResults(path) {
  try {
    fs.unlinkSync(`mapper-tool/tests/data/${path}/results/globalReducers.js`);
  } catch (e) {}
  try {
    fs.unlinkSync(`mapper-tool/tests/data/${path}/results/reducerMap.js`);
  } catch (e) {}
}

function execHMRTool(path, options) {
  options = options || {};
  clearResults(path);
  var args = `-b mapper-tool/tests/data/${path} -a app.jsx -c containers -g results/globalReducers.js -m results/reducerMap.js`;
  if (options.reduxSeparated) {
    args += ' -f actions.js -r redux';
  } else {
    args += ' -r components';
  }
  if (options.debug) {
    args += ' -v';
  }
  execSync(`node bin/hmr-redux-mapper ${args}`, options.debug ? { stdio:[0,1,2] } : undefined);
}

function compareResults(path) {
  var global = fs.readFileSync(`mapper-tool/tests/data/${path}/results/globalReducers.js`, 'utf8');
  var map = fs.readFileSync(`mapper-tool/tests/data/${path}/results/reducerMap.js`, 'utf8');
  var globalExpected = fs.readFileSync(`mapper-tool/tests/data/${path}/results/expected/globalReducers.js`, 'utf8');
  var mapExpected = fs.readFileSync(`mapper-tool/tests/data/${path}/results/expected/reducerMap.js`, 'utf8');
  return (global === globalExpected) && (map === mapExpected);
}

describe("Reducer detection test suite", function() {
  it("find reducer usage in the simple combined test case", function() {
    execHMRTool('simple-combined');
    expect(compareResults('simple-combined')).toBe(true);
  });

  it("find reducer usage in the simple separated test case", function() {
    execHMRTool('simple-separated', { reduxSeparated: true });
    expect(compareResults('simple-separated')).toBe(true);
  });

  it("find reducer usage in the complex separated test case", function() {
    execHMRTool('complex-separated', { reduxSeparated: true });
    expect(compareResults('complex-separated')).toBe(true);
  });

});

