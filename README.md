# Food Street

Food Street is a food-ordering application built with the MERN stack:

- **Frontend:** React with JavaScript, HTML, and CSS
- **Backend:** Node.js and Express
- **Database:** MongoDB through Mongoose
- **Menu data:** CSV files imported by the frontend seed payload

The previous TypeScript, PostgreSQL, Prisma, and Vercel-function layers have been removed. The application now runs as one Express service that exposes the API and serves the built frontend.

## Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

## Configure MongoDB

Copy `.env.example` to `.env` and set `MONGODB_URI`:

```bash
cp .env.example .env
```

For local MongoDB:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/food_street
```

For MongoDB Atlas, use the connection string supplied by Atlas.

## Run in development

```bash
npm install
npm run dev
```

The development server runs on `http://localhost:3000` and uses Vite middleware for hot reload. You can choose another port with `PORT=5100 npm run dev`.

The API returns a clear `503` response when MongoDB is not configured or connected. The customer UI still retains its local seeded data so it can be previewed without a database.

## Build and run production

```bash
npm run build
npm start
```

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/status` | MongoDB connection and collection counts |
| GET/POST/DELETE | `/api/stores` | Store data administration |
| GET/POST/DELETE | `/api/categories` | Category data administration |
| GET/POST/PUT/DELETE | `/api/orders` | Order creation, tracking, updates, and deletion |
| POST | `/api/seed` | Upsert initial stores and categories |
