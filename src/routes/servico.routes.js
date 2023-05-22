const express = require("express");
const router = express.Router();
const aws = require("../services/aws");
const Arquivo = require("../models/arquivo");
const Servico = require("../models/servico");
const Busboy = require("busboy");
const consts = require("../data/consts");

router.post("/", async (req, res) => {
  let busboy = Busboy({ headers: req.headers });
  busboy.on("finish", async () => {
    try {
      const { workplaceId, servico } = req.body;
      let errors = [];
      let arquivos = [];

      if (req.files && Object.keys(req.files).length > 0) {
        for (let key of Object.keys(req.files)) {
          const file = req.files[key];

          const nameParts = file.name.split(".");
          const fileName = `${new Date().getTime()}.${
            nameParts[nameParts.length - 1]
          }`;
          const path = `servicos/${workplaceId}/${fileName}`;

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

      // criar serviço
      let jsonServico = JSON.parse(servico);
      const servicoCadastrado = await Servico(jsonServico).save();

      await ColaboradorServico.insertMany({
        servicoId: servicoCadastrado._id,
        colaboradorId: consts.colaboradorId,
      });

      // criar arquivo
      arquivos = arquivos.map((arquivo) => ({
        referenciaId: servicoCadastrado._id,
        model: "Servico",
        caminho: arquivo,
      }));

      await Arquivo.insertMany(arquivos);

      res.json({ servico: servicoCadastrado, arquivos });
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
      const { workplaceId, servico } = req.body;
      let errors = [];
      let arquivos = [];

      if (req.files && Object.keys(req.files).length > 0) {
        for (let key of Object.keys(req.files)) {
          const file = req.files[key];

          const nameParts = file.name.split(".");
          const fileName = `${new Date().getTime()}.${
            nameParts[nameParts.length - 1]
          }`;
          const path = `servicos/${workplaceId}/${fileName}`;

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

      // procurar serviço
      const jsonServico = JSON.parse(servico);
      await Servico.findByIdAndUpdate(req.params.id, jsonServico);

      // criar arquivo
      arquivos = arquivos.map((arquivo) => ({
        referenciaId: req.params.id,
        model: "Servico",
        caminho: arquivo,
      }));

      await Arquivo.insertMany(arquivos);

      res.json({ error: false });
    } catch (err) {
      res.json({ error: true, message: err.message });
    }
  });
  req.pipe(busboy);
});

router.post("/delete-arquivo", async (req, res) => {
  try {
    const { key } = req.body;

    //excluir aws
    await aws.deleteFileS3(key);

    //excluir banco
    await Arquivo.findOneAndDelete({
      caminho: key,
    });

    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Servico.findByIdAndUpdate(id, { status: "E" });

    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get("/workplace/:workplaceId", async (req, res) => {
  try {
    let servicosWorkplace = [];
    const servicos = await Servico.find({
      workplaceId: req.params.workplaceId,
      status: { $ne: "E" },
    });

    for (let servico of servicos) {
      const arquivos = await Arquivo.find({
        model: "Servico",
        referenciaId: servico._id,
      });
      servicosWorkplace.push({ ...servico._doc, arquivos });
    }
    res.json({
      servicos: servicosWorkplace,
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;
