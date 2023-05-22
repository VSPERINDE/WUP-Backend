const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const agendamento = new Schema({
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
  colaboradorId: {
    type: mongoose.Types.ObjectId,
    ref: "Colaborador",
  },
  data: { type: Date, required: true },
  duracao: { type: Number },
  transactionId: {
    type: String,
  },
  dataCadastro: { type: Date, defaut: Date.now },
});

module.exports = mongoose.model("Agendamento", agendamento);
