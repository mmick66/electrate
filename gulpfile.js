const childProcess = require('child_process');
const electron = require('electron');
const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const concat = require('gulp-concat');

const babelrc = {
    presets: ['babel-preset-es2015', 'babel-preset-react'].map(require.resolve)
};

gulp.task('copy', () => {
    return gulp.src('src/index.html').pipe(gulp.dest('dist'));
});

gulp.task('build-main', () => {
    return gulp.src('main.js')
        .pipe(sourcemaps.init())
        .pipe(babel(babelrc))
        .pipe(concat('main.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('build-js', () => {
        return gulp.src('src/**/*.js')
            .pipe(sourcemaps.init())
            .pipe(babel(babelrc))
            .pipe(concat('index.js'))
            .pipe(sourcemaps.write('.'))
            .pipe(gulp.dest('dist'));
});

gulp.task('build', ['build-main', 'build-js']);

gulp.task('start', ['build', 'copy'], () => {
    childProcess.spawn(electron, ['.'], { stdio: 'inherit' })
        .on('close', () => process.exit());
});
