import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { promisify } from 'util';
import sqlite3 from "sqlite3";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import crypto from 'crypto'
import medicamentosRouter from './routes/medicamentos.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 4000;

app.use(bodyParser.urlencoded({ extended: true }));

const secret = crypto.randomBytes(64).toString('hex');

app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: true
}));

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login'); // ou enviar uma resposta de erro
  }
  next();
};

// Conexão banco de dados SQLite
let db = new sqlite3.Database('./DB-Lembrete Medicamentos', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conexão bem sucedida ao banco de dados.');
  }
});

const dbGet = promisify(db.get).bind(db);
const dbAll = promisify(db.all).bind(db);
const dbRun = promisify(db.run).bind(db);

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
  const { nome_usuario, data_nascimento, email, senha } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);
    const user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);

    if (user) {
      res.send("Este usuário já existe! Tente fazer login em sua conta.");
    } else {
      await dbRun(
        `INSERT INTO users (nome_usuario, data_nascimento, email, senha) VALUES (?, ?, ?, ?)`,
        [nome_usuario, data_nascimento, email, hashedPassword]
      );
      req.session.userId = email; // Configurar a sessão com o email do usuário
      console.log("Novo usuário registrado e autenticado, ID do usuário:", req.session.userId);
      return res.redirect("/inicioHoje");
    }
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
    const user = await dbGet("SELECT * FROM users WHERE email = ?", [email]);
    if (user) {
      const senhaCorreta = await bcrypt.compare(senha, user.senha);
      if (senhaCorreta) {
        req.session.userId = user.email;
        console.log("Usuário autenticado, ID do usuário:", req.session.userId);
        res.redirect("/hoje");
      } else {
        res.send("Senha incorreta");
      }
    } else {
      res.send("Usuário não encontrado");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send('Erro interno do servidor');
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Erro ao encerrar sessão:", err);
      return res.status(500).send("Erro ao encerrar sessão");
    }
    res.redirect("/login");
  });
});

app.get("/alterarSenha", requireAuth, async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.redirect("/login");
  }

  try {
    const user = await dbGet('SELECT nome_usuario, email FROM users WHERE email = ?', [userId]);
    console.log(user)

    if (!user) {
      return res.redirect("/login");
    }

    res.render("alterarSenha", { user: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post("/alterarSenha/:email", async (req, res) => {
  const userId = req.session.userId;
  const emailId = req.params.email;
  const { senha, nova_senha } = req.body;

  if (!userId) {
    return res.redirect("/login");
  }

  try {
    const hashedPassword = await bcrypt.hash(nova_senha, 10);
    const user = await dbGet(
      "SELECT * FROM users WHERE email = ?",
      [emailId]
    );
    console.log("Usuário encontrado:", user)

    if (user) {
      const senhaCorreta = await bcrypt.compare(senha, user.senha);
      if (senhaCorreta) {
        await dbRun(
          `UPDATE users SET senha = ? WHERE email = ?`,
          [hashedPassword, emailId]
        );

        res.redirect("/hoje");
      } else {
        res.send("Senha incorreta");
      }
    } else {
      res.status(404).send("Usuário não encontrado");
    }
  } catch (err) {
    console.error("Erro ao obter usuário:", err.message);
    res.status(500).send("Erro ao carregar a página");
  }
});

app.get("/inicioHoje", requireAuth, (req, res) => {
  res.render("inicioHoje.ejs");
});

app.get("/inicioHoje", (req, res) => {
  res.sendFile(__dirname + "/inicioHoje.ejs");
  });

app.get('/hoje', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const user = await dbGet('SELECT nome_usuario, email FROM users WHERE email = ?', [userId]);
  if (!userId) {
      return res.redirect("/login");
  }
  try {
    const lembretes = await dbAll(
      "SELECT * FROM lembretes WHERE id_usuario = ?",
      [userId]
    );

      if (lembretes.length > 0) {
          res.render("hoje", { user: user, lembretes: lembretes });
      } else {
          res.render("inicioHoje");
      }
  } catch (err) {
      console.error("Erro ao obter lembretes:", err.message);
      res.status(500).send("Erro ao carregar a página");
  }
});

app.get("/alarme", requireAuth, (req, res) => {
  res.render("alarme.ejs");
});

app.get("/inicioProgresso", requireAuth, (req, res) => {
  res.render("inicioProgresso.ejs");
});

app.get("/progresso", requireAuth, (req, res) => {
  res.render("progresso.ejs");
});

app.get('/progresso', requireAuth, (req, res) => {
  res.sendFile(__dirname + "/progresso.ejs");

});

app.get("/inicioSuporte", requireAuth, (req, res) => {
  res.render("inicioSuporte.ejs");
});

app.get('/suporte', requireAuth, async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
      return res.redirect("/login");
  }

  try {
    const consultas = await dbAll(
      "SELECT * FROM consultas WHERE id_usuario = ?",
    [userId]
    );
    const medicos = await dbAll(
      "SELECT * FROM medicos WHERE id_usuario = ?",
    [userId]
    );

    if (consultas.length > 0 | medicos.length > 0) {
      res.render("suporte", { consultas, medicos });
  } else {
      res.render("inicioSuporte");
  } }catch (err) {
    console.error("Erro ao obter registros:", err.message);
    res.status(500).send("Erro ao carregar a página");
}
});

