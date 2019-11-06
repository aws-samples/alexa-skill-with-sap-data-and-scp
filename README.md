## aws-sap-alexa-scp

This is a sample Alexa skill that integrates to a backend SAP application using SAP Cloud Platform and SAP Cloud Connector. This repository contains a sample SAP Cloud Platform (CloudFoundry) app that acts as an API endpoint to access backend SAP developer edition application through cloud connector. The backend SAP application and cloud connector can be in your on-premise or hosted on Amazon EC2 instances. SAP Cloud platform account can be in any region where CloudFoundry environment is supported.

## Requirements
* [AWS CLI already configured with Administrator permission](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html)
* [NodeJS 10.x installed](https://nodejs.org/en/download/)
* [AWS CDK installed](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
* [SAP Cloud Platform Trial Account](https://developers.sap.com/tutorials/hcp-create-trial-account.html)
* SAP application (ABAP stack). If required, you can create an SAP ABAP developer edition using cloud formation template [here](https://github.com/aws-samples/aws-cloudformation-sap-abap-dev) or create one using [SAP Cloud application library](https://cal.sap.com)
* SAP Cloud Connector installed. Check [this](https://developers.sap.com/tutorials/cp-connectivity-install-cloud-connector.html) tutorial for more information. For testing purposes, you can install cloud connector on Amazon linux as well.
* Configure SAP Cloud Connector for Principal propagation. Check [this](https://blogs.sap.com/2017/06/22/how-to-guide-principal-propagation-in-an-https-scenario/) blog for setup steps. NOTE: This blog uses userID as the CN for CERTRULE. Since you will be creating a trial SAP cloud platform account, it is recommended to use EMAIL ID as the CN and also map it to the email ID field in CERTRULE and SU01 transaction
* [SAP Cloud Foundry Command Line installed and setup](https://developers.sap.com/tutorials/cp-cf-download-cli.html)

## Setup Process

### SAP Cloud Platform deployment
Note: This process creates various resources in your AWS account. Check the resources created section for more information what gets created. You incur charges for using the resources created and you are responsible for those charges.

1. Clone this repo to a folder of your choice


2. Navigate to the cloud foundry application folder and install dependecies
```bash
cd aws-sap-alexa-scp/sap-odata-proxy-api/odataproxyapi
npm install
```

3. Navigate one level up
```bash
cd ..
```

4. Login to your SAP Cloud Foundry account. Check (this)[https://developers.sap.com/tutorials/cp-cf-download-cli.html)] for more information on which URL you should choose for logging in
```bash
cf login -a <YOUR SAP CLOUD PLATFORM URL for e.g. https://api.cf.us10.hana.ondemand.com>
```

5. Create a connectivity service
```bash
cf create-service connectivity lite connectivity-lite -t alexademo_conn
```

6. Create a destination service
```bash
cf create-service destination lite destination-lite -t alexademo_dest
```

7. Create a XSUAA service
```bash
cf create-service xsuaa application odataproxy-uaa -c xs-security.json
```

8. Push the app to SAP Cloud Platform
```bash
cf push
```

### Alexa skill deployment
WIP

### AWS Lambda deployment
WIP

### Testing
WIP

### Error Handling
WIP

## Created Resources
WIP

## Cleanup
WIP

## License Summary
This sample code is made available under the MIT-0 license. See the LICENSE file.