import { BadRequestException, Get, HttpException, HttpStatus, Injectable, NotFoundException, Query, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PosSale } from 'src/modules/web/admin-store/pos/entities/pos-sale.entity';
import { PosStock } from 'src/modules/web/admin-store/pos/entities/pos-stock.entity';
import { subDays, startOfDay } from 'date-fns';
import { Product } from 'src/modules/products/entities/product.entity';
import { Store } from 'src/modules/stores/entities/store.entity';
import { StoreSubscription } from 'src/modules/stores/entities/store-subscription.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { StoresService } from 'src/modules/stores/stores.service';
import { StoreReportsService } from '../reports/store-reports.service';
import { Category } from 'src/modules/categories/entities/category.entity';

@Injectable()
export class StoreStatsService {
    constructor(
        @InjectRepository(PosSale)
        private readonly salesRepo: Repository<PosSale>,

        @InjectRepository(PosStock)
        private readonly stockRepo: Repository<PosStock>,

        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,

        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,

        @InjectRepository(StoreSubscription)
        private readonly subRepo: Repository<StoreSubscription>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(Category)
        private readonly categoryRepo: Repository<Category>,


        private readonly storesService: StoresService,
    ) { }

    async getStatsForStore(storeId: number) {
        const today = new Date();
        const last7 = subDays(startOfDay(today), 6);


        const sales = await this.salesRepo.find({
            where: { store: { id: storeId }, createdAt: Between(last7, today) },
        });

        const stock = await this.stockRepo.find({
            where: { store: { id: storeId } },
        });

        const totalSales = sales.length;
        const totalRevenue = sales.reduce(
            (sum, s) => sum + Number(s.total ?? 0),
            0,
        );
        const averageTicket = totalSales ? totalRevenue / totalSales : 0;
        const totalProducts = stock.reduce(
            (sum, s) => sum + Number(s.quantity ?? 0),
            0,
        );
        const lowStock = stock.filter((s) => Number(s.quantity) < 10).length;


        const productSalesMap = new Map<
            number,
            { name: string; units: number; revenue: number }
        >();

        for (const sale of sales) {
            const existing = productSalesMap.get(sale.productId) || {
                name: sale.productName,
                units: 0,
                revenue: 0,
            };

            existing.units += Number(sale.quantity ?? 0);
            existing.revenue += Number(sale.total ?? 0);
            productSalesMap.set(sale.productId, existing);
        }

        const sortedSales = Array.from(productSalesMap.entries()).sort(
            (a, b) => b[1].units - a[1].units,
        );

        const highestSelling =
            sortedSales.length > 0
                ? {
                    productId: sortedSales[0][0],
                    productName: sortedSales[0][1].name,
                    units_sold: sortedSales[0][1].units,
                    revenue: Number(sortedSales[0][1].revenue).toFixed(2),
                }
                : null;

        const lowestSelling =
            sortedSales.length > 0
                ? {
                    productId: sortedSales[sortedSales.length - 1][0],
                    productName: sortedSales[sortedSales.length - 1][1].name,
                    units_sold: sortedSales[sortedSales.length - 1][1].units,
                    revenue: Number(
                        sortedSales[sortedSales.length - 1][1].revenue,
                    ).toFixed(2),
                }
                : null;


        const sortedStock = stock.sort(
            (a, b) => Number(b.quantity) - Number(a.quantity),
        );

        const bestStocked = sortedStock[0]
            ? {
                productId: sortedStock[0].productId,
                productName: sortedStock[0].productName,
                quantity: Number(sortedStock[0].quantity),
            }
            : null;

        const worstStocked = sortedStock[sortedStock.length - 1]
            ? {
                productId: sortedStock[sortedStock.length - 1].productId,
                productName:
                    sortedStock[sortedStock.length - 1].productName,
                quantity: Number(sortedStock[sortedStock.length - 1].quantity),
            }
            : null;

        const lastSales = sales
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
            .slice(0, 5)
            .map((s) => ({
                productName: s.productName,
                total: Number(s.total).toFixed(2),
                quantity: Number(s.quantity),
                createdAt: s.createdAt,
            }));

        return {
            total_sales: totalSales,
            total_revenue: Number(totalRevenue.toFixed(2)),
            average_ticket: Number(averageTicket.toFixed(2)),
            total_products: totalProducts,
            low_stock: lowStock,
            highest_selling_product: highestSelling,
            lowest_selling_product: lowestSelling,
            best_stocked_product: bestStocked,
            worst_stocked_product: worstStocked,
            last_sales: lastSales,
        };
    }

