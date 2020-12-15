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
	console.log('get', req.body)
	let ra = req.url.replace('/alunos/', '').trim()
	executeSql(
		'select * from agenda.aluno where ra = @ra',
		{ fields: [['ra', sql.Char, ra]] },
		(result) => {
			res.json(result)
		}
	)
})

app.get('/alunos', (req, res) => {
	console.log('get alunos')
	executeSql(
		'select * from agenda.aluno order by cast(ra as int)',
		null,
		(result) => {
			res.json(result)
		}
	)
})

app.post('/alunos', (req, res) => {
	console.log('post', req.body)
	let ra = req.body.ra.trim()
	let nome = req.body.nome.trim()
	let email = req.body.email.trim()

	if (!ra || !nome || !email) {
		res.status(400).json({ status: 'Bad Request' })
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
			if (result.error) result.status = 400
			else result.status = 200
			res.json(result)
			return
		}
	)

	/*res.status(200).json({ status: 'OK' })*/
})

app.put('/alunos', (req, res) => {
	console.log('put', req.body)
	let ra = req.body.ra.trim()
	let nome = req.body.nome.trim()
	let email = req.body.email.trim()

	if (!ra) {
		res.status(400).json({ status: 'Bad Request' })
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

	res.status(200).json({ status: 'OK' })
})

app.delete('/alunos', (req, res) => {
	console.log('delete', req.body)
	let ra = req.body.ra.trim()

	if (!ra) {
		res.status(400).json({ status: 'Bad Request' })
		return
	}

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

	res.status(200).json({ status: 'OK' })
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
		let resParse = []
		result.recordset.forEach((res) => {
			resParse.push({ ra: res.RA, nome: res.Nome, email: res.Email })
		})
		callback({
			rowsAffected: result.rowsAffected[0],
			recordset: resParse,
		})
	} catch (err) {
		let error
		try {
			let dbError = err.originalError.info.message
			if (dbError.includes('Violation of PRIMARY KEY'))
				error = 'Registro já existe'
		} catch (e) {}
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
