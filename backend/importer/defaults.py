"""
Default values matching the frontend NetworkBuilder UI defaults.
Any field left blank in the Excel/PDF gets these values.
"""

NODE_DEFAULTS = {
    # Universal inventory
    "inventoryLevel": 50,
    "maxCapacity": 100,
    "reorderPoint": 20,
    "orderQuantity": 50,
    "safetyStock": 10,
    "targetServiceLevel": 95,
    "reviewFrequency": 1,
    "moq": 1,
    "holdingCost": 1,
    "obsolescenceRate": 0.01,
    "shelfLife": 365,
    # Supplier
    "supplierLeadTime": 14,
    "supplierLeadTimeVariability": 2,
    "supplierCapacity": 1000,
    "supplierReliability": 95,
    "supplierCostPerUnit": 10,
    "supplierMinOrderQuantity": 100,
    "supplierDisruptionProb": 0.01,
    "supplierRecoveryTime": 30,
    "alternativeSuppliersCount": 1,
    "supplierSwitchingCost": 500,
    # Production / Factory
    "productionCapacity": 500,
    "utilizationRate": 80,
    "batchSize": 50,
    "setupTime": 4,
    "setupCost": 200,
    "cycleTime": 2,
    "yieldRate": 98,
    "defectRate": 2,
    "reworkRate": 1,
    "schedulingRule": "FIFO",
    "overtimeCapacity": 100,
    # Warehouse / DC
    "storageCapacity": 2000,
    "throughputCapacity": 500,
    "pickingRate": 100,
    "packingRate": 80,
    "handlingCost": 2,
    "laborAvailability": 0.95,
    "crossDocking": False,
    "processingTime": 1,
    "automationLevel": 2,
    "fulfillmentAccuracy": 99,
    # Demand / Retail
    "demandVolume": 100,
    "demandVariability": 10,
    "demandSeasonality": 1.1,
    "demandGrowthRate": 0.05,
    "orderFrequency": 1,
    "orderSizeDistribution": "Normal",
    "leadTimeTolerance": 3,
    "backorderRate": 0.1,
    "substitutionBehavior": "None",
    "priceElasticity": -1.2,
}

ROUTE_DEFAULTS = {
    "mode": "Road",
    "costPerUnitDistance": 0.004,
    "baseLeadTime": 2,
    "leadTimeVariability": 0.1,
    "vehicleCapacity": 100,
    "shipmentFrequency": 1,
    "fuelPrice": 1.5,
    "customsTime": 0,
    "disruptionProb": 0.01,
    "consolidationPolicy": "None",
}
