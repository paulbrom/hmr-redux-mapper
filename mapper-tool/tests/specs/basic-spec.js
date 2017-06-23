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
  args += options.otherArgs || '';
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
  const TEST_SIMPLE_COMBINED = 'simple-combined';
  const TEST_SIMPLE_SEPARATED = 'simple-separated';
  const TEST_COMPLEX_SEPARATED = 'complex-separated';
  const TEST_FILE_PATH_IGNORES = 'file-path-ignores';

  it(`find reducer usage in the ${TEST_SIMPLE_COMBINED} test case`, function() {
    execHMRTool(TEST_SIMPLE_COMBINED);
    expect(compareResults(TEST_SIMPLE_COMBINED)).toBe(true);
  });

  it(`find reducer usage in the ${TEST_SIMPLE_SEPARATED} test case`, function() {
    execHMRTool(TEST_SIMPLE_SEPARATED, { reduxSeparated: true });
    expect(compareResults(TEST_SIMPLE_SEPARATED)).toBe(true);
  });

  it(`find reducer usage in the ${TEST_COMPLEX_SEPARATED} test case`, function() {
    execHMRTool(TEST_COMPLEX_SEPARATED, { reduxSeparated: true });
    expect(compareResults(TEST_COMPLEX_SEPARATED)).toBe(true);
  });

  it(`find reducer usage in the ${TEST_FILE_PATH_IGNORES} test case`, function() {
    execHMRTool(TEST_FILE_PATH_IGNORES, {
      reduxSeparated: true,
      otherArgs: ' -i "d????a"',
    });
    expect(compareResults(TEST_FILE_PATH_IGNORES)).toBe(true);
  });

});

