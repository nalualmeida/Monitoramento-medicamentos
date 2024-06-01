import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import medicamentosRouter from './routes/medicamentos.js';

import sqlite3 from "sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 4000;

app.use(bodyParser.urlencoded({ extended: true }));

// Conexão banco de dados SQLite
let db = new sqlite3.Database('./DB-Lembrete Medicamentos', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conexão bem sucedida ao banco de dados.');
  }
});

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use('/api', medicamentosRouter);

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.post("/signup", async (req, res) => {
  const { nome, dataNascimento, email, senha } = req.body;

  try {
    const checkResult = await db.get("SELECT * FROM users WHERE email = ?", [email]);

    // if (checkResult) {
    //   res.send("Este usuário já existe! Tente fazer login em sua conta.");
    // } else {
      db.run(
        `INSERT INTO users (nome, dataNascimento, email, senha) VALUES (?, ?, ?, ?)`,
        [nome, dataNascimento, email, senha],
        function (err) {
          if (err) {
            console.error('Erro ao inserir usuário:', err.message);
            res.send('Erro ao adicionar usuário');
          } else {
            console.log(`Usuário adicionado com sucesso, ID: ${this.lastID}`);
            res.redirect("/inicioHoje");
          }
        }
      );
    } catch (err) {
    console.error('Erro ao verificar usuário:', err.message);
    res.status(500).send('Erro interno do servidor');
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    console.log("Email inserido:", email);

    const checkResult = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    console.log("Resultado da consulta:", checkResult);

    if (checkResult) {
      console.log("Dados do usuário:", checkResult);
      const user = checkResult;
      const senhaSalva = user.senha;
      console.log("Senha salva no banco de dados:", senhaSalva);

      if (senha === senhaSalva) {
        console.log("Login bem-sucedido!");
        res.render("hoje.ejs");
      } else {
        console.log("Senha incorreta. Senha inserida:", senha);
        res.send("Senha incorreta");
      }
    } else {
      console.log("Usuário não encontrado.");
      res.send("Usuário não encontrado");
    }
  } catch (err) {
    console.error("Erro durante a autenticação:", err);
    res.status(500).send("Erro durante a autenticação");
  }
});

// app.post("/login", async (req, res) => {
//   const { email, senha } = req.body;

//   try {
//     const checkResult = await db.get("SELECT * FROM users WHERE email = ?", [email]);

//     if (checkResult) {
//       const user = checkResult;
//       const senhaSalva = user.senha;
//       if (senha === senhaSalva) {
//         res.render("hoje.ejs");
//       } else {
//         res.send("Senha incorreta");
//       }
//     } else {
//       res.send("Usuário não encontrado");
//     }
//   } catch (err) {
//     console.log(err);
//   }
// });

app.get("/inicioHoje", (req, res) => {
  res.render("inicioHoje.ejs");
});

app.get("/inicioHoje", (req, res) => {
  res.sendFile(__dirname + "/inicioHoje.ejs");
  });

app.get('/hoje', (req, res) => {
    db.all(`SELECT * FROM lembretes`, (err, lembretes) => {
      if (err) {
        console.error('Erro ao consultar lembretes:', err.message);
        res.send('Erro ao consultar lembretes');
        return;
      } else {
        res.render("hoje.ejs", { lembretes });
      }
      
      // db.get(`SELECT COUNT(*) AS count FROM lembretes`, (err, result) => {
      //   if (err) {
      //     console.error('Erro ao contar lembretes:', err.message);
      //     res.send('Erro ao contar lembretes');
      //     return;
      //   }
        
      //   const hasInfoHoje = result.count > 0; // Verificar se há lembretes
      //   console.log('hasInfoHoje:', hasInfoHoje);
      //   // Renderiza a página 'hoje.ejs' e passa 'lembretes' e 'hasInfoHoje' como parâmetros
      //   res.render("hoje.ejs", { lembretes, hasInfoHoje });
      // });
    });
  });  

app.get("/inicioProgresso", (req, res) => {
  res.render("inicioProgresso.ejs");
});

app.get("/inicioSuporte", (req, res) => {
  res.render("inicioSuporte.ejs");
});

