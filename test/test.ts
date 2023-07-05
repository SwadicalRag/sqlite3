import {
  Database,
  isComplete,
  SQLITE_SOURCEID,
  SQLITE_VERSION,
  SqliteError,
} from "../src";

import {ok as assert, throws as assertThrows, deepEqual as assertEquals} from "node:assert";
import {test} from "node:test";
import * as path from "path";
import * as fs from "fs/promises";
import * as _fs from "fs";

test("sqlite", async (t) => {
  await t.test("sourceid", () => {
    assert(SQLITE_SOURCEID.length > 0);
  });

  await t.test("is complete", () => {
    assert(!isComplete(""));
    assert(!isComplete("select sqlite_version()"));

    assert(isComplete("select x from y;"));
    assert(isComplete("select sqlite_version();"));
  });

  const DB_URL = path.join(__dirname, "./test.db");

  // Remove any existing test.db.
  await fs.rm(DB_URL).catch(() => {});

  await t.test("open (expect error)", () => {
    assertThrows(
      () => new Database(DB_URL, { create: false }),
      SqliteError,
      "14:",
    );
  });

  await t.test("open (path string)", () => {
    const db = new Database("test-path.db");
    db.close();
    _fs.rmSync("test-path.db");
  });

  await t.test("open (readonly)", () => {
    const db = new Database(":memory:", { readonly: true });
    db.close();
  });

  let db!: Database;
  await t.test("open (url)", () => {
    db = new Database(DB_URL, { int64: true });
  });

  if (typeof db !== "object") throw new Error("db open failed");

  await t.test("execute pragma", () => {
    db.exec("pragma journal_mode = WAL");
    db.exec("pragma synchronous = normal");
    assertEquals(db.exec("pragma temp_store = memory"), 0);
  });

  await t.test("select version (row as array)", () => {
    const [version] = db.prepare("select sqlite_version()").value<[string]>()!;
    assertEquals(version, SQLITE_VERSION);
  });

  await t.test("select version (row as object)", () => {
    const { version } = db.prepare("select sqlite_version() as version").get<
      { version: string }
    >()!;
    assertEquals(version, SQLITE_VERSION);
  });

  await t.test("autocommit", () => {
    assertEquals(db.autocommit, true);
  });

  await t.test("last insert row id", () => {
    assertEquals(db.lastInsertRowId, 0);
  });

  await t.test("create table", () => {
    db.exec(`create table test (
      integer integer,
      text text not null,
      double double,
      blob blob not null,
      nullable integer
    )`);
  });

  await t.test("insert one", () => {
    db.exec(
      `insert into test (integer, text, double, blob, nullable)
      values (?, ?, ?, ?, ?)`,
      0,
      "hello world",
      3.14,
      new Uint8Array([1, 2, 3]),
      null,
    );

    assertEquals(db.totalChanges, 1);
  });

  await t.test("delete inserted row", () => {
    db.exec("delete from test where integer = 0");
  });

  await t.test("last insert row id (after insert)", () => {
    assertEquals(db.lastInsertRowId, 1);
  });

  await t.test("prepared insert with interleaved null values", () => {
    const SQL = `insert into test (integer, text, double, blob, nullable)
    values (?, ?, ?, ?, ?)`;
    const stmt = db.prepare(SQL);
    assertEquals(
      stmt.toString(),
      `insert into test (integer, text, double, blob, nullable)
    values (NULL, NULL, NULL, NULL, NULL)`,
    );

    const insertMany = db.transaction((data: any[]) => {
      for (const row of data) {
        stmt.run(row);
      }
    });

    const rows = [];
    for (let i = 0; i < 10; i++) {
      rows.push([
        i,
        `hello ${i}`,
        i % 2 === 0 ? 3.14 : null,
        new Uint8Array([3, 2, 1]),
        null,
      ]);
    }

    insertMany.default(rows);

    stmt.finalize();

    assertEquals(db.totalChanges, 12);
  });

  await t.test("query array", () => {
    const row = db.prepare("select * from test where integer = 0").values<
      [number, string, number, Uint8Array, null]
    >()[0];

    assertEquals(row[0], 0);
    assertEquals(row[1], "hello 0");
    assertEquals(row[2], 3.14);
    assertEquals(row[3], new Uint8Array([3, 2, 1]));
    assertEquals(row[4], null);
  });

  await t.test("query object", () => {
    const rows = db.prepare(
      "select * from test where integer != ? and text != ?",
    )
      .all<{
        integer: number;
        text: string;
        double: number;
        blob: Uint8Array;
        nullable: null;
      }>(
        1,
        "hello world",
      );

    assertEquals(rows.length, 9);
    for (const row of rows) {
      console.log(row.integer,row.double)
      assertEquals(typeof row.integer, "number");
      assertEquals(row.text, `hello ${row.integer}`);
      assertEquals(row.double, (row.integer % 2 === 0) ? 3.14 : null);
      assertEquals(row.blob, new Uint8Array([3, 2, 1]));
      assertEquals(row.nullable, null);
    }
  });

  await t.test("query with string param", () => {
    const row = db.prepare(
      "select * from test where text = ?",
    ).values<[number, string, number, Uint8Array, null]>("hello 0")[0];

    assertEquals(row[0], 0);
    assertEquals(row[1], "hello 0");
    assertEquals(row[2], 3.14);
    assertEquals(row[3], new Uint8Array([3, 2, 1]));
    assertEquals(row[4], null);
  });

  await t.test("query with string param (named)", () => {
    const row = db.prepare(
      "select * from test where text = :p1",
    ).values<[number, string, number, Uint8Array, null]>({ p1: "hello 0" })[0];

    assertEquals(row[0], 0);
    assertEquals(row[1], "hello 0");
    assertEquals(row[2], 3.14);
    assertEquals(row[3], new Uint8Array([3, 2, 1]));
    assertEquals(row[4], null);
  });

  await t.test("more than 32-bit int", () => {
    const value = 978307200000;
    db.exec(
      `insert into test (integer, text, double, blob, nullable)
    values (?, ?, ?, ?, ?)`,
      value,
      "bigint",
      0,
      new Uint8Array(1),
      null,
    );
    const [int] = db.prepare(
      "select integer from test where text = ?",
    ).values<[number]>("bigint")[0];
    assertEquals(int, value);
  });

  await t.test("more than 32-bit signed int", () => {
    const value = -978307200000;
    db.exec(
      `insert into test (integer, text, double, blob, nullable)
    values (?, ?, ?, ?, ?)`,
      value,
      "bigint2",
      0,
      new Uint8Array(1),
      null,
    );
    const [int] = db.prepare(
      "select integer from test where text = ?",
    ).values<[number]>("bigint2")[0];
    assertEquals(int, value);
  });

  await t.test("max 64-bit signed int", () => {
    const value = 0x7fffffffffffffffn;
    db.exec(
      `insert into test (integer, text, double, blob, nullable)
    values (?, ?, ?, ?, ?)`,
      value,
      "bigint3",
      0,
      new Uint8Array(1),
      null,
    );
    const [int] = db.prepare(
      "select integer from test where text = ?",
    ).values<[bigint]>("bigint3")[0];
    assertEquals(int, value);
  });

  await t.test("nan value", () => {
    db.exec(
      `insert into test (integer, text, double, blob, nullable)
    values (?, ?, ?, ?, ?)`,
      NaN,
      "nan",
      NaN,
      new Uint8Array(1),
      null,
    );
    const [int, double] = db.prepare(
      "select integer, double from test where text = ?",
    ).values<[number, number]>("nan")[0];
    assertEquals(int, null);
    assertEquals(double, null);
  });

  await t.test("empty string on not null column", () => {
    db.exec(`create table empty_string_not_null ( name text not null )`);
    db.exec("insert into empty_string_not_null (name) values (?)", "");
    const s = db.prepare("select * from empty_string_not_null").value<
      string[]
    >();
    assertEquals(s, [""]);
  });

  await t.test("create blob table", () => {
    db.exec(`
      create table blobs (
        id integer primary key,
        data blob not null
      )
    `);
  });

  await t.test("insert blob", () => {
    const blob = new Uint8Array(1024 * 32);
    db.exec("insert into blobs (id, data) values (?, ?)", 0, blob);
  });

  await t.test("sql blob", async (t) => {
    const blob = db.openBlob({
      table: "blobs",
      column: "data",
      row: db.lastInsertRowId,
      readonly: false,
    });

    await t.test("byte legnth", () => {
      assertEquals(blob.byteLength, 1024 * 32);
    });

    await t.test("read from blob", () => {
      const data = new Uint8Array(blob.byteLength);
      blob.readSync(0, data);
      assertEquals(data, new Uint8Array(1024 * 32));
    });

    await t.test("write to blob", () => {
      const data = new Uint8Array(1024 * 32).fill(0x01);
      blob.writeSync(0, data);
    });

    await t.test("read from blob (stream)", async () => {
      let chunks = 0;
      for await (const chunk of blob.readable) {
        assertEquals(chunk, new Uint8Array(1024 * 16).fill(0x01));
        chunks++;
      }
      assertEquals(chunks, 2);
    });

    await t.test("read from blob (iter)", () => {
      let chunks = 0;
      for (const chunk of blob) {
        assertEquals(chunk, new Uint8Array(1024 * 16).fill(0x01));
        chunks++;
      }
      assertEquals(chunks, 2);
    });

    await t.test("write to blob (stream)", async () => {
      const writer = blob.writable.getWriter();
      await writer.write(new Uint8Array(1024 * 16).fill(0x03));
      await writer.write(new Uint8Array(1024 * 16).fill(0x03));
      await writer.close();
    });

    await t.test("close blob", () => {
      blob.close();
    });
  });

  await t.test("define functions",
    () => {
      db.function("deno_add", (a: number, b: number): number => {
        return a + b;
      });

      db.function("deno_uppercase", (a: string): string => {
        return a.toUpperCase();
      });

      db.function("deno_buffer_add_1", (a: Uint8Array): Uint8Array => {
        const result = new Uint8Array(a.length);
        for (let i = 0; i < a.length; i++) {
          result[i] = a[i] + 1;
        }
        return result;
      });

      db.function("regexp", (a: string, b: string): boolean => {
        return new RegExp(b).test(a);
      });

      db.aggregate("deno_sum_2x", {
        start: 0,
        step(sum: number, value: number): number {
          return sum + value;
        },
        final(sum: number): number {
          return sum * 2;
        },
      });
    },
  );

  await t.test("test functions", () => {
    const [result] = db
      .prepare("select deno_add(?, ?)")
      .enableCallback()
      .value<[number]>(1, 2)!;
    assertEquals(result, 3);

    const [result2] = db
      .prepare("select deno_uppercase(?)")
      .enableCallback()
      .value<[string]>("hello")!;
    assertEquals(result2, "HELLO");

    const [result3] = db
      .prepare("select deno_buffer_add_1(?)")
      .enableCallback()
      .value<[Uint8Array]>(new Uint8Array([1, 2, 3]))!;
    assertEquals(result3, new Uint8Array([2, 3, 4]));

    const [result4] = db.prepare("select deno_add(?, ?)").value<[number]>(
      1.5,
      1.5,
    )!;
    assertEquals(result4, 3);

    const [result5] = db
      .prepare("select regexp(?, ?)")
      .enableCallback()
      .value<[number]>("hello", "h.*")!;
    assertEquals(result5, 1);

    const [result6] = db
      .prepare("select regexp(?, ?)")
      .enableCallback()
      .value<[number]>("hello", "x.*")!;
    assertEquals(result6, 0);

    db.exec("create table aggr_test (value integer)");
    db.exec("insert into aggr_test (value) values (1)");
    db.exec("insert into aggr_test (value) values (2)");
    db.exec("insert into aggr_test (value) values (3)");

    // const stmt = db.prepare("select deno_sum_2x(value) from aggr_test");
    // // stmt.callback = true;
    // const [result7] = stmt.value<[number]>()!;
    // assertEquals(result7, 12);
    // // Releases lock from table.
    // stmt.finalize();

    db.exec("drop table aggr_test");
  });

  await t.test("fts5", () => {
    db.exec("create virtual table tbl_fts using fts5(a)");
    db.exec("drop table tbl_fts");
  });

  await t.test("drop table", () => {
    db.exec("drop table test");
    db.exec("drop table blobs");
  });

  await t.test("close",
    () => {
      db.close();
      try {
        _fs.rmSync(DB_URL);
      } catch (_) { /** ignore, already being used */ }
    },
  );
});
