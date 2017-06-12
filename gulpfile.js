
var gulp = require('gulp'),
    gutil = require('gulp-util'),
    execSync = require('child_process').execSync,
    del = require('del'),
    b = require('browserify'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    uglify = require('gulp-uglify'),
    header = require('gulp-header'),
    babel = require('gulp-babel'),
    pkg = require('./package.json'),
    karma = require('karma').server,
    process = require('process'),
    banner = '/**'
    + ' <%= pkg.name %> - v<%= pkg.version %>'
    + ' <%= new Date().toLocaleString() %>'
    + ' Copyright (c) <%= new Date().getFullYear() %> <%= pkg.author.company %> - Released under MIT license;'
    + ' */',
    karmaCallback = function(done) {
      return function(karmaExitCode) {
          if (karmaExitCode > 0) {
              gutil.log('Build failed: some or all of your tests are failing');
              process.exit(karmaExitCode);
          }
          done();
      }
    },
    production = true;

gulp.task('clean', function () {
    del(['./.tmp/**/*', './.tmp']);
});

gulp.task('browserify-tool', function() {
    return b('./mapper-tool/src/hmr-redux-mapper.js', {
        debug: false,
        bundleExternal: false,
        builtins : false,
        commondir : false,
        detectGlobals: false,
    })
        .bundle()
        .pipe(source('hmr-redux-mapper.js'))
        .pipe(gulp.dest('./.tmp/'));
});

gulp.task('browserify:dist-tool', ['browserify-tool'], function() {
    return gulp.src('./.tmp/hmr-redux-mapper.js')
        .pipe(buffer())
        .pipe(babel({presets: ['es2015']}))
        .pipe(uglify())
        .pipe(header(banner, { pkg : pkg } ))
        .pipe(gulp.dest('./bin/'));
});

gulp.task('build-tool', ['browserify:dist-tool']);

gulp.task('browserify-integration', function() {
    return b('./project-integration/src/mapper-loader.js', {
        debug: false,
        builtins : false,
        commondir : false,
        detectGlobals: false,
        standalone: 'hmr-redux-mapper',
    })
      .bundle()
      .pipe(source('project-integration.js'))
      .pipe(gulp.dest('./.tmp/'));
});

gulp.task('browserify:dist-integration', ['browserify-integration'], function() {
    return gulp.src('./.tmp/project-integration.js')
      .pipe(buffer())
      .pipe(babel({
          presets: ['es2015'],
          compact: true,
          "plugins": [
              "add-module-exports"
          ]
      }))
      .pipe(header(banner, { pkg : pkg } ))
      .pipe(gulp.dest('./dist/'));
});

gulp.task('build-integration', ['browserify:dist-integration']);

gulp.task('build', ['clean', 'build-tool', 'build-integration']);

gulp.task('test-integration', ['build'], function(done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
    }, karmaCallback(done));
});

gulp.task('test-tool', ['build'], function() {
    try {
        execSync('node mapper-tool/tests/runtests.js', {stdio:[0,1,2]});
    } catch (e) {
        gutil.log('Unit test failure - aborting');
        process.exit(e.status);
    }
});

gulp.task('test', ['test-tool', 'test-integration']);

gulp.task('default', ['build', 'test']);
