import express from 'express';
import sqlite3 from "sqlite3";

const router = express.Router();

router.get('/medicamentos', (req, res) => {
    const searchTerm = req.query.q; // Obtém o termo de pesquisa da query string
    const db = new sqlite3.Database('./DB-Lembrete Medicamentos');

    const query = `SELECT NOME_PRODUTO FROM medicamentosBR WHERE NOME_PRODUTO LIKE '%${searchTerm}%'`;

    // Execute a consulta SQL
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar medicamentos:', err);
            res.status(500).json({ error: 'Erro ao buscar medicamentos' });
        } else {
            // Se a consulta for bem-sucedida, envie os resultados como resposta JSON
            console.log('Resultados da consulta:', rows);
            res.json(rows);
        }
    });

    // Feche a conexão com o banco de dados após a consulta
    db.close();
});

export default router;
