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

let accessToken;

app.get('/', (req, res) => {        //get requests to the root ("/") will route here
    // authorization uri
    const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?";

    // access_type
    const access_type = "access_type=offline&";
    // scopes
    const scope =
        "scope=" +
        encodeURIComponent(
            "https://www.googleapis.com/auth/drive.file" +
                " " +
                "https://www.googleapis.com/auth/drive.metadata.readonly" +
                " " +
                "https://www.googleapis.com/auth/userinfo.profile"
        ) +
        "&";
    // response type
    const response_type = "response_type=code&";
    // client id
    const client_id = "client_id=" + CLIENT_ID + "&";
    // redirect uri
    const redirect_uri = "redirect_uri=" + REDIRECT_URL;

    //#endregion

    // prepare url and return
    const oauthUrl = authUrl + access_type + scope + response_type + client_id + redirect_uri;
    res.render("index", { url: oauthUrl });
});

app.get("/api/drive/auth/oauthcallback", function (req, res) {
    const code = req.query.code;
    if (code) {
      // Get an access token based on our OAuth code
      oAuth2Client.getToken(code, function (err, tokens) {
        if (err) {
          console.log("Error authenticating");
          console.log(err);
        } else {
          console.log("Successfully authenticated");
          accessToken = tokens
          oAuth2Client.setCredentials(tokens);

          const oauth2 = google.oauth2({
            auth: oAuth2Client,
            version: "v2",
          });
          oauth2.userinfo.get(function (err, response) {
            if (err) {
              console.log(err);
            } else {
              console.log(response.data);
              authenticated = true;
              username = response.data.name;
              picture = response.data.picture
              res.render("success", {
                name: username,
                pic: picture,
                success:false,
                fileRead: false
              });
            }
          });
        }
      });
    }
});