import { SQLITE3_MISUSE, SQLITE3_OK } from "./constants";
import ffi from "./ffi";

const {
  sqlite3_errmsg,
  sqlite3_errstr,
} = ffi;

export const encoder = new TextEncoder();

export function toCString(str: string): Uint8Array {
  return encoder.encode(str + "\0");
}

export function isObject(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

export class SqliteError extends Error {
  name = "SqliteError";

  constructor(
    public code: number = 1,
    message: string = "Unknown Error",
  ) {
    super(`${code}: ${message}`);
  }
}

export function unwrap(code: number, db?: any): void {
  if (code === SQLITE3_OK) return;
  if (code === SQLITE3_MISUSE) {
    throw new SqliteError(code, "SQLite3 API misuse");
  } else if (db !== undefined) {
    const errmsg = sqlite3_errmsg(db);
    if (errmsg === null) throw new SqliteError(code);
    throw new Error(errmsg);
  } else {
    throw new SqliteError(
      code,
      sqlite3_errstr(code)!,
    );
  }
}
