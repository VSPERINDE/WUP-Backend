const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const salaServico = new Schema({
  servicoId: {
    type: mongoose.Types.ObjectId,
    ref: "Servico",
    required: true,
  },
  salaId: {
    type: mongoose.Types.ObjectId,
    ref: "Sala",
    required: true,
  },
  status: { type: String, enum: ["A", "I", "E"], default: "A" },
  dataCadastro: { type: Date, defaut: Date.now },
});

module.exports = mongoose.model("SalaServico", salaServico);
