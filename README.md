# Neurateach - AI Learning Objectives Generator

An AI-powered web application that helps teachers generate comprehensive learning objectives from curriculum documents.

## Features

- Upload PDF and Word curriculum documents
- AI-powered learning objective generation using OpenAI
- Editable learning objectives interface
- Unit organization and management
- User authentication and data persistence
- Clean, intuitive web interface

## Technology Stack

- **Frontend**: React 18 with Vite
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-3.5-turbo
- **Authentication**: JWT tokens
- **File Processing**: PDF.js and Mammoth.js

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd neurateach
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your database URL, JWT secret, and OpenAI API key.

4. Set up the database:
   ```bash
   # Create your PostgreSQL database
   createdb neurateach
   
   # Run the schema
   psql neurateach < backend/schema.sql
   ```

5. Start the development servers:
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Usage

1. Register for an account or log in
2. Upload a curriculum document (PDF or Word)
3. Review the AI-generated learning objectives
4. Edit, add, or remove objectives as needed
5. Save the unit with a name and description
6. Browse and manage your units from the dashboard

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### File Upload & Processing
- `POST /api/uploads` - Upload and process curriculum document

### Units Management
- `GET /api/units` - Get user's units
- `POST /api/units` - Create new unit
- `GET /api/units/:id` - Get unit details
- `PUT /api/units/:id` - Update unit
- `DELETE /api/units/:id` - Delete unit

### Learning Objectives
- `POST /api/objectives` - Create new objective
- `PUT /api/objectives/:id` - Update objective
- `DELETE /api/objectives/:id` - Delete objective

## Deployment

### Railway (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repo to Railway
3. Add environment variables in Railway dashboard
4. Deploy automatically

### Environment Variables for Production

```
DATABASE_URL=your_railway_postgres_url
JWT_SECRET=your_secure_jwt_secret
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.