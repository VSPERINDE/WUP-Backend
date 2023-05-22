const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const servico = new Schema({
  workplaceId: {
    type: mongoose.Types.ObjectId,
    ref: "Workplace",
    required: true,
  },
  nome: { type: String, required: true },
  preco: { type: Number, required: true },
  duracao: { type: Date, default: null },
  recorrencia: { type: Number, default: null },
  comissao: { type: Number, default: null },
  descricao: String,
  status: { type: String, enum: ["A", "I", "E"], default: "A" },
  dataCadastro: { type: Date, defaut: Date.now },
});

module.exports = mongoose.model("Servico", servico);
