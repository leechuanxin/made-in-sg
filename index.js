import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Custom imports
import auth from './middleware.js';
import * as routes from './routes.js';

// Initialise DB connection
const { Pool } = pg;
// create separate DB connection configs for production vs non-production environments.
// ensure our server still works on our local machines.
let pgConnectionConfigs;
if (process.env.DATABASE_URL) {
  // pg will take in the entire value and use it to connect
  pgConnectionConfigs = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  };
} else if (process.env.PROVIDER === 'AWS') {
  // determine how we connect to the remote Postgres server
  pgConnectionConfigs = {
    user: 'postgres',
    // set DB_PASSWORD as an environment variable for security.
    password: process.env.DB_PASSWORD,
    host: 'localhost',
    database: 'madesg',
    port: 5432, // Postgres server always runs on this port by default
  };
} else {
  // determine how we connect to the local Postgres server
  pgConnectionConfigs = {
    user: 'chuanxin',
    host: 'localhost',
    database: 'madesg',
    port: 5432, // Postgres server always runs on this port by default
  };
}

const pool = new Pool(pgConnectionConfigs);

const app = express();
// Set view engine
app.set('view engine', 'ejs');
// To receive POST request body data in request.body
app.use(express.urlencoded({ extended: false }));
// Override POST requests with query param ?_method=PUT to be PUT requests
app.use(methodOverride('_method'));
// To parse cookie string value in the header into a JavaScript Object
app.use(cookieParser());
// Set public folder for static files
app.use(express.static('public'));
// Set up Node to pull process env values from .env files
dotenv.config();

// GLOBAL CONSTANTS
const PORT = process.env.PORT || 3004;

// Auth
app.use(auth(pool));
// Routes
app.get('/', routes.handleIndex(pool));
app.get('/signup', routes.handleGetSignup);
app.post('/signup', routes.handlePostSignup(pool));
app.get('/login', routes.handleGetLogin);
app.post('/login', routes.handlePostLogin(pool));
app.delete('/logout', routes.handleLogout);
app.get('/story', routes.handleGetNewStory);
app.post('/story', routes.handlePostNewStory(pool));
app.get('/story/:id', routes.handleGetStory(pool));
app.delete('/story/:id/delete', routes.handleDeleteStory(pool));
app.get('/story/:id/paragraph', routes.handleGetStoryParagraph(pool));
app.post('/story/:id/paragraph', routes.handlePostStoryParagraph(pool));
app.get('/story/:storyId/paragraph/:paragraphId', routes.handleGetEditParagraph(pool));
app.post('/story/:storyId/paragraph/:paragraphId', routes.handlePostEditParagraph(pool));

app.listen(PORT);