app.get("/addConsulta", requireAuth, (req, res) => {
  res.render("addConsulta.ejs");
});

app.post("/addConsulta", requireAuth, async (req, res) => {
  const { especialidade, anotacoes, data, horario } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).send('Usuário não autenticado');
  }

  try {
    await dbRun(
      `INSERT INTO consultas (id_usuario, especialidade, anotacoes, data, horario) VALUES (?, ?, ?, ?, ?)`,
        [userId, especialidade, anotacoes, data, horario]
    );
    res.redirect("/suporte");
  } catch (err) {
    console.error('Erro ao salvar consulta:', err.message);
    res.status(500).send('Erro ao salvar consulta');
  }
    
    });

    app.get("/editConsulta", requireAuth, (req, res) => {
      res.render("editConsulta.ejs");
    });
    
    app.get("/editConsulta/:id", async (req, res) => {
      const userId = req.session.userId;
      const consultaId = req.params.id;
    
      if (!userId) {
        return res.redirect("/login");
      }
    
      try {
        const consulta = await dbGet(
          "SELECT * FROM consultas WHERE id_consulta = ?",
          [consultaId]
        );
        console.log("Consulta encontrada:", consulta)
    
        if (consulta) {
          res.render("editConsulta", { consulta });
        } else {
          res.status(404).send("Consulta não encontrado");
        }
      } catch (err) {
        console.error("Erro ao obter consulta:", err.message);
        res.status(500).send("Erro ao carregar a página de edição");
      }
    });
    
    // Rota para processar a edição
    app.post("/editConsulta/:id", requireAuth, async (req, res) => {
      const { especialidade, anotacoes, data, horario } = req.body;
      const userId = req.session.userId;
      const consultaId = req.params.id;
    
      if (!userId) {
        return res.status(401).send('Usuário não autenticado');
      }
    
      try {
        await dbRun(
          `UPDATE consultas SET especialidade = ?, anotacoes = ?, data = ?, horario = ? WHERE id_consulta = ?`,
          [especialidade, anotacoes, data, horario, consultaId]
        );               
    
        res.redirect("/suporte");
      } catch (err) {
        console.error("Erro ao editar consulta:", err.message);
        res.status(500).send("Erro ao editar o consulta");
      }
    });
    

app.post("/deleteConsulta/:id", async (req, res) => {
  const userId = req.session.userId;
  const consultaId = req.params.id;

  if (!userId) {
    return res.redirect("/login");
  }

  try {
    const consulta = await dbGet(
      "SELECT * FROM consultas WHERE id_consulta = ?",
      [consultaId]
    );

    await dbRun(
      "DELETE FROM consultas WHERE id_consulta = ?",
      [consultaId]
    );
  
    res.redirect("/suporte");
  } catch (err) {
    console.error("Erro ao excluir consulta:", err.message);
    res.status(500).send("Erro ao excluir o consulta");
  }
});