    async getProductsByRole(user: any) {

        if (user.role === 'superadmin') {
            return await this.productRepo.find({
                relations: ['store', 'category'],
                order: { id: 'DESC' },
            });
        }


        if (user.role === 'store') {
            const storeId = user.storeId;
            if (!storeId) {
                throw new Error('No se pudo determinar el storeId del token.');
            }

            return await this.productRepo.find({
                where: { store: { id: storeId } },
                relations: ['store', 'category'],
                order: { id: 'DESC' },
            });
        }

        throw new Error('Rol no autorizado para acceder a productos.');
    }

    async getSubscriptionDetail(storeId: number) {
        const subscription = await this.subRepo.findOne({
            where: { store: { id: storeId } },
            order: { created_at: 'DESC' },
        });

        if (!subscription) {
            throw new HttpException('No se encontró suscripción activa para esta tienda.', HttpStatus.NOT_FOUND);
        }

        return {
            plan: subscription.plan_key,
            price_id: subscription.price_id,
            stripe_subscription_id: subscription.stripe_subscription_id,
            stripe_customer_id: subscription.stripe_customer_id,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            created_at: subscription.created_at,
        };
    }


    async getProfileWithStore(userId: number) {

        if (!userId) {
            throw new HttpException('Falta el ID del usuario autenticado.', HttpStatus.BAD_REQUEST);
        }

        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ['store', 'store.category', 'store.detail'],
        });

        if (!user) {
            throw new HttpException('Usuario no encontrado.', HttpStatus.NOT_FOUND);
        }

        if (!user.store) {
            throw new HttpException('El usuario no tiene una tienda asociada.', HttpStatus.NOT_FOUND);
        }


        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            username: user.username,
            created_at: user.created_at,
            store: {
                id: user.store.id,
                business_name: user.store.business_name,
                owner_name: user.store.owner_name,
                address: user.store.address,
                description: user.store.description,
                status: user.store.status,
                is_verified: user.store.is_verified,
                category: user.store.category ? user.store.category.name : null,
            },
            detail: user.store.detail ? {
                id: user.store.detail.id,
                description: user.store.detail.description,
                rfc: user.store.detail.rfc,
                phone: user.store.detail.phone,
                email_contact: user.store.detail.email_contact,
                logo_url: user.store.detail.logo_url,
                cover_image_url: user.store.detail.cover_image_url,
                opening_hours: user.store.detail.opening_hours,
                reference: user.store.detail.reference,
                contact_method: user.store.detail.contact_method,
                social_links: user.store.detail.social_links,
                created_at: user.store.detail.created_at,
                updated_at: user.store.detail.updated_at,
            } : null
        };
    }

    async updateProfileWithStore(userId: number, body: any) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ['store', 'store.detail'],
        });

        if (!user) throw new NotFoundException('Usuario no encontrado');
        if (!user.store) throw new NotFoundException('No se encontró una tienda vinculada');

        const { userData, storeData, detailData } = body;

        if (userData) {
            // Validación de email único
            if (userData.email && userData.email !== user.email) {
                const existingEmail = await this.userRepo.findOne({
                    where: { email: userData.email },
                });

                if (existingEmail && existingEmail.id !== user.id) {
                    throw new BadRequestException('El correo ya está en uso por otro usuario.');
                }
            }

            // Validación de username único
            if (userData.username && userData.username !== user.username) {
                const existingUser = await this.userRepo.findOne({
                    where: { username: userData.username },
                });

                if (existingUser && existingUser.id !== user.id) {
                    throw new BadRequestException('El nombre de usuario ya está en uso.');
                }
            }

            // Aplicar cambios y guardar (mejor que update)
            Object.assign(user, userData);
            await this.userRepo.save(user);
        }

        if (storeData) {
            const store = await this.storeRepo.findOne({
                where: { id: user.store.id },
                relations: ['category'],
            });

            if (!store) {
                throw new NotFoundException('Tienda no encontrada');
            }

            // Si se envía category_id, actualizar categoría
            if (storeData.category_id) {
                const category = await this.categoryRepo.findOneBy({
                    id: storeData.category_id,
                });

                if (!category) {
                    throw new NotFoundException('Categoría no encontrada');
                }

                store.category = category;
                delete storeData.category_id;
            }

            Object.assign(store, storeData);
            await this.storeRepo.save(store);
        }

        if (detailData) {
            await this.storesService.updateDetail(user.store.id, detailData);
        }

        return {
            ok: true,
            message: 'Perfil y tienda actualizados correctamente',
        };
    }


    async getAllSubscriptions() {
        try {
            const subscriptions = await this.subRepo.find({
                relations: ['store'],
                order: { created_at: 'DESC' },
            });

            if (!subscriptions.length) {
                throw new HttpException(
                    'No se encontraron suscripciones registradas.',
                    HttpStatus.NOT_FOUND,
                );
            }

            return subscriptions.map((s) => ({
                id: s.id,
                plan: s.plan_key,
                price_id: s.price_id,
                stripe_subscription_id: s.stripe_subscription_id,
                stripe_customer_id: s.stripe_customer_id,
                status: s.status,
                current_period_start: s.current_period_start,
                current_period_end: s.current_period_end,
                created_at: s.created_at,
                store: s.store
                    ? {
                        id: s.store.id,
                        business_name: s.store.business_name,
                        owner_name: s.store.owner_name,
                        email: s.store?.user?.email ?? null,
                        status: s.store.status,
                        is_verified: s.store.is_verified,
                    }
                    : null,
            }));
        } catch (error) {
            console.error('Error listing all subscriptions:', error);
            throw new HttpException(
                'Error al listar las suscripciones.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getAllStores() {
        try {
            const stores = await this.storeRepo.find({
                relations: ['category'],
                order: { id: 'DESC' },
            });

            if (!stores.length) {
                throw new HttpException(
                    'No se encontraron tiendas registradas.',
                    HttpStatus.NOT_FOUND,
                );
            }

            return stores.map((store) => ({
                id: store.id,
                business_name: store.business_name,
                owner_name: store.owner_name,
                address: store.address,
                description: store.description,
                status: store.status,
                is_verified: store.is_verified,
                category: store.category ? store.category.name : null,
            }));
        } catch (error) {
            console.error('Error al obtener todas las tiendas:', error);
            throw new HttpException(
                'Error al listar las tiendas.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getProductsByStore(storeId: number) {
        try {
            const store = await this.storeRepo.findOne({
                where: { id: storeId },
                relations: ['category'],
            });

            if (!store) {
                throw new NotFoundException('La tienda especificada no existe');
            }

            const products = await this.productRepo.find({
                where: { store: { id: storeId } },
                relations: ['category'],
                order: { id: 'DESC' },
            });

            return {
                store: {
                    id: store.id,
                    business_name: store.business_name,
                    category: store.category ? store.category.name : null,
                },
                total_products: products.length,
                products: products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    stock: p.stock,
                    imageUrl: p.imageUrl,
                    category: p.category ? p.category.name : null,
                })),
            };
        } catch (error) {
            console.error('Error al obtener productos por tienda:', error);
            throw new HttpException(
                'Error al listar los productos de la tienda.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

}
