const path = require("path");
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

const swaggerDocument = YAML.load(path.join(__dirname, "../docs/swagger.yaml"));

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/", routes);

app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

app.use(errorHandler);

module.exports = app;