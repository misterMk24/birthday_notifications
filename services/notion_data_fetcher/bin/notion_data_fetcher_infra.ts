#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NotionDataFetcherStack } from '../lib/notion_data_fetcher-stack';
import { AWS_ACCOUNT, REGION } from '../src/constants';

const app = new cdk.App();
new NotionDataFetcherStack(app, 'NotionDataFetcherStack', {
  env: { account: AWS_ACCOUNT, region: REGION },
});