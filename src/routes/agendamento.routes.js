const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
//const pagarme = require("../services/pagarme");
const Servico = require("../models/servico");
const Colaborador = require("../models/colaborador");
const Agendamento = require("../models/agendamento");
const Horario = require("../models/horario");
const util = require("../utils");
const _ = require("lodash");
//const keys = require("../data/keys.json");
const moment = require("moment");
const SalaServico = require("../models/relationship/salaServico");
const Sala = require("../models/sala");

router.post("/", async (req, res) => {
  const db = mongoose.connection;
  const session = await db.startSession();
  session.startTransaction();
  try {
    const { clienteId, workplaceId, servicoId, colaboradorId, data, duracao } =
      req.body;
    let agendamento;
    //recuperar o serviço
    const servico = await Servico.findById(servicoId).select(
      "preco nome comissao"
    );

    const salaRelation = await SalaServico.find({ servicoId }).populate({
      path: "salaId",
      select: "_id",
    });

    /*
    //recuperar o cliente
    const cliente = await Cliente.findById(clienteId).select(
      "nome endereco customerId"
    );

    //recuperar o workplace
    const workplace = await Workplace.findById(workplaceId).select(
      "recipientId"
    );

    //recuperar o colaborador
    const colaborador = await Colaborador.findById(colaboradorId).select(
      "recipientId"
    );

    //criando pagamento
    const precoFinal = util.toCents(servico.preco) * 100;

    
    const colaboradorSplitRule = {
      recipient_id: colaborador.receipientId,
      amount: parseInt(precoFinal * (servico.comissao / 100)),
    };

    const createPayment = await pagarme("/transactions", {
      amount: precoFinal,
      //dados cartão
      card_number: "4556366941062122",
      card_cvv: "111",
      card_holder_name: "Aardvark da Silva",
      card_expiration_date: "1220",
      //dados do cliente
      customer: {
        id: cliente.customerId,
      },
      billing: {
        name: cliente.nome,
        address: {
          zipcode: cliente.endereco.cep,
          street: cliente.endereco.logradouro,
          street_number: cliente.endereco.numero,
          state: cliente.endereco.uf,
          country: cliente.endereco.pais,
          city: cliente.endereco.cidade,
        },
      },
      items: [
        {
          id: servicoId,
          title: servico.nome,
          unit_price: precoFinal,
          quantity: 1,
          tangible: false,
        },
      ],
      split_rules: [
        {
          recipient_id: workplace.recipientId,
          amount: precoFinal - keys.app_fee - colaboradorSplitRule.amount,
        },
        colaboradorSplitRule,
      ],
    });

    if (createPayment.error) {
      throw createPayment;
    }
*/

    const checkAgendamento = await Agendamento.find({
      clienteId: clienteId,
      data: data,
      duracao: duracao,
    }).count();
    console.log(checkAgendamento);

    if (checkAgendamento === 0) {
      const checkSalaMesas = await Sala.findById({
        _id: salaRelation[0].salaId._id,
      }).select("mesas");
      const checkOcupacao = await Agendamento.countDocuments({
        salaId: salaRelation[0].salaId,
        data: data,
      });
      if (checkOcupacao < checkSalaMesas.mesas) {
        //criar agendamento
        agendamento = await new Agendamento({
          servicoId,
          clienteId,
          salaId: salaRelation[0].salaId,
          workplaceId,
          colaboradorId,
          data: data,
          duracao: duracao,
        }).save({ session });

        await session.commitTransaction();
        session.endSession();
        res.json({ error: false, agendamento });
      } else {
        await session.abortTransaction();
        session.endSession();
        res.json({
          error: true,
          message: "Desculpe, horário esgotado para essa sala.",
        });
      }
    } else {
      await session.abortTransaction();
      session.endSession();
      res.json({
        error: true,
        message: "Você já tem um agendamento para essa sala e horário.",
      });
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.json({ error: true, message: err.message });
  }
});

router.post("/filter", async (req, res) => {
  try {
    const { range, workplaceId } = req.body;

    const agendamentos = await Agendamento.find({
      workplaceId,
      data: {
        $gte: moment(range.inicio).startOf("day"),
        $lte: moment(range.final).endOf("day"),
      },
    }).populate([
      { path: "servicoId", select: "nome" },
      { path: "colaboradorId", select: "nome" },
      { path: "clienteId", select: "nome" },
    ]);

    res.json({ error: false, agendamentos });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post("/cliente/filter", async (req, res) => {
  try {
    const { range, clienteId } = req.body;

    const agendamentos = await Agendamento.find({
      clienteId,
      data: {
        $gte: moment(range.inicio).startOf("day"),
        $lte: moment(range.final).endOf("day"),
      },
    }).populate([
      { path: "servicoId", select: "nome" },
      { path: "colaboradorId", select: "nome" },
      { path: "workplaceId", select: "nome capa" },
    ]);

    res.json({ error: false, agendamentos });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post("/dias-disponiveis", async (req, res) => {
  try {
    const { data, workplaceId, servicoId } = req.body;
    const horarios = await Horario.find({ workplaceId });
    const servico = await Servico.findById(servicoId).select("duracao");
    let colaboradores = [];

    let agenda = [];
    let lastDay = moment(data);

    // DURAÇÃO DO SERVIÇO
    const servicoDuracao = util.hourToMinutes(
      moment(servico.duracao).format("HH:mm")
    );
    const servicoDuracaoSlots = util.sliceMinutes(
      moment(servico.duracao),
      moment(servico.duracao).add(servicoDuracao, "minutes"),
      util.SLOT_DURATION,
      false
    ).length;

    for (let i = 0; i <= 365 && agenda.length <= 7; i++) {
      const espacosValidos = horarios.filter((h) => {
        // VERIFICAR DIA DA SEMANA
        const diaSemanaDisponivel = h.dias.includes(moment(lastDay).day());

        // VERIFICAR ESPECIALIDADE DISPONÍVEL
        const servicosDisponiveis = h.especialidades.includes(servicoId);

        return diaSemanaDisponivel && servicosDisponiveis;
      });

      if (espacosValidos.length > 0) {
        // TODOS OS HORÁRIOS DISPONÍVEIS DAQUELE DIA
        let todosHorariosDia = {};
        for (let espaco of espacosValidos) {
          for (let colaborador of espaco.colaboradores) {
            if (!todosHorariosDia[colaborador._id]) {
              todosHorariosDia[colaborador._id] = [];
            }
            todosHorariosDia[colaborador._id] = [
              ...todosHorariosDia[colaborador._id],
              ...util.sliceMinutes(
                util.mergeDateTime(lastDay, espaco.inicio),
                util.mergeDateTime(lastDay, espaco.fim),
                util.SLOT_DURATION
              ),
            ];
          }
        }

        // SE TODOS OS ESPECIALISTAS DISPONÍVEIS ESTIVEREM OCUPADOS NO HORÁRIO, REMOVER
        for (let colaboradorKey of Object.keys(todosHorariosDia)) {
          // LER AGENDAMENTOS DAQUELE ESPECIALISTA NAQUELE DIA
          const agendamentos = await Agendamento.find({
            colaboradorId: colaboradorKey,
            data: {
              $gte: moment(lastDay).startOf("day"),
              $lte: moment(lastDay).endOf("day"),
            },
          }).select("data duracao -_id");

          // RECUPERANDO HORÁRIOS OCUPADOS
          let horariosOcupado = agendamentos.map((a) => ({
            inicio: moment(a.data),
            fim: moment(a.data).add(a.duracao * 60, "minutes"),
          }));

          horariosOcupado = horariosOcupado
            .map((h) =>
              util.sliceMinutes(h.inicio, h.fim, util.SLOT_DURATION, false)
            )
            .flat();

          // REMOVENDO TODOS OS HORÁRIOS QUE ESTÃO OCUPADOS
          let horariosLivres = util.splitByValue(
            _.uniq(
              todosHorariosDia[colaboradorKey].map((h) => {
                return horariosOcupado.includes(h) ? "-" : h;
              })
            ),
            "-"
          );

          // VERIFICANDO SE NOS HORÁRIOS CONTINUOS EXISTE SPAÇO SUFICIENTE NO SLOT
          horariosLivres = horariosLivres.filter(
            (h) => h.length >= servicoDuracaoSlots
          );

          /* VERIFICANDO OS HORÁRIOS DENTRO DO SLOT 
            QUE TENHAM A CONTINUIDADE NECESSÁRIA DO SERVIÇO
          */
          horariosLivres = horariosLivres
            .map((slot) =>
              slot.filter(
                (horario, index) => slot.length - index >= servicoDuracaoSlots
              )
            )
            .flat();

          // SEPARANDO 2 EM 2
          horariosLivres = _.chunk(horariosLivres, 2);

          // REMOVENDO O COLABORADOR DO DIA, CASO NÃO TENHA ESPAÇOS NA AGENDA
          if (horariosLivres.length === 0) {
            todosHorariosDia = _.omit(todosHorariosDia, colaboradorKey);
          } else {
            todosHorariosDia[colaboradorKey] = horariosLivres;
          }
        }

        // VERIFICANDO SE TEM ESPECIALISTA COMA AGENDA NAQUELE DIA
        const totalColaboradores = Object.keys(todosHorariosDia).length;

        if (totalColaboradores > 0) {
          colaboradores.push(Object.keys(todosHorariosDia));
          agenda.push({
            [moment(lastDay).format("YYYY-MM-DD")]: todosHorariosDia,
          });
        }
      }

      lastDay = moment(lastDay).add(1, "day");
    }

    colaboradores = await Colaborador.find({
      _id: { $in: _.uniq(colaboradores.flat()) },
    }).select("nome foto");

    colaboradores = colaboradores.map((c) => ({
      ...c._doc,
      nome: c.nome.split(" ")[0],
    }));

    res.json({ error: false, colaboradores, agenda });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post("/salas-disponiveis", async (req, res) => {
  try {
    const { data, workplaceId, servicoId, colaboradorId } = req.body;
    const horarios = await Horario.find({ workplaceId });
    const servico = await Servico.findById(servicoId).select("duracao");

    let especialidades = [];

    let agenda = [];
    let lastDay = moment(data);
    let horariosLivres;

    for (let i = 0; i <= 365 && agenda.length <= 7; i++) {
      const espacosValidos = horarios.filter((h) => {
        // VERIFICAR DIA DA SEMANA
        const diaSemanaDisponivel = h.dias.includes(moment(lastDay).day());

        // VERIFICAR ESPECIALIDADE DISPONÍVEL
        const servicosDisponiveis = h.especialidades.includes(servicoId);

        return diaSemanaDisponivel && servicosDisponiveis;
      });

      if (espacosValidos.length > 0) {
        // TODOS OS HORÁRIOS DISPONÍVEIS DAQUELE DIA
        let todosHorariosDia = {};
        for (let espaco of espacosValidos) {
          for (let servico of espaco.especialidades) {
            if (!todosHorariosDia[servico._id]) {
              todosHorariosDia[servico._id] = [];
            }
            todosHorariosDia[servico._id] = [
              ...todosHorariosDia[servico._id],
              ...util.sliceMinutes(
                util.mergeDateTime(lastDay, espaco.inicio),
                util.mergeDateTime(lastDay, espaco.fim),
                util.SLOT_DURATION
              ),
            ];
          }
        }

        // SE TODOS OS SALAS DAQUELES SERVIÇOS DISPONÍVEIS ESTIVEREM OCUPADOS NO HORÁRIO, REMOVER
        for (let servicoKey of Object.keys(todosHorariosDia)) {
          let salas = await SalaServico.find({ servicoId: servicoKey }).select(
            "-_id salaId"
          );
          let somaMesas = 0;
          let numReserva = 0;
          let horariosOcupado;

          for (let sala of salas) {
            let salaId = await Sala.findById(sala.salaId).select("_id");
            let salaKey = salaId._id;
            let mesas = await Sala.findById(salaKey).select("-_id mesas");
            mesas = mesas.mesas;
            somaMesas = somaMesas + mesas;
          }

          // LER AGENDAMENTOS DAQUELE SERVICO NAQUELE DIA
          const agendamentos = await Agendamento.find({
            servicoId: servicoKey,
            data: {
              $gte: moment(lastDay).startOf("day"),
              $lte: moment(lastDay).endOf("day"),
            },
          }).select("data duracao salaId -_id");

          for (let agendamento of agendamentos) {
            // RECUPERANDO HORÁRIOS OCUPADOS
            horariosOcupado = {
              inicio: moment(agendamento.data),
              fim: moment(agendamento.data).add(
                agendamento.duracao * 60,
                "minutes"
              ),
            };
            const agendamentoDuracaoSlots = util.sliceMinutes(
              moment(agendamento.data),
              moment(agendamento.data).add(agendamento.duracao, "minutes"),
              util.SLOT_DURATION,
              false
            ).length;
            numReserva = await Agendamento.countDocuments({
              salaId: agendamento.salaId,
              data: {
                $gte: horariosOcupado.inicio,
                $lte: horariosOcupado.fim,
              },
            });
            if (numReserva >= somaMesas) {
              horariosOcupado = util
                .sliceMinutes(
                  horariosOcupado.inicio,
                  horariosOcupado.fim,
                  util.SLOT_DURATION,
                  false
                )
                .flat();
              horariosLivres = util.splitByValue(
                _.uniq(
                  todosHorariosDia[servicoKey].map((h) => {
                    return horariosOcupado.includes(h) ? "-" : h;
                  })
                ),
                "-"
              );

              horariosLivres = horariosLivres.filter(
                (h) => h.length >= agendamentoDuracaoSlots
              );
              horariosLivres = horariosLivres
                .map((slot) =>
                  slot.filter(
                    (horario, index) =>
                      slot.length - index >= agendamentoDuracaoSlots
                  )
                )
                .flat();
            }
            // REMOVENDO O COLABORADOR DO DIA, CASO NÃO TENHA ESPAÇOS NA AGENDA
            if (horariosLivres.length === 0) {
              todosHorariosDia = _.omit(todosHorariosDia, servicoKey);
            } else {
              todosHorariosDia[servicoKey] = horariosLivres;
            }
          }
          // SEPARANDO 2 EM 2
          todosHorariosDia[servicoKey] = _.chunk(
            todosHorariosDia[servicoKey],
            2
          );
        }

        const totalServicos = Object.keys(todosHorariosDia).length;

        if (totalServicos > 0) {
          especialidades.push(Object.keys(todosHorariosDia));
          agenda.push({
            [moment(lastDay).format("YYYY-MM-DD")]: todosHorariosDia,
          });
        }
      }

      lastDay = moment(lastDay).add(1, "day");
    }

    especialidades = await Servico.find({
      _id: { $in: _.uniq(especialidades.flat()) },
    }).select("nome foto");

    especialidades = especialidades.map((c) => ({
      ...c._doc,
      nome: c.nome.split(" ")[0],
    }));

    res.json({ error: false, especialidades, agenda });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.post("/horarios-disponiveis", async (req, res) => {
  try {
    const { data, workplaceId, servicoId, colaboradorId } = req.body;
    const horarios = await Horario.find({ workplaceId });
    let colaboradores = [];
    let especialidades = [];

    let agenda = [];
    let lastDay = moment(data);
    let horariosLivres;

    const espacosValidosColab = horarios.filter((h) => {
      const checkHorario = h.dias.includes(moment(lastDay).day());
      if (checkHorario === true) {
        return h;
      }
    });

    if (espacosValidosColab.length > 0) {
      const colaboradoresDisponiveis = espacosValidosColab
        .map((h) => h.colaboradores)
        .flat();
      colaboradores = colaboradoresDisponiveis;
    }

    for (let i = 0; i <= 365 && agenda.length <= 7; i++) {
      const espacosValidos = horarios.filter((h) => {
        // VERIFICAR DIA DA SEMANA
        const diaSemanaDisponivel = h.dias.includes(moment(lastDay).day());

        // VERIFICAR ESPECIALIDADE DISPONÍVEL
        const servicosDisponiveis = h.especialidades.includes(servicoId);

        return diaSemanaDisponivel && servicosDisponiveis;
      });

      if (espacosValidos.length > 0) {
        // TODOS OS HORÁRIOS DISPONÍVEIS DAQUELE DIA
        let todosHorariosDia = {};
        for (let espaco of espacosValidos) {
          for (let servico of espaco.especialidades) {
            if (!todosHorariosDia[servico._id]) {
              todosHorariosDia[servico._id] = [];
            }
            todosHorariosDia[servico._id] = [
              ...todosHorariosDia[servico._id],
              ...util.sliceMinutes(
                util.mergeDateTime(lastDay, espaco.inicio),
                util.mergeDateTime(lastDay, espaco.fim),
                util.SLOT_DURATION
              ),
            ];
          }
        }

        // SE TODOS OS SALAS DAQUELES SERVIÇOS DISPONÍVEIS ESTIVEREM OCUPADOS NO HORÁRIO, REMOVER
        for (let servicoKey of Object.keys(todosHorariosDia)) {
          let salas = await SalaServico.find({ servicoId: servicoKey }).select(
            "-_id salaId"
          );
          let somaMesas = 0;
          let numReserva = 0;
          let horariosOcupado;

          for (let sala of salas) {
            let salaId = await Sala.findById(sala.salaId).select("_id");
            let salaKey = salaId._id;
            let mesas = await Sala.findById(salaKey).select("-_id mesas");
            mesas = mesas.mesas;
            somaMesas = somaMesas + mesas;
          }

          // LER AGENDAMENTOS DAQUELE SERVICO NAQUELE DIA
          const agendamentos = await Agendamento.find({
            servicoId: servicoKey,
            data: {
              $gte: moment(lastDay).startOf("day"),
              $lte: moment(lastDay).endOf("day"),
            },
          }).select("data duracao salaId -_id");

          for (let agendamento of agendamentos) {
            // RECUPERANDO HORÁRIOS OCUPADOS
            horariosOcupado = {
              inicio: moment(agendamento.data),
              fim: moment(agendamento.data).add(
                agendamento.duracao * 60,
                "minutes"
              ),
            };
            const agendamentoDuracaoSlots = util.sliceMinutes(
              moment(agendamento.data),
              moment(agendamento.data).add(agendamento.duracao, "minutes"),
              util.SLOT_DURATION,
              false
            ).length;
            numReserva = await Agendamento.countDocuments({
              salaId: agendamento.salaId,
              data: {
                $gte: horariosOcupado.inicio,
                $lte: horariosOcupado.fim,
              },
            });
            if (numReserva >= somaMesas) {
              horariosOcupado = util
                .sliceMinutes(
                  horariosOcupado.inicio,
                  horariosOcupado.fim,
                  util.SLOT_DURATION,
                  false
                )
                .flat();
              horariosLivres = util.splitByValue(
                _.uniq(
                  todosHorariosDia[servicoKey].map((h) => {
                    return horariosOcupado.includes(h) ? "-" : h;
                  })
                ),
                "-"
              );

              horariosLivres = horariosLivres.filter(
                (h) => h.length >= agendamentoDuracaoSlots
              );
              horariosLivres = horariosLivres
                .map((slot) =>
                  slot.filter(
                    (horario, index) =>
                      slot.length - index >= agendamentoDuracaoSlots
                  )
                )
                .flat();
            }
            // REMOVENDO O COLABORADOR DO DIA, CASO NÃO TENHA ESPAÇOS NA AGENDA
            if (horariosLivres.length === 0) {
              todosHorariosDia = _.omit(todosHorariosDia, servicoKey);
            } else {
              todosHorariosDia[servicoKey] = horariosLivres;
            }
          }
          // SEPARANDO 2 EM 2
          todosHorariosDia[servicoKey] = _.chunk(
            todosHorariosDia[servicoKey],
            2
          );
        }

        const totalServicos = Object.keys(todosHorariosDia).length;

        if (totalServicos > 0) {
          especialidades.push(Object.keys(todosHorariosDia));
          agenda.push({
            [moment(lastDay).format("YYYY-MM-DD")]: todosHorariosDia,
          });
        }
      }

      lastDay = moment(lastDay).add(1, "day");
    }

    especialidades = await Servico.find({
      _id: { $in: _.uniq(especialidades.flat()) },
    }).select("nome");

    colaboradores = await Colaborador.find({
      _id: { $in: _.uniq(colaboradores.flat()) },
    }).select("nome foto");

    colaboradores = colaboradores.map((c) => ({
      ...c._doc,
      nome: c.nome.split(" ")[0],
    }));

    res.json({ error: false, colaboradores, especialidades, agenda });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.delete("/:_id", async (req, res) => {
  try {
    const { _id } = req.params;

    await Agendamento.findByIdAndDelete(_id);

    res.json({ error: false });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;