app.get('/suporte', (req, res) => {
  db.all(`SELECT * FROM consultas`, (err, consultas) => {
    if (err) {
      console.error('Erro ao consultar consultas:', err.message);
      res.send('Erro ao consultar consultas');
      return;
    }

    db.all(`SELECT * FROM medicos`, (err, medicos) => {
      if (err) {
        console.error('Erro ao consultar medicos:', err.message);
        res.send('Erro ao consultar medicos');
        return;
      }

      res.render("suporte.ejs", { consultas, medicos });

      // db.get(`SELECT COUNT(*) AS countConsultas FROM consultas`, (err, resultConsultas) => {
      //   if (err) {
      //     console.error('Erro ao contar consultas', err.message);
      //     res.send('Erro ao contar consultas');
      //     return;
      //   }
      //   db.get(`SELECT COUNT(*) AS countMedicos FROM medicos`, (err, resultMedicos) => {
      //     if (err) {
      //       console.error('Erro ao contar médicos:', err.message);
      //       res.send('Erro ao contar médicos');
      //       return;
      //     }

      //     const hasInfoSuporte = resultConsultas.countConsultas > 0 || resultMedicos.countMedicos > 0;
      //     console.log('hasInfoSuporte:', hasInfoSuporte); // Adiciona um log para verificar o valor de hasInfoSuporte

      //     // Renderiza a página 'suporte.ejs' e passa 'consultas', 'medicos' e 'hasInfoSuporte' como parâmetros
      //     res.render("suporte.ejs", { consultas, medicos, hasInfoSuporte });
      //   });
      // });
    });
  });
});

app.get("/addConsulta", (req, res) => {
  res.render("addConsulta.ejs");
});

app.post("/addConsulta", (req, res) => {
  const { especialidade, anotacoes, data, horario } = req.body;

  db.run(`INSERT INTO consultas (especialidade, anotacoes, data, horario) VALUES (?, ?, ?, ?)`,
        [especialidade, anotacoes, data, horario],
        function(err) {
            if (err) {
                console.error('Erro ao inserir consulta:', err.message);
                res.send('Erro ao adicionar consulta');
            } else {
                console.log(`Consulta adicionada com sucesso, ID: ${this.lastID}`);
                res.redirect("/suporte");
            }
        }
    );
});

app.get("/addMedico", (req, res) => {
  res.render("addMedico.ejs");
});

app.post("/addMedico", (req, res) => {
  const { nome_medico, especialidade, endereco, numero_contato, email, website } = req.body;

  db.run(`INSERT INTO medicos (nome_medico, especialidade, endereco, numero_contato, email, website) VALUES (?, ?, ?, ?, ?, ?)`,
        [nome_medico, especialidade, endereco, numero_contato, email, website],
        function(err) {
            if (err) {
                console.error('Erro ao inserir medico:', err.message);
                res.send('Erro ao adicionar medico');
            } else {
                console.log(`Médico adicionado com sucesso, ID: ${this.lastID}`);
                res.redirect("/suporte");
            }
        }
    );
});

app.get("/inicioTratamento", (req, res) => {
  res.render("inicioTratamento.ejs");
});

app.get('/tratamento', (req, res) => {
  db.all(`SELECT * FROM lembretes`, (err, lembretes) => {
    if (err) {
      console.error('Erro ao consultar lembretes:', err.message);
      res.send('Erro ao consultar lembretes');
    } else {
      res.render("tratamento.ejs", { lembretes });
    }
  });

  // db.get(`SELECT COUNT(*) AS count FROM lembretes`, (err, result) => {
  //   if (err) {
  //     console.error('Erro ao contar lembretes:', err.message);
  //     res.send('Erro ao contar lembretes');
  //   } else {
  //     const hasInfoTratamento = result.count > 0; // Verificar se há lembretes
  //     res.render("tratamento.ejs", { hasInfoTratamento });
  //   }
  // });
});

app.get('/addLembrete', (req, res) => {
      res.render('addLembrete');
    });

app.post("/addLembrete", (req, res) => {
      const { nome_medicamento, frequencia, horario, dose } = req.body;
    
      db.run(`INSERT INTO lembretes (nome_medicamento, frequencia, horario, dose) VALUES (?, ?, ?, ?)`,
            [nome_medicamento, frequencia, horario, dose],
            function(err) {
                if (err) {
                    console.error('Erro ao inserir lembrete:', err.message);
                    res.send('Erro ao adicionar lembrete');
                } else {
                    console.log(`Lembrete adicionado com sucesso, ID: ${this.lastID}`);
                    res.redirect("/tratamento");
                }
            }
        );
    });       

app.get('/addInventario', (req, res) => {
  res.render('addInventario');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
