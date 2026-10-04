import { openDatabase, databasePath } from "../src/db";
const { sqlite } = openDatabase();
console.log(`Database migrated: ${databasePath()}`);
sqlite.close();
