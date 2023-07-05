import * as koffi from "koffi";
import * as os from "os";

let lib: koffi.IKoffiLib

function tryOpen(path: string, emitError = false) {
  try {
    lib = koffi.load(path);
    return true;
  }
  catch(e) {
    if(emitError) throw e;
    return false;
  }
}

if(!lib && process.env["NODE_SQLITE_LOCAL"] === "1") {
  tryOpen(process.env["NODE_SQLITE_PATH"], true);
}
else {
  const ARCH = process.env.TARGET_ARCH || os.arch();
  const prefix = os.platform() === "win32" ? "" : "lib";
  const ext = os.platform() === "win32"
    ? "dll"
    : os.platform() === "darwin"
    ? "dylib"
    : "so";
  const libWithArch = `${prefix}sqlite3${
    ARCH !== "x86_64" ? `_${ARCH}` : ""
  }.${ext}`;

  if(!lib) tryOpen(require("path").join(__dirname,libWithArch));
  if(!lib) tryOpen(require("path").join(__dirname,"..","build",libWithArch));
  if(!lib) tryOpen(libWithArch);
  if(!lib) tryOpen("sqlite3", true);
}

const sqlite3_type = koffi.opaque("sqlite3");
const sqlite3_context_type = koffi.opaque("sqlite3_context");
const sqlite3_backup_type = koffi.opaque("sqlite3_backup");
const sqlite3_blob_type = koffi.opaque("sqlite3_blob");
const sqlite3_stmt_type = koffi.opaque("sqlite3_stmt");
const sqlite3_value_type = koffi.opaque("sqlite3_value");

const sqlite_callback = koffi.proto("int *callback(void*,int,char**,char**)");
const sqlite_xDel = koffi.proto("void *xDel(void*)");
const sqlite_xFunc = koffi.proto(
  "void *xFunc(sqlite3_context*,int,sqlite3_value**)"
);
const sqlite_xStep = koffi.proto(
  "void *xStep(sqlite3_context*,int,sqlite3_value**)"
);
const sqlite_xFinal = koffi.proto("void *xFinal(sqlite3_context*)");

const sqlite3_free = lib.func("sqlite3_free", "void", [
  "void*", // void *p
]);
const sqlite_string = koffi.disposable("SqliteString", "const char*", sqlite3_free);

const sqlite3_initialize = lib.func("sqlite3_initialize", "int32", []);
const init = sqlite3_initialize();
if (init !== 0) {
  throw new Error(`Failed to initialize SQLite3: ${init}`);
}

