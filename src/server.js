const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
  console.log(`Swagger:       http://localhost:${port}/api-docs`);
});
