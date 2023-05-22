const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const sala = new Schema({
  workplaceId: {
    type: mongoose.Types.ObjectId,
    ref: "Workplace",
    required: true,
  },
  tipo: String,
  mesas: Number,
  lotacao_max: Number,
  descricao: String,
  status: { type: String, enum: ["A", "I", "E"], default: "A" },
  dataCadastro: { type: Date, defaut: Date.now },
});

module.exports = mongoose.model("Sala", sala);