export default {
  sqlite_types: {
    sqlite_string,
    sqlite3_type,
    sqlite3_context_type,
    sqlite3_backup_type,
    sqlite3_blob_type,
    sqlite3_stmt_type,
    sqlite3_value_type,
    sqlite_callback,
    sqlite_xDel,
    sqlite_xFunc,
    sqlite_xStep,
    sqlite_xFinal,
  },

  sqlite3_open_v2: lib.func("sqlite3_open_v2", "int32", [
    "const char*", // const char *filename
    koffi.out("sqlite3**"), // sqlite3 **ppDb
    "int32", // int flags
    "const char*", // const char *zVfs
  ]),

  sqlite3_close_v2: lib.func("sqlite3_close_v2", "int32", [
    "sqlite3*", // sqlite3 *db
  ]),

  sqlite3_changes: lib.func("sqlite3_changes", "int32", [
    "sqlite3*", // sqlite3 *db
  ]),

  sqlite3_total_changes: lib.func("sqlite3_total_changes", "int32", [
    "sqlite3*", // sqlite3 *db
  ]),

  sqlite3_last_insert_rowid: lib.func("sqlite3_last_insert_rowid", "int32", [
    "sqlite3*", // sqlite3 *db
  ]),

  sqlite3_get_autocommit: lib.func("sqlite3_get_autocommit", "int32", [
    "sqlite3*", // sqlite3 *db
  ]),

  sqlite3_prepare_v2: lib.func("sqlite3_prepare_v2", "int32", [
    "sqlite3*", // sqlite3 *db
    "const char*", // const char *zSql
    "int32", // int nByte
    koffi.out("sqlite3_stmt**"), // sqlite3_stmt **ppStmt
    koffi.out("const char **"), // const char **pzTail
  ]),

  sqlite3_reset: lib.func("sqlite3_reset", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
  ]),

  sqlite3_clear_bindings: lib.func("sqlite3_clear_bindings", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
  ]),

  sqlite3_step: lib.func("sqlite3_step", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
  ]),

  sqlite3_step_cb: lib.func("sqlite3_step", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
  ]),

  sqlite3_column_count: lib.func("sqlite3_column_count", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
  ]),

  sqlite3_column_type: lib.func("sqlite3_column_type", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
  ]),

  sqlite3_column_text: lib.func(
    "sqlite3_column_text",
    "const void *",
    [
      "sqlite3_stmt*", // sqlite3_stmt *pStmt
      "int32", // int iCol
    ]
  ),

  sqlite3_finalize: lib.func("sqlite3_finalize", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
  ]),

  sqlite3_exec: lib.func("sqlite3_exec", "int32", [
    "sqlite3*", // sqlite3 *db
    "const char *", // const char *sql
    "callback*", // sqlite3_callback callback
    "void *", // void *arg
    koffi.out("SqliteString*"), // char **errmsg
  ]),

  sqlite3_free,

  sqlite3_column_int: lib.func("sqlite3_column_int", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
  ]),

  sqlite3_column_double: lib.func("sqlite3_column_double", "float64", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
  ]),

  sqlite3_column_blob: lib.func("sqlite3_column_blob", "const void*", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
  ]),

  sqlite3_column_bytes: lib.func("sqlite3_column_bytes", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
  ]),

  sqlite3_column_name: lib.func("sqlite3_column_name", "const char*", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
  ]),

  sqlite3_column_decltype: lib.func("sqlite3_column_decltype", "uint64", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
  ]),

  sqlite3_bind_parameter_index: lib.func(
    "sqlite3_bind_parameter_index",
    "int32",
    [
      "sqlite3_stmt*", // sqlite3_stmt *pStmt
      "const char*", // const char *zName
    ]
  ),

  sqlite3_bind_text: lib.func("sqlite3_bind_text", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
    "const uint8*", // const char *zData
    "int32", // int nData
    "void*", // void (*xDel)(void*)
  ]),

  sqlite3_bind_blob: lib.func("sqlite3_bind_blob", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
    "const uint8*", // const void *zData
    "int32", // int nData
    "void*", // void (*xDel)(void*)
  ]),

  sqlite3_bind_double: lib.func("sqlite3_bind_double", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
    "float64", // double rValue
  ]),

  sqlite3_bind_int: lib.func("sqlite3_bind_int", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
    "int32", // int iValue
  ]),

  sqlite3_bind_int64: lib.func("sqlite3_bind_int64", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
    "int64", // int64 iValue
  ]),

  sqlite3_bind_null: lib.func("sqlite3_bind_null", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
  ]),

  sqlite3_expanded_sql: lib.func("sqlite3_expanded_sql", "char *", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
  ]),

  sqlite3_bind_parameter_count: lib.func(
    "sqlite3_bind_parameter_count",
    "int32",
    [
      "sqlite3_stmt*", // sqlite3_stmt *pStmt
    ]
  ),

  sqlite3_complete: lib.func("sqlite3_complete", "int32", [
    "const char*", // const char *sql
  ]),

  sqlite3_sourceid: lib.func("sqlite3_sourceid", "const char *", []),

  sqlite3_libversion: lib.func("sqlite3_libversion", "const char *", []),

  sqlite3_blob_open: lib.func("sqlite3_blob_open", "int32", [
      "sqlite3*" /* sqlite3 *db */,
      "const char *" /* const char *zDb */,
      "const char *" /* const char *zTable */,
      "const char *" /* const char *zColumn */,
      "int64" /* sqlite3_int64 iRow */,
      "int32" /* int flags */,
      koffi.out("sqlite3_blob**") /* sqlite3_blob **ppBlob */,
    ],
  ),

  sqlite3_blob_read: lib.func("sqlite3_blob_read", "int32", [
    "sqlite3_blob*" /* sqlite3_blob *blob */,
    koffi.inout("uint8_t*") /* void *data */,
    "int32" /* int N */,
    "int32" /* int iOffset */,
  ]),

  sqlite3_blob_write: lib.func("sqlite3_blob_write", "int32", [
    "sqlite3_blob*" /* sqlite3_blob *blob */,
    "const uint8*" /* void *data */,
    "int32" /* int n */,
    "int32" /* int iOffset */,
  ]),

  sqlite3_blob_bytes: lib.func("sqlite3_blob_bytes", "int32", ["sqlite3_blob*" /* sqlite3_blob *blob */
  ]),
  
  sqlite3_blob_close: lib.func("sqlite3_blob_close", "int32", ["sqlite3_blob*" /* sqlite3_blob *blob */
  ]),
  
  sqlite3_sql: lib.func("sqlite3_sql", "const char *", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
  ]),

  sqlite3_stmt_readonly: lib.func("sqlite3_stmt_readonly", "int32", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
  ]),

  sqlite3_bind_parameter_name: lib.func(
    "sqlite3_bind_parameter_name",
    "const char *",
    [
      "sqlite3_stmt*", // sqlite3_stmt *pStmt
      "int32", // int iCol
    ]
  ),

  sqlite3_errmsg: lib.func("sqlite3_errmsg", "const char *", [
    "sqlite3*", // sqlite3 *db
  ]),

  sqlite3_errstr: lib.func("sqlite3_errstr", "const char *", [
    "int32", // int rc
  ]),

  sqlite3_column_int64: lib.func("sqlite3_column_int64", "int64", [
    "sqlite3_stmt*", // sqlite3_stmt *pStmt
    "int32", // int iCol
  ]),

  sqlite3_backup_init: lib.func("sqlite3_backup_init", "sqlite3_backup*", [
    "sqlite3*", // sqlite3 *pDest
    "const char*", // const char *zDestName
    "sqlite3*", // sqlite3 *pSource
    "const char*", // const char *zSourceName
  ]),

  sqlite3_backup_step: lib.func("sqlite3_backup_step", "int32", [
    "sqlite3_backup*", // sqlite3_backup *p
    "int32", // int nPage
  ]),

  sqlite3_backup_finish: lib.func("sqlite3_backup_finish", "int32", [
    "sqlite3_backup*", // sqlite3_backup *p
  ]),

  sqlite3_backup_remaining: lib.func("sqlite3_backup_remaining", "int32", [
    "sqlite3_backup*", // sqlite3_backup *p
  ]),

  sqlite3_backup_pagecount: lib.func("sqlite3_backup_pagecount", "int32", [
    "sqlite3_backup*", // sqlite3_backup *p
  ]),

  sqlite3_create_function: lib.func("sqlite3_create_function", "int32", [
    "sqlite3*", // sqlite3 *db
    "const char*", // const char *zFunctionName
    "int32", // int nArg
    "int32", // int eTextRep
    "void *", // void *pApp
    "xFunc*", // void (*xFunc)(sqlite3_context*,int,sqlite3_value**)
    "xStep*", // void (*xStep)(sqlite3_context*,int,sqlite3_value**)
    "xFinal*", // void (*xFinal)(sqlite3_context*)
  ]),

  sqlite3_result_blob: lib.func("sqlite3_result_blob", "void", [
    "sqlite3_context*", // sqlite3_context *p
    "const void *", // const void *z
    "int32", // int n
    "void*", // void (*xDel)(void*)
  ]),

  sqlite3_result_double: lib.func("sqlite3_result_double", "void", [
    "sqlite3_context*", // sqlite3_context *p
    "float64", // double rVal
  ]),

  sqlite3_result_error: lib.func("sqlite3_result_error", "void", [
    "sqlite3_context*", // sqlite3_context *p
    "const char*", // const char *z
    "int32", // int n
  ]),

  sqlite3_result_int: lib.func("sqlite3_result_int", "void", [
    "sqlite3_context*", // sqlite3_context *p
    "int32", // int iVal
  ]),

  sqlite3_result_int64: lib.func("sqlite3_result_int64", "void", [
    "sqlite3_context*", // sqlite3_context *p
    "int64", // sqlite3_int64 iVal
  ]),

  sqlite3_result_null: lib.func("sqlite3_result_null", "void", [
    "sqlite3_context*", // sqlite3_context *p
  ]),

  sqlite3_result_text: lib.func("sqlite3_result_text", "void", [
    "sqlite3_context*", // sqlite3_context *p
    "const int8*", // const char *z
    "int32", // int n
    "xDel*", // void (*xDel)(void*)
  ]),

  sqlite3_value_type: lib.func("sqlite3_value_type", "int32", [
    "sqlite3_value*", // sqlite3_value *pVal
  ]),

  sqlite3_value_blob: lib.func("sqlite3_value_blob", "const void *", [
    "sqlite3_value*", // sqlite3_value *pVal
  ]),

  sqlite3_value_double: lib.func("sqlite3_value_double", "float64", [
    "sqlite3_value*", // sqlite3_value *pVal
  ]),

  sqlite3_value_int: lib.func("sqlite3_value_int", "int32", [
    "sqlite3_value*", // sqlite3_value *pVal
  ]),

  sqlite3_value_int64: lib.func("sqlite3_value_int64", "int64", [
    "sqlite3_value*", // sqlite3_value *pVal
  ]),

  sqlite3_value_text: lib.func("sqlite3_value_text", "const void *", [
    "sqlite3_value*", // sqlite3_value *pVal
  ]),

  sqlite3_value_bytes: lib.func("sqlite3_value_bytes", "int32", [
    "sqlite3_value*", // sqlite3_value *pVal
  ]),

  sqlite3_aggregate_context: lib.func("sqlite3_aggregate_context", "void*", [
    "sqlite3_context*", // sqlite3_context *p
    "int32", // int nBytes
  ]),

  sqlite3_enable_load_extension: lib.func(
    "sqlite3_enable_load_extension",
    "int32",
    [
      "sqlite3*", // sqlite3 *db
      "int32", // int onoff
    ]
  ),

  sqlite3_load_extension: lib.func("sqlite3_load_extension", "int32", [
    "sqlite3*", // sqlite3 *db
    "const char*", // const char *zFile
    "const char*", // const char *zProc
    koffi.out("SqliteString*"), // const char **pzErrMsg
  ]),

  sqlite3_initialize,
};
