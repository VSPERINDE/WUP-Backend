const express = require("express");
const app = express();
const morgan = require("morgan");
const cors = require("cors");
const busboy = require("connect-busboy");
const busboyBodyParser = require("busboy-body-parser");
require("./database");

//MIDLEWARES
app.use(morgan("dev"));
app.use(express.json());
app.use(busboy());
app.use(busboyBodyParser());
app.use(cors());

//Variables
app.set("port", 8000);

//routes
app.use("/workplace", require("./src/routes/workplace.routes"));
app.use("/servico", require("./src/routes/servico.routes"));
app.use("/horario", require("./src/routes/horario.routes"));
app.use("/colaborador", require("./src/routes/colaborador.routes"));
app.use("/cliente", require("./src/routes/cliente.routes"));
app.use("/agendamento", require("./src/routes/agendamento.routes"));
app.use("/sala", require("./src/routes/sala.routes"));

app.listen(app.get("port"), () => {
  console.log(`WS Escutando na porta  ${app.get("port")}`);
});
