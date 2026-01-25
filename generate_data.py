import json
import math
import uuid
from datetime import datetime

# Configuration matching types.ts
PROD_LINES = ['PL_IOT', 'PL_ANL', 'PL_SERV', 'PL_HW', 'PL_LEG']
COST_CENTERS = ['100', '110', '200', '300', '800', '900']
DEFAULT_PLAN_ID = 'plan-2025-base'

records = []
years = [2023, 2024, 2025]

def get_variance():
    import random
    # Seed for reproducibility if needed, but random is fine for dummy data
    return 0.95 + random.random() * 0.1

for year in years:
    for m in range(1, 13):
        period = f"{year}-{m:02d}"
        
        # Seasonality like in types.ts
        seasonality = 1 + (math.sin(m) * 0.15)
        # Growth
        growth = 1 + ((year - 2023) * 0.12)
        
        base_amount = 1000 * seasonality * growth
        
        # --- Revenue & COGS ---
        for pl in PROD_LINES:
            mix_factor = 1.0
            if pl == 'PL_IOT': mix_factor = 1.5
            if pl == 'PL_LEG': mix_factor = 0.6
            
            # Revenue (Budget)
            records.append({
                "id": str(uuid.uuid4()),
                "planId": DEFAULT_PLAN_ID,
                "period": period,
                "type": "Budget",
                "accountCode": "REV_SUB",
                "costCenterCode": "200",
                "productLineCode": pl,
                "amount": base_amount * 80 * mix_factor
            })
            
            # Revenue (Actual) - Up to April 2025
            if year < 2025 or (year == 2025 and m <= 4):
                records.append({
                    "id": str(uuid.uuid4()),
                    # No planId for Actuals
                    "period": period,
                    "type": "Actual",
                    "accountCode": "REV_SUB",
                    "costCenterCode": "200",
                    "productLineCode": pl,
                    "amount": (base_amount * 80 * mix_factor) * get_variance()
                })
                
            # COGS (Budget)
            records.append({
                "id": str(uuid.uuid4()),
                "planId": DEFAULT_PLAN_ID,
                "period": period,
                "type": "Budget",
                "accountCode": "COGS_HOST",
                "costCenterCode": "100",
                "productLineCode": pl,
                "amount": base_amount * 25 * mix_factor
            })
            
            # COGS (Actual)
            if year < 2025 or (year == 2025 and m <= 4):
                records.append({
                    "id": str(uuid.uuid4()),
                    "period": period,
                    "type": "Actual",
                    "accountCode": "COGS_HOST",
                    "costCenterCode": "100",
                    "productLineCode": pl,
                    "amount": (base_amount * 25 * mix_factor) * get_variance()
                })

        # --- OpEx ---
        for cc in COST_CENTERS:
            size_factor = 1.0
            if cc == '900': size_factor = 0.5
            
            # Salaries
            records.append({
                "id": str(uuid.uuid4()),
                "planId": DEFAULT_PLAN_ID,
                "period": period,
                "type": "Budget",
                "accountCode": "EXP_GEN_PPL",
                "costCenterCode": cc,
                "productLineCode": "",
                "amount": base_amount * 20 * size_factor
            })
            
            # Depreciation
            records.append({
                "id": str(uuid.uuid4()),
                "planId": DEFAULT_PLAN_ID,
                "period": period,
                "type": "Budget",
                "accountCode": "EXP_DEP",
                "costCenterCode": cc,
                "productLineCode": "",
                "amount": base_amount * 4 * size_factor
            })
            
            # Actuals
            if year < 2025 or (year == 2025 and m <= 4):
                records.append({
                    "id": str(uuid.uuid4()),
                    "period": period,
                    "type": "Actual",
                    "accountCode": "EXP_GEN_PPL",
                    "costCenterCode": cc,
                    "productLineCode": "",
                    "amount": (base_amount * 20 * size_factor) * get_variance()
                })
                records.append({
                    "id": str(uuid.uuid4()),
                    "period": period,
                    "type": "Actual",
                    "accountCode": "EXP_DEP",
                    "costCenterCode": cc,
                    "productLineCode": "",
                    "amount": base_amount * 4 * size_factor # Fixed
                })

        # --- Entity Items ---
        entity_items = {
            'INC_OTHER': 2,
            'EXP_TAX': 12,
            'CF_CAPEX': 8,
            'CF_WC': -4
        }
        
        for acc, factor in entity_items.items():
            records.append({
                "id": str(uuid.uuid4()),
                "planId": DEFAULT_PLAN_ID,
                "period": period,
                "type": "Budget",
                "accountCode": acc,
                "costCenterCode": "900",
                "productLineCode": "",
                "amount": base_amount * factor
            })
            
            if year < 2025 or (year == 2025 and m <= 4):
                records.append({
                    "id": str(uuid.uuid4()),
                    "period": period,
                    "type": "Actual",
                    "accountCode": acc,
                    "costCenterCode": "900",
                    "productLineCode": "",
                    "amount": (base_amount * factor) * get_variance()
                })

output = { "records": records }
print(json.dumps(output, indent=2))
