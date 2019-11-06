const cdk = require('@aws-cdk/core');
const iam = require('@aws-cdk/aws-iam')
const lambda = require('@aws-cdk/aws-lambda')
const AppConfig = require('./appConfig.json')
const path = require('path')

class LambdaStack extends cdk.Stack {
  /**
   *
   * @param {cdk.Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    //Lambda role
    const lambdaRole = new iam.Role(this, 'SCPAlexaLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    })

    //Add basic execution and VPC execution roles
    lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambdaExecute'))

    //Create the skill lambda function
    const skillHandler = new lambda.Function(this, 'AlexaSkillHandler', {
      code: lambda.Code.fromAsset(path.join(__dirname, 'functions/aws-sap-alexa-scp-solo')),
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      description: 'Sample Lambda function for alexa skill through SCP',
      role: lambdaRole,
      timeout: cdk.Duration.seconds(29),
      memorySize: 1024,
      environment: {
        APIURL: AppConfig.scp.odataProxyAPIUrl,
        SKILLNAME: AppConfig.alexaskill.name
      }
    })

    //Outputs
    new cdk.CfnOutput(this,'AlexaSkillLambdaFunctionArn',{
      value: skillHandler.functionArn,
      description: "Alexa skill hander Lambda function ARN",
      exportName: AppConfig.cfexports.AlexaSkillLambdaFunctionArn
    })

  }
}

module.exports = {
  LambdaStack
}