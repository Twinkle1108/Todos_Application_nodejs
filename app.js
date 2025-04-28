const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");

const app = express();
app.use(express.json());

let database = null;
const dbPath = path.join(__dirname, "todoApplication.db");

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

// ✅ Validation Arrays
const priorityValues = ["HIGH", "MEDIUM", "LOW"];
const statusValues = ["TO DO", "IN PROGRESS", "DONE"];
const categoryValues = ["WORK", "HOME", "LEARNING"];

// ✅ Utility Validation Functions
const isValidStatus = (status) => statusValues.includes(status);
const isValidPriority = (priority) => priorityValues.includes(priority);
const isValidCategory = (category) => categoryValues.includes(category);
const isValidDueDate = (dueDate) => isMatch(dueDate, "yyyy-MM-dd");

// ✅ Utility Functions for Checking Query Parameters
const hasPriorityAndStatus = (query) =>
  query.priority !== undefined && query.status !== undefined;
const hasCategoryAndStatus = (query) =>
  query.category !== undefined && query.status !== undefined;
const hasCategoryAndPriority = (query) =>
  query.category !== undefined && query.priority !== undefined;
const hasPriority = (query) => query.priority !== undefined;
const hasStatus = (query) => query.status !== undefined;
const hasCategory = (query) => query.category !== undefined;

// ✅ API 1: GET /todos/
app.get("/todos/", async (request, response) => {
  let { search_q = "", priority, status, category } = request.query;
  let getTodosQuery = "";

  try {
    if (priority !== undefined && !isValidPriority(priority)) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
    if (status !== undefined && !isValidStatus(status)) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
    if (category !== undefined && !isValidCategory(category)) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }

    switch (true) {
      case hasPriorityAndStatus(request.query):
        getTodosQuery = `
          SELECT * FROM todo 
          WHERE 
            todo LIKE '%${search_q}%'
            AND priority = '${priority}' 
            AND status = '${status}';
        `;
        break;
      case hasCategoryAndStatus(request.query):
        getTodosQuery = `
          SELECT * FROM todo 
          WHERE 
            todo LIKE '%${search_q}%'
            AND category = '${category}'
            AND status = '${status}';
        `;
        break;
      case hasCategoryAndPriority(request.query):
        getTodosQuery = `
          SELECT * FROM todo 
          WHERE 
            todo LIKE '%${search_q}%'
            AND category = '${category}'
            AND priority = '${priority}';
        `;
        break;
      case hasPriority(request.query):
        getTodosQuery = `
          SELECT * FROM todo 
          WHERE 
            todo LIKE '%${search_q}%'
            AND priority = '${priority}';
        `;
        break;
      case hasStatus(request.query):
        getTodosQuery = `
          SELECT * FROM todo 
          WHERE 
            todo LIKE '%${search_q}%'
            AND status = '${status}';
        `;
        break;
      case hasCategory(request.query):
        getTodosQuery = `
          SELECT * FROM todo 
          WHERE 
            todo LIKE '%${search_q}%'
            AND category = '${category}';
        `;
        break;
      default:
        getTodosQuery = `
          SELECT * FROM todo 
          WHERE todo LIKE '%${search_q}%';
        `;
    }

    const todos = await database.all(getTodosQuery);
    response.send(todos);
  } catch (e) {
    response.status(500);
    response.send("Server Error");
  }
});

// ✅ API 2: GET /todos/:todoId/
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  response.send(todo);
});

// ✅ API 3: GET /agenda/?date=...
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  try {
    const formattedDate = format(new Date(date), "yyyy-MM-dd");
    if (!isValidDueDate(formattedDate)) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }

    const getAgendaQuery = `
      SELECT * FROM todo 
      WHERE due_date = '${formattedDate}';
    `;
    const todos = await database.all(getAgendaQuery);
    response.send(todos);
  } catch (e) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// ✅ API 4: POST /todos/
app.post("/todos/", async (request, response) => {
  const { id, todo, category, priority, status, dueDate } = request.body;

  if (!isValidStatus(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
    return;
  }
  if (!isValidPriority(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
    return;
  }
  if (!isValidCategory(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
    return;
  }
  if (!isValidDueDate(dueDate)) {
    response.status(400);
    response.send("Invalid Due Date");
    return;
  }

  const formattedDueDate = format(new Date(dueDate), "yyyy-MM-dd");

  const createTodoQuery = `
    INSERT INTO 
      todo (id, todo, category, priority, status, due_date)
    VALUES
      (${id}, '${todo}', '${category}', '${priority}', '${status}', '${formattedDueDate}');
  `;

  await database.run(createTodoQuery);
  response.send("Todo Successfully Added");
});

// ✅ API 5: PUT /todos/:todoId/
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;

  let updateField = "";
  let updateValue = "";
  let updateQuery = "";

  if (requestBody.status !== undefined) {
    if (!isValidStatus(requestBody.status)) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
    updateField = "status";
    updateValue = requestBody.status;
  } else if (requestBody.priority !== undefined) {
    if (!isValidPriority(requestBody.priority)) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
    updateField = "priority";
    updateValue = requestBody.priority;
  } else if (requestBody.category !== undefined) {
    if (!isValidCategory(requestBody.category)) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
    updateField = "category";
    updateValue = requestBody.category;
  } else if (requestBody.todo !== undefined) {
    updateField = "todo";
    updateValue = requestBody.todo;
  } else if (requestBody.dueDate !== undefined) {
    if (!isValidDueDate(requestBody.dueDate)) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
    updateField = "due_date";
    updateValue = format(new Date(requestBody.dueDate), "yyyy-MM-dd");
  }

  const updateTodoQuery = `
    UPDATE todo 
    SET ${updateField} = '${updateValue}'
    WHERE id = ${todoId};
  `;

  await database.run(updateTodoQuery);

  // 📝 Exact Success Response
  const updateResponse = {
    status: "Status Updated",
    priority: "Priority Updated",
    todo: "Todo Updated",
    category: "Category Updated",
    due_date: "Due Date Updated",
  };

  response.send(updateResponse[updateField]);
});

// ✅ API 6: DELETE /todos/:todoId/
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo 
    WHERE id = ${todoId};
  `;
  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

// ✅ Export the app
module.exports = app;
