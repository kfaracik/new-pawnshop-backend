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
      Customer: {
        type: "object",
        required: ["name", "email", "city", "postalCode", "streetAddress", "country"],
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          city: { type: "string" },
          postalCode: { type: "string" },
          streetAddress: { type: "string" },
          country: { type: "string" },
        },
      },
      OrderedProductInput: {
        type: "object",
        required: ["productId", "quantity"],
        properties: {
          productId: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
        },
      },
      OrderedProduct: {
        allOf: [
          { $ref: "#/components/schemas/OrderedProductInput" },
          {
            type: "object",
            properties: {
              name: { type: "string" },
              price: { type: "number", minimum: 0 },
              reservationStockField: {
                type: "string",
                enum: ["quantity", "stock", "none"],
              },
            },
          },
        ],
      },
      CreateOrderRequest: {
        type: "object",
        required: [
          "name",
          "email",
          "city",
          "postalCode",
          "streetAddress",
          "country",
          "products",
        ],
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          city: { type: "string" },
          postalCode: { type: "string" },
          streetAddress: { type: "string" },
          country: { type: "string" },
          products: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/OrderedProductInput" },
          },
          deliveryMethod: {
            type: "string",
            enum: ["courier_standard", "parcel_locker", "store_pickup"],
          },
          deliveryPrice: { type: "number", minimum: 0 },
          paymentMethod: {
            type: "string",
            enum: ["bank_transfer", "stripe_card"],
          },
        },
      },
      UpdateOrderRequest: {
        type: "object",
        properties: {
          orderStatus: {
            type: "string",
            enum: ["pending_payment", "paid", "completed", "canceled", "failed"],
          },
          paymentStatus: {
            type: "string",
            enum: ["unpaid", "pending", "paid", "failed", "canceled", "refunded"],
          },
          paid: { type: "boolean" },
        },
      },
      Order: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string", nullable: true },
          customer: { $ref: "#/components/schemas/Customer" },
          products: {
            type: "array",
            items: { $ref: "#/components/schemas/OrderedProduct" },
          },
          totalAmount: { type: "number" },
          subtotalAmount: { type: "number" },
          deliveryPrice: { type: "number" },
          grandTotal: { type: "number" },
          deliveryMethod: {
            type: "string",
            enum: ["courier_standard", "parcel_locker", "store_pickup"],
          },
          deliveryEtaLabel: { type: "string" },
          paymentMethod: { type: "string", enum: ["bank_transfer", "stripe_card"] },
          paymentProvider: { type: "string", enum: ["manual", "stripe"] },
          paymentSessionStatus: {
            type: "string",
            enum: ["not_started", "sandbox_ready", "requires_integration", "session_created"],
          },
          orderStatus: {
            type: "string",
            enum: ["pending_payment", "paid", "completed", "canceled", "failed"],
          },
          paymentStatus: {
            type: "string",
            enum: ["unpaid", "pending", "paid", "failed", "canceled", "refunded"],
          },
          paid: { type: "boolean" },
          reservationExpiresAt: { type: "string", format: "date-time", nullable: true },
          paymentNotes: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Location: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          city: { type: "string" },
          addressLine1: { type: "string" },
          addressLine2: { type: "string" },
          postalCode: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          description: { type: "string" },
          isActive: { type: "boolean" },
          sortOrder: { type: "number" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
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
