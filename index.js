import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Custom imports
import auth from './auth.js';
import * as routes from './routes.js';

// Initialise DB connection
const { Pool } = pg;
// create separate DB connection configs for production vs non-production environments.
// ensure our server still works on our local machines.
let pgConnectionConfigs;
if (process.env.ENV === 'PRODUCTION') {
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
const PORT = process.argv[2];

// Auth
app.use(auth(pool));
// Routes
app.get('/story', routes.handleGetNewStory);
app.post('/story', routes.handlePostNewStory(pool));

app.listen(PORT);
