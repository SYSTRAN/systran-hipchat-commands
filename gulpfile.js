// Copyright (c) 2016 SYSTRAN S.A.

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');

var lintPaths = [
  '.jshintrc', '*.js', '*.json',
  'lib/**/*.js',
  'lib/**/*.json',
  'tests/**/*.js',
  'tests/**/*.json'
];

gulp.task('lint', function() {
  return gulp.src(lintPaths)
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter('fail'));
});

gulp.task('default', ['lint'], function() {
});
