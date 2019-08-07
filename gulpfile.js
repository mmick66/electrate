const spawn = require('child_process').spawn;
const gulp = require('gulp');
const babel = require('gulp-babel');
const css = require('gulp-css');
// 1. Copy the index.html as is
gulp.task('html', () => {
    return gulp.src('src/index.html')
        .pipe(gulp.dest('app/'));
});
// 2. Compile CSS file and move them to the app folder
gulp.task('css', () => { // 2.
    return gulp.src('src/**/*.css')
        .pipe(css())
        .pipe(gulp.dest('app/'));
});

// 3. Compile JS files and move them to the app folder
gulp.task('js', () => { // 3.
    return gulp.src(['main.js', 'src/**/*.js'])
         .pipe(babel())
         .pipe(gulp.dest('app/'));
});
// 4. Start the electron process.
gulp.task('start', gulp.series('html', 'css', 'js', () => { // 4.
    spawn(
        'node_modules/.bin/electron',
        ['.'],
        { stdio: 'inherit' }
    ).on('close', () => process.exit());
}));

// gulp.task('release', gulp.series('html', 'css', 'js', () => { // 5.
//     spawn(
//         'node_modules/.bin/electron-builder',
//         ['.'],
//         { stdio: 'inherit' }
//     ).on('close', () => process.exit());
// }));
