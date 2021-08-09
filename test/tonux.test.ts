import {AccountType, Tonux} from "../src";
import {libNode} from "@tonclient/lib-node";
import {TonClient} from "@tonclient/core";

let tonux: Tonux;

beforeAll(() => {
    TonClient.useBinaryLibrary(libNode);
    tonux = new Tonux(["http://localhost"]);
})

afterAll(() => {
    tonux.client.close()
})

test('generate keypair', async () => {
    const keypair = await tonux.generateKeypair();
    expect(keypair).not.toBeNull()
    expect(keypair.secret).not.toBeNull()
    expect(keypair.public).not.toBeNull()
    expect(typeof keypair.secret).toEqual('string')
})

test('wallet from keypair', async () => {
    const keypair = await tonux.generateKeypair();
    const wallet = tonux.walletFromKeyPair(keypair);

    expect(wallet).not.toBeNull()
})

test('deploy wallet', async () => {
    const keypair = await tonux.generateKeypair();
    const wallet = tonux.walletFromKeyPair(keypair);

    expect(await tonux.getAccountType(await wallet.getAddress())).toEqual(AccountType.NON_EXIST)

    await wallet.deploy({useGiver: true})

    expect(await tonux.getAccountType(await wallet.getAddress())).toEqual(AccountType.ACTIVE)
})

test('keypair from secret', async () => {
    const keypair = await tonux.generateKeypair();
    const keypair2 = await tonux.keyPairFromSecret(keypair.secret);

    expect(keypair2.secret).toEqual(keypair.secret)
    expect(keypair2.public).toEqual(keypair.public)
})
