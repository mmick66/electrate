const spawn = require('child_process').spawn;
const gulp  = require('gulp');
const maps  = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const css   = require('gulp-css');

const destination = 'app/';

// const babelrc = {
//     presets: ['babel-preset-es2015', 'babel-preset-react'].map(require.resolve)
// };

gulp.task('copy', () => {
    return gulp.src('src/index.html').pipe(gulp.dest(destination));
});

gulp.task('build-css', function(){
    return gulp.src('src/**/*.css')
        .pipe(css())
        .pipe(gulp.dest(destination));
});

gulp.task('build-main', () => {
    return gulp.src('main.js')
        .pipe(maps.init())
        .pipe(babel())
        .pipe(maps.write('.'))
        .pipe(gulp.dest(destination));
});

gulp.task('build-js', () => {
        return gulp.src('src/**/*.js')
            .pipe(maps.init())
            .pipe(babel())
            .pipe(maps.write('.'))
            .pipe(gulp.dest(destination));
});

gulp.task('build', ['build-css', 'build-main', 'build-js']);

const exit = () => process.exit();
gulp.task('start', ['copy', 'build'], () => {
    spawn('node_modules/.bin/electron', ['.'], { stdio: 'inherit' }).on('close', exit);
});


gulp.task('release', ['copy', 'build'], () => {
    spawn('node_modules/.bin/electron-builder', ['.'], { stdio: 'inherit' }).on('close', exit);
});

gulp.task('test', ['copy', 'build'], () => {
    spawn('node_modules/.bin/jest', ['.'], { stdio: 'inherit' }).on('close', exit);
});


