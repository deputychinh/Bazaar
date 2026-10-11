import { Module } from '@nestjs/common';

import { PrismaTransactionManager } from '../../common/transaction/prisma-transaction-manager.js';
import { TransactionManager } from '../../common/transaction/transaction-manager.js';
import { UsersModule } from '../users/users.module.js';

import { AdminSellerApplicationsController } from './controllers/admin-seller-applications.controller.js';
import { SellerApplicationsController } from './controllers/seller-applications.controller.js';
import { PrismaSellerApplicationsRepository } from './repositories/prisma-seller-applications.repository.js';
import { SellerApplicationsRepository } from './repositories/seller-applications.repository.js';
import { SellerApplicationsService } from './services/seller-applications.service.js';

@Module({
  imports: [UsersModule],
  controllers: [SellerApplicationsController, AdminSellerApplicationsController],
  providers: [
    SellerApplicationsService,
    { provide: SellerApplicationsRepository, useClass: PrismaSellerApplicationsRepository },
    { provide: TransactionManager, useClass: PrismaTransactionManager },
  ],
})
export class SellersModule {}
