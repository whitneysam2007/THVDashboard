import serverless from 'serverless-http';
import { createApiApp } from '../../server/apiApp';

export const handler = serverless(createApiApp());
