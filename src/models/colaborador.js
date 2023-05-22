const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const colaborador = new Schema({
  nome: { type: String, required: [true, "Nome é obrigatório."] },
  foto: { type: String },
  email: { type: String, required: [true, "E-mail é obrigatório."] },
  senha: { type: String, default: null },
  telefone: String,
  dataNascimento: { type: String, require: true },
  sexo: { type: String, enum: ["M", "F", "NA"], default: "NA" },
  status: { type: String, enum: ["A", "I", "E"], default: "A" },
  contaBancaria: {
    titular: {
      type: String,
      //required: true,
    },
    cpfCnpj: {
      type: String,
      //required: true,
    },
    banco: {
      type: String,
      //required: true,
    },
    tipo: {
      type: String,
      //required: true,
    },
    agencia: {
      type: String,
      //required: true,
    },
    numero: {
      type: String,
      //required: true,
    },
    dv: {
      type: String,
      //required: true,
    },
  },
  receipientId: {
    type: String,
    //required: true,
  },
  dataCadastro: { type: Date, defaut: Date.now },
});

module.exports = mongoose.model("Colaborador", colaborador);
