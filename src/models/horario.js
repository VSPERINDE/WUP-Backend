const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const horario = new Schema({
  workplaceId: {
    type: mongoose.Types.ObjectId,
    ref: "Workplace",
    required: true,
  },
  especialidades: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Servico",
      required: true,
    },
  ],
  colaboradores: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Colaborador",
      required: true,
    },
  ],
  dias: { type: [Number], required: true },
  inicio: { type: Date, required: true },
  fim: { type: Date, required: true },
  dataCadastro: { type: Date, defaut: Date.now },
});

module.exports = mongoose.model("Horario", horario);
