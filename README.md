## aws-sap-alexa-scp

This is a sample Alexa skill that integrates to a backend SAP application using SAP Cloud Platform and SAP Cloud Connector. This repository contains a sample SAP Cloud Platform (CloudFoundry) app that acts as an API endpoint to access backend SAP developer edition application through cloud connector. The backend SAP application and cloud connector can be in your on-premise or hosted on Amazon EC2 instances. SAP Cloud platform account can be in any region where CloudFoundry environment is supported.

## Requirements
* [AWS CLI already configured with Administrator permission](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html)
* [NodeJS 10.x installed](https://nodejs.org/en/download/)
* [AWS CDK installed](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
* [SAP Cloud Platform Trial Account](https://developers.sap.com/tutorials/hcp-create-trial-account.html)
* SAP application (ABAP stack). If required, you can create an SAP ABAP developer edition using cloud formation template [here](https://github.com/aws-samples/aws-cloudformation-sap-abap-dev) or create one using [SAP Cloud application library](https://cal.sap.com)
* SAP Cloud Connector installed. Check [this](https://developers.sap.com/tutorials/cp-connectivity-install-cloud-connector.html) tutorial for more information. For testing purposes, you can install cloud connector on Amazon linux as well.
* [SAP Cloud Foundry Command Line installed and setup](https://developers.sap.com/tutorials/cp-cf-download-cli.html)
* [Alexa Developer Account](https://developer.amazon.com/en-US/alexa)

## Setup Process
Note: This process creates various resources in your AWS account. Check the resources created section for more information on what gets created. You incur charges for using the resources created and you are responsible for those charges.

### SAP Cloud Platform setup

* Setup secure tunnel between ABAP System and SAP Cloud Platform through Cloud Connector - [Set up Secure Tunnel between ABAP System and SAP Cloud Platform (CF)](https://developers.sap.com/tutorials/cp-connectivity-create-secure-tunnel.html)
NOTE: In the tutorial above, under Step 3: Allow access to ABAP resources, use URL path as '/' instead of '/sap/opu/odata'. This will allow SCP to access all URL paths in the backend ABAP system

* Configure SAP Cloud Connector for Principal propagation. Check [How to Guide – Principal Propagation in an HTTPS Scenario](https://blogs.sap.com/2017/06/22/how-to-guide-principal-propagation-in-an-https-scenario/) blog for setup steps. 

    NOTE: 
    1. In the above blog, the author uses their SCP user ID to create a dummy user certificate in cloud connector for using in CERTRULE transaction. Since you will be using your SCP, I suggest you use your email ID that was used for the SCP account to generate the dummy certificate
    2. In CERTRULE transaction, the author is mapping the 'User Name' to the 'Login As' attribute. Here again, use email ID for 'Login As' attribute.
    3. Map the email ID to an available user ID in the SAP ABAP developer edition using SU01 transaction.
    4. The content under 'Create Destination' is outdated in this blog. Use the steps detailed below instead

* Activate '/sap/bc/soap/rfc' in SICF transaction in SAP application

* Create a destination with name 'sapgwdemo' for the ABAP virtual system in SAP Cloud Platform. See [Managing Destinations](https://help.sap.com/viewer/cca91383641e40ffbe03bdc78f00f681/Cloud/en-US/84e45e071c7646c88027fffc6a7bb787.html) for more more information on how to access the 'Create destination editor' and creating HTTP destinations using the destination editor. 

### SAP Cloud Platform deployment

* Clone this repo to a folder of your choice

* Navigate to the foloder that has the SAP Cloud Platform app and install dependecies
```bash
cd aws-sap-alexa-scp/sap-odata-proxy-api/odataproxyapi
npm install
```
* Navigate one level up
```bash
cd ..
```
* Login to your SAP Cloud Platform account. Check (this)[https://developers.sap.com/tutorials/cp-cf-download-cli.html)] for more information on which URL you should choose for logging in
```bash
cf login -a <YOUR SAP CLOUD PLATFORM URL for e.g. https://api.cf.us10.hana.ondemand.com>
```

* Create a connectivity service
```bash
cf create-service connectivity lite connectivity-lite -t alexademo_conn
```

* Create a destination service
```bash
cf create-service destination lite destination-lite -t alexademo_dest
```

* Create a XSUAA service
```bash
cf create-service xsuaa application odataproxy-uaa -c xs-security.json
```
NOTE: 
1. If you changed the name for connectivity, destination or XSUAA service about, then open the manifest.yml in a text editor and replace them as such under 'services'
2. If you use a destination name is other than 'sapgwdemo' in the SAP Cloud Platform setup, then go to 'odataproxyapi' folder, open the start.js file and update the destination name for 'abapDest' constant.
```bash
const abapDest = '[replace this with your destination name if you used anything other than sapgwdemo]'
```
Similarly update the value for uaa, dest and conn variables under services.

* Open the manifest.yml file and update the host field to something unique. For e.g. change it from awscf-odataproxy-api to <some unique id>-odataproxy-api. Otherwise, the deployment of the app could fail

* Push the app to SAP Cloud Platform
```bash
cf push
```
* Once the application is deployed successfully
    1. Log on the SAP Cloud Platform console using your web browswer, go to subaccounts -> spaces->[YOUR SPACE NAME]. 
    2. Then go to Service Instances -> [Your XSUAA instance, for e.g. odataproxy-uaa] -> Show Sensitive data. 
    3. Note down the values for the following fields : 
        * url
        * clientid
        * clientsecret 

You will need to use them when you create an Alexa skill later.

### Alexa skill deployment
* Log on to your Alexa developer account and create a custom skill from scratch. Check [Quick Reference: Create a custom skill for Alexa](https://developer.amazon.com/docs/quick-reference/custom-skill-quick-reference.html) for more information on how to create a custom skill

* Once inside the skill build console, go to the 'JSON Editor' in the left navigation and upload (or drag and drop) the skills.json file from the 'alexa' folder in this project.

* The skills.json uses 'solo' as the invocation name. If want to use a different invocation name, update the value for 'invocationName' variable in the skills.json file.

* Go to 'Endpoint' in the left navigation and choose 'AWS Lambda ARN' as the 'Service Endpoint Type'. Copy the 'Your Skill ID' to clipboard

* Go to 'Account Linking' in the left navigation, enable 'Do you allow users to create an account or link to an existing account with you?' 

* Choose 'Auth Code Grant' and update the following fields. Leave other values as-is
    * Authorization URI = <url from the XSUAA service> + /oauth/authorize. For e.g. https://yourscpaccount.authentication.us10.hana.ondemand.com/oauth/authorize
    * Access Token URI = <url from the XSUAA service> + /oauth/authorize. For e.g. https://yourscpaccount.authentication.us10.hana.ondemand.com/oauth/token
    * Your Client ID = 'clientid' from your XSUAA service in SAP Cloud Platform
    * Your Secret = 'clientsecret' from your XSUAA service in SAP Cloud Platform

### AWS Lambda deployment

* Navigate to the alexa/lambda/ folder and install dependencies
```bash
cd aws-sap-alexa-scp/alexa/lambda
npm install
```

* Navigate to the alexa/lambda/lib folder
```bash
cd aws-sap-alexa-scp/alexa/lambda/lib
```

* Open appConfig.json and update the following fields

    - account = [Your AWS Account ID]
    - region = [Your AWS region where you want the Lambda function to be deployed]
    - odataProxyAPIUrl = [Your odataproxyapi url from SAP cloud platform]. You can get this url by navigating to subaccount -> spaces -> [Your space] -> Applications -> odataproxyapi -> Application Routes. For e.g. https://mycf-odataproxy-api.cfapps.us10.hana.ondemand.com
    - alexaskill.name = [Your Alexa skill name. For e.g. solo]
    - alexaskill.id  = [Your Alexa skill ID copied earlier from Alexa developer console. For e.g. amzn1.ask.skill.96d02cbf-ffda-4567-3454a-58222c9f9b50]


* Navitage to alexa/lambda/lib/functions/aws-sap-alexa-scp-solo folder and install dependencies
```bash
cd aws-sap-alexa-scp/alexa/lambda/lib/functions/aws-sap-alexa-scp-solo
npm install
```

* Navigate back to the lambda directory and deploy the resources to your AWS account. Make sure you AWS CLI is setup for accessing the correct AWS account
```bash
cd aws-sap-alexa-scp/alexa/lambda/
cdk synth
cdk deploy
```
* Once the resources are successfully deployed, note down the Lambda ARN from the output. It is available as 'AlexaSkillLambdaFunctionArn' output field in cloud formation

### Alexa Skill Build

* Go back to your Alexa skill in the Alexa developer console, navigate to 'Endpoint' and update the Lambda ARN from above under 'Default Region' field. 

* Navigate to 'Invocation', 'Save Mode' and then 'Build Model'

### Testing

* First, test if you are able to able to access the SAP Cloud Platform service using a tool like Postman. For Authentication/Authorization, you can use 'OAuth2.0' type and get an access token. You can use the following fields to generate token

    * Grant Type = Authorization Code
    * Callback URL = https://www.getpostman.com/oauth2/callback
    * Auth URL = <url from the XSUAA service> + /oauth/authorize. For e.g. https://yourscpaccount.authentication.us10.hana.ondemand.com/oauth/authorize
    * Access Token URL = <url from the XSUAA service> + /oauth/authorize. For e.g. https://yourscpaccount.authentication.us10.hana.ondemand.com/oauth/token
    * Client ID = 'clientid' from your XSUAA service in SAP Cloud Platform
    * Client Secret = 'clientsecret' from your XSUAA service in SAP Cloud Platform
    * Client Authentication = Send as Basic Auth Header

* Once you have the token, send a 'GET' call to your SAP Cloud Platform app end point. You can get your end point url by navigating to subaccount -> spaces -> [Your space] -> Applications -> odataproxyapi -> Application Routes. For e.g. https://mycf-odataproxy-api.cfapps.us10.hana.ondemand.com. With this end point URL, you will be calling a backend OData service. If you are using ABAP developer edition, the url path can be /sap/opu/odata/IWBEP/GWSAMPLE_BASIC/BusinessPartnerSet?$format=json. So, the full URL for the postman get request will be something like this - https://mycf-odataproxy-api.cfapps.us10.hana.ondemand.com/sap/opu/odata/IWBEP/GWSAMPLE_BASIC/BusinessPartnerSet?$format=json

* If all works fine, you should get back list of busienss partners as JSON document as response

* Now, test you Alexa skill. Launch https://alexa.amazon.com/ and log in using your Alexa developer account. Then navigate to Skills -> Your Skills -> Dev Skills -> [Your Skill Name; for e.g. solo] -> Enable Skill

* Once skill is enabled, click on Settings -> Link Account -> Log in to SAP Cloud Platform account. This step will link your SAP Cloud Platform account with Alexa skill

* Now, go back to Alexa developer console and test the skill by typing the following commands in the 'Alexa Simulator'
    * Launch solo (or whatever invocation name you used for your skill)
    * What is my user ID? (the response should display your SAP user ID if the SSO worked correctly)
    * 

### Error Handling
* Check the Lambda logs in case of skill response issues.

* Check SAP Cloud platform application logs if the lambda is failing with an error response from SAP Cloud Platform

* If you are hitting authorization errors, check if you client ID and secret is correct. If those are correct, increase the tracelevel in SMICM transaction in backend SAP and check if the SSO was successful. Check [this](https://wiki.scn.sap.com/wiki/display/ASJAVA/How+to+troubleshoot+Cloud+Connector+principal+propagation+over+HTTPS) wiki page on how to trouble shoot Cloud connector principal propagation over HTTPs

* Make sure you have activated '/sap/bc/soap/rfc' for the 'What is my user ID?' question to work. 

## Created Resources by CDK/CloudFormation
* Lambda function for handling Skill request/response and integrating with SAP Cloud Platform
* A new role for Lambda execution
* A new Lambda permission for the Alexa Skill

## Cleanup
* Delete all the AWS resources created
```bash
cd aws-sap-alexa-scp/alexa/lambda/
cdk destroy
```
* Log on to SAP Cloud Platform and 'stop' the applications if required or delete them

* Delete the Alexa skill if required

## License
This project is licensed under the Apache-2.0 License.
