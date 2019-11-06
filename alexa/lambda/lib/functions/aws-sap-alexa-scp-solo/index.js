const Alexa = require('ask-sdk-core');
const request = require("request")
const xml2js = require('xml2js');
const parser = new xml2js.Parser();

let skill;

//All allowed intents
exports.handler = async function (event, context) {
    console.log(`REQUEST++++${JSON.stringify(event)}`);
  if (!skill) {
    skill = Alexa.SkillBuilders.custom()
      .addRequestHandlers(
        LaunchRequestHandler,
        CustomerCountHandler,
        CreateContactHanlder,
        GetUserHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler
      )
      .addErrorHandlers(ErrorHandler)
      .create();
  }

  const response = await skill.invoke(event, context);
  console.log(`RESPONSE++++${JSON.stringify(response)}`);

  return response;
}

//Get the logged on user details
const GetUserHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetUserDetails';
    },
    async handle(handlerInput) {
        var speakOutput = 'Error getting user details. Please check logs'
        try{
            var path = '/sap/bc/soap/rfc'
            var body = require('./rfcrequest.js')
            var response = await getDataFromSAP(handlerInput,path,'POST',body,null,'text/xml')
            console.log('response is', response.body)
            parser.parseString(response.body,(parserError,result)=>{
              if(parserError){
                  console.log('Error in parsing ', parserError)
              }else{
                  try{
                    console.log('Result is ', JSON.stringify(result))
                    const userId = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['urn:ME_GET_CURRENT_USER_ID.Response'][0]['USERNAME'][0]
                    console.log('User ID is ', userId)
                    speakOutput = 'Your user name is '  + userId
                     
                  }catch(err){
                    console.log('Error in getting the result is ', err)
                  }
              }
            })

        }catch(e){
            console.log('Error is ', e.message)
        }
        return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
    }
}


// Get the customer count
const CustomerCountHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetCustomerCount';
    },
    async handle(handlerInput) {
        var speakOutput = 'Error getting customer count. Please check logs'
        try{
            var path = '/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/BusinessPartnerSet/$count'
            var response = await getDataFromSAP(handlerInput,path,'GET',null,null,'application/json')
            speakOutput = 'You have a total of ' + response.body + 'customers' ;
        }catch(e){
            speakOutput = 'Error getting customer count. Please check logs'
        }
        return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
    } 
}

//Create Contact
const CreateContactHanlder = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CreateContact'
    },
    async handle(handlerInput) {
        var speakOutput = 'Error creating contact. Please check logs'
        try{
            const firstName = handlerInput.requestEnvelope.request.intent.slots.FirstName.value
            const lastName = handlerInput.requestEnvelope.request.intent.slots.LastName.value
            const customer = handlerInput.requestEnvelope.request.intent.slots.Customer.value
            var path = '/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/ContactSet'
            var csrftoken = await getCsrfToken(handlerInput)
            var body = {
                "BusinessPartnerID" : customer,
                "FirstName" : firstName,
                "LastName" : lastName,
                "Sex" : "M",
                "EmailAddress" : "sap-on-aws@amazon.com",
                "PhoneNumber" : "555-555-5555",
	                "Address" : {
		            "Building" : "1800",
		            "Street" : "Terry Avenue",
		            "City" : "Seattle",
		            "PostalCode" : "98101",
		            "Country" : "US",
		            "AddressType" : "02"
	            }
            }
            var path = '/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/ContactSet'
            var response = await getDataFromSAP(handlerInput,path,'POST',body,csrftoken,'application/json')
            console.log('Response contact creation ' , response)
            speakOutput = 'Error creating contact. Please check your logs'
            try{
                var contactGuid = response.d.ContactGuid
                speakOutput = 'Contact successfully created'
            }catch(err){}
        }catch(e){
            console.log('Error is ', e.message)
            speakOutput = 'Error creating contact. Please check logs'
        }
        return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
    } 
}

//Get CSRF token
function getCsrfToken(handlerInput){
    return new Promise((resolve,reject)=>{
        try{
            var path = '/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/BusinessPartnerSet/$count'
            getDataFromSAP(handlerInput,path,null,null,'application/json').then((response)=>{
                resolve(response.headers['x-csrf-token'])  
            })
            
        }catch(e){
            console.log('unable to get csrf token ', e.message)
            reject(e)
        }
    })
    
   
}

//Get or Post data to/from SAP
function getDataFromSAP(handlerInput,path,method,body,csrftoken,contentType){
    return new Promise((resolve,reject)=>{
        try{
            var options = {}
            options.uri = process.env.APIURL +  path
            options.method = method
            options.headers = {
                "Accept":"application/json",
                "Authorization": "Bearer " + handlerInput.requestEnvelope.context.System.user.accessToken,
                "X-CSRF-Token": "Fetch",
            }
            if(method=='PUT' || method=='PATCH' || method=='POST'){
                options.headers['X-CSRF-Token'] = csrftoken
                options.body = body
            }
            options.jar = true
            options.headers['Content-Type'] = contentType
            if(contentType == 'application/json'){
                options.json = true
            }

            request(options,(err,resp,body)=>{
                if(err){
                    reject(err)
                }else{
                    resolve(resp)
                }
            })
        }catch(e){
            reject(e)
        }
    })
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to ' + process.env.SKILLNAME + ' created by AWS. How can I help?';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
}

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can ask about your user ID or get data from SAP! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


