// API tests for inspections endpoints
import request from "supertest";
import { connectDB, disconnectDB } from "../../api/db/connection.js";
import { InspectionModel } from "../../api/models/Inspection.js";
import app from "../../api/server.js";

const testDbUri = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/wasteer-test";

describe("Inspections API", () => {
  beforeAll(async () => {
    await connectDB(testDbUri);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clear data before each test
    await InspectionModel.deleteMany({});
  });

  describe("GET /api/inspections", () => {
    it("should return empty array when no inspections exist", async () => {
      const response = await request(app).get("/api/inspections");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("should return all inspections", async () => {
      await InspectionModel.create([
        {
          id: "I1",
          shipment_id: "S1",
          facility_id: "F1",
          date: "2025-10-05",
          status: "accepted",
          inspector: "John Doe",
        },
        {
          id: "I2",
          shipment_id: "S2",
          facility_id: "F2",
          date: "2025-10-06",
          status: "rejected",
          inspector: "Jane Smith",
        },
      ]);

      const response = await request(app).get("/api/inspections");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it("should filter inspections by status", async () => {
      await InspectionModel.create([
        {
          id: "I1",
          shipment_id: "S1",
          facility_id: "F1",
          date: "2025-10-05",
          status: "accepted",
          inspector: "John Doe",
        },
        {
          id: "I2",
          shipment_id: "S2",
          facility_id: "F2",
          date: "2025-10-06",
          status: "rejected",
          inspector: "Jane Smith",
        },
      ]);

      const response = await request(app).get("/api/inspections?status=rejected");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe("rejected");
    });

    it("should filter inspections by date range", async () => {
      await InspectionModel.create([
        {
          id: "I1",
          shipment_id: "S1",
          facility_id: "F1",
          date: "2025-10-05",
          status: "accepted",
          inspector: "John Doe",
        },
        {
          id: "I2",
          shipment_id: "S2",
          facility_id: "F2",
          date: "2025-10-10",
          status: "rejected",
          inspector: "Jane Smith",
        },
      ]);

      const response = await request(app).get("/api/inspections?date_from=2025-10-01&date_to=2025-10-07");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe("I1");
    });

    it("should filter inspections with risk contaminants", async () => {
      await InspectionModel.create([
        {
          id: "I1",
          shipment_id: "S1",
          facility_id: "F1",
          date: "2025-10-05",
          status: "accepted",
          inspector: "John Doe",
        },
        {
          id: "I2",
          shipment_id: "S2",
          facility_id: "F2",
          date: "2025-10-06",
          status: "rejected",
          inspector: "Jane Smith",
          contaminants_detected: ["Lead", "Mercury"],
        },
      ]);

      const response = await request(app).get("/api/inspections?has_risk_contaminants=true");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].contaminants_detected).toBeDefined();
    });
  });

  describe("GET /api/inspections/:id", () => {
    it("should return a single inspection by id", async () => {
      await InspectionModel.create({
        id: "I1",
        shipment_id: "S1",
        facility_id: "F1",
        date: "2025-10-05",
        status: "accepted",
        inspector: "John Doe",
      });

      const response = await request(app).get("/api/inspections/I1");

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe("I1");
    });

    it("should return 404 for non-existent inspection", async () => {
      const response = await request(app).get("/api/inspections/NONEXISTENT");

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/inspections", () => {
    it("should create a new inspection", async () => {
      const newInspection = {
        id: "I1",
        shipment_id: "S1",
        facility_id: "F1",
        date: "2025-10-05",
        status: "accepted",
        inspector: "John Doe",
      };

      const response = await request(app).post("/api/inspections").send(newInspection);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe("I1");
    });

    it("should return 409 for duplicate id", async () => {
      const inspection = {
        id: "I1",
        shipment_id: "S1",
        facility_id: "F1",
        date: "2025-10-05",
        status: "accepted",
        inspector: "John Doe",
      };

      await request(app).post("/api/inspections").send(inspection);
      const response = await request(app).post("/api/inspections").send(inspection);

      expect(response.status).toBe(409);
    });
  });

  describe("PUT /api/inspections/:id", () => {
    it("should update an inspection", async () => {
      await InspectionModel.create({
        id: "I1",
        shipment_id: "S1",
        facility_id: "F1",
        date: "2025-10-05",
        status: "pending",
        inspector: "John Doe",
      });

      const response = await request(app)
        .put("/api/inspections/I1")
        .send({ status: "accepted", notes: "All clear" });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("accepted");
      expect(response.body.data.notes).toBe("All clear");
    });

    it("should return 404 for non-existent inspection", async () => {
      const response = await request(app).put("/api/inspections/NONEXISTENT").send({ status: "accepted" });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/inspections/:id", () => {
    it("should delete an inspection", async () => {
      await InspectionModel.create({
        id: "I1",
        shipment_id: "S1",
        facility_id: "F1",
        date: "2025-10-05",
        status: "accepted",
        inspector: "John Doe",
      });

      const response = await request(app).delete("/api/inspections/I1");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Inspection deleted successfully");

      const inspection = await InspectionModel.findOne({ id: "I1" });
      expect(inspection).toBeNull();
    });

    it("should return 404 for non-existent inspection", async () => {
      const response = await request(app).delete("/api/inspections/NONEXISTENT");

      expect(response.status).toBe(404);
    });
  });
});

