const express = require("express");
const cors = require("cors");
const app = express();

const importTmdb = require("./routes/import_tmdb");

app.use(cors());
app.use(express.json());

app.use("/api", importTmdb);
app.use("/api/films", require("./routes/films"));
app.use("/api/tags", require("./routes/tags"));
app.use("/api/selections", require("./routes/selections"));
app.use("/api/programmation", require("./routes/programmation"));

app.listen(4000, () => console.log("API listening on http://localhost:4000"));
