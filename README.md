# Node SQLite3

One day I upgraded electron to v24 and had a pleasant encounter with its memory cage.

`better-sqlite3` also had a very pleasant encounter with its memory cage.

I don't want any more pleasant encounters with the V8 memory cage.

Hence, I took [a deno module](https://deno.land/x/sqlite3) that heavily used FFI to implement the `sqlite3` API, and rewrote it to use the very lovely `koffi` library.

## Example

```ts
import { Database } from "x-sqlite3";

const db = new Database("test.db");

const [version] = db.prepare("select sqlite_version()").value<[string]>()!;
console.log(version);

db.close();
```
## Original work

- [x/sqlite3](https://deno.land/x/sqlite3)

## License

Apache-2.0. Check [LICENSE](./LICENSE) for details.

Copyright © 2023 DjDeveloperr, Swadical
