const express = require('express'); //Import the express dependency
const app = express();              //Instantiate an express app, the main work horse of this server
const port = 3000;                  //Save the port number where your server will be listening
const cors = require('cors');
const { google } = require('googleapis');



// load .env configurations
require("dotenv").config();

// Google OAuth client id, secret and redirect uri configured from .env
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

app.use(cors());

app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`🚀 Server ready at http://localhost:${port}`);
});

//set view engine to ejs
app.set("view engine", "ejs");

