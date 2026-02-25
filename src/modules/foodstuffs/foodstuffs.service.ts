import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { BaseRepository } from '../repository/base.repository';
import { Repositories } from 'src/shared/enums';
import { DatabaseModelNames, ActionType, Constants } from 'src/shared/constants';
import {
  CreateFoodstuffReqDto,
  UpdateFoodstuffReqDto,
  AddActivityReqDto,
  GetActivitiesReqDto,
  GenerateReportReqDto,
  ReportType,
  GroupBy,
  GetFoodstuffReqDto,
  CreateFoodstuffResDto,
  BulkPurchaseByNameReqDto,
  BulkPurchaseByNameResDto,
  PurchaseItemByNameDto,
} from './dtos';
import { CookedFoodName } from './schemas/cooked-food-name.schema';
import { FoodstuffHistory } from './schemas/foodstuff-history.schema';
import { Foodstuff } from './schemas/foodstuff.schema';
import { Types } from 'mongoose';

@Injectable()
export class FoodstuffsService {
  constructor(
    @Inject(Repositories.FoodstuffRepository)
    private readonly foodstuffRepository: BaseRepository<Foodstuff>,
    @Inject(Repositories.FoodstuffHistoryRepository)
    private readonly foodstuffHistoryRepository: BaseRepository<FoodstuffHistory>,
    @Inject(Repositories.CookedFoodNameRepository)
    private readonly cookedFoodNameRepository: BaseRepository<CookedFoodName>,
  ) {}

  async createFoodstuff(storeType: string, createFoodstuffDto: CreateFoodstuffReqDto): Promise<any> {
    const existingFoodstuff = await this.foodstuffRepository.findOne({
      name: { $regex: new RegExp(`^${createFoodstuffDto.name}$`, 'i') },
      storeType,
    });

    if (existingFoodstuff) {
      throw new BadRequestException('Foodstuff with this name already exists in this store');
    }

    const foodstuff = await this.foodstuffRepository.create({
      ...createFoodstuffDto,
      storeType,
      currentQuantity: createFoodstuffDto.currentQuantity || 0,
    });

    return {
      message: 'Foodstuff created successfully',
      foodstuff,
    };
  }