app.get("/addMedico", requireAuth, (req, res) => {
  res.render("addMedico.ejs");
});

app.post("/addMedico", requireAuth, async (req, res) => {
  const { nome_medico, especialidade, endereco, numero_contato, email, website } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).send('Usuário não autenticado');
  }

  try {
    await dbRun(
      `INSERT INTO medicos (id_usuario, nome_medico, especialidade, endereco, numero_contato, email, website) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, nome_medico, especialidade, endereco, numero_contato, email, website]
    );
    res.redirect("/suporte");
  } catch (err) {
    console.error('Erro ao salvar médico:', err.message);
    res.status(500).send('Erro ao salvar médico');
  }
    
    });

    app.get("/editMedico", requireAuth, (req, res) => {
      res.render("editMedico.ejs");
    });
    
    app.get("/editMedico/:id", async (req, res) => {
      const userId = req.session.userId;
      const medicoId = req.params.id;
    
      if (!userId) {
        return res.redirect("/login");
      }
    
      try {
        const medico = await dbGet(
          "SELECT * FROM medicos WHERE id_medico = ?",
          [medicoId]
        );
        console.log("Médico encontrado:", medico)
    
        if (medico) {
          res.render("editMedico", { medico });
        } else {
          res.status(404).send("Médico não encontrado");
        }
      } catch (err) {
        console.error("Erro ao obter médico:", err.message);
        res.status(500).send("Erro ao carregar a página de edição");
      }
    });
    
    // Rota para processar a edição
    app.post("/editMedico/:id", requireAuth, async (req, res) => {
      const { nome_medico, especialidade, endereco, numero_contato, email, website } = req.body;
      const userId = req.session.userId;
      const medicoId = req.params.id;
    
      if (!userId) {
        return res.status(401).send('Usuário não autenticado');
      }
    
      try {
        await dbRun(
          `UPDATE medicos SET nome_medico = ?, especialidade = ?, endereco = ?, numero_contato = ?, email = ?, website = ? WHERE id_medico = ?`,
          [nome_medico, especialidade, endereco, numero_contato, email, website, medicoId]
        );               
    
        res.redirect("/suporte");
      } catch (err) {
        console.error("Erro ao editar médico:", err.message);
        res.status(500).send("Erro ao editar o médico");
      }
    });

app.post("/deleteMedico/:id", async (req, res) => {
  const userId = req.session.userId;
  const medicoId = req.params.id;

  if (!userId) {
    return res.redirect("/login");
  }

  try {
    const medico = await dbGet(
      "SELECT * FROM medicos WHERE id_medico = ?",
      [medicoId]
    );

    await dbRun(
      "DELETE FROM medicos WHERE id_medico = ?",
      [medicoId]
    );
  
    res.redirect("/suporte");
  } catch (err) {
    console.error("Erro ao excluir médico:", err.message);
    res.status(500).send("Erro ao excluir o médico");
  }
});

app.get("/inicioTratamento", requireAuth, (req, res) => {
  res.render("inicioTratamento.ejs");
});

app.get('/tratamento', requireAuth, async (req, res) => {

  const userId = req.session.userId;

  if (!userId) {
      return res.redirect("/login");
  }

  try {
    const lembretes = await dbAll(
      "SELECT * FROM lembretes WHERE id_usuario = ?",
    [userId]
    );

    if (lembretes.length > 0) {
      res.render("tratamento", { lembretes });
  } else {
      res.render("inicioTratamento");
  }
    
  } catch (err) {
    console.error("Erro ao obter lembretes:", err.message);
    res.status(500).send("Erro ao carregar a página");
}

});

app.get('/addLembrete', requireAuth, (req, res) => {
      res.render('addLembrete');
    });

    app.post("/addLembrete", async (req, res) => {
      const { 
          nome_medicamento, 
          frequencia, 
          horario1, 
          horario2,
          horario3,
          dose,
          estoque,
          aviso_estoque 
      } = req.body;
      const userId = req.session.userId;
  
      if (!userId) {
          return res.status(401).send('Usuário não autenticado');
      }
  
      try {
          // Calcula os valores para estoque e aviso_estoque
          let estoqueValue = estoque + ' ' + req.body['estoque-unidade'];
          let avisoEstoqueValue = aviso_estoque + ' ' + req.body['estoque-unidade'];
  
          let sql = 'INSERT INTO lembretes (id_usuario, nome_medicamento, frequencia, horario1, horario2, horario3, dose, estoque, aviso_estoque) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
          let params = [userId, nome_medicamento, frequencia, null, null, null, dose, estoqueValue, avisoEstoqueValue];
  
          if (frequencia === 'Uma vez ao dia') {
              params[3] = horario1;
          } else if (frequencia === 'Duas vezes ao dia') {
              params[3] = horario1;
              params[4] = horario2;
          } else if (frequencia === 'Três vezes ao dia') {
            params[3] = horario1;
            params[4] = horario2;
            params[5] = horario3;
        }
  
          await dbRun(sql, params);
          res.redirect("/tratamento");
      } catch (err) {
          console.error('Erro ao salvar lembrete:', err.message);
          res.status(500).send('Erro ao salvar lembrete');
      }
  });
  

  app.get("/editLembrete", requireAuth, (req, res) => {
    res.render("editLembrete.ejs");
  });
  
  app.get("/editLembrete/:id", async (req, res) => {
    console.log("A rota /editLembrete/:id foi acessada."); 
    const userId = req.session.userId;
    const lembreteId = req.params.id;
  
    if (!userId) {
      return res.redirect("/login");
    }
  
    try {
      const lembrete = await dbGet(
        "SELECT * FROM lembretes WHERE id_lembrete = ?",
        [lembreteId]
      );
      console.log("Lembrete encontrado:", lembrete)
  
      if (lembrete) {
        res.render("editLembrete", { lembrete });
      } else {
        res.status(404).send("Lembrete não encontrado");
      }
    } catch (err) {
      console.error("Erro ao obter lembrete:", err.message);
      res.status(500).send("Erro ao carregar a página de edição");
    }
  });
  
  // Rota para processar a edição
  app.post("/editLembrete/:id", requireAuth, async (req, res) => {
    const { nome_medicamento, frequencia, horario1, horario2, dose } = req.body;
    const userId = req.session.userId;
    const lembreteId = req.params.id;
  
    console.log('Dados recebidos:', { nome_medicamento, frequencia, horario1, horario2, dose });
  
    if (!userId) {
      return res.status(401).send('Usuário não autenticado');
    }
  
    try {
      let sql = `UPDATE lembretes SET nome_medicamento = ?, frequencia = ?, horario1 = ?, horario2 = ?, dose = ? WHERE id_lembrete = ?`
          let params = [nome_medicamento, frequencia, null, null, dose, lembreteId];
          
          if (frequencia === 'Uma vez ao dia') {
              params[2] = horario1;
          } else if (frequencia === 'Duas vezes ao dia') {
              params[2] = horario1;
              params[3] = horario2;
          }
          
          await dbRun(sql, params);
  
      res.redirect("/tratamento");
    } catch (err) {
      console.error("Erro ao editar lembrete:", err.message);
      res.status(500).send("Erro ao editar o lembrete");
    }
  });
    
    app.post("/deleteLembrete/:id", async (req, res) => {
      const userId = req.session.userId;
      const lembreteId = req.params.id;
    
      if (!userId) {
        return res.redirect("/login");
      }
    
      try {
        const lembrete = await dbGet(
          "SELECT * FROM lembretes WHERE id_lembrete = ?",
          [lembreteId]
        );
    
        await dbRun(
          "DELETE FROM lembretes WHERE id_lembrete = ?",
          [lembreteId]
        );
      
        res.redirect("/tratamento");
      } catch (err) {
        console.error("Erro ao excluir lembrete:", err.message);
        res.status(500).send("Erro ao excluir o lembrete");
      }
    });

app.get('/addInventario', requireAuth, (req, res) => {
  res.render('addInventario');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
