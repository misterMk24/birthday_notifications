import { Duration, RemovalPolicy, StackProps, aws_iam } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';

dotenv.config();

interface LambdaFetcherProps extends StackProps {
  encryptionKey: IKey;
  table: Table;
}

export default class LambdaFetcher extends Construct {
  lambdaName: string;
  props: LambdaFetcherProps;
  lambda: NodejsFunction;
  logGroup: LogGroup;
  
  constructor(scope: Construct, id: string, props: LambdaFetcherProps) {
    super(scope, id);

    this.props = props;
    this.lambdaName = 'notion-fetcher';
    this.logGroup = this.configureLogGroup();
    this.lambda = this.configureLambdaFunction();
    this.configureLambdaPolicies();
  }

  
  configureLogGroup(): LogGroup {
    return new LogGroup(this, 'notion-fetcher-log-group', {
      logGroupName: `/aws/lambda/${this.lambdaName}`,
      retention: RetentionDays.ONE_MONTH,
      encryptionKey: this.props.encryptionKey,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  configureLambdaFunction(): NodejsFunction {
    return new NodejsFunction(this, 'notion-fetcher', {
      functionName: this.lambdaName,
      entry: 'src/index.ts',
      environment: {
        TABLE_NAME: process.env.TABLE_NAME!,
        NOTION_KEY: process.env.NOTION_KEY!,
        NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID!,
      },
      handler: 'index.handler',
      runtime: Runtime.NODEJS_18_X,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(60),
    });
  }

  configureLambdaPolicies(): void {
    this.props.table.grantFullAccess(this.lambda);
    this.logGroup.grant(this.lambda,
      'logs:CreateLogStream',
      'logs:PutLogEvents',
    )
  }
}