  async getAllFoodstuffs(storeType: string, query: GetFoodstuffReqDto) {
    const { page = 1, limit = 10, search, unit, lowStock, sortBy = 'name', sortOrder = 'asc' } = query;
    const skip = (page - 1) * limit;

    const filter: any = { storeType };

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (unit) {
      filter.unit = unit;
    }

    if (lowStock) {
      filter.currentQuantity = { $lte: Constants.stockThresholds.low };
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [foodstuffs, total] = await Promise.all([
      this.foodstuffRepository.findAll(filter, skip, limit, sort),
      this.foodstuffRepository.count(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    const currentPage = page;

    return {
      message: 'Foodstuffs retrieved successfully',
      data: {
        foodstuffs,
        total,
        page: currentPage,
        limit: limit,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
    };
  }

  async fetchFoodstuffReport(storeType: string) {
    const allFoodstuffs = await this.foodstuffRepository.findAll({ storeType }, 0, 100000, { name: 1 });

    const report = await Promise.all(
      allFoodstuffs.map(async (foodstuff) => {
        const history = await this.foodstuffHistoryRepository.findAll({ foodstuffId: foodstuff._id });

        return {
          ...foodstuff.toObject(),
          histories: history,
        };
      }),
    );
    return {
      foodstuffs: report,
      message: 'Reports retrieved successfully',
    };
  }

  async getAllFoodstuffsForCSV(storeType: string) {
    //SORT BY NAMES
    const allFoodstuffs = await this.foodstuffRepository.findAll({ storeType }, 0, 100000, { name: 1 });
    return {
      message: 'Foodstuffs retrieved successfully',
      data: allFoodstuffs.map((foodstuff) => {
        return {
          name: foodstuff.name,
          unit: foodstuff.unit,
        };
      }),
    };
  }

  async getFoodstuffById(storeType: string, id: string) {
    const foodstuff = await this.foodstuffRepository.findOne({ _id: id, storeType });
    if (!foodstuff) {
      throw new NotFoundException('Foodstuff not found');
    }

    return {
      message: 'Foodstuff retrieved successfully',
      data: foodstuff,
    };
  }

  async updateFoodstuff(storeType: string, id: string, updateFoodstuffDto: UpdateFoodstuffReqDto) {
    const existingFoodstuff = await this.foodstuffRepository.findOne({ _id: id, storeType });
    if (!existingFoodstuff) {
      throw new NotFoundException('Foodstuff not found');
    }

    // Check for duplicate name if name is being updated
    if (updateFoodstuffDto.name && updateFoodstuffDto.name !== existingFoodstuff.name) {
      const duplicateFoodstuff = await this.foodstuffRepository.findOne({
        name: { $regex: new RegExp(`^${updateFoodstuffDto.name}$`, 'i') },
        storeType,
        _id: { $ne: id },
      });

      if (duplicateFoodstuff) {
        throw new BadRequestException('Foodstuff with this name already exists in this store');
      }
    }

    const updatedFoodstuff = await this.foodstuffRepository.update({ _id: id }, updateFoodstuffDto);

    return {
      message: 'Foodstuff updated successfully',
      foodstuff: updatedFoodstuff,
    };
  }

  async deleteFoodstuff(storeType: string, id: string) {
    const foodstuff = await this.foodstuffRepository.findOne({ _id: id, storeType });
    if (!foodstuff) {
      throw new NotFoundException('Foodstuff not found');
    }

    // Check if there are any activities for this foodstuff
    const activitiesCount = await this.foodstuffHistoryRepository.count({ foodstuffId: new Types.ObjectId(id) });
    if (activitiesCount > 0) {
      throw new BadRequestException('Cannot delete foodstuff with existing activities');
    }

    await this.foodstuffRepository.delete({ _id: new Types.ObjectId(id) });

    return {
      message: 'Foodstuff deleted successfully',
    };
  }

  async addActivity(
    storeType: string,
    foodstuffId: string,
    addActivityDto: AddActivityReqDto,
    userId: string,
    month: string,
    stockType: string,
  ) {
    const foodstuff = await this.foodstuffRepository.findOne({ _id: foodstuffId, storeType });
    if (!foodstuff) {
      throw new NotFoundException('Foodstuff not found');
    }

    // Validate purchase activity
    if (addActivityDto.actionType === ActionType.PURCHASE) {
      if (!addActivityDto.unitCost || !addActivityDto.totalCost) {
        throw new BadRequestException('Unit cost and total cost are required for purchases');
      }
    }

    // Validate usage activity - must have cookedFoodNameId
    // if (addActivityDto.actionType === ActionType.USAGE) {
    //   if (!addActivityDto.cookedFoodNameId) {
    //     throw new BadRequestException('Cooked food name ID is required for usage activities');
    //   }

    //   // Verify cooked food name exists
    //   const cookedFoodName = await this.cookedFoodNameRepository.findOne({ _id: addActivityDto.cookedFoodNameId });
    //   if (!cookedFoodName) {
    //     throw new NotFoundException('Cooked food name not found');
    //   }
    // }

    // Check for negative stock
    const newQuantity = foodstuff.currentQuantity + addActivityDto.quantityChanged;
    // if (newQuantity < 0) {
    //   throw new BadRequestException('Insufficient stock for this operation');
    // }

    // Create activity record
    const activityData: any = {
      foodstuffId: new Types.ObjectId(foodstuffId),
      ...addActivityDto,
      storeType,
      doneBy: userId,
    };

    // Add cookedFoodNameId for usage activities
    if (addActivityDto.actionType === ActionType.USAGE && addActivityDto.cookedFoodNameId) {
      activityData.cookedFoodNameId = addActivityDto.cookedFoodNameId;
    }

    // Add requisitionId if provided
    if (addActivityDto.requisitionId) {
      activityData.requisitionId = addActivityDto.requisitionId;
    }

    // Update foodstuff
    const updatedData: any = {
      currentQuantity: newQuantity,
      lastUpdateDate: new Date(),
      stocks:
        addActivityDto.actionType === ActionType.PURCHASE
          ? [
              ...foodstuff.stocks,
              {
                month,
                stockType,
                date: addActivityDto.date,
                value: addActivityDto.quantityChanged,
              },
            ]
          : foodstuff.stocks,
    };

    // Update average cost for purchases
    // if (addActivityDto.actionType === ActionType.PURCHASE && addActivityDto.quantityChanged > 0) {
    //   const totalValue =
    //     foodstuff.currentQuantity * (foodstuff.averageCostPrice > 0 ? foodstuff.averageCostPrice : addActivityDto.unitCost || 0) +
    //     (addActivityDto?.totalCost || 0);
    //   updatedData.averageCostPrice = addActivityDto.quantityChanged > 0 ? totalValue / newQuantity :foodstuff.averageCostPrice
    // } else {

    //   updatedData.averageCostPrice = foodstuff.averageCostPrice;
    // }

    if (addActivityDto.actionType === ActionType.PURCHASE && addActivityDto.quantityChanged > 0) {
      if (newQuantity <= 0) {
        // Stock was deeply negative; just use the new purchase's unit cost as the price
        updatedData.averageCostPrice = addActivityDto.unitCost;
      } else {
        const prevQuantity = Math.max(foodstuff.currentQuantity, 0); // ignore negative history for cost calc
        const totalValue =
          prevQuantity * (foodstuff.averageCostPrice > 0 ? foodstuff.averageCostPrice : addActivityDto.unitCost || 0) +
          (addActivityDto.totalCost || 0);
        updatedData.averageCostPrice = totalValue / (prevQuantity + addActivityDto.quantityChanged);
      }
    }

    const updatedFoodstuff = await this.foodstuffRepository.update({ _id: foodstuffId }, updatedData);

    const activity = await this.foodstuffHistoryRepository.create(activityData);

    const populatedActivity = await this.foodstuffHistoryRepository.findAllAndPopulate({ _id: activity._id }, [
      { path: 'doneBy', select: 'firstName lastName email' },
      { path: 'cookedFoodNameId', select: 'name description' },
      { path: 'requisitionId', select: 'requisitionNumber' },
    ]);

    return {
      message: 'Activity added successfully',
      activity: populatedActivity[0],
      updatedFoodstuff,
    };
  }

  async getActivities(storeType: string, foodstuffId: string, query: GetActivitiesReqDto) {
    const { page = 1, limit = 10, actionType, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const filter: any = {
      foodstuffId: new Types.ObjectId(foodstuffId),
      storeType,
    };

    if (actionType) {
      filter.actionType = actionType;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [activities, total] = await Promise.all([
      this.foodstuffHistoryRepository.findAllAndPopulate(
        filter,
        { path: 'doneBy', select: 'firstName lastName email' },
        { createdAt: -1 },
        skip,
        limit,
      ),
      this.foodstuffHistoryRepository.count(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    const currentPage = page;

    return {
      message: 'Activities retrieved successfully',
      data: {
        activities,
        total,
        page: currentPage,
        limit: limit,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
    };
  }

  async getDashboard(storeType: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalFoodstuffs, lowStockItems, recentPurchases, recentUsage, recentWastage, allFoodstuffs, recentActivities, monthlySpending] =
      await Promise.all([
        this.foodstuffRepository.count({ storeType }),
        this.foodstuffRepository.count({ storeType, currentQuantity: { $lte: Constants.stockThresholds.low } }),
        this.foodstuffHistoryRepository.count({
          storeType,
          actionType: ActionType.PURCHASE,
          createdAt: { $gte: thirtyDaysAgo },
        }),
        this.foodstuffHistoryRepository.count({
          storeType,
          actionType: ActionType.USAGE,
          createdAt: { $gte: thirtyDaysAgo },
        }),
        this.foodstuffHistoryRepository.count({
          storeType,
          actionType: ActionType.WASTAGE,
          createdAt: { $gte: thirtyDaysAgo },
        }),
        this.foodstuffRepository.findAll({ storeType }),
        this.foodstuffHistoryRepository.findAllAndPopulate(
          { storeType, createdAt: { $gte: thirtyDaysAgo } },
          { path: 'doneBy', select: 'firstName lastName' },
          { createdAt: -1 },
          0,
          10,
        ),
        this.getMonthlySpending(storeType),
      ]);

    // Calculate total inventory value
    const totalValue = allFoodstuffs.reduce((sum, foodstuff) => sum + foodstuff.currentQuantity * foodstuff.averageCostPrice, 0);

    // Generate stock alerts
    const stockAlerts = allFoodstuffs
      .filter((foodstuff) => foodstuff.currentQuantity <= Constants.stockThresholds.low)
      .map((foodstuff) => ({
        foodstuff: {
          _id: foodstuff._id,
          name: foodstuff.name,
          currentQuantity: foodstuff.currentQuantity,
          unit: foodstuff.unit,
        },
        alertLevel: foodstuff.currentQuantity === 0 ? 'critical' : 'low',
        recommendedAction: foodstuff.currentQuantity === 0 ? 'Immediate restocking required' : 'Consider restocking soon',
      }));

    return {
      message: 'Dashboard data retrieved successfully',
      data: {
        stats: {
          totalFoodstuffs,
          lowStockItems,
          totalValue,
          recentPurchases,
          recentUsage,
          recentWastage,
          monthlySpending: monthlySpending.totalSpent,
        },
        stockAlerts,
        recentActivities,
        monthlySpendingByFoodstuff: monthlySpending.byFoodstuff,
      },
    };
  }

  async getStockAlerts(storeType: string) {
    const lowStockFoodstuffs = await this.foodstuffRepository.findAll({
      storeType,
      currentQuantity: { $lte: Constants.stockThresholds.low },
    });

    const alerts = lowStockFoodstuffs.map((foodstuff) => ({
      foodstuff: {
        _id: foodstuff._id,
        name: foodstuff.name,
        currentQuantity: foodstuff.currentQuantity,
        unit: foodstuff.unit,
      },
      alertLevel: foodstuff.currentQuantity === 0 ? 'critical' : 'low',
      recommendedAction: foodstuff.currentQuantity === 0 ? 'Immediate restocking required' : 'Consider restocking soon',
    }));

    return {
      message: 'Stock alerts retrieved successfully',
      alerts,
    };
  }

  async generateReport(storeType: string, query: GenerateReportReqDto) {
    const { type, startDate, endDate, foodstuffId, groupBy } = query;

    let filter: any = { storeType };
    let data: any[] = [];
    let summary = { totalItems: 0, totalValue: 0, totalQuantity: 0 };

    // Apply date filters
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Apply foodstuff filter
    if (foodstuffId) {
      filter.foodstuffId = foodstuffId;
    }

    switch (type) {
      case ReportType.PURCHASES:
        filter.actionType = ActionType.PURCHASE;
        data = await this.foodstuffHistoryRepository.findAllAndPopulate(filter, {
          path: 'foodstuffId doneBy',
          select: 'name firstName lastName',
        });
        summary = this.calculateSummary(data);
        break;

      case ReportType.USAGE:
        filter.actionType = ActionType.USAGE;
        data = await this.foodstuffHistoryRepository.findAllAndPopulate(filter, {
          path: 'foodstuffId doneBy',
          select: 'name firstName lastName',
        });
        summary = this.calculateSummary(data);
        break;

      case ReportType.WASTAGE:
        filter.actionType = ActionType.WASTAGE;
        data = await this.foodstuffHistoryRepository.findAllAndPopulate(filter, {
          path: 'foodstuffId doneBy',
          select: 'name firstName lastName',
        });
        summary = this.calculateSummary(data);
        break;

      case ReportType.STOCK_LEVELS:
        data = await this.foodstuffRepository.findAll(foodstuffId ? { _id: foodstuffId, storeType } : { storeType });
        summary.totalItems = data.length;
        summary.totalValue = data.reduce((sum, item) => sum + item.currentQuantity * item.averageCostPrice, 0);
        summary.totalQuantity = data.reduce((sum, item) => sum + item.currentQuantity, 0);
        break;

      case ReportType.USAGE_VS_WASTAGE:
        const usageData = await this.foodstuffHistoryRepository.findAllAndPopulate(
          { ...filter, actionType: ActionType.USAGE },
          { path: 'foodstuffId', select: 'name' },
        );
        const wastageData = await this.foodstuffHistoryRepository.findAllAndPopulate(
          { ...filter, actionType: ActionType.WASTAGE },
          { path: 'foodstuffId', select: 'name' },
        );
        data = this.combineUsageWastageData(usageData, wastageData);
        break;
    }

    return {
      message: 'Report generated successfully',
      report: {
        type,
        data,
        summary,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private async getMonthlySpending(storeType: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const purchases = await this.foodstuffHistoryRepository.findAllAndPopulate(
      {
        storeType,
        actionType: ActionType.PURCHASE,
        createdAt: { $gte: startOfMonth },
      },
      { path: 'foodstuffId', select: 'name' },
    );

    const totalSpent = purchases.reduce((sum, purchase) => sum + (purchase.totalCost || 0), 0);

    const byFoodstuff = purchases.reduce((acc, purchase) => {
      const name = (purchase.foodstuffId as any)?.name || 'Unknown';
      acc[name] = (acc[name] || 0) + (purchase.totalCost || 0);
      return acc;
    }, {});

    return {
      totalSpent,
      byFoodstuff: Object.entries(byFoodstuff).map(([foodstuffName, totalSpent]) => ({
        foodstuffName,
        totalSpent,
      })),
    };
  }

  private calculateSummary(data: any[]) {
    return {
      totalItems: data.length,
      totalValue: data.reduce((sum, item) => sum + (item.totalCost || 0), 0),
      totalQuantity: data.reduce((sum, item) => sum + Math.abs(item.quantityChanged), 0),
    };
  }

  private combineUsageWastageData(usageData: any[], wastageData: any[]) {
    const combined = {};

    usageData.forEach((item) => {
      const name = item.foodstuffId?.name || 'Unknown';
      if (!combined[name]) combined[name] = { usage: 0, wastage: 0 };
      combined[name].usage += Math.abs(item.quantityChanged);
    });

    wastageData.forEach((item) => {
      const name = item.foodstuffId?.name || 'Unknown';
      if (!combined[name]) combined[name] = { usage: 0, wastage: 0 };
      combined[name].wastage += Math.abs(item.quantityChanged);
    });

    return Object.entries(combined).map(([foodstuffName, data]) => ({
      foodstuffName,
      ...(data as any),
    }));
  }

  /**
   * Find or create a foodstuff by name (case-insensitive)
   * Ensures no duplication regardless of uppercase or lowercase
   */
  private async findOrCreateFoodstuff(storeType: string, name: string, unit: string): Promise<{ foodstuff: Foodstuff; isNew: boolean }> {
    // Search for existing foodstuff (case-insensitive) within the specific store
    const existingFoodstuff = await this.foodstuffRepository.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      storeType,
    });

    if (existingFoodstuff) {
      return { foodstuff: existingFoodstuff, isNew: false };
    }

    // Create new foodstuff if it doesn't exist
    const newFoodstuff = await this.foodstuffRepository.create({
      name: name.trim(),
      unit: unit.trim(),
      storeType,
      currentQuantity: 0,
      averageCostPrice: 0,
    });

    return { foodstuff: newFoodstuff, isNew: true };
  }

  /**
   * Bulk purchase with foodstuff names instead of IDs
   * Automatically creates foodstuffs if they don't exist
   */
  async bulkPurchaseByName(
    storeType: string,
    bulkPurchaseDto: BulkPurchaseByNameReqDto,
    userId: string,
    stockType: string,
    month: string,
  ): Promise<any> {
    const results: any[] = [];
    let newFoodstuffsCreated = 0;
    let existingFoodstuffsUpdated = 0;
    let totalCost = 0;

    // const allFoodStuffs = await this.foodstuffRepository.findAll({});

    // for (const foodStuff of allFoodStuffs) {
    //   const history = await this.foodstuffHistoryRepository.findAll({
    //     foodstuffId: foodStuff._id,
    //     actionType: 'purchase',
    //   });

    //   await this.foodstuffRepository.findOneAndUpdate(
    //     {
    //       _id: foodStuff._id,
    //     },
    //     {
    //       stocks: [
    //         ...foodStuff.stocks,
    //         {
    //           month: 'October',
    //           value: history.reduce((acc, curr) => {
    //             return acc + curr.quantityChanged;
    //           }, 0),
    //           date: new Date('2025-11-16T23:11:31.015+00:00'),
    //           type: 'closing',
    //         },
    //       ],
    //     },
    //   );
    // }
    // return allFoodStuffs;

    for (const purchaseItem of bulkPurchaseDto.purchases) {
      // Find or create the foodstuff
      const { foodstuff, isNew } = await this.findOrCreateFoodstuff(storeType, purchaseItem.name, purchaseItem.unit);

      if (isNew) {
        newFoodstuffsCreated++;
      } else {
        existingFoodstuffsUpdated++;
      }

      // Create purchase activity
      const activityData: any = {
        foodstuffId: foodstuff._id,
        storeType,
        actionType: ActionType.PURCHASE,
        quantityChanged: purchaseItem.quantityChanged,
        unitCost: purchaseItem.unitCost,
        totalCost: purchaseItem.totalCost,
        reason: purchaseItem.reason,
        doneBy: userId,
      };

      // // Add requisitionId if provided
      // if (purchaseItem.requisitionId) {
      //   activityData.requisitionId = purchaseItem.requisitionId;
      // }

      const activity = await this.foodstuffHistoryRepository.create(activityData);
      console.log('Activity created:', activity);

      if (!activity) {
        throw new BadRequestException('Failed to create purchase activity');
      }

      // Update foodstuff quantity and average cost
      const newQuantity = foodstuff.currentQuantity + purchaseItem.quantityChanged;
      const totalValue = foodstuff.currentQuantity * foodstuff.averageCostPrice + purchaseItem.totalCost;
      const newAverageCost = newQuantity > 0 ? totalValue / newQuantity : 0;

      const updatedFoodstuff = await this.foodstuffRepository.update(
        { _id: foodstuff._id },
        {
          currentQuantity: newQuantity,
          averageCostPrice: newAverageCost,
          lastUpdateDate: new Date(),
          stocks: [
            ...foodstuff.stocks,
            {
              month,
              type: stockType,
              date: new Date(),
              value: purchaseItem.quantityChanged,
            },
          ],
        },
      );

      // Populate the activity for response
      const populatedActivity = await this.foodstuffHistoryRepository.findAllAndPopulate({ _id: activity._id }, [
        { path: 'doneBy', select: 'firstName lastName email' },
        { path: 'requisitionId', select: 'requisitionNumber' },
      ]);

      results.push({
        name: purchaseItem.name,
        isNewFoodstuff: isNew,
        activity: populatedActivity[0],
        foodstuff: updatedFoodstuff,
      });

      totalCost += purchaseItem.totalCost;
    }

    return {
      message: 'Bulk purchase completed successfully',
      results,
      summary: {
        totalItems: bulkPurchaseDto.purchases.length,
        newFoodstuffsCreated,
        existingFoodstuffsUpdated,
        totalCost,
      },
    };
  }
}
