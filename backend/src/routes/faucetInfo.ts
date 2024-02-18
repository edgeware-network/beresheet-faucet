import express, {Request, Response, NextFunction} from 'express';
import { WsProvider, Keyring, ApiPromise } from '@polkadot/api';
import { config } from 'dotenv';
import chainConfigs from './chainConfigs';
config();

const router = express.Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    const chainConfig = chainConfigs[chain];
    const { RPC_URL, MAX_TOKEN } = chainConfig;
    const wsProvider = new WsProvider(RPC_URL);
    const api = await ApiPromise.create({ provider: wsProvider });
    let bal: any = await api.query.system.account(process.env.ADDRESS)

    res.send({
        balance: bal.data.free.toHuman(),
        address: process.env.ADDRESS,
        max: MAX_TOKEN
    })
});

export default router;
