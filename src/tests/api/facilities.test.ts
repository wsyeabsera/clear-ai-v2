// API tests for facilities endpoints
import request from "supertest";
import { connectDB, disconnectDB } from "../../api/db/connection.js";
import { FacilityModel } from "../../api/models/Facility.js";
import app from "../../api/server.js";

const testDbUri = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/wasteer-test";

describe("Facilities API", () => {
  beforeAll(async () => {
    await connectDB(testDbUri);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clear data before each test
    await FacilityModel.deleteMany({});
  });

  describe("GET /api/facilities", () => {
    it("should return empty array when no facilities exist", async () => {
      const response = await request(app).get("/api/facilities");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("should return all facilities", async () => {
      await FacilityModel.create([
        {
          id: "F1",
          name: "Hannover Sorting Center",
          location: "Hannover",
          type: "sorting",
          capacity_tons: 500,
        },
        {
          id: "F2",
          name: "Berlin Processing Plant",
          location: "Berlin",
          type: "processing",
          capacity_tons: 1000,
        },
      ]);

      const response = await request(app).get("/api/facilities");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it("should filter facilities by location", async () => {
      await FacilityModel.create([
        {
          id: "F1",
          name: "Hannover Sorting Center",
          location: "Hannover",
          type: "sorting",
          capacity_tons: 500,
        },
        {
          id: "F2",
          name: "Berlin Processing Plant",
          location: "Berlin",
          type: "processing",
          capacity_tons: 1000,
        },
      ]);

      const response = await request(app).get("/api/facilities?location=Hannover");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].location).toBe("Hannover");
    });

    it("should filter facilities by type", async () => {
      await FacilityModel.create([
        {
          id: "F1",
          name: "Hannover Sorting Center",
          location: "Hannover",
          type: "sorting",
          capacity_tons: 500,
        },
        {
          id: "F2",
          name: "Berlin Processing Plant",
          location: "Berlin",
          type: "processing",
          capacity_tons: 1000,
        },
      ]);

      const response = await request(app).get("/api/facilities?type=processing");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe("processing");
    });

    it("should filter facilities by minimum capacity", async () => {
      await FacilityModel.create([
        {
          id: "F1",
          name: "Small Facility",
          location: "Hannover",
          type: "sorting",
          capacity_tons: 300,
        },
        {
          id: "F2",
          name: "Large Facility",
          location: "Berlin",
          type: "processing",
          capacity_tons: 1000,
        },
      ]);

      const response = await request(app).get("/api/facilities?min_capacity=500");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].capacity_tons).toBeGreaterThanOrEqual(500);
    });
  });

  describe("GET /api/facilities/:id", () => {
    it("should return a single facility by id", async () => {
      await FacilityModel.create({
        id: "F1",
        name: "Hannover Sorting Center",
        location: "Hannover",
        type: "sorting",
        capacity_tons: 500,
      });

      const response = await request(app).get("/api/facilities/F1");

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe("F1");
    });

    it("should return 404 for non-existent facility", async () => {
      const response = await request(app).get("/api/facilities/NONEXISTENT");

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/facilities", () => {
    it("should create a new facility", async () => {
      const newFacility = {
        id: "F1",
        name: "Test Facility",
        location: "Test City",
        type: "sorting",
        capacity_tons: 600,
      };

      const response = await request(app).post("/api/facilities").send(newFacility);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe("F1");
    });

    it("should return 409 for duplicate id", async () => {
      const facility = {
        id: "F1",
        name: "Test Facility",
        location: "Test City",
        type: "sorting",
        capacity_tons: 600,
      };

      await request(app).post("/api/facilities").send(facility);
      const response = await request(app).post("/api/facilities").send(facility);

      expect(response.status).toBe(409);
    });
  });

  describe("PUT /api/facilities/:id", () => {
    it("should update a facility", async () => {
      await FacilityModel.create({
        id: "F1",
        name: "Old Name",
        location: "Hannover",
        type: "sorting",
        capacity_tons: 500,
      });

      const response = await request(app)
        .put("/api/facilities/F1")
        .send({ name: "New Name", capacity_tons: 700 });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("New Name");
      expect(response.body.data.capacity_tons).toBe(700);
    });

    it("should return 404 for non-existent facility", async () => {
      const response = await request(app).put("/api/facilities/NONEXISTENT").send({ name: "New Name" });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/facilities/:id", () => {
    it("should delete a facility", async () => {
      await FacilityModel.create({
        id: "F1",
        name: "Test Facility",
        location: "Test City",
        type: "sorting",
        capacity_tons: 500,
      });

      const response = await request(app).delete("/api/facilities/F1");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Facility deleted successfully");

      const facility = await FacilityModel.findOne({ id: "F1" });
      expect(facility).toBeNull();
    });

    it("should return 404 for non-existent facility", async () => {
      const response = await request(app).delete("/api/facilities/NONEXISTENT");

      expect(response.status).toBe(404);
    });
  });
});

