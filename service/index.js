const express = require('express'); //Import the express dependency
const app = express();              //Instantiate an express app, the main work horse of this server
const port = 3000;                  //Save the port number where your server will be listening
const cors = require('cors');
const { google } = require('googleapis');
const fs = require("fs");
const multer = require("multer");


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
//username and picture
let username, picture;
//variable to store downloadable image file
let imageFile;
//check whether user is authenticated
let authenticated = false;

//define a storage location for our files
const Storage = multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, "./images");
    },
    filename: function (req, file, callback) {
      callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
});

//created upload function using multer
const upload = multer({
  storage: Storage,
}).single("file"); //Field name and max count


app.get('/', (req, res) => {        //get requests to the root ("/") will route here
    // authorization uri
    const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?";

    // access_type
    const access_type = "access_type=offline&";
    // scopes
    const scope =
        "scope=" +
        encodeURIComponent(
            //Allows access to files created or opened by app
            "https://www.googleapis.com/auth/drive.file" +
                " " +
                //Allows read-write access to file metadata
                "https://www.googleapis.com/auth/drive.metadata.readonly" +
                " " +
                //Allows access to user profile data
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

//callback request
app.get("/api/drive/auth/oauthcallback", function (req, res) {
    //assign OAuth code to variable
    const code = req.query.code;
    if (code) {
      // Get an access token based on our OAuth code
      oAuth2Client.getToken(code, function (err, tokens) {
        if (err) {
          console.log("Error authenticating");
          console.log(err);
        } else {
          console.log("Successfully authenticated");
          //assign token to global variable
          accessToken = tokens
          //set
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

//fetch file from drive
app.post('/readDrive', (req, res) => {
    if (authenticated) {
        oAuth2Client.setCredentials(accessToken);
        //initiate drive instance
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });
        drive.files.list({
            pageSize: 10,
        }, (err, response) => {
            if (err) {
                console.log('The API returned an error: ' + err);
                return res.status(400).send(err);
            }
            const files = response.data.files;
            imageFile = files[0];
            res.render("success",{name:username,pic:picture,fileRead:true,success:false});
        });
    } else {
        res.redirect("/");
    }

});

//upload image
app.post("/upload", (req, res) => {
    upload(req, res, function (err) {
      if (err) {
        console.log(err);
        res.redirect('/');
      } else {
        console.log(req.file.path);
        const drive = google.drive({ version: "v3",auth:oAuth2Client  });
        const fileMetadata = {
          name: req.file.filename,
        };
        const media = {
          mimeType: req.file.mimetype,
          body: fs.createReadStream(req.file.path),
        };
        drive.files.create(
          {
            resource: fileMetadata,
            media: media,
            fields: "id",
          },
          (error, file) => {
            if (error) {
              // Handle error
              res.redirect('/');
              console.error(error);
            } else {
              //remove file from filesystem
              fs.unlinkSync(req.file.path)
              res.render("success",{name:username,pic:picture,success:true,fileRead:false})
            }

          }
        );
      }
    });
});

//logout functionality
app.get('/logout',(req,res) => {
    authenticated = false;
    accessToken = null;
    res.redirect('/')
});

//download drive file
app.post('/download', (req, res) => {
  if (authenticated) {
      oAuth2Client.setCredentials(accessToken);
      const drive = google.drive({ version: 'v3', auth: oAuth2Client });
      const fileId = imageFile.id;

      drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' },
          function (err, response) {
              console.log(response.data)
              response.data
                  .on('end', () => {
                      console.log('Done');
                  })
                  .on('error', err => {
                      console.log('Error', err);
                  })
                  //pipe method used to attach the fetched drive file and render on browser
                  .pipe(res);
          });

  } else {
      res.redirect("/");

  }
});
