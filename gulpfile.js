const spawn = require('child_process').spawn;
const gulp = require('gulp');
const babel = require('gulp-babel');
const css = require('gulp-clean-css');

gulp.task('html', () => {
    return gulp.src('src/index.html')
        .pipe(gulp.dest('app/'));
});

gulp.task('css', () => {
    return gulp.src('src/**/*.css')
        .pipe(css())
        .pipe(gulp.dest('app/'));
});

gulp.task('js', () => {
    return gulp.src(['main.js', 'src/**/*.js'])
         .pipe(babel())
         .pipe(gulp.dest('app/'));
});

gulp.task('build', gulp.series('html', 'css', 'js'));

gulp.task('start', gulp.series('build', () => {
    spawn(
        'node_modules/.bin/electron',
        ['.'],
        { stdio: 'inherit' }
    ).on('close', () => process.exit());
}));

gulp.task('release', gulp.series('build', () => {
    spawn(
        'node_modules/.bin/electron-builder',
        ['.'],
        { stdio: 'inherit' }
    ).on('close', () => process.exit());
}));
