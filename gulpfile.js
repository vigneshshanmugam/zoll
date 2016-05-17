'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('build', function () {

    var options = {
        entries: './lib/index.js',
        standalone: 'mendeleev'
    };
    var bundleStream = browserify(options).bundle();

    return bundleStream
        .pipe(source('mendeleev.js'))
        .pipe(gulp.dest('./dist'))
        .pipe(streamify(uglify()))
        .pipe(rename('mendeleev.min.js'))
        .pipe(gulp.dest('./dist'));
});
