const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const format = require('date-fns/format')
const isMatch = require('date-fns/isMatch')
const isValid = require('date-fns/isValid')

const app = express()
app.use(express.json())

let database

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: path.join(__dirname, 'todoApplication.db'),
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server is running on http://localhost:3000/')
    })
  } catch (error) {
    console.log(`Database error is ${error.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

// Helper Functions
const outputResult = dbObject => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    category: dbObject.category,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  }
}

const hasPriorityAndStatusProperties = requestQuery =>
  requestQuery.priority !== undefined && requestQuery.status !== undefined

const hasPriorityProperty = requestQuery => requestQuery.priority !== undefined

const hasStatusProperty = requestQuery => requestQuery.status !== undefined

const hasCategoryAndStatus = requestQuery =>
  requestQuery.category !== undefined && requestQuery.status !== undefined

const hasCategoryAndPriority = requestQuery =>
  requestQuery.category !== undefined && requestQuery.priority !== undefined

const hasSearchProperty = requestQuery => requestQuery.search_q !== undefined

const hasCategoryProperty = requestQuery => requestQuery.category !== undefined

// API 1: GET /todos/
app.get('/todos/', async (request, response) => {
  let data = null
  let getTodosQuery = ''

  const {search_q = '', priority, status, category} = request.query

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      if (
        (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') &&
        (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE')
      ) {
        getTodosQuery = `
          SELECT * FROM todo
          WHERE status = '${status}' AND priority = '${priority}';
        `
        data = await database.all(getTodosQuery)
        response.send(data.map(eachItem => outputResult(eachItem)))
      } else if (
        !(status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE')
      ) {
        response.status(400)
        response.send('Invalid Todo Status')
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break

    case hasCategoryAndStatus(request.query):
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        if (
          status === 'TO DO' ||
          status === 'IN PROGRESS' ||
          status === 'DONE'
        ) {
          getTodosQuery = `
            SELECT * FROM todo
            WHERE category = '${category}' AND status = '${status}';
          `
          data = await database.all(getTodosQuery)
          response.send(data.map(eachItem => outputResult(eachItem)))
        } else {
          response.status(400)
          response.send('Invalid Todo Status')
        }
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break

    case hasCategoryAndPriority(request.query):
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        if (
          priority === 'HIGH' ||
          priority === 'MEDIUM' ||
          priority === 'LOW'
        ) {
          getTodosQuery = `
            SELECT * FROM todo
            WHERE category = '${category}' AND priority = '${priority}';
          `
          data = await database.all(getTodosQuery)
          response.send(data.map(eachItem => outputResult(eachItem)))
        } else {
          response.status(400)
          response.send('Invalid Todo Priority')
        }
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break

    case hasPriorityProperty(request.query):
      if (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') {
        getTodosQuery = `
          SELECT * FROM todo
          WHERE priority = '${priority}';
        `
        data = await database.all(getTodosQuery)
        response.send(data.map(eachItem => outputResult(eachItem)))
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break

    case hasStatusProperty(request.query):
      if (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE') {
        getTodosQuery = `
          SELECT * FROM todo
          WHERE status = '${status}';
        `
        data = await database.all(getTodosQuery)
        response.send(data.map(eachItem => outputResult(eachItem)))
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break

    case hasSearchProperty(request.query):
      getTodosQuery = `
        SELECT * FROM todo
        WHERE todo LIKE '%${search_q}%';
      `
      data = await database.all(getTodosQuery)
      response.send(data.map(eachItem => outputResult(eachItem)))
      break

    case hasCategoryProperty(request.query):
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        getTodosQuery = `
          SELECT * FROM todo
          WHERE category = '${category}';
        `
        data = await database.all(getTodosQuery)
        response.send(data.map(eachItem => outputResult(eachItem)))
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break

    default:
      getTodosQuery = `
        SELECT * FROM todo;
      `
      data = await database.all(getTodosQuery)
      response.send(data.map(eachItem => outputResult(eachItem)))
  }
})

// API 2: GET /todos/:todoId/
app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params

  const getTodoQuery = `
    SELECT * FROM todo
    WHERE id = ${todoId};
  `
  const responseResult = await database.get(getTodoQuery)
  response.send(outputResult(responseResult))
})

// API 3: GET /agenda/
app.get('/agenda/', async (request, response) => {
  const {date} = request.query

  if (isMatch(date, 'yyyy-MM-dd')) {
    const newDate = format(new Date(date), 'yyyy-MM-dd')

    const requestQuery = `
      SELECT * FROM todo
      WHERE due_date = '${newDate}';
    `

    const responseResult = await database.all(requestQuery)
    response.send(responseResult.map(eachItem => outputResult(eachItem)))
  } else {
    response.status(400)
    response.send('Invalid Due Date')
  }
})

// API 4: POST /todos/
app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body

  if (priority === 'HIGH' || priority === 'LOW' || priority === 'MEDIUM') {
    if (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE') {
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        if (isMatch(dueDate, 'yyyy-MM-dd')) {
          const postNewDueDate = format(new Date(dueDate), 'yyyy-MM-dd')

          const postTodoQuery = `
            INSERT INTO todo (id, todo, category, priority, status, due_date)
            VALUES (${id}, '${todo}', '${category}', '${priority}', '${status}', '${postNewDueDate}');
          `

          await database.run(postTodoQuery)
          response.send('Todo Successfully Added')
        } else {
          response.status(400)
          response.send('Invalid Due Date')
        }
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
    }
  } else {
    response.status(400)
    response.send('Invalid Todo Priority')
  }
})

// API 5: PUT /todos/:todoId/
app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const requestBody = request.body

  const previousTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};
  `
  const previousTodo = await database.get(previousTodoQuery)

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body

  let updateTodoQuery = ''

  switch (true) {
    case requestBody.status !== undefined:
      if (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE') {
        updateTodoQuery = `
          UPDATE todo
          SET todo = '${todo}', priority = '${priority}', status = '${status}', category = '${category}', due_date = '${dueDate}'
          WHERE id = ${todoId};
        `
        await database.run(updateTodoQuery)
        response.send('Status Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break

    case requestBody.priority !== undefined:
      if (priority === 'HIGH' || priority === 'LOW' || priority === 'MEDIUM') {
        updateTodoQuery = `
          UPDATE todo
          SET todo = '${todo}', priority = '${priority}', status = '${status}', category = '${category}', due_date = '${dueDate}'
          WHERE id = ${todoId};
        `
        await database.run(updateTodoQuery)
        response.send('Priority Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break

    case requestBody.todo !== undefined:
      updateTodoQuery = `
        UPDATE todo
        SET todo = '${todo}', priority = '${priority}', status = '${status}', category = '${category}', due_date = '${dueDate}'
        WHERE id = ${todoId};
      `
      await database.run(updateTodoQuery)
      response.send('Todo Updated')
      break

    case requestBody.category !== undefined:
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        updateTodoQuery = `
          UPDATE todo
          SET todo = '${todo}', priority = '${priority}', status = '${status}', category = '${category}', due_date = '${dueDate}'
          WHERE id = ${todoId};
        `
        await database.run(updateTodoQuery)
        response.send('Category Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break

    case requestBody.dueDate !== undefined:
      if (isMatch(dueDate, 'yyyy-MM-dd')) {
        const newDueDate = format(new Date(dueDate), 'yyyy-MM-dd')
        updateTodoQuery = `
          UPDATE todo
          SET todo = '${todo}', priority = '${priority}', status = '${status}', category = '${category}', due_date = '${newDueDate}'
          WHERE id = ${todoId};
        `
        await database.run(updateTodoQuery)
        response.send('Due Date Updated')
      } else {
        response.status(400)
        response.send('Invalid Due Date')
      }
      break
  }
})

// API 6: DELETE /todos/:todoId/
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params

  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};
  `
  await database.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

// Export app
module.exports = app
