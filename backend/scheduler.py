import random
from datetime import datetime, timedelta
from currency_data import get_currency_info
import logging

logger = logging.getLogger(__name__)

def get_optimized_schedule(request):
    """
    Real-world heuristic optimization for EV charging.
    
    Rates (Time-of-Use):
    - India (INR ₹):
        - Solar (10:00 - 16:00): ₹8.0/kWh
        - Off-Peak (22:00 - 06:00): ₹10.0/kWh
        - Peak (18:00 - 22:00): ₹18.0/kWh
        - Standard: ₹13.0/kWh
    - USA (USD $):
        - Solar (10:00 - 16:00): $0.10/kWh
        - Off-Peak (22:00 - 06:00): $0.12/kWh
        - Peak (18:00 - 22:00): $0.22/kWh
        - Standard: $0.15/kWh
    """
    
    
    logger.info("-------------------- NEW REQUEST --------------------")
    
    # Currency Settings
    country = getattr(request, 'country', 'India') or 'India'
    currency_info = get_currency_info(country)
    
    currency_symbol = currency_info["symbol"]
    conversion_rate = currency_info["rate"]
    
    logger.info(f"Country: {country}, Currency: {currency_info['code']}, Rate: {conversion_rate}")
    
    # Base Rates (INR)
    BASE_R_SOLAR = 8.0
    BASE_R_OFF_PEAK = 10.0
    BASE_R_PEAK = 18.0
    BASE_R_STD = 13.0
    
    # Converted Rates
    R_SOLAR = BASE_R_SOLAR * conversion_rate
    R_OFF_PEAK = BASE_R_OFF_PEAK * conversion_rate
    R_PEAK = BASE_R_PEAK * conversion_rate
    R_STD = BASE_R_STD * conversion_rate

    try:
        # 1. Parse request data
        logger.debug(f"Received request: {request}")
        energy_needed = request.energy_needed
        ready_by_str = request.ready_by
        priority = request.priority  # 'Savings', 'Speed', 'Green'
        
        # Convert ready_by to datetime object
        try:
            if 'T' in ready_by_str:
             # Parse ISO format and convert to naive (local time)
             # If it has timezone info, convert to local then strip tz
             dt = datetime.fromisoformat(ready_by_str.replace('Z', '+00:00'))
             # simplistic approach: just use the naive part, assuming user means local time
             # or better: current_time is naive, so we should probably align.
             # Let's strip tzinfo to treat it as naive local time for simplicity in this MVP
             ready_by = dt.replace(tzinfo=None)
            else:
                 # Handle time-only string by assuming today/tomorrow
                 now = datetime.now()
                 target_time = datetime.strptime(ready_by_str, "%H:%M").time()
                 ready_by = datetime.combine(now.date(), target_time)
                 if ready_by < now:
                     ready_by += timedelta(days=1)
        except Exception as e:
            logger.error(f"ERROR parsing date: {e}")
            # Fallback if parsing fails
            ready_by = datetime.now() + timedelta(hours=24)

        current_time = datetime.now()
        
        # CHARGING SPEEDS (kW)
        CHARGER_SPEED = 7.0  # 7kW Level 2 Charger
        time_needed_hours = energy_needed / CHARGER_SPEED
        
        # Generate potential slots (every hour from now until ready_by)
        potential_slots = []
        
        # Start looking from next full hour
        start_hour = current_time.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        
        logger.info(f"Current Time: {current_time}")
        logger.info(f"Start Hour: {start_hour}")
        logger.info(f"Ready By: {ready_by}")
        logger.info(f"Energy Needed: {energy_needed} kWh")
        logger.info(f"Time Needed: {time_needed_hours:.2f} hours")
        logger.info(f"Condition Check: {start_hour} + {time_needed_hours} hours <= {ready_by} ?")
        logger.info(f"Condition Result: {start_hour + timedelta(hours=time_needed_hours) <= ready_by}")
        
        # Loop through hours until ready_by
        check_time = start_hour
        logger.info("Entering loop...")
        while check_time + timedelta(hours=time_needed_hours) <= ready_by:
            
            # Calculate score for this slot
            start_hour_int = check_time.hour
            
            # Determine Rate & Source
            if 10 <= start_hour_int < 16:
                rate = R_SOLAR
                source = f"Solar (Green) ☀️"
                type_score = 1  # Best
                color = "green"
            elif 22 <= start_hour_int or start_hour_int < 6:
                rate = R_OFF_PEAK
                source = f"Off-Peak (Grid) 🌙"
                type_score = 2
                color = "blue"
            elif 18 <= start_hour_int < 22:
                rate = R_PEAK
                source = "Peak (High Demand) 🔴"
                type_score = 4 # Worst
                color = "red"
            else:
                rate = R_STD
                source = "Standard Grid ⚡"
                type_score = 3
                color = "yellow"
                
            slot_cost = rate * energy_needed
            
            potential_slots.append({
                "start_time": check_time.isoformat(),
                "end_time": (check_time + timedelta(hours=time_needed_hours)).isoformat(),
                "duration_hours": round(time_needed_hours, 1),
                "rate": rate,
                "total_cost": round(slot_cost, 2),
                "source": source,
                "color": color,
                "score": type_score  # lower is better
            })
            
            # Increment by 1 hour
            check_time += timedelta(hours=1)
            
        logger.info(f"Loop finished. Potential slots: {len(potential_slots)}")
            
        # Sort slots based on priority
        if priority == 'Green':
            # Prefer Solar, then Off-Peak
            sorted_slots = sorted(potential_slots, key=lambda x: (x['score'], x['total_cost']))
        else:
            # Default: Cheapest First (Savings)
            sorted_slots = sorted(potential_slots, key=lambda x: x['total_cost'])
            
        # Select top 3 distinct options
        # We want to give a mix if possible, but mainly best ones
        recommended_slots = sorted_slots[:3]
        
        logger.info(f"Recommended slots: {len(recommended_slots)}")
        
        # Calculate savings vs worst case (Peak)
        if recommended_slots:
            best_price = recommended_slots[0]['total_cost']
            worst_price = R_PEAK * energy_needed
            savings = worst_price - best_price
        else:
            savings = 0.0
            
        return {
            "slots": recommended_slots,
            "total_cost": recommended_slots[0]['total_cost'] if recommended_slots else 0,
            "savings": round(savings, 2),
            "currency": currency_symbol,
            "rate": conversion_rate,
            "debug_info": {
                "start_hour": str(start_hour),
                "ready_by": str(ready_by),
                "energy_needed": energy_needed,
                "time_needed_hours": time_needed_hours,
                "potential_slots_count": len(potential_slots)
            }
        }
    except Exception as e:
        import traceback
        logger.error(f"CRITICAL ERROR in optimization: {e}\n{traceback.format_exc()}")
        # Return fallback response instead of crashing
        return {
            "slots": [],
            "total_cost": 0,
            "savings": 0,
            "error": str(e)
        }
