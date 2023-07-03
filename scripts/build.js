const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");
const ARCH = process.env.TARGET_ARCH || os.arch();
const COMPILE_OPTIONS = {
    SQLITE_DQS: "0",
    SQLITE_DEFAULT_MEMSTATUS: "0",
    SQLITE_DEFAULT_WAL_SYNCHRONOUS: "1",
    SQLITE_OMIT_DEPRECATED: "1",
    SQLITE_OMIT_PROGRESS_CALLBACK: "1",
    SQLITE_OMIT_SHARED_CACHE: "1",
    SQLITE_OMIT_AUTOINIT: "1",
    SQLITE_LIKE_DOESNT_MATCH_BLOBS: "1",
    SQLITE_DEFAULT_CACHE_SIZE: "-16000",
    SQLITE_ENABLE_DESERIALIZE: "1",
    SQLITE_ENABLE_FTS3: "1",
    SQLITE_ENABLE_FTS3_PARENTHESIS: "1",
    SQLITE_ENABLE_FTS4: "1",
    SQLITE_ENABLE_FTS5: "1",
    SQLITE_ENABLE_GEOPOLY: "1",
    SQLITE_ENABLE_JSON1: "1",
    SQLITE_ENABLE_MATH_FUNCTIONS: "1",
    SQLITE_ENABLE_RTREE: "1",
    SQLITE_ENABLE_STAT4: "1",
    SQLITE_ENABLE_UPDATE_DELETE_LIMIT: "1",
    SQLITE_OMIT_TCL_VARIABLE: "1",
    SQLITE_OMIT_GET_TABLE: "1",
    SQLITE_SOUNDEX: "1",
    SQLITE_THREADSAFE: "2",
    SQLITE_TRACE_SIZE_LIMIT: "32",
    SQLITE_ENABLE_COLUMN_METADATA: "1",
    SQLITE_DEFAULT_FOREIGN_KEYS: "1",
};
const prefix = os.platform() === "win32" ? "" : "lib";
const ext = os.platform() === "win32"
    ? "dll"
    : os.platform() === "darwin"
        ? "dylib"
        : "so";
const lib = `${prefix}sqlite3.${ext}`;
const libWithArch = `${prefix}sqlite3${ARCH !== "x86_64" ? `_${ARCH}` : ""}.${ext}`;
const $ = (cmd, ...args) => {
    console.log(`$ ${cmd} ${args.join(" ")}`);
    execSync(`${cmd} ${args.join(" ")}`, { stdio: "inherit" });
};
try {
    fs.rmdirSync(path.resolve(__dirname, "../build"), { recursive: true });
}
catch (e) { }
try {
    fs.rmdirSync(path.resolve(__dirname, "../sqlite/build"), { recursive: true });
}
catch (e) { }
fs.mkdirSync(path.resolve(__dirname, "../build"));
fs.mkdirSync(path.resolve(__dirname, "../sqlite/build"));
if (os.platform() !== "win32") {
    COMPILE_OPTIONS["SQLITE_OS_UNIX"] = "1";
}
const CFLAGS = `${os.platform() === "win32" ? "OPT_FEATURE_FLAGS" : "CFLAGS"}=${os.platform() === "win32" ? "" : "-g -O3 -fPIC "}${Object.entries(COMPILE_OPTIONS).map(([k, v]) => `-D${k}=${v}`).join(" ")}`;
if (os.platform() === "win32") {
    process.chdir(path.resolve(__dirname, "../sqlite/build"));
    $("nmake", "/f", "..\\Makefile.msc", "sqlite3.dll", "TOP=..\\", CFLAGS);
    fs.copyFileSync(path.resolve(__dirname, `../sqlite/build/${lib}`), path.resolve(__dirname, `../build/${libWithArch}`));
}
else {
    process.chdir(path.resolve(__dirname, "../sqlite/build"));
    $(path.resolve(__dirname, "../sqlite/configure"), "--enable-releasemode", ...(os.arch() === ARCH ? [] : ["--disable-tcl", "--host=arm-linux"]));
    $("make", "-j", "8", CFLAGS);
    fs.copyFileSync(path.resolve(__dirname, `../sqlite/build/.libs/${lib}`), path.resolve(__dirname, `../build/${libWithArch}`));
}
console.log(`${libWithArch} built`);
