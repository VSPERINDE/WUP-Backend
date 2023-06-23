const express = require("express");
const router = express.Router();
const Colaborador = require("../models/colaborador");
const mongoose = require("mongoose");
const WorkplaceColaborador = require("../models/relationship/workplaceColaborador");
const ColaboradorServico = require("../models/relationship/colaboradorServico");

router.post("/", async (req, res) => {
  const db = mongoose.connection;
  const session = await db.startSession();
  session.startTransaction();

  try {
    const { colaborador, workplaceId } = req.body;
    let newColaborador = null;

    //verificar se existe
    const existentColaborador = await Colaborador.findOne({
      $or: [{ email: colaborador.email }, { telefone: colaborador.telefone }],
    });
    if (!existentColaborador) {
     
      //criando colaborador
      newColaborador = await Colaborador({
        ...colaborador,
      }).save({ session });
    }

    //relacionamento
    const colaboradorId = existentColaborador
      ? existentColaborador._id
      : newColaborador._id;

    //verifica relacionamento com workplace
    const existentRelation = await WorkplaceColaborador.findOne({
      workplaceId,
      colaboradorId,
      status: { $ne: "E" },
    });

    if (!existentRelation) {
      await new WorkplaceColaborador({
        workplaceId,
        colaboradorId,
        status: colaborador.vinculo,
      }).save({ session });
    }

    if (existentRelation) {
      await WorkplaceColaborador.findOneAndUpdate(
        {
          workplaceId,
          colaboradorId,
        },
        {
          status: colaborador.vinculo,
        },
        { session }
      );
    }

    //relacao com especialidade

    await ColaboradorServico.insertMany(
      colaborador.especialidades.map(
        (servicoId) => ({
          servicoId,
          colaboradorId,
        }),
        { session }
      )
    );

    await session.commitTransaction();
    session.endSession();

    if (existentColaborador && existentRelation) {
      res.json({ error: true, message: "Colaborador já cadastrado." });
    } else {
      res.json({ error: false, message: "API call success!" });
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.json({ error: true, message: err.message });
  }
});

router.put("/:colaboradorId", async (req, res) => {
  const db = mongoose.connection;
  const session = await db.startSession();
  session.startTransaction();
  try {
    const { vinculo, vinculoId, especialidades } = req.body;
    const { colaboradorId } = req.params;

    //vinculo
    await WorkplaceColaborador.findByIdAndUpdate(vinculoId, {
      status: vinculo,
    });

    //especialidade
    await ColaboradorServico.deleteMany({
      colaboradorId,
    });

    await ColaboradorServico.insertMany(
      especialidades.map(
        (servicoId) => ({
          servicoId,
          colaboradorId,
        }),
        { session }
      )
    );

    await session.commitTransaction();
    session.endSession();
    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.delete("/vinculo/:id", async (req, res) => {
  try {
    //vinculo
    await WorkplaceColaborador.findByIdAndUpdate(req.params.id, {
      status: "E",
    });

    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post("/filter", async (req, res) => {
  try {
    const colaboradores = await Colaborador.find(req.body.filters);
    res.json({ error: false, colaboradores });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get("/workplace/:workplaceId", async (req, res) => {
  try {
    const { workplaceId } = req.params;
    let listaColaboradores = [];

    const colaboradores = await WorkplaceColaborador.find({
      workplaceId,
      status: { $ne: "E" },
      colaboradorId: { $ne: "64570c0fd8e1397bad3fdbcb" },
    })
      .populate({ path: "colaboradorId", select: "-senha -recipientId" })
      .select("colaboradorId dataCadastro status");

    for (let vinculo of colaboradores) {
      const especialidades = await ColaboradorServico.find({
        colaboradorId: vinculo.colaboradorId._id,
      });
      listaColaboradores.push({
        ...vinculo._doc,
        especialidades: especialidades.map(
          (especialidade) => especialidade.servicoId
        ),
      });
    }
    res.json({
      error: false,
      colaboradores: listaColaboradores.map((vinculo) => ({
        ...vinculo.colaboradorId._doc,
        vinculoId: vinculo._id,
        vinculo: vinculo.status,
        especialidades: vinculo.especialidades,
        dataCadastro: vinculo.dataCadastro,
      })),
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;
