import './LoadEnv'; // Must be the first import
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
    res.send('Serverless function is working properly');
};
