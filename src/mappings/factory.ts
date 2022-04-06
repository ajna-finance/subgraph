import { PoolCreated } from '../types/ERC20PoolFactory/ERC20PoolFactory'
import { ERC20PoolFactory } from '../types/schema'
import { FACTORY_ADDRESS, ZERO_BI } from '../utils/constants'

import { ERC20Pool } from '../types/schema'
import { ERC20Pool as PoolTemplate } from '../types/templates'

export function handlePoolCreated(event: PoolCreated): void {
    let factory = ERC20PoolFactory.load(FACTORY_ADDRESS)
    if (factory === null) {
        factory = new ERC20PoolFactory(FACTORY_ADDRESS)
        factory.poolCount = ZERO_BI
    }

    let pool = new ERC20Pool(event.params._event.address.toHexString()) as ERC20Pool
    pool.createdAtTimestamp = event.block.timestamp
    pool.createdAtBlockNumber = event.block.number
    pool.save()
    PoolTemplate.create(event.params._event.address)

    factory.save()
}