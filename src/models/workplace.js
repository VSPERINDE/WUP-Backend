const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

const workplace = new Schema({
  nome: { type: String, required: [true, "Nome é obrigatório."] },
  foto: String,
  capa: String,
  email: { type: String, required: [true, "E-mail é obrigatório."] },
  senha: {
    hash: String,
    salt: String,
  },
  telefone: String,
  endereco: {
    cidade: String,
    uf: String,
    cep: String,
    rua: String,
    pais: String,
  },
  geo: {
    tipo: String,
    coordinates: [Number],
  },
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

workplace.index({ geo: "2dsphere" });

module.exports = mongoose.model("Workplace", workplace);
