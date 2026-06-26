const swaggerJSDoc = require("swagger-jsdoc");

const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "New Pawnshop API",
    version: "1.0.0",
    description: "HTTP API for products, categories, auctions, orders, and authentication.",
  },
  servers: [
    {
      url: "http://localhost:8888/api/v1",
      description: "Local API v1",
    },
    {
      url: "/api/v1",
      description: "Current origin API v1",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["message"],
        properties: {
          message: {
            type: "string",
          },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

const authPathPrefix = (paths) => {
  const authPaths = ["/user", "/register", "/login", "/logout"];

  for (const path of authPaths) {
    if (paths[path] && !paths[`/auth${path}`]) {
      paths[`/auth${path}`] = paths[path];
      delete paths[path];
    }
  }
};

authPathPrefix(swaggerSpec.paths || {});

module.exports = swaggerSpec;
