// API tests for shipments endpoints
import request from "supertest";
import { connectDB, disconnectDB } from "../../api/db/connection.js";
import { ShipmentModel } from "../../api/models/Shipment.js";
import app from "../../api/server.js";

const testDbUri = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/wasteer-test";

describe("Shipments API", () => {
  beforeAll(async () => {
    await connectDB(testDbUri);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clear data before each test
    await ShipmentModel.deleteMany({});
  });

  describe("GET /api/shipments", () => {
    it("should return empty array when no shipments exist", async () => {
      const response = await request(app).get("/api/shipments");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it("should return all shipments", async () => {
      // Create test shipments
      await ShipmentModel.create([
        {
          id: "S1",
          facility_id: "F1",
          date: "2025-10-05",
          status: "delivered",
          weight_kg: 1500,
          has_contaminants: false,
        },
        {
          id: "S2",
          facility_id: "F2",
          date: "2025-10-06",
          status: "rejected",
          weight_kg: 800,
          has_contaminants: true,
        },
      ]);

      const response = await request(app).get("/api/shipments");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it("should filter shipments by date range", async () => {
      await ShipmentModel.create([
        {
          id: "S1",
          facility_id: "F1",
          date: "2025-10-05",
          status: "delivered",
          weight_kg: 1500,
          has_contaminants: false,
        },
        {
          id: "S2",
          facility_id: "F2",
          date: "2025-10-10",
          status: "rejected",
          weight_kg: 800,
          has_contaminants: true,
        },
      ]);

      const response = await request(app).get("/api/shipments?date_from=2025-10-01&date_to=2025-10-07");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe("S1");
    });

    it("should filter shipments by contamination status", async () => {
      await ShipmentModel.create([
        {
          id: "S1",
          facility_id: "F1",
          date: "2025-10-05",
          status: "delivered",
          weight_kg: 1500,
          has_contaminants: false,
        },
        {
          id: "S2",
          facility_id: "F2",
          date: "2025-10-06",
          status: "rejected",
          weight_kg: 800,
          has_contaminants: true,
        },
      ]);

      const response = await request(app).get("/api/shipments?has_contaminants=true");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].has_contaminants).toBe(true);
    });
  });

  describe("GET /api/shipments/:id", () => {
    it("should return a single shipment by id", async () => {
      await ShipmentModel.create({
        id: "S1",
        facility_id: "F1",
        date: "2025-10-05",
        status: "delivered",
        weight_kg: 1500,
        has_contaminants: false,
      });

      const response = await request(app).get("/api/shipments/S1");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe("S1");
    });

    it("should return 404 for non-existent shipment", async () => {
      const response = await request(app).get("/api/shipments/NONEXISTENT");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/shipments", () => {
    it("should create a new shipment", async () => {
      const newShipment = {
        id: "S1",
        facility_id: "F1",
        date: "2025-10-05",
        status: "delivered",
        weight_kg: 1500,
        has_contaminants: false,
      };

      const response = await request(app).post("/api/shipments").send(newShipment);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe("S1");
      expect(response.body.message).toBe("Shipment created successfully");
    });

    it("should return 409 for duplicate id", async () => {
      const shipment = {
        id: "S1",
        facility_id: "F1",
        date: "2025-10-05",
        status: "delivered",
        weight_kg: 1500,
        has_contaminants: false,
      };

      await request(app).post("/api/shipments").send(shipment);
      const response = await request(app).post("/api/shipments").send(shipment);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it("should validate required fields", async () => {
      const invalidShipment = {
        id: "S1",
        // Missing required fields
      };

      const response = await request(app).post("/api/shipments").send(invalidShipment);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/shipments/:id", () => {
    it("should update a shipment", async () => {
      await ShipmentModel.create({
        id: "S1",
        facility_id: "F1",
        date: "2025-10-05",
        status: "delivered",
        weight_kg: 1500,
        has_contaminants: false,
      });

      const response = await request(app)
        .put("/api/shipments/S1")
        .send({ status: "rejected", has_contaminants: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("rejected");
      expect(response.body.data.has_contaminants).toBe(true);
    });

    it("should return 404 for non-existent shipment", async () => {
      const response = await request(app).put("/api/shipments/NONEXISTENT").send({ status: "rejected" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/shipments/:id", () => {
    it("should delete a shipment", async () => {
      await ShipmentModel.create({
        id: "S1",
        facility_id: "F1",
        date: "2025-10-05",
        status: "delivered",
        weight_kg: 1500,
        has_contaminants: false,
      });

      const response = await request(app).delete("/api/shipments/S1");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Shipment deleted successfully");

      // Verify deletion
      const shipment = await ShipmentModel.findOne({ id: "S1" });
      expect(shipment).toBeNull();
    });

    it("should return 404 for non-existent shipment", async () => {
      const response = await request(app).delete("/api/shipments/NONEXISTENT");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});

