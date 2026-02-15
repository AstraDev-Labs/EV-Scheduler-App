
"""
Currency Data Mapping
serves as a single source of truth for country-to-currency mapping and exchange rates.
Base Currency: INR
Rates are approximate and should ideally be fetched from a live API.
"""

CURRENCY_DATA = {
    "India": {"code": "INR", "symbol": "₹", "rate": 1.0},
    "United States": {"code": "USD", "symbol": "$", "rate": 0.012},
    "United Kingdom": {"code": "GBP", "symbol": "£", "rate": 0.0094},
    "European Union": {"code": "EUR", "symbol": "€", "rate": 0.011},
    "Canada": {"code": "CAD", "symbol": "C$", "rate": 0.016},
    "Australia": {"code": "AUD", "symbol": "A$", "rate": 0.018},
    "Japan": {"code": "JPY", "symbol": "¥", "rate": 1.76},
    "China": {"code": "CNY", "symbol": "¥", "rate": 0.086},
    "Russia": {"code": "RUB", "symbol": "₽", "rate": 1.08},
    "Brazil": {"code": "BRL", "symbol": "R$", "rate": 0.059},
    "South Africa": {"code": "ZAR", "symbol": "R", "rate": 0.22},
    "UAE": {"code": "AED", "symbol": "AED", "rate": 0.044},
    "Singapore": {"code": "SGD", "symbol": "S$", "rate": 0.016},
    "Switzerland": {"code": "CHF", "symbol": "Fr", "rate": 0.010},
    "New Zealand": {"code": "NZD", "symbol": "NZ$", "rate": 0.019},
    "Mexico": {"code": "MXN", "symbol": "$", "rate": 0.20},
    "South Korea": {"code": "KRW", "symbol": "₩", "rate": 15.8},
    "Sweden": {"code": "SEK", "symbol": "kr", "rate": 0.12},
    "Norway": {"code": "NOK", "symbol": "kr", "rate": 0.12},
    "Saudi Arabia": {"code": "SAR", "symbol": "SR", "rate": 0.045},
    "Turkey": {"code": "TRY", "symbol": "₺", "rate": 0.36},
    "Thailand": {"code": "THB", "symbol": "฿", "rate": 0.42},
    "Malaysia": {"code": "MYR", "symbol": "RM", "rate": 0.056},
    "Indonesia": {"code": "IDR", "symbol": "Rp", "rate": 186.0},
    "Vietnam": {"code": "VND", "symbol": "₫", "rate": 293.0},
    "Pakistan": {"code": "PKR", "symbol": "Rs", "rate": 3.3},
    "Sri Lanka": {"code": "LKR", "symbol": "Rs", "rate": 3.6},
    "Bangladesh": {"code": "BDT", "symbol": "৳", "rate": 1.3},
    "Nepal": {"code": "NPR", "symbol": "Rs", "rate": 1.6},
}

def get_currency_info(country_name: str):
    """
    Returns currency info for a given country.
    Defaults to INR if country not found or rate is missing.
    """
    # Normalize input
    if not country_name:
        return CURRENCY_DATA["India"]
        
    # Handle common aliases
    aliases = {
        "USA": "United States",
        "US": "United States",
        "UK": "United Kingdom",
        "United Arab Emirates": "UAE",
        "Russia": "Russia"
    }
    
    normalized_name = aliases.get(country_name, country_name)
    
    return CURRENCY_DATA.get(normalized_name, CURRENCY_DATA["India"])
