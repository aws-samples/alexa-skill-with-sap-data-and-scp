const request = require('request')
const express = require('express');
const bodyParser = require('body-parser')
const passport = require('passport');
const xsenv = require('@sap/xsenv');
const JWTStrategy = require('@sap/xssec').JWTStrategy;

const app = express();

// Cloud Connector Virutal host details available in destination service
const abapDest = 'sapgwdemo'

// Get access to Connectivity, Destination and XSUAA services
const services = xsenv.getServices({
  uaa: 'odataproxy-uaa',
  dest: 'destination-lite',
  conn: 'connectivity-lite'
});


const uaa = services.uaa
const dest = services.dest
const conn = services.conn

const allowedHeadersInToSAP = ["accept", "accept-language", "dataserviceversion", "maxdataserviceversion", "content-type", "x-csrf-token", "cookie"]
const allowedHeadersOutOfSAP = ["content-type", "content-length", "x-csrf-token", "set-cookie"]

// Authentication strategy for this API. Will accecpt only JWT (access tokens) from XSUAA
passport.use(new JWTStrategy(uaa));
app.use(bodyParser.raw({type:'*/*'}));
// app.use(bodyParser.urlencoded({
//   extended: false
// }))
// app.use(bodyParser.json())
app.use(passport.initialize());
app.use(passport.authenticate('JWT', {
  session: false
}));

// Everything fails all the time, so debug capability is needed..
app.use('/debug', (req, res, next) => {
  proxyToBackend(req, res, true)
})


app.use('/*', (req, res, next) => {
  proxyToBackend(req, res, false)
});

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('App is listening on port ' + port);
});

// Here is where the magic happens - proxy whatever http data comes in to the backend
async function proxyToBackend(req, res, debug) {
  try {
    // Get the JWT token issued by XSUAA (Alexa app will provide this in the header based on account linking)
    const uaaToken = req.headers.authorization
    // Get access token to access destination service
    const destToken = await getToken(dest.url, dest.clientid, dest.clientsecret)
    // Get destination data using destination token from destination service. This contains the connection details of cloud connector
    const destData = await getDestinationDetails(dest, destToken)
    // Now also get an access token to access connecitivity serveice
    const connToken = await getToken(conn.url, conn.clientid, conn.clientsecret)

    // Filter unwanted headers.. too much junk gets added to http headers these days
    const inHeadersSAP = filterAllowedHeaders(cloneObject(req.headers), allowedHeadersInToSAP)

    var jsonBody = false
    var options = {
      // Connect to the destination url - cloud connector in this case
      url: destData.URL + req.originalUrl,
      method: req.method,
      // Proxy the connection to cloud connector through connectivity service
      proxy: 'http://' + conn.onpremise_proxy_host + ':' + conn.onpremise_proxy_port,
      headers: inHeadersSAP
    }

    console.log("Request url is : ", options.url)
    console.log("Proxy url is : ", options.proxy)
    // console.log("HC_ACCOUNT is :", process.env.HC_ACCOUNT)

    // This is a special header for passing the UAA access token which contains the user details. This is inturn used by principal propogation in cloud connector
    options.headers['SAP-Connectivity-Authentication'] = uaaToken
    options.headers['SAP-Connectivity-ConsumerAccount'] = "aa47b9f4-14d0-462e-aa9e-a18512d36b6c"
    // This is a special header for passing the connectivity service access token to tunnel the http connection through connectivity service
    options.headers['Proxy-Authorization'] = 'Bearer ' + connToken
    
    // Some more stuff for the code to work...
    options.headers['accept-encoding'] = 'deflate br'
    if (options.headers['content-type'] === 'application/json') {
      jsonBody = true
      options.json = true
    }
    if (req.method === 'PATCH' || req.method === 'POST' || req.method === 'PUT') {
      if (req.body) {
        var reqBody = req.body.toString('utf8')
        var contentLengh = 0
        if(jsonBody){
          reqBody = JSON.parse(reqBody)
          contentLengh = JSON.stringify(reqBody).length
          options.body = reqBody
        }else{
          options.body = reqBody
          contentLengh = Buffer.byteLength(reqBody,'UTF-8')
        }
        options.headers['content-length'] = contentLengh
        //options.headers['content-length'] = Buffer.byteLength(req.body,'UTF-8')
      } 
    }

    var body = {}
    body.uaa = uaa
    body.dest = dest
    body.conn = conn
    body.uaaToken = uaaToken
    body.destData = destData
    body.connToken = connToken
    body.userId = req.user.id
    body.url = req.url
    body.originalUrl = req.originalUrl
    body.method = req.method
    body.path = req.path
    body.query = req.query
    body.params = req.params
    body.headers = req.headers
    body.inHeadersSAP = inHeadersSAP
    body.body = req.body
    body.env = process.env
    body.options = options

    if (debug) {
      res.send(body)
    } else {
      //Finally I can call the cloud connector! Phew!
      request(options, (err, resp, body) => {
        if (err) {
          console.log('Error err is : ', err)
          res.send('Error in calling backend ')
        } else {
          res.set(filterAllowedHeaders(cloneObject(resp.headers), allowedHeadersOutOfSAP))
          if(typeof body != "object"){
            res.send(body + '')
          }else{
            res.send(body)
          }
        }
      })
    }
  } catch (e) {
    console.log('Error e is ', e)
    res.send('Error is calling backend: ' + JSON.stringify(e))
  }

}

//** Shallow clone object */
function cloneObject(src) {
  return JSON.parse(JSON.stringify(src));
}

//** Filter allowed headers */
function filterAllowedHeaders(headers, allowedHeaders) {
  for (var prop in headers) {
    if (!allowedHeaders.includes(prop)) {
      delete headers[prop]
    }
  }
  return headers
}

/** Get Destination Details */
function getDestinationDetails(dest, token) {
  return new Promise((resolve, reject) => {
    try {
      const get_options = {
        url: dest.uri + '/destination-configuration/v1/destinations/' + abapDest,
        headers: {
          'Authorization': 'Bearer ' + token
        }
      }
      request(get_options, (err, res, data) => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data).destinationConfiguration)
        } else {
          if (err) {
            reject(err)
          } else {
            reject(data)
          }

        }
      })
    } catch (e) {
      reject(e)
    }
  })
}

//** Get Token */
function getToken(url, clientid, clientsecret) {
  return new Promise((resolve, reject) => {
    try {
      const post_options = {
        url: url + '/oauth/token',
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(clientid + ':' + clientsecret).toString('base64'),
          'Content-type': 'application/x-www-form-urlencoded'
        },
        form: {
          'client_id': clientid,
          'grant_type': 'client_credentials'
        }
      }

      request(post_options, (err, res, data) => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data).access_token)
        } else {
          if (err) {
            reject(err)
          } else {
            reject(data)
          }
        }
      })

    } catch (e) {
      reject(e)
    }

  })
}