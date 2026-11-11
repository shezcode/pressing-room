const swaggerJSDoc = require("swagger-jsdoc");

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Pressing Room API",
    version: "1.0.0",
    description:
      "The Node.js API behind the Pressing Room record shop, using JSON files as its database",
    contact: {
      name: "API Support",
      url: "https://example.com",
      email: "support@example.com",
    },
  },
  servers: [
    {
      // Relative, so "Try it out" calls whichever host serves the docs (also behind a proxy)
      url: "/",
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
      Record: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the Record",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          artist: { type: "string", example: "Pink Floyd" },
          title: { type: "string", example: "The Dark Side of the Moon" },
          format: {
            type: "string",
            enum: ["Vinyl", "CD", "Cassette"],
          },
          variant: {
            type: "string",
            nullable: true,
            description: "Optional variant text, for example LP or 2xLP",
            example: "LP",
          },
          year: { type: "integer", description: "Release year", example: 1973 },
          genre: { type: "string", example: "Prog rock" },
          price: {
            type: "integer",
            description: "Price in USD cents",
            example: 4200,
          },
          stock: {
            type: "integer",
            description: "Copies in stock; zero means Out of stock",
            example: 12,
          },
          coverUrl: {
            type: "string",
            description: "Path of the cover image, served by this backend",
            example: "/uploads/covers/pinkfloyd.webp",
          },
          featured: {
            type: "boolean",
            description: "Whether the Record is a Featured Record",
          },
          description: { type: "string" },
          dateAdded: {
            type: "string",
            format: "date-time",
            description: "When the Record was added; drives newest-first",
          },
        },
      },
      OrderLine: {
        type: "object",
        description:
          "A snapshot of the Record at purchase; it never changes when the Record is edited or deleted",
        properties: {
          recordId: { type: "string" },
          artist: { type: "string", example: "Pink Floyd" },
          title: { type: "string", example: "The Dark Side of the Moon" },
          format: { type: "string", enum: ["Vinyl", "CD", "Cassette"] },
          price: {
            type: "integer",
            description: "Price in USD cents at purchase",
            example: 4200,
          },
          coverUrl: {
            type: "string",
            example: "/uploads/covers/pinkfloyd.webp",
          },
          quantity: { type: "integer", example: 1 },
        },
      },
      CollectionEntry: {
        type: "object",
        description:
          "A Record the Customer owns, from their Order line snapshots",
        properties: {
          recordId: { type: "string" },
          artist: { type: "string", example: "Pink Floyd" },
          title: { type: "string", example: "The Dark Side of the Moon" },
          format: { type: "string", enum: ["Vinyl", "CD", "Cassette"] },
          coverUrl: {
            type: "string",
            example: "/uploads/covers/pinkfloyd.webp",
          },
          quantity: {
            type: "integer",
            description: "Total copies bought across all the Customer's Orders",
            example: 2,
          },
          inShop: {
            type: "boolean",
            description:
              "Whether the Record still exists in the shop (false once the Admin deleted it)",
          },
        },
      },
      ShippingAddressInput: {
        type: "object",
        required: [
          "name",
          "street",
          "city",
          "postalCode",
          "isoCode",
          "communityId",
          "provinceId",
        ],
        properties: {
          name: { type: "string", example: "Ana García" },
          street: { type: "string", example: "Calle Mayor 1" },
          city: { type: "string", example: "Madrid" },
          postalCode: { type: "string", example: "28013" },
          isoCode: {
            type: "string",
            description: "From /location/countries",
            example: "ES",
          },
          communityId: {
            type: "string",
            description: "From /location/communities",
            example: "13",
          },
          provinceId: {
            type: "string",
            description: "From /location/provinces/{communityId}",
            example: "28",
          },
        },
      },
      ShippingAddress: {
        allOf: [
          { $ref: "#/components/schemas/ShippingAddressInput" },
          {
            type: "object",
            description: "The names of the chosen locations are stored too",
            properties: {
              country: { type: "string", example: "España" },
              community: { type: "string", example: "Madrid" },
              province: { type: "string", example: "Madrid" },
            },
          },
        ],
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string" },
          customerId: { type: "string" },
          lines: {
            type: "array",
            items: { $ref: "#/components/schemas/OrderLine" },
          },
          shippingAddress: { $ref: "#/components/schemas/ShippingAddress" },
          total: {
            type: "integer",
            description:
              "Sum of price times quantity, in USD cents; no tax, shipping or discount",
            example: 8400,
          },
          status: { type: "string", enum: ["Placed"] },
          datePlaced: { type: "string", format: "date-time" },
        },
      },
      Subscriber: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "Lowercased email address",
            example: "fan@example.com",
          },
          dateSubscribed: {
            type: "string",
            format: "date-time",
            description: "When the email joined the Friday List",
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the user",
          },
          name: {
            type: "string",
            description: "User's name",
          },
          email: {
            type: "string",
            description: "User's email address",
          },
          role: {
            type: "string",
            enum: ["customer", "admin"],
            description:
              "customer for every signup; admin only for the seeded Admin account. Also carried in the token",
          },
          countryId: {
            type: "string",
            description: "ID from /location/countries (absent on the Admin)",
          },
          communityId: {
            type: "string",
            description: "ID of the autonomous community (only for Spain)",
          },
          provinceId: {
            type: "string",
            description: "ID of the province (only for Spain)",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the user was created",
          },
        },
      },
      Country: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the country",
          },
          name: {
            type: "string",
            description: "Country name",
          },
          isoCode: {
            type: "string",
            description: "ISO country code",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the record was created",
          },
        },
      },
      Community: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the autonomous community",
          },
          name: {
            type: "string",
            description: "Autonomous community name",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the record was created",
          },
        },
      },
      Province: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique identifier for the province",
          },
          name: {
            type: "string",
            description: "Province name",
          },
          communityId: {
            type: "string",
            description:
              "Reference to the autonomous community this province belongs to",
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the record was created",
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Error message",
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
