const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const workplaceColaborador = new Schema({
  workplaceId: {
    type: mongoose.Types.ObjectId,
    ref: "Workplace",
    required: true,
  },
  colaboradorId: {
    type: mongoose.Types.ObjectId,
    ref: "Colaborador",
    required: true,
  },
  status: { type: String, enum: ["A", "I", "E"], default: "A" },
  dataCadastro: { type: Date, defaut: Date.now },
});

module.exports = mongoose.model("WorkplaceColaborador", workplaceColaborador);
