import { z } from "zod";
import type { EventDefinition } from "../registry";

/**
 * Milestone 13 — Enterprise Operations Engine events.
 * These events integrate warehouses, procurement, vendors, assets,
 * maintenance, and fleet with the existing Gevon event bus.
 */
export const enterpriseEvents: EventDefinition[] = [
  {
    key: "warehouse.created",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A new warehouse was created.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      warehouseId: z.string().uuid(),
      name: z.string(),
    }),
    subscribers: [],
  },
  {
    key: "warehouse.transfer.created",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A new warehouse transfer was created.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      transferId: z.string().uuid(),
      transferNumber: z.string(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/warehouses/transfers?id={{transferId}}",
      },
    ],
  },
  {
    key: "warehouse.transfer.completed",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A warehouse transfer was completed and inventory updated.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      transferId: z.string().uuid(),
      transferNumber: z.string(),
    }),
    subscribers: [],
  },
  {
    key: "purchase.request.created",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A new purchase request was submitted.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      requestId: z.string().uuid(),
      requestNumber: z.string(),
      totalEstimated: z.number(),
      createdBy: z.string().uuid(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/procurement/requests?id={{requestId}}",
      },
    ],
  },
  {
    key: "purchase.request.approved",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A purchase request was approved.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      requestId: z.string().uuid(),
      requestNumber: z.string(),
      approvedBy: z.string().uuid(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "payload.createdBy",
        deepLink: "/app/procurement/requests?id={{requestId}}",
      },
    ],
  },
  {
    key: "purchase.order.created",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A new purchase order was created.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      orderId: z.string().uuid(),
      poNumber: z.string(),
      vendorId: z.string().uuid().nullable(),
      total: z.number(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "company.owners",
        deepLink: "/app/procurement/orders?id={{orderId}}",
      },
    ],
  },
  {
    key: "purchase.order.received",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A purchase order was fully or partially received.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      orderId: z.string().uuid(),
      poNumber: z.string(),
      vendorId: z.string().uuid().nullable(),
    }),
    subscribers: [],
  },
  {
    key: "vendor.created",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A new vendor was created.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      vendorId: z.string().uuid(),
      name: z.string(),
    }),
    subscribers: [],
  },
  {
    key: "vendor.performance.updated",
    version: 1,
    publisherModuleId: "enterprise",
    description: "Vendor performance metrics were recalculated.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      vendorId: z.string().uuid(),
      score: z.number(),
    }),
    subscribers: [],
  },
  {
    key: "asset.created",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A new asset was registered.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      assetId: z.string().uuid(),
      name: z.string(),
    }),
    subscribers: [],
  },
  {
    key: "asset.assigned",
    version: 1,
    publisherModuleId: "enterprise",
    description: "An asset was assigned to an employee.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      assetId: z.string().uuid(),
      employeeId: z.string().uuid(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "payload.employeeId",
        deepLink: "/app/assets?id={{assetId}}",
      },
    ],
  },
  {
    key: "asset.maintenance_due",
    version: 1,
    publisherModuleId: "enterprise",
    description: "Maintenance is due for an asset.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      assetId: z.string().uuid(),
      assetName: z.string(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "high",
        recipient: "company.owners",
        deepLink: "/app/maintenance?asset={{assetId}}",
      },
    ],
  },
  {
    key: "asset.maintenance_completed",
    version: 1,
    publisherModuleId: "enterprise",
    description: "Asset maintenance was completed.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      assetId: z.string().uuid(),
      maintenanceId: z.string().uuid(),
    }),
    subscribers: [],
  },
  {
    key: "vehicle.created",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A new vehicle was registered.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      vehicleId: z.string().uuid(),
      registrationNumber: z.string(),
    }),
    subscribers: [],
  },
  {
    key: "vehicle.assigned",
    version: 1,
    publisherModuleId: "enterprise",
    description: "A vehicle was assigned to a driver.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      vehicleId: z.string().uuid(),
      employeeId: z.string().uuid(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "normal",
        recipient: "payload.employeeId",
        deepLink: "/app/fleet/vehicles?id={{vehicleId}}",
      },
    ],
  },
  {
    key: "vehicle.maintenance_due",
    version: 1,
    publisherModuleId: "enterprise",
    description: "Vehicle maintenance is due.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      vehicleId: z.string().uuid(),
      registrationNumber: z.string(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "high",
        recipient: "company.owners",
        deepLink: "/app/maintenance?vehicle={{vehicleId}}",
      },
    ],
  },
  {
    key: "vehicle.insurance_expiring",
    version: 1,
    publisherModuleId: "enterprise",
    description: "Vehicle insurance is expiring soon.",
    payloadSchema: z.object({
      companyId: z.string().uuid(),
      vehicleId: z.string().uuid(),
      registrationNumber: z.string(),
      expiresAt: z.string(),
    }),
    subscribers: [
      {
        kind: "notification",
        category: "business",
        priority: "high",
        recipient: "company.owners",
        deepLink: "/app/fleet/vehicles?id={{vehicleId}}",
      },
    ],
  },
];
