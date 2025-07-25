const { JsonDatabase } = require("wio.db");

const api = new JsonDatabase({ databasePath: "./databases/apis.json" });
const db2 = new JsonDatabase({ databasePath: "./databases/applications.json" });
const auto = new JsonDatabase({ databasePath: "./databases/autocomplete.json" });
const db1 = new JsonDatabase({ databasePath: "./databases/carrinhos.json" });
const logs = new JsonDatabase({ databasePath: "./databases/config.json" });
const perms = new JsonDatabase({ databasePath: "./databases/perms.json" });
const db = new JsonDatabase({ databasePath: "./databases/produtos.json" });
const Emojis = new JsonDatabase({ databasePath: "./databases/emojis.json" });

module.exports = {
    api,
    db2,
    auto,
    db1,
    logs,
    Emojis,
    perms,
    db
}