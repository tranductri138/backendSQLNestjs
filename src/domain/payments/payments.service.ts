import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestUser } from 'auth/interfaces/request-user.interface';
import { Role } from 'auth/roles/enums/role.enum';
import { compareUserId } from 'auth/util/authorization.util';
import { Order } from 'orders/entities/order.entity';
import { OrderStatus } from 'orders/enums/order-status.enum';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async payOrder(id: number, currentUser: RequestUser) {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: {
        payment: true,
        customer: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (currentUser.role !== Role.ADMIN) {
      compareUserId(currentUser.id, order.customer.id);
    }
    if (order.payment) {
      throw new ConflictException('Order already paid');
    }

    const payment = this.paymentsRepository.create();
    order.payment = payment;
    order.status = OrderStatus.AWAITING_SHIPMENT;
    return this.ordersRepository.save(order);
  }
}
