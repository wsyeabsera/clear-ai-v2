// API tests for contaminants endpoints
import request from "supertest";
import { connectDB, disconnectDB } from "../../api/db/connection.js";
import { ContaminantModel } from "../../api/models/Contaminant.js";
import app from "../../api/server.js";

const testDbUri = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/wasteer-test";

describe("Contaminants API", () => {
  beforeAll(async () => {
    await connectDB(testDbUri);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clear data before each test
    await ContaminantModel.deleteMany({});
  });

  describe("GET /api/contaminants-detected", () => {
    it("should return empty array when no contaminants exist", async () => {
      const response = await request(app).get("/api/contaminants-detected");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("should return all contaminants", async () => {
      await ContaminantModel.create([
        {
          id: "C1",
          shipment_id: "S1",
          type: "Lead",
          concentration_ppm: 150,
          risk_level: "high",
          detected_at: "2025-10-06T10:30:00Z",
        },
        {
          id: "C2",
          shipment_id: "S2",
          type: "Mercury",
          concentration_ppm: 75,
          risk_level: "medium",
          detected_at: "2025-10-07T14:20:00Z",
        },
      ]);

      const response = await request(app).get("/api/contaminants-detected");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it("should filter contaminants by shipment_ids", async () => {
      await ContaminantModel.create([
        {
          id: "C1",
          shipment_id: "S1",
          type: "Lead",
          concentration_ppm: 150,
          risk_level: "high",
          detected_at: "2025-10-06T10:30:00Z",
        },
        {
          id: "C2",
          shipment_id: "S2",
          type: "Mercury",
          concentration_ppm: 75,
          risk_level: "medium",
          detected_at: "2025-10-07T14:20:00Z",
        },
      ]);

      const response = await request(app).get("/api/contaminants-detected?shipment_ids=S1");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].shipment_id).toBe("S1");
    });

    it("should filter contaminants by risk level", async () => {
      await ContaminantModel.create([
        {
          id: "C1",
          shipment_id: "S1",
          type: "Lead",
          concentration_ppm: 150,
          risk_level: "high",
          detected_at: "2025-10-06T10:30:00Z",
        },
        {
          id: "C2",
          shipment_id: "S2",
          type: "Mercury",
          concentration_ppm: 75,
          risk_level: "medium",
          detected_at: "2025-10-07T14:20:00Z",
        },
      ]);

      const response = await request(app).get("/api/contaminants-detected?risk_level=high");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].risk_level).toBe("high");
    });

    it("should filter contaminants by type", async () => {
      await ContaminantModel.create([
        {
          id: "C1",
          shipment_id: "S1",
          type: "Lead",
          concentration_ppm: 150,
          risk_level: "high",
          detected_at: "2025-10-06T10:30:00Z",
        },
        {
          id: "C2",
          shipment_id: "S2",
          type: "Mercury",
          concentration_ppm: 75,
          risk_level: "medium",
          detected_at: "2025-10-07T14:20:00Z",
        },
      ]);

      const response = await request(app).get("/api/contaminants-detected?type=Lead");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe("Lead");
    });
  });

  describe("GET /api/contaminants-detected/:id", () => {
    it("should return a single contaminant by id", async () => {
      await ContaminantModel.create({
        id: "C1",
        shipment_id: "S1",
        type: "Lead",
        concentration_ppm: 150,
        risk_level: "high",
        detected_at: "2025-10-06T10:30:00Z",
      });

      const response = await request(app).get("/api/contaminants-detected/C1");

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe("C1");
    });

    it("should return 404 for non-existent contaminant", async () => {
      const response = await request(app).get("/api/contaminants-detected/NONEXISTENT");

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/contaminants-detected", () => {
    it("should create a new contaminant detection", async () => {
      const newContaminant = {
        id: "C1",
        shipment_id: "S1",
        type: "Lead",
        concentration_ppm: 150,
        risk_level: "high",
        detected_at: "2025-10-06T10:30:00Z",
      };

      const response = await request(app).post("/api/contaminants-detected").send(newContaminant);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe("C1");
    });

    it("should return 409 for duplicate id", async () => {
      const contaminant = {
        id: "C1",
        shipment_id: "S1",
        type: "Lead",
        concentration_ppm: 150,
        risk_level: "high",
        detected_at: "2025-10-06T10:30:00Z",
      };

      await request(app).post("/api/contaminants-detected").send(contaminant);
      const response = await request(app).post("/api/contaminants-detected").send(contaminant);

      expect(response.status).toBe(409);
    });
  });

  describe("PUT /api/contaminants-detected/:id", () => {
    it("should update a contaminant", async () => {
      await ContaminantModel.create({
        id: "C1",
        shipment_id: "S1",
        type: "Lead",
        concentration_ppm: 150,
        risk_level: "high",
        detected_at: "2025-10-06T10:30:00Z",
      });

      const response = await request(app)
        .put("/api/contaminants-detected/C1")
        .send({ risk_level: "critical", notes: "Updated assessment" });

      expect(response.status).toBe(200);
      expect(response.body.data.risk_level).toBe("critical");
      expect(response.body.data.notes).toBe("Updated assessment");
    });

    it("should return 404 for non-existent contaminant", async () => {
      const response = await request(app)
        .put("/api/contaminants-detected/NONEXISTENT")
        .send({ risk_level: "low" });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/contaminants-detected/:id", () => {
    it("should delete a contaminant", async () => {
      await ContaminantModel.create({
        id: "C1",
        shipment_id: "S1",
        type: "Lead",
        concentration_ppm: 150,
        risk_level: "high",
        detected_at: "2025-10-06T10:30:00Z",
      });

      const response = await request(app).delete("/api/contaminants-detected/C1");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Contaminant deleted successfully");

      const contaminant = await ContaminantModel.findOne({ id: "C1" });
      expect(contaminant).toBeNull();
    });

    it("should return 404 for non-existent contaminant", async () => {
      const response = await request(app).delete("/api/contaminants-detected/NONEXISTENT");

      expect(response.status).toBe(404);
    });
  });
});

