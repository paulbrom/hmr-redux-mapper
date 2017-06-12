var process = require('process');
var util = require('util');
var Jasmine = require('jasmine');
var jasmine = new Jasmine();

var JasmineConsoleReporter = require('jasmine-console-reporter');
var reporter = new JasmineConsoleReporter({
  colors: 1,           // (0|false)|(1|true)|2
  cleanStack: 1,       // (0|false)|(1|true)|2|3
  verbosity: 4,        // (0|false)|1|2|(3|true)|4
  listStyle: 'indent', // "flat"|"indent"
  activity: false
});

/*jasmine.configureDefaultReporter({
  onComplete: function(passed) {
    if(passed) {
      process.exit(0);
    }
    else {
      process.exit(1);
    }
  },
  print: function() {
    process.stdout.write(util.format.apply(this, arguments));
  },
  showColors: true,
  jasmineCorePath: this.jasmineCorePath
});*/


jasmine.addReporter(reporter);
jasmine.loadConfigFile('mapper-tool/tests/jasmine.json');
jasmine.execute();

