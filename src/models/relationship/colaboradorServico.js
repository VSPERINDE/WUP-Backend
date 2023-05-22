const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const colaboradorServico = new Schema({
  servicoId: {
    type: mongoose.Types.ObjectId,
    ref: "Servico",
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

module.exports = mongoose.model("ColaboradorServico", colaboradorServico);
