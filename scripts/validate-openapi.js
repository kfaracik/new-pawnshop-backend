const SwaggerParser = require("@apidevtools/swagger-parser");
const swaggerSpec = require("../swaggerConfig");

async function main() {
  await SwaggerParser.validate(swaggerSpec);
  console.log("OpenAPI spec is valid.");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
