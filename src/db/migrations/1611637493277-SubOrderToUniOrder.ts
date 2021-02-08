import {MigrationInterface, QueryRunner, TableForeignKey, TableColumn, TableUnique} from 'typeorm';

export class SubOrderToUniOrder1611637493277 implements MigrationInterface {
    name = 'SubOrderToUniOrder1611637493277'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const
            tradesColumns: string[] = ['symbol', 'symbolAlias', 'status', 'orderId'],
            hasColumn = async (columnName: string): Promise<boolean> => queryRunner.hasColumn('trades', columnName),
            hasAllColumns = await Promise.all(tradesColumns.map(hasColumn)),
            isActual = hasAllColumns.reduce( (actual: boolean, has: boolean)=> actual&&has, true )
        ;

        if(isActual)
            return;

        console.log('actualize schema');

        await queryRunner.addColumns('trades', [
            new TableColumn({
                name: 'symbol',
                type: 'varchar(255)',
                isNullable: true
            }), new TableColumn({
                name: 'symbolAlias',
                type: 'varchar(255)',
                isNullable: true
            }), new TableColumn({
                name: 'side',
                type: 'varchar(255)',
                isNullable: true
            }), new TableColumn({
                name: 'type',
                type: 'varchar(255)',
                isNullable: true
            }), new TableColumn({
                name: 'status',
                type: 'varchar(255)',
                isNullable: true
            }),
            new TableColumn({
                name: 'orderId',
                type: 'long',
                isNullable: true
            })
        ]);

        await queryRunner.changeColumn('trades', 'id' , new TableColumn({
            name: 'id',
            type: 'INTEGER',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment'
        }));


        await queryRunner.addColumns('subOrders', [
            new TableColumn({
                name: 'orderType',
                type: 'varchar(255)',
                isNullable: true
            }), new TableColumn({
                name: 'currentDev',
                type: 'DECIMAL(18,8)',
                isNullable: true
            }), new TableColumn({
                name: 'sellPrice',
                type: 'DECIMAL(18,8)',
                isNullable: true
            }), new TableColumn({
                name: 'buyPrice',
                type: 'DECIMAL(18,8)',
                isNullable: true
            })
        ]);

        const singleTradeCondition = field => `(SELECT ${field} FROM subOrders WHERE trades.exchange = subOrders.exchange AND trades.exchangeOrderId = subOrders.exchangeOrderId)`;
        await queryRunner.query(`
			UPDATE "trades"
			SET 
				symbol = ${singleTradeCondition('symbol')},
				symbolAlias = ${singleTradeCondition('symbol')}, 
				orderId = ${singleTradeCondition('id')},
				side = ${singleTradeCondition('side')},
				type = 'limit',
				status = 'ok'
		`);

        await queryRunner.query(`
			UPDATE "subOrders"
			SET
				orderType = 'SUB'
		`);

        await queryRunner.dropUniqueConstraint('subOrders', new TableUnique({columnNames:['exchange','exchangeOrderId']}));
        await queryRunner.dropColumn('subOrders', 'exchangeOrderId');

        await queryRunner.createForeignKey('trades', new TableForeignKey({
            columnNames: ['orderId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'subOrders',
            onDelete: 'CASCADE'
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        throw new Error('Transaction');
    }

}
