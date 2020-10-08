const express = require('express')
const bodyParser = require('body-parser')
const sql = require('mssql')

const dbConfig = require('./dbConfig.json')

const app = express()
const port = 80

app.use(bodyParser.json())

const pool = new sql.ConnectionPool(dbConfig)
const poolConnect = pool.connect()

app.get('/', (req, res) => {
	res.status(200).json({ status: 'OK' })
})

app.get('/alunos/*', (req, res) => {
	let ra = req.url.replace('/alunos/', '')
	executeSql(
		'select * from agenda.aluno where ra = @ra',
		{ fields: [['ra', sql.Char, ra]] },
		(result) => {
			res.json(result)
		}
	)
})

app.get('/alunos', (req, res) => {
	executeSql('select * from agenda.aluno', null, (result) => {
		res.json(result)
	})
})

app.post('/alunos', (req, res) => {
	let ra = req.body.ra
	let nome = req.body.nome
	let email = req.body.email

	if (!ra || !nome || !email) {
		res.sendStatus(400)
		return
	}

	executeSql(
		'insert into agenda.aluno values(@ra, @nome, @email)',
		{
			fields: [
				['ra', sql.Char, ra],
				['nome', sql.VarChar(50), nome],
				['email', sql.VarChar(50), email],
			],
		},
		(result) => {
			if (result.error) {
				res.json(result)
				return
			}
		}
	)

	res.sendStatus(200)
})

app.put('/alunos', (req, res) => {
	let ra = req.body.ra
	let nome = req.body.nome
	let email = req.body.email

	if (!ra) {
		res.sendStatus(400)
		return
	}

	if (nome) {
		executeSql(
			'update agenda.aluno set nome = @nome where ra = @ra',
			{
				fields: [
					['ra', sql.Char, ra],
					['nome', sql.VarChar(50), nome],
				],
			},
			(result) => {
				if (result.error) {
					res.json(result)
					return
				}
			}
		)
	}

	if (email) {
		executeSql(
			'update agenda.aluno set email = @email where ra = @ra',
			{
				fields: [
					['ra', sql.Char, ra],
					['email', sql.VarChar(50), email],
				],
			},
			(result) => {
				if (result.error) {
					res.json(result)
					return
				}
			}
		)
	}

	res.sendStatus(200)
})

app.delete('/alunos', (req, res) => {
	let ra = req.body.ra

	executeSql(
		'delete from agenda.aluno where ra = @ra',
		{ fields: [['ra', sql.Char, ra]] },
		(result) => {
			if (result.error) {
				res.json(result)
				return
			}
		}
	)

	res.sendStatus(200)
})

async function executeSql(query, fields, callback) {
	await poolConnect
	try {
		const request = pool.request()
		if (fields)
			fields.fields.forEach((field) => {
				request.input(field[0], field[1], field[2])
			})
		const result = await request.query(query)
		callback({
			rowsAffected: result.rowsAffected[0],
			recordset: result.recordset,
		})
	} catch (err) {
		let error = err.originalError.info.message
		if (error.includes('Violation of PRIMARY KEY'))
			error = 'Registro já existe'

		callback({
			rowsAffected: 0,
			recordset: [],
			error: error,
		})
	}
}

app.listen(port, () => {
	console.log(`Listening at port ${port}`)
})
