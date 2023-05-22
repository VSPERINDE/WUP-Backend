const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const arquivo = new Schema({
  referenciaId: {
    type: Schema.Types.ObjectId,
    refPath: "model",
  },
  model: {
    type: String,
    required: true,
    enum: ["Servico", "Workplace", "Sala"],
  },
  caminho: {
    type: String,
    required: true,
  },
  dataCadastro: {
    type: Date,
    defaut: Date.now,
  },
});

module.exports = mongoose.model("Arquivo", arquivo);
