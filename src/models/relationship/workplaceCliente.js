const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const workplaceCliente = new Schema({
  workplaceId: {
    type: mongoose.Types.ObjectId,
    ref: "Workplace",
    required: true,
  },
  clienteId: {
    type: mongoose.Types.ObjectId,
    ref: "Cliente",
    required: true,
  },
  status: { type: String, enum: ["A", "I", "E"], default: "A" },
  dataCadastro: { type: Date, defaut: Date.now },
});

module.exports = mongoose.model("WorkplaceCliente", workplaceCliente);
