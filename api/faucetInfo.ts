import { VercelRequest, VercelResponse } from '@vercel/node';
import { WsProvider, ApiPromise } from '@polkadot/api';
import { config } from 'dotenv';
import chainConfigs from '../backend/src/routes/chainConfigs';

config();

export default async (req: VercelRequest, res: VercelResponse) => {
    const chainConfig = chainConfigs[chain];
    const { RPC_URL, MAX_TOKEN } = chainConfig;
    const wsProvider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider: wsProvider });
    let bal: any = await api.query.system.account(process.env.ADDRESS);

    res.json({
        balance: bal.data.free.toHuman(),
        address: process.env.ADDRESS,
        max: MAX_TOKEN,
    });
};
