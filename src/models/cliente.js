const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cliente = new Schema({
  nome: { type: String },
  foto: { type: String },
  email: { type: String, required: [true, "E-mail é obrigatório."] },
  senha: {
    hash: String,
    salt: String,
  },
  telefone: String,
  dataNascimento: { type: String },
  sexo: { type: String, enum: ["M", "F", "NA"], default: "NA" },
  status: { type: String, enum: ["A", "I", "E"], default: "A" },
  dataCadastro: { type: Date, defaut: Date.now },
  endereco: {
    logradouro: String,
    cidade: String,
    uf: String,
    cep: String,
    numero: String,
    pais: String,
  },
  documento: {
    tipo: { type: String, enum: ["cpf", "cnpj"] },
    numero: { type: String },
  },
  customerId: { type: String },
});

module.exports = mongoose.model("Cliente", cliente);
