const spawn = require('child_process').spawn;
const gulp = require('gulp');
const babel = require('gulp-babel');
const css = require('gulp-clean-css');
const livereload = require('gulp-livereload');

gulp.task('copy', () => {
    return gulp.src('assets/**/*')
        .pipe(gulp.dest('app/assets'));
});

gulp.task('html', () => {
    return gulp.src('src/index.html')
        .pipe(gulp.dest('app/'))
        .pipe(livereload());
});

gulp.task('css', () => {
    return gulp.src('src/**/*.css')
        .pipe(css())
        .pipe(gulp.dest('app/'))
        .pipe(livereload());
});

gulp.task('js', () => {
    return gulp.src(['main.js', 'src/**/*.js'])
         .pipe(babel())
         .pipe(gulp.dest('app/'))
         .pipe(livereload());
});

gulp.task('watch', () => {
  livereload.listen();
  gulp.watch('src/**/*.html', gulp.series('html'));
  gulp.watch('src/**/*.css', gulp.series('css'));
  gulp.watch('src/**/*.js', gulp.series('js'));
});

gulp.task('build', gulp.series('copy', 'html', 'css', 'js'));

gulp.task('start', gulp.series('build', () => {
    spawn(
        'node_modules/.bin/electron',
        ['.'],
        { stdio: 'inherit' }
    ).on('close', () => process.exit());
}));

gulp.task('default', gulp.parallel('start', 'watch'));

gulp.task('release', gulp.series('build', () => {
    spawn(
        'node_modules/.bin/electron-builder',
        ['.'],
        { stdio: 'inherit' }
    ).on('close', () => process.exit());
}));
