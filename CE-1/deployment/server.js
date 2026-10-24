const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();

// Since this file is inside the "deployment" folder, 
// we point to the database in the root folder (one level up '..')
const router = jsonServer.router(path.join(__dirname, '..', 'database', 'db.json'));

const middlewares = jsonServer.defaults({
  // This tells the server to serve all your HTML/CSS/JS files from the root folder
  static: path.join(__dirname, '..') 
});

const port = process.env.PORT || 3000;

server.use(middlewares);
server.use(router);

server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
});
