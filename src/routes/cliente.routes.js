const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
//const pagarme = require("../services/pagarme");
const Cliente = require("../models/cliente");
const WorkplaceCliente = require("../models/relationship/workplaceCliente");

router.post("/", async (req, res) => {
  const db = mongoose.connection;
  const session = await db.startSession();
  session.startTransaction();

  try {
    const { cliente, workplaceId } = req.body;
    let newCliente = null;

    //verificar se existe
    const existentCliente = await Cliente.findOne({
      $or: [{ email: cliente.email }, { telefone: cliente.telefone }],
    });
    if (!existentCliente) {
      const _id = new mongoose.Types.ObjectId();
      //criar conta bancária
      /*    const { contaBancaria } = colaborador;
        const pagarmeBankAccount = await pagarme("bank_accounts", {
          agencia: contaBancaria.agencia,
          bank_code: contaBancaria.banco,
          conta: contaBancaria.numero,
          conta_dv: contaBancaria.dv,
          type: contaBancaria.tipo,
          document_number: contaBancaria.cpfCnpj,
          legal_name: contaBancaria.titular,
        });
        if (pagarmeBankAccount.error) {
          throw pagarmeBankAccount;
        }
  
        
        //criar customer
        const pagarmeCustomer = await pagarme("/customers", {
          external_id: _id,
          name: cliente.nome,
          type: cliente.documento.tipo == "cpf" ? "individual" : "corporation",
          country: cliente.endereco.pais,
          email: cliente.email,
          documents:[
            {
                type: cliente.documento.tipo,
                number: cliente.documento.numero,
            },
          ],
          phone_numbers: [cliente.telefone],
          birthday: cliente.dataNascimento,
        });
        if (pagarmeCustomer.error) {
          throw pagarmeCustomer;
        }
  */
      //criando cliente
      newCliente = await Cliente({
        ...cliente,
        _id,
        //customerId: pagarmeCustomer.id,
      }).save({ session });
    }

    //relacionamento
    const clienteId = existentCliente ? existentCliente._id : newCliente._id;

    //verifica relacionamento com workplace
    const existentRelation = await WorkplaceCliente.findOne({
      workplaceId,
      clienteId,
      status: { $ne: "E" },
    });

    if (!existentRelation) {
      await new WorkplaceCliente({
        workplaceId,
        clienteId,
      }).save({ session });
    }

    if (existentRelation) {
      await WorkplaceCliente.findOneAndUpdate(
        {
          workplaceId,
          clienteId,
        },
        {
          status: "A",
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    if (existentCliente && existentRelation) {
      res.json({ error: true, message: "Cliente já cadastrado." });
    } else {
      res.json({ error: false, clienteId });
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.json({ error: true, message: err.message });
  }
});

router.post("/filter", async (req, res) => {
  try {
    const clientes = await Cliente.find(req.body.filters);
    res.json({ error: false, clientes });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get("/workplace/:workplaceId", async (req, res) => {
  try {
    const { workplaceId } = req.params;

    const clientes = await WorkplaceCliente.find({
      workplaceId,
      status: { $ne: "E" },
    })
      .populate({ path: "clienteId", select: "-senha -customerId" })
      .select("clienteId dataCadastro status");

    res.json({
      error: false,
      clientes: clientes.map((vinculo) => ({
        ...vinculo.clienteId._doc,
        vinculoId: vinculo._id,
        vinculo: vinculo.status,
        dataCadastro: vinculo.dataCadastro,
      })),
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.delete("/vinculo/:id", async (req, res) => {
  try {
    //vinculo
    await WorkplaceCliente.findByIdAndUpdate(req.params.id, {
      status: "E",
    });

    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    // buscar o workplace com o nome de usuário fornecido
    const cliente = await Cliente.findOne({ email });

    if (!cliente) {
      // caso o workplace não seja encontrado, retornar erro 401
      return res
        .status(401)
        .json({ message: "Nome de usuário ou senha inválidos." });
    }

    // verificar se a senha fornecida é válida
    if (cliente.senha) {
      const hash = crypto
        .pbkdf2Sync(senha, cliente.senha.salt, 1000, 64, "sha512")
        .toString("hex");
      if (hash === cliente.senha.hash) {
        // Usuário autenticado com sucesso
        const data = { email: cliente.email, _id: cliente._id };
        res.send(data);
      } else {
        res.status(401).send({ message: "Senha incorreta!" });
      }
    } else {
      res
        .status(401)
        .send({ message: "Senha não definida para este usuário!" });
    }
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post("/register", async (req, res) => {
  const { nome, foto, email, senha } = req.body;

  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .pbkdf2Sync(senha, salt, 1000, 64, "sha512")
    .toString("hex");

  // criar novo workplace com os dados fornecidos
  const newCliente = new Cliente({
    nome,
    foto,
    email,
    senha: { hash, salt },
  });

  try {
    // salvar o novo workplace no banco de dados
    const savedCliente = await newCliente.save();

    // retornar o workplace criado
    res.json(savedCliente);
  } catch (error) {
    // caso ocorra um erro ao salvar o novo workplace, retornar o erro
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
