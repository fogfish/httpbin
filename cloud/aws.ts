import * as cdk from '@aws-cdk/core'
import * as api from '@aws-cdk/aws-apigateway'
import * as lambda from '@aws-cdk/aws-lambda'
import * as ca from '@aws-cdk/aws-certificatemanager'
import * as dns from '@aws-cdk/aws-route53'
import * as target from '@aws-cdk/aws-route53-targets'
import * as secret from '@aws-cdk/aws-secretsmanager'
import { _, $ } from './pure'
import { Duration } from '@aws-cdk/core';

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
  const config = secret.Secret.fromSecretAttributes(parent, 'Secret', {secretArn: 'fog.fish'});
  const rest = new api.RestApi(parent, 'HttpBinGw',
    {
      deploy: true,
      deployOptions: {
        stageName: 'api'
      },
      domainName: {
        certificate: ca.Certificate.fromCertificateArn(parent, 'TLS', config.secretValueFromJson('certificate').toString()),
        domainName: `${vsn()}.httpbin.fog.fish`
      },
      failOnWarnings: true,
      endpointTypes: [api.EndpointType.REGIONAL]
    }
  )

  const zone = dns.HostedZone.fromHostedZoneAttributes(parent, 'HostedZone', {
    hostedZoneId: config.secretValueFromJson('hostedZoneId').toString(),
    zoneName: 'fog.fish'
  })
  new dns.ARecord(parent, 'DomainName', {
    zone,
    ttl: Duration.seconds(60),
    recordName: `${vsn()}.httpbin.fog.fish`,
    target: {aliasTarget: new target.ApiGateway(rest)}
  })

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

function vsn(): string {
  return process.env.VSN || 'local'
}

const app = new cdk.App()
$(app, HttpBin, `HttpBin-${vsn()}`)
app.synth()
