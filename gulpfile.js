// ========== CONFIG ==========
const config = {
    srcDir: "src",
    destDir: "dist",
    modules: {
        html: false,
        pug: true,
        css: false,
        scss: false,
        sass: true,
        js: false,
        ts: true,
        images: true,
        other: true,
        server: true
    },
    paths: {
        html: {
            src: "html/**/*.html",
            dest: "html"
        },
        pug: {
            src: ["pug/**/*.pug", "!pug/**/_*.pug"],
            dest: "html"
        },
        css: {
            src: "css/**/*.css",
            dest: "css"
        },
        scss: {
            src: ["scss/**/*.scss", "!scss/**/_*.scss"],
            dest: "css"
        },
        sass: {
            src: ["sass/**/*.sass", "!sass/_*.sass"],
            dest: "css"
        },
        js: {
            src: "js/**/*.js",
            dest: "js"
        },
        ts: {
            src: "ts/**/*.ts",
            dest: "js"
        },
        images: {
            src: "images/**/*.+(png|jpeg|jpg|gif|svg)",
            dest: "images"
        },
        other: {
            src: ["**/*.*", "!html/**", "!pug/**", "!css/**", "!scss/**", "!sass/**", "!js/**", "!ts/**", "!images/**"],
            dest: ""
        }
    },
    autoprefixerBrowserslist: ["> 1%", "last 2 version"],
    serverIndex: "html/index.html"
}
// ============================


const path = require("path")
const gulp = require("gulp")
const pump = require("pump")
const gulpPug = require("gulp-pug")
const gulpHtmlmin = require("gulp-htmlmin")
const gulpSass = require("gulp-sass")
const gulpPostcss = require("gulp-postcss")
const autoprefixer = require("autoprefixer")
const cssnano = require("cssnano")
const gulpTypescript = require("gulp-typescript")
const gulpBabel = require("gulp-babel")
const gulpUglify = require("gulp-uglify")
const gulpImagemin = require("gulp-imagemin")
const gulpSourcemaps = require("gulp-sourcemaps")
const gulpChanged = require("gulp-changed")
const del = require("del")
const browserSync = require("browser-sync")


let isDev = true


const pathJoin = (firstPart, secondPart) => {
    if (typeof secondPart === "string") {
        let p

        if (secondPart[0] === "!") {
            p = path.join(`!${firstPart}`, secondPart.substr(1))
        } else {
            p = path.join(firstPart, secondPart)
        }

        return p.replace(/\\/g, "/")
    } else {
        const arr = []

        for (const item of secondPart) {
            let p
            if (item[0] === "!") {
                p = path.join(`!${firstPart}`, item.substr(1))
            } else {
                p = path.join(firstPart, item)
            }
            arr.push(p.replace(/\\/g, "/"))
        }

        return arr
    }
}

const addIf = (condition, ...array) => condition ? array : []


const plugins = () => ({
    html: [
        ...addIf(!isDev, gulpHtmlmin({ collapseWhitespace: true }))
    ],
    pug: [
        gulpPug()
    ],
    css: [
        gulpPostcss([
            autoprefixer({ overrideBrowserslist: config.autoprefixerBrowserslist }),
            ...addIf(!isDev, cssnano())
        ])
    ],
    scss: [
        gulpSass(),
        gulpPostcss([
            autoprefixer({ overrideBrowserslist: config.autoprefixerBrowserslist }),
            ...addIf(!isDev, cssnano())
        ])
    ],
    sass: [
        gulpSass(),
        gulpPostcss([
            autoprefixer({ overrideBrowserslist: config.autoprefixerBrowserslist }),
            ...addIf(!isDev, cssnano())
        ])
    ],
    js: [
        gulpBabel({ presets: ["@babel/preset-env"] }),
        ...addIf(!isDev, gulpUglify())
    ],
    ts: [
        gulpTypescript(),
        ...addIf(!isDev, gulpUglify())
    ],
    images: [
        ...addIf(!isDev, gulpImagemin({ silent: true }))
    ],
    other: []
})


const createTask = (moduleName, destExt = null, sourcemaps = false) => {
    const fn = callback => {
        const srcPath = pathJoin(config.srcDir, config.paths[moduleName].src)
        const destPath = pathJoin(config.destDir, config.paths[moduleName].dest)
    
        pump([
            gulp.src(srcPath),
            ...addIf(isDev && sourcemaps, gulpSourcemaps.init()),
            gulpChanged(destPath, ...addIf(destExt, { extension: destExt })),
            ...plugins()[moduleName],
            ...addIf(isDev && sourcemaps, gulpSourcemaps.write(".")),
            gulp.dest(destPath)
        ], callback)
    }

    Object.defineProperty(fn, "name", { value: moduleName })

    return fn
}

const createWatcher = (moduleName, task) => {
    const watcher = gulp.watch(pathJoin(config.srcDir, config.paths[moduleName].src), task)
    if (config.modules.server) watcher.on("all", browserSync.reload)
}


let clear, html, pug, css, scss, sass, js, ts, images, other, build, watch, serve, dev, prod

clear = () => del(pathJoin(config.destDir, "*"))

if (config.modules.html) html = createTask("html")
if (config.modules.pug) pug = createTask("pug", ".html")
if (config.modules.css) css = createTask("css", null, true)
if (config.modules.scss) scss = createTask("scss", ".css", true)
if (config.modules.sass) sass = createTask("sass", ".css", true)
if (config.modules.js) js = createTask("js", null, true)
if (config.modules.ts) ts = createTask("ts", ".js", true)
if (config.modules.images) images = createTask("images")
if (config.modules.other) other = createTask("other")

build = gulp.series(
    clear,
    gulp.parallel(
        ...addIf(html, html),
        ...addIf(pug, pug),
        ...addIf(css, css),
        ...addIf(scss, scss),
        ...addIf(sass, sass),
        ...addIf(js, js),
        ...addIf(ts, ts),
        ...addIf(images, images),
        ...addIf(other, other)
    )
)

watch = () => {
    if (html) createWatcher("html", html)
    if (pug) createWatcher("pug", pug)
    if (css) createWatcher("css", css)
    if (scss) createWatcher("scss", scss)
    if (sass) createWatcher("sass", sass)
    if (js) createWatcher("js", js)
    if (ts) createWatcher("ts", ts)
    if (images) createWatcher("images", images)
    if (other) createWatcher("other", other)
}

if (config.modules.server) {
    serve = () => {
        browserSync.init({
            server: {
                baseDir: config.destDir,
                index: config.serverIndex
            },
            notify: false
        })
    }
}

dev = gulp.series(
    build,
    gulp.parallel(
        watch,
        ...addIf(serve, serve)
    )
)

prod = cb => {
    isDev = false
    return build(cb)
}


module.exports = { dev, prod }
