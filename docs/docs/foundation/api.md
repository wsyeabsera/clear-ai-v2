---
sidebar_position: 5
---

# API

REST API built with Express and MongoDB, providing CRUD operations for all domain entities.

## What Problem Does This Solve?

**Problem:** Need persistent data storage
**Solution:** RESTful API with MongoDB

## Endpoints

### Shipments
- `GET /api/shipments` - List with filters
- `GET /api/shipments/:id` - Get by ID
- `POST /api/shipments` - Create
- `PUT /api/shipments/:id` - Update
- `DELETE /api/shipments/:id` - Delete

### Facilities, Contaminants, Inspections
Same CRUD pattern for all entities

## Usage

```bash
# Start API server
yarn api:start

# Swagger docs
http://localhost:4000/api-docs
```

## Testing

```bash
yarn test api  # 52 tests
```

## Features

- MongoDB with Mongoose ODM
- Input validation
- Error handling
- Swagger documentation
- CORS enabled

---

**Foundation complete!** Next: [Environment Setup](../guides/environment-setup.md)
