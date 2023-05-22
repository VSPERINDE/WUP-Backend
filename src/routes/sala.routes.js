const express = require("express");
const router = express.Router();
const aws = require("../services/aws");
const Arquivo = require("../models/arquivo");
const Servico = require("../models/servico");
const Sala = require("../models/sala");
const Busboy = require("busboy");
const SalaServico = require("../models/relationship/salaServico");

router.post("/", async (req, res) => {
  let busboy = Busboy({ headers: req.headers });
  busboy.on("finish", async () => {
    try {
      const { workplaceId, sala, especialidades } = req.body;
      let errors = [];
      let arquivos = [];

      if (req.files && Object.keys(req.files).length > 0) {
        for (let key of Object.keys(req.files)) {
          const file = req.files[key];

          const nameParts = file.name.split(".");
          const fileName = `${new Date().getTime()}.${
            nameParts[nameParts.length - 1]
          }`;
          const path = `salas/${workplaceId}/${fileName}`;

          const response = await aws.uploadToS3(file, path);

          if (response.error) {
            errors.push({ error: true, message: response.message });
          } else {
            arquivos.push(path);
          }
        }
      }
      if (errors.length > 0) {
        res.json(errors[0]);
        return false;
      }

      // criar sala
      let jsonSalas = JSON.parse(sala);
      const salaCadastrada = await Sala(jsonSalas).save();

      let jsonEspecialidades = JSON.parse(especialidades);

      let servicos = jsonEspecialidades._id.map((e) => e);

      //relacionamento
      for (let servico of servicos) {
        const existentRelation = await SalaServico.findOne({
          servicoId: servico,
          salaId: salaCadastrada._id,
          status: { $ne: "E" },
        });
        console.log(existentRelation);
        if (!existentRelation) {
          await SalaServico.insertMany({
            servicoId: servico,
            salaId: salaCadastrada._id,
          });
        }
      }

      // criar arquivo
      arquivos = arquivos.map((arquivo) => ({
        referenciaId: salaCadastrada._id,
        model: "Sala",
        caminho: arquivo,
      }));

      await Arquivo.insertMany(arquivos);

      res.json({
        error: false,
        sala: salaCadastrada,
        arquivos,
        especialidades: servicos,
      });
    } catch (err) {
      res.json({ error: true, message: err.message });
    }
  });
  req.pipe(busboy);
});

router.put("/:id", async (req, res) => {
  let busboy = new Busboy({ headers: req.headers });
  busboy.on("finish", async () => {
    try {
      const { workplaceId, sala, especialidades } = req.body;
      let errors = [];
      let arquivos = [];

      if (req.files && Object.keys(req.files).length > 0) {
        for (let key of Object.keys(req.files)) {
          const file = req.files[key];

          const nameParts = file.name.split(".");
          const fileName = `${new Date().getTime()}.${
            nameParts[nameParts.length - 1]
          }`;
          const path = `salas/${workplaceId}/${fileName}`;

          const response = await aws.uploadToS3(file, path);

          if (response.error) {
            errors.push({ error: true, message: response.message });
          } else {
            arquivos.push(path);
          }
        }
      }
      if (errors.length > 0) {
        res.json(errors[0]);
        return false;
      }

      // procurar sala
      const jsonSala = JSON.parse(sala);
      await Sala.findByIdAndUpdate(req.params.id, jsonSala);

      // criar arquivo
      arquivos = arquivos.map((arquivo) => ({
        referenciaId: req.params.id,
        model: "Sala",
        caminho: arquivo,
      }));

      await Arquivo.insertMany(arquivos);

      let jsonEspecialidades = JSON.parse(especialidades);

      let servicos = jsonEspecialidades._id.map((e) => e);

      await SalaServico.deleteMany({
        salaId: req.params.id,
      });

      //relacionamento
      for (let servico of servicos) {
        const existentRelation = await SalaServico.findOne({
          servicoId: servico,
          salaId: req.params.id,
          status: { $ne: "E" },
        });

        if (!existentRelation) {
          await SalaServico.insertMany({
            servicoId: servico,
            salaId: req.params.id,
          });
        }
      }

      res.json({ error: false });
    } catch (err) {
      res.json({ error: true, message: err.message });
    }
  });
  req.pipe(busboy);
});

router.post("/delete-arquivo", async (req, res) => {
  try {
    const { id } = req.body;

    //excluir aws
    await aws.deleteFileS3(id);

    //excluir banco
    await Arquivo.findOneAndDelete({
      caminho: id,
    });

    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Sala.findByIdAndUpdate(id, { status: "E" });

    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get("/workplace/:workplaceId", async (req, res) => {
  try {
    let salasWorkplace = [];
    const salas = await Sala.find({
      workplaceId: req.params.workplaceId,
      status: { $ne: "E" },
    });

    for (let sala of salas) {
      const arquivos = await Arquivo.find({
        model: "Sala",
        referenciaId: sala._id,
      });
      const especialidades = await SalaServico.find({
        salaId: sala._id,
      });
      salasWorkplace.push({
        ...sala._doc,
        arquivos,
        especialidades: especialidades.map(
          (especialidade) => especialidade.servicoId
        ),
      });
    }

    res.json({
      salas: salasWorkplace,
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;
