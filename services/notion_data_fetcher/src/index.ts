import { Context } from 'aws-lambda';
import { NotionDataFetcherService } from './services/NotionDataFetcherService';

const logger = require('pino')();

export const handler = async(_event: string, context: Context): Promise<any> => {
  const childLogger = logger.child({ request_id: context.awsRequestId });
  childLogger.info('Processing data...');

  try {
    await new NotionDataFetcherService().call();
    childLogger.info('Processed successfully');

    return { statusCode: 200, body: '' };
  } catch (error: any) {
    childLogger.error(error);

    return {
      statusCode: error.status,
      body: JSON.stringify({
        message: error.message
      }),
    };
  }
};