# Safety Compliance Tracking Backend

A comprehensive Node.js/Express backend for the Safety Compliance Tracking App with JWT authentication, MongoDB integration, and analytics capabilities.

## Features

- 🔐 JWT-based authentication with account lockout protection
- 📊 Comprehensive analytics and reporting
- 🛡️ Security features (rate limiting, input validation, CORS)
- 📱 RESTful API design
- 🔍 Advanced filtering and pagination
- 📈 Real-time analytics and charts data
- 🗄️ MongoDB with optimized queries
- 🧪 Test coverage with Jest
- 📝 Comprehensive logging
- 🐳 Docker support

## Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/safety_compliance
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12
SECRET_ID=admin123
SECRET_PASSWORD=admin123456
CORS_ORIGIN=http://localhost:3000
```

4. Setup database:
```bash
node scripts/setup.js
```

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token
- `PUT /api/auth/change-password` - Change user password

### Safety Records
- `GET /api/safety` - Get all safety records (with filtering)
- `POST /api/safety` - Create new safety record
- `GET /api/safety/:id` - Get single safety record
- `PUT /api/safety/:id` - Update safety record
- `DELETE /api/safety/:id` - Delete safety record

### Analytics
- `GET /api/analytics/dashboard` - Dashboard overview stats
- `GET /api/analytics/area-defaulters` - Area vs defaulters data
- `GET /api/analytics/monthly-trend` - Monthly compliance trends
- `GET /api/analytics/equipment-breakdown` - Equipment compliance breakdown
- `GET /api/analytics/department-analytics` - Department-wise analytics
- `GET /api/analytics/daily-trend` - Daily compliance trends

## API Usage Examples

### Login
```javascript
POST /api/auth/login
{
  "secretId": "admin123",
  "password": "admin123456"
}
```

### Create Safety Record
```javascript
POST /api/safety
Authorization: Bearer <token>
{
  "area": "PRODUCTION_FLOOR",
  "name": "John Doe",
  "department": "Manufacturing",
  "safetyShoes": true,
  "safetyGlasses": false,
  "safetyJacket": true,
  "date": "2024-01-15",
  "strength": 120
}
```

### Get Analytics
```javascript
GET /api/analytics/dashboard?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

## Data Models

### Safety Record
```javascript
{
  "date": "2024-01-15T00:00:00.000Z",
  "area": "PRODUCTION_FLOOR",
  "name": "John Doe",
  "department": "Manufacturing",
  "safetyShoes": true,
  "safetyGlasses": false,
  "safetyJacket": true,
  "strength": 120,
  "isDefaulter": true, // calculated
  "createdBy": "admin123"
}
```

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- Account lockout after 5 failed attempts
- CORS protection
- Helmet security headers
- Request logging

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t safety-backend .
docker run -p 5000:5000 safety-backend
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | - |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRE | JWT expiration time | 7d |
| SECRET_ID | Admin user ID | - |
| SECRET_PASSWORD | Admin password | - |
| BCRYPT_ROUNDS | Password hashing rounds | 12 |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |

## Logging

Logs are stored in the `logs/` directory:
- `error.log` - Error level logs
- `combined.log` - All logs

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License