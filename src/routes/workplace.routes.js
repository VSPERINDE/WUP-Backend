const express = require("express");
const router = express.Router();
const Workplace = require("../models/workplace");
const Servico = require("../models/servico");
const Sala = require("../models/sala");
const Horario = require("../models/horario");
const turf = require("@turf/turf");
const moment = require("moment");
const util = require("../utils");
const crypto = require("crypto");

router.post("/", async (req, res) => {
  try {
    const workplace = await new Workplace(req.body).save();
    res.json({ workplace });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get("/servicos/:workplaceId", async (req, res) => {
  try {
    const { workplaceId } = req.params;
    const servicos = await Servico.find({
      workplaceId,
      status: "A",
    }).select("_id nome");

    /* [{ label: 'Serviço', value: '1233412312432' }] */
    res.json({
      servicos: servicos.map((s) => ({ label: s.nome, value: s._id })),
    });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const workplace = await Workplace.findById(req.params.id).select(
      "capa nome endereco.cidade geo.coordinates telefone"
    );

    //distancia
    const distance = turf
      .distance(
        turf.point(workplace.geo.coordinates),
        turf.point([-29.909539376890113, -51.14866941803716])
      )
      .toFixed(2);

    res.json({ error: false, workplace, distance });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get("/homepage/:id", async (req, res) => {
  try {
    const workplace = await Workplace.findById(req.params.id).select(
      "email capa nome telefone"
    );
    const data = {
      email: workplace.email,
      _id: workplace._id,
      capa: workplace.capa,
      nome: workplace.nome,
    };

    res.send(data);
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post("/filter", async (req, res) => {
  try {
    const workplaces = await Workplace.find(req.body.filters).select(
      "capa nome endereco telefone foto"
    );
    res.json({ error: false, workplaces });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post("/filter-complete", async (req, res) => {
  try {
    const workplaces = await Workplace.find(req.body.filters);

    let result = [];
    for (let workplace of workplaces) {
      const salas = await Sala.find({
        workplaceId: workplace._id,
        status: { $ne: "E" },
      });
      const horarios = await Horario.find({ workplaceId: workplace._id });

      const isOpenNow = util.isOpened(horarios);

      let lotacao_max_total = 0;
      for (let sala of salas) {
        lotacao_max_total = lotacao_max_total + sala.mesas;
      }
      let todosHorarios = [];
      for (let horario of horarios) {
        const horarioDia = {
          dias: horario.dias,
          funcionamento: {
            inicio: horario.inicio,
            fim: horario.fim,
          },
        };
        todosHorarios.push(horarioDia);
      }
      const workplaces = {
        _id: workplace._id,
        nome: workplace.nome,
        foto: workplace.foto,
        capa: workplace.capa,
        email: workplace.email,
        telefone: workplace.telefone,
        endereco: workplace.endereco,
        geo: workplace.geo,
        todosHorarios,
        lotacao_max_total,
        isOpenNow,
      };
      result.push(workplaces);
    }

    res.json({ error: false, result });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    // buscar o workplace com o nome de usuário fornecido
    const workplace = await Workplace.findOne({ email });

    if (!workplace) {
      // caso o workplace não seja encontrado, retornar erro 401
      return res
        .status(401)
        .json({ message: "Nome de usuário ou senha inválidos." });
    }

    // verificar se a senha fornecida é válida
    if (workplace.senha) {
      const hash = crypto
        .pbkdf2Sync(senha, workplace.senha.salt, 1000, 64, "sha512")
        .toString("hex");
      if (hash === workplace.senha.hash) {
        // Usuário autenticado com sucesso
        const data = { email: workplace.email, _id: workplace._id };
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
  const { nome, foto, capa, email, senha, telefone, endereco } = req.body;

  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .pbkdf2Sync(senha, salt, 1000, 64, "sha512")
    .toString("hex");

  // criar novo workplace com os dados fornecidos
  const newWorkplace = new Workplace({
    nome,
    foto,
    capa,
    email,
    senha: { hash, salt },
    telefone,
    endereco,
  });

  try {
    // salvar o novo workplace no banco de dados
    const savedWorkplace = await newWorkplace.save();

    // retornar o workplace criado
    res.json(savedWorkplace);
  } catch (error) {
    // caso ocorra um erro ao salvar o novo workplace, retornar o erro
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
