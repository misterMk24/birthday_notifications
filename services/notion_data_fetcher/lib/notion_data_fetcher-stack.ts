import { RemovalPolicy, Stack, StackProps, aws_dynamodb, aws_iam, aws_kms } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import dotenv from 'dotenv';
import LambdaFetcher from './lambda';

dotenv.config();

export class NotionDataFetcherStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new aws_dynamodb.Table(this, 'users', {
      partitionKey: { name: 'fullName', type: aws_dynamodb.AttributeType.STRING },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: process.env.TABLE_NAME!,
    });

    const encryptionKey = new aws_kms.Key(this, 'log-groups-encryption-key', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    encryptionKey.addToResourcePolicy(new aws_iam.PolicyStatement({
      actions: [
        'kms:Encrypt*',
        'kms:Decrypt*',
        'kms:ReEncrypt*',
        'kms:GenerateDataKey*',
        'kms:Describe*'
      ],
      principals: [new aws_iam.ServicePrincipal('logs.eu-central-1.amazonaws.com')],
      effect: aws_iam.Effect.ALLOW,
      resources: ['*'],
    }));

    new LambdaFetcher(this, 'LambdaFetcher', { encryptionKey, table, ...props });
  }
}
