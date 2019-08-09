import * as cdk from '@aws-cdk/core'
import * as api from '@aws-cdk/aws-apigateway'
import * as lambda from '@aws-cdk/aws-lambda'
import { _, $ } from './pure'

function RestApi(parent: cdk.Construct): api.RestApi {
  const rest = Gateway(parent)
  const method = new api.LambdaIntegration( Method(parent) )

  rest.root.addResource('delete').addMethod('DELETE', method)
  rest.root.addResource('get').addMethod('GET', method)
  rest.root.addResource('patch').addMethod('PATCH', method)
  rest.root.addResource('post').addMethod('POST', method)
  rest.root.addResource('put').addMethod('PUT', method)
  return rest
}

function Gateway(parent: cdk.Construct): api.RestApi {
  const rest = new api.RestApi(parent, 'Gateway',
    {
      deploy: true,
      deployOptions: {
        stageName: 'api'
      },
      failOnWarnings: true,
      endpointTypes: [api.EndpointType.REGIONAL]
    }
  )

  return rest
}

function Method(parent: cdk.Construct): lambda.Function {
  const fn = new lambda.Function(parent, 'Method',
    {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: new lambda.AssetCode('../apps/method'),
      handler: 'index.main'
    }
  )

  return fn
}

function HttpBin(stack: cdk.Construct): cdk.Construct {
  _(stack, RestApi)
  return stack
}

const app = new cdk.App()
$(app, HttpBin, `HttpBin-${process.env.BUILD_VERSION || 'a'}`)
app.synth()
