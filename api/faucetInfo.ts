import { VercelRequest, VercelResponse } from '@vercel/node';
import { WsProvider, ApiPromise } from '@polkadot/api';
import { config } from 'dotenv';

config();

export default async (req: VercelRequest, res: VercelResponse) => {
    const URL_TEST_NET = process.env.URL_TEST_NET || 'wss://beresheet.jelliedowl.net';
    const wsProvider = new WsProvider(URL_TEST_NET);
    const api = await ApiPromise.create({ provider: wsProvider });
    let bal: any = await api.query.system.account(process.env.ADDRESS);

    res.json({
        balance: bal.data.free.toHuman(),
        address: process.env.ADDRESS,
        max: process.env.MAX_EDG,
    });
};
