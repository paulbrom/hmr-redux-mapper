# Building and Contributing

<h3>How to build the hmr-redux-mapper project</h3>

The redux-mapper is built using [gulp](http://gulpjs.com/).  There are two builds conducted, one for the **redux-mapper**
tool itself, and one for the **project-integration** module which helps to use the mapper files output by the tool.  Separate
unit tests also exist for both builds.  To execute the combined build and test of both, simply run

```
gulp
```

from anywhere in the hmr-redux-mapper folder or subfolders.  You can run just a build (no tests) with

```
gulp build
```

<h3>The mapper-tool</h3>

The actual hmr-redux-mapper tool that is run during the build process is found under the `mapper-tool` folder.  The
source code is in the `src` subolder and the tests are in the `tests` subfolder.   The mapper tool is built to the
`bin` folder which is found off the root project folder.

<h4>Debugging the mapper-tool</h4>

You can pass the `verboseLogging` and `disableCache` arguments to the hmr-redux-mapper to enable verbose logging and
disable the loaded file cache, respectively, for debugging purposes.  Beyond that, the most convenient way I have found
to debug the mapper-tool is to add console logging.

<h4>Unit testing the mapper-tool</h4>

Mapper tool unit tests are actually more like functional tests, in that they directly execute the mapper tool with
arguments against test projects and compare the results to known "expected" results.  If a mapper-tool test fails
as a result of a change you have made, please diff the `reducerMap.js` and `globalReducers.js` files located in the
failing test project folders (found under `mapper-tool/tests/data`) to their counterparts found in the `expected`
subfolders located underneath the folders for each failing test in order to see what has changed to cause the test
to fail and then go back to your code to determine whether that change is a bug or seems okay (in which case, the files
in the `expected` subfolder can be updated to match the results you have with your code change).

**NOTE** - if you change the contents of an 'expected' folder based on a test failure you are seeing, I will need to
understand why you deemed this okay before I will accept any PR which does this.

<h5>Adding a new test to the mapper-tool</h5>

The general process to add a new test for the mapper-tool is as follows:

1.  Name your test and add a new constant for that test name inside of `basic-spec.js` (which is based on
[Jasmine](https://jasmine.github.io/))
1.  Create a new sample project for the redux-mapper tool to scan under `mapper-tool/dests/data/<test_name>` which will
allow the new functionality to be tested
1.  Ensure you populate the `expected` folder of this new project with the expected `reducerMap.js` and `globalReducers.js`
files for your sample project in terms of your test
1.  Add a new Jasmine it() test inside of `basic-spec.js` using the helper functions `execHMRTool` and `compareResults`

For example, suppose you create a new test named `fooTest` with constant **FOO_TEST**:

``` javascript
it(`find reducer usage in the ${FOO_TEST} test case`, function() {
  execHMRTool(FOO_TEST, {
    ...options
  });
  expect(compareResults(FOO_TEST)).toBe(true);
});
```

`execHMRTool` constructs a number of command line arguments for the redux-mapper tool based on the options passed in
and then executes the tool.  Please inspect that function to see if it meets your specific test needs as far as what
arguments are supplied to the tool.

<h5>Using the redux-mapper test harness as a TDD tool</h5>

Because the test harness is a convenient place to run the redux-mapper tool, we recommend developing changes to the
tool using a TDD approach.  Under such an approach, you would clone an existing test project under `mapper-tool/tests/data`
into a new folder, adjust the cloned project structure to cause the functionality you are trying to implement to be
reproducible, and then run the test once (to get baseline copies of `reducerMap.js` and `globalReducers.js` to put in
the `expected` folder), copy those files into the `expected` folder, and modify them in the way you expect for your
code change to produce.  You can then implement your change and once it is good, your test will pass.

<h3>The reduxMapperLoader module</h3>

The reduxMapperLoader module that is used to assist with importing of containers and their redux dependencies on hot
module reload swap is found under the `project-integration` folder.  The source code is in the `src` subolder and the
tests (which are conventional [Jasmine](https://jasmine.github.io/) unit tests) are found in the `tests` subfolder.

<h4>Special note about unit testing the reduxMapperLoader</h4>

While the reduxMapperLoader does use conventional Jasmine unit tests, the calls made by the `getComponentFromReduxMapper`
to various functions like `loadModule`, `injectReducer` and `injectSaga` are recorded in a `callsSeen` array whose
calls are verified in the unit test.  This means that if you change the behavior of the redux-mapper when it comes to
making these calls, or change the unit test data referred to by the mapper (the reducer map from the **simple-combined**
mapper-tool test), then those calls will need to be adjusted.

<h3>Rules for contributors</h3>

The only rules I have for contributing are:

1.  Don't break the unit tests.
1.  Add a unit test for any major new piece of functionalty (such as new configuration option for the mapper-tool or a
new function in the project-integration folders)

That's it!

<h3>THANKS IN ADVANCE FOR YOUR CONTRIBUTION!</h3>